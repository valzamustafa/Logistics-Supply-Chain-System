import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedLayout } from './components/ProtectedLayout';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';


const PlaceholderDashboard = () => (
    <div className="flex h-full items-center justify-center text-white">
        <div className="text-center">
            <div className="text-6xl mb-4">🚧</div>
            <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
            <p className="text-slate-400">This dashboard is under development</p>
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

            <Route path="/products" element={
                <ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}>
                    <ProductsPage />
                </ProtectedLayout>
            } />
            <Route path="/inventory" element={
                <ProtectedLayout allowedRoles={['Admin', 'Manager', 'WarehouseStaff', 'Warehouse']}>
                    <InventoryPage />
                </ProtectedLayout>
            } />

            {/* Dashboard Routes - Placeholders */}
            <Route path="/admin" element={
                <ProtectedLayout allowedRoles={['Admin']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/manager" element={
                <ProtectedLayout allowedRoles={['Manager']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/driver" element={
                <ProtectedLayout allowedRoles={['Driver']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/warehouse" element={
                <ProtectedLayout allowedRoles={['WarehouseStaff', 'Warehouse']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/dashboard" element={
                <ProtectedLayout allowedRoles={['User']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />

            {/* Other Feature Routes - Placeholders */}
            <Route path="/tracking" element={
                <ProtectedLayout allowedRoles={['Admin', 'Manager', 'User', 'Driver']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/orders" element={
                <ProtectedLayout allowedRoles={['Admin', 'Manager', 'User']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/shipments" element={
                <ProtectedLayout allowedRoles={['Admin', 'Manager', 'Driver']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/reports" element={
                <ProtectedLayout allowedRoles={['Admin', 'Manager']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/admin/users" element={
                <ProtectedLayout allowedRoles={['Admin']}>
                    <PlaceholderDashboard />
                </ProtectedLayout>
            } />
            <Route path="/admin/roles" element={
                <ProtectedLayout allowedRoles={['Admin']}>
                    <PlaceholderDashboard />
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