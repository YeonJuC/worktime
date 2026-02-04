export default function SummaryBar(props: {
  requiredHours: number;
  actualHours: number;
  bizDays: number;
  holidays: number;
}) {
  const diff = props.actualHours - props.requiredHours;
  return (
    <div className="summary glass">
      <div className="summaryRow">
        <div className="k">필수 근무</div>
        <div className="v">
          <b>{props.requiredHours.toFixed(0)}h</b>
          <span className="tiny muted">
            ({props.bizDays}일 × 8h, 공휴일 {props.holidays}일 제외)
          </span>
        </div>
      </div>
      <div className="summaryRow">
        <div className="k">내 입력 합계</div>
        <div className="v">
          <b>{props.actualHours.toFixed(2)}h</b>
          <span className={diff === 0 ? "badge ok" : diff > 0 ? "badge plus" : "badge minus"}>
            {diff === 0 ? "정확" : diff > 0 ? `+${diff.toFixed(2)}h` : `${diff.toFixed(2)}h`}
          </span>
        </div>
      </div>
    </div>
  );
}
