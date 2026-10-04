import styles from './PageHead.module.css';

/** Заголовок раздела: крупное слово шрифтом Tektur и одна строка пояснения. */
export function PageHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className={styles.head}>
      <h1>{title}</h1>
      {children && <p>{children}</p>}
    </header>
  );
}
