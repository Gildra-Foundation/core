'use client';

import { useEffect, useState } from 'react';
import { useMessages } from '../i18n/LocaleProvider';
import { defineMessages } from '../i18n/locale';
import { countPlaced, loadSaved, TIER_COLORS, type TierGroup, type Tiers } from './model';
import styles from './TierPreview.module.css';

const MESSAGES = defineMessages({
  ru: { yours: (group: string) => `Ваш тир-лист: ${group.toLowerCase()}`, empty: 'Ваш тир-лист пока пуст' },
  en: { yours: (group: string) => `Your tier list: ${group}`, empty: 'Your tier list is empty so far' },
});

const ROWS = ['S', 'A', 'B'] as const;
const PER_ROW = 6;

interface TierPreviewProps {
  storageKey: string;
  groups: Pick<TierGroup, 'key' | 'title'>[];
  iconUrl: (id: string) => string;
}

/** Превью тир-листа на главной: ваша расстановка из этого браузера или пустые ячейки. */
export function TierPreview({ storageKey, groups, iconUrl }: TierPreviewProps) {
  const t = useMessages(MESSAGES);
  const [saved, setSaved] = useState<{ lane: string; tiers: Tiers } | null>(null);

  // хранилище есть только в браузере — читаем после загрузки
  useEffect(() => {
    let best: { lane: string; tiers: Tiers } | null = null;
    for (const [lane, tiers] of Object.entries(loadSaved(storageKey)) as [string, Tiers][]) {
      if (tiers && ROWS.every((t) => Array.isArray(tiers[t])) && countPlaced(tiers) > (best ? countPlaced(best.tiers) : 0)) {
        best = { lane, tiers };
      }
    }
    setSaved(best);
  }, [storageKey]);

  return (
    <div className={styles.preview}>
      {ROWS.map((t) => (
        <div key={t} className={styles.row} style={{ '--tier': TIER_COLORS[t] } as React.CSSProperties}>
          <b>{t}</b>
          {Array.from({ length: PER_ROW }, (_, i) => {
            const id = saved?.tiers[t][i];
            return id ? <img key={id} src={iconUrl(id)} alt="" width={120} height={120} loading="lazy" decoding="async" /> : <i key={i} />;
          })}
        </div>
      ))}
      <p className={styles.note}>{saved ? t.yours(groups.find((g) => g.key === saved.lane)?.title ?? saved.lane) : t.empty}</p>
    </div>
  );
}
