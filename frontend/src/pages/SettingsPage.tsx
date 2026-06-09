import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useNotifications } from '../hooks/useNotifications';
import { useSettings } from '../contexts/SettingsContext';
import SettingsForm from '../components/SettingsForm';
import { useLanguage } from '../hooks/useLanguage';
import { settingsService } from '../services/settingsService';

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { refresh: refreshNotifications } = useNotifications(user?.id);
  const { refresh: refreshSettings } = useSettings();
  const { changeLanguage } = useLanguage();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    systemLanguage: 'en',
    systemTheme: 'light'
  });


  if (!user || !user.roles?.includes('Admin')) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow px-6 py-12 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">{t('messages.error')}</h2>
          <p className="text-gray-600">{t('settings.description')}</p>
        </div>
      </div>
    );
  }


  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getAllSettings();
      setSettings(data);
      

      const settingMap = data.reduce((acc: any, setting: Setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {});

      setFormData({
        companyName: settingMap['CompanyName'] || '',
        companyEmail: settingMap['CompanyEmail'] || '',
        companyPhone: settingMap['CompanyPhone'] || '',
        companyAddress: settingMap['CompanyAddress'] || '',
        systemLanguage: settingMap['SystemLanguage'] || 'en',
        systemTheme: settingMap['SystemTheme'] || settingMap['systemTheme'] || 'light'
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('error', t('settings.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
 
      const updates = [
        { key: 'CompanyName', value: formData.companyName },
        { key: 'CompanyEmail', value: formData.companyEmail },
        { key: 'CompanyPhone', value: formData.companyPhone },
        { key: 'CompanyAddress', value: formData.companyAddress },
        { key: 'SystemLanguage', value: formData.systemLanguage },
        { key: 'SystemTheme', value: formData.systemTheme }
      ];

      for (const update of updates) {
        const setting = settings.find(s => s.key === update.key);
        if (setting) {
          await settingsService.updateSetting(setting.id, {
            value: update.value,
            description: setting.description
          });
        }
      }

      showToast('success', t('settings.saved'));
      
      
      await changeLanguage(formData.systemLanguage);
      
     
      setTimeout(() => {
        refreshNotifications();
        refreshSettings();
      }, 500);
      
      await fetchSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('error', t('settings.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center text-gray-600 mt-4">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="mt-2 text-gray-600">
            {t('settings.description')}
          </p>
        </div>

        <SettingsForm
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          saving={saving}
          onThemeSelect={(theme) => setFormData(prev => ({ ...prev, systemTheme: theme }))}
        />

       
        <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{t('settings.allSettings', 'All Settings')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('settings.table.key', 'Key')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('settings.table.value', 'Value')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('settings.table.description', 'Description')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">{t('settings.table.updated', 'Updated')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settings.map((setting) => (
                  <tr key={setting.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{setting.key}</td>
                    <td className="px-6 py-3 text-sm text-gray-700 max-w-xs truncate">{setting.value}</td>
                    <td className="px-6 py-3 text-sm text-gray-600 max-w-md truncate">{setting.description}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">
                      {new Date(setting.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
