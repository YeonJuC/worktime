// src/components/LeaveSettingsSheet.tsx
import type { LeaveSettings } from "../types";

export default function LeaveSettingsSheet(props: {
  open: boolean;
  settings: LeaveSettings;
  onChange: (next: LeaveSettings) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="sheetOverlay" onClick={props.onClose} role="presentation">
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheetHandle" />
        <div className="sheetHead">
          <div>
            <div className="sheetDate">연차 설정</div>
            <div className="tiny muted" style={{ marginTop: 4 }}>
              * 만료월 이전 사용분까지 누적 차감돼요.
            </div>
          </div>
          <button className="btn ghost" onClick={props.onClose}>닫기</button>
        </div>

        <div className="sheetBody">
          <div className="field">
            <div className="label">총 연차(개수)</div>
            <input
              className="input"
              type="number"
              min={0}
              step={0.25}
              value={Number(props.settings.annualTotal ?? 0)}
              onChange={(e) => props.onChange({ ...props.settings, annualTotal: Number(e.target.value) })}
            />
          </div>

          <div className="field">
            <div className="label">사용 가능 만료월</div>
            <input
              className="input"
              type="month"
              value={props.settings.annualValidUntilYM ?? ""}
              onChange={(e) => props.onChange({ ...props.settings, annualValidUntilYM: e.target.value })}
            />
          </div>
        </div>

        <div className="sheetFoot">
          <button className="btn ghost" onClick={props.onClose}>취소</button>
          <button className="btn primary" onClick={props.onSave}>저장</button>
        </div>
      </div>
    </div>
  );
}
