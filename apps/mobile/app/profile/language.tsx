import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLocaleStore } from '@/store/locale';
import { LANGUAGES, type LanguageCode } from '@/i18n';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { language, setLanguage, isRTL } = useLocaleStore();

  const handleLanguageSelect = async (lang: LanguageCode) => {
    if (lang === language) return;

    const langInfo = LANGUAGES[lang];
    const currentLangInfo = LANGUAGES[language];

    // Check if RTL direction will change
    if (langInfo.rtl !== currentLangInfo.rtl) {
      Alert.alert(
        t('profile.language.title'),
        t('profile.language.changed', { language: langInfo.name }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.confirm'),
            onPress: async () => {
              try {
                await setLanguage(lang);
              } catch (error) {
                console.error('Failed to change language:', error);
              }
            },
          },
        ]
      );
    } else {
      try {
        await setLanguage(lang);
      } catch (error) {
        console.error('Failed to change language:', error);
      }
    }
  };

  const languages: { code: LanguageCode; name: string; nativeName: string }[] = [
    { code: 'en', name: t('profile.language.english'), nativeName: 'English' },
    { code: 'es', name: t('profile.language.spanish'), nativeName: 'Espanol' },
    { code: 'vi', name: t('profile.language.vietnamese'), nativeName: 'Tieng Viet' },
    { code: 'ar', name: t('profile.language.arabic'), nativeName: 'العربية' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{t('profile.language.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <Text style={styles.subtitle}>{t('profile.language.subtitle')}</Text>

      <ScrollView style={styles.content}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageItem,
              language === lang.code && styles.languageItemActive,
            ]}
            onPress={() => handleLanguageSelect(lang.code)}
          >
            <View style={styles.languageInfo}>
              <Text
                style={[
                  styles.languageName,
                  language === lang.code && styles.languageNameActive,
                ]}
              >
                {lang.name}
              </Text>
              <Text style={styles.languageNative}>{lang.nativeName}</Text>
            </View>
            {language === lang.code && (
              <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isRTL && (
        <View style={styles.rtlNote}>
          <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
          <Text style={styles.rtlNoteText}>
            RTL layout is active for this language
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageItemActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  languageNameActive: {
    color: '#4F46E5',
  },
  languageNative: {
    fontSize: 14,
    color: '#6B7280',
  },
  rtlNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  rtlNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
});
