// «Угадай»: загадка дня и сравнение признаков. Сами признаки (класс, линия, стихия…) задаёт игра.

export type Verdict = 'match' | 'partial' | 'miss';

export interface Cell {
  label: string;
  value: string;
  verdict: Verdict;
  /** куда смотреть: у ответа больше (up) или меньше (down) */
  arrow?: 'up' | 'down';
}

export type Judgement = Pick<Cell, 'verdict' | 'arrow'>;

/** Кого угадывают. answerable — может ли он быть загадкой дня (например, известен год выхода). */
export interface GuessItem {
  id: string;
  slug: string;
  name: string;
  title: string;
  answerable: boolean;
}

/** Признак: как показать значение догадки и как сравнить его с ответом. */
export interface GuessColumn<T> {
  label: string;
  value: (item: T) => string;
  judge: (guess: T, answer: T) => Judgement;
}

/** Совпадает или нет. */
export const sameValue =
  <T,>(get: (item: T) => unknown) =>
  (guess: T, answer: T): Judgement => ({ verdict: get(guess) === get(answer) ? 'match' : 'miss' });

/** Наборы: все совпали, есть общее или ничего общего. */
export const sameSet =
  <T,>(get: (item: T) => string[]) =>
  (guess: T, answer: T): Judgement => {
    const a = get(guess);
    const b = get(answer);
    if (a.length === b.length && a.every((x) => b.includes(x))) return { verdict: 'match' };
    return { verdict: a.some((x) => b.includes(x)) ? 'partial' : 'miss' };
  };

/** Числа со стрелкой: у ответа больше или меньше. Без значения — мимо. */
export const ordered =
  <T,>(get: (item: T) => number | null) =>
  (guess: T, answer: T): Judgement => {
    const g = get(guess);
    const a = get(answer);
    if (g === null || a === null) return { verdict: 'miss' };
    if (g === a) return { verdict: 'match' };
    return { verdict: 'miss', arrow: a > g ? 'up' : 'down' };
  };

export const compare = <T,>(columns: GuessColumn<T>[], guess: T, answer: T): Cell[] =>
  columns.map((c) => ({ label: c.label, value: c.value(guess), ...c.judge(guess, answer) }));

/** Дата по местному времени: загадка меняется в полночь у каждого игрока. */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const utcDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Номер загадки: firstDay — день загадки №1. */
export const puzzleNumber = (day: string, firstDay: string) => Math.round((utcDay(day) - utcDay(firstDay)) / 86_400_000) + 1;

// FNV-1a: одинаковая строка — одинаковое число, у всех игроков одна загадка
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Загадка дня среди тех, кто может быть ответом. */
export function dailyAnswer<T extends GuessItem>(pool: T[], day: string, mode: string) {
  // порядок по id, а не по списку: список сортируется по именам на языке страницы, а загадка дня одна на всех языках
  const candidates = pool.filter((c) => c.answerable).toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return candidates[hash(`${mode}:${day}`) % candidates.length];
}

/** Точка, на которую наведён арт в режиме «По арту»: ближе к центру, где обычно сам герой. */
export function focusPoint(seed: string) {
  const h = hash(seed);
  return { x: 32 + (h % 36), y: 18 + ((h >>> 8) % 28) };
}
