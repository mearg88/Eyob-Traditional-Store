import { createHashRouter } from 'react-router-dom';
import { lazy, Suspense, type ReactNode } from 'react';
import Layout from './components/Layout';
import ErrorPage from './pages/ErrorPage';
import Home from './pages/Home';
import PageSpinner from './components/PageSpinner';

// Hash routing, chosen for Capacitor: inside the native app the bundle loads
// from the device filesystem, where there is no server to map deep paths back
// to index.html. Clean URLs still work on the web — index.html redirects them
// into the hash route, and api/og.ts serves link previews at the same paths.
const Shop = lazy(() => import('./pages/Shop'));
const DesignPage = lazy(() => import('./pages/DesignPage'));
const HowToMeasure = lazy(() => import('./pages/HowToMeasure'));
const SignIn = lazy(() => import('./pages/account/SignIn'));
const SignUp = lazy(() => import('./pages/account/SignUp'));
const Account = lazy(() => import('./pages/account/Account'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderPage = lazy(() => import('./pages/OrderPage'));
const ConfirmMeasurements = lazy(() => import('./pages/ConfirmMeasurements'));
// The admin is a separate chunk, so customers never download it.
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

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
      { path: 'account', element: lazily(<Account />) },
      { path: 'account/sign-in', element: lazily(<SignIn />) },
      { path: 'account/join', element: lazily(<SignUp />) },
      { path: 'cart', element: lazily(<Cart />) },
      { path: 'checkout', element: lazily(<Checkout />) },
      { path: 'order/:reference', element: lazily(<OrderPage />) },
      { path: 'order/:reference/measurements', element: lazily(<ConfirmMeasurements />) },
    ],
  },
  { path: '/admin/*', element: lazily(<AdminApp />), errorElement: <ErrorPage /> },
]);
