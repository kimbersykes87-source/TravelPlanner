import { useState } from 'react';
import { Icon } from './Icon';
import { usePushNotifications } from '../hooks/usePushNotifications';

const STORAGE_KEY = 'travel-planner-push-prompt-seen';

function isStandalone() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function NotificationPrompt() {
  const { supported, subscribed, subscribe, error, permission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(STORAGE_KEY));
  const [loading, setLoading] = useState(false);

  if (!supported || subscribed || dismissed || permission === 'denied') return null;
  if (!isStandalone()) return null; // Only show when PWA is installed

  const handleEnable = async () => {
    setLoading(true);
    try {
      await subscribe();
      if (error) setDismissed(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <div
      role="dialog"
      aria-labelledby="notification-prompt-title"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: 16,
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        background: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-bg-quaternary)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, maxWidth: 400, margin: '0 auto' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name="plane" size={24} style={{ color: '#fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 id="notification-prompt-title" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            Enable notifications
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            Get notified when new scenarios, countries, or bookings are added.
          </p>
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-error, #dc2626)' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={handleEnable}
              disabled={loading}
              style={{
                padding: '10px 18px',
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Enabling…' : 'Enable'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              style={{
                padding: '10px 18px',
                background: 'var(--color-bg-tertiary)',
                color: 'var(--color-text-secondary)',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          style={{
            background: 'none',
            border: 'none',
            padding: 4,
            cursor: 'pointer',
            color: 'var(--color-text-tertiary)',
            flexShrink: 0,
          }}
        >
          <Icon name="x-close" size={20} />
        </button>
      </div>
    </div>
  );
}
