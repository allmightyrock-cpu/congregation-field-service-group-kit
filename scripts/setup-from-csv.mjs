import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAccessToken } from '../worker/src/oauth.js';
import { makeCredential } from '../worker/src/pin.js';
import { resolveReportConfig } from '../shared/report-period.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const templatesDir = process.env.TEMPLATE_DIR || resolve(ROOT, 'templates');
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS 환경 변수에 Firebase 서비스 계정 JSON 파일 경로를 지정해 주세요.');
}

const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;

if (!projectId) {
  throw new Error('FIREBASE_PROJECT_ID 또는 서비스 계정 JSON의 project_id가 필요합니다.');
}

const accessToken = await getAccessToken(serviceAccount);
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

function csv(name) {
  const text = readFileSync(resolve(templatesDir, name), 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim() && !line.trim().startsWith('#'));
  if (!lines.length) return [];
  const headers = splitCsvLine(lines.shift());
  return lines.map((line) => Object.fromEntries(splitCsvLine(line).map((value, i) => [headers[i], value])));
}

function splitCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function bool(value, fallback = false) {
  const v = String(value ?? '').trim().toLowerCase();
  if (['true', 'yes', 'y', '1', '예'].includes(v)) return true;
  if (['false', 'no', 'n', '0', '아니요'].includes(v)) return false;
  return fallback;
}

function list(value) {
  const v = String(value || '').trim();
  if (!v) return [];
  if (v === '*') return ['*'];
  return v.split('|').map((x) => x.trim()).filter(Boolean);
}

function claimBool(row, key) {
  return bool(row[key]);
}

function memberId(groupKey, seq) {
  return `${groupKey}-${String(Number(seq) || 0).padStart(2, '0')}`;
}

function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
  throw new Error(`지원하지 않는 값 형식입니다: ${typeof v}`);
}

function toFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, toValue(v)]));
}

async function put(path, data) {
  const res = await fetch(`${base}/${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fields: toFields(data) })
  });
  if (!res.ok) throw new Error(`PUT ${path} ${res.status} ${await res.text()}`);
}

const groups = csv('groups.csv');
const members = csv('members.csv');
const roles = csv('roles.csv');
const notices = csv('notices.csv');
const now = new Date().toISOString();
const congName = process.env.CONG_NAME || '샘플 회중';
const report = resolveReportConfig({ congName });

await put('config/app', {
  congName,
  reportPeriodOverride: report.reportPeriodOverride,
  reportPeriod: report.reportPeriod,
  reportOpen: report.reportOpen,
  updatedAt: now,
  updatedBy: 'setup-from-csv'
});

for (const g of groups) {
  await put(`groups/${g.key}`, {
    key: g.key,
    name: g.name,
    overseerName: g.overseerName || '',
    assistantName: g.assistantName || '',
    active: bool(g.active, true),
    sortOrder: Number(g.sortOrder) || 999
  });
}

for (const m of members) {
  if (!String(m.groupKey || '').trim() || !String(m.name || '').trim()) continue;
  const id = memberId(m.groupKey, m.seq);
  await put(`groups/${m.groupKey}/members/${id}`, {
    name: m.name,
    displayName: m.displayName || m.name,
    seq: Number(m.seq) || 0,
    gender: m.gender || '',
    role: m.role || '성원',
    regularPioneer: bool(m.regularPioneer),
    active: bool(m.active, true),
    updatedAt: now,
    updatedBy: 'setup-from-csv'
  });
  if (m.note) await put(`groups/${m.groupKey}/membersPrivate/${id}`, { note: m.note, updatedAt: now });
}

for (const n of notices) {
  await put(`notices/${n.key}`, {
    key: n.key,
    category: n.key === 'cong' ? 'now' : 'fixed',
    title: n.title,
    subtitle: n.subtitle || '',
    body: '',
    order: Number(n.order) || 0,
    visible: bool(n.visible, true),
    urgent: bool(n.urgent, false),
    attachmentUrl: '',
    updatedAt: now,
    updatedBy: 'setup-from-csv'
  });
}

for (const r of roles) {
  const claims = {
    kind: r.kind || 'editor',
    role: r.key,
    groupKeys: list(r.groupKeys),
    noticeKeys: list(r.noticeKeys),
    canReadCongReports: claimBool(r, 'canReadCongReports'),
    canWriteCongMembers: claimBool(r, 'canWriteCongMembers'),
    canManagePublications: claimBool(r, 'canManagePublications'),
    canReadContacts: claimBool(r, 'canReadContacts'),
    canWriteContacts: claimBool(r, 'canWriteContacts'),
    canManagePins: claimBool(r, 'canManagePins'),
    canManageTalks: claimBool(r, 'canManageTalks'),
    canAssignTalkParts: claimBool(r, 'canAssignTalkParts'),
    canManageVisits: claimBool(r, 'canManageVisits')
  };
  await put(`roles/${r.key}`, {
    key: r.key,
    name: r.name,
    personName: r.name,
    noticeKeys: claims.noticeKeys,
    active: true,
    claims,
    updatedAt: now,
    updatedBy: 'setup-from-csv'
  });
  const cred = await makeCredential(String(r.pin || '0000'));
  await put(`pinCredentials/role-${r.key}`, {
    scope: 'role',
    key: r.key,
    active: true,
    claims,
    ...cred,
    updatedAt: now,
    updatedBy: 'setup-from-csv'
  });
}

for (const g of groups) {
  const claims = {
    kind: 'editor',
    role: 'group',
    groupKeys: [g.key],
    canReadReports: [g.key],
    noticeKeys: ['groupnews'],
    canReadContacts: true,
    canWriteContacts: true
  };
  const cred = await makeCredential('0000');
  await put(`pinCredentials/group-${g.key}`, {
    scope: 'group',
    key: g.key,
    active: bool(g.active, true),
    claims,
    ...cred,
    updatedAt: now,
    updatedBy: 'setup-from-csv'
  });
}

console.log(`초기 설정 완료: Firebase project=${projectId}, groups=${groups.length}, members=${members.length}, roles=${roles.length}, notices=${notices.length}`);
