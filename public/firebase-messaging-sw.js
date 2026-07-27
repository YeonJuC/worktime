/* Firebase background messaging service worker.
   Replace the firebaseConfig values below with the same public web-app config used by .env.local. */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD7Tscr32jgY6rKzCf0K9nHVbP60tpdSDk",
  authDomain: "worktime-19b76.firebaseapp.com",
  projectId: "worktime-19b76",
  storageBucket: "worktime-19b76.firebasestorage.app",
  messagingSenderId: "2335103077",
  appId: "1:2335103077:web:efeb7290b51471cb0a0e8c"
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "오늘 근무시간 안내";
  const options = {
    body: payload.notification?.body || "오늘 근무시간을 확인해주세요.",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: payload.data?.tag || "worktime-daily",
    data: { url: payload.data?.url || "./" }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "./"));
});
