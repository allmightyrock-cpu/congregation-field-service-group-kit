# 설치 안내 가이드

이 문서는 처음 설치하는 회중이 `Congregation Field Service Group Kit`를 자기 환경에 배포하는 순서입니다.

## 추천: 쉬운 설치 도우미 사용

Windows 사용자는 배포본 폴더에서 아래 파일을 더블 클릭하세요.

```text
쉬운설치.cmd
```

설치 도우미는 단계별 입력 화면으로 아래 작업을 순서대로 도와줍니다.

- Firebase 웹 설정값으로 `web/.env` 생성
- `worker/wrangler.toml` 자동 수정
- 초기 CSV 자료 확인
- 의존성 설치
- Firestore 초기 데이터 등록
- Firebase 규칙/인덱스 배포
- Cloudflare Worker secret 등록
- Worker 배포
- 웹 앱 빌드와 Cloudflare Pages 배포

자세한 설명은 [docs/쉬운_설치_도우미.md](docs/쉬운_설치_도우미.md)를 참고하세요.
Firebase와 Cloudflare 설정값을 찾는 방법은 [docs/Firebase_Cloudflare_설정_상세안내.md](docs/Firebase_Cloudflare_설정_상세안내.md)를 참고하세요.
샘플 화면은 [docs/설치도우미_샘플화면.html](docs/설치도우미_샘플화면.html)에서 볼 수 있습니다.

## 1. 준비물

- Node.js 20 이상
- npm
- Firebase 계정
- Cloudflare 계정
- Firebase 서비스 계정 JSON 파일
- 회중 집단/성원 자료

설치 확인:

```powershell
node -v
npm -v
```

## 2. Firebase 프로젝트 준비

1. Firebase 콘솔에서 새 프로젝트를 만듭니다.
2. Firestore Database를 생성합니다.
3. 프로젝트 설정에서 웹 앱을 추가하고 Firebase SDK 설정값을 확인합니다.
4. 프로젝트 설정 > 서비스 계정에서 새 비공개 키 JSON을 내려받습니다.

주의: 서비스 계정 JSON은 절대로 GitHub나 카페에 올리지 마세요.

## 3. CSV 자료 작성

`templates/` 폴더의 CSV 파일을 자기 회중 자료로 수정합니다.

- `groups.csv`: 집단 이름, 집단 감독자, 보조자
- `members.csv`: 집단별 성원 명단
- `roles.csv`: 관리자 역할과 PIN
- `notices.csv`: 광고·안내 메뉴

자세한 형식은 [docs/초기데이터_작성법.md](docs/초기데이터_작성법.md)를 참고하세요.

## 4. 쉬운 설치 도우미 실행

배포본 폴더에서 `쉬운설치.cmd`를 더블 클릭합니다.

PowerShell에서 직접 실행해야 하는 경우에는 아래처럼 실행할 수 있습니다. 이 명령도 화면형 설치 도우미를 엽니다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/easy-install.ps1
```

설치 도우미가 질문하는 값:

- 회중 이름
- Firebase Project ID
- Firebase 서비스 계정 JSON 파일 경로
- Cloudflare Worker 이름
- Cloudflare Pages 프로젝트 이름
- Firebase 웹 앱 설정값
- Worker URL

## 5. 접속 주소 예시

- 전체 홈: `https://YOUR_PAGES_DOMAIN/`
- 1집단: `https://YOUR_PAGES_DOMAIN/?g=group1`
- 2집단: `https://YOUR_PAGES_DOMAIN/?g=group2`
- 편집자 화면: `https://YOUR_PAGES_DOMAIN/admin.html`

## 6. 감독자 로그인

감독자와 담당자의 기본 로그인 방법은 [docs/감독자_로그인_안내.md](docs/감독자_로그인_안내.md)를 참고하세요.

## 7. 수동 설치가 필요한 경우

자동 설치가 중간에 실패하거나 세부 제어가 필요하면 아래 순서로 직접 실행할 수 있습니다.

```powershell
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_FIREBASE_PROJECT_ID
```

```powershell
cd worker
npm install
npx wrangler login
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
npx wrangler deploy
```

```powershell
cd web
npm install
npm run build
npx wrangler pages deploy dist --project-name congregation-field-service-group-kit --branch main
```

## 8. 문제 해결

`Firebase config missing` 오류가 나면 `web/.env` 값이 빠졌을 가능성이 큽니다.

`permission denied`가 나오면 Firestore 규칙 배포와 로그인 권한을 확인하세요.

PIN 로그인이 안 되면 `roles.csv`의 PIN을 확인한 뒤 `node scripts/setup-from-csv.mjs`를 다시 실행하세요.

Worker 호출이 실패하면 `VITE_WORKER_URL`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT` secret을 확인하세요.
