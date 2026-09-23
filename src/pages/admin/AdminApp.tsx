import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import AdminLayout from './AdminLayout';
import AdminSignIn from './AdminSignIn';
import Dashboard from './Dashboard';
import AdminDesigns from './AdminDesigns';
import AdminDesignEdit from './AdminDesignEdit';
import AdminCategories from './AdminCategories';
import AdminPricing from './AdminPricing';
import AdminSettings from './AdminSettings';

export default function AdminApp() {
  const staffRole = useAuth((s) => s.staffRole);

  // The gate that matters is Row Level Security in the database; this only
  // decides which screen to render. See lib/permissions.ts.
  if (!staffRole) return <AdminSignIn />;

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="designs" element={<AdminDesigns />} />
        <Route path="designs/new" element={<AdminDesignEdit />} />
        <Route path="designs/:id" element={<AdminDesignEdit />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="pricing" element={<AdminPricing />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
