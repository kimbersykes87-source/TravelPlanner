import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PASSWORD_KEY = 'travelPlanner_authenticated';
// Use VITE_APP_PASSWORD from env if set (recommended for prod); otherwise fallback
const CORRECT_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'betterthanlego2026!';

export function PasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const { setUnlocked } = useAuth();

  useEffect(() => {
    const isAuth = sessionStorage.getItem(PASSWORD_KEY) === 'true';
    setAuthenticated(isAuth);
  }, []);

  useEffect(() => {
    if (authenticated) setUnlocked(true);
  }, [authenticated, setUnlocked]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    const input = form.querySelector('input[type="password"]');
    const password = input?.value?.trim() || '';

    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem(PASSWORD_KEY, 'true');
      setError('');
      setAuthenticated(true);
    } else {
      setError('Incorrect password. Please try again.');
      input?.focus();
    }
  };

  if (authenticated) {
    return children;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--color-bg-primary, #000)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 30,
          maxWidth: 400,
          width: '100%',
        }}
      >
        <img
          src={`${import.meta.env.BASE_URL || '/'}assets/app-icons/icon.svg`}
          alt="Travel Planner"
          style={{
            width: 120,
            height: 120,
            filter: 'brightness(0) invert(1)',
          }}
        />
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: 'var(--color-text-primary)',
            textAlign: 'center',
            letterSpacing: '0.12em',
            margin: 0,
          }}
        >
          This is a mirage
        </h2>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            width: '100%',
            alignItems: 'center',
          }}
        >
          <div style={{ width: '100%' }}>
            <input
              type="password"
              placeholder="Enter password"
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '14px 18px',
                background: 'var(--color-bg-tertiary, #2a2a2a)',
                border: '2px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                color: 'var(--color-text-primary)',
                fontSize: 16,
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <div
                style={{
                  color: 'var(--color-error, #ef4444)',
                  fontSize: 14,
                  textAlign: 'center',
                  marginTop: 10,
                }}
              >
                {error}
              </div>
            )}
          </div>
          <button
            type="submit"
            style={{
              padding: '14px 32px',
              background: 'var(--color-primary, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
