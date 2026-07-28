export type LeaveType =
  | "none"
  | "annual"
  | "amHalf"
  | "pmHalf"
  | "quarter"
  | "female";

export type DayEntry = {
  date: string;

  // ✅ 근무 방식만 담당 (leave는 분리)
  mode: "preset" | "manual";

  // preset 사용 시
  preset?: string; // "0800-1700" or "CUSTOM" 등
  start?: string;
  end?: string;

  breakEnabled?: boolean;
  breakStart?: string;
  breakEnd?: string;

  // manual 사용 시
  manualHours?: number;

  // ✅ 연차/반차/여성휴가를 근무와 동시에 저장
  leaveType?: LeaveType; // default: "none"

  memo?: string;

  // ✅ 최종 합산 시간(근무+연차)
  hours: number;

  updatedAt?: number;
};

export type BulkRule = {
  preset?: string;
  start: string;
  end: string;
  breakEnabled?: boolean;
  breakStart?: string;
  breakEnd?: string;
};

export type BulkPlan = {
  mode: "overwrite" | "onlyEmpty";
  skipWeekends: boolean;
  skipHolidays: boolean;
  monThu: BulkRule;
  fri: BulkRule;
};

// src/types.ts

export type LeaveSettings = {
  /** 총 연차 개수 (예: 15, 15.5) */
  annualTotal: number;

  /** 연차 사용 가능 만료월 (YYYY-MM, 예: 2026-06) */
  annualValidUntilYM?: string;
};