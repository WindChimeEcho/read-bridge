import en from './locales/en.json';
import zh from './locales/zh.json';

export type Locale = 'en' | 'zh';
export type TranslationPath = string;

const translations = {
  en,
  zh
};

/**
 * Get a translation by key path
 * @param locale - The current locale
 * @param path - Dot notation path to the translation (e.g., 'settings.aiSettings')
 * @param templateParams - Parameters to fill in template placeholders
 * @returns The translated string or the key if not found
 */
export function t(locale: Locale, path: TranslationPath, templateParams?: Record<string, string>): string {
  const keys = path.split('.');
  let result: any = translations[locale];

  for (const key of keys) {
    if (result && Object.prototype.hasOwnProperty.call(result, key)) {
      result = result[key];
    } else {
      console.warn(`Translation key not found: ${path} for locale ${locale}`);
      return path;
    }
  }

  // If we have template parameters, replace the placeholders
  if (templateParams && typeof result === 'string') {
    Object.entries(templateParams).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), value);
    });
  }

  return result;
}

/**
 * Create a translation function tied to a specific locale
 * @param locale - The locale to use for translations
 * @returns A function that takes a path and returns the translated string
 */
export function createTranslator(locale: Locale) {
  return (path: TranslationPath, templateParams?: Record<string, string>) =>
    t(locale, path, templateParams);
}

/**
 * Get all available translations for a specific locale
 * @param locale - The locale to get translations for
 * @returns The full translation object for the locale
 */
export function getTranslations(locale: Locale) {
  return translations[locale];
}

export default translations; 