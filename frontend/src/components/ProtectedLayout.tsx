import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface ProtectedLayoutProps {
  children: ReactNode;
  allowedRoles?: string[];
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'Admin':
      return '/admin';
    case 'Manager':
      return '/manager';
    case 'Driver':
      return '/driver';
    case 'WarehouseStaff':
    case 'Warehouse':
      return '/warehouse';
    default:
      return '/dashboard';
  }
}

export function ProtectedLayout({ children, allowedRoles }: ProtectedLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const publicRoutes: string[] = [];
  const userRoles = user?.roles ?? [];
  const hasRoleAccess = !allowedRoles || allowedRoles.length === 0 || userRoles.some(role => allowedRoles.includes(role));
  const redirectPath = userRoles.length ? getDashboardPath(userRoles[0]) : '/login';

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

  if (!isAuthenticated && !publicRoutes.includes(location.pathname)) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && !hasRoleAccess) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-900">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}