// 공개 강연 제목(S-99) 번호↔제목 조회.
import { TALK_TITLES } from './talk-titles-data.js';

export { TALK_TITLES };

// 번호 → 제목 (미사용/없는 번호면 '')
export function titleByNo(no) {
  const key = String(no == null ? '' : no).trim().replace(/\.$/, '');
  if (!/^\d+$/.test(key)) return '';
  return TALK_TITLES[key] || '';
}

// 정규화(선행 "번호.", 공백·따옴표 제거)로 느슨한 역매칭용 키
function normTitle(s) {
  return String(s || '')
    .replace(/^\s*\d+\.?\s*/, '')
    .replace(/[\s"“”'‘’]/g, '')
    .trim();
}

const NORM_TO_NO = (() => {
  const m = {};
  for (const [k, v] of Object.entries(TALK_TITLES)) {
    const nk = normTitle(v);
    if (nk && !(nk in m)) m[nk] = k;
  }
  return m;
})();

// 제목 → 번호 ('' 없으면). "142. 제목" 형태면 앞 번호 우선, 아니면 제목 정규화 매칭.
export function noByTitle(title) {
  const t = String(title || '').trim();
  const lead = /^(\d+)\.?\s/.exec(t);
  if (lead && TALK_TITLES[lead[1]]) return lead[1];
  return NORM_TO_NO[normTitle(t)] || '';
}

// ── 사용 중지 골자 ────────────────────────────────────────
// 아래 45분 길이 골자는 30분 골자로 개정되기 전까지 사용하지 않음.
// (2026년 5월 광고·유의 사항) → 2026-09-01부터 사용 금지.
export const RETIRED_FROM = '2026-09-01';
export const RETIRED_TALK_NOS = new Set([
  '84', '85', '87', '92', '94', '97', '105', '106', '109', '117',
  '119', '120', '124', '126', '139', '141', '144', '145', '148', '149',
  '151', '154', '155', '157', '158', '163', '164', '165', '167', '168'
]);

// 이 번호를 이 날짜에 쓰면 안 되는가? (날짜 미정이면 주의 표시)
export function isRetiredTalkNo(no, date) {
  const key = String(no == null ? '' : no).trim().replace(/\.$/, '');
  if (!RETIRED_TALK_NOS.has(key)) return false;
  const d = String(date || '').trim();
  return !d || d >= RETIRED_FROM;   // ISO(YYYY-MM-DD) 문자열 비교
}

// "번호. 제목" 조합 문자열 (번호 없으면 제목만, 제목 없으면 번호만)
export function numberedTitle(no, title) {
  const n = String(no || '').trim();
  const t = String(title || '').trim();
  if (n && t) return `${n}. ${t}`;
  return t || (n ? `${n}번` : '');
}
