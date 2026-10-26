'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from '../i18n/Link';
import { useLocale, useMessages } from '../i18n/LocaleProvider';
import { LOCALE_TAG, defineMessages } from '../i18n/locale';
import { Button, buttonClass } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { compare, dailyAnswer, dayKey, focusPoint, puzzleNumber, type GuessColumn, type GuessItem, type Verdict } from './model';
import styles from './GuessGame.module.css';

type Mode = 'classic' | 'art';
type ByMode<T> = Record<Mode, T>;

/** Подписи, где игра называет своих героев по-своему. */
export interface GuessTexts {
  /** заголовок первой колонки: «Чемпион» */
  itemLabel: string;
  placeholder: string;
  classicHint: string;
  artHint: string;
  artAlt: string;
  another: string;
  /** начало строки результата: «угадай чемпиона» */
  shareClassic: string;
  shareArt: string;
}

const MESSAGES = defineMessages({
  ru: {
    texts: {
      itemLabel: 'Герой',
      placeholder: 'Введите имя',
      classicHint: 'После каждой попытки видно, какие признаки совпали с загаданным.',
      artHint: 'Видно только кусочек арта. С каждой ошибкой он отдаляется, а после третьей становится цветным.',
      artAlt: 'Кусочек арта загаданного героя',
      another: 'Другой',
      shareClassic: 'угадай героя',
      shareArt: 'угадай по арту',
    } satisfies GuessTexts,
    byTraits: 'По признакам',
    byArt: 'По арту',
    fromAttempt: (n: number) => `С ${n}-й попытки`,
    copied: 'Результат скопирован',
    copyPrompt: 'Скопируйте результат',
    mode: 'Режим',
    practice: 'Тренировка',
    backToDaily: 'Вернуться к загадке дня',
    daily: (n: number) => `Загадка дня №${n}`,
    guessed: 'Угадано',
    solved: (n: number) => `Загадка №${n} решена`,
    next: 'Следующая загадка через',
    openPage: 'Открыть страницу',
    shareResult: 'Поделиться результатом',
    oneMore: 'Ещё один',
    noAttempts: 'Попыток пока нет',
    attempts: (n: number) => `Попыток: ${n}`,
    titleHint: (title: string) => `Титул: «${title}»`,
    hintButton: 'Подсказка: титул',
    hintLater: (n: number) => `Подсказка — после ${n} ошибок`,
    misses: 'Неверные попытки',
    match: 'совпало',
    partial: 'частично',
    miss: 'мимо',
    more: 'у загаданного больше',
    less: 'у загаданного меньше',
    arrowLegend: 'стрелка — у загаданного больше или меньше',
  },
  en: {
    texts: {
      itemLabel: 'Hero',
      placeholder: 'Type a name',
      classicHint: 'After each guess you can see which traits match the answer.',
      artHint: 'Only a piece of the art is visible. It zooms out with every miss and turns to color after the third.',
      artAlt: 'A piece of the hidden hero’s art',
      another: 'Another',
      shareClassic: 'guess the hero',
      shareArt: 'guess by art',
    } satisfies GuessTexts,
    byTraits: 'By traits',
    byArt: 'By art',
    fromAttempt: (n: number) => `In ${n} ${n === 1 ? 'guess' : 'guesses'}`,
    copied: 'Result copied',
    copyPrompt: 'Copy the result',
    mode: 'Mode',
    practice: 'Practice',
    backToDaily: 'Back to the daily puzzle',
    daily: (n: number) => `Daily puzzle #${n}`,
    guessed: 'Got it',
    solved: (n: number) => `Puzzle #${n} solved`,
    next: 'Next puzzle in',
    openPage: 'Open page',
    shareResult: 'Share result',
    oneMore: 'One more',
    noAttempts: 'No guesses yet',
    attempts: (n: number) => `Guesses: ${n}`,
    titleHint: (title: string) => `Title: “${title}”`,
    hintButton: 'Hint: title',
    hintLater: (n: number) => `Hint after ${n} misses`,
    misses: 'Wrong guesses',
    match: 'match',
    partial: 'partial',
    miss: 'miss',
    more: 'the answer has more',
    less: 'the answer has less',
    arrowLegend: 'arrow — the answer has more or less',
  },
});

export interface GuessGameProps<T extends GuessItem> {
  items: T[];
  columns: GuessColumn<T>[];
  iconUrl: (id: string) => string;
  artUrl: (id: string) => string;
  itemHref: (item: T) => string;
  /** день загадки №1, ГГГГ-ММ-ДД */
  firstDay: string;
  storageKey: string;
  /** название сайта в строке результата */
  siteName: string;
  texts?: Partial<GuessTexts>;
}

/** во сколько раз увеличен арт после 0, 1, 2… ошибок */
const ZOOMS = [6, 4.6, 3.6, 2.8, 2.2, 1.7, 1.35, 1];
const HINT_AFTER = 3;
const EMOJI: Record<Verdict, string> = { match: '🟩', partial: '🟨', miss: '🟥' };

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]/g, '');

const untilMidnight = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000));
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');
};

/** «Угадай»: загадка дня по признакам или по кусочку арта, плюс тренировка без ограничений. */
export function GuessGame<T extends GuessItem>({ items: champions, columns, iconUrl, artUrl, itemHref, firstDay, storageKey, siteName, texts: customTexts }: GuessGameProps<T>) {
  const m = useMessages(MESSAGES);
  const locale = useLocale();
  const texts = { ...m.texts, ...customTexts };
  const MODES: { key: Mode; label: string; hint: string }[] = [
    { key: 'classic', label: m.byTraits, hint: texts.classicHint },
    { key: 'art', label: m.byArt, hint: texts.artHint },
  ];
  const [day, setDay] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('classic');
  const [daily, setDaily] = useState<ByMode<string[]>>({ classic: [], art: [] });
  const [practice, setPractice] = useState<ByMode<{ answer: string; guesses: string[] } | null>>({ classic: null, art: null });
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [hint, setHint] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [countdown, setCountdown] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // дата и прогресс есть только в браузере
  useEffect(() => {
    const today = dayKey();
    setDay(today);
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
      if (saved?.day === today) setDaily({ classic: saved.classic ?? [], art: saved.art ?? [] });
    } catch {
      // без хранилища прогресс живёт до закрытия вкладки
    }
  }, [storageKey]);

  const byId = useMemo(() => new Map(champions.map((c) => [c.id, c])), [champions]);
  const round = practice[mode];
  const answer = round ? byId.get(round.answer) : day ? dailyAnswer(champions, day, mode) : undefined;
  const list = round ? round.guesses : daily[mode];
  const solved = !!answer && list.includes(answer.id);
  const wrong = list.filter((id) => id !== answer?.id).length;

  useEffect(() => {
    if (!solved || round) return;
    setCountdown(untilMidnight());
    const timer = setInterval(() => setCountdown(untilMidnight()), 1000);
    return () => clearInterval(timer);
  }, [solved, round]);

  useEffect(() => {
    if (!status) return;
    const timer = setTimeout(() => setStatus(''), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const q = norm(query);
  const options = q
    ? champions
        .filter((c) => !list.includes(c.id) && (norm(c.name).includes(q) || norm(c.id).includes(q)))
        .sort((x, y) => Number(norm(y.name).startsWith(q)) - Number(norm(x.name).startsWith(q)))
        .slice(0, 8)
    : [];

  const guess = (c: T) => {
    if (!answer || solved || list.includes(c.id)) return;
    const next = [...list, c.id];
    if (round) {
      setPractice((p) => ({ ...p, [mode]: { ...round, guesses: next } }));
    } else {
      const updated = { ...daily, [mode]: next };
      setDaily(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify({ day, ...updated }));
      } catch {
        // Storage can be unavailable; the current round remains playable in memory.
      }
    }
    setFresh(c.id);
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
  };

  const startPractice = () => {
    const pool = champions.filter((c) => c.answerable && c.id !== answer?.id);
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setPractice((p) => ({ ...p, [mode]: { answer: pick.id, guesses: [] } }));
    setHint(false);
    setFresh(null);
    inputRef.current?.focus();
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setHint(false);
    setFresh(null);
    setQuery('');
  };

  const share = async () => {
    if (!answer || !day) return;
    const n = puzzleNumber(day, firstDay);
    const lines =
      mode === 'classic'
        ? [
            `${siteName}: ${texts.shareClassic} №${n}`,
            ...list.map((id) => {
              const g = byId.get(id);
              return g ? compare(columns, g, answer).map((cell) => EMOJI[cell.verdict]).join('') : '';
            }),
            m.fromAttempt(list.length),
          ]
        : [`${siteName}: ${texts.shareArt} №${n}`, m.fromAttempt(list.length)];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setStatus(m.copied);
    } catch {
      window.prompt(m.copyPrompt, lines.join('\n'));
    }
  };

  if (!day || !answer) return <div className={styles.placeholder} />;

  const n = puzzleNumber(day, firstDay);
  const current = MODES.find((m) => m.key === mode)!;
  const zoom = solved ? 1 : ZOOMS[Math.min(wrong, ZOOMS.length - 1)];
  const focus = focusPoint(`${round ? round.answer : day}:${answer.id}`);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.modes} role="group" aria-label={m.mode}>
          {MODES.map((m) => (
            <button key={m.key} type="button" aria-pressed={mode === m.key} onClick={() => switchMode(m.key)}>
              {m.label}
            </button>
          ))}
        </div>
        <p className={styles.round}>
          {round ? (
            <>
              {m.practice}.{' '}
              <button type="button" onClick={() => setPractice((p) => ({ ...p, [mode]: null }))}>
                {m.backToDaily}
              </button>
            </>
          ) : (
            <>{m.daily(n)}</>
          )}
        </p>
      </div>
      <p className={styles.modeHint}>{current.hint}</p>

      <div className={styles.stage} data-mode={mode}>
      {mode === 'art' && (
        <div className={styles.art} data-gray={(!solved && wrong < 3) || undefined} data-solved={solved || undefined}>
          <img
            src={artUrl(answer.id)}
            alt={solved ? answer.name : texts.artAlt}
            width={1280}
            height={720}
            style={{ transform: `scale(${zoom})`, transformOrigin: `${focus.x}% ${focus.y}%` }}
          />
          {!solved && (
            <span className={styles.zoom}>
              ×{zoom.toLocaleString(LOCALE_TAG[locale])}
            </span>
          )}
        </div>
      )}

      <div className={styles.panel}>
      {solved ? (
        <div className={styles.win}>
          {mode === 'classic' && <img className={styles.winArt} src={artUrl(answer.id)} alt="" width={1280} height={720} />}
          <div className={styles.winText}>
            <p className={styles.winLabel}>{round ? m.guessed : m.solved(n)}</p>
            <h2>{answer.name}</h2>
            <p className={styles.winTitle}>{answer.title}</p>
            <p>
              {m.fromAttempt(list.length)}.
              {!round && countdown && (
                <>
                  {' '}
                  {m.next} <span className="num">{countdown}</span>.
                </>
              )}
            </p>
            <div className={styles.winActions}>
              <Link href={itemHref(answer)} className={buttonClass('primary')}>
                {m.openPage}
              </Link>
              {!round && <Button onClick={share}>{m.shareResult}</Button>}
              <Button variant="ghost" onClick={startPractice}>
                {round ? m.oneMore : m.practice}
              </Button>
            </div>
            <p className={styles.status} role="status">
              {status}
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.ask}>
          <div className={styles.combo}>
            <label className={styles.input}>
              <Icon name="search" size={18} />
              <span className="sr-only">{texts.placeholder}</span>
              <input
                ref={inputRef}
                value={query}
                placeholder={texts.placeholder}
                autoComplete="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={options.length > 0}
                aria-controls="guess-options"
                aria-activedescendant={options[active] ? `guess-${options[active].id}` : undefined}
                onChange={(e) => {
                  setQuery(e.currentTarget.value);
                  setActive(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActive((i) => Math.min(options.length - 1, i + 1));
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActive((i) => Math.max(0, i - 1));
                  } else if (e.key === 'Enter' && options[active]) {
                    e.preventDefault();
                    guess(options[active]);
                  } else if (e.key === 'Escape') setQuery('');
                }}
              />
            </label>
            {options.length > 0 && (
              <ul id="guess-options" role="listbox" aria-label={texts.placeholder} className={styles.options}>
                {options.map((c, i) => (
                  <li
                    key={c.id}
                    id={`guess-${c.id}`}
                    role="option"
                    aria-selected={i === active}
                    onPointerEnter={() => setActive(i)}
                    onPointerDown={(e) => e.preventDefault()}
                    onClick={() => guess(c)}
                  >
                    <img src={iconUrl(c.id)} alt="" width={120} height={120} loading="lazy" />
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className={styles.side}>
            <span>
              {list.length === 0 ? m.noAttempts : m.attempts(list.length)}
            </span>
            {mode === 'classic' &&
              (hint ? (
                <span className={styles.hint}>{m.titleHint(answer.title)}</span>
              ) : wrong >= HINT_AFTER ? (
                <button type="button" className={styles.hintButton} onClick={() => setHint(true)}>
                  <Icon name="tip" size={16} />
                  {m.hintButton}
                </button>
              ) : (
                <span className={styles.hintLater}>{m.hintLater(HINT_AFTER)}</span>
              ))}
            {round && (
              <button type="button" className={styles.hintButton} onClick={startPractice}>
                <Icon name="reset" size={16} />
                {texts.another}
              </button>
            )}
          </div>
        </div>
      )}

      {mode === 'art' && wrong > 0 && (
        <ul className={styles.misses} aria-label={m.misses}>
          {list
            .filter((id) => id !== answer.id)
            .map((id) => {
              const g = byId.get(id);
              return g ? (
                <li key={id}>
                  <img src={iconUrl(g.id)} alt="" width={120} height={120} />
                  {g.name}
                </li>
              ) : null;
            })}
        </ul>
      )}
      </div>
      </div>

      {mode === 'classic' && list.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{texts.itemLabel}</th>
                {columns.map((c) => (
                  <th key={c.label} scope="col">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...list].reverse().map((id) => {
                const g = byId.get(id);
                if (!g) return null;
                return (
                  <tr key={id} data-fresh={id === fresh || undefined}>
                    <th scope="row">
                      <img src={iconUrl(g.id)} alt="" width={120} height={120} />
                      <span>{g.name}</span>
                    </th>
                    {compare(columns, g, answer).map((cell, i) => (
                      <td key={cell.label} data-verdict={cell.verdict} style={{ '--i': i } as React.CSSProperties}>
                        {cell.value}
                        {cell.arrow && <Icon name={cell.arrow === 'up' ? 'chevron-up' : 'chevron-down'} size={16} />}
                        <span className="sr-only">
                          , {cell.verdict === 'match' ? m.match : cell.verdict === 'partial' ? m.partial : m.miss}
                          {cell.arrow === 'up' ? `, ${m.more}` : cell.arrow === 'down' ? `, ${m.less}` : ''}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className={styles.legend}>
            <span data-verdict="match">{m.match}</span>
            <span data-verdict="partial">{m.partial}</span>
            <span data-verdict="miss">{m.miss}</span>
            <span>{m.arrowLegend}</span>
          </p>
        </div>
      )}
    </div>
  );
}
