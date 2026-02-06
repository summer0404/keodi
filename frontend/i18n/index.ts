import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import vi from './locales/vi.json';
import en from './locales/en.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi },
};

i18n.use(initReactI18next).init({
  resources,
  // Get language from device, e.g., "en-US" -> "en"
  lng: Localization.getLocales()[0].languageCode ?? 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React auto XSS protection
  },
});

export default i18n;