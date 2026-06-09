import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsService } from '../services/settingsService';

interface CompanySettings {
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  systemLanguage: string;
}

interface SettingsContextType {
  settings: CompanySettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings>({
    companyName: 'Logjistika',
    companyEmail: 'info@logjistika.com',
    companyPhone: '+1-800-000-0000',
    companyAddress: '123 Business St, Suite 100, City, State 12345',
    systemLanguage: 'en'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await settingsService.getSystemSettings();
      

      let systemSettings: any = {};
      if (Array.isArray(data)) {
        data.forEach((s: any) => {
          systemSettings[s.key] = s.value;
        });
      } else {
        systemSettings = data;
      }

      setSettings({
        companyName: systemSettings.CompanyName || systemSettings.companyName || 'Logjistika',
        companyEmail: systemSettings.CompanyEmail || systemSettings.companyEmail || 'info@logjistika.com',
        companyPhone: systemSettings.CompanyPhone || systemSettings.companyPhone || '+1-800-000-0000',
        companyAddress: systemSettings.CompanyAddress || systemSettings.companyAddress || '123 Business St, Suite 100, City, State 12345',
        systemLanguage: systemSettings.SystemLanguage || systemSettings.systemLanguage || 'en'
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching company settings:', err);
      setError('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    try {
      const data = await settingsService.getSystemSettings();
      
      let systemSettings: any = {};
      if (Array.isArray(data)) {
        data.forEach((s: any) => {
          systemSettings[s.key] = s.value;
        });
      } else {
        systemSettings = data;
      }

      setSettings({
        companyName: systemSettings.CompanyName || systemSettings.companyName || 'Logjistika',
        companyEmail: systemSettings.CompanyEmail || systemSettings.companyEmail || 'info@logjistika.com',
        companyPhone: systemSettings.CompanyPhone || systemSettings.companyPhone || '+1-800-000-0000',
        companyAddress: systemSettings.CompanyAddress || systemSettings.companyAddress || '123 Business St, Suite 100, City, State 12345',
        systemLanguage: systemSettings.SystemLanguage || systemSettings.systemLanguage || 'en'
      });
    } catch (err) {
      console.error('Error refreshing company settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    

    const interval = setInterval(fetchSettings, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
