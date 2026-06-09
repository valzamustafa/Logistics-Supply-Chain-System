import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { settingsService } from '../services/settingsService';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
   
    const initializeLanguage = async () => {
      try {
        const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'sq'];
        const storedLanguage = localStorage.getItem('preferredLanguage');

        if (storedLanguage && validLanguages.includes(storedLanguage)) {
          if (i18n.language !== storedLanguage) {
            await i18n.changeLanguage(storedLanguage);
          }
          return;
        }

        const settings = await settingsService.getSystemSettings();
        
  
        let systemLanguage = 'en';
        
        if (Array.isArray(settings)) {
          const langSetting = settings.find((s: any) => s.key === 'SystemLanguage');
          systemLanguage = langSetting?.value || 'en';
        } else if (settings && typeof settings === 'object') {
          systemLanguage = settings.SystemLanguage || settings.systemLanguage || 'en';
        }
        
        console.log('Initialized language from settings:', systemLanguage);
        
        const langToSet = validLanguages.includes(systemLanguage) ? systemLanguage : 'en';
        if (i18n.language !== langToSet) {
          await i18n.changeLanguage(langToSet);
        }
      } catch (error) {
        console.error('Failed to initialize language from settings:', error);
        if (i18n.language !== 'en') {
          i18n.changeLanguage('en');
        }
      }
    };

    initializeLanguage();
  }, [i18n]);

  const changeLanguage = async (languageCode: string) => {
    const validLanguages = ['en', 'es', 'fr', 'de', 'it', 'sq'];
    if (validLanguages.includes(languageCode)) {
      await i18n.changeLanguage(languageCode);
  
      localStorage.setItem('preferredLanguage', languageCode);
      console.log('Language changed to:', languageCode);
    }
  };

  const getCurrentLanguage = () => {
    return i18n.language;
  };

  const getLanguageName = (code: string): string => {
    const languages: { [key: string]: string } = {
      en: 'English',
      es: 'Español',
      fr: 'Français',
      de: 'Deutsch',
      it: 'Italiano',
      sq: 'Shqiptare'
    };
    return languages[code] || 'English';
  };

  return {
    currentLanguage: i18n.language,
    changeLanguage,
    getCurrentLanguage,
    getLanguageName,
    i18n
  };
};
