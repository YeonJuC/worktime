# 근무시간 캘린더 (React + TS + Firebase)

## 기능 요약
- 월별 캘린더에서 날짜별 근무시간 입력
- 프리셋 근무시간(07:30–17:00 / 08:00–17:00 / 08:00–12:00 / 07:30–12:30)
- 점심시간 프리셋(12:00–13:00) + 직접 수정
- 연차/오전반차/오후반차/반반차 선택
- 공휴일은 빨간색(한국 KR) + 필수 근무시간 계산에서 제외
- Google 로그인
- 사용자별 Firestore 저장(새로고침/다른 기기에서도 유지)
- 월별 필수 근무시간(평일×8h, 공휴일 제외) vs 내 입력 합계 비교

공휴일 데이터는 **Nager.Date PublicHolidays API** 사용(무료/CORS 지원).  
예: `GET /api/v3/PublicHolidays/{Year}/{CountryCode}`

---

## 1) 설치 & 실행
```bash
npm install
cp .env.example .env.local
# .env.local에 Firebase 값 채우기
npm run dev
```

---

## 2) Firebase 연결 방법 (필수)
### (1) Firebase 프로젝트 생성
1. Firebase Console → 프로젝트 추가
2. 프로젝트 설정 → **앱 추가(웹)** → SDK 설정 값 복사

### (2) Authentication (Google) 켜기
1. Authentication → 로그인 방법 → **Google 사용 설정**
2. 승인된 도메인:
   - 로컬: `localhost`
   - 배포 후: `YOUR_GITHUB_ID.github.io`

### (3) Firestore 만들기
1. Firestore Database → 데이터베이스 만들기(테스트 모드 말고도 됨)
2. 보안 규칙을 아래처럼 설정(또는 `firebase.rules` 복붙)

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### (4) Vite 환경변수 넣기
`.env.local` 예시
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## 3) 배포 (GitHub Pages)
이 프로젝트는 `base: "./"`라서 GitHub Pages에서 바로 뜸.

### 방법 A: 수동 배포(가장 단순)
1. `npm run build`
2. `dist` 폴더가 생성됨
3. `dist` 내용을 GitHub Pages가 보는 브랜치/폴더에 올리기  
   - 가장 흔한 방법: `gh-pages` 브랜치에 dist를 push

### 방법 B: GitHub Actions로 자동 배포
아래 파일을 `.github/workflows/deploy.yml`로 만들면 됨.

```yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ "main" ]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

그리고 GitHub Repo → Settings → Pages에서
- Source: GitHub Actions 로 설정.

**중요:** `.env.local` 값은 깃에 올리면 안 됨.  
Repo → Settings → Secrets and variables → Actions에 위 6개를 Secret으로 등록.

---

## 4) 데이터 구조(참고)
- `users/{uid}/months/{YYYY-MM}/days/{YYYY-MM-DD}` 문서에 날짜별 입력 저장
- hours(계산된 시간)까지 같이 저장해서 UI가 빠름

---

## 5) 커스터마이즈 포인트
- 국가 변경: `useHolidays(ym, "KR")`의 KR을 바꾸면 됨
- 필수 근무시간(주5일 8h): `requiredHours = bizDays * 8` 변경 가능

## 추가된 기능
- 기본 근무시간 옵션에 07:30–18:00, 07:30–15:00 추가
- 현재 시작/종료/점심시간을 사용자 빠른 옵션으로 저장
- 사용자 옵션 삭제, 기본 옵션 숨김 및 복원
- 오늘 근무시간이 등록된 경우 앱 실행 시 안내 팝업
- 브라우저 알림 권한이 허용된 경우 시스템 알림 표시

> 시스템 알림은 앱을 열어 오늘 데이터가 로드될 때 표시됩니다. 앱을 완전히 닫은 상태에서 예약 발송하려면 별도의 푸시 서버가 필요합니다.

## 2026-07-27 모바일/알림 개선
- iPhone 화면 글씨 크기 축소 및 390~430px 반응형 최적화
- 캘린더 셀 높이, 줄 간격, 근무시간/연차 표시 크기 조정
- 오늘 근무시간 팝업을 사용자+날짜 기준 하루 1회만 표시(localStorage)
- 시스템 알림 사용/해제 및 알림 시간 직접 설정
- 설정 시간 이후 앱이 열려 있거나 다시 활성화될 때 하루 1회 알림
- 기존 빠른 옵션, 공휴일, 연차, 일괄등록 기능 유지

### 빌드
첨부된 기존 node_modules는 Windows용이므로 다른 운영체제에서는 삭제 후 다시 설치하세요.
```bash
rm -rf node_modules
npm install
npm run build
```

## 회사 지정 휴무일
- 날짜를 선택한 뒤 회사 휴무일로 지정할 수 있습니다.
- 노사상생의 날, 창립기념일 등 이름을 직접 입력합니다.
- 지정된 날짜는 공휴일처럼 빨간색으로 표시되며 필수 근무시간 계산 및 일괄등록에서 제외됩니다.
