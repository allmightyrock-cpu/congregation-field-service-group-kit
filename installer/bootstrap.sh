#!/bin/bash
# 야외 봉사 집단 배포본 — 설치 도우미 부트스트랩 (macOS, bash 3.2 호환)
#
# 역할: Node.js가 없는 Mac에서도 동작하도록
#   1) 포터블 Node.js를 내려받아 검증(SHA-256)하고
#   2) wrangler / firebase-tools 를 그 Node로 설치한 뒤
#   3) 설치 도우미 서버(installer/server.mjs)를 실행해 브라우저를 연다.
# 실행환경 위치(배포본 폴더 밖):
#   기본 ~/Library/Application Support/FSG_Installer/runtime   (환경변수 FSG_RUNTIME_DIR 로 변경)
# 다시 실행해도 안전: 이미 준비된 항목은 건너뛴다.
#
# 옵션:  --reset       실행환경을 지우고 처음부터 다시 준비
#        --no-launch   실행환경만 준비하고 설치 화면은 열지 않음(점검용)
#        --no-browser  서버는 실행하되 브라우저 자동 열기는 생략

set -u

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT_ROOT="$(dirname "$INSTALLER_DIR")"
RUNTIME_ROOT="${FSG_RUNTIME_DIR:-$HOME/Library/Application Support/FSG_Installer/runtime}"
NODE_DIR="$RUNTIME_ROOT/node"
NODE_BIN="$NODE_DIR/bin/node"
NPM_BIN="$NODE_DIR/bin/npm"
TOOLS_DIR="$RUNTIME_ROOT/tools"
TOOLS_BIN="$TOOLS_DIR/node_modules/.bin"
DOWNLOAD_DIR="$RUNTIME_ROOT/downloads"
LOG_DIR="$RUNTIME_ROOT/logs"
SPEC="$INSTALLER_DIR/runtime.json"
SERVER="$INSTALLER_DIR/server.mjs"

RESET=0; NO_LAUNCH=0; NO_BROWSER=0
for a in "$@"; do
  case "$a" in
    --reset) RESET=1 ;;
    --no-launch) NO_LAUNCH=1 ;;
    --no-browser) NO_BROWSER=1 ;;
    *) echo "알 수 없는 옵션: $a (사용 가능: --reset --no-launch --no-browser)"; exit 2 ;;
  esac
done

# ---------- 출력 ----------
title() { printf '\n==== %s ====\n' "$1"; }
step()  { printf '  - %s\n' "$1"; }
ok()    { printf '  [완료] %s\n' "$1"; }
warn()  { printf '  [주의] %s\n' "$1"; }
fail() {
  printf '\n  [실패] %s\n' "$1"
  [ -n "${2:-}" ] && printf '         %s\n' "$2"
  [ -n "${LOG_PATH:-}" ] && printf '         기록 파일: %s\n' "$LOG_PATH"
  exit 1
}

json_get() {  # 평평한 runtime.json 에서 "key": "value" 한 줄을 읽는다(python/jq 불필요)
  sed -n "s/^[[:space:]]*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$SPEC" | head -n 1
}

sha256_of() { shasum -a 256 "$1" | awk '{print $1}'; }

have_internet() { curl -fsI --max-time 20 https://nodejs.org/dist/ >/dev/null 2>&1; }

# ---------- 준비 ----------
mkdir -p "$LOG_DIR" || fail "실행환경 폴더를 만들 수 없습니다: $RUNTIME_ROOT"
LOG_PATH="$LOG_DIR/bootstrap-$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG_PATH") 2>&1

printf '\n  야외 봉사 집단 배포본 — 설치 도우미\n'
printf '  배포본 폴더 : %s\n' "$KIT_ROOT"
printf '  실행환경    : %s\n' "$RUNTIME_ROOT"

[ "$(uname -s)" = "Darwin" ] || fail "이 실행 파일은 macOS 전용입니다 ($(uname -s))." "Windows 에서는 설치.cmd 를 사용하세요."
[ -f "$SPEC" ] || fail "installer/runtime.json 파일이 없습니다." "배포본 압축을 전부 풀었는지 확인하세요."
command -v curl >/dev/null 2>&1 || fail "curl 이 없습니다." "macOS 기본 구성에 포함되어 있어야 합니다."
command -v shasum >/dev/null 2>&1 || fail "shasum 이 없습니다."

case "$(uname -m)" in
  arm64) ARCH_KEY="darwin-arm64" ;;
  x86_64) ARCH_KEY="darwin-x64" ;;
  *) fail "지원하지 않는 CPU 종류입니다: $(uname -m)" ;;
esac

NODE_VERSION="$(json_get nodeVersion)"
NODE_BASE_URL="$(json_get nodeBaseUrl)"
NODE_FILE="$(json_get "node_${ARCH_KEY}_file")"
NODE_SHA="$(json_get "node_${ARCH_KEY}_sha256")"
WANT_W="$(json_get wranglerVersion)"
WANT_F="$(json_get firebaseToolsVersion)"
[ -n "$NODE_VERSION" ] && [ -n "$NODE_FILE" ] && [ -n "$NODE_SHA" ] || fail "runtime.json 에 $ARCH_KEY 항목이 없습니다."

if [ "$RESET" = "1" ]; then
  warn "요청에 따라 실행환경을 지우고 다시 준비합니다."
  rm -rf "$NODE_DIR" "$TOOLS_DIR" "$DOWNLOAD_DIR" "$RUNTIME_ROOT/npm-cache"
fi

FREE_KB="$(df -k "$RUNTIME_ROOT" 2>/dev/null | awk 'NR==2 {print $4}')"
if [ -n "${FREE_KB:-}" ] && [ "$FREE_KB" -lt 1048576 ]; then
  fail "디스크 여유 공간이 부족합니다 ($((FREE_KB/1024)) MB)." "1GB 이상 비우고 다시 실행하세요."
fi

# ---------- 1/3 Node.js ----------
title "1/3  실행환경(Node.js) 확인"
WANT_NODE="v$NODE_VERSION"
if [ -x "$NODE_BIN" ]; then
  HAVE_NODE="$("$NODE_BIN" -v 2>/dev/null || true)"
  if [ "$HAVE_NODE" = "$WANT_NODE" ]; then
    ok "Node.js $HAVE_NODE 준비되어 있음 ($NODE_DIR)"
  else
    warn "다른 버전($HAVE_NODE)이 있어 $WANT_NODE 로 다시 준비합니다."
    rm -rf "$NODE_DIR"
  fi
fi
if [ ! -x "$NODE_BIN" ]; then
  mkdir -p "$DOWNLOAD_DIR"
  TARBALL="$DOWNLOAD_DIR/$NODE_FILE"
  URL="$NODE_BASE_URL$NODE_FILE"
  NEED_DL=1
  if [ -f "$TARBALL" ]; then
    step "이전에 받아 둔 파일을 검사합니다..."
    if [ "$(sha256_of "$TARBALL")" = "$NODE_SHA" ]; then NEED_DL=0; ok "이전에 받은 파일이 정상이라 다시 받지 않습니다."
    else warn "이전 파일이 손상되어 다시 받습니다."; rm -f "$TARBALL"; fi
  fi
  if [ "$NEED_DL" = "1" ]; then
    have_internet || fail "인터넷에 연결할 수 없습니다 (nodejs.org 접속 실패)." "와이파이/인터넷 연결을 확인하고 다시 실행하세요."
    step "Node.js $WANT_NODE 내려받는 중 (약 50MB, 한 번만)"
    step "$URL"
    if ! curl -fL --progress-bar --retry 3 -o "$TARBALL.part" "$URL"; then
      rm -f "$TARBALL.part"
      fail "내려받기 실패." "잠시 후 다시 실행하세요. 계속 실패하면 다른 네트워크에서 시도하세요."
    fi
    mv -f "$TARBALL.part" "$TARBALL"
  fi
  step "파일 무결성(SHA-256) 확인 중..."
  GOT="$(sha256_of "$TARBALL")"
  if [ "$GOT" != "$NODE_SHA" ]; then
    rm -f "$TARBALL"
    fail "내려받은 파일이 원본과 다릅니다(변조 또는 전송 오류). 파일을 지웠습니다." "다시 실행하면 새로 내려받습니다."
  fi
  ok "무결성 확인 통과"
  step "압축 푸는 중..."
  TMPX="$DOWNLOAD_DIR/extract-$$"
  rm -rf "$TMPX"; mkdir -p "$TMPX"
  tar -xzf "$TARBALL" -C "$TMPX" || { rm -rf "$TMPX"; fail "압축 풀기 실패."; }
  INNER="$(find "$TMPX" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [ -n "$INNER" ] && [ -x "$INNER/bin/node" ] || { rm -rf "$TMPX"; fail "압축 내용이 예상과 다릅니다(bin/node 없음)."; }
  mkdir -p "$RUNTIME_ROOT"
  mv "$INNER" "$NODE_DIR"
  rm -rf "$TMPX"
  xattr -dr com.apple.quarantine "$NODE_DIR" 2>/dev/null || true
  HAVE_NODE="$("$NODE_BIN" -v 2>/dev/null || true)"
  [ "$HAVE_NODE" = "$WANT_NODE" ] || fail "Node.js 실행 확인 실패(버전: '$HAVE_NODE')."
  ok "Node.js $HAVE_NODE 준비 완료 ($NODE_DIR)"
fi

# ---------- 2/3 도구 ----------
title "2/3  배포 도구(wrangler, firebase-tools) 확인"
pkg_version() {  # node_modules/<pkg>/package.json 의 version
  local pj="$TOOLS_DIR/node_modules/$1/package.json"
  [ -f "$pj" ] || { echo ""; return; }
  sed -n 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$pj" | head -n 1
}
HAVE_W="$(pkg_version wrangler)"
HAVE_F="$(pkg_version firebase-tools)"
if [ "$HAVE_W" = "$WANT_W" ] && [ "$HAVE_F" = "$WANT_F" ] && [ -x "$TOOLS_BIN/wrangler" ] && [ -x "$TOOLS_BIN/firebase" ]; then
  ok "wrangler $HAVE_W, firebase-tools $HAVE_F 준비되어 있음"
else
  [ -n "$HAVE_W$HAVE_F" ] && warn "버전이 다르거나 불완전하여 다시 설치합니다 (현재: wrangler '$HAVE_W', firebase-tools '$HAVE_F')."
  have_internet || fail "인터넷에 연결할 수 없습니다." "연결을 확인하고 다시 실행하세요."
  mkdir -p "$TOOLS_DIR"
  [ -f "$TOOLS_DIR/package.json" ] || printf '{ "name": "fsg-installer-tools", "private": true, "description": "installer runtime tools (auto-generated)" }\n' > "$TOOLS_DIR/package.json"
  export PATH="$NODE_DIR/bin:$PATH"
  export npm_config_cache="$RUNTIME_ROOT/npm-cache"
  export npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false NO_UPDATE_NOTIFIER=1
  step "npm 으로 설치 중: wrangler@$WANT_W, firebase-tools@$WANT_F"
  step "약 100MB, 인터넷 속도에 따라 2~6분 걸립니다. 진행 막대가 멈춘 듯 보여도 기다려 주세요."
  T0=$(date +%s)
  if ! "$NPM_BIN" install --prefix "$TOOLS_DIR" --no-package-lock --loglevel=notice "wrangler@$WANT_W" "firebase-tools@$WANT_F"; then
    fail "npm 설치가 실패했습니다 ($(( $(date +%s) - T0 ))초)." "다시 실행하면 이어서 시도합니다. 반복되면:  bash 설치.command --reset"
  fi
  HAVE_W="$(pkg_version wrangler)"; HAVE_F="$(pkg_version firebase-tools)"
  { [ "$HAVE_W" = "$WANT_W" ] && [ "$HAVE_F" = "$WANT_F" ] && [ -x "$TOOLS_BIN/wrangler" ] && [ -x "$TOOLS_BIN/firebase" ]; } \
    || fail "설치 결과가 예상과 다릅니다 (wrangler '$HAVE_W', firebase-tools '$HAVE_F')."
  ok "wrangler $HAVE_W, firebase-tools $HAVE_F 설치 완료 ($(( $(date +%s) - T0 ))초)"
fi

# ---------- 3/3 실행 ----------
if [ "$NO_LAUNCH" = "1" ]; then
  printf '\n'; ok "실행환경 준비가 끝났습니다 (--no-launch: 설치 화면은 열지 않음)."
  exit 0
fi
title "3/3  설치 도우미 실행"
[ -f "$SERVER" ] || fail "installer/server.mjs 파일이 없습니다." "배포본 압축을 전부 풀었는지 확인하세요."
export PATH="$NODE_DIR/bin:$TOOLS_BIN:$PATH"
export FSG_KIT_ROOT="$KIT_ROOT" FSG_RUNTIME_DIR="$RUNTIME_ROOT" FSG_INSTALLER_LOG="$LOG_PATH"
[ "$NO_BROWSER" = "1" ] && export FSG_NO_BROWSER=1
step "브라우저가 자동으로 열립니다. 이 터미널 창은 닫지 말고 그대로 두세요(닫으면 도우미가 종료됩니다)."
cd "$KIT_ROOT" || exit 1
exec "$NODE_BIN" "$SERVER"
