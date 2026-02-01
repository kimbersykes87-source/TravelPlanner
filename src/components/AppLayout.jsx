import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { SubMenu } from './SubMenu';

export function AppLayout() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100dvh',
        boxSizing: 'border-box',
      }}
    >
      <Header />
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 16,
          paddingBottom: 120,
        }}
      >
        <Outlet />
      </main>
      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
        }}
      >
        <SubMenu />
        <BottomNav />
      </footer>
    </div>
  );
}
