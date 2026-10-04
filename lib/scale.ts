/** «Красивые» деления оси: шаг 1, 2 или 5 × 10ⁿ. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (hi - lo < 1e-9) hi = lo + 1;
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.floor(lo / step) * step;
  const end = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}
