import styles from './Radar.module.css';

interface RadarSeries {
  values: number[];
  color: string;
  label: string;
}

interface RadarProps {
  axes: readonly string[];
  series: RadarSeries[];
  max?: number;
}

/** Многоугольник оценок (например, стиля игры 1–3). Несколько серий — для сравнения. */
export function Radar({ axes, series, max = 3 }: RadarProps) {
  const size = 300;
  const padX = 70;
  const c = size / 2;
  const radius = size / 2 - 46;
  const k = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / k;
  const pt = (i: number, v: number) => {
    const r = (v / max) * radius;
    return [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))] as const;
  };
  const polygon = (v: number) => axes.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(',')).join(' ');

  return (
    <svg viewBox={`${-padX} 0 ${size + padX * 2} ${size}`} className={styles.radar} role="img" aria-label={series.map((s) => `${s.label}: ${axes.map((a, i) => `${a} ${s.values[i]}`).join(', ')}`).join('; ')}>
      {Array.from({ length: max }, (_, n) => (
        <polygon key={n} points={polygon(n + 1)} className={n + 1 === max ? styles.outer : styles.ring} />
      ))}
      {axes.map((label, i) => {
        const [ex, ey] = pt(i, max);
        const [lx, ly] = pt(i, max + 0.55);
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
        return (
          <g key={label}>
            <line x1={c} y1={c} x2={ex} y2={ey} className={styles.spoke} />
            <text x={lx} y={ly + 5} textAnchor={anchor} className={styles.label}>
              {label}
            </text>
          </g>
        );
      })}
      {series.map((s) => (
        <g key={s.label}>
          <polygon points={s.values.map((v, i) => pt(i, Math.max(0.15, v)).map((n) => n.toFixed(1)).join(',')).join(' ')} fill={s.color} fillOpacity={0.2} stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" />
          {s.values.map((v, i) => {
            const [x, y] = pt(i, Math.max(0.15, v));
            return <circle key={i} cx={x} cy={y} r={4} fill={s.color} />;
          })}
        </g>
      ))}
    </svg>
  );
}
