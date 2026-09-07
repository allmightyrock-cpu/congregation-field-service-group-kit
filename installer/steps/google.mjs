// Step 4: Google 자동 프로비저닝 — 로그인 → 프로젝트 → Firestore → 웹 앱 → 설정값 → 로그인 기능(Auth) → 서비스 계정 키
//
// 원칙: 사용자는 로그인만 한다. 나머지는 firebase CLI(--json --non-interactive --account) 와 Google REST 로 처리.
// 모든 함수는 재실행에 안전하다(이미 있으면 재사용).

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { InstallError, mapCliError } from '../lib/errors.mjs';
import { gapi, describeApiError, listAccounts, buildLoginUrl } from '../lib/gauth.mjs';
import { namesFromSlug } from '../lib/slug.mjs';
import { openBrowser } from '../lib/open.mjs';

export const FIRESTORE_LOCATION = 'asia-northeast3'; // 서울
const FB_API = 'https://firebase.googleapis.com/v1beta1';

// firebase CLI 호출 + JSON 결과 파싱(스피너 줄 제거)
async function fb(ctx, email, args, opts = {}) {
  const r = await ctx.exec.run('firebase', [...args, '--account', email, '--json', '--non-interactive'], { timeoutMs: opts.timeoutMs || 8 * 60 * 1000, quiet: !!opts.quiet });
  // JSON 은 표준출력에, 스피너("- Creating…")는 표준오류에 섞여 나온다 → 표준출력 우선, 균형 잡힌 중괄호 범위만 파싱
  const json = parseCliJson(r.stdout) || parseCliJson(r.out);
  return { code: r.code, json, out: r.out };
}
function parseCliJson(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  if (start < 0) return null;
  let end = s.lastIndexOf('}');
  while (end > start) {
    try { return JSON.parse(s.slice(start, end + 1)); } catch {}
    end = s.lastIndexOf('}', end - 1);
  }
  return null;
}
// CLI 는 JSON 오류에 "See firebase-debug.log" 만 남기고 실제 원인은 로그 파일에 쓴다 → 로그에서 HTTP 오류 줄을 꺼내 온다.
function readDebugLog(ctx) {
  try {
    const p = path.join(ctx.kitRoot, 'firebase-debug.log');
    const text = fs.readFileSync(p, 'utf8');
    const lines = text.split(/\r?\n/).filter((l) => /HTTP Error|\[apiv2\]\[body\].*"error"|FirebaseError/.test(l));
    return lines.slice(-3).join('\n');
  } catch { return ''; }
}
function cliErrorText(ctx, res) {
  const msg = res.json?.error?.message || res.json?.error || res.out || '';
  const text = typeof msg === 'string' ? msg : JSON.stringify(msg);
  return `${text}\n${readDebugLog(ctx)}`.trim();
}
function cliError(ctx, res, fallback) {
  const text = cliErrorText(ctx, res);
  return mapCliError(text) || new InstallError('CLI', fallback, { detail: text.slice(0, 900) });
}
// Google Cloud 프로젝트 표시 이름은 영문·숫자·공백·하이픈·따옴표·느낌표만 허용 → 한글 회중명은 넣지 않는다
function asciiDisplayName(slug) { return `FSG ${slug}`.slice(0, 30).replace(/-+$/, ''); }

// ---------- 로그인 ----------
export function loginStatus(ctx) {
  const st = ctx.store.state.firebase;
  const accounts = listAccounts();
  const current = st.account && accounts.find((a) => a.email === st.account) ? st.account : '';
  return { account: current, accounts: accounts.map((a) => a.email) };
}

export function startLogin(ctx, body) {
  const { url } = buildLoginUrl(ctx.port(), { loginHint: body.loginHint || '' });
  if (!body.noOpen) openBrowser(url);   // noOpen: 점검용(주소만 받아 다른 브라우저에서 열 때)
  ctx.bus.log('Google 로그인 창을 열었습니다. 브라우저에서 계정을 선택하고 허용을 누르세요.');
  return { ok: true, url };
}

export function useAccount(ctx, email) {
  if (!listAccounts().some((a) => a.email === email)) throw new InstallError('NO_ACCOUNT', '저장된 로그인이 없는 계정이에요. [Google로 로그인]을 누르세요.', { actions: [] });
  ctx.store.patch({ firebase: { ...ctx.store.state.firebase, account: email } });
  ctx.emitState();
  ctx.bus.log(`Google 계정 사용: ${email}`);
  return { ok: true, account: email };
}

function requireAccount(ctx) {
  const email = ctx.store.state.firebase.account;
  if (!email) throw new InstallError('NO_ACCOUNT', '먼저 Google 로그인을 해 주세요.', { actions: [] });
  return email;
}

// ---------- 프로젝트 목록(기존 선택용) ----------
export async function listProjects(ctx) {
  const email = requireAccount(ctx);
  const res = await gapi(email, 'GET', `${FB_API}/projects?pageSize=100`);
  if (!res.ok) throw new InstallError('LIST_PROJECTS', '프로젝트 목록을 가져오지 못했어요.', { detail: describeApiError(res) });
  return { ok: true, projects: (res.data?.results || []).map((p) => ({ projectId: p.projectId, displayName: p.displayName || p.projectId, state: p.state })) };
}

// ---------- 프로젝트 준비(생성/선택 → Firestore → 웹 앱 → 설정값) ----------
export async function provisionProject(ctx, body, report) {
  const email = requireAccount(ctx);
  const st = ctx.store.state;
  const names = namesFromSlug(st.cong.slug);
  const displayName = asciiDisplayName(st.cong.slug);

  // 1) 프로젝트
  report.step('project');
  let projectId = st.firebase.projectId || '';
  const mode = body.mode || (projectId ? 'reuse' : 'new');
  if (mode === 'existing') {
    projectId = String(body.projectId || '').trim();
    if (!projectId) throw new InstallError('NO_PROJECT', '사용할 기존 프로젝트를 골라 주세요.', { actions: [] });
    const chk = await gapi(email, 'GET', `${FB_API}/projects/${projectId}`);
    if (!chk.ok) throw new InstallError('PROJECT_NOT_FOUND', '그 프로젝트를 이 계정에서 찾지 못했어요. 목록을 새로 고쳐 다시 골라 주세요.', { detail: describeApiError(chk) });
  } else if (!projectId || mode === 'new') {
    let candidate = String(body.projectId || names.projectId).toLowerCase();
    if (body.choice === 'suffix') candidate = nextSuffix(candidate);
    projectId = await createProject(ctx, email, candidate, displayName, report);
  } else {
    // reuse: 이미 저장된 프로젝트가 살아 있는지 확인
    const chk = await gapi(email, 'GET', `${FB_API}/projects/${projectId}`);
    if (!chk.ok) { ctx.bus.log(`저장된 프로젝트 ${projectId} 를 찾지 못해 새로 만듭니다.`, 'warn'); projectId = await createProject(ctx, email, names.projectId, displayName, report); }
  }
  ctx.store.patch({ firebase: { ...ctx.store.state.firebase, projectId } }); ctx.emitState();
  report.done('project', projectId);

  // 2) Firestore
  report.step('firestore');
  await ensureFirestore(ctx, email, projectId);
  report.done('firestore', `${FIRESTORE_LOCATION} (서울)`);

  // 3) 웹 앱
  report.step('webapp');
  const webAppId = await ensureWebApp(ctx, email, projectId, displayName);
  ctx.store.patch({ firebase: { ...ctx.store.state.firebase, webAppId } }); ctx.emitState();
  report.done('webapp', webAppId);

  // 4) 설정값 6개
  report.step('config');
  const config = await fetchWebConfig(ctx, email, projectId, webAppId);
  ctx.store.patch({ firebase: { ...ctx.store.state.firebase, config } }); ctx.emitState();
  report.done('config', 'apiKey·authDomain·projectId·storageBucket·messagingSenderId·appId');
  return { projectId, webAppId };
}

function nextSuffix(id) {
  const m = id.match(/^(.*?)-(\d+)$/);
  if (m) return `${m[1]}-${Number(m[2]) + 1}`;
  return `${id}-2`;
}

async function createProject(ctx, email, projectId, displayName, report) {
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) {
    throw new InstallError('BAD_PROJECT_ID', `프로젝트 ID 형식이 맞지 않아요: ${projectId}`, { hint: '소문자로 시작, 소문자·숫자·하이픈, 6~30자.', actions: [{ id: 'rename', label: '직접 입력' }] });
  }
  // 같은 ID 가 이미 이 계정에 있으면(이전 시도가 만들어 둔 경우) 재사용 → 재실행에 안전
  const mine = await gapi(email, 'GET', `${FB_API}/projects/${projectId}`);
  if (mine.ok && mine.data?.projectId === projectId) { ctx.bus.log(`프로젝트 ${projectId} 가 이미 이 계정에 있어 재사용합니다.`); return projectId; }
  report.step('project', `Firebase 프로젝트 만드는 중: ${projectId} (30초~1분)`);
  const res = await fb(ctx, email, ['projects:create', projectId, '--display-name', displayName], { timeoutMs: 5 * 60 * 1000 });
  if (res.code === 0 && res.json?.status === 'success') return res.json.result?.projectId || projectId;
  const text = cliErrorText(ctx, res);
  if (/already exists|ALREADY_EXISTS|already in use|is not available|taken|Requested entity already exists|409/i.test(text)) {
    throw new InstallError('NAME_TAKEN', `프로젝트 ID "${projectId}" 는 이미 사용 중이에요(전 세계에서 고유해야 함). "${nextSuffix(projectId)}" 로 진행할까요?`, {
      actions: [{ id: 'suffix', label: `${nextSuffix(projectId)} 로 진행` }, { id: 'rename', label: '직접 입력' }], detail: text.slice(0, 400)
    });
  }
  if (/quota|RESOURCE_EXHAUSTED|too many projects|project quota/i.test(text)) {
    throw new InstallError('QUOTA', '이 Google 계정으로 만들 수 있는 프로젝트 개수 한도에 걸렸어요. 안 쓰는 프로젝트를 지우거나(console.cloud.google.com) 다른 계정으로 로그인하세요.', { actions: [{ id: 'relogin', label: '다른 계정으로 로그인' }], detail: text.slice(0, 400) });
  }
  if (/terms of service|ToS|accept/i.test(text)) {
    throw new InstallError('TOS', 'Google Cloud 이용약관 동의가 필요해요. 브라우저에서 console.firebase.google.com 에 한 번 로그인해 약관에 동의한 뒤 다시 시도하세요.', { detail: text.slice(0, 400) });
  }
  throw cliError(ctx, res, 'Firebase 프로젝트를 만들지 못했어요.');
}

const API_DISABLED_RE = /has not been used in project|it is disabled|SERVICE_DISABLED|API has not been enabled/i;

async function ensureFirestore(ctx, email, projectId) {
  // 새 프로젝트는 Firestore API 가 꺼져 있다 → 먼저 켠다(이미 켜져 있으면 즉시 성공)
  const list = await gapi(email, 'GET', `https://firestore.googleapis.com/v1/projects/${projectId}/databases`);
  if (list.ok && (list.data?.databases || []).some((d) => d.name?.endsWith('/databases/(default)'))) { ctx.bus.log('데이터 저장소(Firestore)가 이미 있어 재사용합니다.'); return; }
  if (!list.ok && API_DISABLED_RE.test(describeApiError(list))) await enableService(ctx, email, projectId, 'firestore.googleapis.com');

  let enabledOnce = !list.ok;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const res = await fb(ctx, email, ['firestore:databases:create', '(default)', '--location', FIRESTORE_LOCATION, '--project', projectId], { timeoutMs: 5 * 60 * 1000 });
    if (res.code === 0 && res.json?.status === 'success') return;
    const text = cliErrorText(ctx, res);
    if (/already exists|ALREADY_EXISTS/i.test(text)) return;
    if (API_DISABLED_RE.test(text)) {
      if (!enabledOnce) { await enableService(ctx, email, projectId, 'firestore.googleapis.com'); enabledOnce = true; }
      ctx.bus.log(`Firestore API 반영 대기 중... (${attempt}/6)`);
      await sleep(8000);
      continue;
    }
    throw cliError(ctx, res, '데이터 저장소(Firestore)를 만들지 못했어요.');
  }
  throw new InstallError('API_PROPAGATION', 'Firestore API 를 켰지만 아직 반영되지 않았어요. 1~2분 뒤 [다시 시도]를 눌러 주세요.');
}

async function ensureWebApp(ctx, email, projectId, displayName) {
  const st = ctx.store.state.firebase;
  const list = await gapi(email, 'GET', `${FB_API}/projects/${projectId}/webApps?pageSize=50`);
  const apps = list.ok ? (list.data?.apps || []) : [];
  if (st.webAppId && apps.some((a) => a.appId === st.webAppId)) return st.webAppId;
  const mine = apps.find((a) => a.displayName === displayName) || apps[0];
  if (mine) { ctx.bus.log(`웹 앱이 이미 있어 재사용합니다: ${mine.displayName || mine.appId}`); return mine.appId; }
  const res = await fb(ctx, email, ['apps:create', 'WEB', displayName, '--project', projectId]);
  if (res.code === 0 && res.json?.status === 'success' && res.json.result?.appId) return res.json.result.appId;
  // 폴백: 목록 재조회
  const again = await gapi(email, 'GET', `${FB_API}/projects/${projectId}/webApps?pageSize=50`);
  const found = again.ok ? (again.data?.apps || []).find((a) => a.displayName === displayName) : null;
  if (found) return found.appId;
  throw cliError(ctx, res, '웹 앱을 등록하지 못했어요.');
}

async function fetchWebConfig(ctx, email, projectId, webAppId) {
  const res = await gapi(email, 'GET', `${FB_API}/projects/${projectId}/webApps/${webAppId}/config`);
  let c = res.ok ? res.data : null;
  if (!c?.apiKey) {
    const cli = await fb(ctx, email, ['apps:sdkconfig', 'WEB', webAppId, '--project', projectId], { quiet: true });
    c = cli.json?.result?.sdkConfig || cli.json?.result || null;
  }
  if (!c?.apiKey || !c?.appId) throw new InstallError('CONFIG', '웹 앱 설정값을 받아오지 못했어요. 잠시 후 다시 시도하세요.', { detail: describeApiError(res) });
  return { apiKey: c.apiKey, authDomain: c.authDomain || `${projectId}.firebaseapp.com`, projectId: c.projectId || projectId, storageBucket: c.storageBucket || '', messagingSenderId: c.messagingSenderId || '', appId: c.appId };
}

// ---------- 로그인 기능(Firebase Authentication) ----------
export function authConsoleUrl(projectId) { return `https://console.firebase.google.com/project/${projectId}/authentication`; }

// 실측(2026-09-06): 무료 Firebase Auth 는 API 로 "시작하기"를 대신할 수 없다.
//  - identityPlatform:initializeAuth → BILLING_NOT_ENABLED(유료 Identity Platform 전용)
//  - admin/v2 config PATCH → CONFIGURATION_NOT_FOUND
// 따라서 콘솔 딥링크에서 사용자가 "시작하기"를 한 번 누르고, 도우미는 켜졌는지만 검사한다(계획 5장 4번 화면 그대로).
export async function enableAuth(ctx, body, report) {
  const email = requireAccount(ctx);
  const projectId = ctx.store.state.firebase.projectId;
  if (!projectId) throw new InstallError('NO_PROJECT', '먼저 Firebase 프로젝트를 준비해 주세요.', { actions: [] });
  report.step('check');
  let ok = await verifyAuth(ctx);
  if (!ok) {
    // 결제가 켜진 프로젝트(Identity Platform)라면 자동 초기화가 통할 수 있어 한 번 시도
    const init = await gapi(email, 'POST', `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/identityPlatform:initializeAuth`, {});
    if (init.ok || /ALREADY_EXISTS/i.test(describeApiError(init))) ok = await verifyAuth(ctx);
    else ctx.bus.log(`자동 초기화 불가(정상 범위): ${describeApiError(init)}`);
  }
  if (!ok) throw authManualError(projectId, 'CONFIGURATION_NOT_FOUND');
  report.done('check', '켜져 있음');
  return { ok: true };
}
function authManualError(projectId, detail) {
  return new InstallError('AUTH_NOT_STARTED', '아직 로그인 기능이 켜지지 않았어요. [페이지 열기] → 열린 페이지에서 "시작하기" 클릭 → 돌아와서 [확인]을 눌러 주세요.', {
    hint: '로그인 방법(이메일, Google 등)은 고르지 않아도 됩니다. "시작하기"만 누르면 됩니다.',
    actions: [{ id: 'openauth', label: '페이지 열기' }, { id: 'retry', label: '확인' }], detail
  });
}
export async function verifyAuth(ctx) {
  const email = requireAccount(ctx);
  const projectId = ctx.store.state.firebase.projectId;
  const chk = await gapi(email, 'GET', `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`);
  const enabled = chk.ok;
  ctx.store.patch({ firebase: { ...ctx.store.state.firebase, authEnabled: enabled } }); ctx.emitState();
  return enabled;
}

async function enableService(ctx, email, projectId, service) {
  ctx.bus.log(`API 사용 설정: ${service}`);
  const r = await gapi(email, 'POST', `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${service}:enable`, {});
  if (!r.ok) throw new InstallError('ENABLE_API', `${service} 를 사용 설정하지 못했어요.`, { detail: describeApiError(r) });
  // 켜기는 비동기 작업 → 끝날 때까지 잠시 대기(보통 수 초)
  const opName = r.data?.name;
  for (let i = 0; i < 10 && opName && !r.data?.done; i++) {
    await sleep(2000);
    const op = await gapi(email, 'GET', `https://serviceusage.googleapis.com/v1/${opName}`);
    if (op.ok && op.data?.done) break;
  }
  await sleep(3000);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 서비스 계정 키 ----------
export function saConsoleUrl(projectId) { return `https://console.firebase.google.com/project/${projectId}/settings/serviceaccounts/adminsdk`; }

function secretsDir(ctx) { return path.join(ctx.kitRoot, '.secrets'); }
function keyDest(ctx, projectId) { return path.join(secretsDir(ctx), `${projectId}-service-account.json`); }

function validateKeyJson(obj, projectId) {
  if (!obj || obj.type !== 'service_account') throw new InstallError('KEY_INVALID', '서비스 계정 키 파일이 아니에요(type 이 service_account 가 아님).', { actions: [] });
  if (!obj.private_key || !obj.client_email) throw new InstallError('KEY_INVALID', '키 파일에 필요한 항목(private_key, client_email)이 없어요.', { actions: [] });
  if (projectId && obj.project_id !== projectId) {
    throw new InstallError('KEY_WRONG_PROJECT', `이 키는 다른 프로젝트(${obj.project_id}) 것이에요. 이 프로젝트(${projectId})에서 새로 만들어 주세요.`, { actions: [{ id: 'opensa', label: '키 만들기 페이지' }] });
  }
}
function saveKey(ctx, obj, projectId) {
  fs.mkdirSync(secretsDir(ctx), { recursive: true });
  const dest = keyDest(ctx, projectId);
  fs.writeFileSync(dest, JSON.stringify(obj, null, 2), { encoding: 'utf8', mode: 0o600 });
  ctx.store.patch({ firebase: { ...ctx.store.state.firebase, saKeyPath: dest, saKeyProjectId: projectId, saClientEmail: obj.client_email } }); ctx.emitState();
  ctx.bus.log(`서비스 계정 키 저장: ${dest}`);
  return dest;
}

// 자동 생성: IAM API 로 firebase-adminsdk 서비스 계정을 찾아 키를 만든다.
export async function createServiceAccountKey(ctx, body, report) {
  const email = requireAccount(ctx);
  const projectId = ctx.store.state.firebase.projectId;
  if (!projectId) throw new InstallError('NO_PROJECT', '먼저 Firebase 프로젝트를 준비해 주세요.', { actions: [] });
  if (ctx.store.state.firebase.saKeyPath && fs.existsSync(ctx.store.state.firebase.saKeyPath) && body.choice !== 'renew') {
    report.step('find'); report.done('find', '이미 등록된 키 사용'); return { ok: true, path: ctx.store.state.firebase.saKeyPath };
  }
  report.step('find');
  let sa = null;
  for (let i = 0; i < 8 && !sa; i++) {
    const r = await gapi(email, 'GET', `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts?pageSize=100`);
    if (!r.ok) {
      const d = describeApiError(r);
      if (/SERVICE_DISABLED|has not been used|is disabled/i.test(d)) { await enableService(ctx, email, projectId, 'iam.googleapis.com'); continue; }
      if (r.status === 403) throw saManualError(projectId, '권한 부족: ' + d);
      throw new InstallError('SA_LIST', '서비스 계정 목록을 가져오지 못했어요.', { detail: d });
    }
    sa = (r.data?.accounts || []).find((a) => /^firebase-adminsdk-/.test(a.email)) || null;
    if (!sa) { ctx.bus.log('firebase-adminsdk 서비스 계정이 아직 준비되지 않아 잠시 기다립니다...'); await sleep(5000); }
  }
  if (!sa) throw saManualError(projectId, 'firebase-adminsdk 서비스 계정을 찾지 못함');
  report.done('find', sa.email);
  report.step('key');
  const k = await gapi(email, 'POST', `https://iam.googleapis.com/v1/projects/${projectId}/serviceAccounts/${encodeURIComponent(sa.email)}/keys`, { privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE', keyAlgorithm: 'KEY_ALG_RSA_2048' });
  if (!k.ok || !k.data?.privateKeyData) throw saManualError(projectId, describeApiError(k));
  const obj = JSON.parse(Buffer.from(k.data.privateKeyData, 'base64').toString('utf8'));
  validateKeyJson(obj, projectId);
  const dest = saveKey(ctx, obj, projectId);
  report.done('key', path.basename(dest));
  return { ok: true, path: dest };
}
function saManualError(projectId, detail) {
  return new InstallError('SA_MANUAL', '자동으로 키를 만들지 못했어요. [키 만들기 페이지 열기]에서 "새 비공개 키 생성"으로 받은 뒤 [다운로드 폴더에서 찾기]를 눌러 주세요.', {
    actions: [{ id: 'opensa', label: '키 만들기 페이지 열기' }], detail
  });
}

// 수동 경로: 다운로드 폴더에서 이 프로젝트 키 후보 찾기
export function scanDownloads(ctx) {
  const projectId = ctx.store.state.firebase.projectId;
  const dirs = [path.join(os.homedir(), 'Downloads'), path.join(os.homedir(), 'Desktop')];
  const cands = [];
  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => /\.json$/i.test(f)); } catch { continue; }
    for (const f of files) {
      const p = path.join(dir, f);
      try {
        const stt = fs.statSync(p);
        if (stt.size > 20000 || Date.now() - stt.mtimeMs > 30 * 24 * 3600 * 1000) continue;
        const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
        if (obj?.type !== 'service_account') continue;
        cands.push({ path: p, name: f, mtime: stt.mtime.toISOString(), projectId: obj.project_id || '', clientEmail: obj.client_email || '', match: obj.project_id === projectId });
      } catch {}
    }
  }
  cands.sort((a, b) => (b.match - a.match) || (b.mtime > a.mtime ? 1 : -1));
  return { ok: true, projectId, candidates: cands.slice(0, 8) };
}

export function pickKeyFile(ctx, body) {
  const projectId = ctx.store.state.firebase.projectId;
  const p = String(body.path || '').trim().replace(/^"|"$/g, '');
  if (!p || !fs.existsSync(p)) throw new InstallError('KEY_NOT_FOUND', '그 경로에 파일이 없어요. 경로를 다시 확인하세요.', { actions: [] });
  let obj; try { obj = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { throw new InstallError('KEY_INVALID', 'JSON 파일로 읽히지 않아요. 서비스 계정 키(.json)를 골라 주세요.', { actions: [] }); }
  validateKeyJson(obj, projectId);
  const dest = saveKey(ctx, obj, projectId);
  return { ok: true, path: dest, original: p };
}
