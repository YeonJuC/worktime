import { useEffect, useMemo, useState } from "react";
import type { DayEntry, LeaveType } from "../types";
import { BREAK_PRESETS, LEAVE_OPTIONS, SHIFT_PRESETS, computeHours } from "../utils/time";
import { isWeekend } from "../utils/date";

type Mode = "preset" | "manual" | "leave";

export default function EditSheet(props: {
  open: boolean;
  date: string;
  isHoliday: boolean;
  holidayName?: string;
  initial?: DayEntry | null;
  onClose: () => void;
  onSave: (entry: DayEntry) => void;
}) {
  const locked = useMemo(() => {
    // 주말/공휴일은 기본 0시간이지만 "내가 강제로 입력"은 허용(유연근무/특근 등)
    // 그래서 UI상 "기본은 0시간"만 안내하고 잠그지 않음.
    return false;
  }, []);

  const [mode, setMode] = useState<Mode>("preset");
  const [shiftKey, setShiftKey] = useState<(typeof SHIFT_PRESETS)[number]["key"]>("0800-1700");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("17:00");
  const [breakEnabled, setBreakEnabled] = useState(true);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [manualHours, setManualHours] = useState(0);
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    if (!props.open) return;
    const init = props.initial;
    if (!init) {
      setMode("preset");
      setShiftKey("0800-1700");
      setStart("08:00");
      setEnd("17:00");
      setBreakEnabled(true);
      setBreakStart("12:00");
      setBreakEnd("13:00");
      setManualHours(isWeekend(props.date) || props.isHoliday ? 0 : 8);
      setLeaveType("annual");
      setMemo("");
      return;
    }
    setMode(init.mode);
    setStart(init.start ?? "08:00");
    setEnd(init.end ?? "17:00");
    setBreakEnabled(init.breakEnabled ?? true);
    setBreakStart(init.breakStart ?? "12:00");
    setBreakEnd(init.breakEnd ?? "13:00");
    setManualHours(init.manualHours ?? init.hours ?? 0);
    setLeaveType(init.leaveType ?? "annual");
    setMemo(init.memo ?? "");

    // preset key best-match (optional)
    const found = SHIFT_PRESETS.find((s) => s.start === (init.start ?? "") && s.end === (init.end ?? ""));
    if (found) setShiftKey(found.key);
  }, [props.open, props.initial, props.date, props.isHoliday]);

  const previewHours = useMemo(() => {
    const entryBase: Omit<DayEntry, "hours"> = {
      date: props.date,
      mode,
      start,
      end,
      breakEnabled,
      breakStart,
      breakEnd,
      manualHours,
      leaveType,
      memo,
    };
    return computeHours(entryBase);
  }, [mode, start, end, breakEnabled, breakStart, breakEnd, manualHours, leaveType, props.date]);

  function applyShift(key: (typeof SHIFT_PRESETS)[number]["key"]) {
    const s = SHIFT_PRESETS.find((x) => x.key === key)!;
    setShiftKey(key);
    setMode("preset");
    setStart(s.start);
    setEnd(s.end);
    setBreakEnabled(s.breakDefault);
    if (s.breakDefault) {
      // ✅ 07:30–12:30 같은 예외 프리셋은 프리셋이 가진 점심시간을 그대로 적용
      setBreakStart((s as any).breakStart ?? "12:00");
      setBreakEnd((s as any).breakEnd ?? "13:00");
    }
  }

  function save() {
    const base: Omit<DayEntry, "hours"> = {
      date: props.date,
      mode,
      start,
      end,
      breakEnabled,
      breakStart,
      breakEnd,
      manualHours,
      leaveType,
      memo,
    };
    const hours = computeHours(base);

    const entry: DayEntry = {
      ...base,
      hours,
      // firestore serverTimestamp는 App에서 넣는 게 아니라 upsert 시 merge로 넣어도 되지만
      // 여기선 단순 데이터만
    };

    props.onSave(entry);
    props.onClose();
  }

  if (!props.open) return null;

  return (
    <div className="sheetOverlay" onClick={props.onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheetHandle" />
        <div className="sheetHead">
          <div>
            <div className="sheetDate">{props.date}</div>
            {props.isHoliday && (
              <div className="holidayLabel">공휴일 · {props.holidayName ?? "Holiday"}</div>
            )}
          </div>
          <button className="btn ghost" onClick={props.onClose}>
            닫기
          </button>
        </div>

        <div className="seg">
          <button className={mode === "preset" ? "segBtn on" : "segBtn"} onClick={() => setMode("preset")}>
            시간표
          </button>
          <button className={mode === "manual" ? "segBtn on" : "segBtn"} onClick={() => setMode("manual")}>
            수동
          </button>
          <button className={mode === "leave" ? "segBtn on" : "segBtn"} onClick={() => setMode("leave")}>
            연차/반차
          </button>
        </div>

        {mode === "preset" && (
          <div className="sheetBody">
            <div className="field">
              <div className="label">근무시간 옵션</div>
              <div className="tiny muted" style={{ marginTop: 6 }}>
                * 옵션 선택 후 아래에서 시간을 직접 수정할 수 있어요.
              </div>
              <div className="chips">
                {SHIFT_PRESETS.map((s) => (
                  <button
                    key={s.key}
                    className={shiftKey === s.key ? "chip on" : "chip"}
                    onClick={() => applyShift(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="row2">
              <div className="field">
                <div className="label">시작</div>
                <input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="field">
                <div className="label">종료</div>
                <input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>

            <div className="field">
              <div className="label">점심시간</div>
              <div className="row2">
                <label className="toggle">
                  <input type="checkbox" checked={breakEnabled} onChange={(e) => setBreakEnabled(e.target.checked)} />
                  <span>사용</span>
                </label>
                <div className="chips">
                  {BREAK_PRESETS.map((b) => (
                    <button
                      key={b.key}
                      className={breakStart === b.start && breakEnd === b.end ? "chip on" : "chip"}
                      onClick={() => {
                        setBreakEnabled(true);
                        setBreakStart(b.start);
                        setBreakEnd(b.end);
                      }}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
              {breakEnabled && (
                <div className="row2" style={{ marginTop: 8 }}>
                  <input className="input" type="time" value={breakStart} onChange={(e) => setBreakStart(e.target.value)} />
                  <input className="input" type="time" value={breakEnd} onChange={(e) => setBreakEnd(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "manual" && (
          <div className="sheetBody">
            <div className="field">
              <div className="label">총 근무시간(시간)</div>
              <input
                className="input"
                type="number"
                min={0}
                max={24}
                step={0.5}
                value={manualHours}
                onChange={(e) => setManualHours(Number(e.target.value))}
              />
              <div className="tiny muted" style={{ marginTop: 8 }}>
                예: 8 / 7.5 / 4 …
              </div>
            </div>
          </div>
        )}

        {mode === "leave" && (
          <div className="sheetBody">
            <div className="field">
              <div className="label">선택</div>
              <div className="chips">
                {LEAVE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    className={leaveType === o.key ? "chip on" : "chip"}
                    onClick={() => {
                      setMode("leave");
                      setLeaveType(o.key);
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <div className="tiny muted" style={{ marginTop: 8 }}>
                * 이 앱에서는 연차/반차를 “근무한 시간”으로 합산해서 총시간 비교가 가능하게 했어.
              </div>
            </div>
          </div>
        )}

        <div className="sheetBody" style={{ paddingTop: 0 }}>
          <div className="field">
            <div className="label">메모</div>
            <textarea
              className="input memoInput"
              rows={3}
              placeholder="이 날짜에 메모 남기기…"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
        </div>

        <div className="sheetFoot">
          <div className="sumPill">
            <span className="muted">계산됨</span>
            <b>{previewHours.toFixed(2)}h</b>
          </div>
          <button className="btn primary" onClick={save} disabled={locked}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
