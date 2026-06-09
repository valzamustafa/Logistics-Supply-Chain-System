import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { login } from '../services/authService';
import { ShieldCheck, Truck } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('auth.loginFailed', 'Login failed. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f5f7fb]">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-teal-50 text-teal-700 shadow-sm">
              <ShieldCheck className="h-9 w-9" />
            </div>
            <h1 className="text-3xl font-bold text-slate-950">{t('auth.welcomeBack', 'Welcome back')}</h1>
            <p className="mt-2 text-slate-500">{t('auth.loginSubtitle', 'Secure access to your logistics dashboard.')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-md">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">{t('auth.email', 'Email Address')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition"
                  placeholder="admin@logjistika.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">{t('auth.password', 'Password')}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-100">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full px-4 py-3 disabled:opacity-50"
              >
                {loading ? t('auth.signingIn', 'Signing in...') : t('auth.signIn', 'Sign In')}
              </button>
            </div>

            <div className="text-center">
              <p className="text-slate-500">
                {t('auth.noAccount', "Don't have an account?")}{' '}
                <Link to="/register" className="font-semibold text-teal-700 hover:text-teal-800">
                  {t('auth.createOne', 'Create one')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center border-l border-slate-200 bg-slate-950 lg:flex">
        <div className="max-w-md p-10 text-left">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/20">
            <Truck className="h-8 w-8" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t('auth.platformLabel', 'Logjistika Platform')}</p>
          <h2 className="mb-4 text-4xl font-bold text-white">{t('auth.loginHeroTitle', 'Global operations, controlled from one desk.')}</h2>
          <p className="text-base leading-7 text-slate-300">{t('auth.loginHeroDescription', 'Track shipments, manage inventory and coordinate delivery workflows in real time.')}</p>
        </div>
      </div>
    </div>
  );
}




