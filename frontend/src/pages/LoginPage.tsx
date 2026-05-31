import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login } from '../services/authService';
import { ShieldCheck, Truck } from 'lucide-react';

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
    <div className="flex min-h-screen bg-slate-50">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-600 shadow-sm">
              <ShieldCheck className="h-9 w-9" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-slate-500">Secure access to your logistics dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="admin@logjistika.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 font-semibold text-white transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-slate-500">
                Don't have an account?{' '}
                <Link to="/register" className="font-semibold text-cyan-600 hover:text-cyan-500">
                  Create one
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden flex-1 bg-gradient-to-br from-cyan-100 to-blue-100 lg:flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-sm">
            <Truck className="h-10 w-10 text-cyan-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Global Logistics</h2>
          <p className="text-slate-500 max-w-sm mx-auto">Track shipments, manage inventory, and optimize logistics in real-time.</p>
        </div>
      </div>
    </div>
  );
}




