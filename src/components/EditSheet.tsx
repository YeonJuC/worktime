import { useEffect, useMemo, useState } from "react";
import type { DayEntry, LeaveType } from "../types";
import {
  BREAK_PRESETS,
  SHIFT_PRESETS,
  computeHours,
  LEAVE_OPTIONS,
  type ShiftPreset,
} from "../utils/time";
import { useShiftPresets } from "../hooks/useShiftPresets";

type Mode = "preset" | "manual";

export default function EditSheet(props: {
  open: boolean;
  date: string;
  isHoliday: boolean;
  holidayName?: string;
  initial?: DayEntry | null;
  onClose: () => void;
  onSave: (entry: DayEntry) => void;
  femaleUsedThisMonth?: number;
}) {
  const [mode, setMode] = useState<Mode>("preset");
  const [shiftKey, setShiftKey] = useState<string>("0800-1700");
  const [managePresets, setManagePresets] = useState(false);

  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("17:00");
  const [breakEnabled, setBreakEnabled] = useState(true);
  const [breakStart, setBreakStart] = useState("12:00");
  const [breakEnd, setBreakEnd] = useState("13:00");
  const [manualHours, setManualHours] = useState(8);
  const [leaveType, setLeaveType] = useState<LeaveType>("none");
  const [memo, setMemo] = useState("");

  const {
    visiblePresets,
    hiddenDefaultKeys,
    addCustomPreset,
    removeCustomPreset,
    hideDefaultPreset,
    restoreDefaultPresets,
  } = useShiftPresets();

  useEffect(() => {
    if (!props.open) return;
    setManagePresets(false);
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
      (preset) =>
        preset.start === (init.start ?? "") &&
        preset.end === (init.end ?? "") &&
        preset.breakDefault === (init.breakEnabled ?? true) &&
        (!preset.breakDefault ||
          (preset.breakStart === (init.breakStart ?? "12:00") &&
            preset.breakEnd === (init.breakEnd ?? "13:00")))
    );
    setShiftKey(found?.key ?? init.preset ?? "CUSTOM");
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
  }, [props.date, mode, start, end, breakEnabled, breakStart, breakEnd, manualHours, leaveType, memo]);

  function applyShift(preset: ShiftPreset) {
    setShiftKey(preset.key);
    setMode("preset");
    setStart(preset.start);
    setEnd(preset.end);
    setBreakEnabled(preset.breakDefault);
    setBreakStart(preset.breakDefault ? preset.breakStart ?? "12:00" : "");
    setBreakEnd(preset.breakDefault ? preset.breakEnd ?? "13:00" : "");
  }

  function saveCurrentAsPreset() {
    if (!start || !end) {
      alert("시작 시간과 종료 시간을 먼저 입력해주세요.");
      return;
    }
    const label = `${start}–${end}`;
    const preset = addCustomPreset({
      label,
      start,
      end,
      breakDefault: breakEnabled,
      breakStart: breakEnabled ? breakStart : undefined,
      breakEnd: breakEnabled ? breakEnd : undefined,
    });
    setShiftKey(preset.key);
    alert(`${label} 옵션을 저장했어요.`);
  }

  const femaleBlocked = leaveType !== "female" && (props.femaleUsedThisMonth ?? 0) >= 1;

  function save() {
    const base: Omit<DayEntry, "hours"> = {
      date: props.date,
      mode,
      preset: shiftKey,
      start,
      end,
      breakEnabled,
      breakStart,
      breakEnd,
      manualHours,
      leaveType: leaveType ?? "none",
      memo,
    };
    props.onSave({ ...base, hours: computeHours(base) });
    props.onClose();
  }

  if (!props.open) return null;

  return (
    <div className="sheetOverlay" onClick={props.onClose} role="presentation">
      <div className="sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheetHandle" />
        <div className="sheetHead">
          <div>
            <div className="sheetDate">{props.date}</div>
            {props.isHoliday && <div className="holidayLabel">공휴일 · {props.holidayName ?? "Holiday"}</div>}
          </div>
          <button className="btn ghost" onClick={props.onClose}>닫기</button>
        </div>

        <div className="seg">
          <button className={mode === "preset" ? "segBtn on" : "segBtn"} onClick={() => setMode("preset")}>시간표</button>
          <button className={mode === "manual" ? "segBtn on" : "segBtn"} onClick={() => setMode("manual")}>수동</button>
        </div>

        <div className="sheetScroll">
          {mode === "preset" && (
            <div className="sheetBody">
              <div className="field">
                <div className="presetTitleRow">
                  <div>
                    <div className="label">근무시간 옵션</div>
                    <div className="tiny muted" style={{ marginTop: 6 }}>옵션 선택 후 아래 시간을 직접 수정할 수 있어요.</div>
                  </div>
                  <button className="btn ghost presetManageBtn" onClick={() => setManagePresets((value) => !value)}>
                    {managePresets ? "완료" : "옵션 관리"}
                  </button>
                </div>

                <div className="presetGrid">
                  {visiblePresets.map((preset) => (
                    <div className="presetItem" key={preset.key}>
                      <button className={shiftKey === preset.key ? "chip on presetChip" : "chip presetChip"} onClick={() => applyShift(preset)}>
                        {preset.label}
                      </button>
                      {managePresets && (
                        <button
                          className="presetRemove"
                          aria-label={preset.isCustom ? `${preset.label} 삭제` : `${preset.label} 숨기기`}
                          title={preset.isCustom ? "삭제" : "숨기기"}
                          onClick={() => {
                            if (preset.isCustom) removeCustomPreset(preset.key);
                            else hideDefaultPreset(preset.key);
                            if (shiftKey === preset.key) setShiftKey("CUSTOM");
                          }}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {visiblePresets.length === 0 && <div className="emptyPreset muted tiny">표시 중인 근무시간 옵션이 없습니다.</div>}

                <div className="presetActions">
                  <button className="btn ghost" onClick={saveCurrentAsPreset}>현재 시간을 빠른 옵션으로 저장</button>
                  {hiddenDefaultKeys.length > 0 && <button className="btn ghost" onClick={restoreDefaultPresets}>기본 옵션 복원</button>}
                </div>
              </div>

              <div className="row2">
                <div className="field">
                  <div className="label">시작</div>
                  <input className="input" type="time" value={start} onChange={(event) => { setStart(event.target.value); setShiftKey("CUSTOM"); }} />
                </div>
                <div className="field">
                  <div className="label">종료</div>
                  <input className="input" type="time" value={end} onChange={(event) => { setEnd(event.target.value); setShiftKey("CUSTOM"); }} />
                </div>
              </div>

              <div className="field">
                <div className="label">점심시간</div>
                <div className="row2">
                  <label className="toggle">
                    <input type="checkbox" checked={breakEnabled} onChange={(event) => { setBreakEnabled(event.target.checked); setShiftKey("CUSTOM"); }} />
                    <span>사용</span>
                  </label>
                  <div className="chips">
                    {BREAK_PRESETS.map((preset) => (
                      <button
                        key={preset.key}
                        className={breakStart === preset.start && breakEnd === preset.end ? "chip on" : "chip"}
                        onClick={() => {
                          setBreakEnabled(true);
                          setBreakStart(preset.start);
                          setBreakEnd(preset.end);
                          setShiftKey("CUSTOM");
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                {breakEnabled && (
                  <div className="row2" style={{ marginTop: 8 }}>
                    <input className="input" type="time" value={breakStart} onChange={(event) => { setBreakStart(event.target.value); setShiftKey("CUSTOM"); }} />
                    <input className="input" type="time" value={breakEnd} onChange={(event) => { setBreakEnd(event.target.value); setShiftKey("CUSTOM"); }} />
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "manual" && (
            <div className="sheetBody">
              <div className="field">
                <div className="label">총 근무시간(시간)</div>
                <input className="input" type="number" min={0} max={24} step={0.25} value={manualHours} onChange={(event) => setManualHours(Number(event.target.value))} />
                <div className="tiny muted" style={{ marginTop: 8 }}>예: 8 / 7.5 / 4 / 2</div>
              </div>
            </div>
          )}

          <div className="sheetBody" style={{ paddingTop: 0 }}>
            <div className="field">
              <div className="label">연차/반차</div>
              <div className="chips">
                {LEAVE_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    className={leaveType === option.key ? "chip on" : "chip"}
                    disabled={option.key === "female" && femaleBlocked}
                    onClick={() => setLeaveType(option.key)}
                    title={option.key === "female" && femaleBlocked ? "이번 달 여성휴가는 이미 사용했어요." : option.label}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {femaleBlocked && <div className="tiny muted" style={{ marginTop: 8 }}>* 여성휴가는 매달 1회만 사용 가능해요.</div>}
            </div>
          </div>

          <div className="sheetBody" style={{ paddingTop: 0 }}>
            <div className="field">
              <div className="label">메모</div>
              <textarea className="input memoInput" rows={3} placeholder="이 날짜에 메모 남기기…" value={memo} onChange={(event) => setMemo(event.target.value)} />
            </div>
          </div>
          <div style={{ height: 8 }} />
        </div>

        <div className="sheetFoot">
          <div className="sumPill"><span className="muted">계산됨</span><b>{previewHours.toFixed(2)}h</b></div>
          <button className="btn primary" onClick={save}>저장</button>
        </div>
      </div>
    </div>
  );
}
