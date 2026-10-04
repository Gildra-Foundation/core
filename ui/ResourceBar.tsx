'use client';

import { useLocale } from '../i18n/LocaleProvider';
import { fmt } from '../lib/format';
import styles from './ResourceBar.module.css';

interface ResourceBarProps {
  /** текущее значение: здоровье или ресурс на выбранном уровне */
  value: number;
  /** сколько единиц соответствует всей ширине полоски; по умолчанию полоска заполнена целиком */
  scaleMax?: number;
  /** тонкое деление каждые N единиц — в игре это 100 здоровья */
  tick?: number;
  /** толстое деление каждые N единиц — в игре это 1000 здоровья */
  majorTick?: number;
  color?: string;
  /** полоска растёт справа налево — для правой стороны сравнения */
  reverse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label: string;
  /** подпись поверх полоски, как в игре: «645 / 645» */
  caption?: string;
  /** заполнение при первом показе страницы */
  boot?: boolean;
  /** яркая часть от нуля до base, остальное приглушено: здоровье на 1 уровне внутри здоровья на 18 */
  base?: number;
}

/**
 * Полоска здоровья или ресурса из HUD: деления по 100 единиц, толстые — по 1000.
 * С ростом уровня делений становится больше — рост здоровья виден без цифр.
 */
export function ResourceBar({
  value,
  scaleMax,
  tick = 100,
  majorTick = 1000,
  color = 'var(--health)',
  reverse = false,
  size = 'md',
  label,
  caption,
  boot = false,
  base,
}: ResourceBarProps) {
  const locale = useLocale();
  const max = scaleMax ?? value;
  const fill = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const tickPct = value > 0 ? (tick / value) * 100 : 100;
  const majorPct = value > 0 ? (majorTick / value) * 100 : 100;
  const basePct = base !== undefined && max > 0 ? Math.min(fill, (base / max) * 100) : null;

  return (
    <div
      className={[styles.bar, styles[size], reverse && styles.reverse, boot && styles.boot, basePct !== null && styles.split]
        .filter(Boolean)
        .join(' ')}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      aria-valuetext={fmt(value, 0, locale)}
      style={
        {
          '--fill': `${fill}%`,
          '--tick': `${Math.max(tickPct, 0.6)}%`,
          '--major': `${Math.max(majorPct, 1.2)}%`,
          '--bar': color,
          '--base': `${basePct ?? 0}%`,
        } as React.CSSProperties
      }
    >
      <span className={styles.fill} />
      {basePct !== null && <span className={styles.base} />}
      {tick > 0 && <span className={styles.ticks} />}
      {caption && <span className={styles.caption}>{caption}</span>}
    </div>
  );
}
