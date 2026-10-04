import styles from './Keycap.module.css';

interface KeycapProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Клавиша клавиатуры. В HUD подписывает умения (P Q W E R) и горячие клавиши сайта. */
export function Keycap({ children, size = 'md', className }: KeycapProps) {
  return (
    <kbd className={[styles.key, styles[size], className].filter(Boolean).join(' ')}>
      {children}
    </kbd>
  );
}
