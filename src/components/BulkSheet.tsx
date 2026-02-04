import type { BulkPlan } from "../types";

export default function BulkSheet(props: {
  open: boolean;
  plan: BulkPlan;
  onChange: (p: BulkPlan) => void;
  onClose: () => void;
  onApply: () => void;
  onSavePreset: () => void;     // ✅ 추가
  onResetPreset: () => void;    // ✅ 추가
}) {
  const { open, plan, onChange } = props;
  if (!open) return null;

  const set = (patch: Partial<BulkPlan>) => onChange({ ...plan, ...patch });

  const setMonThu = (patch: Partial<BulkPlan["monThu"]>) =>
    onChange({ ...plan, monThu: { ...plan.monThu, ...patch } });

  const setFri = (patch: Partial<BulkPlan["fri"]>) =>
    onChange({ ...plan, fri: { ...plan.fri, ...patch } });

  return (
    <div className="sheetOverlay" onClick={props.onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheetTitle">일괄 등록 설정</div>

        <section className="bulkSection">
          <div className="bulkLabel">월~목</div>
          <div className="row">
            <input value={plan.monThu.start} onChange={(e) => setMonThu({ start: e.target.value })} placeholder="07:30" />
            <span>~</span>
            <input value={plan.monThu.end} onChange={(e) => setMonThu({ end: e.target.value })} placeholder="17:00" />
          </div>
          <label className="chk">
            <input
              type="checkbox"
              checked={plan.monThu.breakEnabled}
              onChange={(e) => setMonThu({ breakEnabled: e.target.checked })}
            />
            점심
          </label>
          {plan.monThu.breakEnabled && (
            <div className="row">
              <input value={plan.monThu.breakStart} onChange={(e) => setMonThu({ breakStart: e.target.value })} placeholder="12:00" />
              <span>~</span>
              <input value={plan.monThu.breakEnd} onChange={(e) => setMonThu({ breakEnd: e.target.value })} placeholder="13:00" />
            </div>
          )}
        </section>

        <section className="bulkSection">
          <div className="bulkLabel">금요일</div>
          <div className="row">
            <input value={plan.fri.start} onChange={(e) => setFri({ start: e.target.value })} placeholder="08:00" />
            <span>~</span>
            <input value={plan.fri.end} onChange={(e) => setFri({ end: e.target.value })} placeholder="12:00" />
          </div>
          <label className="chk">
            <input
              type="checkbox"
              checked={plan.fri.breakEnabled}
              onChange={(e) => setFri({ breakEnabled: e.target.checked })}
            />
            점심
          </label>
          {plan.fri.breakEnabled && (
            <div className="row">
              <input value={plan.fri.breakStart} onChange={(e) => setFri({ breakStart: e.target.value })} placeholder="12:00" />
              <span>~</span>
              <input value={plan.fri.breakEnd} onChange={(e) => setFri({ breakEnd: e.target.value })} placeholder="13:00" />
            </div>
          )}
        </section>

        <section className="bulkSection">
          <div className="bulkLabel">적용 옵션</div>
          <div className="row2">
            <button
              className={plan.mode === "onlyEmpty" ? "pill on" : "pill"}
              onClick={() => set({ mode: "onlyEmpty" })}
            >
              빈 날만
            </button>
            <button
              className={plan.mode === "overwrite" ? "pill on" : "pill"}
              onClick={() => set({ mode: "overwrite" })}
            >
              덮어쓰기
            </button>
          </div>

          <label className="chk">
            <input type="checkbox" checked={plan.skipHolidays} onChange={(e) => set({ skipHolidays: e.target.checked })} />
            공휴일 제외
          </label>
          <label className="chk">
            <input type="checkbox" checked={plan.skipWeekends} onChange={(e) => set({ skipWeekends: e.target.checked })} />
            주말 제외
          </label>
        </section>

        <div className="sheetActions">
          <button className="btn ghost" onClick={props.onResetPreset}>초기화</button>
          <button className="btn ghost" onClick={props.onSavePreset}>내 설정 저장</button>
          <button className="btn primary" onClick={props.onApply}>적용</button>
        </div>
      </div>
    </div>
  );
}
