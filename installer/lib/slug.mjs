// 회중 이름 → 영문 이름(slug) 제안. 한글은 국어의 로마자 표기법(간이) 으로 바꾼다.
// 목적: Firebase 프로젝트 ID / Worker 이름 / Pages 프로젝트 이름 자동 제안. 사용자는 수정 가능.

const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
const JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'l', 'l', 'l', 'p', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];

export function romanize(text) {
  let out = '';
  for (const ch of String(text || '')) {
    const code = ch.codePointAt(0);
    if (code >= 0xac00 && code <= 0xd7a3) {
      const i = code - 0xac00;
      const cho = Math.floor(i / 588), jung = Math.floor((i % 588) / 28), jong = i % 28;
      out += CHO[cho] + JUNG[jung] + JONG[jong];
    } else {
      out += ch;
    }
  }
  return out;
}

// 회중 이름에서 흔한 접미어("회중")는 빼고 slug 생성
export function suggestSlug(congName) {
  const base = String(congName || '').replace(/회중/g, ' ').trim();
  let s = romanize(base).toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  if (!s) s = 'cong';
  if (!/^[a-z]/.test(s)) s = 'c-' + s;
  if (s.length > 22) s = s.slice(0, 22).replace(/-+$/g, '');
  while (s.length < 4) s += 'x';
  return s;
}

// slug → 각 서비스 이름 제안
export function namesFromSlug(slug) {
  const s = String(slug || '').toLowerCase();
  return {
    projectId: `${s}-fsg`,            // Firebase 프로젝트 ID (6~30자, 소문자·숫자·하이픈)
    workerName: `${s}-fsg-api`,       // Cloudflare Worker 이름
    pagesProject: `${s}-fsg`          // Cloudflare Pages 프로젝트 이름 → https://<name>.pages.dev
  };
}

export function defaultGroupNames(count) {
  const n = Math.max(1, Math.min(12, Number(count) || 1));
  return Array.from({ length: n }, (_, i) => ({ key: `group${i + 1}`, name: `${i + 1}집단` }));
}
