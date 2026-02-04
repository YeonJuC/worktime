import type { DayEntry, LeaveType } from "../types";

export const SHIFT_PRESETS = [
  { key: "0730-1700", label: "07:30–17:00", start: "07:30", end: "17:00", breakDefault: true, breakStart: "12:00", breakEnd: "13:00" },
  { key: "0800-1700", label: "08:00–17:00", start: "08:00", end: "17:00", breakDefault: true, breakStart: "12:00", breakEnd: "13:00" },
  { key: "0800-1200", label: "08:00–12:00", start: "08:00", end: "12:00", breakDefault: false },
  // ✅ 예외 규칙: 07:30–12:30이면 점심시간 11:30–12:00 (0.5h)
  { key: "0730-1230", label: "07:30–12:30", start: "07:30", end: "12:30", breakDefault: true, breakStart: "11:30", breakEnd: "12:00" },
] as const;

export const BREAK_PRESETS = [
  { key: "1200-1300", label: "12:00–13:00", start: "12:00", end: "13:00" },
  { key: "1130-1200", label: "11:30–12:00", start: "11:30", end: "12:00" },
] as const;

export const LEAVE_OPTIONS: { key: LeaveType; label: string; hours: number }[] = [
  { key: "annual", label: "연차(8h)", hours: 8 },
  { key: "amHalf", label: "오전반차(4h)", hours: 4 },
  { key: "pmHalf", label: "오후반차(4h)", hours: 4 },
  { key: "quarter", label: "반반차(2h)", hours: 2 },
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
  if (mins < 0) mins += 24 * 60; // overnight just in case
  if (breakEnabled) {
    const bs = hhmmToMin(breakStart);
    const be = hhmmToMin(breakEnd);
    let b = be - bs;
    if (b < 0) b += 24 * 60;
    // 단순 차감(복잡한 overlap 계산은 필요 없게 UX에서 break는 근무구간 안에 두는 걸 전제로)
    mins -= b;
  }
  return round2(clamp(mins / 60, 0, 24));
}

export function computeHours(entry: Omit<DayEntry, "hours">): number {
  if (entry.mode === "manual") return round2(clamp(entry.manualHours ?? 0, 0, 24));
  if (entry.mode === "leave") {
    const t = entry.leaveType ?? "annual";
    const opt = LEAVE_OPTIONS.find((x) => x.key === t);
    return opt?.hours ?? 0;
  }
  // preset
  return computeHoursFromTimes(
    entry.start ?? "08:00",
    entry.end ?? "17:00",
    entry.breakEnabled ?? true,
    entry.breakStart ?? "12:00",
    entry.breakEnd ?? "13:00"
  );
}

/** ✅ 캘린더 셀에 "07:30-17:00" 같은 근무구간 표시용 */
export function formatWorkRange(entry?: DayEntry | null): string {
  if (!entry) return "";

  if (entry.mode === "leave") {
    switch (entry.leaveType) {
      case "annual":
        return "연차";
      case "amHalf":
        return "오전반차";
      case "pmHalf":
        return "오후반차";
      case "quarter":
        return "반반차";
      default:
        return "연차";
    }
  }

  if (entry.mode !== "preset") return "";
  if (entry.start && entry.end) return `${entry.start}-${entry.end}`;
  return "";
}
