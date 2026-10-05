// Step 5: Cloudflare 로그인 + 설치 실행(규칙 배포 → Worker 배포+시크릿 → config.js → Pages 생성·배포 → 접속 검증)
//
// - Cloudflare 로그인은 번들 wrangler 의 `login --browser=false` 를 자식 프로세스로 돌려 URL 만 받아 브라우저를 연다(비대화형에서도 동작 확인).
// - 사용자의 다른 wrangler 로그인과 섞이지 않도록 전용 auth 프로필(--profile fsg-installer)을 쓴다.
// - Worker 시크릿(FIREBASE_SERVICE_ACCOUNT)은 `deploy --secrets-file` 로 배포와 함께 올린다 → 기존 도우미의 핵심 결함 수정.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { InstallError, mapCliError } from '../lib/errors.mjs';
import { openBrowser } from '../lib/open.mjs';

export const PROFILE = 'fsg-installer';
const CF_API = 'https://api.cloudflare.com/client/v4';

// wrangler 의 전역 설정 폴더: 홈에 `.wrangler` 폴더가 이미 있으면 그것을, 없으면(Cloudflare 를 처음 쓰는 PC) OS별 표준 위치를 쓴다.
//   Windows: %APPDATA%\xdg.config\.wrangler   Mac: ~/Library/Preferences/.wrangler   Linux: ~/.config/.wrangler
// 어느 쪽에 만들어졌는지 PC마다 달라서 후보를 모두 확인한다.
function wranglerConfigRoots() {
  const home = os.homedir();
  const roots = [path.join(home, '.wrangler')];
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) roots.push(path.join(xdg, '.wrangler'));
  if (process.platform === 'win32') {
    roots.push(path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'xdg.config', '.wrangler'));
  } else if (process.platform === 'darwin') {
    roots.push(path.join(home, 'Library', 'Preferences', '.wrangler'));
  } else {
    roots.push(path.join(home, '.config', '.wrangler'));
  }
  return [...new Set(roots)];
}
function profileTomlCandidates() {
  const out = [];
  for (const r of wranglerConfigRoots()) {
    out.push(path.join(r, 'config', `${PROFILE}.toml`), path.join(r, 'config', 'profiles', `${PROFILE}.toml`));
  }
  return out;
}
// 파일 위치는 wrangler 버전에 따라 다를 수 있어, 후보에 없으면 config 폴더 안에서 이름으로 한 번 더 찾는다
function profileTomlPath() {
  const cands = profileTomlCandidates();
  for (const c of cands) if (fs.existsSync(c)) return c;
  const walk = (d, depth) => {
    if (depth > 3) return '';
    let list;
    try { list = fs.readdirSync(d, { withFileTypes: true }); } catch { return ''; }
    for (const e of list) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { const r = walk(p, depth + 1); if (r) return r; }
      else if (e.isFile() && e.name.toLowerCase() === `${PROFILE}.toml`) return p;
    }
    return '';
  };
  for (const r of wranglerConfigRoots()) { const f = walk(path.join(r, 'config'), 0); if (f) return f; }
  return cands[0];
}
export function readProfileToken() {
  try {
    const t = fs.readFileSync(profileTomlPath(), 'utf8');
    const m = t.match(/^\s*oauth_token\s*=\s*"([^"]+)"/m);
    return m ? m[1] : '';
  } catch { return ''; }
}

async function cfApi(token, apiPath) {
  const r = await fetch(`${CF_API}${apiPath}`, { headers: { Authorization: `Bearer ${token}` } });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok && data?.success !== false, status: r.status, data };
}

function wrEnv(ctx, extra = {}) {
  const cf = ctx.store.state.cloudflare || {};
  const env = { WRANGLER_SEND_METRICS: 'false', ...extra };
  if (cf.accountId) env.CLOUDFLARE_ACCOUNT_ID = cf.accountId;
  return env;
}
async function wr(ctx, args, opts = {}) {
  return ctx.exec.run('wrangler', [...args, '--profile', PROFILE], { ...opts, env: wrEnv(ctx, opts.env) });
}
function wrError(res, fallback) {
  const text = String(res.out || '');
  return mapCliError(text) || new InstallError('WRANGLER', fallback, { detail: text.slice(-900) });
}

// ---------- 로그인 ----------
export async function cfLogin(ctx, body, report) {
  report.step('login');
  let token = readProfileToken();
  let user = null;
  if (token && body.choice !== 'relogin') {
    const u = await cfApi(token, '/user');
    if (u.ok) user = u.data.result; else token = '';
  }
  if (!token || !user) {
    let opened = false;
    // `wrangler login` 은 기본(전역) 프로필 전용 → 명명 프로필은 `wrangler auth create <이름>` 으로 로그인
    const res = await ctx.exec.run('wrangler', ['auth', 'create', PROFILE, '--browser=false'], {
      interactive: true, timeoutMs: 6 * 60 * 1000, env: { WRANGLER_SEND_METRICS: 'false' },
      onLine: (line) => {
        const m = line.match(/https:\/\/dash\.cloudflare\.com\/oauth2\/auth\S+/);
        if (m && !opened) {
          opened = true;
          ctx.bus.log(`Cloudflare 로그인 주소: ${m[0]}`);
          if (!body.noOpen) { openBrowser(m[0]); ctx.bus.log('Cloudflare 로그인 창을 열었습니다. 브라우저에서 로그인하고 Allow 를 누르세요.'); }
        }
      }
    });
    if (res.code !== 0) {
      if (/EADDRINUSE|address already in use/i.test(res.out)) throw new InstallError('CF_PORT', '로그인용 포트(8976)가 이미 사용 중이에요. 다른 wrangler 로그인 창이 열려 있으면 닫고 다시 시도하세요.', { detail: res.out.slice(-400) });
      throw new InstallError('CF_LOGIN', 'Cloudflare 로그인이 끝나지 않았어요. 브라우저에서 로그인과 Allow 를 마친 뒤 다시 시도하세요.', { detail: res.out.slice(-600) });
    }
    token = readProfileToken();
    if (!token) throw new InstallError('CF_LOGIN', '로그인은 됐지만 토큰을 찾지 못했어요. 다시 시도하세요.', { detail: `찾아본 위치:\n${profileTomlCandidates().join('\n')}` });
    const u = await cfApi(token, '/user');
    if (!u.ok) throw new InstallError('CF_LOGIN', 'Cloudflare 사용자 정보를 확인하지 못했어요. 다시 로그인하세요.', { actions: [{ id: 'relogin', label: '다시 로그인' }] });
    user = u.data.result;
  }
  report.done('login', user.email || '');

  report.step('account');
  const a = await cfApi(token, '/accounts?per_page=50');
  if (!a.ok) throw new InstallError('CF_ACCOUNTS', 'Cloudflare 계정 목록을 가져오지 못했어요.', { detail: JSON.stringify(a.data).slice(0, 300) });
  const accounts = (a.data.result || []).map((x) => ({ id: x.id, name: x.name }));
  if (!accounts.length) throw new InstallError('CF_NOACCOUNT', '이 Cloudflare 로그인에 연결된 계정이 없어요. dash.cloudflare.com 에서 계정을 만든 뒤 다시 로그인하세요.', { actions: [{ id: 'relogin', label: '다시 로그인' }] });
  const prev = ctx.store.state.cloudflare || {};
  const chosen = accounts.find((x) => x.id === prev.accountId) || accounts[0];
  ctx.store.patch({ cloudflare: { ...prev, loggedIn: true, email: user.email || '', accountId: chosen.id, accountName: chosen.name, accounts } });
  ctx.emitState();
  report.done('account', chosen.name + (accounts.length > 1 ? ` (계정 ${accounts.length}개 중)` : ''));
  ctx.bus.log(`Cloudflare 로그인: ${user.email} / 계정 ${chosen.name}`);
  return { ok: true };
}

export function chooseAccount(ctx, id) {
  const cf = ctx.store.state.cloudflare || {};
  const acc = (cf.accounts || []).find((x) => x.id === id);
  if (!acc) throw new InstallError('CF_ACCOUNT', '목록에 없는 계정이에요.', { actions: [] });
  ctx.store.patch({ cloudflare: { ...cf, accountId: acc.id, accountName: acc.name } }); ctx.emitState();
  return { ok: true };
}

// ---------- 설치 실행 ----------
export async function runInstall(ctx, body, report) {
  const st = ctx.store.state;
  const fb = st.firebase, cf = st.cloudflare;
  if (!fb.account || !fb.projectId || !fb.config) throw new InstallError('NOT_READY_FB', 'Firebase 준비(3단계)가 끝나지 않았어요.', { actions: [] });
  if (!fb.saKeyPath || !fs.existsSync(fb.saKeyPath)) throw new InstallError('NO_SAKEY', '서비스 계정 키 파일이 없어요(5단계). 키를 다시 만들어 주세요.', { actions: [] });
  if (!cf.loggedIn || !cf.accountId) throw new InstallError('NOT_READY_CF', 'Cloudflare 로그인(6단계)이 필요해요.', { actions: [] });
  const workerName = cf.workerName, pagesProject = body.pagesProject || cf.pagesProject;

  // 1) Firestore 규칙·색인
  report.step('rules');
  {
    // 실측: 파일 선두 BOM 이 있으면 규칙 컴파일이 "token recognition error at: '﻿'" 로 실패 → 방어적으로 제거
    for (const rel of ['firestore.rules', 'firestore.indexes.json', 'firebase.json']) {
      const p = path.join(ctx.kitRoot, rel);
      try { const b = fs.readFileSync(p); if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) { fs.writeFileSync(p, b.subarray(3)); ctx.bus.log(`${rel} 의 BOM 제거`, 'warn'); } } catch {}
    }
    const r = await ctx.exec.run('firebase', ['deploy', '--only', 'firestore:rules,firestore:indexes', '--project', fb.projectId, '--account', fb.account, '--json', '--non-interactive'], { cwd: ctx.kitRoot, timeoutMs: 5 * 60 * 1000 });
    if (r.code !== 0) throw mapCliError(r.out) || new InstallError('RULES', '데이터 보안 규칙을 배포하지 못했어요.', { detail: r.out.slice(-800) });
  }
  report.done('rules');

  // 2) Worker 배포 + 시크릿
  report.step('worker');
  let workerUrl = cf.workerUrl || '';
  {
    const secretsFile = path.join(ctx.kitRoot, '.secrets', 'worker-secrets.json');
    const sa = fs.readFileSync(fb.saKeyPath, 'utf8');
    fs.writeFileSync(secretsFile, JSON.stringify({ FIREBASE_SERVICE_ACCOUNT: JSON.parse(sa) && sa.trim() }), { encoding: 'utf8', mode: 0o600 });
    try {
      const r = await wr(ctx, ['deploy', '--name', workerName, '--var', `FIREBASE_PROJECT_ID:${fb.projectId}`, '--var', 'TOKEN_MODE:signed', '--secrets-file', secretsFile], { cwd: path.join(ctx.kitRoot, 'worker'), timeoutMs: 10 * 60 * 1000 });
      const m = r.out.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i);
      if (r.code !== 0) {
        if (/subdomain/i.test(r.out) && /register|choose|workers\.dev/i.test(r.out)) {
          throw new InstallError('CF_SUBDOMAIN', 'Cloudflare 계정에 workers.dev 주소가 아직 없어요. Cloudflare 대시보드 → Workers & Pages 에서 subdomain 을 한 번 정한 뒤 다시 시도하세요.', { actions: [{ id: 'opencf', label: '대시보드 열기' }, { id: 'retry', label: '다시 시도' }], detail: r.out.slice(-600) });
        }
        throw wrError(r, '서버(Worker)를 배포하지 못했어요.');
      }
      if (m) workerUrl = m[0];
      if (!workerUrl) throw new InstallError('WORKER_URL', '서버는 배포됐지만 주소를 읽지 못했어요. 기록에서 workers.dev 주소를 확인해 주세요.', { detail: r.out.slice(-600) });
    } finally {
      try { fs.unlinkSync(secretsFile); } catch {}
    }
    ctx.store.patch({ cloudflare: { ...ctx.store.state.cloudflare, workerUrl } }); ctx.emitState();
  }
  report.done('worker', workerUrl);

  // 3) 시크릿 확인
  report.step('secret');
  {
    const r = await wr(ctx, ['secret', 'list', '--name', workerName], { cwd: path.join(ctx.kitRoot, 'worker'), quiet: true, timeoutMs: 2 * 60 * 1000 });
    if (r.code !== 0 || !/FIREBASE_SERVICE_ACCOUNT/.test(r.out)) {
      throw new InstallError('SECRET', '서버에 키를 저장하지 못했어요. 인터넷을 확인하고 다시 시도하세요.', { detail: r.out.slice(-600) });
    }
  }
  report.done('secret', 'FIREBASE_SERVICE_ACCOUNT');

  // 4) 초기 데이터 (steps/seed.mjs) — 이미 초기화된 프로젝트면 건너뜀
  report.step('seed');
  await ctx.seed(report, { force: !!body.forceSeed });

  // 5) web/dist/config.js
  report.step('config');
  writeRuntimeConfig(ctx, fb.config, workerUrl);
  report.done('config', 'web/dist/config.js');

  // 6) Pages 프로젝트
  report.step('pages');
  {
    const r = await wr(ctx, ['pages', 'project', 'create', pagesProject, '--production-branch', 'main'], { cwd: ctx.kitRoot, timeoutMs: 3 * 60 * 1000 });
    if (r.code !== 0) {
      const mine = await wr(ctx, ['pages', 'project', 'list'], { cwd: ctx.kitRoot, quiet: true, timeoutMs: 2 * 60 * 1000 });
      const ownIt = new RegExp(`(^|[^a-z0-9-])${pagesProject.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9-]|$)`, 'm').test(mine.out);
      if (ownIt) ctx.bus.log(`Pages 프로젝트 ${pagesProject} 가 이미 이 계정에 있어 재사용합니다.`);
      else if (/already exists|taken|in use|8000007|409/i.test(r.out)) {
        const next = pagesProject.match(/^(.*?)-(\d+)$/) ? pagesProject.replace(/-(\d+)$/, (s, n) => `-${Number(n) + 1}`) : `${pagesProject}-2`;
        ctx.store.patch({ cloudflare: { ...ctx.store.state.cloudflare, pagesProject: next } }); ctx.emitState();
        throw new InstallError('NAME_TAKEN', `사이트 이름 "${pagesProject}" 은 이미 다른 사람이 쓰고 있어요(전 세계에서 고유). "${next}" 로 진행할까요?`, {
          actions: [{ id: 'retry', label: `${next} 로 진행` }], detail: r.out.slice(-400)
        });
      } else throw wrError(r, '웹 사이트 프로젝트를 만들지 못했어요.');
    }
  }
  report.done('pages', pagesProject);

  // 7) Pages 배포
  report.step('deploy');
  const siteUrl = `https://${pagesProject}.pages.dev`;
  {
    const r = await wr(ctx, ['pages', 'deploy', path.join(ctx.kitRoot, 'web', 'dist'), '--project-name', pagesProject, '--branch', 'main', '--commit-dirty=true'], { cwd: ctx.kitRoot, timeoutMs: 10 * 60 * 1000 });
    if (r.code !== 0) throw wrError(r, '웹 사이트를 배포하지 못했어요.');
    ctx.store.patch({ cloudflare: { ...ctx.store.state.cloudflare, pagesUrl: siteUrl } }); ctx.emitState();
  }
  report.done('deploy', siteUrl);

  // 8) 접속 검증
  report.step('verify');
  const v = await verifySite(ctx, siteUrl, workerUrl, fb.projectId);
  if (!v.ok) {
    throw new InstallError('VERIFY', '배포는 됐지만 아직 응답이 없어요. 1~2분 뒤 [다시 확인]을 눌러 주세요.', { actions: [{ id: 'retry', label: '다시 확인' }], detail: v.detail });
  }
  report.done('verify', v.detail);

  const pins = readDefaultPins(ctx);
  ctx.store.patch({
    install: { ...ctx.store.state.install, status: 'ok', finishedAt: new Date().toISOString(), lastError: null },
    result: { siteUrl, workerUrl, pins, savedAt: null }
  });
  ctx.emitState();
  ctx.bus.log(`설치 완료: ${siteUrl} (서버 ${workerUrl})`);
  return { siteUrl, workerUrl };
}

export function writeRuntimeConfig(ctx, config, workerUrl) {
  const dest = path.join(ctx.kitRoot, 'web', 'dist', 'config.js');
  const body = `// 야외 봉사 집단 앱 — 런타임 설정 (설치 도우미가 ${new Date().toISOString()} 에 생성)
// 여기 값들은 웹 공개 설정값입니다. 보안은 Firestore 규칙과 Worker가 담당합니다.
window.__FSG_CONFIG__ = {
  apiKey: ${JSON.stringify(config.apiKey)},
  authDomain: ${JSON.stringify(config.authDomain)},
  projectId: ${JSON.stringify(config.projectId)},
  storageBucket: ${JSON.stringify(config.storageBucket || '')},
  messagingSenderId: ${JSON.stringify(config.messagingSenderId || '')},
  appId: ${JSON.stringify(config.appId)},
  workerUrl: ${JSON.stringify(workerUrl)}
};
`;
  fs.writeFileSync(dest, body, 'utf8');
  return dest;
}

async function fetchText(url, timeoutMs = 15000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), timeoutMs);
  try { const r = await fetch(url, { signal: ac.signal, cache: 'no-store', headers: { 'User-Agent': 'FSG-Installer' } }); return { status: r.status, text: await r.text() }; }
  catch (e) { return { status: 0, text: String(e?.message || e) }; }
  finally { clearTimeout(t); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function verifySite(ctx, siteUrl, workerUrl, projectId) {
  let site = null, cfg = null, health = null;
  for (let i = 0; i < 14; i++) {
    site = await fetchText(siteUrl + '/');
    cfg = await fetchText(siteUrl + '/config.js?v=' + Date.now());
    health = await fetchText(workerUrl + '/health');
    const siteOk = site.status === 200 && /config\.js/.test(site.text);
    const cfgOk = cfg.status === 200 && cfg.text.includes(projectId);
    const healthOk = health.status === 200 && /"ok"\s*:\s*true/.test(health.text);
    if (siteOk && cfgOk && healthOk) return { ok: true, detail: `사이트 200 · 설정값 확인 · 서버 응답 정상` };
    ctx.bus.log(`접속 확인 대기 (${i + 1}/14): 사이트 ${site.status}, 설정 ${cfg.status}${cfgOk ? '' : '(값 미반영)'}, 서버 ${health.status}`);
    await sleep(10000);
  }
  return { ok: false, detail: `사이트 ${site?.status}, 설정 ${cfg?.status}, 서버 ${health?.status}` };
}

export function readDefaultPins(ctx) {
  const pins = [];
  try {
    const text = fs.readFileSync(path.join(ctx.kitRoot, 'templates', 'roles.csv'), 'utf8').replace(/^﻿/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#'));
    const headers = lines.shift().split(',').map((s) => s.trim());
    for (const l of lines) {
      const cells = l.split(','); const row = Object.fromEntries(headers.map((h, i) => [h, (cells[i] || '').trim()]));
      if (row.key) pins.push({ group: '회중 역할', role: row.name || row.key, pin: row.pin || '0000' });
    }
  } catch {}
  for (const g of ctx.store.state.cong.groups || []) pins.push({ group: g.name, role: '집단 감독자', pin: '0000' });
  return pins;
}

export function dashUrl(ctx) {
  const id = ctx.store.state.cloudflare?.accountId;
  return id ? `https://dash.cloudflare.com/${id}/workers-and-pages` : 'https://dash.cloudflare.com/';
}
