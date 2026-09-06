// 야외 봉사 집단 배포본 — 설치 도우미 로컬 서버 (Step 2 골격)
// bootstrap.ps1 / bootstrap.sh 가 준비한 포터블 Node 로 실행된다.
// 지금 단계(Step 2)에서는 "실행환경 준비 상태" 화면만 제공하고,
// 설치 화면(9단계 흐름)은 Step 3 에서 이 서버 위에 얹는다.
//
// 보안: 127.0.0.1 에만 바인딩(같은 PC의 브라우저만 접근). 외부 노출 없음.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_WIN = process.platform === 'win32';
const KIT_ROOT = process.env.FSG_KIT_ROOT || path.resolve(__dirname, '..');
const RUNTIME_ROOT = process.env.FSG_RUNTIME_DIR || defaultRuntimeRoot();
const TOOLS_DIR = path.join(RUNTIME_ROOT, 'tools');
const TOOLS_BIN = path.join(TOOLS_DIR, 'node_modules', '.bin');
const NO_BROWSER = process.env.FSG_NO_BROWSER === '1';
const LOG_PATH = process.env.FSG_INSTALLER_LOG || '';

function defaultRuntimeRoot() {
  if (IS_WIN) return path.join(process.env.LOCALAPPDATA || os.homedir(), 'FSG_Installer', 'runtime');
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library', 'Application Support', 'FSG_Installer', 'runtime');
  return path.join(os.homedir(), '.fsg-installer', 'runtime');
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

const spec = readJson(path.join(__dirname, 'runtime.json')) || {};
const kitVersion = readJson(path.join(KIT_ROOT, 'VERSION.json')) || {};

// ---------- 도구 실행 확인(실제로 실행되는지) ----------
const toolStatus = {
  wrangler: { want: spec.wranglerVersion || '', installed: pkgVersion('wrangler'), run: null, state: 'checking' },
  'firebase-tools': { want: spec.firebaseToolsVersion || '', installed: pkgVersion('firebase-tools'), run: null, state: 'checking' }
};

function pkgVersion(pkg) {
  const j = readJson(path.join(TOOLS_DIR, 'node_modules', pkg, 'package.json'));
  return j?.version || '';
}

function runTool(binName, args) {
  return new Promise((resolve) => {
    const env = { ...process.env, NO_UPDATE_NOTIFIER: '1', CI: '1', WRANGLER_SEND_METRICS: 'false' };
    const opts = { env, timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024 };
    const done = (err, stdout, stderr) => {
      const out = String(stdout || '').trim();
      const errText = String(stderr || '').trim();
      resolve({ ok: !err, out: out || errText, code: err ? (err.code ?? 1) : 0 });
    };
    if (IS_WIN) {
      const cmd = path.join(TOOLS_BIN, `${binName}.cmd`);
      execFile(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${cmd}" ${args.join(' ')}`], { ...opts, windowsVerbatimArguments: true }, done);
    } else {
      execFile(path.join(TOOLS_BIN, binName), args, opts, done);
    }
  });
}

async function verifyTools() {
  const w = await runTool('wrangler', ['--version']);
  const wv = (w.out.match(/(\d+\.\d+\.\d+)/) || [])[1] || '';
  toolStatus.wrangler.run = w.ok ? wv || w.out.slice(0, 80) : `실행 실패: ${w.out.slice(0, 160)}`;
  toolStatus.wrangler.state = w.ok && (!toolStatus.wrangler.want || wv === toolStatus.wrangler.want) ? 'ok' : 'error';

  const f = await runTool('firebase', ['--version']);
  const fv = (f.out.match(/(\d+\.\d+\.\d+)/) || [])[1] || '';
  toolStatus['firebase-tools'].run = f.ok ? fv || f.out.slice(0, 80) : `실행 실패: ${f.out.slice(0, 160)}`;
  toolStatus['firebase-tools'].state = f.ok && (!toolStatus['firebase-tools'].want || fv === toolStatus['firebase-tools'].want) ? 'ok' : 'error';
}

function envPayload() {
  const distConfig = path.join(KIT_ROOT, 'web', 'dist', 'config.js');
  return {
    step: 2,
    platform: `${IS_WIN ? 'Windows' : process.platform === 'darwin' ? 'macOS' : process.platform} ${os.release()} (${os.arch()})`,
    node: process.version,
    nodeWant: spec.nodeVersion ? `v${spec.nodeVersion}` : '',
    nodePath: process.execPath,
    kitRoot: KIT_ROOT,
    kitVersion: kitVersion.version || '(VERSION.json 없음)',
    runtimeRoot: RUNTIME_ROOT,
    distReady: fs.existsSync(path.join(KIT_ROOT, 'web', 'dist', 'index.html')),
    distConfigReady: fs.existsSync(distConfig),
    tools: toolStatus,
    log: LOG_PATH,
    allOk: process.version === `v${spec.nodeVersion}` &&
      Object.values(toolStatus).every((t) => t.state === 'ok') &&
      fs.existsSync(path.join(KIT_ROOT, 'web', 'dist', 'index.html'))
  };
}

// ---------- 화면 ----------
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function pageHtml() {
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>야외 봉사 집단 설치 도우미</title>
<style>
  :root{--blue:#19579e;--blue-deep:#123f73;--line:#d9e1ec;--ink:#1c2430;--muted:#5d6b7c;--ok:#1f7a3a;--warn:#a05a00;--bad:#b3261e;--bg:#f3f6fa}
  *{box-sizing:border-box}body{margin:0;font-family:"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif;background:var(--bg);color:var(--ink);font-size:15px;line-height:1.55}
  header{background:var(--blue);color:#fff;padding:18px 22px}header h1{margin:0;font-size:20px;font-weight:800}header p{margin:4px 0 0;opacity:.85;font-size:13px}
  main{max-width:820px;margin:0 auto;padding:22px 16px 60px}
  .card{background:#fff;border:1px solid var(--line);border-radius:4px;padding:18px 20px;margin-bottom:14px}
  .card h2{margin:0 0 10px;font-size:16px;color:var(--blue-deep)}
  .status{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px}
  .dot{width:12px;height:12px;border-radius:50%;background:#c9d2de;flex:none}.dot.ok{background:var(--ok)}.dot.bad{background:var(--bad)}.dot.checking{background:var(--warn);animation:b 1s infinite alternate}@keyframes b{to{opacity:.35}}
  table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}th{width:150px;color:var(--muted);font-weight:700}
  td code{font-family:Consolas,Menlo,monospace;font-size:12.5px;color:#2a3a52;word-break:break-all}
  .pill{display:inline-block;padding:1px 8px;border-radius:4px;font-size:12px;font-weight:800;color:#fff;background:#8a97a8}.pill.ok{background:var(--ok)}.pill.bad{background:var(--bad)}.pill.checking{background:var(--warn)}
  .muted{color:var(--muted);font-size:13px}
  button{font:inherit;font-weight:800;border:1px solid var(--blue);background:var(--blue);color:#fff;border-radius:4px;padding:9px 16px;cursor:pointer}button.ghost{background:#fff;color:var(--blue)}
  .actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
</style></head><body>
<header><h1>야외 봉사 집단 설치 도우미</h1><p>회중 서버 준비 · 1단계: 실행환경 확인</p></header>
<main>
  <section class="card">
    <div class="status"><span class="dot checking" id="dot"></span><span id="headline">실행환경을 확인하는 중입니다…</span></div>
    <p class="muted" id="sub">배포 도구가 실제로 실행되는지 점검하고 있습니다. 몇 초 걸립니다.</p>
  </section>
  <section class="card">
    <h2>확인 내용</h2>
    <table id="tbl"><tbody></tbody></table>
  </section>
  <section class="card">
    <h2>다음</h2>
    <p>다음 단계 화면(Google·Cloudflare 자동 준비)은 아직 준비 중입니다. 이 화면은 실행환경이 올바르게 내려받아지고 실행되는지 확인하기 위한 것입니다.</p>
    <div class="actions">
      <button class="ghost" id="recheck" type="button">다시 확인</button>
      <button id="quit" type="button">도우미 닫기</button>
    </div>
    <p class="muted" id="logline"></p>
  </section>
</main>
<script>
const $ = (s) => document.querySelector(s);
function pill(state, text){ return '<span class="pill '+state+'">'+text+'</span>'; }
function row(k, v){ return '<tr><th>'+k+'</th><td>'+v+'</td></tr>'; }
async function load(){
  const r = await fetch('/api/env', {cache:'no-store'}); const e = await r.json();
  const t = e.tools;
  const tl = (name) => { const x = t[name]; const st = x.state; const label = st==='ok' ? '정상' : st==='checking' ? '확인 중' : '문제';
    return pill(st,label)+' 설치 '+(x.installed||'없음')+(x.want?' / 기준 '+x.want:'')+(x.run?' · 실행 결과: <code>'+esc(x.run)+'</code>':''); };
  $('#tbl tbody').innerHTML = [
    row('운영체제', esc(e.platform)),
    row('Node.js', pill(e.node===e.nodeWant?'ok':'bad', e.node===e.nodeWant?'정상':'버전 불일치')+' '+esc(e.node)+(e.nodeWant?' / 기준 '+esc(e.nodeWant):'')+'<br><code>'+esc(e.nodePath)+'</code>'),
    row('wrangler', tl('wrangler')),
    row('firebase-tools', tl('firebase-tools')),
    row('배포본', pill(e.distReady?'ok':'bad', e.distReady?'빌드본 있음':'web/dist 없음')+' 버전 '+esc(e.kitVersion)+'<br><code>'+esc(e.kitRoot)+'</code>'),
    row('실행환경 폴더', '<code>'+esc(e.runtimeRoot)+'</code>')
  ].join('');
  const checking = Object.values(t).some(x=>x.state==='checking');
  $('#dot').className = 'dot ' + (checking ? 'checking' : e.allOk ? 'ok' : 'bad');
  $('#headline').textContent = checking ? '실행환경을 확인하는 중입니다…' : e.allOk ? '실행환경 준비가 끝났습니다.' : '확인이 필요한 항목이 있습니다.';
  $('#sub').textContent = checking ? '배포 도구가 실제로 실행되는지 점검하고 있습니다. 몇 초 걸립니다.' : e.allOk ? 'Node.js와 배포 도구가 모두 정상 동작합니다. 다음 단계 화면이 준비되면 여기서 이어집니다.' : '아래 표에서 "문제"로 표시된 항목을 확인하세요. 설치 파일을 다시 실행하면 자동으로 다시 준비합니다.';
  $('#logline').textContent = e.log ? '기록 파일: ' + e.log : '';
  if (checking) setTimeout(load, 1500);
}
function esc(s){ return String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
$('#recheck').onclick = () => fetch('/api/recheck', {method:'POST'}).then(load);
$('#quit').onclick = async () => { if (!confirm('설치 도우미를 닫을까요?')) return; await fetch('/api/quit', {method:'POST'}); document.body.innerHTML = '<main><section class="card"><h2>설치 도우미를 닫았습니다.</h2><p>이 탭은 닫아도 됩니다. 다시 열려면 배포본 폴더의 설치 파일을 실행하세요.</p></section></main>'; };
load();
</script>
</body></html>`;
}

// ---------- 서버 ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const send = (code, body, type = 'text/html; charset=utf-8') => {
    res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(body);
  };
  if (req.method === 'GET' && url.pathname === '/') return send(200, pageHtml());
  if (req.method === 'GET' && url.pathname === '/api/env') return send(200, JSON.stringify(envPayload()), 'application/json; charset=utf-8');
  if (req.method === 'POST' && url.pathname === '/api/recheck') {
    for (const t of Object.values(toolStatus)) { t.state = 'checking'; t.run = null; }
    verifyTools();
    return send(200, '{"ok":true}', 'application/json');
  }
  if (req.method === 'POST' && url.pathname === '/api/quit') {
    send(200, '{"ok":true}', 'application/json');
    console.log('\n  사용자가 화면에서 도우미를 닫았습니다. 종료합니다.');
    setTimeout(() => process.exit(0), 200);
    return;
  }
  send(404, 'Not found', 'text/plain; charset=utf-8');
});

function openBrowser(url) {
  try {
    if (IS_WIN) spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch (e) {
    console.log(`  (브라우저 자동 열기 실패: ${e.message}) 아래 주소를 직접 여세요.`);
  }
}

server.listen(0, '127.0.0.1', () => {
  const { port } = server.address();
  const url = `http://127.0.0.1:${port}/`;
  console.log('');
  console.log('  ┌──────────────────────────────────────────────┐');
  console.log('  │  설치 도우미가 열렸습니다.                    │');
  console.log(`  │  주소: ${url.padEnd(38)}│`);
  console.log('  │  브라우저가 열리지 않으면 위 주소를 직접 여세요 │');
  console.log('  │  이 창을 닫으면 도우미가 종료됩니다.           │');
  console.log('  └──────────────────────────────────────────────┘');
  console.log(`READY ${url}`);
  verifyTools();
  if (!NO_BROWSER) openBrowser(url);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { console.log('\n  종료합니다.'); process.exit(0); });
}
