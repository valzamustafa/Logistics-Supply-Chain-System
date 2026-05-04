import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedLayout } from './components/ProtectedLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import { DriverDashboard } from './pages/driver/DriverDashboard';
import { WarehouseDashboard } from './pages/warehouse/WarehouseDashboard';
import { UserDashboard } from './pages/user/UserDashboard';
import { CreateOrderPage } from './pages/user/CreateOrderPage';
import { MyOrdersPage } from './pages/user/MyOrdersPage';
import { SupplierDashboard } from './pages/supplier/SupplierDashboard';
import { TrackingPage } from './pages/TrackingPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { ShipmentsPage } from './pages/ShipmentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { UsersPage } from './pages/admin/UsersPage';
import { RolesPage } from './pages/admin/RolesPage';
import { WarehouseManagement } from './pages/manager/WarehouseManagement';
import { SuppliersPage } from './pages/SuppliersPage';
import { TrackShipment } from './pages/TrackShipment';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';

function AppContent() {
  const { user, isLoading } = useAuth();
  
  const rolePriority = ['Admin', 'Manager', 'Supplier', 'Driver', 'WarehouseStaff', 'Warehouse', 'User'];
  const userRole = user?.roles?.find((role) => rolePriority.includes(role)) || 'User';

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
      case 'Supplier': return '/supplier';
      case 'WarehouseStaff':
      case 'Warehouse':
        return '/warehouse';
      default: return '/dashboard';
    }
  };

  return (
    <Routes>
      {/* Public Routes  */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Dashboard Routes  */}
      <Route path="/admin" element={<ProtectedLayout allowedRoles={['Admin']}><AdminDashboard /></ProtectedLayout>} />
      <Route path="/manager" element={<ProtectedLayout allowedRoles={['Manager']}><ManagerDashboard /></ProtectedLayout>} />
      <Route path="/driver" element={<ProtectedLayout allowedRoles={['Driver']}><DriverDashboard /></ProtectedLayout>} />
      <Route path="/supplier" element={<ProtectedLayout allowedRoles={['Supplier']}><SupplierDashboard /></ProtectedLayout>} />
      <Route path="/warehouse" element={<ProtectedLayout allowedRoles={['WarehouseStaff', 'Warehouse']}><WarehouseDashboard /></ProtectedLayout>} />
      <Route path="/dashboard" element={<ProtectedLayout allowedRoles={['User']}><UserDashboard /></ProtectedLayout>} />
      
      {/* User Specific Routes */}
      <Route path="/create-order" element={<ProtectedLayout allowedRoles={['User']}><CreateOrderPage /></ProtectedLayout>} />
      <Route path="/my-orders" element={<ProtectedLayout allowedRoles={['User']}><MyOrdersPage /></ProtectedLayout>} />
      <Route path="/track-shipment/:id?" element={<ProtectedLayout allowedRoles={['User']}><TrackShipment /></ProtectedLayout>} />
      
      {/* Feature Routes*/}
      <Route path="/tracking" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'User', 'Driver']}><TrackingPage /></ProtectedLayout>} />
      <Route path="/orders" element={<ProtectedLayout allowedRoles={['Admin', 'Manager']}><OrdersPage /></ProtectedLayout>} />
      <Route path="/products" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'User', 'WarehouseStaff', 'Warehouse', 'Supplier']}><ProductsPage /></ProtectedLayout>} />
      <Route path="/inventory" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}><InventoryPage /></ProtectedLayout>} />
      <Route path="/shipments" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'Driver']}><ShipmentsPage /></ProtectedLayout>} />
      <Route path="/reports" element={<ProtectedLayout allowedRoles={['Admin', 'Manager']}><ReportsPage /></ProtectedLayout>} />
      <Route path="/suppliers" element={<ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}><SuppliersPage /></ProtectedLayout>} />
      
      {/* Admin Only Routes */}
      <Route path="/admin/users" element={<ProtectedLayout allowedRoles={['Admin']}><UsersPage /></ProtectedLayout>} />
      <Route path="/admin/roles" element={<ProtectedLayout allowedRoles={['Admin']}><RolesPage /></ProtectedLayout>} />
      
      {/* Manager Only Routes */}
      <Route path="/warehouses" element={<ProtectedLayout allowedRoles={['Admin', 'Manager']}><WarehouseManagement /></ProtectedLayout>} />
      
      <Route path="/" element={<Navigate to={getDashboardPath()} replace />} />
      

      <Route path="*" element={<Navigate to={getDashboardPath()} replace />} />
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
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;