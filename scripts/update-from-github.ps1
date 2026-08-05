param(
  [string]$RepositoryUrl = "https://github.com/almightyrock-cpu/congregation-field-service-group-kit.git",
  [switch]$Deploy
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Write-Step($Message) {
  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

Write-Step "야외 봉사 집단 프로그램 업데이트 확인"
Write-Host "작업 폴더: $Root"

if (-not (Test-Path -LiteralPath (Join-Path $Root ".git"))) {
  Write-Host ""
  Write-Host "이 폴더는 GitHub 저장소로 설치된 폴더가 아닙니다." -ForegroundColor Yellow
  Write-Host "ZIP 파일로 설치한 경우에는 GitHub에서 최신 ZIP을 내려받은 뒤,"
  Write-Host "기존 web/.env, worker/wrangler.toml, Firebase/Cloudflare 설정값을 보존해야 합니다."
  Write-Host ""
  Write-Host "추천: 다음 설치부터는 GitHub 저장소를 내려받아 설치하면 업데이트 확인이 더 쉬워집니다."
  Write-Host $RepositoryUrl
  exit 0
}

Write-Step "현재 변경사항 확인"
git -C $Root status --short

$changed = git -C $Root status --porcelain
if ($changed) {
  Write-Host ""
  Write-Host "현재 폴더에 직접 수정한 파일이 있습니다." -ForegroundColor Yellow
  Write-Host "업데이트 전에 백업을 만들고, 직접 수정한 파일이 덮이지 않는지 확인하세요."
  $answer = Read-Host "계속 진행할까요? (Y/N)"
  if ($answer -notin @("Y", "y")) {
    Write-Host "업데이트를 중단했습니다."
    exit 0
  }
}

Write-Step "GitHub 최신 변경사항 내려받기"
git -C $Root pull --ff-only

Write-Step "웹 의존성 확인"
Push-Location (Join-Path $Root "web")
npm install
npm run build
Pop-Location

if ($Deploy) {
  Write-Step "Cloudflare Pages 배포"
  Push-Location $Root
  npx wrangler pages deploy web/dist
  Pop-Location
} else {
  Write-Host ""
  Write-Host "업데이트와 빌드가 완료되었습니다." -ForegroundColor Green
  Write-Host "Cloudflare Pages에 반영하려면 아래 명령을 실행하세요."
  Write-Host "powershell -ExecutionPolicy Bypass -File scripts\update-from-github.ps1 -Deploy"
}
