export default function MonthHeader(props: {
  ymLabel: string;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="monthHeader">
      <button className="iconBtn" onClick={props.onPrev} aria-label="이전 달">
        <span className="chev">‹</span>
      </button>
      <div className="monthTitle">{props.ymLabel}</div>
      <button className="iconBtn" onClick={props.onNext} aria-label="다음 달">
        <span className="chev">›</span>
      </button>
    </div>
  );
}
