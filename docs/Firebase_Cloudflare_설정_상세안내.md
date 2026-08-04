# Firebase와 Cloudflare 설정 상세 안내

설치 도우미에서 가장 헷갈릴 수 있는 부분은 Firebase와 Cloudflare 설정값입니다. 아래 순서대로 준비한 뒤 설치 도우미에 입력하면 됩니다.

## 1. Firebase 프로젝트 만들기

1. Firebase 콘솔에 로그인합니다.
2. 새 프로젝트를 만듭니다.
3. 프로젝트 이름을 입력합니다.
4. Google Analytics는 필요에 따라 선택합니다. 이 프로그램 설치 자체에는 필수는 아닙니다.
5. 프로젝트 생성이 끝나면 프로젝트 화면으로 들어갑니다.

Firebase 공식 문서도 Firebase 프로젝트 생성 후 웹 앱을 등록하면 Firebase 구성 객체를 받을 수 있다고 안내합니다.

## 2. Firebase 웹 앱 등록

1. Firebase 프로젝트 화면에서 웹 앱 아이콘을 선택합니다.
2. 앱 닉네임을 입력합니다. 예: `field-service-group-web`
3. 앱을 등록합니다.
4. `SDK 설정 및 구성`에서 `구성(Config)`을 선택합니다.
5. 아래 값들을 설치 도우미에 복사합니다.

설치 도우미 입력 항목:

- `apiKey`
- `authDomain`
- `storageBucket`
- `messagingSenderId`
- `appId`

참고: Firebase의 `apiKey`, `projectId`, `appId`는 웹 앱 구성에 필요한 값입니다. Firebase 문서에서는 이 구성 객체가 Firebase 콘솔에서 제공된다고 설명합니다.

## 3. Firebase 서비스 계정 JSON 준비

1. Firebase 콘솔에서 프로젝트 설정으로 들어갑니다.
2. `서비스 계정` 탭을 엽니다.
3. 새 비공개 키를 생성합니다.
4. JSON 파일을 컴퓨터에 저장합니다.
5. 설치 도우미에서 `서비스 계정 JSON 파일` 항목의 `찾기` 버튼으로 선택합니다.

주의:

- 이 JSON 파일은 비공개 키입니다.
- GitHub, 네이버 카페, 단체 채팅방에 올리면 안 됩니다.
- 설치하는 컴퓨터 안에만 보관하세요.

## 4. Cloudflare Worker 설정

Worker는 PIN 로그인과 서버 작업을 처리합니다.

설치 도우미에서 정할 값:

- Worker 이름: 예 `congregation-fsg-kit-api`
- Worker URL: 처음에는 예시값을 넣고, Worker 배포 후 실제 URL로 바꿉니다.

Cloudflare 공식 문서에서는 Worker의 민감한 값은 `wrangler secret put` 또는 대시보드의 Variables and Secrets에서 Secret으로 등록한다고 안내합니다. 이 프로그램은 Firebase 서비스 계정 JSON을 `FIREBASE_SERVICE_ACCOUNT` secret으로 등록합니다.

## 5. Cloudflare Pages 설정

Pages는 성원들이 접속하는 웹 화면을 배포합니다.

설치 도우미에서 정할 값:

- Pages 프로젝트 이름: 예 `congregation-field-service-group-kit`

배포가 끝나면 Cloudflare Pages 주소가 표시됩니다.

예:

```text
https://congregation-field-service-group-kit.pages.dev
```

성원들에게 공유할 주소:

```text
https://YOUR_PAGES_DOMAIN/
https://YOUR_PAGES_DOMAIN/?g=group1
https://YOUR_PAGES_DOMAIN/admin.html
```

## 6. 설치 도우미에서 입력하는 순서

1. 기본 정보
   - 회중 이름
   - Firebase Project ID
   - 서비스 계정 JSON 파일

2. 집단 이름
   - 집단 개수
   - 각 집단 이름

3. Firebase
   - 웹 앱 구성값 붙여넣기

4. Cloudflare
   - Worker 이름
   - Pages 프로젝트 이름
   - Worker URL

5. 준비 및 실행
   - 준비 파일 만들기
   - 초기 데이터 등록
   - 필요한 경우 배포 명령 실행

## 7. 처음 설치자가 자주 헷갈리는 부분

- Firebase Project ID와 프로젝트 이름은 다를 수 있습니다. 설치 도우미에는 Project ID를 입력하세요.
- Firebase 웹 앱 구성값은 서비스 계정 JSON과 다릅니다. 둘 다 필요합니다.
- Worker URL은 Worker 배포 후 실제 주소로 다시 확인해야 합니다.
- 성원 명단은 처음 설치 때 입력하지 않아도 됩니다.
- 집단 감독자/보조자 기본 PIN은 `0000`입니다. 설치 후 반드시 바꾸세요.

## 참고 공식 문서

- Firebase 웹 앱 설정: https://firebase.google.com/docs/web/setup
- Firebase 구성 객체 설명: https://firebase.google.com/docs/web/learn-more
- Cloudflare Worker Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Wrangler 명령과 배포: https://developers.cloudflare.com/workers/wrangler/
