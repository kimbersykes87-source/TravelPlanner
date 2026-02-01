import { NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { useViewer } from '../contexts/ViewerContext';

const SUB_MENU_CONFIG = {
  past: [
    { to: '/past/all-time', label: 'All Time', icon: 'all-time' },
    { to: '/past/relationship', label: 'Relationship', icon: 'relationship' },
    { to: '/past/map', label: 'Map', icon: 'map' },
  ],
  present: [
    { to: '/present/to-book', label: 'To Book', icon: 'to-book' },
    { to: '/present/booked', label: 'Booked', icon: 'booked' },
  ],
  future: [
    { to: '/future/scenarios', label: 'Scenarios', icon: 'scenarios' },
    { to: '/future/bucket-list', label: 'Bucket List', icon: 'bucket-list' },
  ],
};

export function SubMenu() {
  const { pathname } = useLocation();
  const { basePath = '' } = useViewer();
  const pathParts = pathname.replace(/^\/view/, '').split('/').filter(Boolean);
  const section = pathParts[0];
  const items = SUB_MENU_CONFIG[section];

  if (!items) return null;

  return (
    <nav
      className="sub-menu"
      role="navigation"
      aria-label={`${section} sub-navigation`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 8,
        padding: '8px 16px',
        paddingBottom: 8,
        backgroundColor: 'var(--color-bg-tertiary, #2a2a2a)',
        borderTop: '1px solid var(--color-bg-quaternary, #3a3a3a)',
        minHeight: 44,
      }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={basePath + item.to}
          className={({ isActive }) => (isActive ? 'sub-link active' : 'sub-link')}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 12px',
            borderRadius: 8,
            color: isActive ? 'var(--color-primary, #3b82f6)' : 'var(--color-text-secondary, #cbd5e1)',
            textDecoration: 'none',
            fontSize: 14,
            whiteSpace: 'nowrap',
            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
          })}
        >
          <Icon name={item.icon} size={18} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
