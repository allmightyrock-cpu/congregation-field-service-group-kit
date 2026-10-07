// 집단 감독자(집단 로그인) 권한 — firestore.rules 가 요구하는 claim 과 같아야 한다.
//   canWriteBoard      → 우리 집단 소식 게시(boards/{g})
//   canReadReports / canWriteReports → 봉사 보고 현황 열람·대리 제출
//   canReadShepherding / canWriteShepherding → 양치는 일 기록
// 주소록(canReadContacts/canWriteContacts)은 주지 않는다: 규칙상 집단 감독자는 groupKeys 로 자기 집단만 열람하고,
// canWriteContacts 가 있으면 전체 주소록을 수정할 수 있게 되므로 서기 전용이다.

export function groupClaims(key) {
  return {
    kind: 'editor',
    role: 'group',
    groupKeys: [key],
    noticeKeys: [],
    canWriteBoard: [key],
    canReadReports: [key],
    canWriteReports: [key],
    canReadShepherding: [key],
    canWriteShepherding: [key]
  };
}

function toValue(v) {
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (v && typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
  return { nullValue: null };
}

function fromValue(f) {
  if (!f) return null;
  if ('stringValue' in f) return f.stringValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('arrayValue' in f) return (f.arrayValue.values || []).map(fromValue);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return null;
}

// 이미 설치된 프로젝트의 pinCredentials/group-* 에서 claims 만 바로잡는다(PIN 해시·활성 여부는 건드리지 않음).
export async function fixGroupClaims({ base, token, fetchFn = fetch, log = () => {} }) {
  const headers = { authorization: `Bearer ${token}` };
  const res = await fetchFn(`${base}/pinCredentials?pageSize=300`, { headers });
  if (!res.ok) throw new Error(`pinCredentials 목록 읽기 실패: ${res.status} ${await res.text()}`);
  const body = await res.json();
  let fixed = 0;
  for (const d of body.documents || []) {
    const id = String(d.name || '').split('/').pop();
    const scope = fromValue(d.fields?.scope);
    if (scope !== 'group' || !id.startsWith('group-')) continue;
    const key = fromValue(d.fields?.key) || id.slice('group-'.length);
    const current = fromValue(d.fields?.claims) || {};
    const next = { ...current, ...groupClaims(key) };
    delete next.canReadContacts;
    delete next.canWriteContacts;
    if (JSON.stringify(sortKeys(current)) === JSON.stringify(sortKeys(next))) continue;
    const r = await fetchFn(`${base}/pinCredentials/${id}?updateMask.fieldPaths=claims`, {
      method: 'PATCH',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { claims: toValue(next) } })
    });
    if (!r.ok) throw new Error(`claims 수정 실패 ${id}: ${r.status} ${await r.text()}`);
    fixed++;
    log(`집단 감독자 권한 보정: ${id}`);
  }
  return fixed;
}

function sortKeys(o) {
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
}
