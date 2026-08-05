// 출판물 신청 부수 — 고정(standing) 모델.
//   집단당 문서 1개(groups/{g}/publicationDistributions/standing)에 품목별 성원 부수만 저장.
//   월 개념 없음, 배부 체크 없음. 변동 생길 때만 수정하고 그 전까지 고정 유지.

export const PUBLICATION_ITEMS = [
  { key: 'watchtowerRegular', label: '파수대', full: '연구용 파수대(일반)' },
  { key: 'watchtowerLarge', label: '대형활자', full: '연구용 파수대 대형활자' },
  { key: 'meetingWorkbook', label: '집회 교재', full: '평일 집회 교재' }
];

export const STANDING_DOC_ID = 'standing';
const MAX_COPIES = 99;

// 저장 문서 → 정규화 { counts: { itemKey: { memberId: n } }, createdAt }
export function normalizePublicationDoc(source = {}) {
  const src = source || {};
  const counts = {};
  for (const item of PUBLICATION_ITEMS) counts[item.key] = cleanCountMap(src.counts?.[item.key]);
  return { counts, createdAt: src.createdAt };
}

// 규칙 계약(counts/updatedBy/updatedAt/createdAt)만 담은 저장 payload
export function buildPublicationPayload(docLike, uid, timestamp) {
  const n = normalizePublicationDoc(docLike);
  const payload = { counts: n.counts, updatedBy: uid, updatedAt: timestamp };
  if (docLike?.createdAt) payload.createdAt = docLike.createdAt;
  return payload;
}

// 성원 부수 설정 (0 이하 = 미신청 → 제거)
export function setMemberCount(docLike, itemKey, memberId, count) {
  if (!memberId || !docLike.counts?.[itemKey]) return docLike;
  const n = clampCount(count);
  if (n > 0) docLike.counts[itemKey][memberId] = n;
  else delete docLike.counts[itemKey][memberId];
  return docLike;
}

export function memberCount(docLike, itemKey, memberId) {
  const n = Number(docLike.counts?.[itemKey]?.[memberId]) || 0;
  return n > 0 ? n : 0;
}

// 집단 요약: 품목별 부수 합계 + 신청자 수 (활성 성원만)
export function publicationSummary(docLike, members = []) {
  const activeIds = new Set(activeMembers(members).map((m) => m.id));
  const rows = PUBLICATION_ITEMS.map((item) => {
    const map = docLike.counts?.[item.key] || {};
    let copies = 0;
    let requesters = 0;
    for (const [id, value] of Object.entries(map)) {
      if (!activeIds.has(id)) continue;
      const n = Number(value) || 0;
      if (n > 0) { copies += n; requesters += 1; }
    }
    return { key: item.key, label: item.label, copies, requesters };
  });
  return { rows, totalCopies: rows.reduce((sum, r) => sum + r.copies, 0) };
}

function clampCount(value) {
  const n = Math.floor(Number(value) || 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, MAX_COPIES);
}

function cleanCountMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof key !== 'string' || key.length > 80) continue;
    const n = clampCount(raw);
    if (n > 0) out[key] = n;
  }
  return out;
}

function activeMembers(members) {
  return members.filter((member) => member?.id && member.active !== false);
}
