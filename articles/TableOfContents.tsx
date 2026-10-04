'use client';

import { useEffect, useState } from 'react';
import { useMessages } from '../i18n/LocaleProvider';
import { defineMessages } from '../i18n/locale';
import styles from './TableOfContents.module.css';

const MESSAGES = defineMessages({ ru: { contents: 'Содержание' }, en: { contents: 'Contents' } });

/** Оглавление статьи: подсвечивает раздел, который сейчас читают. */
export function TableOfContents({ items }: { items: { id: string; text: string }[] }) {
  const t = useMessages(MESSAGES);
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const update = () => {
      let current = items[0]?.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top < 140) current = item.id;
      }
      setActive(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [items]);

  return (
    <nav className={styles.toc} aria-label={t.contents}>
      <p className={styles.title}>{t.contents}</p>
      <ol role="list">
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} aria-current={active === item.id ? 'location' : undefined}>
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
