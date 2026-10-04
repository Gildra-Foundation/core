import Link from '../i18n/Link';
import { DEFAULT_LOCALE, defineMessages, type Locale } from '../i18n/locale';
import type { NavLink } from './Header';
import styles from './Footer.module.css';

const MESSAGES = defineMessages({ ru: { sections: 'Разделы' }, en: { sections: 'Sections' } });

interface FooterProps {
  /** язык страницы; по умолчанию основной */
  locale?: Locale;
  /** о сайте: что это и откуда данные */
  about: React.ReactNode;
  links: NavLink[];
  /** источники данных со ссылками */
  sources?: React.ReactNode;
  /** юридическая оговорка правообладателя игры */
  legal?: React.ReactNode;
}

/** Подвал: о сайте, разделы, источники и оговорка правообладателя — содержимое даёт игра. */
export function Footer({ locale = DEFAULT_LOCALE, about, links, sources, legal }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <p className={styles.about}>{about}</p>

        <nav className={styles.links} aria-label={MESSAGES[locale].sections}>
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>

        {sources && <p className={styles.sources}>{sources}</p>}
        {legal && <div className={styles.legal}>{legal}</div>}
      </div>
    </footer>
  );
}
