import styles from './Logo.module.css';

interface LogoProps {
  name: string;
  /** знак игры; без него рисуется клавиша с первой буквой названия */
  mark?: React.ReactNode;
}

/** Знак и название сайта. */
export function Logo({ name, mark }: LogoProps) {
  return (
    <span className={styles.logo}>
      {mark ?? (
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
          <rect x="1" y="2" width="30" height="29" rx="6" fill="#0b100e" />
          <rect x="1.5" y="1.5" width="29" height="25" rx="5.5" fill="var(--stone)" stroke="var(--line-2)" />
          <text x="16" y="19.5" textAnchor="middle" fill="var(--bone)" fontFamily="var(--font-display)" fontSize="14" fontWeight="800">
            {name.charAt(0)}
          </text>
        </svg>
      )}
      <span className={styles.word}>{name}</span>
    </span>
  );
}
