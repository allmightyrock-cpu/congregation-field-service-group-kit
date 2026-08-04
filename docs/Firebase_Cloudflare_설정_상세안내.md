# Firebase와 Cloudflare 처음 사용자 상세 안내

이 문서는 Firebase와 Cloudflare를 한 번도 사용해 보지 않은 분을 기준으로 작성했습니다. 설치 도우미는 많은 작업을 자동으로 해 주지만, 두 서비스의 계정 생성과 로그인 승인은 각 회중이 직접 해야 합니다.

## 먼저 이해할 구조

이 프로그램은 두 종류의 인터넷 서비스를 사용합니다.

1. Firebase
   - 집단, 성원, 광고, 임명표 같은 데이터를 저장하는 곳입니다.
   - 쉽게 말해 프로그램의 데이터 보관소입니다.

2. Cloudflare
   - 성원들이 접속하는 웹 화면을 인터넷에 올리는 곳입니다.
   - PIN 로그인처럼 서버가 처리해야 하는 일을 실행하는 곳이기도 합니다.

Cloudflare 안에서도 두 가지를 사용합니다.

- Worker: PIN 로그인, Firebase 연결, 서버 작업 담당
- Pages: 성원과 감독자가 보는 웹 화면 담당

그래서 설치 도우미에는 Cloudflare 항목이 두 개로 나뉩니다.

- Worker 이름: 서버 작업용 이름
- Pages 프로젝트 이름: 웹사이트용 이름

## 1. Firebase 접속하기

직접 주소:

```text
https://firebase.google.com/
```

바로 콘솔로 들어가는 주소:

```text
https://console.firebase.google.com/
```

구글에서 찾을 때 검색어:

```text
Firebase 콘솔
Firebase console
```

Firebase 첫 화면에서 `Go to console` 또는 `콘솔로 이동`을 누릅니다. Google 계정 로그인이 필요합니다.

## 2. Firebase 프로젝트 만들기

1. `https://console.firebase.google.com/`에 접속합니다.
2. Google 계정으로 로그인합니다.
3. `프로젝트 추가` 또는 `Add project`를 누릅니다.
4. 프로젝트 이름을 입력합니다.
   - 예: `congregation-field-service`
5. Project ID가 자동으로 만들어집니다.
   - 설치 도우미에는 이 Project ID를 입력해야 합니다.
   - 프로젝트 이름과 Project ID는 다를 수 있습니다.
6. Google Analytics 사용 여부가 나오면 이 프로그램 설치에는 필수는 아닙니다.
7. 프로젝트 만들기를 완료합니다.

Firebase 공식 사이트도 Firebase가 앱을 만들고 운영하기 위한 Google 기반 플랫폼이라고 설명하며, 콘솔에서 시작할 수 있도록 안내합니다.

## 3. Firestore Database 만들기

Firestore는 실제 데이터가 저장되는 데이터베이스입니다.

1. Firebase 프로젝트 화면 왼쪽 메뉴에서 `Build`를 찾습니다.
2. `Firestore Database`를 선택합니다.
3. `데이터베이스 만들기`를 누릅니다.
4. 보안 규칙 선택 화면이 나오면 처음에는 테스트 모드 또는 프로덕션 모드 선택이 보일 수 있습니다.
5. 위치 선택 화면이 나오면 가까운 지역을 선택합니다.
   - 한국 사용자는 보통 아시아 지역을 선택하면 됩니다.
6. 만들기를 완료합니다.

나중에 설치 도우미가 이 배포본에 포함된 Firestore 규칙과 인덱스를 배포합니다.

## 4. Firebase 웹 앱 등록하기

설치 도우미가 `web/.env` 파일을 만들려면 Firebase 웹 앱 설정값이 필요합니다.

1. Firebase 프로젝트 화면에서 톱니바퀴 아이콘을 누릅니다.
2. `프로젝트 설정`을 선택합니다.
3. `일반` 탭을 엽니다.
4. 아래쪽 `내 앱` 영역에서 웹 아이콘 `</>`을 선택합니다.
5. 앱 닉네임을 입력합니다.
   - 예: `field-service-web`
6. `Firebase Hosting 설정` 체크가 나오면 반드시 켤 필요는 없습니다.
7. 앱 등록을 누릅니다.
8. `SDK 설정 및 구성`에서 `구성` 또는 `Config`를 선택합니다.
9. 아래 값들을 설치 도우미의 Firebase 화면에 복사합니다.

설치 도우미 입력값:

- `apiKey`
- `authDomain`
- `storageBucket`
- `messagingSenderId`
- `appId`

참고: Firebase 공식 문서는 웹 앱을 등록하면 Firebase 구성 객체를 콘솔에서 확인할 수 있다고 설명합니다.

## 5. Firebase 서비스 계정 JSON 받기

서비스 계정 JSON은 Cloudflare Worker가 Firebase에 안전하게 접속할 때 사용하는 비공개 키입니다.

1. Firebase 프로젝트에서 톱니바퀴 아이콘을 누릅니다.
2. `프로젝트 설정`을 엽니다.
3. `서비스 계정` 탭을 엽니다.
4. `새 비공개 키 생성`을 누릅니다.
5. JSON 파일을 컴퓨터에 저장합니다.
6. 설치 도우미의 `서비스 계정 JSON 파일` 항목에서 `찾기`를 눌러 이 파일을 선택합니다.

주의:

- 이 JSON 파일은 비밀번호처럼 다룹니다.
- GitHub, 네이버 카페, 단체 채팅방에 올리면 안 됩니다.
- 설치하는 컴퓨터 안에만 보관합니다.

## 6. Cloudflare 접속하기

직접 주소:

```text
https://www.cloudflare.com/
```

바로 대시보드로 들어가는 주소:

```text
https://dash.cloudflare.com/
```

구글에서 찾을 때 검색어:

```text
Cloudflare
Cloudflare dashboard
Cloudflare 대시보드
```

처음 사용하는 분은 Cloudflare 사이트에서 회원가입을 합니다. 이메일 인증이 필요할 수 있습니다.

## 7. Cloudflare에서 메뉴 찾기

로그인 후 Cloudflare 대시보드에 들어가면 왼쪽 메뉴 또는 첫 화면에서 다음 메뉴를 찾습니다.

```text
Workers & Pages
```

이 메뉴 안에 Worker와 Pages가 같이 있습니다.

헷갈리지 않게 이렇게 이해하면 됩니다.

- Worker는 서버 코드입니다.
- Pages는 웹사이트입니다.
- 이 프로그램은 둘 다 필요합니다.

하지만 사용자가 Cloudflare 화면에서 직접 복잡하게 만들 필요는 최소화했습니다. 설치 도우미가 이름과 설정 파일을 준비하고, `wrangler` 명령으로 배포를 진행합니다.

## 8. Cloudflare Worker 이름 정하기

Worker 이름은 서버 작업 주소에 들어갑니다.

예:

```text
congregation-fsg-api
```

배포 후 Worker 주소 예:

```text
https://congregation-fsg-api.workers.dev
```

설치 도우미의 Cloudflare 화면에 입력합니다.

- Worker 이름: `congregation-fsg-api`
- Worker URL: 처음에는 비워 두거나 예상 주소를 적고, 배포 후 실제 주소로 확인합니다.

Cloudflare 공식 문서는 Worker를 서버를 직접 관리하지 않고 코드를 실행하는 환경으로 설명합니다. 이 프로그램에서는 PIN 로그인과 Firebase 연결에 Worker를 사용합니다.

## 9. Worker secret 등록 이해하기

Worker secret은 Cloudflare Worker 안에 숨겨 두는 비공개 값입니다.

이 프로그램에서는 Firebase 서비스 계정 JSON을 아래 이름의 secret으로 등록합니다.

```text
FIREBASE_SERVICE_ACCOUNT
```

설치 도우미가 배포 명령을 실행하면 내부적으로 다음 작업을 진행합니다.

```powershell
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT
```

Cloudflare 공식 문서도 민감한 값은 `wrangler secret put` 또는 대시보드의 Variables and Secrets에서 Secret으로 등록한다고 안내합니다.

## 10. Cloudflare Pages 프로젝트 이름 정하기

Pages 프로젝트 이름은 성원들이 접속하는 웹사이트 주소에 들어갑니다.

예:

```text
congregation-field-service
```

배포 후 Pages 주소 예:

```text
https://congregation-field-service.pages.dev
```

설치 도우미의 Cloudflare 화면에 입력합니다.

- Pages 프로젝트 이름: `congregation-field-service`

Cloudflare Pages 공식 문서는 Pages 프로젝트가 `<PROJECT_NAME>.pages.dev` 주소로 제공된다고 안내합니다.

## 11. Worker와 Pages 배포 순서

초보자에게 가장 헷갈리는 부분이 이 순서입니다.

이 프로그램은 아래 순서로 진행합니다.

1. Firebase 프로젝트와 Firestore 준비
2. Firebase 웹 앱 설정값 복사
3. Firebase 서비스 계정 JSON 다운로드
4. 설치 도우미에 기본 정보 입력
5. 설치 도우미에 집단 개수와 집단 이름 입력
6. Cloudflare Worker 이름 입력
7. Cloudflare Pages 프로젝트 이름 입력
8. 준비 파일 만들기
9. Firebase 규칙과 초기 데이터 등록
10. Cloudflare Worker secret 등록
11. Worker 배포
12. Worker 주소를 웹 앱 설정에 반영
13. 웹 앱 빌드
14. Pages 배포
15. 최종 Pages 주소를 성원들에게 공유

왜 Worker를 먼저 배포하나요?

성원 화면이 PIN 로그인을 하려면 Worker 주소를 알아야 하기 때문입니다. 그래서 Worker를 먼저 만들고, 그 주소를 웹 화면 설정에 넣은 뒤 Pages를 배포합니다.

## 12. 설치 도우미에 입력하는 값 전체

기본 정보:

- 회중 이름
- Firebase Project ID
- Firebase 서비스 계정 JSON 파일

집단 이름:

- 집단 개수
- 각 집단 이름

Firebase:

- `apiKey`
- `authDomain`
- `storageBucket`
- `messagingSenderId`
- `appId`

Cloudflare:

- Worker 이름
- Pages 프로젝트 이름
- Worker URL

실행:

- 준비 파일 만들기
- 초기 데이터 등록
- Worker 배포
- Pages 배포

## 13. 처음 사용자가 자주 헷갈리는 말

Project ID:

Firebase 프로젝트의 고유한 영문 ID입니다. 프로젝트 이름과 다를 수 있습니다.

Config:

Firebase 웹 앱 설정값입니다. `apiKey`, `authDomain`, `appId` 같은 값이 들어 있습니다.

서비스 계정 JSON:

Firebase에 관리자 권한으로 접속하기 위한 비공개 키 파일입니다. 공개하면 안 됩니다.

Worker:

Cloudflare에서 실행되는 서버 코드입니다. 이 프로그램에서는 PIN 로그인과 Firebase 연결을 담당합니다.

Pages:

성원들이 접속하는 웹사이트입니다. 최종 공유 주소는 보통 `pages.dev`로 끝납니다.

wrangler:

Cloudflare에 Worker와 Pages를 배포할 때 사용하는 공식 명령 도구입니다. 설치 도우미가 이 명령을 대신 실행합니다.

## 14. 공식 문서와 접속 주소

- Firebase 공식 사이트: https://firebase.google.com/
- Firebase 콘솔: https://console.firebase.google.com/
- Firebase 웹 앱 설정: https://firebase.google.com/docs/web/setup
- Firebase 구성 객체 설명: https://firebase.google.com/docs/web/learn-more
- Cloudflare 공식 사이트: https://www.cloudflare.com/
- Cloudflare 대시보드: https://dash.cloudflare.com/
- Cloudflare Workers 시작 안내: https://developers.cloudflare.com/workers/get-started/guide/
- Cloudflare Worker Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Pages 시작 안내: https://developers.cloudflare.com/pages/get-started/
- Cloudflare Pages Direct Upload: https://developers.cloudflare.com/pages/get-started/direct-upload/
- Wrangler 명령 안내: https://developers.cloudflare.com/workers/wrangler/
