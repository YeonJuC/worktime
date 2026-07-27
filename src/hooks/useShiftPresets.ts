import { useEffect, useMemo, useState } from "react";
import { SHIFT_PRESETS } from "../utils/time";

export type ShiftPreset = {
  key: string;
  label: string;
  start: string;
  end: string;
  breakDefault: boolean;
  breakStart?: string;
  breakEnd?: string;
  custom?: boolean;
};

const CUSTOM_KEY = "worktime.customShiftPresets.v1";
const HIDDEN_KEY = "worktime.hiddenShiftPresets.v1";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function useShiftPresets() {
  const [custom, setCustom] = useState<ShiftPreset[]>(() => read(CUSTOM_KEY, []));
  const [hidden, setHidden] = useState<string[]>(() => read(HIDDEN_KEY, []));

  useEffect(() => localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)), [custom]);
  useEffect(() => localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden)), [hidden]);

  const all = useMemo<ShiftPreset[]>(() => [
    ...SHIFT_PRESETS.map((x) => ({ ...x, custom: false })),
    ...custom,
  ], [custom]);

  const visible = useMemo(() => all.filter((x) => !hidden.includes(x.key)), [all, hidden]);

  function add(preset: Omit<ShiftPreset, "key" | "custom">) {
    const key = `custom-${Date.now()}`;
    setCustom((prev) => [...prev, { ...preset, key, custom: true }]);
    return key;
  }

  function remove(key: string) {
    setCustom((prev) => prev.filter((x) => x.key !== key));
    setHidden((prev) => prev.filter((x) => x !== key));
  }

  function hide(key: string) {
    setHidden((prev) => prev.includes(key) ? prev : [...prev, key]);
  }

  function restore() {
    setHidden([]);
  }

  return { all, visible, hidden, add, remove, hide, restore };
}
