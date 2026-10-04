// Форматирование по языку страницы: числа, склонения, даты, время чтения.
import { DEFAULT_LOCALE, LOCALE_TAG, type Locale } from '../i18n/locale';

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Число по правилам языка: ru — 2 358 и 0,668, en — 2,358 и 0.668. */
export function fmt(value: number, decimals = 0, locale: Locale = DEFAULT_LOCALE): string {
  const key = `${locale}:${decimals}`;
  let f = numberFormats.get(key);
  if (!f) {
    f = new Intl.NumberFormat(LOCALE_TAG[locale], { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    numberFormats.set(key, f);
  }
  return f.format(value);
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

/**
 * Форма слова для числа: [1, 2–4, 5+] — «минута, минуты, минут».
 * В английском у второй и третьей формы одно значение: ['minute', 'minutes', 'minutes'].
 */
export function plural(n: number, forms: [string, string, string], locale: Locale = DEFAULT_LOCALE): string {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALE_TAG[locale]);
    pluralRules.set(locale, rules);
  }
  const rule = rules.select(n);
  return rule === 'one' ? forms[0] : rule === 'few' ? forms[1] : forms[2];
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();
const dateFormat = (locale: Locale, kind: 'long' | 'short') => {
  const key = `${locale}:${kind}`;
  let f = dateFormats.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE_TAG[locale], kind === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
    dateFormats.set(key, f);
  }
  return f;
};

/** 4 октября 2026 / October 4, 2026. */
export const formatDate = (date: Date, locale: Locale = DEFAULT_LOCALE) => dateFormat(locale, 'long').format(date).replace(/\s?г\.$/, '');

/** 4 окт / Oct 4. */
export const formatShortDate = (date: Date, locale: Locale = DEFAULT_LOCALE) => dateFormat(locale, 'short').format(date).replace('.', '');

/** Время чтения в минутах (~180 слов в минуту), разметка компонентов не учитывается. */
export function readingTime(markdown = ''): number {
  const words = markdown
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>|`-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}
