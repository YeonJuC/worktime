import type { DayEntry, LeaveType } from "../types";

export const SHIFT_PRESETS = [
  {
    key: "0730-1700",
    label: "07:30–17:00",
    start: "07:30",
    end: "17:00",
    breakDefault: true,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    key: "0800-1700",
    label: "08:00–17:00",
    start: "08:00",
    end: "17:00",
    breakDefault: true,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  { key: "0800-1200", label: "08:00–12:00", start: "08:00", end: "12:00", breakDefault: false },
  // ✅ 예외: 07:30–12:30 점심 11:30–12:00 (0.5h)
  { key: "0730-1230", label: "07:30–12:30", start: "07:30", end: "12:30", breakDefault: true, breakStart: "11:30", breakEnd: "12:00" },
] as const;

export const BREAK_PRESETS = [
  { key: "1200-1300", label: "12:00–13:00", start: "12:00", end: "13:00" },
  { key: "1130-1200", label: "11:30–12:00", start: "11:30", end: "12:00" },
] as const;

// ✅ hours: 합산할 시간, deduct: 연차에서 차감할 개수
export const LEAVE_OPTIONS: { key: LeaveType; label: string; hours: number; deduct: number }[] = [
  { key: "none", label: "없음", hours: 0, deduct: 0 },
  { key: "annual", label: "연차(8h)", hours: 8, deduct: 1 },
  { key: "amHalf", label: "오전반차(4h)", hours: 4, deduct: 0.5 },
  { key: "pmHalf", label: "오후반차(4h)", hours: 4, deduct: 0.5 },
  { key: "quarter", label: "반반차(2h)", hours: 2, deduct: 0.25 },
  // ✅ 여성휴가: “월 1회 제한”만 적용, 연차 차감은 0 (원하면 1로 변경 가능)
  { key: "female", label: "여성휴가(8h)", hours: 8, deduct: 0 },
];

export function hhmmToMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  return h * 60 + m;
}

export function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function computeHoursFromTimes(
  start: string,
  end: string,
  breakEnabled: boolean,
  breakStart: string,
  breakEnd: string
) {
  const s = hhmmToMin(start);
  const e = hhmmToMin(end);
  let mins = e - s;
  if (mins < 0) mins += 24 * 60;

  if (breakEnabled) {
    const bs = hhmmToMin(breakStart);
    const be = hhmmToMin(breakEnd);
    let b = be - bs;
    if (b < 0) b += 24 * 60;

    // ✅ break가 근무 시간과 겹치는 부분만 차감
    const overlap = Math.max(0, Math.min(e, be) - Math.max(s, bs));
    mins -= overlap > 0 ? overlap : b;
  }

  return round2(clamp(mins / 60, 0, 24));
}

export function leaveHours(leaveType?: LeaveType) {
  const t = (leaveType ?? "none") as LeaveType;
  return LEAVE_OPTIONS.find((x) => x.key === t)?.hours ?? 0;
}

export function leaveDeduct(leaveType?: LeaveType) {
  const t = (leaveType ?? "none") as LeaveType;
  return LEAVE_OPTIONS.find((x) => x.key === t)?.deduct ?? 0;
}

export function computeWorkHours(entry: Omit<DayEntry, "hours">): number {
  if (entry.mode === "manual") return round2(clamp(entry.manualHours ?? 0, 0, 24));
  return computeHoursFromTimes(
    entry.start ?? "08:00",
    entry.end ?? "17:00",
    entry.breakEnabled ?? true,
    entry.breakStart ?? "12:00",
    entry.breakEnd ?? "13:00"
  );
}

// ✅ 최종 합산(근무 + 연차/반차/여성휴가)
// - leaveType은 mode와 무관하게 "추가로 합산"됨
export function computeHours(entry: Omit<DayEntry, "hours">): number {
  const work = computeWorkHours(entry);
  const lv = leaveHours(entry.leaveType);
  return round2(clamp(work + lv, 0, 24));
}

/**
 * ✅ 캘린더 셀 "근무 구간" 표시용
 * - 근무시간이 있으면 "start-end"
 * - leaveType은 여기서 표시하지 않음(태그로 따로 보여줄 예정)
 */
export function formatWorkRange(entry?: DayEntry | null): string {
  if (!entry) return "";
  if (entry.start && entry.end) return `${entry.start}-${entry.end}`;
  return "";
}

export function leaveLabel(leaveType?: LeaveType) {
  switch (leaveType) {
    case "annual": return "연차";
    case "amHalf": return "오전반차";
    case "pmHalf": return "오후반차";
    case "quarter": return "반반차";
    case "female": return "여성휴가";
    default: return "";
  }
}
