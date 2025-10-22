import { useMemo } from 'react';
import { translations, Language } from '../i18n/translations';

export function usePublicTranslation(language: string = 'fr') {
  const t = useMemo(() => {
    const lang = language as Language;
    if (translations[lang]) {
      return translations[lang];
    }
    return translations.fr;
  }, [language]);

  return { t };
}
