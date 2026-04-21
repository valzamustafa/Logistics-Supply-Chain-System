import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, Bell, User } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'User';

  const initial = user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <header className="border-b border-slate-700 bg-slate-800 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500">
            <span className="text-sm font-bold text-white">LJ</span>
          </div>
          <h1 className="text-xl font-bold text-white">Logjistika</h1>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-700">
            <Bell className="w-5 h-5" />
          </button>
          
          <div className="text-right">
            <p className="text-sm font-semibold text-white">{displayName}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
            {user?.roles?.[0] && (
              <span className="text-xs px-1.5 py-0.5 bg-cyan-600/20 text-cyan-400 rounded-full">
                {user.roles[0]}
              </span>
            )}
          </div>
          
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-sm font-bold text-white">
            {initial}
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-600/30"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}