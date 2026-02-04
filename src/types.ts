export type LeaveType = "none" | "annual" | "amHalf" | "pmHalf" | "quarter";

export type BulkRule = {
  start: string;
  end: string;
  breakEnabled: boolean;
  breakStart: string;
  breakEnd: string;
  preset?: string;
};

export type BulkPlan = {
  monThu: BulkRule;
  fri: BulkRule;
  mode: "onlyEmpty" | "overwrite";
  skipHolidays: boolean;
  skipWeekends: boolean;
};

export type DayEntry = {
  // ✅ preset 이름(예: "FULL_730", "HALF_AM" 등)
  preset?: string;

  // ISO date: YYYY-MM-DD
  date: string;

  mode: "preset" | "manual" | "leave";

  start?: string; // "07:30"
  end?: string; // "17:00"
  breakEnabled?: boolean;
  breakStart?: string; // "12:00"
  breakEnd?: string; // "13:00"

  manualHours?: number; // 0 ~ 24

  leaveType?: LeaveType;

  memo?: string;

  // computed hours for that day
  hours: number;

  updatedAt?: any;
};

