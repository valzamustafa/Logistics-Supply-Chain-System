import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { UserPlus, Package } from 'lucide-react';

export function RegisterPage() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch', 'Passwords do not match.'));
      return;
    }

    if (password.length < 8) {
      setError(t('auth.passwordTooShort', 'Password must be at least 8 characters.'));
      return;
    }

    setLoading(true);

    try {
      const data = await register(email, password, firstName, lastName);
      login(data.token, {
        id: data.userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: data.roles,
        isActive: true,
      });

      const role = data.roles?.[0] || 'User';
      if (role === 'Admin') navigate('/admin');
      else if (role === 'Manager') navigate('/manager');
      else if (role === 'Driver') navigate('/driver');
      else if (role === 'WarehouseStaff' || role === 'Warehouse') navigate('/warehouse');
      else navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registrationFailed', 'Registration failed. Please try again.'));
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
              <UserPlus className="h-9 w-9" />
            </div>
            <h1 className="text-3xl font-bold text-slate-950">{t('auth.createAccount', 'Create Account')}</h1>
            <p className="mt-2 text-slate-500">{t('auth.registerSubtitle', 'Join Logjistika and manage logistics with one platform.')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-8 shadow-md">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">{t('auth.firstName', 'First Name')}</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition"
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">{t('auth.lastName', 'Last Name')}</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">{t('auth.email', 'Email Address')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition"
                  placeholder="john@example.com"
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

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">{t('auth.confirmPassword', 'Confirm Password')}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? t('auth.creatingAccount', 'Creating account...') : t('auth.createAccount', 'Create Account')}
              </button>
            </div>

            <div className="text-center">
              <p className="text-slate-500">
                {t('auth.alreadyHaveAccount', 'Already have an account?')}{' '}
                <Link to="/login" className="font-semibold text-teal-700 hover:text-teal-800">
                  {t('auth.signIn', 'Sign in')}
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-center border-l border-slate-200 bg-slate-950 lg:flex">
        <div className="max-w-md p-10 text-left">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-lg bg-teal-500/15 text-teal-200 ring-1 ring-teal-400/20">
            <Package className="h-8 w-8" />
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-teal-200">{t('auth.smartLogistics', 'Smart Logistics')}</p>
          <h2 className="mb-4 text-4xl font-bold text-white">{t('auth.registerHeroTitle', 'One platform for every delivery workflow.')}</h2>
          <p className="text-base leading-7 text-slate-300">{t('auth.registerHeroDescription', 'Create orders, coordinate stock and keep every stakeholder aligned from dispatch to delivery.')}</p>
        </div>
      </div>
    </div>
  );
}





