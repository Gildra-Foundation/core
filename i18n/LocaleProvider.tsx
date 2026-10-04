'use client';

import { usePathname } from 'next/navigation';
import { createContext, use } from 'react';
import { DEFAULT_LOCALE, localePath, stripLocale, type Locale, type Messages } from './locale';

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Язык страницы для клиентских компонентов: ставится один раз в корневом макете. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export const useLocale = () => use(LocaleContext);

/** Строки компонента на языке страницы. */
export function useMessages<T>(messages: Messages<T>): T {
  return messages[use(LocaleContext)];
}

/**
 * Адрес текущей страницы так, как его видит посетитель: /champions на основном языке, /en/champions — на остальных.
 * usePathname при сборке и после переписывания адреса может вернуть внутренний /ru/champions — для ссылок он не годится.
 */
export function usePagePath() {
  const locale = use(LocaleContext);
  return localePath(locale, stripLocale(usePathname()).path);
}
