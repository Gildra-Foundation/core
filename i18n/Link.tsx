'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';
import { useLocale } from './LocaleProvider';
import { localePath } from './locale';

/** next/link, который сам добавляет префикс языка: на английской странице /items ведёт на /en/items. */
export default function Link({ href, ...rest }: ComponentProps<typeof NextLink>) {
  const locale = useLocale();
  const target =
    typeof href === 'string' ? localePath(locale, href) : href.pathname ? { ...href, pathname: localePath(locale, href.pathname) } : href;
  return <NextLink href={target} {...rest} />;
}
