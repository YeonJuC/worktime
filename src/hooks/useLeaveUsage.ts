import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import type { DayEntry } from "../types";
import { leaveDeduct } from "../utils/time";

function monthsBetween(startYM: string, endYM: string) {
  const [sy, sm] = startYM.split("-").map(Number);
  const [ey, em] = endYM.split("-").map(Number);

  const out: string[] = [];
  let y = sy, m = sm;

  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m === 13) { m = 1; y += 1; }
  }
  return out;
}

export function useLeaveUsage(uid: string | null, startYM: string, endYM: string) {
  const months = useMemo(() => monthsBetween(startYM, endYM), [startYM, endYM]);

  const [annualUsed, setAnnualUsed] = useState(0);
  const [femaleUsedByYM, setFemaleUsedByYM] = useState<Record<string, number>>({}); // { "2026-02": 1 }

  useEffect(() => {
    if (!uid) {
      setAnnualUsed(0);
      setFemaleUsedByYM({});
      return;
    }

    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const annualMap: Record<string, number> = {}; // month -> deduct sum
    const femaleMap: Record<string, number> = {}; // month -> count

    const recompute = () => {
      const a = Object.values(annualMap).reduce((s, v) => s + v, 0);
      if (!cancelled) {
        setAnnualUsed(Math.round(a * 100) / 100);
        setFemaleUsedByYM({ ...femaleMap });
      }
    };

    months.forEach((ym) => {
      const colRef = collection(db, "users", uid, "months", ym, "days");
      const unsub = onSnapshot(
        colRef,
        (snap) => {
          let a = 0;
          let f = 0;

          snap.forEach((d) => {
            const e = d.data() as DayEntry;
            a += leaveDeduct(e.leaveType);

            if (e.leaveType === "female") f += 1;
          });

          annualMap[ym] = Math.round(a * 100) / 100;
          femaleMap[ym] = f;
          recompute();
        },
        () => {
          annualMap[ym] = 0;
          femaleMap[ym] = 0;
          recompute();
        }
      );

      unsubs.push(unsub);
    });

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, [uid, months]);

  return { annualUsed, femaleUsedByYM };
}
