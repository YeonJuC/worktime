const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendDailyWorktimeNotifications = onSchedule(
  { schedule: "every 1 minutes", timeZone: "Asia/Seoul", region: "asia-northeast3" },
  async () => {
    const db = getFirestore();
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(now).reduce((a, p) => ({ ...a, [p.type]: p.value }), {});
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const time = `${parts.hour}:${parts.minute}`;
    const ym = `${parts.year}-${parts.month}`;

    const settingsSnap = await db.collectionGroup("settings")
      .where("enabled", "==", true)
      .get();

    await Promise.all(settingsSnap.docs.map(async (settingsDoc) => {
      if (settingsDoc.id !== "notification") return;
      const data = settingsDoc.data();
      if (data.time !== time || !data.token || data.lastSentDate === date) return;
      const userRef = settingsDoc.ref.parent.parent;
      if (!userRef) return;
      const daySnap = await userRef.collection("months").doc(ym).collection("days").doc(date).get();
      const day = daySnap.data();
      if (!day?.start || !day?.end || Number(day?.hours || 0) <= 0) return;

      try {
        await getMessaging().send({
          token: data.token,
          notification: {
            title: "오늘 근무시간 안내",
            body: `오늘 근무시간은 ${day.start}부터 ${day.end}까지입니다.`,
          },
          data: { tag: `worktime-${date}`, url: "/" },
          webpush: { fcmOptions: { link: "/" } },
        });
        await settingsDoc.ref.set({ lastSentDate: date, lastSentAt: new Date().toISOString() }, { merge: true });
      } catch (error) {
        console.error("notification send failed", settingsDoc.ref.path, error);
      }
    }));
  }
);
