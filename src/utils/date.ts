export const pad2 = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date) {
  // Asia/Seoul 기준으로 쓰는 게 베스트지만, 이 앱은 날짜만 중요해서
  // 로컬 기준으로 YYYY-MM-DD만 안전하게 뽑음.
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

export function ymKey(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

export function parseYM(ym: string) {
  const [y, m] = ym.split("-").map((v) => Number(v));
  return { y, m }; // m is 1-12
}

export function startOfMonth(ym: string) {
  const { y, m } = parseYM(ym);
  return new Date(y, m - 1, 1);
}

export function daysInMonth(ym: string) {
  const { y, m } = parseYM(ym);
  return new Date(y, m, 0).getDate();
}

export function weekday0Sun(d: Date) {
  return d.getDay(); // 0..6 (Sun..Sat)
}

export function isWeekend(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return wd === 0 || wd === 6;
}

export function addMonths(ym: string, delta: number) {
  const { y, m } = parseYM(ym);
  const dt = new Date(y, m - 1 + delta, 1);
  return ymKey(dt);
}
export function dayOfWeekLocal(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}
