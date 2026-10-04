// Языки сайта. Первый — основной: его адреса без префикса (/champions), у остальных — префикс (/en/champions).

export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ru';

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

/** Тег языка для Intl, <html lang> и Open Graph. */
export const LOCALE_TAG: Record<Locale, string> = { ru: 'ru-RU', en: 'en-US' };
export const OG_LOCALE: Record<Locale, string> = { ru: 'ru_RU', en: 'en_US' };
/** Название языка на нём самом — для переключателя. */
export const LOCALE_NAME: Record<Locale, string> = { ru: 'Русский', en: 'English' };

/** Строки интерфейса на всех языках сайта; в компоненте берётся нужный язык. */
export type Messages<T> = Record<Locale, T>;
export const defineMessages = <T>(messages: Messages<T>) => messages;

/** Путь на нужном языке: /champions → /en/champions. Внешние ссылки и якоря не трогает. */
export function localePath(locale: Locale, path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const bare = stripLocale(path).path;
  if (locale === DEFAULT_LOCALE) return bare;
  return bare === '/' ? `/${locale}` : `/${locale}${bare}`;
}

/**
 * Язык из пути и путь без префикса: /en/items?x=1 → en, /items?x=1.
 * Префикс основного языка тоже снимается: при сборке страницы рендерятся по внутреннему адресу /ru/items.
 */
export function stripLocale(path: string): { locale: Locale; path: string } {
  const match = path.match(/^\/([a-z]{2})(?=\/|\?|#|$)(.*)$/);
  if (match && isLocale(match[1])) {
    const rest = match[2] || '/';
    return { locale: match[1], path: rest.startsWith('/') ? rest : `/${rest}` };
  }
  return { locale: DEFAULT_LOCALE, path };
}
