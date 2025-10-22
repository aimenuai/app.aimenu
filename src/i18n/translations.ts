import { en } from './locales/en';
import { fr } from './locales/fr';
import { es } from './locales/es';
import { ar } from './locales/ar';
import { ja } from './locales/ja';
import { de } from './locales/de';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { zh } from './locales/zh';
import { ko } from './locales/ko';

export const translations = {
  en,
  fr,
  es,
  ar,
  ja,
  de,
  it,
  pt,
  zh,
  ko,
};

export type Language = 'en' | 'fr' | 'es' | 'ar' | 'ja' | 'de' | 'it' | 'pt' | 'zh' | 'ko';
export type TranslationKeys = typeof translations.en;
