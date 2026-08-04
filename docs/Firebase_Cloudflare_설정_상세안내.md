# 설치에 필요한 값 준비 안내

이 문서는 설치를 직접 설명하기 위한 문서가 아닙니다. 설치는 설치 담당자가 진행한다고 보고, 사용자는 아래 값만 준비하면 됩니다.

목표는 간단합니다.

1. Firebase에서 필요한 값과 JSON 파일을 준비합니다.
2. Cloudflare 계정을 준비합니다.
3. 회중 이름과 집단 이름을 정합니다.
4. 준비한 값을 설치 담당자에게 전달합니다.

## 준비해서 전달할 것 전체 목록

아래 항목만 준비하면 됩니다.

- 회중 이름
- 야외 봉사 집단 개수
- 각 집단 이름
- Firebase Project ID
- Firebase 웹 앱 설정값 5개
  - `apiKey`
  - `authDomain`
  - `storageBucket`
  - `messagingSenderId`
  - `appId`
- Firebase 서비스 계정 JSON 파일
- Cloudflare 로그인 계정
- Cloudflare에서 사용할 이름 2개
  - 서버용 이름
  - 웹사이트용 이름

## 1. Firebase 들어가기

아래 주소로 들어갑니다.

```text
https://console.firebase.google.com/
```

주소가 헷갈리면 구글에서 이렇게 검색합니다.

```text
Firebase 콘솔
```

또는

```text
Firebase console
```

Google 계정으로 로그인합니다.

## 2. Firebase 프로젝트 만들기

1. Firebase 콘솔에서 `프로젝트 추가`를 누릅니다.
2. 프로젝트 이름을 입력합니다.
   - 예: `congregation-field-service`
3. Google Analytics 선택 화면이 나오면 이 설치에는 꼭 필요하지 않습니다.
4. 프로젝트 만들기를 완료합니다.

완료 후 설치 담당자에게 전달할 값:

```text
Firebase Project ID:
```

Project ID는 프로젝트 이름과 다를 수 있습니다. Firebase 프로젝트 설정 화면에서 확인할 수 있습니다.

## 3. Firestore Database 만들기

1. Firebase 프로젝트 화면 왼쪽에서 `Firestore Database`를 찾습니다.
2. `데이터베이스 만들기`를 누릅니다.
3. 위치 선택이 나오면 가까운 지역을 선택합니다.
4. 만들기를 완료합니다.

여기서 따로 복사할 값은 없습니다. 만들기만 완료하면 됩니다.

## 4. Firebase 웹 앱 설정값 찾기

1. Firebase 프로젝트 화면에서 톱니바퀴 아이콘을 누릅니다.
2. `프로젝트 설정`을 누릅니다.
3. `일반` 탭을 엽니다.
4. 아래쪽 `내 앱` 영역에서 웹 아이콘 `</>`을 누릅니다.
5. 앱 닉네임을 입력합니다.
   - 예: `field-service-web`
6. 앱 등록을 누릅니다.
7. `SDK 설정 및 구성`에서 `구성` 또는 `Config`를 선택합니다.

화면에 아래처럼 보이는 코드가 나옵니다.

```text
apiKey: "..."
authDomain: "..."
projectId: "..."
storageBucket: "..."
messagingSenderId: "..."
appId: "..."
```

설치 담당자에게 아래 5개 값을 전달합니다.

```text
apiKey:
authDomain:
storageBucket:
messagingSenderId:
appId:
```

`projectId`는 앞에서 확인한 Firebase Project ID와 같은 값인지 확인만 하면 됩니다.

## 5. Firebase 서비스 계정 JSON 파일 받기

1. Firebase 프로젝트 화면에서 톱니바퀴 아이콘을 누릅니다.
2. `프로젝트 설정`을 누릅니다.
3. `서비스 계정` 탭을 엽니다.
4. `새 비공개 키 생성`을 누릅니다.
5. JSON 파일을 컴퓨터에 저장합니다.

설치 담당자에게 전달할 것:

```text
Firebase 서비스 계정 JSON 파일
```

주의:

- 이 파일은 공개하면 안 됩니다.
- GitHub, 네이버 카페, 단체 채팅방에 올리지 않습니다.
- 설치 담당자에게만 직접 전달합니다.

## 6. Cloudflare 들어가기

아래 주소로 들어갑니다.

```text
https://dash.cloudflare.com/
```

주소가 헷갈리면 구글에서 이렇게 검색합니다.

```text
Cloudflare dashboard
```

또는

```text
Cloudflare 대시보드
```

처음이면 회원가입을 하고 이메일 인증을 완료합니다.

설치 담당자에게 전달할 것:

```text
Cloudflare 로그인 계정:
```

비밀번호를 문서에 적어 전달하지 마세요. 설치할 때 직접 로그인하거나, 원격 지원 중 본인이 직접 승인하는 방식이 안전합니다.

## 7. Cloudflare에서 사용할 이름 정하기

Cloudflare에는 이름이 2개 필요합니다. 아래 두 이름만 정하면 됩니다.

영문 소문자, 숫자, 하이픈만 사용하는 것을 권장합니다.

좋은 예:

```text
congregation-fsg-api
congregation-field-service
```

설치 담당자에게 전달할 값:

```text
서버용 이름:
웹사이트용 이름:
```

나중에 성원들에게 공유될 주소는 보통 아래처럼 만들어집니다.

```text
https://웹사이트용이름.pages.dev
```

## 8. 회중과 집단 이름 준비

설치 첫 단계에서는 성원 명단이 필요하지 않습니다.

준비할 값:

```text
회중 이름:
집단 개수:
1번 집단 이름:
2번 집단 이름:
3번 집단 이름:
...
```

집단 개수는 회중 사정에 맞게 정합니다. 3개 이상이면 됩니다.

성원 이름은 설치 후 감독자/보조자 또는 서기가 직접 입력하거나 엑셀로 한꺼번에 넣으면 됩니다.

## 9. 설치 담당자에게 전달하는 양식

아래 내용을 복사해서 채우면 됩니다.

```text
[회중 정보]
회중 이름:
집단 개수:
1번 집단 이름:
2번 집단 이름:
3번 집단 이름:
4번 집단 이름:
5번 집단 이름:
6번 집단 이름:

[Firebase]
Firebase Project ID:
apiKey:
authDomain:
storageBucket:
messagingSenderId:
appId:
서비스 계정 JSON 파일: 별도 전달

[Cloudflare]
Cloudflare 계정 이메일:
서버용 이름:
웹사이트용 이름:
```

## 10. 사용자가 직접 하지 않아도 되는 것

아래 작업은 설치 담당자가 설치 도우미로 처리합니다.

- 프로그램 파일 수정
- Firebase 설정 파일 만들기
- Firebase 규칙 배포
- 초기 집단 자료 등록
- Cloudflare 서버 배포
- Cloudflare 웹사이트 배포
- 최종 접속 주소 정리

사용자는 필요한 값만 정확히 준비하면 됩니다.

## 공식 접속 주소

- Firebase 콘솔: https://console.firebase.google.com/
- Firebase 공식 사이트: https://firebase.google.com/
- Cloudflare 대시보드: https://dash.cloudflare.com/
- Cloudflare 공식 사이트: https://www.cloudflare.com/
- Firebase 웹 앱 설정 안내: https://firebase.google.com/docs/web/setup
- Cloudflare Pages 안내: https://developers.cloudflare.com/pages/get-started/
- Cloudflare Workers 안내: https://developers.cloudflare.com/workers/get-started/guide/
