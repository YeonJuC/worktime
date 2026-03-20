import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { Holiday } from "./useHolidays";

export type ManualHoliday = Holiday & {
  isManual: true;
};

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: any = { ...obj };
  Object.keys(out).forEach((k) => {
    if (out[k] === undefined) delete out[k];
  });
  return out;
}

export function useManualHolidays(uid: string | null, ym: string) {
  const [map, setMap] = useState<Record<string, ManualHoliday>>({});

  const monthCol = useMemo(() => {
    if (!uid) return null;
    return collection(db, "users", uid, "months", ym, "manualHolidays");
  }, [uid, ym]);

  useEffect(() => {
    if (!monthCol) {
      setMap({});
      return;
    }

    const unsub = onSnapshot(
      monthCol,
      (snap) => {
        const next: Record<string, ManualHoliday> = {};
        snap.forEach((d) => {
          const data = d.data() as ManualHoliday;
          if (!data?.date) return;
          next[data.date] = {
            date: data.date,
            localName: data.localName || "수동 휴일",
            substitute: Boolean(data.substitute),
            isManual: true,
          };
        });
        setMap(next);
      },
      () => setMap({})
    );

    return () => unsub();
  }, [monthCol]);

  async function upsertManualHoliday(input: { date: string; localName: string; substitute?: boolean }) {
    if (!uid) return;
    const ref = doc(db, "users", uid, "months", ym, "manualHolidays", input.date);
    await setDoc(
      ref,
      stripUndefined({
        date: input.date,
        localName: input.localName.trim() || "수동 휴일",
        substitute: Boolean(input.substitute),
        isManual: true,
        updatedAt: Date.now(),
      }),
      { merge: true }
    );
  }

  async function removeManualHoliday(date: string) {
    if (!uid) return;
    const ref = doc(db, "users", uid, "months", ym, "manualHolidays", date);
    await deleteDoc(ref);
  }

  return { manualHolidays: map, upsertManualHoliday, removeManualHoliday };
}
