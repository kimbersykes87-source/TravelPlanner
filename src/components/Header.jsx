import { Icon } from './Icon';

export function Header() {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: '14px 16px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-bg-quaternary)',
        flexShrink: 0,
      }}
    >
      <Icon name="us" size={22} style={{ color: 'var(--color-text-primary)' }} />
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: 'var(--color-text-primary)',
          textTransform: 'uppercase',
        }}
      >
        Fionas Kimberinho
      </span>
    </header>
  );
}
