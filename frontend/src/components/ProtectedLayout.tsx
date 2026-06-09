import { ReactNode, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChatModal } from './ChatModal';

interface ProtectedLayoutProps {
  children: ReactNode;
  allowedRoles?: string[];
}

const rolePriority = ['Admin', 'Manager', 'Supplier', 'Driver', 'WarehouseStaff', 'Warehouse', 'User'];

function getPrimaryRole(roles: string[] = []): string {
  return roles.find((role) => rolePriority.includes(role)) || 'User';
}

function getDashboardPath(role: string): string {
  switch (role) {
    case 'Admin':
      return '/admin';
    case 'Manager':
      return '/manager';
    case 'Driver':
      return '/driver';
    case 'Supplier':
      return '/supplier';
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const publicRoutes: string[] = [];
  const userRoles = user?.roles ?? [];
  const hasRoleAccess = !allowedRoles || allowedRoles.length === 0 || userRoles.some(role => allowedRoles.includes(role));
  const primaryRole = getPrimaryRole(userRoles);
  const redirectPath = userRoles.length ? getDashboardPath(primaryRole) : '/login';
  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);
  const openMobileNav = () => setIsMobileNavOpen(true);
  const closeMobileNav = () => setIsMobileNavOpen(false);
  const toggleMobileNav = () => setIsMobileNavOpen((prev) => !prev);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <Header onOpenChat={openChat} onToggleNav={toggleMobileNav} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenChat={openChat} mobileOpen={isMobileNavOpen} onCloseMobile={closeMobileNav} />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1680px] px-4 py-5 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      <ChatModal open={isChatOpen} onClose={closeChat} />
    </div>
  );
}


