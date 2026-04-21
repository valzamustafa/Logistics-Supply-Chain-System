import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedLayout } from './components/ProtectedLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { WarehouseDashboard } from './pages/warehouse/WarehouseDashboard';
import { UserDashboard } from './pages/user/UserDashboard';
import { TrackingPage } from './pages/TrackingPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { AuthProvider, useAuth } from './hooks/useAuth';

function AppContent() {
  const { user, isLoading } = useAuth();
  const userRole = user?.roles?.[0] || 'User';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  const getDashboardPath = () => {
    switch (userRole) {
      case 'Admin': return '/admin';
      case 'Manager': return '/manager';
      case 'Driver': return '/driver';
      case 'WarehouseStaff':
      case 'Warehouse':
        return '/warehouse';
      default: return '/dashboard';
    }
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      <Route path="/admin" element={<ProtectedLayout allowedRoles={['Admin']}><AdminDashboard /></ProtectedLayout>} />
      <Route path="/manager" element={<ProtectedLayout allowedRoles={['Manager']}><ManagerDashboard /></ProtectedLayout>} />
      <Route path="/driver" element={<ProtectedLayout allowedRoles={['Driver']}><DriverDashboard /></ProtectedLayout>} />
      <Route path="/warehouse" element={<ProtectedLayout allowedRoles={['WarehouseStaff', 'Warehouse']}><WarehouseDashboard /></ProtectedLayout>} />
      <Route path="/dashboard" element={<ProtectedLayout allowedRoles={['User']}><UserDashboard /></ProtectedLayout>} />
      
      <Route path="/tracking" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'User', 'Driver']}><TrackingPage /></ProtectedLayout>} />
      <Route path="/orders" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'User']}><OrdersPage /></ProtectedLayout>} />
      <Route path="/products" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}><ProductsPage /></ProtectedLayout>} />
      <Route path="/inventory" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}><InventoryPage /></ProtectedLayout>} />
      <Route path="/shipments" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'Driver']}><ShipmentsPage /></ProtectedLayout>} />
      <Route path="/reports" element={<ProtectedLayout allowedRoles={['Admin', 'Manager']}><ReportsPage /></ProtectedLayout>} />
      <Route path="/admin/users" element={<ProtectedLayout allowedRoles={['Admin']}><UsersPage /></ProtectedLayout>} />
      <Route path="/admin/roles" element={<ProtectedLayout allowedRoles={['Admin']}><RolesPage /></ProtectedLayout>} />
      
      <Route path="/" element={<Navigate to={getDashboardPath()} replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;