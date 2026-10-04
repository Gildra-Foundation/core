'use client';

import { useMessages } from '../i18n/LocaleProvider';
import { defineMessages } from '../i18n/locale';
import { Icon } from './Icon';
import styles from './LevelControl.module.css';

interface LevelControlProps {
  value: number;
  onChange: (level: number) => void;
  /** компактный вид для закреплённой панели: без полосы опыта */
  compact?: boolean;
  id?: string;
  /** максимальный уровень: 18 в LoL; деления полосы рисуются, пока их не больше 30 */
  max?: number;
  /** подпись ползунка для экранных дикторов */
  label?: string;
}

const MESSAGES = defineMessages({
  ru: { level: 'Уровень', down: 'Уровень ниже', up: 'Уровень выше' },
  en: { level: 'Level', down: 'Level down', up: 'Level up' },
});

/** Уровень 1–max: кнопки −/+, полоса опыта из делений и ползунок для клавиатуры. */
export function LevelControl({ value, onChange, compact = false, id = 'level', max = 18, label }: LevelControlProps) {
  const t = useMessages(MESSAGES);
  const set = (next: number) => onChange(Math.min(max, Math.max(1, next)));
  const levels = max <= 30 ? Array.from({ length: max }, (_, i) => i + 1) : [];

  return (
    <div className={[styles.control, compact && styles.compact].filter(Boolean).join(' ')}>
      <button type="button" className={styles.step} onClick={() => set(value - 1)} disabled={value <= 1} aria-label={t.down}>
        <Icon name="minus" size={16} strokeWidth={2.4} />
      </button>
      <label className={styles.level} htmlFor={compact ? undefined : id}>
        <span className={styles.caption}>{t.level}</span>
        <output className={styles.value} aria-live="polite">
          {value}
        </output>
      </label>
      <button type="button" className={styles.step} onClick={() => set(value + 1)} disabled={value >= max} aria-label={t.up}>
        <Icon name="plus" size={16} strokeWidth={2.4} />
      </button>
      {!compact && (
        <div className={styles.track}>
          <div className={styles.pips} aria-hidden="true" style={{ '--count': levels.length } as React.CSSProperties}>
            {levels.map((l) => (
              <span key={l} className={l <= value ? styles.on : undefined} />
            ))}
          </div>
          <input
            id={id}
            className={styles.range}
            type="range"
            min={1}
            max={max}
            step={1}
            value={value}
            aria-label={label ?? t.level}
            aria-valuetext={`${t.level} ${value}`}
            onChange={(e) => set(Number(e.currentTarget.value))}
          />
        </div>
      )}
    </div>
  );
}
