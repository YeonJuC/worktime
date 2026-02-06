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
import { formatWorkRange, leaveLabel, computeHours } from "./utils/time";
import BulkSheet from "./components/BulkSheet";
import { useBulkPlan } from "./hooks/useBulkPlan";
import { useLeaveSettings } from "./hooks/useLeaveSettings";
import { useLeaveUsage } from "./hooks/useLeaveUsage";

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

  const { settings: leaveSettings, setSettings: setLeaveSettings, saveSettings } =
    useLeaveSettings(props.uid);

  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // ✅ 유효기간(YYYY-MM) 기준으로 “누적 차감” 집계 범위를 잡음
  const ymLE = (a: string, b: string) => a <= b;

  const validUntilYM = (leaveSettings.annualValidUntilYM ?? "").trim(); // 예: "2026-06"
  const expired = validUntilYM ? !ymLE(props.ym, validUntilYM) : false;

  // 집계 시작월: 유효기간의 연도 1월(원하면 settings로 startYM 따로 둬도 됨)
  const periodStartYM = validUntilYM
    ? `${validUntilYM.slice(0, 4)}-01`
    : `${props.ym.slice(0, 4)}-01`;

  // 화면이 유효기간을 넘으면 유효기간 월까지만 집계
  const cutYM = validUntilYM
    ? (ymLE(props.ym, validUntilYM) ? props.ym : validUntilYM)
    : props.ym;

  // ✅ 누적 연차 차감/여성휴가 월별 카운트
  const { annualUsed, femaleUsedByYM } = useLeaveUsage(props.uid, periodStartYM, cutYM);

  const femaleUsedThisMonth = femaleUsedByYM[props.ym] ?? 0;

  const annualTotal = Number(leaveSettings.annualTotal ?? 0);
  const annualRemaining = useMemo(() => {
    return Math.max(0, Math.round((annualTotal - annualUsed) * 100) / 100);
  }, [annualTotal, annualUsed]);

  const { requiredHours, actualHours, bizDays, holidayCount } = useMemo(() => {
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
  const { plan: bulkPlan, setPlan: setBulkPlan, savePlan, resetPlan } = useBulkPlan(props.uid);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // ✅ 연차 설정 팝업(총 연차/유효기간 입력)
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

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

      if (plan.mode === "onlyEmpty" && exist) {
        const hasWork = (exist.hours ?? 0) > 0 || !!exist.start || !!exist.end || exist.mode === "preset";
        const hasLeave = (exist.leaveType ?? "none") !== "none";
        const hasMemo = Boolean((exist.memo ?? "").trim());
        if (hasWork || hasLeave || hasMemo) continue;
      }

      const dow = dayOfWeekLocal(iso);
      const rule = dow >= 1 && dow <= 4 ? plan.monThu : dow === 5 ? plan.fri : null;
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
        // ✅ leaveType은 기존 유지 (일괄등록이 근무만 채우는 컨셉)
        leaveType: exist?.leaveType ?? "none",
        updatedAt: Date.now(),
      };

      const entry: DayEntry = { ...draft, hours: computeHours(draft) };
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

      {/* ✅ 연차/여성휴가 요약: 컴팩트 박스(입력은 팝업으로 분리) */}
      <div className="summary glass compactLeaveBox">
        <div className="summaryRow">
          <div className="k">연차 잔여</div>
          <div className="v">
            <b>{annualRemaining.toFixed(2)}개</b>
            <span className="muted tiny">
              사용 {annualUsed.toFixed(2)}개 / 총 {annualTotal || 0}개
              {validUntilYM ? ` · ~${validUntilYM}` : ""}
              {expired ? " (만료)" : ""}
            </span>
          </div>
        </div>

        <div className="summaryRow">
          <div className="k">여성휴가(이번달)</div>
          <div className="v">
            <b>{femaleUsedThisMonth}/1</b>
          </div>
        </div>

        <div className="leaveActions">
          <button className="btn ghost leaveMiniBtn" onClick={() => setLeaveModalOpen(true)}>
            연차 설정
          </button>
        </div>
      </div>

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
          const entry = byDate[c.iso];
          const hours = entry?.hours ?? 0;
          const memo = entry?.memo ?? "";
          const range = formatWorkRange(entry ?? null);
          const isSubHoliday = !!hol?.substitute;
          const isToday = c.iso === todayISO;
          const leaveType = byDate[c.iso]?.leaveType ?? "none";
          const leaveText = leaveLabel(leaveType);

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

                {leaveType !== "none" && (
                <div className="leaveLine">
                  <span className={["leavePill", `lv-${leaveType}`].join(" ")}>
                    {leaveText}
                  </span>
                </div>
              )}

              <div className="workHours">
                <span className={hours === 0 ? "h0" : "h"}>{hours.toFixed(2)}h</span>
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
        femaleUsedThisMonth={femaleUsedThisMonth}
      />

      {/* ✅ 연차 설정 팝업 */}
      {leaveModalOpen ? (
        <div className="confirmOverlay" onClick={() => setLeaveModalOpen(false)}>
          <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmTitle">연차 설정</div>

            <div className="confirmDesc" style={{ gap: 10 }}>
              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  총 연차(개수)
                </div>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={0.25}
                  value={leaveSettings.annualTotal ?? 0}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, annualTotal: Number(e.target.value) })}
                />
              </div>

              <div>
                <div className="muted" style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
                  사용 가능 ~ (YYYY-MM)
                </div>
                <input
                  className="input"
                  type="month"
                  value={leaveSettings.annualValidUntilYM ?? ""}
                  onChange={(e) => setLeaveSettings({ ...leaveSettings, annualValidUntilYM: e.target.value })}
                />
              </div>
            </div>

            <div className="confirmActions">
              <button className="cBtn ghost" onClick={() => setLeaveModalOpen(false)}>
                닫기
              </button>
              <button
                className="cBtn primary"
                onClick={async () => {
                  await saveSettings();
                  setLeaveModalOpen(false);
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 일괄등록 확인 */}
      {confirmOpen ? (
        <div className="confirmOverlay" onClick={() => setConfirmOpen(false)}>
          <div className="confirmModal" onClick={(e) => e.stopPropagation()}>
            <div className="confirmTitle">이번 달에 일괄 적용할까요?</div>

            <div className="confirmDesc">
              <div>
                • 월~목: <b>{bulkPlan.monThu.start}~{bulkPlan.monThu.end}</b>
              </div>
              <div>
                • 금요일: <b>{bulkPlan.fri.start}~{bulkPlan.fri.end}</b>
              </div>
              <div>
                • 모드: <b>{bulkPlan.mode === "onlyEmpty" ? "빈 날만 채우기" : "덮어쓰기"}</b>
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
