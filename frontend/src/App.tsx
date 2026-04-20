import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedLayout } from './components/ProtectedLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { OrdersPage } from './pages/OrderPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { TrackingPage } from './pages/TrackingPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { UserDashboard } from './pages/user/UserDashboard';

const PlaceholderPage = () => (
  <div className="flex h-full items-center justify-center text-white">
    <div className="text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
      <p className="text-slate-400">This feature is under development</p>
    </div>
  </div>
);

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
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/admin" element={
        <ProtectedLayout allowedRoles={['Admin']}>
          <AdminDashboard />
        </ProtectedLayout>
      } />
      <Route path="/manager" element={
        <ProtectedLayout allowedRoles={['Manager']}>
          <ManagerDashboard />
        </ProtectedLayout>
      } />
      <Route path="/driver" element={
        <ProtectedLayout allowedRoles={['Driver']}>
          <DriverDashboard />
        </ProtectedLayout>
      } />
      <Route path="/dashboard" element={
        <ProtectedLayout allowedRoles={['User']}>
          <UserDashboard />
        </ProtectedLayout>
      } />
      

      <Route path="/warehouse" element={
        <ProtectedLayout allowedRoles={['WarehouseStaff', 'Warehouse']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      
   
      <Route path="/products" element={
        <ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      <Route path="/inventory" element={
        <ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      <Route path="/orders" element={
        <ProtectedLayout allowedRoles={['Admin', 'Manager', 'User']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      <Route path="/shipments" element={
        <ProtectedLayout allowedRoles={['Admin', 'Manager', 'Driver']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      <Route path="/tracking" element={
        <ProtectedLayout allowedRoles={['Admin', 'Manager', 'User', 'Driver']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      <Route path="/reports" element={
        <ProtectedLayout allowedRoles={['Admin', 'Manager']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      <Route path="/admin/users" element={
        <ProtectedLayout allowedRoles={['Admin']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      <Route path="/admin/roles" element={
        <ProtectedLayout allowedRoles={['Admin']}>
          <PlaceholderPage />
        </ProtectedLayout>
      } />
      
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