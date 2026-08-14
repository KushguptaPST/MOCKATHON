import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import hi from '../locales/hi.json';
import as from '../locales/as.json';
import bn from '../locales/bn.json';
import mni from '../locales/mni.json';
import brx from '../locales/brx.json';
import kha from '../locales/kha.json';
import lus from '../locales/lus.json';
import nag from '../locales/nag.json';

const LANGUAGE_KEY = 'user_selected_language';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'All NE States & National' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', region: 'All NE States & National' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', flag: '🇮🇳', region: 'Assam' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳', region: 'Assam, Tripura' },
  { code: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', flag: '🇮🇳', region: 'Manipur' },
  { code: 'brx', name: 'Bodo', nativeName: 'बड़ो / बर’', flag: '🇮🇳', region: 'Assam' },
  { code: 'kha', name: 'Khasi', nativeName: 'Ka Ktien Khasi', flag: '🇮🇳', region: 'Meghalaya' },
  { code: 'lus', name: 'Mizo', nativeName: 'Mizo ṭawng', flag: '🇮🇳', region: 'Mizoram' },
  { code: 'nag', name: 'Nagamese', nativeName: 'Nagamese', flag: '🇮🇳', region: 'Nagaland' },
];

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  as: { translation: as },
  bn: { translation: bn },
  mni: { translation: mni },
  brx: { translation: brx },
  kha: { translation: kha },
  lus: { translation: lus },
  nag: { translation: nag },
};

export const initI18n = async () => {
  let savedLanguage = 'en';
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && resources[stored as keyof typeof resources]) {
      savedLanguage = stored;
    }
  } catch (error) {
    console.warn('Could not read saved language from storage:', error);
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      compatibilityJSON: 'v3',
      interpolation: {
        escapeValue: false, // React already safes from XSS
      },
    });

  return i18n;
};

export const setAppLanguage = async (languageCode: string) => {
  try {
    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
    console.log(`🌐 Language switched to ${languageCode}`);
  } catch (error) {
    console.error('Failed to change app language:', error);
  }
};

export default i18n;
