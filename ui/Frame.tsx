import styles from './Frame.module.css';

type Tone = 'default' | 'ally' | 'enemy' | 'health';

interface FrameProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
  innerClassName?: string;
  as?: 'div' | 'section' | 'article' | 'aside';
  style?: React.CSSProperties;
}

/** Рамка HUD со срезанными углами (левый верхний и правый нижний). Тон рамки несёт смысл: союзник, враг, здоровье. */
export function Frame({ children, tone = 'default', className, innerClassName, as: Tag = 'div', style }: FrameProps) {
  return (
    <Tag className={[styles.frame, styles[tone], className].filter(Boolean).join(' ')} style={style}>
      <div className={[styles.inner, innerClassName].filter(Boolean).join(' ')}>{children}</div>
    </Tag>
  );
}
