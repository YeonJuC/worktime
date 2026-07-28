import type { DayEntry, LeaveType } from "../types";

export type ShiftPreset = {
  key: string;
  label: string;
  start: string;
  end: string;
  breakDefault: boolean;
  breakStart?: string;
  breakEnd?: string;
  isCustom?: boolean;
};

export const SHIFT_PRESETS: ShiftPreset[] = [
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
  {
    key: "0800-1200",
    label: "08:00–12:00",
    start: "08:00",
    end: "12:00",
    breakDefault: false,
  },
  {
    key: "0730-1230",
    label: "07:30–12:30",
    start: "07:30",
    end: "12:30",
    breakDefault: true,
    breakStart: "11:30",
    breakEnd: "12:00",
  },
  {
    key: "0730-1800",
    label: "07:30–18:00",
    start: "07:30",
    end: "18:00",
    breakDefault: true,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
  {
    key: "0730-1500",
    label: "07:30–15:00",
    start: "07:30",
    end: "15:00",
    breakDefault: true,
    breakStart: "12:00",
    breakEnd: "13:00",
  },
];

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

/**
 * 그날 인정되는 근무시간입니다.
 *
 * 휴가는 원래 근무시간에 추가하거나 차감하지 않습니다.
 * - 4시간 근무일에 오전반차를 사용하면 인정시간은 4시간
 * - 9시간 근무일에 반반차를 사용하면 인정시간은 9시간
 *
 * 휴가 유형은 캘린더에 보여 줄 실제 출퇴근 구간만 조정합니다.
 */
export function effectiveWorkHours(entry: Omit<DayEntry, "hours">): number {
  return computeWorkHours(entry);
}

export function computeHours(entry: Omit<DayEntry, "hours">): number {
  return effectiveWorkHours(entry);
}

function minToHHMM(totalMinutes: number) {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function workMinutesBetween(
  startMin: number,
  endMin: number,
  breakEnabled: boolean,
  breakStartMin: number,
  breakEndMin: number
) {
  let total = Math.max(0, endMin - startMin);
  if (!breakEnabled) return total;
  const overlap = Math.max(0, Math.min(endMin, breakEndMin) - Math.max(startMin, breakStartMin));
  return Math.max(0, total - overlap);
}

function findStartForWorkMinutes(
  originalStart: number,
  end: number,
  targetWorkMinutes: number,
  breakEnabled: boolean,
  breakStart: number,
  breakEnd: number
) {
  for (let candidate = originalStart; candidate <= end; candidate += 1) {
    if (workMinutesBetween(candidate, end, breakEnabled, breakStart, breakEnd) <= targetWorkMinutes) {
      return candidate;
    }
  }
  return end;
}

function findEndForWorkMinutes(
  start: number,
  originalEnd: number,
  targetWorkMinutes: number,
  breakEnabled: boolean,
  breakStart: number,
  breakEnd: number
) {
  let result = start;
  for (let candidate = start; candidate <= originalEnd; candidate += 1) {
    if (workMinutesBetween(start, candidate, breakEnabled, breakStart, breakEnd) <= targetWorkMinutes) {
      result = candidate;
    } else {
      break;
    }
  }
  return result;
}

/** 캘린더 셀에 보이는 휴가 적용 후 실제 근무구간 */
export function formatWorkRange(entry?: DayEntry | null): string {
  if (!entry || !entry.start || !entry.end || entry.mode === "manual") return "";

  const leaveType = entry.leaveType ?? "none";
  if (leaveType === "annual" || leaveType === "female") return "";
  if (leaveType === "none") return `${entry.start}-${entry.end}`;

  const rawWorkHours = computeWorkHours(entry);
  const targetWorkHours = Math.max(0, rawWorkHours - leaveHours(leaveType));
  if (targetWorkHours <= 0) return "";

  const targetMinutes = Math.round(targetWorkHours * 60);
  const startMin = hhmmToMin(entry.start);
  let endMin = hhmmToMin(entry.end);
  if (endMin < startMin) endMin += 24 * 60;

  const breakEnabled = entry.breakEnabled ?? true;
  let breakStartMin = hhmmToMin(entry.breakStart ?? "12:00");
  let breakEndMin = hhmmToMin(entry.breakEnd ?? "13:00");
  if (breakStartMin < startMin) breakStartMin += 24 * 60;
  if (breakEndMin < breakStartMin) breakEndMin += 24 * 60;

  let displayStart = startMin;
  let displayEnd = endMin;

  if (leaveType === "amHalf") {
    displayStart = findStartForWorkMinutes(
      startMin, endMin, targetMinutes, breakEnabled, breakStartMin, breakEndMin
    );
  } else {
    // 오후반차와 반반차는 종료 시각을 앞당겨 표시
    displayEnd = findEndForWorkMinutes(
      startMin, endMin, targetMinutes, breakEnabled, breakStartMin, breakEndMin
    );
  }

  if (displayStart >= displayEnd) return "";
  return `${minToHHMM(displayStart)}-${minToHHMM(displayEnd)}`;
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
