import { lazy, Suspense, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoginGate } from './components/LoginGate';
import { AppLayout } from './components/AppLayout';
import { NotificationPrompt } from './components/NotificationPrompt';
import { InstallPrompt } from './components/InstallPrompt';
import { LoadingState } from './components/LoadingState';
import { ViewerProvider } from './contexts/ViewerContext';
import { makeViewerLoader, readViewerToken } from './lib/viewerLoader';
import { AuthProvider } from './contexts/AuthContext';
import { TravelDataProvider } from './contexts/TravelDataProvider';
import { UsPage } from './pages/UsPage';
import { PastAllTime } from './pages/PastAllTime';
import { PastRelationship } from './pages/PastRelationship';
import { PresentToBook } from './pages/PresentToBook';
import { PresentBooked } from './pages/PresentBooked';
import { FutureScenarios } from './pages/FutureScenarios';
import { FutureBucketList } from './pages/FutureBucketList';

const PastMap = lazy(() => import('./pages/PastMap').then((m) => ({ default: m.PastMap })));

function PageLoader() {
  return <LoadingState loading={true} />;
}

const mainRoutes = (
  <Route path="/" element={<AppLayout />}>
    <Route index element={<Navigate to="/us" replace />} />
    <Route path="us" element={<UsPage />} />
    <Route path="past" element={<Navigate to="/past/all-time" replace />} />
    <Route path="past/all-time" element={<PastAllTime />} />
    <Route path="past/relationship" element={<PastRelationship />} />
    <Route path="past/map" element={<Suspense fallback={<PageLoader />}><PastMap /></Suspense>} />
    <Route path="present" element={<Navigate to="/present/to-book" replace />} />
    <Route path="present/to-book" element={<PresentToBook />} />
    <Route path="present/booked" element={<PresentBooked />} />
    <Route path="future" element={<Navigate to="/future/scenarios" replace />} />
    <Route path="future/scenarios" element={<FutureScenarios />} />
    <Route path="future/bucket-list" element={<FutureBucketList />} />
    <Route path="*" element={<Navigate to="/us" replace />} />
  </Route>
);

const viewerRoutes = (
  <Route path="view" element={<AppLayout />}>
    <Route index element={<Navigate to="/view/us" replace />} />
    <Route path="us" element={<UsPage />} />
    <Route path="past" element={<Navigate to="/view/past/all-time" replace />} />
    <Route path="past/all-time" element={<PastAllTime />} />
    <Route path="past/relationship" element={<PastRelationship />} />
    <Route path="past/map" element={<Suspense fallback={<PageLoader />}><PastMap /></Suspense>} />
    <Route path="present" element={<Navigate to="/view/present/to-book" replace />} />
    <Route path="present/to-book" element={<PresentToBook />} />
    <Route path="present/booked" element={<PresentBooked />} />
    <Route path="future" element={<Navigate to="/view/future/scenarios" replace />} />
    <Route path="future/scenarios" element={<FutureScenarios />} />
    <Route path="future/bucket-list" element={<FutureBucketList />} />
    <Route path="*" element={<Navigate to="/view/us" replace />} />
  </Route>
);

/** Read-only share link: data comes from the viewer-data Edge Function. */
function ViewerApp() {
  const [token] = useState(() => readViewerToken());
  const loader = useMemo(() => makeViewerLoader(token), [token]);
  const viewer = useMemo(() => ({ isViewer: true, basePath: '/view', token }), [token]);
  return (
    <ViewerProvider value={viewer}>
      <TravelDataProvider loader={loader} loadSync={null}>
        <Routes>{viewerRoutes}</Routes>
      </TravelDataProvider>
    </ViewerProvider>
  );
}

function AppRouter() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/view')) return <ViewerApp />;

  return (
    <LoginGate>
      <TravelDataProvider>
        <Routes>{mainRoutes}</Routes>
      </TravelDataProvider>
    </LoginGate>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <InstallPrompt />
        <NotificationPrompt />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
