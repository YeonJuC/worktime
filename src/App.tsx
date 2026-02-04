import { useMemo, useState } from "react";
import AuthGate from "./components/AuthGate";
import MonthHeader from "./components/MonthHeader";
import CalendarGrid, { type Cell } from "./components/CalendarGrid";
import EditSheet from "./components/EditSheet";
import SummaryBar from "./components/SummaryBar";
import { useHolidays } from "./hooks/useHolidays";
import useMonthData from "./hooks/useMonthData";
import { addMonths, isWeekend, dayOfWeekLocal } from "./utils/date";
import type { DayEntry, BulkPlan } from "./types";
import { formatWorkRange } from "./utils/time";
import BulkSheet from "./components/BulkSheet";
import { useBulkPlan } from "./hooks/useBulkPlan";
import { computeHours } from "./utils/time";

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
      {(uid) => (
        <Main
          uid={uid}
          ym={ym}
          setYM={setYM}
          ymLabel={ymLabel}
          editISO={editISO}
          setEditISO={setEditISO}
        />
      )}
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
    const [y, m] = props.ym.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();

    let biz = 0;
    let hol = 0;
    let actual = 0;

    for (let d = 1; d <= dim; d++) {
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`;
      const weekend = isWeekend(iso);
      const isHol = Boolean(holidays[iso]);

      if (!weekend) {
        if (!isHol) biz += 1;
        else hol += 1;
      }

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

  const [bulkOpen, setBulkOpen] = useState(false);
  const { plan: bulkPlan, setPlan: setBulkPlan, savePlan, resetPlan } =
    useBulkPlan(props.uid);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ 저장 누락 방지: Promise.all로 한번에 await
  async function applyBulkPlan(plan: BulkPlan) {
    const [y, m] = props.ym.split("-").map(Number);
    const dim = new Date(y, m, 0).getDate();
    const mm = String(m).padStart(2, "0");

    const jobs: Promise<any>[] = [];

    for (let d = 1; d <= dim; d++) {
      const iso = `${y}-${mm}-${String(d).padStart(2, "0")}`;

      if (plan.skipWeekends && isWeekend(iso)) continue;
      if (plan.skipHolidays && holidays[iso]) continue;

      const exist = byDate[iso];

      // ✅ onlyEmpty: 이미 내용 있으면 보호 (leaveType "none" 기준)
      if (plan.mode === "onlyEmpty" && exist) {
        const hasWork =
          (exist.hours ?? 0) > 0 ||
          !!exist.start ||
          !!exist.end ||
          exist.mode === "preset";
        const hasLeave =
          exist.mode === "leave" &&
          !!exist.leaveType &&
          exist.leaveType !== "none";
        const hasMemo = Boolean((exist.memo ?? "").trim());
        if (hasWork || hasLeave || hasMemo) continue;
      }

      const dow = dayOfWeekLocal(iso); // ✅ 로컬 고정 요일
      const rule =
        dow >= 1 && dow <= 4 ? plan.monThu : dow === 5 ? plan.fri : null;
      if (!rule) continue;

      const breakEnabled = !!rule.breakEnabled;

      const bs = breakEnabled ? (rule.breakStart ?? "").trim() : "";
      const be = breakEnabled ? (rule.breakEnd ?? "").trim() : "";

      const draft: Omit<DayEntry, "hours"> = {
        date: iso,
        mode: "preset",
        preset: rule.preset ?? "CUSTOM",
        start: rule.start,
        end: rule.end,
        breakEnabled,
        breakStart: breakEnabled ? (bs || "12:00") : "",
        breakEnd: breakEnabled ? (be || "13:00") : "",
        memo: exist?.memo ?? "",
        updatedAt: Date.now(),
      };

      const entry: DayEntry = {
        ...draft,
        hours: computeHours(draft),
      };

      jobs.push(upsert(entry));

    }

    await Promise.all(jobs);
  }

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

      <div className="bulkBar">
        <button className="bulkBtn" onClick={() => setBulkOpen(true)}>
          이번 달 일괄 등록
        </button>
      </div>

      <CalendarGrid
        ym={props.ym}
        renderCell={(c: Cell, idx: number) => {
          if (!c.inMonth) return <div key={idx} className="cell empty" />;

          const weekend = isWeekend(c.iso);
          const hol = holidays[c.iso];
          const hours = byDate[c.iso]?.hours ?? 0;
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
                    ●
                  </span>
                )}
              </div>

              {hol && isSubHoliday ? (
                <div className="subLine">
                  <span className="subTag">대체</span>
                </div>
              ) : null}

              {memo.trim() && (
                <div className="memoLine" title={memo}>
                  {memo}
                </div>
              )}

              {range &&
                (() => {
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
                <span className={hours === 0 ? "h0" : "h"}>
                  {hours.toFixed(2)}h
                </span>
              </div>
            </div>
          );
        }}
      />

      <EditSheet
        open={Boolean(props.editISO)}
        date={props.editISO ?? ""}
        isHoliday={Boolean(editHoliday)}
        holidayName={editHoliday?.localName}
        initial={editEntry}
        onClose={() => props.setEditISO(null)}
        onSave={saveEntry}
      />

      {confirmOpen ? (
        <div className="confirmOverlay" onClick={() => setConfirmOpen(false)}>
          <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmTitle">이번 달에 일괄 적용할까요?</div>

            <div className="confirmDesc">
              <div>
                • 월~목:{" "}
                <b>
                  {bulkPlan.monThu.start}~{bulkPlan.monThu.end}
                </b>
              </div>
              <div>
                • 금요일:{" "}
                <b>
                  {bulkPlan.fri.start}~{bulkPlan.fri.end}
                </b>
              </div>
              <div>
                • 모드:{" "}
                <b>{bulkPlan.mode === "onlyEmpty" ? "빈 날만 채우기" : "덮어쓰기"}</b>
              </div>
              <div>
                • 공휴일 제외: <b>{bulkPlan.skipHolidays ? "ON" : "OFF"}</b>
              </div>
            </div>

            <div className="confirmActions">
              <button className="cBtn ghost" onClick={() => setConfirmOpen(false)}>
                취소
              </button>

              <button
                className="cBtn primary"
                onClick={async () => {
                  await savePlan(bulkPlan);
                  await applyBulkPlan(bulkPlan);
                  setConfirmOpen(false);
                }}
              >
                적용하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BulkSheet
        open={bulkOpen}
        plan={bulkPlan}
        onChange={setBulkPlan}
        onClose={() => setBulkOpen(false)}
        onApply={async () => {
          await savePlan(bulkPlan);
          setBulkOpen(false);
          setConfirmOpen(true);
        }}
        onSavePreset={async () => {
          await savePlan(bulkPlan);
          alert("일괄등록 설정을 저장했어요.");
        }}
        onResetPreset={async () => {
          await resetPlan();
          alert("설정을 초기화했어요.");
        }}
      />
    </main>
  );
}
