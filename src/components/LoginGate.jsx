import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const inputStyle = {
  width: '100%',
  padding: '14px 18px',
  background: 'var(--color-bg-tertiary, #2a2a2a)',
  border: '2px solid rgba(255,255,255,0.15)',
  borderRadius: 10,
  color: 'var(--color-text-primary)',
  fontSize: 16,
  boxSizing: 'border-box',
};

/**
 * Sign-in screen for Kimber and Siona (Supabase Auth, email + password).
 * Shows children once signed in; the session is remembered on each device.
 */
export function LoginGate({ children }) {
  const { session, loading, signIn } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (loading) return null;
  if (session) return children;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await signIn(String(form.get('email') || ''), String(form.get('password') || ''));
    } catch (err) {
      setError(
        /invalid login/i.test(err?.message || '')
          ? 'That email and password do not match. Please try again.'
          : err?.message || 'Could not sign in. Check your connection and try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-bg-primary, #000)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30, maxWidth: 400, width: '100%' }}>
        <img
          src="/assets/app-icons/icon-192.png"
          alt=""
          style={{ width: 120, height: 120 }}
        />
        <h1
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
        </h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
          <label htmlFor="login-email" className="visually-hidden">Email</label>
          <input id="login-email" name="email" type="email" placeholder="Email" autoComplete="username" required style={inputStyle} />
          <label htmlFor="login-password" className="visually-hidden">Password</label>
          <input
            id="login-password"
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            required
            style={inputStyle}
          />
          <div role="alert" aria-live="polite" style={{ minHeight: 20, color: 'var(--color-error, #ef4444)', fontSize: 14, textAlign: 'center' }}>
            {error}
          </div>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '14px 32px',
              background: 'var(--color-primary, #3b82f6)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: busy ? 'wait' : 'pointer',
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
