import { create } from 'zustand';
import { I18nManager, Alert } from 'react-native';
import {
  changeLanguage,
  loadSavedLanguage,
  isRTL,
  getCurrentLanguage,
  LANGUAGES,
  type LanguageCode,
} from '@/i18n';

interface LocaleState {
  language: LanguageCode;
  isRTL: boolean;
  isLoading: boolean;

  // Actions
  initializeLocale: () => Promise<void>;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  getLanguageInfo: () => {
    code: LanguageCode;
    name: string;
    nativeName: string;
    rtl: boolean;
  };
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  language: 'en',
  isRTL: false,
  isLoading: true,

  initializeLocale: async () => {
    try {
      const savedLang = await loadSavedLanguage();
      const rtl = LANGUAGES[savedLang]?.rtl ?? false;

      // Update RTL layout if needed
      if (I18nManager.isRTL !== rtl) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);
      }

      set({ language: savedLang, isRTL: rtl, isLoading: false });
    } catch (error) {
      console.error('Error initializing locale:', error);
      set({ isLoading: false });
    }
  },

  setLanguage: async (lang: LanguageCode) => {
    try {
      await changeLanguage(lang);
      const rtl = LANGUAGES[lang]?.rtl ?? false;
      const currentRTL = I18nManager.isRTL;

      set({ language: lang, isRTL: rtl });

      // If RTL state changed, we need to reload the app
      if (currentRTL !== rtl) {
        I18nManager.allowRTL(rtl);
        I18nManager.forceRTL(rtl);

        // Show alert that app restart is needed for RTL changes
        Alert.alert(
          'Restart Required',
          'Please restart the app to apply the layout direction changes.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error setting language:', error);
      throw error;
    }
  },

  getLanguageInfo: () => {
    return getCurrentLanguage();
  },
}));
