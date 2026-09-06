// 야외 봉사 집단 배포본 — 설치 도우미 로컬 서버
// bootstrap.ps1 / bootstrap.sh 가 준비한 포터블 Node 로 실행된다.
//
//  - 127.0.0.1 에만 바인딩(같은 PC 브라우저만 접근). POST 는 전용 헤더 + Host/Origin 검사(다른 사이트에서의 요청 차단).
//  - 화면(installer/ui) ↔ 상태(.install/install-state.json) ↔ 작업(actions.mjs) ↔ 실시간 알림(SSE /api/events)
//  - 재실행하면 저장된 상태에서 이어간다.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { StateStore, gates, unlockedStep, STEP_IDS } from './lib/state.mjs';
import { Bus } from './lib/bus.mjs';
import { makeExec } from './lib/exec.mjs';
import { JobRunner } from './lib/jobs.mjs';
import { InstallError } from './lib/errors.mjs';
import { createActions, openBrowser } from './actions.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_WIN = process.platform === 'win32';
const KIT_ROOT = process.env.FSG_KIT_ROOT || path.resolve(__dirname, '..');
const RUNTIME_ROOT = process.env.FSG_RUNTIME_DIR || defaultRuntimeRoot();
const TOOLS_BIN = path.join(RUNTIME_ROOT, 'tools', 'node_modules', '.bin');
const NO_BROWSER = process.env.FSG_NO_BROWSER === '1';
const DEV = process.env.FSG_DEV === '1';
const UI_DIR = path.join(__dirname, 'ui');

function defaultRuntimeRoot() {
  if (IS_WIN) return path.join(process.env.LOCALAPPDATA || os.homedir(), 'FSG_Installer', 'runtime');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'FSG_Installer', 'runtime');
  return path.join(os.homedir(), '.fsg-installer', 'runtime');
}
function readJson(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; } }

const spec = readJson(path.join(__dirname, 'runtime.json')) || {};
const kitVersion = readJson(path.join(KIT_ROOT, 'VERSION.json')) || {};

const store = new StateStore(KIT_ROOT);
store.load();
const bus = new Bus(KIT_ROOT);
const exec = makeExec({ toolsBin: TOOLS_BIN, nodeExe: process.execPath, bus, kitRoot: KIT_ROOT });
const jobs = new JobRunner(bus);

function publicState() {
  const s = store.state;
  return {
    state: s,
    gates: gates(s),
    unlocked: unlockedStep(s),
    stepIds: STEP_IDS,
    resumed: store.resumed,
    job: jobs.snapshot(),
    dev: DEV,
    meta: {
      kitRoot: KIT_ROOT, runtimeRoot: RUNTIME_ROOT, kitVersion: kitVersion.version || '',
      platform: `${IS_WIN ? 'Windows' : process.platform === 'darwin' ? 'macOS' : process.platform} (${os.arch()})`,
      node: process.version, logFile: bus.logFile
    }
  };
}
const emitState = () => bus.emit('state', publicState());
const actions = createActions({ store, bus, exec, jobs, spec, kitRoot: KIT_ROOT, runtimeRoot: RUNTIME_ROOT, toolsBin: TOOLS_BIN, emitState, dev: DEV });

// ---------- HTTP ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
let PORT = 0;

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''; req.setEncoding('utf8');
    req.on('data', (c) => { data += c; if (data.length > 1e6) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

function sameOrigin(req) {
  const host = String(req.headers.host || '');
  const allowedHosts = [`127.0.0.1:${PORT}`, `localhost:${PORT}`];
  if (!allowedHosts.includes(host)) return false;
  const origin = req.headers.origin;
  if (origin && !allowedHosts.some((h) => origin === `http://${h}`)) return false;
  return true;
}

const server = http.createServer(async (req, res) => {
  const send = (code, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  };
  const json = (code, obj) => send(code, JSON.stringify(obj));
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const p = url.pathname;

    if (!sameOrigin(req)) return send(403, 'Forbidden', 'text/plain');

    // 정적 화면
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) return send(200, fs.readFileSync(path.join(UI_DIR, 'index.html')), MIME['.html']);
    if (req.method === 'GET' && p.startsWith('/ui/')) {
      const rel = path.normalize(p.slice(4)).replace(/^([.][.][\\/])+/, '');
      const file = path.join(UI_DIR, rel);
      if (!file.startsWith(UI_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(404, 'Not found', 'text/plain');
      return send(200, fs.readFileSync(file), MIME[path.extname(file)] || 'application/octet-stream');
    }

    // 읽기 API
    if (req.method === 'GET' && p === '/api/state') return json(200, publicState());
    if (req.method === 'GET' && p === '/api/events') {
      bus.subscribe(res);
      res.write(`event: state\ndata: ${JSON.stringify(publicState())}\n\n`);
      for (const e of bus.logBuffer.slice(-200)) res.write(`event: log\ndata: ${JSON.stringify(e)}\n\n`);
      return;
    }
    if (req.method === 'GET' && p === '/api/log') return send(200, bus.logBuffer.map((e) => `${e.t} [${e.level}] ${e.text}`).join('\n'), 'text/plain; charset=utf-8');

    // 쓰기 API: 전용 헤더 필수(다른 사이트에서 fetch 하면 CORS 사전요청에서 막힘)
    if (req.method === 'POST') {
      if (req.headers['x-fsg-installer'] !== '1') return json(403, { error: { code: 'FORBIDDEN', message: '허용되지 않은 요청' } });
      const body = await readBody(req);

      if (p === '/api/nav') {
        const step = Math.max(0, Math.min(STEP_IDS.length - 1, parseInt(body.step, 10) || 0));
        if (step > unlockedStep(store.state)) return json(409, { error: { code: 'LOCKED', message: '앞 단계를 먼저 끝내야 해요.' } });
        store.patch({ currentStep: step }); emitState();
        return json(200, { ok: true, currentStep: step });
      }
      if (p === '/api/quit') {
        json(200, { ok: true });
        console.log('\n  사용자가 화면에서 도우미를 닫았습니다. 종료합니다.');
        setTimeout(() => process.exit(0), 200);
        return;
      }
      const m = p.match(/^\/api\/action\/([a-z][a-z0-9.]*)$/i);
      if (m) {
        const act = actions[m[1]];
        if (!act) return json(404, { error: { code: 'NO_ACTION', message: `알 수 없는 작업: ${m[1]}` } });
        if (act.job) {
          if (jobs.busy) return json(409, { error: { code: 'BUSY', message: '다른 작업이 진행 중이에요. 끝난 뒤 다시 시도하세요.' } });
          const job = jobs.start(m[1], (report) => act.run(body, report), { steps: act.steps || [] });
          return json(202, { ok: true, job });
        }
        try {
          const result = await act.run(body);
          return json(200, result ?? { ok: true });
        } catch (e) {
          const ue = e instanceof InstallError ? e : new InstallError('UNKNOWN', '예상하지 못한 문제가 생겼어요.', { detail: e?.stack || String(e) });
          bus.log(`${m[1]} 실패: [${ue.code}] ${ue.message}`, 'error');
          return json(400, { error: ue.toJSON() });
        }
      }
    }
    return send(404, 'Not found', 'text/plain');
  } catch (e) {
    bus.log(`서버 오류: ${e?.stack || e}`, 'error');
    return json(500, { error: { code: 'SERVER', message: '도우미 내부 오류가 생겼어요. 기록을 확인하세요.' } });
  }
});

server.listen(0, '127.0.0.1', () => {
  PORT = server.address().port;
  const url = `http://127.0.0.1:${PORT}/`;
  console.log('');
  console.log('  ┌──────────────────────────────────────────────┐');
  console.log('  │  설치 도우미가 열렸습니다.                    │');
  console.log(`  │  주소: ${url.padEnd(38)}│`);
  console.log('  │  브라우저가 열리지 않으면 위 주소를 직접 여세요 │');
  console.log('  │  이 창을 닫으면 도우미가 종료됩니다.           │');
  console.log('  └──────────────────────────────────────────────┘');
  console.log(`READY ${url}`);
  bus.log(`설치 도우미 시작 (배포본 ${kitVersion.version || '?'}, Node ${process.version}, ${store.resumed ? '이전 진행 이어감' : '새로 시작'})`);
  if (!NO_BROWSER) { try { openBrowser(url); } catch (e) { console.log(`  (브라우저 자동 열기 실패: ${e.message})`); } }
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { console.log('\n  종료합니다.'); process.exit(0); });
}
