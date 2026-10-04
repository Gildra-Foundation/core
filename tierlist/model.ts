// Тир-лист: тиры, сохранение в браузере и ссылка. Группы (линии, стихии, роли) задаёт игра.
import type { ReactNode } from 'react';

export const TIERS = ['S', 'A', 'B', 'C', 'D'] as const;
export type Tier = (typeof TIERS)[number];
export type Tiers = Record<Tier, string[]>;

/** Цвет тира: золото только у S, дальше — по смыслу цветов HUD. */
export const TIER_COLORS: Record<Tier, string> = {
  S: 'var(--gold)',
  A: 'var(--health)',
  B: 'var(--ally)',
  C: 'var(--ash)',
  D: 'var(--enemy)',
};

/** Что расставляют: чемпион, персонаж, оружие. groups — ключи групп, в которые он входит. */
export interface TierItem {
  id: string;
  slug: string;
  name: string;
  groups: string[];
}

/** Группа со своим тир-листом: линия в LoL, стихия в Genshin. */
export interface TierGroup {
  /** ключ в хранилище браузера */
  key: string;
  /** значение в адресе */
  param: string;
  label: string;
  title: string;
  icon?: ReactNode;
  /** группа, в которую входят все */
  all?: boolean;
}

export const emptyTiers = (): Tiers => ({ S: [], A: [], B: [], C: [], D: [] });

export const countPlaced = (tiers: Tiers) => TIERS.reduce((n, t) => n + tiers[t].length, 0);

/** Оставляет только известных участников группы, без повторов. */
export function cleanTiers(value: unknown, allowed: Set<string>): Tiers {
  const tiers = emptyTiers();
  if (!value || typeof value !== 'object') return tiers;
  const seen = new Set<string>();
  for (const t of TIERS) {
    const list = (value as Record<string, unknown>)[t];
    if (!Array.isArray(list)) continue;
    for (const id of list) {
      if (typeof id === 'string' && allowed.has(id) && !seen.has(id)) {
        seen.add(id);
        tiers[t].push(id);
      }
    }
  }
  return tiers;
}

export type SavedTiers = Partial<Record<string, Tiers>>;

/** Сохранённые расстановки по группам. В приватном окне или без доступа к хранилищу — пусто. */
export function loadSaved(storageKey: string): SavedTiers {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    return data?.v === 1 && data.lanes && typeof data.lanes === 'object' ? data.lanes : {};
  } catch {
    return {};
  }
}

export function saveSaved(storageKey: string, lanes: SavedTiers) {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ v: 1, lanes }));
  } catch {
    // хранилище недоступно — расстановка живёт до закрытия вкладки
  }
}

/** Адрес расстановки: /tier-list?lane=middle&S=Ahri.Syndra&A=Orianna */
export function tierListHref(basePath: string, groupParam: string, group: TierGroup | undefined, tiers?: Tiers) {
  const params = new URLSearchParams();
  if (group && !group.all) params.set(groupParam, group.param);
  if (tiers) for (const t of TIERS) if (tiers[t].length) params.set(t, tiers[t].join('.'));
  const query = params.toString().replace(/%2E/gi, '.');
  return query ? `${basePath}?${query}` : basePath;
}

/** Расстановка из ссылки или null, если в адресе её нет. */
export function tiersFromParams(params: Pick<URLSearchParams, 'has' | 'get'>): Tiers | null {
  if (!TIERS.some((t) => params.has(t))) return null;
  const tiers = emptyTiers();
  for (const t of TIERS) tiers[t] = (params.get(t) ?? '').split('.').filter(Boolean);
  return tiers;
}
