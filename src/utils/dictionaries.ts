import 'server-only';

const dictionaries = {
  en: () => import('../locales/en.json').then((module) => module.default),
  es: () => import('../locales/es.json').then((module) => module.default),
  pt: () => import('../locales/pt.json').then((module) => module.default),
  de: () => import('../locales/de.json').then((module) => module.default),
  fr: () => import('../locales/fr.json').then((module) => module.default),
  ja: () => import('../locales/ja.json').then((module) => module.default),
};

export type Locale = keyof typeof dictionaries;

export const locales: Locale[] = ['en', 'es', 'pt', 'de', 'fr', 'ja'];

export const defaultLocale: Locale = 'en';

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export const getDictionary = async (locale: Locale) => {
  if (!hasLocale(locale)) {
    return dictionaries[defaultLocale]();
  }
  return dictionaries[locale]();
};
