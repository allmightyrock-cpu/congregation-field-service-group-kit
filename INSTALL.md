# 설치 안내 가이드

이 문서는 설치 담당자가 `Congregation Field Service Group Kit`를 회중 환경에 배포할 때 사용하는 안내입니다.

처음 사용하는 분은 기술 내용을 모두 이해할 필요가 없습니다. 사용자는 [docs/Firebase_Cloudflare_설정_상세안내.md](docs/Firebase_Cloudflare_설정_상세안내.md)에 있는 값만 준비하면 되고, 실제 설치와 배포는 설치 담당자가 진행하는 것을 기준으로 합니다.

## 1. 사용자가 준비할 값

- 회중 이름
- 야외 봉사 집단 개수
- 각 집단 이름
- Firebase Project ID
- Firebase 웹 앱 설정값
  - `apiKey`
  - `authDomain`
  - `storageBucket`
  - `messagingSenderId`
  - `appId`
- Firebase 서비스 계정 JSON 파일
- Cloudflare 계정
- Cloudflare에서 사용할 이름 2개
  - 서버용 이름
  - 웹사이트용 이름

값을 어디서 만드는지에 대한 사용자용 안내:

```text
docs/Firebase_Cloudflare_설정_상세안내.md
```

## 2. 설치 도우미 실행

Windows에서는 배포본 폴더에서 아래 파일을 실행합니다.

```text
쉬운설치.cmd
```

또는 PowerShell에서 직접 실행할 수 있습니다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/easy-install.ps1
```

설치 도우미 샘플 화면:

```text
docs/설치도우미_샘플화면.html
```

## 3. 설치 도우미가 처리하는 작업

설치 도우미는 준비된 값을 받아 아래 작업을 순서대로 진행합니다.

- Node.js, npm, npx 사용 가능 여부 확인
- Firebase 웹 앱 설정값으로 `web/.env` 생성
- Cloudflare Worker 설정 파일 `worker/wrangler.toml` 수정
- 집단 개수와 집단 이름으로 `templates/groups.csv` 생성
- 성원 명단은 비워 둔 상태로 `templates/members.csv` 유지
- 고정 역할 PIN이 들어 있는 `templates/roles.csv` 사용
- 웹/Worker 의존성 설치
- Firestore 초기 데이터 등록
- Firebase Firestore rules/indexes 배포
- Cloudflare Worker secret 등록
- Cloudflare Worker 배포
- 웹 앱 빌드
- Cloudflare Pages 배포

## 4. 초기 데이터 기준

처음 설치할 때는 집단 이름만 정합니다.

성원 명단은 설치 후 입력합니다.

- 집단 감독자/보조자가 직접 입력
- 회중 서기가 엑셀 표로 일괄 입력

기본 역할 PIN:

| 역할 | 기본 PIN |
|---|---|
| 회중 조정자 | `1111` |
| 회중 서기 | `2222` |
| 봉사 감독자 | `3333` |
| 생활과 봉사 감독자 | `4444` |
| 공개강연 조정자 | `5555` |
| 집단 감독자/보조자 | `0000` |

실제 사용 전에는 기본 PIN을 반드시 바꾸세요.

## 5. 프로젝트 구조

```text
web/                       성원과 감독자가 접속하는 웹 앱
worker/                    PIN 로그인과 서버 작업을 처리하는 Cloudflare Worker
shared/                    웹과 Worker가 함께 쓰는 공통 로직
templates/                 초기 설정용 CSV 파일
scripts/setup-from-csv.mjs Firestore 초기 데이터 등록 스크립트
scripts/install-helper-gui.ps1 화면형 설치 도우미
docs/                      설치와 운영 안내 문서
```

## 6. Firebase 준비 상세

설치 담당자는 사용자가 준비한 Firebase 값을 확인합니다.

필요한 값:

- Firebase Project ID
- 웹 앱 Config 값
  - `apiKey`
  - `authDomain`
  - `storageBucket`
  - `messagingSenderId`
  - `appId`
- 서비스 계정 JSON 파일

설치 도우미는 이 값으로 `web/.env`를 생성합니다.

생성되는 환경값 예:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_WORKER_URL=...
```

Firestore rules/indexes는 배포본의 아래 파일을 기준으로 배포합니다.

```text
firestore.rules
firestore.indexes.json
```

## 7. Cloudflare 준비 상세

이 배포본은 Cloudflare에서 두 배포 대상을 사용합니다.

- Worker: PIN 로그인과 Firebase 연결을 처리
- Pages: 실제 웹 화면 배포

설치 도우미 화면에서는 사용자가 덜 부담스럽도록 아래처럼 표시합니다.

- 서버용 이름: Worker 이름으로 사용
- 웹사이트용 이름: Pages 프로젝트 이름으로 사용

설치 도우미가 수정하는 파일:

```text
worker/wrangler.toml
```

Worker secret으로 등록되는 값:

```text
FIREBASE_SERVICE_ACCOUNT
```

이 secret에는 Firebase 서비스 계정 JSON 내용이 들어갑니다.

## 8. 수동 설치 절차

자동 설치 도우미가 실패하거나 세부 확인이 필요하면 아래 순서로 수동 실행할 수 있습니다.

### 8.1 Firebase CLI 설치와 로그인

```powershell
npm install -g firebase-tools
firebase login
```

### 8.2 Worker 의존성 설치

```powershell
cd worker
npm install
```

### 8.3 웹 앱 의존성 설치

```powershell
cd web
npm install
```

### 8.4 초기 데이터 등록

서비스 계정 JSON 경로를 환경 변수로 지정합니다.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
$env:FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
node scripts/setup-from-csv.mjs
```

### 8.5 Firebase rules/indexes 배포

```powershell
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
```

### 8.6 Cloudflare 로그인

```powershell
npx wrangler login
```

### 8.7 Worker secret 등록

```powershell
cd worker
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

명령 실행 후 Firebase 서비스 계정 JSON 내용을 붙여 넣습니다.

### 8.8 Worker 배포

```powershell
cd worker
npx wrangler deploy
```

배포 후 Worker URL을 확인하고 `web/.env`의 `VITE_WORKER_URL` 값에 반영합니다.

### 8.9 웹 앱 빌드

```powershell
cd web
npm run build
```

### 8.10 Cloudflare Pages 배포

```powershell
cd web
npx wrangler pages deploy dist --project-name YOUR_PAGES_PROJECT_NAME --branch main
```

배포 후 표시되는 Pages 주소가 최종 접속 주소입니다.

## 9. 설치 후 전달할 주소

설치가 끝나면 아래 주소를 정리해 회중 담당자에게 전달합니다.

- 전체 홈: `https://YOUR_PAGES_DOMAIN/`
- 집단별 주소: `https://YOUR_PAGES_DOMAIN/?g=group1`
- 편집자 화면: `https://YOUR_PAGES_DOMAIN/admin.html`

## 10. 자주 발생하는 문제

`Firebase config missing`

- `web/.env` 값이 빠졌거나 잘못 입력된 경우입니다.
- Firebase 웹 앱 Config 값을 다시 확인합니다.

`permission denied`

- Firebase 로그인 계정 권한 또는 Firestore rules 배포 상태를 확인합니다.

PIN 로그인이 되지 않음

- `templates/roles.csv`의 PIN 값과 Firestore 초기 데이터 등록 여부를 확인합니다.
- 필요하면 `node scripts/setup-from-csv.mjs`를 다시 실행합니다.

Worker 호출 실패

- `VITE_WORKER_URL` 값이 실제 Worker URL과 맞는지 확인합니다.
- `FIREBASE_SERVICE_ACCOUNT` secret 등록 여부를 확인합니다.
- `worker/wrangler.toml`의 Firebase Project ID를 확인합니다.

Cloudflare Pages 주소가 열리지 않음

- `web/dist` 빌드가 정상 완료되었는지 확인합니다.
- `wrangler pages deploy` 명령에서 프로젝트 이름이 맞는지 확인합니다.

## 11. 보안 주의

- Firebase 서비스 계정 JSON은 GitHub, 카페, 단체 채팅방에 올리지 않습니다.
- `.env` 파일은 공개 저장소에 올리지 않습니다.
- 실제 성원 명단과 운영 PIN은 공개 배포본에 포함하지 않습니다.
- 설치 후 기본 PIN은 반드시 변경합니다.
