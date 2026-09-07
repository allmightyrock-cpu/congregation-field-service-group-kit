# 설치 기술 안내 (진행자·개발자용)

일반 사용자는 `처음_설치_안내.pdf` 를 보면 됩니다. 이 문서는 설치 도우미가 내부에서 무엇을 하는지, 문제가 생겼을 때 어디를 보면 되는지 설명합니다.

## 1. 구조

```
설치.cmd ─▶ installer/bootstrap.ps1 ─┐
설치.command ─▶ installer/bootstrap.sh ┴▶ (포터블 Node) installer/server.mjs ─▶ 브라우저 http://127.0.0.1:<포트>/
```

| 구성 | 위치 | 역할 |
|---|---|---|
| 부트스트랩 | `installer/bootstrap.ps1` (Windows, PowerShell 5.1) / `installer/bootstrap.sh` (macOS, bash 3.2) | 포터블 Node 24 다운로드+SHA-256 검증, npm 으로 wrangler·firebase-tools 설치, 서버 실행. 준비된 항목은 건너뜀 |
| 실행환경 위치 | Windows `%LOCALAPPDATA%\FSG_Installer\runtime`, macOS `~/Library/Application Support/FSG_Installer/runtime` | 배포본 폴더 밖(동기화 폴더 회피). `FSG_RUNTIME_DIR` 로 변경 가능 |
| 고정 버전 | `installer/runtime.json` | Node 버전·해시, wrangler·firebase-tools 버전의 단일 출처 |
| 서버 | `installer/server.mjs` | 127.0.0.1 전용. 화면 정적 파일, `/api/state`, `/api/events`(SSE), `/api/action/<name>`, `/oauth/callback` |
| 상태 | `.install/install-state.json` | 단계별 완료·산출값(비밀값 없음). 재실행 시 이어하기 |
| 기록 | `.install/logs/install-<날짜>.log` | 마스킹된 로그 |
| 키 | `.secrets/<프로젝트>-service-account.json` | 서비스 계정 키. Worker 시크릿 업로드 외 미전송 |

## 2. 단계별 처리 (installer/steps)

| 화면 | 모듈 | 처리 |
|---|---|---|
| 0 사전 점검 | `lib/precheck.mjs` | Google/Cloudflare/nodejs.org 접속, 필수 파일 9개, Node 버전, wrangler·firebase 실행 |
| 2 회중 정보 | `lib/slug.mjs` | 한글 회중명 → 로마자 영문 이름 → 프로젝트 ID `<slug>-fsg`, Worker `<slug>-fsg-api`, Pages `<slug>-fsg` |
| 3 Google | `lib/gauth.mjs`, `steps/google.mjs` | 도우미 자체 OAuth(설치형 앱, 루프백 `127.0.0.1:<포트>/oauth/callback`) → 토큰을 firebase CLI 자격증명 저장소에 저장 → `firebase projects:create`(ASCII 표시명), Firestore API 켜기 + `firestore:databases:create (default) --location asia-northeast3`, `apps:create WEB`, REST `webApps/{id}/config` |
| 4 로그인 기능 | `steps/google.mjs` | 무료 Firebase Auth 는 API 로 초기화 불가 → 콘솔 딥링크에서 사용자가 "시작하기", 도우미는 `admin/v2/projects/{id}/config` 로 검증 |
| 5 서버 키 | `steps/google.mjs` | IAM API 로 `firebase-adminsdk-*` 서비스 계정 키 생성 → `.secrets/`. 폴백: 콘솔에서 키 생성 후 다운로드 폴더 자동 탐색 |
| 6 Cloudflare | `steps/cloudflare.mjs` | `wrangler auth create fsg-installer --browser=false`(명명 프로필: 사용자의 다른 wrangler 로그인과 분리) → REST 로 계정 확인·선택 |
| 8 설치 실행 | `steps/cloudflare.mjs`, `steps/seed.mjs` | ① `firebase deploy --only firestore:rules,firestore:indexes` ② `wrangler deploy --name … --var FIREBASE_PROJECT_ID --var TOKEN_MODE:signed --secrets-file`(FIREBASE_SERVICE_ACCOUNT) ③ `secret list` 확인 ④ `scripts/setup-from-csv.mjs`(config/app 있으면 건너뜀) ⑤ `web/dist/config.js` 생성 ⑥ `pages project create` ⑦ `pages deploy web/dist` ⑧ 사이트/설정/Worker `/health` 검증 |
| 9 완료 | `steps/result.mjs` | QR, `설치결과_<회중명>.txt`(키·PIN 미포함) |

모든 wrangler 호출은 `--profile fsg-installer` + `CLOUDFLARE_ACCOUNT_ID`, 모든 firebase 호출은 `--account <email> --json --non-interactive`.

## 3. 오류 표시

CLI 원문은 기록에만 남고 화면에는 `installer/lib/errors.mjs` 의 매핑(네트워크, 로그인 만료, 이름 중복, API 미사용, 결제 필요, 권한, 한도, 포트 충돌, 디스크 부족 등)에 따른 한국어 원인·조치가 표시됩니다. firebase CLI 는 JSON 에 원인을 안 남기므로 `firebase-debug.log` 에서 HTTP 오류 줄을 읽어 씁니다.

## 4. 업데이트

`업데이트.cmd` / `업데이트.command` → 부트스트랩 `-Update`: GitHub `main` ZIP 을 받아 `.git/.install/.secrets/node_modules` 를 제외한 프로그램 파일을 덮어쓰고(`web/dist/assets` 는 비운 뒤 채움), `web/dist/config.js` 는 보존, 서버를 `FSG_MODE=update` 로 실행 → "업데이트 배포" 화면에서 [다시 배포](= 설치 실행 8단계 재실행, 시딩은 건너뜀).

점검용: `FSG_UPDATE_URL` 환경변수 또는 `-UpdateUrl`(Windows) / `--update-url=`(macOS) 로 ZIP 주소를 바꿀 수 있습니다.

## 5. 수동으로 해야 할 때 (도우미 없이)

실행환경이 준비되어 있다면(포터블 Node 경로 `…/FSG_Installer/runtime/node`, 도구 `…/runtime/tools/node_modules/.bin`):

```bash
firebase deploy --only firestore:rules,firestore:indexes --project <프로젝트ID> --account <이메일>
cd worker && wrangler deploy --name <slug>-fsg-api --var FIREBASE_PROJECT_ID:<프로젝트ID> --var TOKEN_MODE:signed --secrets-file <시크릿json> --profile fsg-installer
wrangler pages deploy web/dist --project-name <slug>-fsg --branch main --commit-dirty=true --profile fsg-installer
```

시크릿 json 형식: `{"FIREBASE_SERVICE_ACCOUNT": "<서비스 계정 JSON 전체를 문자열로>"}`.
`web/dist/config.js` 는 `window.__FSG_CONFIG__ = { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, workerUrl }`.

## 6. 옵션

| 실행 | 설명 |
|---|---|
| `설치.cmd -Reset` | 실행환경(Node·도구)을 지우고 다시 준비 |
| `설치.cmd -NoLaunch` | 실행환경만 준비 |
| `설치.cmd -NoBrowser` | 브라우저 자동 열기 생략 |
| macOS: `bash 설치.command --reset` 등 | 동일 |
| `FSG_DEV=1` | 서버에 개발 확인용 패널(가짜 진행) 표시 |

## 7. 보안 메모

- 도우미 서버는 127.0.0.1 에만 열리고, 쓰기 요청은 전용 헤더와 Host/Origin 검사를 거칩니다.
- 기록·결과 파일에서 서비스 계정 키, OAuth 토큰, JWT, PIN 은 자동으로 가려집니다.
- `.install`, `.secrets`, `설치결과_*.txt`, `firebase-debug.log` 는 git 에 올라가지 않습니다.
