
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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
} from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const rolePriority = ['Admin', 'Manager', 'Supplier', 'Driver', 'WarehouseStaff', 'Warehouse', 'User'];
  const userRole = user?.roles?.find((role) => rolePriority.includes(role)) || 'User';

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
    { label: 'Dashboard', icon: <Home className="h-5 w-5" />, path: getDashboardPath(userRole), roles: ['Admin', 'Manager', 'User', 'Driver', 'WarehouseStaff', 'Warehouse', 'Supplier'] },
    { label: 'Create Order', icon: <ShoppingCart className="h-5 w-5" />, path: '/create-order', roles: ['User'] },
    { label: 'My Orders', icon: <ClipboardList className="h-5 w-5" />, path: '/my-orders', roles: ['User'] },
    { label: 'Track Shipment', icon: <MapPin className="h-5 w-5" />, path: '/track-shipment', roles: ['User'] },
    { label: 'Products', icon: <Tag className="h-5 w-5" />, path: '/products', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse', 'Supplier'] },
    { label: 'Tracking', icon: <Truck className="h-5 w-5" />, path: '/tracking', roles: ['Admin', 'Manager', 'Driver', 'WarehouseStaff', 'Warehouse'] },
    { label: 'Orders', icon: <Box className="h-5 w-5" />, path: '/orders', roles: ['Admin', 'Manager', 'User'] },
    { label: 'Warehouses', icon: <Warehouse className="h-5 w-5" />, path: '/warehouses', roles: ['Admin', 'Manager'] },
    { label: 'Staff', icon: <Users className="h-5 w-5" />, path: '/manager/staff', roles: ['Manager'] },
    { label: 'Inventory', icon: <Archive className="h-5 w-5" />, path: '/inventory', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
    { label: 'Suppliers', icon: <Package className="h-5 w-5" />, path: '/suppliers', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
    { label: 'Shipments', icon: <Truck className="h-5 w-5" />, path: '/shipments', roles: ['Admin', 'Manager', 'Driver'] },
    { label: 'Reports', icon: <BarChart3 className="h-5 w-5" />, path: '/reports', roles: ['Admin', 'Manager'] },
    { label: 'Users', icon: <Users className="h-5 w-5" />, path: '/admin/users', roles: ['Admin'] },
    { label: 'Roles', icon: <Key className="h-5 w-5" />, path: '/admin/roles', roles: ['Admin'] },
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
    <aside className="w-72 border-r border-slate-200 bg-white px-5 py-6 flex flex-col h-screen shadow-sm">
  
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">LogiTrack</h1>
        <p className="text-sm text-slate-500 mt-1">Supply chain monitoring</p>
      </div>
      
      {/* Navigation */}
      <nav className="space-y-2 flex-1 overflow-y-auto pr-1">
        {filteredNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={`${item.path}-${item.label}`}
              to={item.path}
              className={({ isActive: navActive }) => `flex items-center gap-3 rounded-3xl px-4 py-3 text-sm transition ${
                active || navActive
                  ? 'bg-rose-500/10 text-rose-700 font-semibold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      {/* User Info Footer */}
      <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 text-sm font-medium">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-900 text-sm font-medium truncate">
              {user?.firstName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-slate-500 text-xs">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}


