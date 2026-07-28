import { useEffect, useMemo, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
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

  useEffect(() => {
    const setVh = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--vh", `${h * 0.01}px`);
    };

    setVh();
    window.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("resize", setVh);
    window.visualViewport?.addEventListener("scroll", setVh);

    return () => {
      window.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("resize", setVh);
      window.visualViewport?.removeEventListener("scroll", setVh);
    };
  }, []);

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
  const [todayNotice, setTodayNotice] = useState<{ start: string; end: string } | null>(null);
  const [notificationSettingsOpen, setNotificationSettingsOpen] = useState(false);
  const dailyHoursStorageKey = `worktime-daily-hours-visible-${props.uid}`;
  const [showDailyHours, setShowDailyHours] = useState(() => {
    try {
      return localStorage.getItem(dailyHoursStorageKey) !== "hidden";
    } catch {
      return true;
    }
  });
  const notificationStorageKey = `worktime-notification-settings-${props.uid}`;
  const [notificationEnabled, setNotificationEnabled] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(notificationStorageKey) ?? "{}");
      return Boolean(saved.enabled);
    } catch {
      return false;
    }
  });
  const [notificationTime, setNotificationTime] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(notificationStorageKey) ?? "{}");
      return typeof saved.time === "string" ? saved.time : "08:00";
    } catch {
      return "08:00";
    }
  });

  const { settings: leaveSettings, setSettings: setLeaveSettings, saveSettings } =
    useLeaveSettings(props.uid);

  const todayISO = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  useEffect(() => {
    const entry = byDate[todayISO];
    if (!entry?.start || !entry?.end || (entry.hours ?? 0) <= 0) return;

    // 날짜별 하루 한 번만 표시합니다. 앱/브라우저를 다시 열어도 같은 날에는 재표시하지 않습니다.
    const popupKey = `worktime-today-popup-${props.uid}-${todayISO}`;
    if (!localStorage.getItem(popupKey)) {
      setTodayNotice({ start: entry.start, end: entry.end });
      localStorage.setItem(popupKey, "shown");
    }
  }, [byDate, props.uid, todayISO]);

  useEffect(() => {
    localStorage.setItem(
      notificationStorageKey,
      JSON.stringify({ enabled: notificationEnabled, time: notificationTime })
    );
  }, [notificationEnabled, notificationTime, notificationStorageKey]);

  useEffect(() => {
    localStorage.setItem(dailyHoursStorageKey, showDailyHours ? "visible" : "hidden");
  }, [dailyHoursStorageKey, showDailyHours]);

  useEffect(() => {
    if (!notificationEnabled) return;

    const checkAndNotify = () => {
      const entry = byDate[todayISO];
      if (!entry?.start || !entry?.end || (entry.hours ?? 0) <= 0) return;
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      if (currentTime < notificationTime) return;

      const notificationKey = `worktime-system-notification-${props.uid}-${todayISO}-${notificationTime}`;
      if (localStorage.getItem(notificationKey)) return;

      try {
        new Notification("오늘 근무시간 안내", {
          body: `오늘 근무시간은 ${entry.start}부터 ${entry.end}까지입니다.`,
          icon: `${import.meta.env.BASE_URL}icon-192.png`,
          tag: `worktime-${todayISO}-${notificationTime}`,
        });
        localStorage.setItem(notificationKey, "shown");
      } catch {
        // 알림을 지원하지 않는 환경에서는 앱 기능을 그대로 유지합니다.
      }
    };

    checkAndNotify();
    const timer = window.setInterval(checkAndNotify, 30_000);
    window.addEventListener("focus", checkAndNotify);
    document.addEventListener("visibilitychange", checkAndNotify);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkAndNotify);
      document.removeEventListener("visibilitychange", checkAndNotify);
    };
  }, [byDate, notificationEnabled, notificationTime, props.uid, todayISO]);

  async function saveNotificationSettings(enabled: boolean, time = notificationTime) {
    const ref = doc(db, "users", props.uid, "settings", "notification");
    await setDoc(ref, {
      enabled,
      time,
      timezone: "Asia/Seoul",
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  async function setSystemNotificationEnabled(enabled: boolean) {
    if (!enabled) {
      setNotificationEnabled(false);
      await saveNotificationSettings(false);
      return;
    }

    if (!("Notification" in window)) {
      alert("이 브라우저는 시스템 알림을 지원하지 않습니다.");
      return;
    }

    let permission = Notification.permission;
    if (permission !== "granted") permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("브라우저 또는 아이폰 설정에서 알림을 허용해주세요.");
      return;
    }

    await saveNotificationSettings(true);
    setNotificationEnabled(true);
  }


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

   useEffect(() => {
    const open = leaveModalOpen || notificationSettingsOpen || confirmOpen || bulkOpen || Boolean(props.editISO);
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [leaveModalOpen, notificationSettingsOpen, confirmOpen, bulkOpen, props.editISO]);

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

      <div className="dashboardStatsGrid leaveStatsGrid" aria-label="휴가 요약">
        <section className="dashboardStatCard glass leaveStatCard">
          <div className="dashboardStatHeader">
            <div className="dashboardStatLabel">연차 잔여</div>
            <button
              type="button"
              className="statTextButton"
              onClick={() => setLeaveModalOpen(true)}
              aria-label="연차 설정 열기"
            >
              설정
            </button>
          </div>
          <strong className="dashboardStatValue">{annualRemaining.toFixed(2)}개</strong>
          <div className="dashboardStatMeta">
            사용 {annualUsed.toFixed(2)}개 / 총 {annualTotal || 0}개
            {validUntilYM ? ` · ~${validUntilYM}` : ""}
            {expired ? " · 만료" : ""}
          </div>
        </section>

        <section className="dashboardStatCard glass leaveStatCard">
          <div className="dashboardStatLabel">여성휴가(이번달)</div>
          <span className={femaleUsedThisMonth > 0 ? "femaleStatusBadge used" : "femaleStatusBadge unused"}>
            {femaleUsedThisMonth > 0 ? "사용" : "미사용"}
          </span>
          <div className="dashboardStatMeta femaleCount">{femaleUsedThisMonth}/1</div>
        </section>
      </div>

      <button className="bulkRegisterCard glass" type="button" onClick={() => setBulkOpen(true)}>
        <span className="bulkRegisterIcon" aria-hidden="true">▣</span>
        <span className="bulkRegisterCopy">
          <strong>이번 달 일괄 등록</strong>
          <span>근무시간과 휴무를 한 번에 등록합니다.</span>
        </span>
        <span className="bulkRegisterAction">등록하기</span>
      </button>

      <div className="calendarQuickSettings glass" aria-label="캘린더 표시 및 알림 설정">
        <div className="quickSettingItem">
          <div className="quickSettingText">
            <div className="quickSettingTitle">일일 합계</div>
            <div className="quickSettingDesc">{showDailyHours ? "표시 중" : "숨김"}</div>
          </div>
          <button
            type="button"
            className={showDailyHours ? "quickSettingBtn active" : "quickSettingBtn"}
            onClick={() => setShowDailyHours((visible) => !visible)}
            aria-pressed={showDailyHours}
          >
            {showDailyHours ? "숨기기" : "보이기"}
          </button>
        </div>

        <div className="quickSettingDivider" aria-hidden="true" />

        <div className="quickSettingItem">
          <div className="quickSettingText">
            <div className="quickSettingTitle">근무 알림</div>
            <div className="quickSettingDesc">
              {notificationEnabled ? `${notificationTime} 사용 중` : "사용 안 함"}
            </div>
          </div>
          <button
            type="button"
            className={notificationEnabled ? "quickSettingBtn active" : "quickSettingBtn"}
            onClick={() => setNotificationSettingsOpen(true)}
          >
            설정
          </button>
        </div>
      </div>

      <div className={showDailyHours ? "calendarDisplay" : "calendarDisplay dailyHoursHidden"}>
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

              {showDailyHours ? (
                <div className="workHours">
                  <span className={hours === 0 ? "h0" : "h"}>{hours.toFixed(2)}h</span>
                </div>
              ) : null}
            </div>
          ); 
        }}
      />
      </div>

      {todayNotice ? (
        <div className="todayNoticeOverlay" onClick={() => setTodayNotice(null)}>
          <div className="todayNoticeCard" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="todayNoticeIcon">⏰</div>
            <div className="todayNoticeTitle">오늘 근무시간 안내</div>
            <div className="todayNoticeText">
              오늘 근무시간은 <b>{todayNotice.start}</b>부터 <b>{todayNotice.end}</b>까지입니다.
            </div>
            <div className="todayNoticeActions">
              <button className="btn ghost" onClick={() => {
                setTodayNotice(null);
                setNotificationSettingsOpen(true);
              }}>알림 설정</button>
              <button className="btn primary" onClick={() => setTodayNotice(null)}>확인</button>
            </div>
          </div>
        </div>
      ) : null}

      {notificationSettingsOpen ? (
        <div className="confirmOverlay" onClick={() => setNotificationSettingsOpen(false)}>
          <div className="confirmModal notificationModal" onClick={(event) => event.stopPropagation()}>
            <div className="confirmTitle">시스템 알림 설정</div>
            <div className="notificationSettingRow">
              <div>
                <div className="notificationSettingLabel">시스템 알림</div>
                <div className="notificationSettingHint">앱이 실행 중일 때 설정한 시간 이후 하루 한 번 표시</div>
              </div>
              <button
                type="button"
                className={notificationEnabled ? "toggleSwitch on" : "toggleSwitch"}
                aria-pressed={notificationEnabled}
                onClick={() => setSystemNotificationEnabled(!notificationEnabled)}
              >
                <span />
              </button>
            </div>
            <label className="notificationTimeField">
              <span>알림 시간</span>
              <input
                className="input"
                type="time"
                value={notificationTime}
                onChange={(event) => setNotificationTime(event.target.value || "08:00")}
              />
            </label>
            <div className="notificationIosNote">
              무료 GitHub Pages 버전에서는 앱이 실행 중이거나 다시 열렸을 때 알림을 확인합니다.
            </div>
            <div className="confirmActions">
              <button className="cBtn primary" onClick={async () => {
                if (notificationEnabled) await saveNotificationSettings(true, notificationTime);
                setNotificationSettingsOpen(false);
              }}>저장</button>
            </div>
          </div>
        </div>
      ) : null}

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
