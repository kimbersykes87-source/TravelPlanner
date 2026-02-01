import { useState, useEffect, useCallback } from 'react';

const REGISTER_PUSH_URL = (() => {
  const base = import.meta.env.VITE_SUPABASE_URL || '';
  if (!base) return '';
  return base.replace(/\/$/, '') + '/functions/v1/register-push';
})();

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/** Decode base64url to Uint8Array for Push API */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Hook for Web Push notifications.
 * Returns: { supported, permission, subscribed, subscribe, error }
 * - subscribe() must be called from a user gesture (e.g. button click).
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState(null);

  const checkSubscription = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setSubscribed(!!sub);
    return !!sub;
  }, []);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
    checkSubscription();
  }, [checkSubscription]);

  const subscribe = useCallback(async () => {
    setError(null);
    if (!VAPID_PUBLIC_KEY || !REGISTER_PUSH_URL) {
      setError('Push notifications are not configured. Add VITE_VAPID_PUBLIC_KEY and VITE_SUPABASE_URL.');
      return false;
    }
    if (typeof Notification === 'undefined') {
      setError('Notifications are not supported.');
      return false;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('Push is not supported in this browser.');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError('Notification permission was denied.');
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      const subJson = sub.toJSON();
      const res = await fetch(REGISTER_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`,
        },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || res.statusText);
      }

      setSubscribed(true);
      return true;
    } catch (e) {
      setError(e?.message || 'Failed to enable notifications');
      return false;
    }
  }, []);

  const supported = Boolean(
    typeof Notification !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      VAPID_PUBLIC_KEY &&
      REGISTER_PUSH_URL
  );

  return {
    supported,
    permission,
    subscribed,
    subscribe,
    error,
    checkSubscription,
  };
}
