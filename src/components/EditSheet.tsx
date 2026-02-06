import { useEffect, useMemo, useState } from "react";
import type { DayEntry, LeaveType } from "../types";
import {
  BREAK_PRESETS,
  SHIFT_PRESETS,
  computeHours,
  LEAVE_OPTIONS,
} from "../utils/time";

type Mode = "preset" | "manual";

export default function EditSheet(props: {
  open: boolean;
  date: string;
  isHoliday: boolean;
  holidayName?: string;
  initial?: DayEntry | null;
  onClose: () => void;
  onSave: (entry: DayEntry) => void;

  // ✅ 이번 달 여성휴가 사용 횟수(월1회 제한)
  femaleUsedThisMonth?: number;
}) {
  const [mode, setMode] = useState<Mode>("preset");
  const [shiftKey, setShiftKey] =
    useState<(typeof SHIFT_PRESETS)[number]["key"]>("0800-1700");

  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("17:00");
  const [breakEnabled, setBreakEnabled] = useState(true);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [manualHours, setManualHours] = useState(8);

  // ✅ leave는 mode랑 별개(근무 + 휴가 동시 저장)
  const [leaveType, setLeaveType] = useState<LeaveType>("none");

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
      setLeaveType("none");
      setManualHours(8);
      setMemo("");
      return;
    }

    setMode(init.mode ?? "preset");
    setStart(init.start ?? "08:00");
    setEnd(init.end ?? "17:00");
    setBreakEnabled(init.breakEnabled ?? true);
    setBreakStart(init.breakStart ?? "12:00");
    setBreakEnd(init.breakEnd ?? "13:00");
    setManualHours(init.manualHours ?? 8);
    setLeaveType(init.leaveType ?? "none");
    setMemo(init.memo ?? "");

    const found = SHIFT_PRESETS.find(
      (s) => s.start === (init.start ?? "") && s.end === (init.end ?? "")
    );
    if (found) setShiftKey(found.key);
  }, [props.open, props.initial]);

  const previewHours = useMemo(() => {
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
    return computeHours(base);
  }, [
    props.date,
    mode,
    start,
    end,
    breakEnabled,
    breakStart,
    breakEnd,
    manualHours,
    leaveType,
    memo,
  ]);

  function applyShift(key: (typeof SHIFT_PRESETS)[number]["key"]) {
    const s = SHIFT_PRESETS.find((x) => x.key === key)!;
    setShiftKey(key);
    setMode("preset");
    setStart(s.start);
    setEnd(s.end);

    setBreakEnabled(s.breakDefault);
    if (s.breakDefault) {
      setBreakStart((s as any).breakStart ?? "12:00");
      setBreakEnd((s as any).breakEnd ?? "13:00");
    } else {
      setBreakStart("");
      setBreakEnd("");
    }
  }

  const femaleBlocked =
    leaveType !== "female" && (props.femaleUsedThisMonth ?? 0) >= 1;

  function save() {
    const normalizedLeaveType: LeaveType = leaveType ?? "none";

    const base: Omit<DayEntry, "hours"> = {
      date: props.date,
      mode,
      start,
      end,
      breakEnabled,
      breakStart,
      breakEnd,
      manualHours,
      leaveType: normalizedLeaveType,
      memo,
    };

    const hours = computeHours(base);
    props.onSave({ ...base, hours });
    props.onClose();
  }

  if (!props.open) return null;

  return (
    <div className="sheetOverlay" onClick={props.onClose} role="presentation">
      <div
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sheetHandle" />

        <div className="sheetHead">
          <div>
            <div className="sheetDate">{props.date}</div>
            {props.isHoliday && (
              <div className="holidayLabel">
                공휴일 · {props.holidayName ?? "Holiday"}
              </div>
            )}
          </div>
          <button className="btn ghost" onClick={props.onClose}>
            닫기
          </button>
        </div>

        {/* ✅ 근무 모드만 */}
        <div className="seg">
          <button
            className={mode === "preset" ? "segBtn on" : "segBtn"}
            onClick={() => setMode("preset")}
          >
            시간표
          </button>
          <button
            className={mode === "manual" ? "segBtn on" : "segBtn"}
            onClick={() => setMode("manual")}
          >
            수동
          </button>
        </div>

        {/* ✅ 여기부터는 스크롤 영역 */}
        <div className="sheetScroll">
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
                  <input
                    className="input"
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </div>
                <div className="field">
                  <div className="label">종료</div>
                  <input
                    className="input"
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <div className="label">점심시간</div>
                <div className="row2">
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={breakEnabled}
                      onChange={(e) => setBreakEnabled(e.target.checked)}
                    />
                    <span>사용</span>
                  </label>
                  <div className="chips">
                    {BREAK_PRESETS.map((b) => (
                      <button
                        key={b.key}
                        className={
                          breakStart === b.start && breakEnd === b.end
                            ? "chip on"
                            : "chip"
                        }
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
                    <input
                      className="input"
                      type="time"
                      value={breakStart}
                      onChange={(e) => setBreakStart(e.target.value)}
                    />
                    <input
                      className="input"
                      type="time"
                      value={breakEnd}
                      onChange={(e) => setBreakEnd(e.target.value)}
                    />
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
                  step={0.25}
                  value={manualHours}
                  onChange={(e) => setManualHours(Number(e.target.value))}
                />
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  예: 8 / 7.5 / 4 / 2 …
                </div>
              </div>
            </div>
          )}

          {/* ✅ 연차/반차: 근무와 동시에 선택 */}
          <div className="sheetBody" style={{ paddingTop: 0 }}>
            <div className="field">
              <div className="label">연차/반차</div>
              <div className="chips">
                {LEAVE_OPTIONS.map((o) => {
                  if (o.key === "female") {
                    return (
                      <button
                        key={o.key}
                        className={leaveType === o.key ? "chip on" : "chip"}
                        disabled={femaleBlocked}
                        onClick={() => setLeaveType(o.key)}
                        title={
                          femaleBlocked
                            ? "이번 달 여성휴가는 이미 사용했어요."
                            : o.label
                        }
                      >
                        {o.label}
                      </button>
                    );
                  }
                  return (
                    <button
                      key={o.key}
                      className={leaveType === o.key ? "chip on" : "chip"}
                      onClick={() => setLeaveType(o.key)}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>

              {femaleBlocked && (
                <div className="tiny muted" style={{ marginTop: 8 }}>
                  * 여성휴가는 매달 1회만 사용 가능해요.
                </div>
              )}
            </div>
          </div>

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

          {/* 스크롤 마지막 여유(키보드/하단 sticky 겹침 방지) */}
          <div style={{ height: 8 }} />
        </div>

        <div className="sheetFoot">
          <div className="sumPill">
            <span className="muted">계산됨</span>
            <b>{previewHours.toFixed(2)}h</b>
          </div>
          <button className="btn primary" onClick={save}>
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
