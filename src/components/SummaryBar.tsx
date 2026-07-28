export default function SummaryBar(props: {
  requiredHours: number;
  actualHours: number;
  bizDays: number;
  holidays: number;
}) {
  const diff = props.actualHours - props.requiredHours;
  return (
    <div className="dashboardStatsGrid" aria-label="월 근무시간 요약">
      <section className="dashboardStatCard glass">
        <div className="dashboardStatLabel">필수 근무</div>
        <strong className="dashboardStatValue">{props.requiredHours.toFixed(0)}h</strong>
        <div className="dashboardStatMeta">
          {props.bizDays}일 × 8h · 공휴일 {props.holidays}일 제외
        </div>
      </section>

      <section className="dashboardStatCard glass">
        <div className="dashboardStatLabel">내 입력 합계</div>
        <strong className="dashboardStatValue">{props.actualHours.toFixed(2)}h</strong>
        <span className={diff === 0 ? "dashboardDiffBadge ok" : diff > 0 ? "dashboardDiffBadge plus" : "dashboardDiffBadge minus"}>
          {diff === 0 ? "정확" : diff > 0 ? `+${diff.toFixed(2)}h` : `${diff.toFixed(2)}h`}
        </span>
      </section>
    </div>
  );
}
