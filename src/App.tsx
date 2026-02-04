import { useMemo, useState } from "react";
import AuthGate from "./components/AuthGate";
import MonthHeader from "./components/MonthHeader";
import CalendarGrid, { type Cell } from "./components/CalendarGrid";
import EditSheet from "./components/EditSheet";
import SummaryBar from "./components/SummaryBar";
import { useHolidays } from "./hooks/useHolidays";
import { useMonthData } from "./hooks/useMonthData";
import { addMonths, isWeekend } from "./utils/date";
import type { DayEntry } from "./types";
import { formatWorkRange } from "./utils/time";

function nowYM() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export default function App() {
  const [ym, setYM] = useState(nowYM());
  const [editISO, setEditISO] = useState<string | null>(null);

  const ymLabel = useMemo(() => {
    const [y, m] = ym.split("-");
    return `${y}년 ${Number(m)}월`;
  }, [ym]);

  return (
    <AuthGate>
      {(uid) => <Main uid={uid} ym={ym} setYM={setYM} ymLabel={ymLabel} editISO={editISO} setEditISO={setEditISO} />}
    </AuthGate>
  );
}

function Main(props: {
  uid: string;
  ym: string;
  setYM: (v: string) => void;
  ymLabel: string;
  editISO: string | null;
  setEditISO: (v: string | null) => void;
}) {
  const { holidays } = useHolidays(props.ym, "KR");
  const { byDate, upsert } = useMonthData(props.uid, props.ym);

  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const { requiredHours, actualHours, bizDays, holidayCount } = useMemo(() => {
    // month cells only in-month computed inside CalendarGrid; 여기선 byDate/holidays 기반으로 계산
    // required = (평일 - 공휴일) * 8, 주말 제외
    const [y, m] = props.ym.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();

    let biz = 0;
    let hol = 0;
    let actual = 0;

    for (let d = 1; d <= dim; d++) {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const weekend = isWeekend(iso);
      const isHol = Boolean(holidays[iso]);

      if (!weekend) {
        if (!isHol) biz += 1;
        else hol += 1;
      }

      // 입력 합계: 주말/공휴일도 입력했으면 합산
      actual += byDate[iso]?.hours ?? 0;
    }

    return {
      requiredHours: biz * 8,
      actualHours: actual,
      bizDays: biz,
      holidayCount: hol,
    };
  }, [props.ym, holidays, byDate]);

  const editEntry = props.editISO ? byDate[props.editISO] ?? null : null;
  const editHoliday = props.editISO ? holidays[props.editISO] : undefined;

  function openEdit(iso: string) {
    if (!iso) return;
    props.setEditISO(iso);
  }

  function saveEntry(entry: DayEntry) {
    upsert({ ...entry, updatedAt: Date.now() });
  }

  return (
    <main className="page">
      <MonthHeader
        ymLabel={props.ymLabel}
        onPrev={() => props.setYM(addMonths(props.ym, -1))}
        onNext={() => props.setYM(addMonths(props.ym, +1))}
      />

      <SummaryBar
        requiredHours={requiredHours}
        actualHours={actualHours}
        bizDays={bizDays}
        holidays={holidayCount}
      />

      <CalendarGrid
        ym={props.ym}
        renderCell={(c: Cell, idx: number) => {
          if (!c.inMonth) return <div key={idx} className="cell empty" />;

          const weekend = isWeekend(c.iso);
          const hol = holidays[c.iso];
          const hours = byDate[c.iso]?.hours ?? (weekend ? 0 : hol ? 0 : 0);
          const memo = byDate[c.iso]?.memo ?? "";
          const range = formatWorkRange(byDate[c.iso]);
          const isSubHoliday = !!hol?.substitute;
          const isToday = c.iso === todayISO;

          return (
            <div
              key={c.iso}
              className={[
                "cell",
                weekend ? "weekend" : "",
                hol ? "holiday" : "",
                isToday ? "today" : "",
              ].join(" ")}
              onClick={() => openEdit(c.iso)}
              role="button"
              tabIndex={0}
            >
              <div className="cellTop">
                <span className="dayNum">{c.day}</span>
                {hol && (
                  <span className="holDot" title={hol.localName}>
                    ●{isSubHoliday ? <span className="subTag">대체</span> : null}
                  </span>
                )}
              </div>
              {memo.trim() && <div className="memoLine" title={memo}>{memo}</div>}
              {range && (() => {
                const [s, e] = range.split("-");
                return (
                  <div className="workRange" title={range} aria-label={range}>
                    <span className="ws">{s}</span>
                    <span className="dash">-</span>
                    <span className="we">{e}</span>
                  </div>
                );
              })()}

              <div className="workHours">
                <span className={hours === 0 ? "h0" : "h"}>{hours.toFixed(2)}h</span>
              </div>
            </div>
          );
        }}
      />

      <EditSheet
        open={Boolean(props.editISO)}
        dateISO={props.editISO ?? ""}
        isHoliday={Boolean(editHoliday)}
        holidayName={editHoliday?.localName}
        initial={editEntry}
        onClose={() => props.setEditISO(null)}
        onSave={saveEntry}
      />
    </main>
  );
}
