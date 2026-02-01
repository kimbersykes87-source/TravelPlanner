import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { useViewer } from '../contexts/ViewerContext';

const navItems = [
  { to: '/us', name: 'us', label: 'Us', end: true },
  { to: '/past', name: 'past', label: 'Past', end: false },
  { to: '/present', name: 'present', label: 'Present', end: false },
  { to: '/future', name: 'future', label: 'Future', end: false },
];

export function BottomNav() {
  const { basePath = '' } = useViewer();

  return (
    <nav
      className="bottom-nav"
      role="navigation"
      aria-label="Main navigation"
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        backgroundColor: 'var(--color-bg-secondary, #1a1a1a)',
        borderTop: '1px solid var(--color-bg-tertiary, #2a2a2a)',
        minHeight: 56,
      }}
    >
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={basePath + item.to}
          end={item.end}
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 56,
            minHeight: 44,
            padding: '4px 8px',
            color: isActive ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #cbd5e1)',
            textDecoration: 'none',
            fontSize: 12,
          })}
        >
          <Icon name={item.name} size={24} />
          <span style={{ marginTop: 2 }}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
