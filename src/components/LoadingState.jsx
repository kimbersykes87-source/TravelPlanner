import { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';

const DELAY_MS = 500;
const MIN_DISPLAY_MS = 300;

/**
 * Wrapper: shows spinner when loading exceeds delay, stays until done + min display (no flicker).
 * Children stay mounted under a hidden overlay so async work completes before reveal.
 */
export function LoadingState({ loading, delay = DELAY_MS, minDisplay = MIN_DISPLAY_MS, message = 'Loading…', children }) {
  const [showSpinner, setShowSpinner] = useState(false);
  const [showOverlay, setShowOverlay] = useState(() => loading);
  const spinnerShownRef = useRef(false);

  useEffect(() => {
    if (loading) {
      spinnerShownRef.current = false;
      setShowOverlay(true);
      setShowSpinner(false);

      const t = setTimeout(() => {
        spinnerShownRef.current = true;
        setShowSpinner(true);
      }, delay);

      return () => clearTimeout(t);
    }

    // Loading just became false
    if (spinnerShownRef.current) {
      const t = setTimeout(() => {
        setShowOverlay(false);
      }, minDisplay);
      return () => clearTimeout(t);
    }

    setShowOverlay(false);
    return undefined;
  }, [loading, delay, minDisplay]);

  const hasChildren = children != null;

  if (!hasChildren) {
    // Standalone (e.g. Suspense fallback): no wrapper, no min display
    if (!loading) return null;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
          padding: 24,
        }}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        {showSpinner ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-text-tertiary)' }}>
            <span className="plane-spin" style={{ display: 'flex', alignItems: 'center' }}>
              <Icon name="plane" size={24} style={{ color: 'var(--color-primary)' }} />
            </span>
            <span>{message}</span>
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-tertiary)' }}>{message}</p>
        )}
      </div>
    );
  }

  if (!showOverlay) {
    return children;
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          background: 'var(--color-bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 120,
        }}
        role="status"
        aria-live="polite"
        aria-label="Loading"
      >
        {showSpinner ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-text-tertiary)' }}>
            <span className="plane-spin" style={{ display: 'flex', alignItems: 'center' }}>
              <Icon name="plane" size={24} style={{ color: 'var(--color-primary)' }} />
            </span>
            <span>{message}</span>
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-tertiary)' }}>{message}</p>
        )}
      </div>
      <div style={{ visibility: 'hidden', minHeight: 100 }} aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
