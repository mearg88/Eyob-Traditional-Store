import { createHashRouter } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import Layout from './components/Layout';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/Home';
import PageSpinner from './components/PageSpinner';

// Hash routing, chosen for Capacitor: inside the native app the bundle loads
// from the device filesystem, where there is no server to map deep paths back
// to index.html. Clean URLs still work on the web — see index.html, which
// redirects them into the hash route, and api/og.ts, which serves link
// previews at the same clean paths.
const Shop = lazy(() => import('./pages/Shop'));
const DesignPage = lazy(() => import('./pages/DesignPage'));
const HowToMeasure = lazy(() => import('./pages/HowToMeasure'));

const lazily = (element: ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{element}</Suspense>
);

export const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: 'shop', element: lazily(<Shop />) },
      { path: 'shop/:categorySlug', element: lazily(<Shop />) },
      { path: 'design/:slug', element: lazily(<DesignPage />) },
      { path: 'how-to-measure', element: lazily(<HowToMeasure />) },
    ],
  },
]);
