import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PasswordGate } from './components/PasswordGate';
import { AppLayout } from './components/AppLayout';
import { NotificationPrompt } from './components/NotificationPrompt';
import { InstallPrompt } from './components/InstallPrompt';
import { LoadingState } from './components/LoadingState';
import { ViewerProvider } from './contexts/ViewerContext';
import { AuthProvider } from './contexts/AuthContext';
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

const isDev = import.meta.env.DEV;

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
  <Route path="view" element={<ViewerProvider value={{ isViewer: true, basePath: '/view' }}><AppLayout /></ViewerProvider>}>
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

function AppRouter() {
  const { pathname } = useLocation();
  const isViewerPath = pathname.startsWith('/view');

  if (isViewerPath) {
    return (
      <Routes>
        {viewerRoutes}
      </Routes>
    );
  }

  const content = <Routes>{mainRoutes}</Routes>;
  return isDev ? content : <PasswordGate>{content}</PasswordGate>;
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
