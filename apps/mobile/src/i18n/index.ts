import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { NativeModules, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'intl-pluralrules';

import en from './locales/en.json';
import es from './locales/es.json';
import vi from './locales/vi.json';
import ar from './locales/ar.json';

export const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', rtl: false },
  es: { name: 'Spanish', nativeName: 'Espanol', rtl: false },
  vi: { name: 'Vietnamese', nativeName: 'Tieng Viet', rtl: false },
  ar: { name: 'Arabic', nativeName: 'العربية', rtl: true },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

const LANGUAGE_STORAGE_KEY = '@hopefull_language';

export const resources = {
  en: { translation: en },
  es: { translation: es },
  vi: { translation: vi },
  ar: { translation: ar },
};

// Get the device's preferred language using React Native's built-in locale detection
const getDeviceLanguage = (): LanguageCode => {
  let deviceLocale = 'en';

  try {
    if (Platform.OS === 'ios') {
      deviceLocale = NativeModules.SettingsManager?.settings?.AppleLocale ||
                     NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
                     'en';
    } else if (Platform.OS === 'android') {
      deviceLocale = NativeModules.I18nManager?.localeIdentifier || 'en';
    }
  } catch (error) {
    console.log('Could not detect device language, defaulting to English');
  }

  // Extract language code (e.g., "en_US" -> "en")
  const langCode = deviceLocale.split(/[-_]/)[0];

  if (langCode && langCode in LANGUAGES) {
    return langCode as LanguageCode;
  }
  return 'en';
};

// Initialize i18n with default language
i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Load saved language preference
export const loadSavedLanguage = async (): Promise<LanguageCode> => {
  try {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLang && savedLang in LANGUAGES) {
      await i18n.changeLanguage(savedLang);
      return savedLang as LanguageCode;
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
  return i18n.language as LanguageCode;
};

// Change language and persist
export const changeLanguage = async (lang: LanguageCode): Promise<void> => {
  try {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (error) {
    console.error('Error changing language:', error);
    throw error;
  }
};

// Check if current language is RTL
export const isRTL = (): boolean => {
  const currentLang = i18n.language as LanguageCode;
  return LANGUAGES[currentLang]?.rtl ?? false;
};

// Get current language info
export const getCurrentLanguage = (): {
  code: LanguageCode;
  name: string;
  nativeName: string;
  rtl: boolean;
} => {
  const code = i18n.language as LanguageCode;
  const langInfo = LANGUAGES[code] || LANGUAGES.en;
  return { code, ...langInfo };
};

export default i18n;
