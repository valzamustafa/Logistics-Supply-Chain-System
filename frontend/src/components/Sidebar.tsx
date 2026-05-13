
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

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
   
    { label: 'Dashboard', icon: '📊', path: getDashboardPath(userRole), roles: ['Admin', 'Manager', 'User', 'Driver', 'WarehouseStaff', 'Warehouse', 'Supplier'] },
    
   
    { label: 'Create Order', icon: '🛒', path: '/create-order', roles: ['User'] },
    { label: 'My Orders', icon: '📋', path: '/my-orders', roles: ['User'] },
    { label: 'Track Shipment', icon: '📍', path: '/track-shipment', roles: ['User'] },
  
    { label: 'Products', icon: '🏷️', path: '/products', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse', 'Supplier'] },
    
    
    { label: 'Tracking', icon: '🚚', path: '/tracking', roles: ['Admin', 'Manager', 'Driver', 'WarehouseStaff', 'Warehouse'] },
    
    { label: 'Orders', icon: '📦', path: '/orders', roles: ['Admin', 'Manager', 'User'] },
    
    { label: 'Warehouses', icon: '🏭', path: '/warehouses', roles: ['Admin', 'Manager'] },
    { label: 'Staff', icon: '👥', path: '/manager/staff', roles: ['Manager'] },
    
    { label: 'Inventory', icon: '📦', path: '/inventory', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
    
    { label: 'Suppliers', icon: '🛒', path: '/suppliers', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
   
    { label: 'Shipments', icon: '✈️', path: '/shipments', roles: ['Admin', 'Manager', 'Driver'] },
   
    { label: 'Reports', icon: '📈', path: '/reports', roles: ['Admin', 'Manager'] },

    { label: 'Users', icon: '👥', path: '/admin/users', roles: ['Admin'] },
    { label: 'Roles', icon: '🔑', path: '/admin/roles', roles: ['Admin'] },
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
    <aside className="w-64 border-r border-slate-700 bg-slate-800 p-6 flex flex-col h-screen">
      {/* Logo Section */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-white">LogiTrack</h1>
        <p className="text-xs text-slate-400 mt-1">Supply Chain Management</p>
      </div>
      
      {/* Navigation */}
      <nav className="space-y-2 flex-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={`${item.path}-${item.label}`}
              to={item.path}
              className={({ isActive: navActive }) => `flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                active || navActive
                  ? 'bg-cyan-500 text-slate-900 font-semibold'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      
      {/* User Info Footer */}
      <div className="mt-8 pt-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <span className="text-cyan-400 text-sm font-medium">
              {user?.firstName?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {user?.firstName || user?.email?.split('@')[0] || 'User'}
            </p>
            <p className="text-slate-400 text-xs">{userRole}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}