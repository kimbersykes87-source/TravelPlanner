import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'travel-planner-pwa-install-seen';

function isStandalone() {
  if (typeof window === 'undefined') return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function getDeviceType() {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return null;
}

const IOS_INSTRUCTIONS = (
  <>
    <strong>Add to Home Screen:</strong>
    <ol style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
      <li>Tap the <strong>Share</strong> button (square with arrow pointing up) at the bottom of Safari</li>
      <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
      <li>Tap <strong>Add</strong></li>
    </ol>
  </>
);

const ANDROID_INSTRUCTIONS = (
  <>
    <strong>Install app:</strong>
    <ol style={{ margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
      <li>Tap the <strong>menu</strong> (⋮ three dots) in the browser</li>
      <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong></li>
    </ol>
  </>
);

export function InstallPrompt() {
  const { pathname } = useLocation();
  const { unlocked } = useAuth();
  const [show, setShow] = useState(false);
  const [device, setDevice] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);

  const isViewer = pathname.startsWith('/view');
  const shouldOfferInstall = !isViewer && unlocked;

  useEffect(() => {
    if (!shouldOfferInstall) return;
    if (isStandalone()) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const deviceType = getDeviceType();
    if (!deviceType) return;

    setDevice(deviceType);

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    if (deviceType === 'android') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      const timer = setTimeout(() => {
        if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
      }, 1500);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    if (deviceType === 'ios') {
      const timer = setTimeout(() => setShow(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [shouldOfferInstall]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') handleDismiss();
    } finally {
      setInstalling(false);
    }
  };

  if (!shouldOfferInstall || !show) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="install-prompt-title"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
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
          <h3 id="install-prompt-title" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            Install Travel Planner
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
            {device === 'ios' && IOS_INSTRUCTIONS}
            {device === 'android' && !deferredPrompt && ANDROID_INSTRUCTIONS}
            {device === 'android' && deferredPrompt && 'Tap below to add Travel Planner to your home screen for quick access.'}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {device === 'android' && deferredPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={installing}
                style={{
                  padding: '10px 18px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: installing ? 'wait' : 'pointer',
                }}
              >
                {installing ? 'Installing…' : 'Install'}
              </button>
            )}
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
