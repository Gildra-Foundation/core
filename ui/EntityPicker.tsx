'use client';

import { useEffect, useRef, useState } from 'react';
import { useMessages } from '../i18n/LocaleProvider';
import { defineMessages } from '../i18n/locale';
import { Icon } from './Icon';
import styles from './EntityPicker.module.css';

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '');

const MESSAGES = defineMessages({
  ru: { change: 'Сменить', search: 'Поиск по имени', current: 'выбран', none: 'Никого не нашли' },
  en: { change: 'Change', search: 'Search by name', current: 'selected', none: 'No one found' },
});

export interface PickerItem {
  id: string;
  name: string;
}

interface EntityPickerProps<T extends PickerItem> {
  /** с какой стороны раскрывается список: у синей стороны — вправо, у красной — влево */
  side: 'blue' | 'red';
  current: T;
  items: T[];
  onPick: (c: T) => void;
  /** адрес квадратной иконки по id */
  iconUrl: (id: string) => string;
  label?: string;
  placeholder?: string;
}

/** Кнопка «Сменить» со списком и поиском: стрелки выбирают, Enter подтверждает, Esc закрывает. */
export function EntityPicker<T extends PickerItem>({ side, current, items, onPick, iconUrl, label: labelProp, placeholder: placeholderProp }: EntityPickerProps<T>) {
  const t = useMessages(MESSAGES);
  const label = labelProp ?? t.change;
  const placeholder = placeholderProp ?? t.search;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const q = norm(query);
  const found = items.filter((c) => !q || norm(c.name).includes(q) || norm(c.id).includes(q));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const choose = (c: T) => {
    onPick(c);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={boxRef} className={styles.picker}>
      <button type="button" className={styles.pickerButton} aria-expanded={open} aria-haspopup="listbox" onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <div className={styles.popover} data-side={side}>
          <label className={styles.popSearch}>
            <Icon name="search" size={16} />
            <span className="sr-only">{placeholder}</span>
            <input
              autoFocus
              value={query}
              placeholder={placeholder}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActive((i) => Math.min(found.length - 1, i + 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActive((i) => Math.max(0, i - 1));
                } else if (e.key === 'Enter' && found[active]) {
                  e.preventDefault();
                  choose(found[active]);
                } else if (e.key === 'Escape') setOpen(false);
              }}
            />
          </label>
          <ul role="listbox" aria-label={label} className={styles.options}>
            {found.map((c, i) => (
              <li key={c.id} role="option" aria-selected={i === active} onPointerEnter={() => setActive(i)} onClick={() => choose(c)}>
                <img src={iconUrl(c.id)} alt="" width={32} height={32} loading="lazy" />
                <span>{c.name}</span>
                {c.id === current.id && <small>{t.current}</small>}
              </li>
            ))}
            {found.length === 0 && <li className={styles.none}>{t.none}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
