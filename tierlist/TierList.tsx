'use client';

import { useSearchParams } from 'next/navigation';
import { useDeferredValue, useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from '../i18n/Link';
import { useLocale, useMessages } from '../i18n/LocaleProvider';
import { defineMessages, localePath } from '../i18n/locale';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Keycap } from '../ui/Keycap';
import {
  cleanTiers,
  countPlaced,
  emptyTiers,
  loadSaved,
  saveSaved,
  TIER_COLORS,
  tierListHref,
  TIERS,
  tiersFromParams,
  type SavedTiers,
  type Tier,
  type TierGroup,
  type TierItem,
  type Tiers,
} from './model';
import styles from './TierList.module.css';

type Zone = Tier | 'bench';
type Saved = SavedTiers;

/** Подписи, где игра называет своих героев по-своему: «чемпион», «персонаж». */
export interface TierListTexts {
  /** начало подсказки: «Выберите чемпиона» */
  pick: string;
  /** все расставлены */
  allPlaced: string;
  /** подпись колонки нераспределённых для экранных дикторов */
  benchLabel: string;
  /** подпись переключателя групп: «Линия» */
  groupLabel: string;
  /** сообщение, если делиться пока нечем */
  nothingToShare: string;
  searchPlaceholder: string;
}

const MESSAGES = defineMessages({
  ru: {
    texts: {
      pick: 'Выберите портрет',
      allPlaced: 'Все расставлены. Поделитесь ссылкой или выберите другую группу.',
      benchLabel: 'Нераспределённые',
      groupLabel: 'Группа',
      nothingToShare: 'Сначала расставьте хотя бы один портрет',
      searchPlaceholder: 'Имя',
    } satisfies TierListTexts,
    inTier: (name: string, tier: string) => `${name}: тир ${tier}`,
    backToList: (name: string) => `${name}: снова в списке`,
    copied: 'Ссылка скопирована',
    copyPrompt: 'Скопируйте ссылку на тир-лист',
    cleared: 'Тир-лист очищен',
    adopted: 'Тир-лист сохранён у вас',
    sharedTitle: 'Тир-лист по ссылке.',
    sharedText: 'Его можно посмотреть или забрать себе',
    willReplace: (group: string) => `: ваш тир-лист для раздела «${group}» будет заменён.`,
    adopt: 'Забрать себе',
    mine: 'Мой тир-лист',
    share: 'Поделиться',
    clear: 'Очистить',
    clearSure: 'Точно очистить?',
    tier: (t: string) => `Тир ${t}`,
    notPlaced: 'Ещё не в тир-листе',
    tierFor: (name: string) => `Тир для ${name}`,
    remove: 'Вернуть в список',
    hintPress: 'и нажмите',
    hintThen: '— он встанет в тир, а выбор перейдёт к следующему.',
    hintDelete: 'вернёт обратно в список.',
    benchTitle: 'Не распределены',
    of: 'из',
    searchByName: 'Поиск по имени',
    nobody: 'Никого не нашли. Проверьте имя.',
  },
  en: {
    texts: {
      pick: 'Pick a portrait',
      allPlaced: 'Everyone is placed. Share the link or pick another group.',
      benchLabel: 'Unranked',
      groupLabel: 'Group',
      nothingToShare: 'Place at least one portrait first',
      searchPlaceholder: 'Name',
    } satisfies TierListTexts,
    inTier: (name: string, tier: string) => `${name}: tier ${tier}`,
    backToList: (name: string) => `${name}: back in the list`,
    copied: 'Link copied',
    copyPrompt: 'Copy the tier list link',
    cleared: 'Tier list cleared',
    adopted: 'Tier list saved in your browser',
    sharedTitle: 'Shared tier list.',
    sharedText: 'You can look at it or make it yours',
    willReplace: (group: string) => `: your ${group} tier list will be replaced.`,
    adopt: 'Make it mine',
    mine: 'My tier list',
    share: 'Share',
    clear: 'Clear',
    clearSure: 'Clear for sure?',
    tier: (t: string) => `Tier ${t}`,
    notPlaced: 'Not in the tier list yet',
    tierFor: (name: string) => `Tier for ${name}`,
    remove: 'Back to the list',
    hintPress: 'and press',
    hintThen: '— it goes to that tier and the selection moves on.',
    hintDelete: 'puts it back in the list.',
    benchTitle: 'Unranked',
    of: 'of',
    searchByName: 'Search by name',
    nobody: 'No one found. Check the name.',
  },
});

export interface TierListProps {
  items: TierItem[];
  /** группы со своими тир-листами; первая открывается по умолчанию */
  groups: TierGroup[];
  iconUrl: (id: string) => string;
  itemHref: (item: TierItem) => string;
  /** адрес страницы тир-листа */
  basePath: string;
  /** ключ хранилища браузера */
  storageKey: string;
  /** имя параметра группы в адресе */
  groupParam?: string;
  texts?: Partial<TierListTexts>;
}

interface DragState {
  id: string;
  x: number;
  y: number;
  zone: Zone | null;
  /** место в ряду среди остальных */
  index: number;
  /** где рисовать отметку вставки, относительно ряда */
  caret: { left: number; top: number; height: number } | null;
}

// клавиши по физическому положению — на русской раскладке это Ы Ф И С В
const TIER_KEYS: Record<string, Tier> = {
  KeyS: 'S',
  KeyA: 'A',
  KeyB: 'B',
  KeyC: 'C',
  KeyD: 'D',
  Digit1: 'S',
  Digit2: 'A',
  Digit3: 'B',
  Digit4: 'C',
  Digit5: 'D',
};
const REMOVE_KEYS = new Set(['Backspace', 'Delete', 'Digit0']);

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '');

/** Где окажется портрет, если отпустить его в точке x, y. */
function locate(id: string, x: number, y: number): DragState {
  const zoneEl = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-zone]');
  const zone = (zoneEl?.dataset.zone as Zone | undefined) ?? null;
  if (!zoneEl || !zone || zone === 'bench') return { id, x, y, zone, index: 0, caret: null };

  const items = [...zoneEl.querySelectorAll<HTMLElement>('[data-champ]')].filter((el) => el.dataset.champ !== id);
  let index = items.length;
  for (let i = 0; i < items.length; i++) {
    const r = items[i].getBoundingClientRect();
    if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
      index = i;
      break;
    }
  }
  const anchor = items[index] ?? items[index - 1];
  let caret: DragState['caret'] = null;
  if (anchor) {
    const zr = zoneEl.getBoundingClientRect();
    const r = anchor.getBoundingClientRect();
    caret = { left: (items[index] ? r.left - 6 : r.right + 3) - zr.left, top: r.top - zr.top, height: r.height };
  }
  return { id, x, y, zone, index, caret };
}

/** Конструктор тир-листа: ряды S–D и список нераспределённых. Перетаскивание, клавиши и кнопки. */
export function TierList({ items: champions, groups, iconUrl, itemHref, basePath, storageKey, groupParam = 'group', texts: customTexts }: TierListProps) {
  const m = useMessages(MESSAGES);
  const locale = useLocale();
  const texts = { ...m.texts, ...customTexts };
  const params = useSearchParams();
  const group = groups.find((g) => g.param === params.get(groupParam)) ?? groups[0];
  const lane = group.key;
  const hrefFor = (key: string, t?: Tiers) => tierListHref(localePath(locale, basePath), groupParam, groups.find((g) => g.key === key), t);

  const [saved, setSaved] = useState<Saved>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [pressing, setPressing] = useState(false);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [status, setStatus] = useState('');
  const [announce, setAnnounce] = useState('');

  const press = useRef<{ id: string; x0: number; y0: number; active: boolean } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const suppressClick = useRef(false);
  const focusNext = useRef<string | null>(null);

  // сохранённое есть только в браузере; читаем до первой отрисовки, чтобы ряды не мигали
  useLayoutEffect(() => setSaved(loadSaved(storageKey)), [storageKey]);

  const byId = useMemo(() => new Map(champions.map((c) => [c.id, c])), [champions]);
  const pool = useMemo(() => (group.all ? champions : champions.filter((c) => c.groups.includes(group.key))), [champions, group]);
  const allowed = useMemo(() => new Set(pool.map((c) => c.id)), [pool]);

  // расстановка из ссылки показывается только для просмотра, пока её не заберут себе
  const shared = useMemo(() => {
    const raw = tiersFromParams(params);
    return raw ? cleanTiers(raw, allowed) : null;
  }, [params, allowed]);
  const readOnly = shared !== null;
  const tiers = shared ?? cleanTiers(saved[lane], allowed);

  const tierOf = new Map<string, Tier>();
  for (const t of TIERS) for (const id of tiers[t]) tierOf.set(id, t);
  const bench = pool.filter((c) => !tierOf.has(c.id));
  const q = norm(deferredQuery);
  const visibleBench = q ? bench.filter((c) => norm(c.name).includes(q) || norm(c.id).includes(q)) : bench;
  const current = selected && !readOnly ? byId.get(selected) : undefined;
  const currentTier = current ? tierOf.get(current.id) : undefined;
  const hasOwn = countPlaced(cleanTiers(saved[lane], allowed)) > 0;

  const update = (next: Tiers) => {
    const lanes = { ...saved, [lane]: next };
    setSaved(lanes);
    saveSaved(storageKey, lanes);
  };

  const move = (id: string, to: Tier | null, index?: number) => {
    const next = emptyTiers();
    for (const t of TIERS) next[t] = tiers[t].filter((x) => x !== id);
    if (to) next[to].splice(index ?? next[to].length, 0, id);
    update(next);
    const name = byId.get(id)?.name ?? id;
    setAnnounce(to ? m.inTier(name, to) : m.backToList(name));
  };

  /** Тир для выбранного. Из списка выбор переходит к следующему — можно расставлять подряд одними клавишами. */
  const assign = (tier: Tier | null) => {
    if (!selected || readOnly) return;
    let next: string | null = selected;
    if (tier && !tierOf.has(selected)) {
      const i = visibleBench.findIndex((c) => c.id === selected);
      const rest = visibleBench.filter((c) => c.id !== selected);
      next = i < 0 ? null : (rest[i] ?? rest[i - 1])?.id ?? null;
    }
    move(selected, tier);
    setSelected(next);
    focusNext.current = next;
  };

  const selectLane = (next: string) => {
    setSelected(null);
    setQuery('');
    window.history.replaceState(null, '', hrefFor(next));
  };

  const share = async () => {
    if (!countPlaced(tiers)) {
      setStatus(texts.nothingToShare);
      return;
    }
    const url = new URL(hrefFor(lane, tiers), window.location.origin).href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(m.copied);
    } catch {
      window.prompt(m.copyPrompt, url);
    }
  };

  const clear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    setSelected(null);
    update(emptyTiers());
    setStatus(m.cleared);
  };

  const adopt = () => {
    if (!shared) return;
    update(shared);
    window.history.replaceState(null, '', hrefFor(lane));
    setStatus(m.adopted);
  };

  const onChampClick = (id: string) => {
    if (suppressClick.current) return;
    setSelected((cur) => (cur === id ? null : id));
  };

  // нажатие на пустое место ряда кладёт туда выбранного — так удобно с телефона
  const onZoneClick = (zone: Zone) => (e: React.MouseEvent) => {
    if (readOnly || !selected || suppressClick.current) return;
    if (e.target instanceof Element && e.target.closest('[data-champ]')) return;
    if (zone !== 'bench') assign(zone);
    else if (tierOf.has(selected)) assign(null);
    else setSelected(null);
  };

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (readOnly || e.button !== 0 || e.pointerType === 'touch') return;
    press.current = { id, x0: e.clientX, y0: e.clientY, active: false };
    pointer.current = { x: e.clientX, y: e.clientY };
    setPressing(true);
  };

  const endPress = () => {
    press.current = null;
    setPressing(false);
    setDrag(null);
  };

  const onPointerMove = useEffectEvent((e: PointerEvent) => {
    const p = press.current;
    if (!p) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    if (!p.active) {
      if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 6) return;
      p.active = true;
      setSelected(null);
    }
    setDrag(locate(p.id, e.clientX, e.clientY));
  });

  const onPointerUp = useEffectEvent((e: PointerEvent) => {
    const p = press.current;
    endPress();
    if (!p?.active) return;
    // после перетаскивания браузер пришлёт click — он не должен выбирать портрет
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 0);
    const target = locate(p.id, e.clientX, e.clientY);
    if (target.zone === 'bench') {
      if (tierOf.has(p.id)) move(p.id, null);
    } else if (target.zone) {
      move(p.id, target.zone, target.index);
    }
  });

  useEffect(() => {
    if (!pressing) return;
    const onMove = (e: PointerEvent) => onPointerMove(e);
    const onUp = (e: PointerEvent) => onPointerUp(e);
    const onCancel = () => endPress();
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
  }, [pressing]);

  // у краёв окна страница прокручивается сама, чтобы дотащить до нижних рядов
  const dragging = drag !== null;
  useEffect(() => {
    if (!dragging) return;
    let frame = requestAnimationFrame(function scroll() {
      const { y } = pointer.current;
      const step = y < 110 ? -14 : y > window.innerHeight - 50 ? 14 : 0;
      if (step) window.scrollBy(0, step);
      frame = requestAnimationFrame(scroll);
    });
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('input, textarea, select, [contenteditable]') || document.querySelector('dialog[open]')) return;
    if (e.code === 'Escape') {
      if (press.current) endPress();
      setSelected(null);
      return;
    }
    if (readOnly || !selected) return;
    const tier = TIER_KEYS[e.code];
    if (tier) {
      e.preventDefault();
      assign(tier);
    } else if (REMOVE_KEYS.has(e.code)) {
      e.preventDefault();
      assign(null);
    } else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
      const t = tierOf.get(selected);
      const list = t ? tiers[t] : visibleBench.map((c) => c.id);
      const next = list[list.indexOf(selected) + (e.code === 'ArrowRight' ? 1 : -1)];
      if (next) {
        e.preventDefault();
        setSelected(next);
        focusNext.current = next;
      }
    }
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // фокус переходит к следующему портрету после расстановки с клавиатуры
  useEffect(() => {
    const id = focusNext.current;
    if (!id) return;
    focusNext.current = null;
    const el = document.querySelector<HTMLElement>(`[data-champ="${id}"]`);
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ block: 'nearest' });
  });

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

  const champ = (id: string, withName: boolean) => {
    const c = byId.get(id);
    if (!c) return null;
    const content = (
      <>
        <img src={iconUrl(c.id)} alt="" width={120} height={120} loading="lazy" decoding="async" draggable={false} />
        {withName && <span>{c.name}</span>}
      </>
    );
    if (readOnly) {
      return (
        <Link key={id} href={itemHref(c)} className={styles.champ} data-champ={id} title={c.name} aria-label={withName ? undefined : c.name}>
          {content}
        </Link>
      );
    }
    return (
      <button
        key={id}
        type="button"
        className={styles.champ}
        data-champ={id}
        data-lifted={drag?.id === id || undefined}
        aria-pressed={selected === id}
        aria-label={withName ? undefined : c.name}
        title={c.name}
        onPointerDown={(e) => onPointerDown(e, id)}
        onClick={() => onChampClick(id)}
      >
        {content}
      </button>
    );
  };

  return (
    <div className={styles.root} data-dragging={dragging || undefined} data-selecting={(selected && !readOnly) || undefined}>
      {readOnly && (
        <div className={styles.notice}>
          <p>
            <b>{m.sharedTitle}</b> {m.sharedText}
            {hasOwn ? m.willReplace(group.title) : '.'}
          </p>
          <div className={styles.noticeActions}>
            <Button variant="primary" size="sm" onClick={adopt}>
              {m.adopt}
            </Button>
            <Button size="sm" onClick={() => window.history.replaceState(null, '', hrefFor(lane))}>
              {m.mine}
            </Button>
          </div>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.lanes} role="group" aria-label={texts.groupLabel}>
          {groups.map((l) => (
            <button key={l.key} type="button" aria-pressed={lane === l.key} title={l.title} onClick={() => selectLane(l.key)}>
              {l.icon ?? <Icon name="grid" size={17} />}
              {l.label}
            </button>
          ))}
        </div>
        <div className={styles.tools}>
          <p className={styles.status} role="status">
            {status}
          </p>
          <Button size="sm" onClick={share}>
            <Icon name="share" size={16} />
            {m.share}
          </Button>
          {!readOnly && (
            <Button size="sm" variant="ghost" className={confirmClear ? styles.danger : undefined} onClick={clear}>
              {confirmClear ? m.clearSure : m.clear}
            </Button>
          )}
        </div>
      </div>

      <div className={styles.board}>
        <div className={styles.tiers}>
          {TIERS.map((t) => (
            <section key={t} className={styles.row} style={{ '--tier': TIER_COLORS[t] } as React.CSSProperties} aria-label={m.tier(t)} data-over={drag?.zone === t || undefined}>
              <div className={styles.letter} aria-hidden="true">
                {t}
              </div>
              <div className={styles.zone} data-zone={t} onClick={onZoneClick(t)}>
                {tiers[t].map((id) => champ(id, false))}
                {drag?.zone === t && drag.caret && <span className={styles.caret} style={drag.caret} />}
              </div>
            </section>
          ))}
        </div>

        <aside className={styles.side} aria-label={texts.benchLabel}>
          {!readOnly && (
            <div className={styles.action} data-active={current ? '' : undefined}>
              {current ? (
                <>
                  <img src={iconUrl(current.id)} alt="" width={120} height={120} />
                  <p className={styles.actionName}>
                    <b>{current.name}</b>
                    <span>{currentTier ? m.tier(currentTier) : m.notPlaced}</span>
                  </p>
                  <div className={styles.actionTiers} role="group" aria-label={m.tierFor(current.name)}>
                    {TIERS.map((t) => (
                      <button key={t} type="button" aria-pressed={currentTier === t} style={{ '--tier': TIER_COLORS[t] } as React.CSSProperties} onClick={() => assign(t)}>
                        {t}
                      </button>
                    ))}
                    {currentTier && (
                      <button type="button" className={styles.remove} title={m.remove} aria-label={m.remove} onClick={() => assign(null)}>
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <p className={styles.hint}>
                  {texts.pick} {m.hintPress} <Keycap size="sm">S</Keycap> <Keycap size="sm">A</Keycap> <Keycap size="sm">B</Keycap>{' '}
                  <Keycap size="sm">C</Keycap> <Keycap size="sm">D</Keycap> {m.hintThen} <Keycap size="sm">Delete</Keycap> {m.hintDelete}
                </p>
              )}
            </div>
          )}

          <div className={styles.benchHead}>
            <h2>{m.benchTitle}</h2>
            <span>
              {bench.length} {m.of} {pool.length}
            </span>
          </div>
          <label className={styles.search}>
            <Icon name="search" size={17} />
            <span className="sr-only">{m.searchByName}</span>
            <input value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder={texts.searchPlaceholder} autoComplete="off" spellCheck={false} />
          </label>
          <div className={styles.bench} data-zone="bench" data-over={drag?.zone === 'bench' || undefined} onClick={onZoneClick('bench')}>
            {visibleBench.map((c) => champ(c.id, true))}
            {bench.length === 0 ? (
              <p className={styles.empty}>{texts.allPlaced}</p>
            ) : (
              visibleBench.length === 0 && <p className={styles.empty}>{m.nobody}</p>
            )}
          </div>
        </aside>
      </div>

      {drag && (
        <img className={styles.ghost} src={iconUrl(drag.id)} alt="" width={120} height={120} style={{ translate: `${drag.x - 30}px ${drag.y - 30}px` }} />
      )}
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

/** Пока страница загружается: пустые ряды того же размера. */
export function TierListSkeleton() {
  return (
    <div className={styles.root} aria-hidden="true">
      <div className={styles.toolbar}>
        <div className={styles.lanesPlaceholder} />
      </div>
      <div className={styles.board}>
        <div className={styles.tiers}>
          {TIERS.map((t) => (
            <section key={t} className={styles.row} style={{ '--tier': TIER_COLORS[t] } as React.CSSProperties}>
              <div className={styles.letter}>{t}</div>
              <div className={styles.zone} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
