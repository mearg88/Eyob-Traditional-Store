import { Navigate, Route, Routes } from 'react-router-dom';
import { useAdmin } from '../../lib/adminAuth';
import AdminLayout from './AdminLayout';
import AdminLogin from './AdminLogin';
import Dashboard from './Dashboard';
import AdminProducts from './AdminProducts';
import AdminProductEdit from './AdminProductEdit';
import AdminOrders from './AdminOrders';
import AdminOrderDetail from './AdminOrderDetail';
import AdminShipping from './AdminShipping';
import AdminPromos from './AdminPromos';
import AdminSettings from './AdminSettings';

export default function AdminApp() {
  const signedIn = useAdmin((s) => s.signedIn);

  if (!signedIn) return <AdminLogin />;

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/:id" element={<AdminProductEdit />} />
        <Route path="products/new" element={<AdminProductEdit />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="orders/:id" element={<AdminOrderDetail />} />
        <Route path="shipping" element={<AdminShipping />} />
        <Route path="promos" element={<AdminPromos />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
