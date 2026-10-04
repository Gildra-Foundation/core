'use client';

import { useState } from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import { defineMessages } from '../i18n/locale';
import { plural } from '../lib/format';
import { ArticleCard, type ArticleSummary } from './ArticleCard';
import styles from './ArticleList.module.css';

const MESSAGES = defineMessages({
  ru: {
    category: 'Категория',
    all: 'Все',
    articles: ['статья', 'статьи', 'статей'] as [string, string, string],
    inCategory: (c: string) => ` в разделе «${c}»`,
  },
  en: {
    category: 'Category',
    all: 'All',
    articles: ['article', 'articles', 'articles'] as [string, string, string],
    inCategory: (c: string) => ` in ${c}`,
  },
});

/** Список статей с фильтром по категории. Первая статья в выдаче — крупная. */
export function ArticleList({ articles, categories }: { articles: (ArticleSummary & { featured: boolean })[]; categories: string[] }) {
  const locale = useLocale();
  const t = MESSAGES[locale];
  const [category, setCategory] = useState<string | null>(null);
  const shown = articles.filter((a) => !category || a.category === category);
  const lead = category ? shown[0] : (shown.find((a) => a.featured) ?? shown[0]);
  const rest = shown.filter((a) => a !== lead);

  return (
    <div className={styles.list}>
      <div className={styles.filters} role="group" aria-label={t.category}>
        <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>
          {t.all} <span>{articles.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(category === c ? null : c)}>
            {c} <span>{articles.filter((a) => a.category === c).length}</span>
          </button>
        ))}
      </div>

      {lead && <ArticleCard article={lead} lead />}
      {rest.length > 0 && (
        <div className={styles.grid}>
          {rest.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      )}
      <p className={styles.total}>
        {shown.length} {plural(shown.length, t.articles, locale)}
        {category ? t.inCategory(category) : ''}
      </p>
    </div>
  );
}
