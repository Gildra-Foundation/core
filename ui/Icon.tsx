// Иконки движка: сетка 24×24, обводка 1.75. Здесь только интерфейс; иконки игры добавляются через createIcon.

export const UI_ICONS = {
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-up': '<path d="m6 15 6-6 6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  share: '<path d="M12 15V3.5"/><path d="m7.5 8 4.5-4.5L16.5 8"/><path d="M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5"/>',
  play: '<path d="M8 5.5v13a.5.5 0 0 0 .77.42l10-6.5a.5.5 0 0 0 0-.84l-10-6.5A.5.5 0 0 0 8 5.5Z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  swap: '<path d="M7 4 3 8l4 4"/><path d="M3 8h13"/><path d="m17 12 4 4-4 4"/><path d="M21 16H8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  tip: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  warning: '<path d="M12 3.5 2.5 20h19Z"/><path d="M12 10v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
} as const;

/** Набор иконок: имя → содержимое SVG на сетке 24×24. */
export type IconSet = Record<string, string>;

export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  label?: string;
  strokeWidth?: number;
}

/** Компонент иконок: набор движка плюс иконки игры (классы, стихии, характеристики). */
export function createIcon(extra: IconSet = {}) {
  const icons: IconSet = { ...UI_ICONS, ...extra };
  return function Icon({ name, size = 20, className, label, strokeWidth = 1.75 }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        role={label ? 'img' : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        focusable="false"
        dangerouslySetInnerHTML={{ __html: icons[name] ?? icons.info }}
      />
    );
  };
}

/** Иконки интерфейса — для компонентов движка. */
export const Icon = createIcon();
