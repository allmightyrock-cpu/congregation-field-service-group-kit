// Firestore REST (admin) 읽기 헬퍼
// - emulator 모드: http://{emulatorHost}, Authorization: Bearer owner (규칙 우회)
// - signed 모드: https://firestore.googleapis.com, Authorization: Bearer <OAuth 액세스토큰>

function fromValue(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  return undefined;
}
function fromFields(fields) {
  const o = {};
  for (const k of Object.keys(fields)) o[k] = fromValue(fields[k]);
  return o;
}

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  throw new Error('unsupported value: ' + typeof v);
}
function toFields(obj) {
  const f = {};
  for (const k of Object.keys(obj)) f[k] = toValue(obj[k]);
  return f;
}

function baseUrl({ projectId, emulatorHost }) {
  const root = emulatorHost
    ? `http://${emulatorHost}`
    : 'https://firestore.googleapis.com';
  return `${root}/v1/projects/${projectId}/databases/(default)/documents`;
}

// 단일 문서 읽기. 없으면 null.
export async function getDoc({ path, projectId, accessToken, emulatorHost }) {
  const res = await fetch(`${baseUrl({ projectId, emulatorHost })}/${path}`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`FIRESTORE_${res.status}`);
  const data = await res.json();
  return data.fields ? fromFields(data.fields) : {};
}

// 컬렉션 목록 읽기 → [{ id, data }]
export async function listDocs({ path, projectId, accessToken, emulatorHost }) {
  const res = await fetch(`${baseUrl({ projectId, emulatorHost })}/${path}?pageSize=300`, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`FIRESTORE_LIST_${res.status}`);
  const data = await res.json();
  return (data.documents || []).map((d) => ({
    id: d.name.split('/').pop(),
    data: d.fields ? fromFields(d.fields) : {}
  }));
}

// 문서 쓰기(PATCH = 생성/덮어쓰기)
export async function writeDoc({ path, data, projectId, accessToken, emulatorHost }) {
  const res = await fetch(`${baseUrl({ projectId, emulatorHost })}/${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fields: toFields(data) })
  });
  if (!res.ok) throw new Error(`FIRESTORE_WRITE_${res.status}`);
}
