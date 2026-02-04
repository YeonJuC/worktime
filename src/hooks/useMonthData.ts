import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { DayEntry } from "../types";

export function useMonthData(uid: string | null, ym: string) {
  const [byDate, setByDate] = useState<Record<string, DayEntry>>({});
  const [loading, setLoading] = useState(true);

  const monthCol = useMemo(() => {
    if (!uid) return null;
    return collection(db, "users", uid, "months", ym, "days");
  }, [uid, ym]);

  useEffect(() => {
    if (!monthCol) {
      setByDate({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      monthCol,
      (snap) => {
        const next: Record<string, DayEntry> = {};
        snap.forEach((d) => {
          const data = d.data() as DayEntry;
          next[data.date] = data;
        });
        setByDate(next);
        setLoading(false);
      },
      () => {
        setByDate({});
        setLoading(false);
      }
    );
    return () => unsub();
  }, [monthCol]);

  async function upsert(entry: DayEntry) {
    if (!uid) return;
    const ref = doc(db, "users", uid, "months", ym, "days", entry.date);
    await setDoc(ref, entry, { merge: true });
  }

  return { byDate, loading, upsert };
}
