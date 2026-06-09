import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../hooks/useLanguage';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';

interface SettingsFormProps {
  formData: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
    companyAddress: string;
    systemLanguage: string;
    systemTheme?: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  onThemeSelect?: (theme: 'light' | 'dark') => void;
}

export default function SettingsForm({ formData, onChange, onSubmit, saving, onThemeSelect }: SettingsFormProps) {
  const { t } = useTranslation();
  const { changeLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e);
  
    changeLanguage(e.target.value);
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    if (onThemeSelect) onThemeSelect(newTheme);
  };

  return (
    <form onSubmit={onSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
   
      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          {t('settings.companyName')} *
        </label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          value={formData.companyName}
          onChange={onChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('settings.companyName')}
        />
        <p className="mt-1 text-sm text-gray-500">{t('settings.companyNameDesc')}</p>
      </div>

    
      <div>
        <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
          {t('settings.companyEmail')} *
        </label>
        <input
          type="email"
          id="companyEmail"
          name="companyEmail"
          value={formData.companyEmail}
          onChange={onChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('settings.companyEmailPlaceholder', 'info@company.com')}
        />
        <p className="mt-1 text-sm text-gray-500">{t('settings.companyEmailDesc')}</p>
      </div>


      <div>
        <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
          {t('settings.companyPhone')} *
        </label>
        <input
          type="tel"
          id="companyPhone"
          name="companyPhone"
          value={formData.companyPhone}
          onChange={onChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('settings.companyPhonePlaceholder', '+1-800-000-0000')}
        />
        <p className="mt-1 text-sm text-gray-500">{t('settings.companyPhoneDesc')}</p>
      </div>

  
      <div>
        <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700">
          {t('settings.companyAddress')} *
        </label>
        <input
          type="text"
          id="companyAddress"
          name="companyAddress"
          value={formData.companyAddress}
          onChange={onChange}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('settings.companyAddressPlaceholder', '123 Business St, Suite 100, City, State 12345')}
        />
        <p className="mt-1 text-sm text-gray-500">{t('settings.companyAddressDesc')}</p>
      </div>

   
      <div>
        <label htmlFor="systemLanguage" className="block text-sm font-medium text-gray-700">
          {t('settings.systemLanguage')} *
        </label>
        <select
          id="systemLanguage"
          name="systemLanguage"
          value={formData.systemLanguage}
          onChange={handleLanguageChange}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="sq">{t('common.albanian')}</option>
          <option value="en">{t('common.english')}</option>
          <option value="es">{t('common.spanish')}</option>
          <option value="fr">{t('common.french')}</option>
          <option value="de">{t('common.german')}</option>
          <option value="it">{t('common.italian')}</option>
        </select>
        <p className="mt-1 text-sm text-gray-500">{t('settings.systemLanguageDesc')}</p>
      </div>

     
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t('settings.appearance', 'Appearance')}
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
              theme === 'light'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <Sun className="w-5 h-5" />
            <span className="font-medium">{t('settings.lightMode', 'Light')}</span>
          </button>
          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
              theme === 'dark'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-white hover:border-gray-400'
            }`}
          >
            <Moon className="w-5 h-5" />
            <span className="font-medium">{t('settings.darkMode', 'Dark')}</span>
          </button>
        </div>
      </div>


      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex justify-center items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              {t('settings.saving')}
            </>
          ) : (
            t('common.save')
          )}
        </button>
      </div>
    </form>
  );
}
