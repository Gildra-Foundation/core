import Link from '../i18n/Link';
import styles from './Tag.module.css';

interface TagProps {
  children: React.ReactNode;
  /** иконка игры: класс, позиция, стихия */
  icon?: React.ReactNode;
  /** цвет иконки — цвет класса или позиции */
  color?: string;
  href?: string;
  title?: string;
}

/** Метка класса, позиции или свойства. Со ссылкой ведёт в каталог с фильтром. */
export function Tag({ children, icon, color, href, title }: TagProps) {
  const content = (
    <>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </>
  );
  const style = color ? ({ '--tag': color } as React.CSSProperties) : undefined;
  return href ? (
    <Link href={href} className={styles.tag} style={style} title={title}>
      {content}
    </Link>
  ) : (
    <span className={styles.tag} style={style} title={title}>
      {content}
    </span>
  );
}
