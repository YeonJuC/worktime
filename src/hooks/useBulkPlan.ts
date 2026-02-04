import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { BulkPlan } from "../types";

const DEFAULT_PLAN: BulkPlan = {
  monThu: { 
    start:"07:30", 
    end:"17:00", 
    breakEnabled:true, 
    breakStart:"12:00", 
    breakEnd:"13:00" 
  },
  fri: {
    start: "08:00",
    end: "12:00",
    breakEnabled: false,
    breakStart: "",
    breakEnd: "",
    preset: "HALF_AM",
  },
  mode: "onlyEmpty",
  skipHolidays: true,
  skipWeekends: true,
};

export function useBulkPlan(uid: string) {
  const [plan, setPlan] = useState<BulkPlan>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, `users/${uid}/settings/bulkPlan`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as any;
        if (data?.plan) setPlan(data.plan as BulkPlan);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  async function savePlan(next?: BulkPlan) {
    const ref = doc(db, `users/${uid}/settings/bulkPlan`);
    const p = next ?? plan;
    await setDoc(ref, { plan: p, updatedAt: Date.now() }, { merge: true });
  }

  async function resetPlan() {
    setPlan(DEFAULT_PLAN);
    await savePlan(DEFAULT_PLAN);
  }

  return { plan, setPlan, savePlan, resetPlan, loading };
}
