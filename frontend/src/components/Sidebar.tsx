import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const userRole = user?.roles?.[0] || 'User';

  const navItems = [
    { label: 'Dashboard', icon: '📊', path: getDashboardPath(userRole), roles: ['Admin', 'Manager', 'User', 'Driver', 'WarehouseStaff', 'Warehouse'] },
    { label: 'Tracking', icon: '🚚', path: '/tracking', roles: ['Admin', 'Manager', 'User', 'Driver'] },
    { label: 'Orders', icon: '📦', path: '/orders', roles: ['Admin', 'Manager', 'User'] },
    { label: 'Products', icon: '🏷️', path: '/products', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
    { label: 'Inventory', icon: '📦', path: '/inventory', roles: ['Admin', 'Manager', 'WarehouseStaff', 'Warehouse'] },
    { label: 'Shipments', icon: '✈️', path: '/shipments', roles: ['Admin', 'Manager', 'Driver'] },
    { label: 'Reports', icon: '📈', path: '/reports', roles: ['Admin', 'Manager'] },
    { label: 'Users', icon: '👥', path: '/admin/users', roles: ['Admin'] },
    { label: 'Roles', icon: '🔑', path: '/admin/roles', roles: ['Admin'] },
  ];

  function getDashboardPath(role: string): string {
    switch (role) {
      case 'Admin': return '/admin';
      case 'Manager': return '/manager';
      case 'Driver': return '/driver';
      case 'WarehouseStaff':
      case 'Warehouse':
        return '/warehouse';
      default: return '/dashboard';
    }
  }

  const filteredNavItems = navItems.filter(item => 
    !item.roles || item.roles.includes(userRole)
  );

  const isActive = (path: string) => {
    if (path === getDashboardPath(userRole)) {
      return location.pathname === '/admin' || location.pathname === '/manager' || location.pathname === '/driver' || location.pathname === '/warehouse' || location.pathname === '/dashboard';
    }
    return location.pathname === path;
  };

  return (
    <aside className="w-64 border-r border-slate-700 bg-slate-800 p-6">
      <nav className="space-y-2">
        {filteredNavItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
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
    </aside>
  );
}