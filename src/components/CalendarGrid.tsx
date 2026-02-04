import { daysInMonth, startOfMonth, toISO, weekday0Sun } from "../utils/date";

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

export type Cell = {
  iso: string;
  day: number;
  inMonth: boolean;
};

export function buildMonthCells(ym: string): Cell[] {
  const start = startOfMonth(ym);
  const dim = daysInMonth(ym);

  const firstW = weekday0Sun(start); // 0=Sun
  const cells: Cell[] = [];

  // leading blanks from prev month
  for (let i = 0; i < firstW; i++) {
    cells.push({ iso: "", day: 0, inMonth: false });
  }

  for (let d = 1; d <= dim; d++) {
    const iso = toISO(new Date(start.getFullYear(), start.getMonth(), d));
    cells.push({ iso, day: d, inMonth: true });
  }

  // trailing blanks to complete grid (6 rows max => 42)
  while (cells.length % 7 !== 0) cells.push({ iso: "", day: 0, inMonth: false });
  while (cells.length < 42) cells.push({ iso: "", day: 0, inMonth: false });

  return cells;
}

export default function CalendarGrid(props: {
  ym: string;
  renderCell: (c: Cell, idx: number) => JSX.Element;
}) {
  const cells = buildMonthCells(props.ym);
  return (
    <div className="calWrap">
      <div className="weekHeader">
        {WEEK.map((w) => (
          <div key={w} className="weekCell">
            {w}
          </div>
        ))}
      </div>

      <div className="grid">
        {cells.map((c, idx) => props.renderCell(c, idx))}
      </div>
    </div>
  );
}
