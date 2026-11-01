'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Link from '../i18n/Link';
import { useLocale, useMessages } from '../i18n/LocaleProvider';
import { LOCALES, LOCALE_NAME, defineMessages, localePath, stripLocale } from '../i18n/locale';
import { Icon } from '../ui/Icon';
import { Keycap } from '../ui/Keycap';
import { Logo } from './Logo';
import styles from './Header.module.css';

export interface NavLink {
  href: string;
  label: string;
}

/** Группа разделов: в шапке — выпадающий список, в мобильном меню — подзаголовок. */
export interface NavGroup {
  label: string;
  children: NavLink[];
}

export type NavItem = NavLink | NavGroup;

const isGroup = (item: NavItem): item is NavGroup => 'children' in item;

interface HeaderProps {
  /** название сайта рядом со знаком */
  name: string;
  /** знак сайта; без него — клавиша с первой буквой названия */
  mark?: React.ReactNode;
  nav: NavItem[];
  /** подпись кнопки поиска: «Найти чемпиона» */
  searchLabel?: string;
  /** короткая пометка справа: «Патч 16.19» */
  badge?: string;
  /** та же пометка в мобильном меню: «Данные патча 16.19» */
  mobileBadge?: string;
  /** слот сайта справа от поиска: кнопка входа, меню аккаунта — движок не знает, что там */
  actions?: React.ReactNode;
}

const MESSAGES = defineMessages({
  ru: { home: 'на главную', sections: 'Разделы', search: 'Поиск', searchKey: 'Поиск, клавиша /', openMenu: 'Открыть меню', closeMenu: 'Закрыть меню', menu: 'Меню', language: 'Язык' },
  en: { home: 'home page', sections: 'Sections', search: 'Search', searchKey: 'Search, key /', openMenu: 'Open menu', closeMenu: 'Close menu', menu: 'Menu', language: 'Language' },
});

/** Открывает поиск из любого места сайта: кнопкой, ссылкой или кодом. */
export const openSearch = (query = '') => window.dispatchEvent(new CustomEvent('rc:search', { detail: query }));

export function Header({ name, mark, nav, searchLabel, badge, mobileBadge, actions }: HeaderProps) {
  const t = useMessages(MESSAGES);
  // разделы сравниваем без префикса языка: /en/items — это раздел /items
  const pathname = stripLocale(usePathname()).path;
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className={styles.header} style={{ viewTransitionName: 'site-header' }}>
      <div className={`container ${styles.bar}`}>
        <Link href="/" className={styles.brand} aria-label={`${name}, ${t.home}`}>
          <Logo name={name} mark={mark} />
        </Link>

        <nav className={styles.nav} aria-label={t.sections}>
          {nav.map((item) =>
            isGroup(item) ? (
              <Dropdown key={item.label} group={item} isActive={isActive} />
            ) : (
              <Link key={item.href} href={item.href} className={styles.link} aria-current={isActive(item.href) ? 'page' : undefined}>
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <button type="button" className={styles.search} onClick={() => openSearch()} aria-label={t.searchKey}>
          <Icon name="search" size={17} />
          <span className={styles.searchText}>{searchLabel ?? t.search}</span>
          <Keycap size="sm">/</Keycap>
        </button>

        {badge && <span className={styles.patch}>{badge}</span>}

        {actions && <div className={styles.actions}>{actions}</div>}

        <LanguageSwitch className={styles.lang} label={t.language} />

        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? t.closeMenu : t.openMenu}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" className={styles.mobile} aria-label={t.menu}>
          {nav.flatMap((item) => {
            const link = (l: NavLink) => (
              <Link
                key={l.href}
                href={l.href}
                className={styles.mobileLink}
                aria-current={isActive(l.href) ? 'page' : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </Link>
            );
            return isGroup(item)
              ? [
                  <p key={item.label} className={styles.mobileGroup}>
                    {item.label}
                  </p>,
                  ...item.children.map(link),
                ]
              : [link(item)];
          })}
          <LanguageSwitch className={styles.mobileLang} label={t.language} full />
          {(mobileBadge ?? badge) && <p className={styles.mobilePatch}>{mobileBadge ?? badge}</p>}
        </nav>
      )}
    </header>
  );
}

/**
 * Ссылки на ту же страницу на других языках. Обычная ссылка, а не next/link: у языков разные корневые макеты,
 * так что переход всё равно полный. Параметры адреса (?c=ahri) переносятся при клике.
 */
function LanguageSwitch({ className, label, full = false }: { className?: string; label: string; full?: boolean }) {
  const locale = useLocale();
  const path = stripLocale(usePathname()).path;
  return (
    <span className={className} role="group" aria-label={label}>
      {LOCALES.filter((l) => l !== locale).map((l) => (
        <a
          key={l}
          href={localePath(l, path)}
          hrefLang={l}
          lang={l}
          title={LOCALE_NAME[l]}
          onClick={(e) => {
            e.currentTarget.href = localePath(l, path) + window.location.search + window.location.hash;
          }}
        >
          {full ? LOCALE_NAME[l] : l.toUpperCase()}
        </a>
      ))}
    </span>
  );
}

/** Выпадающая группа разделов: закрывается по Esc, по клику мимо и при переходе. */
function Dropdown({ group, isActive }: { group: NavGroup; isActive: (href: string) => boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = group.children.some((c) => isActive(c.href));

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={styles.group}>
      <button type="button" className={styles.link} data-active={active || undefined} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {group.label}
        <Icon name="chevron-down" size={14} className={styles.chevron} />
      </button>
      {open && (
        <div className={styles.dropdown}>
          {group.children.map((c) => (
            <Link key={c.href} href={c.href} className={styles.dropLink} aria-current={isActive(c.href) ? 'page' : undefined} onClick={() => setOpen(false)}>
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
