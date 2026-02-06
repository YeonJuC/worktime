import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { LeaveSettings } from "../types";


export function useLeaveSettings(uid: string) {
  const DEFAULT: LeaveSettings = { annualTotal: 15, annualValidUntilYM: "" };
  const [settings, setSettings] = useState<LeaveSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, `users/${uid}/settings/leave`);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as any;
        if (data?.settings) setSettings(data.settings as LeaveSettings);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  async function saveSettings(next?: LeaveSettings) {
    const ref = doc(db, `users/${uid}/settings/leave`);
    const s = next ?? settings;

    // Firestore undefined 방지
    const safe = {
      settings: {
        annualTotal: Number(s.annualTotal ?? 0),
        annualValidUntilYM: s.annualValidUntilYM ?? "",
      },
      updatedAt: Date.now(),
    };

    await setDoc(ref, safe, { merge: true });
  }

  return { settings, setSettings, saveSettings, loading };
}
