// Статьи из папки *.mdx: frontmatter, время чтения, оглавление. Только для сервера.
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import GithubSlugger from 'github-slugger';
import YAML from 'yaml';
import { readingTime } from '../lib/format';

export type Frontmatter = Record<string, unknown>;

export interface ArticleBase {
  slug: string;
  title: string;
  description: string;
  category: string;
  date: Date;
  /** адрес обложки — его строит игра из frontmatter */
  coverUrl: string;
  featured: boolean;
  author: string;
  readingTime: number;
  toc: { id: string; text: string }[];
  body: string;
}

interface StoreOptions<T> {
  /** папка со статьями */
  dir: string;
  categories: readonly string[];
  defaultAuthor: string;
  coverUrl: (data: Frontmatter) => string;
  /** поля игры из frontmatter: упомянутые чемпионы, персонажи и т. п. */
  extend?: (data: Frontmatter) => T;
}

/** Хранилище статей игры: читает папку один раз за сборку и сортирует по дате, новые первыми. */
export function createArticleStore<T extends object = Record<never, never>>({ dir, categories, defaultAuthor, coverUrl, extend }: StoreOptions<T>) {
  type Article = ArticleBase & T;

  function parse(file: string): Article {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if (!match) throw new Error(`${file}: нет frontmatter`);
    const data: Frontmatter = YAML.parse(match[1]) ?? {};
    const body = match[2];
    if (!categories.includes(String(data.category))) throw new Error(`${file}: неизвестная категория «${String(data.category)}»`);

    // id заголовков считаются тем же алгоритмом, что и rehype-slug
    const slugger = new GithubSlugger();
    const toc = [...body.matchAll(/^##\s+(.+)$/gm)].map(([, raw]) => {
      const text = raw.replace(/[*_`]/g, '').trim();
      return { id: slugger.slug(text), text };
    });

    return {
      slug: file.replace(/\.mdx?$/, ''),
      title: String(data.title),
      description: String(data.description),
      category: String(data.category),
      date: new Date(String(data.date)),
      coverUrl: coverUrl(data),
      featured: Boolean(data.featured),
      author: typeof data.author === 'string' ? data.author : defaultAuthor,
      readingTime: readingTime(body),
      toc,
      body,
      ...(extend?.(data) ?? ({} as T)),
    };
  }

  // папки может не быть: на языке ещё нет ни одной статьи
  const getArticles = cache((): Article[] =>
    (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
      .filter((f) => /\.mdx?$/.test(f))
      .map(parse)
      .sort((a, b) => b.date.valueOf() - a.date.valueOf()),
  );

  const getArticle = (slug: string) => getArticles().find((a) => a.slug === slug);

  return { getArticles, getArticle };
}
