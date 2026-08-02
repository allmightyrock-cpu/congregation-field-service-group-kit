# 설치 안내 가이드

이 문서는 처음 설치하는 회중이 `Congregation Field Service Group Kit`를 자기 환경에 배포하는 순서입니다.

## 1. 준비물

- Node.js 20 이상
- npm
- Firebase 계정
- Cloudflare 계정
- GitHub 저장소
- Firebase 서비스 계정 JSON 파일

설치 확인:

```powershell
node -v
npm -v
```

## 2. Firebase 프로젝트 만들기

1. Firebase 콘솔에서 새 프로젝트를 만듭니다.
2. Firestore Database를 생성합니다.
3. Authentication을 사용할 경우, Firebase Authentication도 활성화합니다.
4. 프로젝트 설정에서 웹 앱을 추가하고 Firebase SDK 설정값을 확인합니다.
5. 프로젝트 설정 > 서비스 계정에서 새 비공개 키 JSON을 내려받습니다.

주의: 서비스 계정 JSON은 절대로 GitHub에 올리지 마세요.

## 3. Firestore 규칙 배포

Firebase CLI가 없다면 설치합니다.

```powershell
npm install -g firebase-tools
firebase login
```

배포본 폴더에서 실행합니다.

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
```

## 4. 웹 앱 환경값 입력

`web/.env.example`을 `web/.env`로 복사합니다.

```powershell
Copy-Item -LiteralPath web/.env.example -Destination web/.env
```

`web/.env`에 Firebase 웹 앱 설정값과 Worker 주소를 입력합니다.

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_WORKER_URL=https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev
```

## 5. Worker 설정

`worker/wrangler.toml`을 열어 `FIREBASE_PROJECT_ID`를 자기 Firebase 프로젝트 ID로 바꿉니다.

```toml
[vars]
FIREBASE_PROJECT_ID = "YOUR_FIREBASE_PROJECT_ID"
TOKEN_MODE = "signed"
```

Worker에서 사용할 Firebase 서비스 계정 JSON을 secret으로 넣습니다.

```powershell
cd worker
npm install
npx wrangler login
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

명령이 입력을 기다리면 서비스 계정 JSON 파일 전체 내용을 붙여넣습니다.

## 6. 초기 데이터 작성

`templates/` 폴더의 CSV 파일을 자기 회중 자료로 수정합니다.

- `groups.csv`: 집단 이름, 집단 감독자, 보조자
- `members.csv`: 집단별 성원 명단
- `roles.csv`: 관리자 역할과 PIN
- `notices.csv`: 광고·안내 메뉴

자세한 형식은 [docs/초기데이터_작성법.md](docs/초기데이터_작성법.md)를 참고하세요.

## 7. Firestore 초기 데이터 넣기

배포본 루트 폴더로 돌아와 실행합니다.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\firebase-service-account.json"
$env:FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
$env:CONG_NAME="○○회중"
node scripts/setup-from-csv.mjs
```

완료 메시지에 groups, members, roles, notices 개수가 표시되면 성공입니다.

## 8. Worker 배포

```powershell
cd worker
npx wrangler deploy
```

배포 후 표시되는 Worker URL을 복사해서 `web/.env`의 `VITE_WORKER_URL`에 넣습니다.

## 9. 웹 앱 빌드와 배포

```powershell
cd web
npm install
npm run build
npx wrangler pages deploy dist --project-name congregation-field-service-group-kit --branch main
```

Cloudflare Pages 주소가 나오면 설치가 완료됩니다.

## 10. 접속 주소 예시

- 전체 홈: `https://YOUR_PAGES_DOMAIN/`
- 1집단: `https://YOUR_PAGES_DOMAIN/?g=group1`
- 2집단: `https://YOUR_PAGES_DOMAIN/?g=group2`
- 편집자 화면: `https://YOUR_PAGES_DOMAIN/admin.html`

## 11. 설치 후 확인

- 각 집단 주소가 열리는지 확인합니다.
- 성원 보고 화면이 정상적으로 표시되는지 확인합니다.
- 편집자 PIN으로 로그인되는지 확인합니다.
- 광고 메뉴가 보이는지 확인합니다.
- 모바일 브라우저에서도 버튼과 글자가 겹치지 않는지 확인합니다.

감독자와 담당자의 기본 로그인 방법은 [docs/감독자_로그인_안내.md](docs/감독자_로그인_안내.md)를 참고하세요.

## 12. 문제 해결

`Firebase config missing` 오류가 나면 `web/.env` 값이 빠졌을 가능성이 큽니다.

`permission denied`가 나오면 Firestore 규칙 배포와 로그인 권한을 확인하세요.

PIN 로그인이 안 되면 `roles.csv`의 PIN을 확인한 뒤 `node scripts/setup-from-csv.mjs`를 다시 실행하세요.

Worker 호출이 실패하면 `VITE_WORKER_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` secret을 확인하세요.
