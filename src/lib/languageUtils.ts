const LANGUAGE_STORAGE_KEY = 'cloudmenu_selected_language';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'ar', 'ja', 'de', 'it', 'pt', 'zh', 'ko'];

export function getStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredLanguage(language: string): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    console.warn('Failed to store language preference');
  }
}

export function detectDeviceLanguage(): string {
  const browserLang = navigator.language || (navigator as any).userLanguage;
  const langCode = browserLang.split('-')[0].toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(langCode)) {
    return langCode;
  }

  return 'fr';
}

export function getInitialLanguage(availableLanguages: string[] = []): string {
  const stored = getStoredLanguage();
  if (stored && (availableLanguages.length === 0 || availableLanguages.includes(stored))) {
    return stored;
  }

  const deviceLang = detectDeviceLanguage();
  if (availableLanguages.length === 0 || availableLanguages.includes(deviceLang)) {
    return deviceLang;
  }

  if (availableLanguages.length > 0 && !availableLanguages.includes('fr')) {
    return availableLanguages[0];
  }

  return 'fr';
}
