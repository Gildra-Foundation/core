'use client';

import Link from '../i18n/Link';
import { useLocale } from '../i18n/LocaleProvider';
import { defineMessages } from '../i18n/locale';
import { formatDate, plural } from '../lib/format';
import type { ArticleBase } from './store';
import styles from './ArticleCard.module.css';

const MESSAGES = defineMessages({
  ru: { reading: (n: number, unit: string) => `${n} ${unit} чтения`, minutes: ['минута', 'минуты', 'минут'] as [string, string, string] },
  en: { reading: (n: number, unit: string) => `${n} ${unit} read`, minutes: ['min', 'min', 'min'] as [string, string, string] },
});

export type ArticleSummary = Pick<ArticleBase, 'slug' | 'title' | 'description' | 'category' | 'coverUrl' | 'readingTime'> & { date: Date | string };

interface ArticleCardProps {
  article: ArticleSummary;
  /** крупная карточка с текстом поверх обложки */
  lead?: boolean;
}

export function ArticleCard({ article, lead = false }: ArticleCardProps) {
  const locale = useLocale();
  const t = MESSAGES[locale];
  const date = new Date(article.date);
  return (
    <Link href={`/articles/${article.slug}`} className={[styles.card, lead && styles.lead].filter(Boolean).join(' ')} data-category={article.category}>
      <span className={styles.cover}>
        <img src={article.coverUrl} alt="" width={1280} height={720} loading={lead ? 'eager' : 'lazy'} decoding="async" />
      </span>
      <span className={styles.body}>
        <span className={styles.category}>{article.category}</span>
        <span className={styles.title}>{article.title}</span>
        <span className={styles.description}>{article.description}</span>
        <span className={styles.meta}>
          <time dateTime={date.toISOString()}>{formatDate(date, locale)}</time>
          <span>
            {t.reading(article.readingTime, plural(article.readingTime, t.minutes, locale))}
          </span>
        </span>
      </span>
    </Link>
  );
}
