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
  s = s.replace(/("?(?:pin|password|secret)"?\s*[:=]\s*"?)([^"\s,}]+)/gi, '$1[가려짐]');
  return s;
}

// CLI 출력 → 사용자 메시지 매핑(기본 패턴). 일치하지 않으면 null.
export function mapCliError(text, context = '') {
  const t = String(text || '');
  const has = (re) => re.test(t);
  if (has(/ENOTFOUND|ECONNRESET|ETIMEDOUT|EAI_AGAIN|getaddrinfo|network (error|timeout)|fetch failed/i)) {
    return new InstallError('NETWORK', '인터넷 연결이 불안정해요. 연결을 확인한 뒤 다시 시도하세요.', { detail: t });
  }
  if (has(/not logged in|login required|Authentication Error|invalid_grant|Failed to authenticate|credentials? (are|is) (no longer|not) valid|Please run.*login/i)) {
    return new InstallError('AUTH_EXPIRED', '로그인이 풀렸어요. 다시 로그인하면 이어서 진행됩니다.', {
      actions: [{ id: 'relogin', label: '다시 로그인' }], detail: t
    });
  }
  if (has(/already exists|ALREADY_EXISTS|already in use|is already taken|Requested entity already exists/i)) {
    return new InstallError('NAME_TAKEN', '이 이름은 이미 사용 중이에요. 다른 이름으로 진행할까요?', {
      actions: [{ id: 'suffix', label: '뒤에 -2 붙여서 진행' }, { id: 'rename', label: '직접 입력' }], detail: t
    });
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
