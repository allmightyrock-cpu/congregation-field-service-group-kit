# GitHub 배포 가이드

이 문서는 `Congregation Field Service Group Kit`를 GitHub 저장소와 Release ZIP으로 배포하는 절차입니다.

## 추천 배포 구조

- GitHub 저장소: 최신 소스와 설치 안내 문서 제공
- GitHub Releases: 초보자를 위한 버전별 ZIP 설치키트 제공
- 네이버 카페 글: 소개글, GitHub 링크, ZIP 첨부 파일 안내 제공

## 1. GitHub에서 새 저장소 만들기

1. GitHub에 로그인합니다.
2. 오른쪽 위 `+` 버튼을 누르고 `New repository`를 선택합니다.
3. 저장소 이름을 입력합니다.

추천 저장소 이름:

```text
congregation-field-service-group-kit
```

4. 공개 배포를 원하면 `Public`, 제한 배포를 원하면 `Private`를 선택합니다.
5. `Add a README file`은 체크하지 않습니다. 이미 배포본 안에 README가 있습니다.
6. `Create repository`를 누릅니다.

## 2. 로컬 저장소를 GitHub에 연결

GitHub에서 빈 저장소를 만들면 아래와 비슷한 주소가 나옵니다.

```text
https://github.com/YOUR_ID/congregation-field-service-group-kit.git
```

배포본 폴더에서 실행합니다.

```powershell
git remote add origin https://github.com/YOUR_ID/congregation-field-service-group-kit.git
git branch -M main
git push -u origin main
```

## 3. Release ZIP 올리기

1. GitHub 저장소 화면에서 `Releases`를 누릅니다.
2. `Create a new release`를 누릅니다.
3. 태그를 입력합니다.

```text
v1.0.0
```

4. 제목을 입력합니다.

```text
Congregation Field Service Group Kit v1.0.0
```

5. 설명에 아래 내용을 적습니다.

```text
첫 배포 버전입니다.

- 야외 봉사 집단별 성원 보고
- 광고·안내 게시판
- 집단 편성표
- 역할별 PIN 로그인
- Firebase/Cloudflare 설치 안내 포함
```

6. `Congregation_Field_Service_Group_Kit.zip` 파일을 첨부합니다.
7. `Publish release`를 누릅니다.

## 4. 네이버 카페에 안내할 내용

카페 글에는 아래 세 가지를 함께 안내하는 것이 좋습니다.

- GitHub 저장소 링크
- Release ZIP 다운로드 링크
- 카페 글에 직접 첨부한 ZIP 파일

초보자는 카페 첨부 ZIP을 받으면 되고, 최신 버전을 확인하려는 사용자는 GitHub Releases를 보면 됩니다.

## 5. 공개 전 주의 사항

- `.env` 파일이 포함되어 있지 않은지 확인합니다.
- 서비스 계정 JSON 파일이 포함되어 있지 않은지 확인합니다.
- 실제 성원 명단이나 운영 PIN이 들어 있지 않은지 확인합니다.
- 예제 CSV만 포함되어 있는지 확인합니다.
- `INSTALL.md`가 최신 설치 절차와 맞는지 확인합니다.
