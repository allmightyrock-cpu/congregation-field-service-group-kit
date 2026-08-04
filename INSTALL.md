# 설치 안내 가이드

이 배포본은 설치 담당자가 설치 도우미를 실행해서 배포하는 것을 기준으로 합니다. 사용자는 필요한 값만 준비하면 됩니다.

## 사용자가 먼저 준비할 값

자세한 준비 방법은 [docs/Firebase_Cloudflare_설정_상세안내.md](docs/Firebase_Cloudflare_설정_상세안내.md)를 보세요.

준비할 값은 아래가 전부입니다.

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

## 접속 주소

Firebase:

```text
https://console.firebase.google.com/
```

구글 검색어:

```text
Firebase 콘솔
```

Cloudflare:

```text
https://dash.cloudflare.com/
```

구글 검색어:

```text
Cloudflare dashboard
Cloudflare 대시보드
```

## 설치 담당자가 진행할 일

설치 담당자는 배포본 폴더에서 아래 파일을 실행합니다.

```text
쉬운설치.cmd
```

설치 도우미가 필요한 값을 입력받고 배포를 진행합니다.

샘플 화면:

```text
docs/설치도우미_샘플화면.html
```

## 설치 후 전달할 주소

설치가 끝나면 설치 담당자가 아래 주소들을 정리해 전달합니다.

- 전체 홈: `https://YOUR_PAGES_DOMAIN/`
- 집단별 주소: `https://YOUR_PAGES_DOMAIN/?g=group1`
- 편집자 화면: `https://YOUR_PAGES_DOMAIN/admin.html`

## 감독자 로그인

감독자와 담당자의 기본 로그인 방법은 [docs/감독자_로그인_안내.md](docs/감독자_로그인_안내.md)를 참고하세요.

## 주의

Firebase 서비스 계정 JSON 파일은 공개하면 안 됩니다. GitHub, 네이버 카페, 단체 채팅방에 올리지 말고 설치 담당자에게만 직접 전달하세요.
