import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, Route, Search, Globe, Moon, Sun } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { ChatButton } from './ChatButton';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../contexts/ThemeContext';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';

interface HeaderProps {
  onOpenChat: () => void;
  onToggleNav: () => void;
}

export function Header({ onOpenChat, onToggleNav }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage, getLanguageName } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const displayName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.email || 'User';

  const initial = user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U';
  const roleLabel = t(
    `sidebar.${user?.roles?.[0] === 'WarehouseStaff' ? 'warehouse' : user?.roles?.[0]?.toLowerCase() || 'operator'}`,
    user?.roles?.[0] || 'Operator'
  );

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8 dark:bg-slate-950/95 dark:border-slate-700">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleNav}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-white shadow-sm">
            <Route className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-950">{settings.companyName || 'Logjistika'}</h1>
              <span className="hidden rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 sm:inline-flex">
                {roleLabel}
              </span>
            </div>
            <p className="truncate text-sm text-slate-500">{t('common.overviewDescription')}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative hidden min-w-[260px] xl:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder={t('common.searchPlaceholder')}
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 shadow-sm"
            />
          </div>

          <NotificationDropdown />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <select
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className="h-10 rounded-3xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition hover:border-slate-300"
              title={t('settings.language')}
            >
              <option value="en">EN</option>
              <option value="sq">SQ</option>
              <option value="es">ES</option>
              <option value="fr">FR</option>
              <option value="de">DE</option>
              <option value="it">IT</option>
            </select>
          </div>

          <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 font-semibold">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
              <p className="max-w-[180px] truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn-ghost inline-flex items-center gap-2 text-slate-700"
          >
            <LogOut className="w-4 h-4" />
            {t('common.logout')}
          </button>
        </div>
      </div>
    </header>
  );
}




