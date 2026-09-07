// 오류 모델: 화면에는 한국어 원인 + 조치만, CLI 원문은 기록에만.
// Step 7 에서 매핑표를 확장한다. 여기서는 구조와 기본 패턴만 둔다.

export class InstallError extends Error {
  /**
   * @param {string} code      기계용 코드 (예: AUTH_EXPIRED)
   * @param {string} message   화면용 한국어 원인
   * @param {object} [opts]    { hint, actions:[{id,label}], detail }
   */
  constructor(code, message, opts = {}) {
    super(message);
    this.name = 'InstallError';
    this.code = code;
    this.hint = opts.hint || '';
    this.actions = opts.actions || [{ id: 'retry', label: '다시 시도' }];
    this.detail = opts.detail || '';
  }
  toJSON() {
    return { code: this.code, message: this.message, hint: this.hint, actions: this.actions, detail: mask(this.detail) };
  }
}

// 비밀값 마스킹: 서비스 계정 키, 토큰, 쿠키, PIN 등
export function mask(text) {
  let s = String(text ?? '');
  s = s.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[비공개 키 가려짐]');
  s = s.replace(/"private_key"\s*:\s*"[^"]*"/g, '"private_key": "[가려짐]"');
  s = s.replace(/"private_key_id"\s*:\s*"[^"]*"/g, '"private_key_id": "[가려짐]"');
  s = s.replace(/\b(ya29\.[A-Za-z0-9_\-]+)/g, '[토큰 가려짐]');
  s = s.replace(/\b(1\/\/[A-Za-z0-9_\-]{20,})/g, '[리프레시토큰 가려짐]');
  s = s.replace(/(Bearer\s+)[A-Za-z0-9._\-]+/gi, '$1[가려짐]');
  s = s.replace(/(authorization["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, '$1[가려짐]');
  s = s.replace(/(api[_-]?token["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi, '$1[가려짐]');
  s = s.replace(/((?:oauth|refresh|access|id)_token\s*=\s*")[^"]+(")/gi, '$1[가려짐]$2');          // wrangler toml
  s = s.replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[JWT 가려짐]');   // customToken/id_token
  s = s.replace(/([?&](?:code|access_token|refresh_token|token)=)[^&\s"']+/gi, '$1[가려짐]');       // OAuth 콜백 주소
  s = s.replace(/("?(?:pin|password|secret|passphrase)"?\s*[:=]\s*"?)([^"\s,}]+)/gi, '$1[가려짐]');
  return s;
}

// CLI 출력 → 사용자 메시지 매핑(계획 6장 오류 모델). 일치하지 않으면 null.
// 순서가 중요: 구체적인 패턴(API 미사용, 결제, 이름 중복)을 일반 패턴(403, 네트워크)보다 먼저 본다.
export function mapCliError(text, context = '') {
  const t = String(text || '');
  const has = (re) => re.test(t);
  const isCf = /wrangler|cloudflare|workers\.dev|pages\.dev|\[code: \d{4,5}\]/i.test(t);

  if (has(/ENOSPC|no space left|디스크 공간/i)) {
    return new InstallError('DISK_FULL', '디스크 공간이 부족해요. 1GB 이상 비우고 다시 시도하세요.', { detail: t });
  }
  if (has(/ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|getaddrinfo|network (error|timeout)|fetch failed|socket hang up|certificate|SELF_SIGNED|UNABLE_TO_GET_ISSUER/i)) {
    return new InstallError('NETWORK', '인터넷 연결이 불안정하거나 보안 프로그램이 막고 있어요. 연결을 확인한 뒤 다시 시도하세요.', {
      hint: '회사·학교 망이나 백신의 "HTTPS 검사" 기능이 원인인 경우가 많아요. 휴대폰 핫스팟으로 시도해 보는 것도 방법입니다.', detail: t
    });
  }
  if (has(/Compilation error in firestore\.rules/i)) {
    return new InstallError('RULES_COMPILE', '데이터 보안 규칙 파일(firestore.rules)에 문법 오류가 있어요. 배포본을 다시 내려받아 덮어쓴 뒤 시도하세요.', { detail: t });
  }
  if (isCf && has(/Authentication error|\[code: 10000\]|Unable to authenticate|not authenticated|token has expired|invalid.*oauth/i)) {
    return new InstallError('AUTH_EXPIRED_CF', 'Cloudflare 로그인이 풀렸어요. 다시 로그인하면 이어서 진행됩니다.', {
      actions: [{ id: 'relogin-cf', label: 'Cloudflare 다시 로그인' }, { id: 'retry', label: '다시 시도' }], detail: t
    });
  }
  if (has(/not logged in|login required|Authentication Error|invalid_grant|Failed to authenticate|credentials? (are|is) (no longer|not) valid|Please run.*login|HTTP Error: 401/i)) {
    return new InstallError('AUTH_EXPIRED', 'Google 로그인이 풀렸어요. 다시 로그인하면 이어서 진행됩니다.', {
      actions: [{ id: 'relogin', label: '다시 로그인' }, { id: 'retry', label: '다시 시도' }], detail: t
    });
  }
  if (has(/BILLING_NOT_ENABLED|billing account|requires billing|billing to be enabled/i)) {
    return new InstallError('BILLING', '이 작업에는 Google 결제 계정 연결이 필요하다고 해요. 보통은 필요 없는 항목이라, 프로젝트를 새로 만들어 다시 시도하는 편이 빠릅니다.', { detail: t });
  }
  if (has(/Requested entity was not found|does not exist|NOT_FOUND.*project/i) && has(/project/i)) {
    return new InstallError('PROJECT_GONE', 'Firebase 프로젝트를 찾을 수 없어요. 삭제되었거나 다른 계정 것이면 3단계에서 프로젝트를 다시 준비하세요.', { detail: t });
  }
  if (isCf && has(/workers\.dev subdomain|register a workers\.dev|subdomain.*not.*(set|registered)/i)) {
    return new InstallError('CF_SUBDOMAIN', 'Cloudflare 계정에 workers.dev 주소가 아직 없어요. 대시보드 → Workers & Pages 에서 subdomain 을 한 번 정한 뒤 다시 시도하세요.', {
      actions: [{ id: 'opencf', label: '대시보드 열기' }, { id: 'retry', label: '다시 시도' }], detail: t
    });
  }
  if (isCf && has(/\[code: 8000007\]|project name .* (already|taken)|already exists/i) && has(/pages/i)) {
    return new InstallError('NAME_TAKEN', '이 사이트 이름은 이미 다른 사람이 쓰고 있어요. 다른 이름으로 진행할까요?', {
      actions: [{ id: 'suffix', label: '뒤에 -2 붙여서 진행' }], detail: t
    });
  }
  if (has(/EADDRINUSE|address already in use/i)) {
    return new InstallError('PORT_BUSY', '로그인용 포트가 이미 사용 중이에요. 다른 wrangler·firebase 창이 열려 있으면 닫고 다시 시도하세요.', { detail: t });
  }
  if (has(/already exists|ALREADY_EXISTS|already in use|is already taken|Requested entity already exists/i)) {
    return new InstallError('NAME_TAKEN', '이 이름은 이미 사용 중이에요. 다른 이름으로 진행할까요?', {
      actions: [{ id: 'suffix', label: '뒤에 -2 붙여서 진행' }, { id: 'rename', label: '직접 입력' }], detail: t
    });
  }
  if (has(/has not been used in project|it is disabled|SERVICE_DISABLED|API has not been enabled/i)) {
    return new InstallError('API_DISABLED', '필요한 Google API 가 아직 켜지지 않았어요. 잠시 후 [다시 시도]를 누르면 도우미가 켜고 이어서 진행합니다.', { detail: t });
  }
  if (has(/PERMISSION_DENIED|permission denied|403|does not have permission|Insufficient Permission/i)) {
    return new InstallError('PERMISSION', '이 계정에 권한이 없어요. 프로젝트 소유자 계정으로 로그인했는지 확인하세요.', {
      actions: [{ id: 'relogin', label: '다른 계정으로 로그인' }], detail: t
    });
  }
  if (has(/quota|RESOURCE_EXHAUSTED|too many projects|exceeded/i)) {
    return new InstallError('QUOTA', 'Google 계정의 프로젝트 개수 한도에 걸렸어요. 안 쓰는 프로젝트를 지우거나 다른 계정을 쓰세요.', { detail: t });
  }
  return null;
}

export function toUserError(err, fallbackMessage) {
  if (err instanceof InstallError) return err;
  const mapped = mapCliError(err?.message || String(err));
  if (mapped) return mapped;
  return new InstallError('UNKNOWN', fallbackMessage || '예상하지 못한 문제가 생겼어요. 잠시 후 다시 시도하세요.', {
    hint: '문제가 반복되면 [기록 복사]로 내용을 복사해 설치 담당자에게 보내 주세요.',
    detail: err?.stack || err?.message || String(err)
  });
}
