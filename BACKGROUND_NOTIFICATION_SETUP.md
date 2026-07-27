# 백그라운드 시스템 알림 배포 설정

이번 버전은 앱을 닫아도 지정한 시간에 알림을 보내도록 Firebase Cloud Messaging과 Cloud Functions 예약 발송 구조를 포함합니다.

## 1. Web Push 인증서 설정
1. Firebase 콘솔 → 프로젝트 설정 → Cloud Messaging으로 이동합니다.
2. Web Push 인증서에서 키 쌍을 생성합니다.
3. 공개 키를 `.env.local`에 추가합니다.

```env
VITE_FIREBASE_VAPID_KEY=발급받은_공개키
```

## 2. 서비스 워커 설정 확인
`public/firebase-messaging-sw.js` 안의 firebaseConfig는 현재 `.env.local` 값을 기준으로 채워져 있습니다. Firebase 프로젝트를 바꾸면 이 파일의 설정도 동일하게 바꿔야 합니다.

## 3. Functions 배포
Firebase CLI 로그인 후 프로젝트 루트에서 실행합니다.

```bash
npm install
cd functions
npm install
cd ..
firebase use --add
firebase deploy --only firestore:rules,functions
npm run build
```

이후 기존 방식대로 `dist`를 GitHub Pages에 배포합니다.

## 4. 아이폰에서 사용
1. iOS 16.4 이상에서 Safari로 사이트를 엽니다.
2. 공유 → 홈 화면에 추가를 누릅니다.
3. 홈 화면에 설치된 앱을 실행합니다.
4. 근무시간 알림 → 설정 → 시스템 알림을 켭니다.
5. 알림 권한을 허용하고 시간을 저장합니다.

Safari 탭으로만 열어 둔 상태가 아니라 홈 화면에 설치된 웹앱에서 설정해야 백그라운드 푸시가 작동합니다.

## 참고
Cloud Functions의 예약 실행과 Cloud Messaging 사용을 위해 Firebase 프로젝트의 결제 플랜 설정이 필요할 수 있습니다.
