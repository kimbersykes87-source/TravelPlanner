import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { shareUrl } from '../lib/viewerLoader';
import { useAuth } from '../hooks/useAuth';

const buttonStyle = {
  padding: '10px 14px',
  background: 'var(--color-bg-tertiary)',
  color: 'var(--color-text-primary)',
  border: '1px solid var(--color-bg-quaternary)',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
};

function newToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Read-only share link management and sign out, shown at the bottom of the Us tab. */
export function AccountPanel() {
  const { user, signOut } = useAuth();
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | unavailable
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('viewer_links')
      .select('token')
      .is('revoked_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      setStatus('unavailable');
      return;
    }
    setToken(data?.[0]?.token || null);
    setStatus('ready');
  }, []);

  useEffect(() => {
    // Fetch once on mount; state is set after the request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (supabase) load();
  }, [load]);

  const makeNewLink = async () => {
    const replacing = !!token;
    if (replacing && !window.confirm('Make a new link? The current link will stop working.')) return;
    setMessage('');
    if (replacing) {
      await supabase.from('viewer_links').update({ revoked_at: new Date().toISOString() }).is('revoked_at', null);
    }
    const next = newToken();
    const { error } = await supabase.from('viewer_links').insert({ token: next });
    if (error) {
      setMessage(`Could not create a link: ${error.message}`);
      return;
    }
    setToken(next);
    setMessage(replacing ? 'New link created. The old one no longer works.' : 'Link created.');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setMessage('Link copied.');
    } catch {
      setMessage('Copy failed. Select the link and copy it manually.');
    }
  };

  return (
    <section
      style={{
        marginTop: 8,
        padding: 20,
        background: 'var(--color-bg-secondary)',
        borderRadius: 15,
        border: '1px solid var(--color-bg-tertiary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 14, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Read-only share link
      </h2>
      {status === 'unavailable' && (
        <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-tertiary)' }}>
          Available once the security update has been applied to the database.
        </p>
      )}
      {status === 'ready' && (
        <>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            Anyone with this link can browse Past, Present and Future. Passports, visas and UK work days stay hidden.
          </p>
          {token && (
            <code style={{ fontSize: 12, wordBreak: 'break-all', color: 'var(--color-text-secondary)' }}>{shareUrl(token)}</code>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {token && (
              <button type="button" onClick={copy} style={buttonStyle}>
                Copy link
              </button>
            )}
            <button type="button" onClick={makeNewLink} style={buttonStyle}>
              {token ? 'Make a new link' : 'Create link'}
            </button>
          </div>
        </>
      )}
      {message && (
        <p role="status" style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {message}
        </p>
      )}
      <div style={{ borderTop: '1px solid var(--color-bg-tertiary)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{user?.email ? `Signed in as ${user.email}` : ''}</span>
        <button type="button" onClick={signOut} style={buttonStyle}>
          Sign out
        </button>
      </div>
    </section>
  );
}
