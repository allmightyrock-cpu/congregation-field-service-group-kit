# Congregation Field Service Group Kit

야외 봉사 집단 운영을 돕는 웹 프로그램 배포본입니다. 각 회중은 이 자료를 내려받아 자기 Firebase 프로젝트와 Cloudflare 배포 환경을 연결한 뒤, 집단 성원과 광고 자료를 직접 입력해서 사용할 수 있습니다.

## 주요 기능

- 집단별 성원 보고 및 집계
- 회중 광고, 지부 광고 서신, 집단 소식 관리
- 집단 편성표, 봉사·청소 임명, 봉사 감독자 방문, 집회 임명표, 공개강연 안내
- 역할별 PIN 로그인과 권한 분리
- 모바일 사용에 맞춘 웹 화면

## 구성

- `web/`: 사용자가 접속하는 Vite/Firebase 웹 앱
- `worker/`: PIN 로그인과 서버 작업을 처리하는 Cloudflare Worker
- `shared/`: 웹과 Worker가 함께 쓰는 공통 로직
- `templates/`: 처음 설치할 때 가져올 CSV 예제 데이터
- `scripts/setup-from-csv.mjs`: CSV 예제 데이터를 Firestore에 넣는 초기 설정 스크립트
- `docs/`: 설치와 운영 안내 문서

## 빠른 시작

자세한 순서는 [INSTALL.md](INSTALL.md)를 따라가면 됩니다.

1. Firebase 프로젝트를 만들고 Firestore를 준비합니다.
2. Cloudflare 계정에서 Worker와 Pages 배포를 준비합니다.
3. `web/.env.example`을 `web/.env`로 복사한 뒤 Firebase 웹 설정값을 입력합니다.
4. `worker/wrangler.toml`의 `FIREBASE_PROJECT_ID`를 자기 프로젝트 ID로 바꿉니다.
5. `templates/*.csv`를 자기 회중 자료로 수정합니다.
6. `node scripts/setup-from-csv.mjs`로 초기 데이터를 넣습니다.
7. Worker와 웹 앱을 배포합니다.

## 배포 자료 받기

GitHub 저장소를 사용하는 경우에는 두 가지 방법으로 받을 수 있습니다.

1. 저장소 화면의 `Code > Download ZIP`을 눌러 전체 소스를 내려받습니다.
2. `Releases` 메뉴에서 버전별 설치 ZIP 파일을 내려받습니다.

처음 설치하는 회중은 `Releases`에 첨부된 ZIP 파일을 받는 방식이 가장 쉽습니다. 이후 수정 이력이나 최신 설치 안내는 저장소의 `README.md`와 `INSTALL.md`에서 확인할 수 있습니다.

## 설치 전 확인

- 실제 성원 명단은 `templates/members.csv`에 직접 입력합니다.
- 관리자 PIN은 `templates/roles.csv`에서 회중 상황에 맞게 바꿉니다.
- Firebase 서비스 계정 JSON과 `.env` 파일은 GitHub에 올리지 않습니다.
- 설치 후에는 각 집단별 주소를 성원들에게 공유합니다.

## 보안 주의

서비스 계정 JSON, `.env`, 실제 성원 명단, 운영 PIN은 GitHub 공개 저장소에 올리지 마세요. 이 배포본에는 예제 데이터만 들어 있어야 합니다.
