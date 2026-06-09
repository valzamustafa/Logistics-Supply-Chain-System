import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';


import enCommon from '../locales/en/common.json';
import esCommon from '../locales/es/common.json';
import frCommon from '../locales/fr/common.json';
import deCommon from '../locales/de/common.json';
import itCommon from '../locales/it/common.json';
import sqCommon from '../locales/sq/common.json';

const resources = {
  en: { translation: enCommon },
  es: { translation: esCommon },
  fr: { translation: frCommon },
  de: { translation: deCommon },
  it: { translation: itCommon },
  sq: { translation: sqCommon }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
