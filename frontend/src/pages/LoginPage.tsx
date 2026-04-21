import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login } from '../services/authService';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login: setAuth } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email, password);
      
      const userData = {
        id: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: data.roles || ['User'],
        isActive: true,
      };

      setAuth(data.token, userData);
      
      const role = userData.roles[0];
      if (role === 'Admin') navigate('/admin');
      else if (role === 'Manager') navigate('/manager');
      else if (role === 'Driver') navigate('/driver');
      else if (role === 'WarehouseStaff' || role === 'Warehouse') navigate('/warehouse');
      else navigate('/dashboard');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 mx-auto mb-4">
              <span className="text-2xl font-bold text-white">LJ</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Welcome to Logjistika</h1>
            <p className="mt-2 text-slate-400">Logistics & Supply Chain Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="admin@logjistika.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-950/70 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-3 font-semibold text-white transition hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-slate-400">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-cyan-400 hover:text-cyan-300">
                  Create one
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden flex-1 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 lg:flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-3xl font-bold text-white mb-4">Global Supply Chain</h2>
          <p className="text-slate-300 max-w-sm">Track shipments, manage inventory, and optimize logistics in real-time.</p>
        </div>
      </div>
    </div>
  );
}