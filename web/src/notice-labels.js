export const NOTICE_LABELS = {
  week: '새 소식',
  cong: '회중 광고',
  branch: '지부 서신(PDF)',
  groupnews: '우리 집단 소식',
  duty: '이 달의 봉사·청소 임명',
  visit: '봉사 감독자 방문',
  mid: '평일 집회',
  talk: '공개강연',
  roster: '집단 편성표'
};

const DEPRECATED_NOTICE_KEYS = new Set(['clean', 'fix', 'special', 'roles']);

export function isDeprecatedNoticeKey(key) {
  return DEPRECATED_NOTICE_KEYS.has(String(key || ''));
}
