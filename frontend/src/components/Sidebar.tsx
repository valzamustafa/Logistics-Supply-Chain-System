import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import {
  Home,
  ShoppingCart,
  ClipboardList,
  MapPin,
  Tag,
  Truck,
  Box,
  Warehouse,
  Users,
  Archive,
  Package,
  BarChart3,
  Key,
  MessageCircle,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  onOpenChat: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ onOpenChat, mobileOpen = false, onCloseMobile }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const rolePriority = ['Admin', 'Manager', 'Supplier', 'Driver', 'WarehouseStaff', 'Warehouse', 'User'];
  const userRole = user?.roles?.find((role) => rolePriority.includes(role)) || 'User';
  const userRoleLabel = t(
    `sidebar.${userRole === 'WarehouseStaff' ? 'warehouse' : userRole.toLowerCase()}`,
    userRole
  );

  function getDashboardPath(role: string): string {
    switch (role) {
      case 'Admin': return '/admin';
      case 'Manager': return '/manager';
      case 'Driver': return '/driver';
      case 'Supplier': return '/supplier';
      case 'WarehouseStaff':
      case 'Warehouse':
        return '/warehouse';
      default: return '/dashboard';
    }
  }

  const navItems = [
    { label: t('navigation.dashboard'), icon: <Home className="h-5 w-5" />, path: getDashboardPath(userRole), roles: ['Admin', 'Manager', 'User', 'Driver', 'WarehouseStaff', 'Warehouse', 'Supplier'] },
    { label: t('orders.createOrder'), icon: <ShoppingCart className="h-5 w-5" />, path: '/create-order', roles: ['User'] },
    { label: t('orders.myOrders'), icon: <ClipboardList className="h-5 w-5" />, path: '/my-orders', roles: ['User'] },
    { label: t('shipments.track'), icon: <MapPin className="h-5 w-5" />, path: '/track-shipment', roles: ['User'] },
    { label: t('products.title'), icon: <Tag className="h-5 w-5" />, path: '/products', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse', 'Supplier'] },
    { label: t('navigation.tracking'), icon: <Truck className="h-5 w-5" />, path: '/tracking', roles: ['Admin', 'Manager', 'Driver', 'WarehouseStaff', 'Warehouse'] },
    { label: t('navigation.orders'), icon: <Box className="h-5 w-5" />, path: '/orders', roles: ['Admin', 'Manager', 'User'] },
    { label: t('navigation.warehouses'), icon: <Warehouse className="h-5 w-5" />, path: '/warehouses', roles: ['Admin', 'Manager'] },
    { label: 'Staff', icon: <Users className="h-5 w-5" />, path: '/manager/staff', roles: ['Manager'] },
    { label: t('navigation.inventory'), icon: <Archive className="h-5 w-5" />, path: '/inventory', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
    { label: t('navigation.suppliers'), icon: <Package className="h-5 w-5" />, path: '/suppliers', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
    { label: t('navigation.shipments'), icon: <Truck className="h-5 w-5" />, path: '/shipments', roles: ['Admin', 'Manager', 'Driver'] },
    { label: t('navigation.reports'), icon: <BarChart3 className="h-5 w-5" />, path: '/reports', roles: ['Admin', 'Manager'] },
    { label: t('navigation.users'), icon: <Users className="h-5 w-5" />, path: '/admin/users', roles: ['Admin'] },
    { label: t('navigation.roles'), icon: <Key className="h-5 w-5" />, path: '/admin/roles', roles: ['Admin'] },
    { label: t('navigation.settings'), icon: <Settings className="h-5 w-5" />, path: '/settings', roles: ['Admin'] },
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const isActive = (path: string) => {
    if (path === getDashboardPath(userRole)) {
      return location.pathname === '/admin' ||
             location.pathname === '/manager' ||
             location.pathname === '/driver' ||
             location.pathname === '/warehouse' ||
             location.pathname === '/dashboard' ||
             location.pathname === '/supplier';
    }
    return location.pathname === path;
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
      />
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-sm transition-transform duration-300 lg:static lg:translate-x-0 lg:flex ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} dark:border-slate-700 dark:bg-slate-950`}>

      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t('common.workspace')}</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">LogiTrack</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('common.supplyChainMonitoring')}</p>
          </div>
          {onCloseMobile ? (
            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm lg:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
        {filteredNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={`${item.path}-${item.label}`}
              to={item.path}
              onClick={onCloseMobile}
              className={({ isActive: navActive }) => `flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-semibold transition-all ${
                active || navActive
                  ? 'border-teal-200 bg-teal-50 text-teal-800 shadow-sm'
                  : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <span className={active ? 'text-teal-700' : 'text-slate-400'}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <button
          type="button"
          onClick={onOpenChat}
          className="btn-primary w-full justify-center"
        >
          <MessageCircle className="h-4 w-4" />
          {t('common.startChat')}
        </button>
      </div>
      
      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50">
            <span className="text-sm font-semibold text-teal-700">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-900 text-sm font-medium truncate">
              {user?.firstName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-slate-500 text-xs">{userRoleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}


