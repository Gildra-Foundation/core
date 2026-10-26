'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useMessages } from '../i18n/LocaleProvider';
import { LOCALE_TAG, defineMessages, localePath } from '../i18n/locale';
import { createJsonLoader } from '../lib/json-loader';
import { Icon } from '../ui/Icon';
import { Keycap } from '../ui/Keycap';
import styles from './SearchPalette.module.css';

const MESSAGES = defineMessages({
  ru: {
    placeholder: 'Что найти?',
    emptyHint: 'Проверьте написание.',
    loading: 'Загружаю индекс…',
    failed: 'Не удалось загрузить поиск. Проверьте соединение.',
    retry: 'Попробовать снова',
    sections: 'Разделы',
    search: 'Поиск',
    close: 'Закрыть поиск',
    results: 'Результаты',
    nothing: (q: string) => `Ничего не нашлось по запросу «${q}».`,
    pick: 'выбор',
    open: 'открыть',
    anywhere: 'поиск на любой странице',
  },
  en: {
    placeholder: 'What are you looking for?',
    emptyHint: 'Check the spelling.',
    loading: 'Loading the index…',
    failed: 'Search could not load. Check your connection.',
    retry: 'Try again',
    sections: 'Sections',
    search: 'Search',
    close: 'Close search',
    results: 'Results',
    nothing: (q: string) => `Nothing found for “${q}”.`,
    pick: 'select',
    open: 'open',
    anywhere: 'search from any page',
  },
});

/** Запись поиска: страница, подпись, иконка и дополнительные слова, по которым её можно найти. */
export interface SearchEntry {
  href: string;
  title: string;
  sub: string;
  icon?: string;
  meta?: string;
  keys?: string[];
}

/** Индекс поиска: игра собирает его при сборке для каждого языка и отдаёт по адресу indexUrl (с префиксом языка). */
export interface SearchIndex {
  groups: { title: string; limit: number; items: SearchEntry[] }[];
}

interface SearchPaletteProps {
  /** разделы сайта — показываются, пока запрос пустой */
  sections: SearchEntry[];
  placeholder?: string;
  emptyHint?: string;
  loadingText?: string;
  indexUrl?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '');

const loadIndex = createJsonLoader<SearchIndex>((value): value is SearchIndex => {
  if (!value || typeof value !== 'object' || !('groups' in value) || !Array.isArray(value.groups)) return false;
  return value.groups.every((group: unknown) => {
    if (!group || typeof group !== 'object') return false;
    const g = group as Record<string, unknown>;
    return typeof g.title === 'string' && typeof g.limit === 'number' && Array.isArray(g.items) &&
      g.items.every((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const entry = item as Record<string, unknown>;
        return typeof entry.href === 'string' && entry.href.startsWith('/') && !entry.href.startsWith('//') &&
          typeof entry.title === 'string' && typeof entry.sub === 'string';
      });
  });
});

/** Чем раньше совпадение, тем выше запись: начало названия, вхождение, подпись, метка. */
function score(e: SearchEntry, q: string) {
  const words = [e.title, ...(e.keys ?? [])].map(norm);
  if (words.some((w) => w.startsWith(q))) return 0;
  if (words.some((w) => w.includes(q))) return 1;
  if (norm(e.sub).includes(q)) return 2;
  if (e.meta && norm(e.meta).startsWith(q)) return 3;
  return -1;
}

/** Поиск по Ctrl+K или «/»: записи из индекса игры и разделы сайта. */
export function SearchPalette({ sections, placeholder, emptyHint, loadingText, indexUrl: indexPath = '/search-index.json' }: SearchPaletteProps) {
  const t = useMessages(MESSAGES);
  const locale = useLocale();
  // адреса в индексе и разделах — без языка, префикс добавляем здесь
  const indexUrl = localePath(locale, indexPath);
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState(false);
  const requestId = useRef(0);

  const retry = useCallback(() => {
    const id = ++requestId.current;
    setFailed(false);
    loadIndex(indexUrl).then((data) => {
      if (id === requestId.current) setIndex(data);
    }).catch(() => {
      if (id === requestId.current) setFailed(true);
    });
  }, [indexUrl]);

  useEffect(() => {
    setIndex(null);
    setFailed(false);
    return () => { requestId.current += 1; };
  }, [indexUrl]);

  const open = useCallback((initial = '') => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    setQuery(initial);
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    retry();
  }, [retry]);

  useEffect(() => {
    const onOpen = (e: Event) => open((e as CustomEvent<string>).detail ?? '');
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest('input, textarea, select, [contenteditable]');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialogRef.current?.open) dialogRef.current.close();
        else open();
      } else if (e.key === '/' && !typing && !dialogRef.current?.open) {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('rc:search', onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('rc:search', onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const groups = useMemo((): { title: string; items: SearchEntry[] }[] => {
    const q = norm(query);
    if (!q) return [{ title: t.sections, items: sections }];
    if (!index) return [];
    return index.groups
      .map((g) => ({
        title: g.title,
        items: g.items
          .map((e) => ({ e, s: score(e, q) }))
          .filter((x) => x.s >= 0)
          .sort((a, b) => a.s - b.s || a.e.title.localeCompare(b.e.title, LOCALE_TAG[locale]))
          .slice(0, g.limit)
          .map((x) => x.e),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, index, sections, t.sections, locale]);

  const flat = groups.flatMap((g) => g.items);

  const go = (href: string) => {
    dialogRef.current?.close();
    router.push(localePath(locale, href));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % Math.max(flat.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + flat.length) % Math.max(flat.length, 1));
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      go(flat[active].href);
    }
  };

  let n = -1;
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label={t.search}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current.close();
      }}
    >
      <div className={styles.head}>
        <Icon name="search" size={20} />
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          placeholder={placeholder ?? t.placeholder}
          autoComplete="off"
          spellCheck={false}
          aria-label={t.search}
          aria-autocomplete="list"
          role="combobox"
          aria-expanded="true"
          aria-controls="search-results"
          aria-activedescendant={flat[active] ? `search-opt-${active}` : undefined}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label={t.close}>
          <Keycap size="sm">Esc</Keycap>
        </button>
      </div>

      <div id="search-results" className={styles.results} role="listbox" aria-label={t.results}>
        {groups.map((group) => (
          <div key={group.title} role="group" aria-label={group.title}>
            <p className={styles.group}>{group.title}</p>
            {group.items.map((item) => {
              n += 1;
              const i = n;
              return (
                <a
                  key={item.href}
                  id={`search-opt-${i}`}
                  href={localePath(locale, item.href)}
                  role="option"
                  aria-selected={i === active}
                  className={styles.item}
                  onMouseMove={() => i !== active && setActive(i)}
                  onClick={(e) => {
                    e.preventDefault();
                    go(item.href);
                  }}
                >
                  {item.icon ? <img src={item.icon} alt="" width={40} height={40} className={styles.thumb} loading="lazy" /> : <span className={styles.dot} />}
                  <span className={styles.text}>
                    <span className={styles.title}>{item.title}</span>
                    <span className={styles.sub}>{item.sub}</span>
                  </span>
                  {item.meta && <span className={styles.meta}>{item.meta}</span>}
                </a>
              );
            })}
          </div>
        ))}
        {query && index && flat.length === 0 && <p className={styles.empty}>
            {t.nothing(query.trim())} {emptyHint ?? t.emptyHint}
          </p>}
        {failed && <div className={styles.empty} role="alert">
          <p>{t.failed}</p>
          <button type="button" onClick={retry}>{t.retry}</button>
        </div>}
        {query && !index && !failed && <p className={styles.empty} role="status">{loadingText ?? t.loading}</p>}
      </div>

      <p className={styles.foot}>
        <span>
          <Keycap size="sm">↑</Keycap> <Keycap size="sm">↓</Keycap> {t.pick}
        </span>
        <span>
          <Keycap size="sm">Enter</Keycap> {t.open}
        </span>
        <span>
          <Keycap size="sm">Ctrl</Keycap> <Keycap size="sm">K</Keycap> {t.anywhere}
        </span>
      </p>
    </dialog>
  );
}
