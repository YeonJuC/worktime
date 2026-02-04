export type LeaveType = "none" | "annual" | "amHalf" | "pmHalf" | "quarter";

export type DayEntry = {
  // ISO date: YYYY-MM-DD
  date: string;

  // one of:
  // - preset (start/end + break)
  // - manual (manualHours)
  // - leave (leaveType)
  mode: "preset" | "manual" | "leave";

  start?: string; // "07:30"
  end?: string; // "17:00"
  breakEnabled?: boolean;
  breakStart?: string; // "12:00"
  breakEnd?: string; // "13:00"

  manualHours?: number; // 0 ~ 24

  leaveType?: LeaveType;

  // optional memo for the day
  memo?: string;

  // computed hours for that day
  hours: number;

  updatedAt?: any;
};
