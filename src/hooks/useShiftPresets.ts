import { useMemo, useState } from "react";
import { SHIFT_PRESETS, type ShiftPreset } from "../utils/time";

const CUSTOM_KEY = "worktime-custom-shift-presets-v1";
const HIDDEN_KEY = "worktime-hidden-default-shifts-v1";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useShiftPresets() {
  const [customPresets, setCustomPresets] = useState<ShiftPreset[]>(() =>
    readJSON<ShiftPreset[]>(CUSTOM_KEY, [])
  );
  const [hiddenDefaultKeys, setHiddenDefaultKeys] = useState<string[]>(() =>
    readJSON<string[]>(HIDDEN_KEY, [])
  );

  const visiblePresets = useMemo(
    () => [
      ...SHIFT_PRESETS.filter((preset) => !hiddenDefaultKeys.includes(preset.key)),
      ...customPresets,
    ],
    [customPresets, hiddenDefaultKeys]
  );

  function addCustomPreset(input: Omit<ShiftPreset, "key" | "isCustom">) {
    const same = customPresets.find(
      (preset) =>
        preset.start === input.start &&
        preset.end === input.end &&
        preset.breakDefault === input.breakDefault &&
        preset.breakStart === input.breakStart &&
        preset.breakEnd === input.breakEnd
    );
    if (same) return same;

    const nextPreset: ShiftPreset = {
      ...input,
      key: `custom-${Date.now()}`,
      isCustom: true,
    };
    const next = [...customPresets, nextPreset];
    setCustomPresets(next);
    persist(CUSTOM_KEY, next);
    return nextPreset;
  }

  function removeCustomPreset(key: string) {
    const next = customPresets.filter((preset) => preset.key !== key);
    setCustomPresets(next);
    persist(CUSTOM_KEY, next);
  }

  function hideDefaultPreset(key: string) {
    if (hiddenDefaultKeys.includes(key)) return;
    const next = [...hiddenDefaultKeys, key];
    setHiddenDefaultKeys(next);
    persist(HIDDEN_KEY, next);
  }

  function restoreDefaultPresets() {
    setHiddenDefaultKeys([]);
    persist(HIDDEN_KEY, []);
  }

  return {
    visiblePresets,
    customPresets,
    hiddenDefaultKeys,
    addCustomPreset,
    removeCustomPreset,
    hideDefaultPreset,
    restoreDefaultPresets,
  };
}
