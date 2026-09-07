# 야외 봉사 집단 배포본 — 설치 도우미 부트스트랩 (Windows, PowerShell 5.1 이상)
#
# 역할: Node.js가 없는 PC에서도 동작하도록
#   1) 포터블 Node.js를 내려받아 검증(SHA-256)하고
#   2) wrangler / firebase-tools 를 그 Node로 설치한 뒤
#   3) 설치 도우미 서버(installer\server.mjs)를 실행해 브라우저를 연다.
# 실행환경은 배포본 폴더가 아니라 사용자 로컬 앱 폴더에 둔다.
#   (OneDrive 동기화 폴더에서 npm 설치가 느리고 꼬이는 문제 회피, 배포본 ZIP 크기 유지)
#   기본: %LOCALAPPDATA%\FSG_Installer\runtime   (환경변수 FSG_RUNTIME_DIR 로 변경 가능)
# 다시 실행해도 안전하다: 이미 준비된 항목은 건너뛴다.
#
# 옵션:  -Reset      실행환경을 지우고 처음부터 다시 준비
#        -NoLaunch   실행환경만 준비하고 설치 화면은 열지 않음(점검용)
#        -NoBrowser  서버는 실행하되 브라우저 자동 열기는 생략

#        -Update     GitHub 에서 최신 배포본을 받아 프로그램 파일만 교체(설정·키·데이터 보존) 후 재배포 화면 열기
#        -UpdateUrl  (점검용) 최신 배포본 ZIP 주소를 직접 지정

[CmdletBinding()]
param(
  [switch]$Reset,
  [switch]$NoLaunch,
  [switch]$NoBrowser,
  [switch]$Update,
  [string]$UpdateUrl
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch {}

$InstallerDir = $PSScriptRoot
$KitRoot      = Split-Path -Parent $InstallerDir
$RuntimeRoot  = if ($env:FSG_RUNTIME_DIR) { $env:FSG_RUNTIME_DIR } else { Join-Path $env:LOCALAPPDATA 'FSG_Installer\runtime' }
$NodeDir      = Join-Path $RuntimeRoot 'node'
$NodeExe      = Join-Path $NodeDir 'node.exe'
$NpmCmd       = Join-Path $NodeDir 'npm.cmd'
$ToolsDir     = Join-Path $RuntimeRoot 'tools'
$ToolsBin     = Join-Path $ToolsDir 'node_modules\.bin'
$DownloadDir  = Join-Path $RuntimeRoot 'downloads'
$LogDir       = Join-Path $RuntimeRoot 'logs'
$SpecPath     = Join-Path $InstallerDir 'runtime.json'
$ServerPath   = Join-Path $InstallerDir 'server.mjs'

# ---------- 출력 도우미 ----------
function Write-Title($t) { Write-Host ''; Write-Host "==== $t ====" -ForegroundColor Cyan }
function Write-Step($t)  { Write-Host "  - $t" }
function Write-Ok($t)    { Write-Host "  [완료] $t" -ForegroundColor Green }
function Write-Warn($t)  { Write-Host "  [주의] $t" -ForegroundColor Yellow }
function Write-Fail($t)  { Write-Host ''; Write-Host "  [실패] $t" -ForegroundColor Red }

function Fail-With([string]$Message, [string]$Hint) {
  Write-Fail $Message
  if ($Hint) { Write-Host "         $Hint" -ForegroundColor Yellow }
  if ($script:LogPath) { Write-Host "         기록 파일: $script:LogPath" -ForegroundColor DarkGray }
  throw [System.Exception]::new("BOOTSTRAP_FAILED: $Message")
}

# ---------- 준비 ----------
function Get-Spec {
  if (-not (Test-Path $SpecPath)) { Fail-With "installer\runtime.json 파일이 없습니다." "배포본 압축을 전부 풀었는지 확인하세요." }
  return (Get-Content -Path $SpecPath -Raw -Encoding UTF8 | ConvertFrom-Json)
}

function Get-ArchKey {
  $a = $env:PROCESSOR_ARCHITEW6432
  if (-not $a) { $a = $env:PROCESSOR_ARCHITECTURE }
  switch (($a + '').ToUpperInvariant()) {
    'AMD64' { return 'win-x64' }
    'ARM64' { return 'win-arm64' }
    default { Fail-With "지원하지 않는 CPU 종류입니다: $a" "64비트 Windows(x64 또는 ARM64)에서 실행하세요." }
  }
}

function Test-Internet {
  try {
    $r = Invoke-WebRequest -Uri 'https://nodejs.org/dist/' -Method Head -UseBasicParsing -TimeoutSec 20
    return $true
  } catch {
    return $false
  }
}

function Get-Sha256([string]$Path) {
  return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Download-File([string]$Url, [string]$Dest) {
  $tmp = "$Dest.part"
  if (Test-Path $tmp) { Remove-Item $tmp -Force }
  $req = [System.Net.HttpWebRequest]::Create($Url)
  $req.UserAgent = 'FSG-Installer-Bootstrap'
  $req.Timeout = 60000
  $resp = $req.GetResponse()
  try {
    $total = $resp.ContentLength
    $in = $resp.GetResponseStream()
    $out = [System.IO.File]::Create($tmp)
    try {
      $buf = New-Object byte[] (256KB)
      $done = 0L; $lastPct = -1; $sw = [System.Diagnostics.Stopwatch]::StartNew()
      while (($n = $in.Read($buf, 0, $buf.Length)) -gt 0) {
        $out.Write($buf, 0, $n); $done += $n
        if ($total -gt 0) {
          $pct = [int](($done * 100) / $total)
          if ($pct -ne $lastPct) {
            $lastPct = $pct
            $mb = [math]::Round($done / 1MB, 1); $tmb = [math]::Round($total / 1MB, 1)
            Write-Progress -Activity '내려받는 중' -Status "$mb MB / $tmb MB" -PercentComplete $pct
            if ($pct % 10 -eq 0) { Write-Host ("`r    {0,3}%  {1} MB / {2} MB   " -f $pct, $mb, $tmb) -NoNewline }
          }
        }
      }
      Write-Host ''
      Write-Progress -Activity '내려받는 중' -Completed
    } finally { $out.Dispose(); $in.Dispose() }
  } finally { $resp.Close() }
  Move-Item -Path $tmp -Destination $Dest -Force
}

function Run-Native([string]$File, [string[]]$Arguments, [string]$WorkDir) {
  # 네이티브 프로그램의 stderr 경고가 PowerShell 오류로 둔갑하지 않도록 Start-Process 로 실행
  # (주의: 매개변수 이름을 $Args 로 두면 PowerShell 자동 변수와 충돌해 null 이 됨)
  $p = Start-Process -FilePath $File -ArgumentList $Arguments -WorkingDirectory $WorkDir -NoNewWindow -Wait -PassThru
  return $p.ExitCode
}

# ---------- 단계 1: Node.js ----------
function Ensure-Node($spec, [string]$archKey) {
  Write-Title '1/3  실행환경(Node.js) 확인'
  $want = "v$($spec.nodeVersion)"
  if (Test-Path $NodeExe) {
    $have = ''
    try { $have = (& $NodeExe -v 2>$null | Out-String).Trim() } catch { $have = '' }
    if ($have -eq $want) { Write-Ok "Node.js $have 준비되어 있음 ($NodeDir)"; return }
    Write-Warn "다른 버전($have)이 있어 $want 로 다시 준비합니다."
    Remove-Item -Path $NodeDir -Recurse -Force
  }

  $file = $spec."node_${archKey}_file"
  $sha  = ($spec."node_${archKey}_sha256" + '').ToLowerInvariant()
  if (-not $file -or -not $sha) { Fail-With "runtime.json 에 $archKey 항목이 없습니다." }
  $url  = $spec.nodeBaseUrl + $file
  New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null
  $zip  = Join-Path $DownloadDir $file

  $needDownload = $true
  if (Test-Path $zip) {
    Write-Step '이전에 받아 둔 파일을 검사합니다...'
    if ((Get-Sha256 $zip) -eq $sha) { $needDownload = $false; Write-Ok '이전에 받은 파일이 정상이라 다시 받지 않습니다.' }
    else { Write-Warn '이전 파일이 손상되어 다시 받습니다.'; Remove-Item $zip -Force }
  }
  if ($needDownload) {
    if (-not (Test-Internet)) {
      Fail-With '인터넷에 연결할 수 없습니다 (nodejs.org 접속 실패).' '와이파이/인터넷 연결을 확인하고 다시 실행하세요. 회사·학교 망이면 보안 프로그램이 막고 있을 수 있습니다.'
    }
    Write-Step "Node.js $want 내려받는 중 (약 36MB, 한 번만)"
    Write-Step $url
    try { Download-File -Url $url -Dest $zip }
    catch { Fail-With "내려받기 실패: $($_.Exception.Message)" '잠시 후 다시 실행하세요. 계속 실패하면 인터넷 보안 프로그램(백신·방화벽)을 잠시 끄고 시도하세요.' }
  }

  Write-Step '파일 무결성(SHA-256) 확인 중...'
  $got = Get-Sha256 $zip
  if ($got -ne $sha) {
    Remove-Item $zip -Force
    Fail-With '내려받은 파일이 원본과 다릅니다(변조 또는 전송 오류). 파일을 지웠습니다.' '다시 실행하면 새로 내려받습니다. 반복되면 다른 네트워크에서 시도하세요.'
  }
  Write-Ok '무결성 확인 통과'

  Write-Step '압축 푸는 중 (1분 정도 걸릴 수 있음)...'
  $tmpX = Join-Path $DownloadDir ('extract-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmpX | Out-Null
  try {
    Expand-Archive -Path $zip -DestinationPath $tmpX -Force
    $inner = Get-ChildItem -Path $tmpX -Directory | Select-Object -First 1
    if (-not $inner -or -not (Test-Path (Join-Path $inner.FullName 'node.exe'))) { Fail-With '압축 내용이 예상과 다릅니다(node.exe 없음).' }
    New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
    Move-Item -Path $inner.FullName -Destination $NodeDir
  } finally {
    if (Test-Path $tmpX) { Remove-Item $tmpX -Recurse -Force -ErrorAction SilentlyContinue }
  }
  $have = (& $NodeExe -v | Out-String).Trim()
  if ($have -ne $want) { Fail-With "Node.js 실행 확인 실패(버전: '$have')." }
  Write-Ok "Node.js $have 준비 완료 ($NodeDir)"
}

# ---------- 단계 2: wrangler / firebase-tools ----------
function Get-InstalledPkgVersion([string]$pkg) {
  $pj = Join-Path $ToolsDir "node_modules\$pkg\package.json"
  if (-not (Test-Path $pj)) { return '' }
  try { return ((Get-Content -Path $pj -Raw -Encoding UTF8 | ConvertFrom-Json).version + '') } catch { return '' }
}

function Ensure-Tools($spec) {
  Write-Title '2/3  배포 도구(wrangler, firebase-tools) 확인'
  $wantW = $spec.wranglerVersion
  $wantF = $spec.firebaseToolsVersion
  $haveW = Get-InstalledPkgVersion 'wrangler'
  $haveF = Get-InstalledPkgVersion 'firebase-tools'
  $binOk = (Test-Path (Join-Path $ToolsBin 'wrangler.cmd')) -and (Test-Path (Join-Path $ToolsBin 'firebase.cmd'))
  if ($haveW -eq $wantW -and $haveF -eq $wantF -and $binOk) {
    Write-Ok "wrangler $haveW, firebase-tools $haveF 준비되어 있음"
    return
  }
  if ($haveW -or $haveF) { Write-Warn "버전이 다르거나 불완전하여 다시 설치합니다 (현재: wrangler '$haveW', firebase-tools '$haveF')." }

  if (-not (Test-Internet)) {
    Fail-With '인터넷에 연결할 수 없습니다.' '연결을 확인하고 다시 실행하세요.'
  }
  New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null
  $pkgJson = Join-Path $ToolsDir 'package.json'
  if (-not (Test-Path $pkgJson)) {
    '{ "name": "fsg-installer-tools", "private": true, "description": "installer runtime tools (auto-generated)" }' | Set-Content -Path $pkgJson -Encoding UTF8
  }
  $env:PATH = "$NodeDir;$env:PATH"
  $env:npm_config_cache = Join-Path $RuntimeRoot 'npm-cache'
  $env:npm_config_update_notifier = 'false'
  $env:npm_config_fund = 'false'
  $env:npm_config_audit = 'false'
  $env:NO_UPDATE_NOTIFIER = '1'

  Write-Step "npm 으로 설치 중: wrangler@$wantW, firebase-tools@$wantF"
  Write-Step '약 100MB, 인터넷 속도에 따라 2~6분 걸립니다. 진행 막대가 멈춘 듯 보여도 기다려 주세요.'
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $npmArgs = @('install', '--prefix', "`"$ToolsDir`"", '--no-package-lock', '--loglevel=notice', "wrangler@$wantW", "firebase-tools@$wantF")
  $rc = Run-Native -File $NpmCmd -Arguments $npmArgs -WorkDir $ToolsDir
  $sw.Stop()
  if ($rc -ne 0) {
    Fail-With "npm 설치가 실패했습니다 (코드 $rc, $([int]$sw.Elapsed.TotalSeconds)초)." '다시 실행하면 이어서 시도합니다. 반복되면 -Reset 옵션으로 실행환경을 새로 만드세요:  설치.cmd -Reset'
  }
  $haveW = Get-InstalledPkgVersion 'wrangler'
  $haveF = Get-InstalledPkgVersion 'firebase-tools'
  $binOk = (Test-Path (Join-Path $ToolsBin 'wrangler.cmd')) -and (Test-Path (Join-Path $ToolsBin 'firebase.cmd'))
  if ($haveW -ne $wantW -or $haveF -ne $wantF -or -not $binOk) {
    Fail-With "설치 결과가 예상과 다릅니다 (wrangler '$haveW', firebase-tools '$haveF', 실행파일: $binOk)."
  }
  Write-Ok "wrangler $haveW, firebase-tools $haveF 설치 완료 ($([int]$sw.Elapsed.TotalSeconds)초)"
}

# ---------- 업데이트: 최신 배포본으로 프로그램 파일 교체 ----------
$DefaultUpdateUrl = 'https://codeload.github.com/allmightyrock-cpu/congregation-field-service-group-kit/zip/refs/heads/main'
function Read-KitVersion([string]$dir) {
  try { return ((Get-Content -Path (Join-Path $dir 'VERSION.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version + '') } catch { return '' }
}
function Update-Kit {
  Write-Title '업데이트  최신 배포본 내려받기'
  $url = if ($UpdateUrl) { $UpdateUrl } elseif ($env:FSG_UPDATE_URL) { $env:FSG_UPDATE_URL } else { $DefaultUpdateUrl }
  if (-not (Test-Internet)) { Fail-With '인터넷에 연결할 수 없습니다.' '연결을 확인하고 다시 실행하세요.' }
  New-Item -ItemType Directory -Force -Path $DownloadDir | Out-Null
  $zip = Join-Path $DownloadDir 'kit-update.zip'
  if (Test-Path $zip) { Remove-Item $zip -Force }
  Write-Step "내려받는 중: $url"
  try { Download-File -Url $url -Dest $zip } catch { Fail-With "내려받기 실패: $($_.Exception.Message)" '잠시 후 다시 실행하세요.' }

  Write-Step '압축 푸는 중...'
  $tmpX = Join-Path $DownloadDir ('update-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Force -Path $tmpX | Out-Null
  try {
    Expand-Archive -Path $zip -DestinationPath $tmpX -Force
    $src = $tmpX
    if (-not (Test-Path (Join-Path $src 'VERSION.json'))) {
      $inner = Get-ChildItem -Path $tmpX -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'VERSION.json') } | Select-Object -First 1
      if (-not $inner) { Fail-With '내려받은 파일이 배포본이 아닙니다(VERSION.json 없음).' }
      $src = $inner.FullName
    }
    $oldVer = Read-KitVersion $KitRoot
    $newVer = Read-KitVersion $src
    Write-Step "현재 버전: $oldVer  →  새 버전: $newVer"

    # 보존: 회중 설정 파일(dist/config.js), 진행 상태(.install), 키(.secrets)
    $cfg = Join-Path $KitRoot 'web\dist\config.js'
    $cfgBackup = Join-Path $DownloadDir 'config.backup.js'
    if (Test-Path $cfg) { Copy-Item $cfg $cfgBackup -Force }

    $skip = @('.git', '.install', '.secrets', 'node_modules', '.github')
    # 오래된 빌드 파일이 쌓이지 않도록 dist\assets 는 비우고 새로 채움
    $assets = Join-Path $KitRoot 'web\dist\assets'
    if (Test-Path $assets) { Remove-Item $assets -Recurse -Force }
    foreach ($e in Get-ChildItem -Path $src -Force) {
      if ($skip -contains $e.Name) { continue }
      $target = Join-Path $KitRoot $e.Name
      if ($e.PSIsContainer) {
        # 하위 node_modules 는 건드리지 않고 나머지를 덮어씀
        Get-ChildItem -Path $e.FullName -Recurse -Force | Where-Object { $_.FullName -notmatch '\\node_modules(\\|$)' } | ForEach-Object {
          $rel = $_.FullName.Substring($e.FullName.Length)
          $dest = Join-Path $target $rel
          if ($_.PSIsContainer) { New-Item -ItemType Directory -Force -Path $dest | Out-Null }
          else { New-Item -ItemType Directory -Force -Path (Split-Path -Parent $dest) | Out-Null; Copy-Item $_.FullName $dest -Force }
        }
      } else {
        Copy-Item $e.FullName $target -Force
      }
    }
    if (Test-Path $cfgBackup) {
      $bk = Get-Content -Path $cfgBackup -Raw -Encoding UTF8
      if ($bk -match 'projectId:\s*"[^"]+"') { Copy-Item $cfgBackup $cfg -Force; Write-Step '회중 설정 파일(config.js) 보존' }
    }
    Write-Ok "프로그램 파일 교체 완료 ($oldVer → $newVer). 설정·키·데이터는 그대로입니다."
  } finally {
    if (Test-Path $tmpX) { Remove-Item $tmpX -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

# ---------- 단계 3: 설치 도우미 실행 ----------
function Start-InstallerServer {
  Write-Title '3/3  설치 도우미 실행'
  if (-not (Test-Path $ServerPath)) { Fail-With 'installer\server.mjs 파일이 없습니다.' '배포본 압축을 전부 풀었는지 확인하세요.' }
  $env:PATH = "$NodeDir;$ToolsBin;$env:PATH"
  $env:FSG_KIT_ROOT = $KitRoot
  $env:FSG_RUNTIME_DIR = $RuntimeRoot
  $env:FSG_INSTALLER_LOG = $script:LogPath
  if ($NoBrowser) { $env:FSG_NO_BROWSER = '1' }
  if ($Update) { $env:FSG_MODE = 'update' }
  Write-Step '브라우저가 자동으로 열립니다. 이 창은 닫지 말고 그대로 두세요(닫으면 도우미가 종료됩니다).'
  $rc = Run-Native -File $NodeExe -Arguments @("`"$ServerPath`"") -WorkDir $KitRoot
  return $rc
}

# ---------- 본문 ----------
$exitCode = 0
try {
  New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
  $script:LogPath = Join-Path $LogDir ('bootstrap-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.log')
  try { Start-Transcript -Path $script:LogPath -Append | Out-Null } catch {}

  Write-Host ''
  Write-Host '  야외 봉사 집단 배포본 — 설치 도우미' -ForegroundColor White
  Write-Host "  배포본 폴더 : $KitRoot" -ForegroundColor DarkGray
  Write-Host "  실행환경    : $RuntimeRoot" -ForegroundColor DarkGray

  if ($PSVersionTable.PSVersion.Major -lt 5) {
    Fail-With "PowerShell 5.1 이상이 필요합니다 (현재 $($PSVersionTable.PSVersion))." 'Windows 10/11 에서 실행하세요.'
  }
  $spec = Get-Spec
  $archKey = Get-ArchKey

  if ($Reset) {
    Write-Warn '요청에 따라 실행환경을 지우고 다시 준비합니다.'
    foreach ($d in @($NodeDir, $ToolsDir, $DownloadDir, (Join-Path $RuntimeRoot 'npm-cache'))) {
      if (Test-Path $d) { Remove-Item -Path $d -Recurse -Force }
    }
  }

  $drive = (Split-Path -Qualifier $RuntimeRoot).TrimEnd(':')
  try {
    $free = (Get-PSDrive -Name $drive).Free
    if ($free -lt 1GB) { Fail-With "디스크 여유 공간이 부족합니다 ($drive 드라이브 $([math]::Round($free/1MB)) MB)." '1GB 이상 비우고 다시 실행하세요.' }
  } catch { if ($_.Exception.Message -like 'BOOTSTRAP_FAILED*') { throw } }

  Ensure-Node -spec $spec -archKey $archKey
  Ensure-Tools -spec $spec
  if ($Update) { Update-Kit }

  if ($NoLaunch) {
    Write-Host ''
    Write-Ok '실행환경 준비가 끝났습니다 (-NoLaunch: 설치 화면은 열지 않음).'
  } else {
    $exitCode = Start-InstallerServer
  }
} catch {
  $msg = $_.Exception.Message
  if ($msg -notlike 'BOOTSTRAP_FAILED*') {
    Write-Fail "예상하지 못한 오류: $msg"
    if ($script:LogPath) { Write-Host "         기록 파일: $script:LogPath" -ForegroundColor DarkGray }
  }
  $exitCode = 1
} finally {
  try { Stop-Transcript | Out-Null } catch {}
}
exit $exitCode
