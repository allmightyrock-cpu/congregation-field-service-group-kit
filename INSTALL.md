# 설치 안내 가이드

이 문서는 `Congregation Field Service Group Kit`를 새 회중 환경에 설치하기 위한 안내입니다.

처음 설치하는 사용자는 모든 기술 내용을 이해할 필요가 없습니다. 아래 값만 준비하면 설치 담당자가 설치 도우미로 진행할 수 있습니다.

## 1. 설치 전에 준비할 값

### 설치 담당자 PC 준비

설치 담당자 PC에는 Node.js가 설치되어 있어야 합니다. 설치 도우미가 내부적으로 웹 화면을 빌드하고 필요한 패키지를 설치할 때 Node.js와 npm을 사용합니다.

Node.js 공식 사이트:

```text
https://nodejs.org/
```

Windows에서는 공식 사이트에서 `LTS` 버전의 `Windows Installer (.msi)`를 내려받아 기본값으로 설치합니다.

### 회중 정보

- 회중 이름
- 야외 봉사 집단 개수
- 각 집단 이름

처음에는 집단 이름만 정합니다. 집단 성원 이름은 나중에 직접 입력하거나 엑셀/CSV로 한꺼번에 등록할 수 있습니다.

### Firebase에서 가져올 값

Firebase 접속 주소:

```text
https://console.firebase.google.com/
```

준비할 값:

- Firebase Project ID
- Firebase Web App 설정값
  - `apiKey`
  - `authDomain`
  - `projectId`
  - `storageBucket`
  - `messagingSenderId`
  - `appId`
- Firebase 서비스 계정 JSON 파일

### Cloudflare에서 정할 값

Cloudflare 접속 주소:

```text
https://dash.cloudflare.com/
```

준비할 값:

- Cloudflare 계정
- Worker 이름
- Pages 프로젝트 이름

예시:

```text
Worker 이름: congregation-fsg-sample-api
Pages 이름: congregation-fsg-sample
```

## 2. 쉬운 설치 도우미 실행

Windows에서 배포본 폴더를 열고 아래 파일을 실행합니다.

```text
쉬운설치.cmd
```

설치 도우미는 다음 순서로 진행됩니다.

1. 회중 이름 입력
2. 집단 개수와 집단 이름 입력
3. Firebase 설정값 입력
4. Firebase 서비스 계정 JSON 파일 선택
5. Cloudflare Worker/Pages 이름 입력
6. 초기 CSV 파일 생성
7. 웹 환경 파일 생성
8. Worker 설정 파일 생성
9. Firebase 초기 데이터 등록
10. Firebase rules/indexes 배포
11. Cloudflare Worker 배포
12. 웹 화면 빌드
13. Cloudflare Pages 배포

## 3. 기본 PIN

처음 설치 후 기본 PIN은 다음과 같습니다.

| 역할 | 기본 PIN |
|---|---|
| 조정자 | `1111` |
| 서기 | `2222` |
| 봉사감독자 | `3333` |
| 생활과봉사 감독자 | `4444` |
| 공개강연 조정자 | `5555` |
| 집단감독자·보조자 | `0000` |

설치 후 실제 운영 전에 반드시 변경하세요.

## 4. 설치 후 확인할 것

- 성원 화면이 열리는지 확인
- 집단 목록이 회중 상황에 맞게 표시되는지 확인
- 온라인 봉사 보고 화면이 열리는지 확인
- 회중 역할자 로그인 확인
- 집단감독자·보조자 로그인 확인
- 보고 현황 권한이 의도대로 보이는지 확인
- 광고와 집단 편성표 화면 연결 확인

## 5. 업데이트 안내

GitHub 저장소로 설치한 경우:

```text
업데이트확인.cmd
```

ZIP으로 설치한 경우:

1. 최신 ZIP을 내려받습니다.
2. 기존 `web/.env`를 보존합니다.
3. 기존 `worker/wrangler.toml`에서 회중 고유 이름을 확인합니다.
4. Firebase 서비스 계정 JSON과 실제 성원 자료를 덮어쓰지 않습니다.
5. 필요한 소스만 새 배포본으로 교체합니다.

## 6. 자동 업데이트에 대한 기준

완전 자동 업데이트는 권장하지 않습니다.

이유:

- 각 회중마다 Firebase 프로젝트가 다릅니다.
- 각 회중마다 Cloudflare Worker/Pages 이름이 다릅니다.
- 실제 성원 명단과 보고 기록은 절대 덮어쓰면 안 됩니다.

대신 다음 방식을 권장합니다.

- GitHub에서 프로그램 소스만 업데이트
- 회중별 환경값과 데이터는 유지
- 업데이트 후 웹 빌드와 Pages 배포만 다시 실행

이 기준이면 프로그램은 최신 상태를 유지하면서도 회중 데이터는 안전하게 보존할 수 있습니다.
