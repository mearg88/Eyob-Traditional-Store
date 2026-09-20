import { createHashRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import StorefrontLayout from './components/StorefrontLayout';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/Home';
import PageSpinner from './components/PageSpinner';

// Hash routing, chosen for Capacitor: inside the native app the bundle is
// loaded from the device filesystem, where there is no server to map deep
// paths back to index.html. Hash URLs work identically on the web and in the
// app, which keeps one router for both.
const Catalogue = lazy(() => import('./pages/Catalogue'));
const ProductPage = lazy(() => import('./pages/ProductPage'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const SizeGuide = lazy(() => import('./pages/SizeGuide'));
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

const lazyRoute = (element: React.ReactNode) => (
  <Suspense fallback={<PageSpinner />}>{element}</Suspense>
);

export const router = createHashRouter([
  {
    path: '/',
    element: <StorefrontLayout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Home /> },
      { path: 'shop', element: lazyRoute(<Catalogue />) },
      { path: 'shop/:categorySlug', element: lazyRoute(<Catalogue />) },
      { path: 'product/:slug', element: lazyRoute(<ProductPage />) },
      { path: 'cart', element: lazyRoute(<Cart />) },
      { path: 'checkout', element: lazyRoute(<Checkout />) },
      { path: 'order/:reference', element: lazyRoute(<OrderConfirmation />) },
      { path: 'track', element: lazyRoute(<TrackOrder />) },
      { path: 'size-guide', element: lazyRoute(<SizeGuide />) },
    ],
  },
  { path: '/admin/*', element: lazyRoute(<AdminApp />), errorElement: <ErrorPage /> },
]);
