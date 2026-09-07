# 배포용 ZIP 만들기 (개발자용)
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\make-zip.ps1
# 결과: 배포본 폴더의 상위 폴더에 FSG_Distribution_Kit_<버전>.zip
# 제외: .git, .install, .secrets, node_modules, web/src·public 등 빌드 소스가 아닌 실행에 불필요한 것은 포함(소스 공개), 기록·결과 파일 제외

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ver = (Get-Content -Path (Join-Path $Root 'VERSION.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$stage = Join-Path $env:TEMP ("fsg-kit-stage-" + [guid]::NewGuid().ToString('N'))
$zipName = "FSG_Distribution_Kit_$ver.zip"
$zipPath = Join-Path (Split-Path -Parent $Root) $zipName

$excludeDirs = @('.git', '.install', '.secrets', 'node_modules', '.wrangler', '.github')
$excludeFiles = @('firebase-debug.log', '*.log', '.env', '.env.*', '*.zip')

New-Item -ItemType Directory -Force -Path $stage | Out-Null
$inner = Join-Path $stage 'FSG_Distribution_Kit'
New-Item -ItemType Directory -Force -Path $inner | Out-Null

Get-ChildItem -Path $Root -Force | ForEach-Object {
  if ($excludeDirs -contains $_.Name) { return }
  if ($_.Name -like '설치결과_*') { return }
  foreach ($pat in $excludeFiles) { if ($_.Name -like $pat) { return } }
  if ($_.PSIsContainer) {
    $dest = Join-Path $inner $_.Name
    Get-ChildItem -Path $_.FullName -Recurse -Force | Where-Object { $_.FullName -notmatch '\\(node_modules|\.wrangler)(\\|$)' } | ForEach-Object {
      $rel = $_.FullName.Substring((Join-Path $Root '').Length)
      $d = Join-Path $inner $rel
      if ($_.PSIsContainer) { New-Item -ItemType Directory -Force -Path $d | Out-Null }
      else { New-Item -ItemType Directory -Force -Path (Split-Path -Parent $d) | Out-Null; Copy-Item $_.FullName $d -Force }
    }
  } else {
    Copy-Item $_.FullName (Join-Path $inner $_.Name) -Force
  }
}

# 배포 ZIP 안의 config.js 는 반드시 빈 템플릿이어야 함(테스트 값 유출 방지)
$cfg = Join-Path $inner 'web\dist\config.js'
if (Test-Path $cfg) {
  $t = Get-Content -Path $cfg -Raw -Encoding UTF8
  if ($t -match 'projectId:\s*"[^"]+"') { throw "web/dist/config.js 에 실제 값이 들어 있습니다. git checkout -- web/dist/config.js 후 다시 실행하세요." }
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $inner '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $stage -Recurse -Force
$size = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "만들었습니다: $zipPath ($size MB)"
