// 화면 0: 사전 점검 — 인터넷, 배포본 무결성, 번들 도구 실행, 실행환경 버전

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

function head(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const req = https.request(url, { method: 'HEAD', timeout: timeoutMs, headers: { 'User-Agent': 'FSG-Installer' } }, (res) => {
      res.resume();
      resolve({ ok: res.statusCode > 0 && res.statusCode < 500, status: res.statusCode });
    });
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, error: 'timeout' }); });
    req.on('error', (e) => resolve({ ok: false, status: 0, error: e.code || e.message }));
    req.end();
  });
}

export async function runPrecheck({ kitRoot, spec, exec, toolsBin }) {
  const items = [];
  const add = (key, label, ok, detail = '', fix = '') => items.push({ key, label, ok: !!ok, detail, fix });

  // 1) 인터넷: 설치에 필요한 세 서비스
  const targets = [
    ['google', 'Google(Firebase) 접속', 'https://firebase.googleapis.com/'],
    ['cloudflare', 'Cloudflare 접속', 'https://api.cloudflare.com/client/v4/'],
    ['npm', 'nodejs.org 접속', 'https://nodejs.org/dist/']
  ];
  const results = await Promise.all(targets.map(([, , u]) => head(u)));
  targets.forEach(([key, label], i) => {
    const r = results[i];
    add('net-' + key, label, r.ok, r.ok ? `응답 ${r.status}` : (r.error || `응답 ${r.status}`),
      r.ok ? '' : '인터넷 연결을 확인하세요. 회사·학교 망이면 보안 프로그램이 막고 있을 수 있어요.');
  });

  // 2) 배포본 무결성: 있어야 하는 파일
  const required = [
    ['web/dist/index.html', '웹 화면 빌드본'],
    ['web/dist/config.js', '웹 설정 파일 틀'],
    ['worker/src/index.js', '서버(Worker) 코드'],
    ['worker/wrangler.toml', '서버 배포 설정'],
    ['firestore.rules', '데이터 보안 규칙'],
    ['firestore.indexes.json', '데이터 색인 설정'],
    ['templates/groups.csv', '초기 데이터 틀(집단)'],
    ['templates/roles.csv', '초기 데이터 틀(역할)'],
    ['scripts/setup-from-csv.mjs', '초기 데이터 등록 도구']
  ];
  const missing = required.filter(([rel]) => !fs.existsSync(path.join(kitRoot, rel)));
  add('bundle', '배포본 파일 확인', missing.length === 0,
    missing.length ? '없는 파일: ' + missing.map(([rel, l]) => `${l}(${rel})`).join(', ') : `${required.length}개 파일 모두 있음`,
    missing.length ? '배포본 압축을 전부 풀었는지, 폴더를 옮기다 빠진 파일이 없는지 확인하세요.' : '');

  // 3) 실행환경 버전
  const wantNode = spec.nodeVersion ? `v${spec.nodeVersion}` : '';
  add('node', 'Node.js 실행환경', !wantNode || process.version === wantNode, `${process.version}${wantNode ? ` (기준 ${wantNode})` : ''}`,
    (!wantNode || process.version === wantNode) ? '' : '설치 파일을 다시 실행하면 기준 버전으로 다시 준비합니다.');

  // 4) 번들 도구 실제 실행
  for (const [tool, want, label] of [['wrangler', spec.wranglerVersion, 'Cloudflare 도구(wrangler)'], ['firebase', spec.firebaseToolsVersion, 'Firebase 도구(firebase-tools)']]) {
    try {
      const r = await exec.run(tool, ['--version'], { quiet: true, timeoutMs: 90000 });
      const v = (r.out.match(/(\d+\.\d+\.\d+)/) || [])[1] || '';
      const ok = r.code === 0 && (!want || v === want);
      add('tool-' + tool, label, ok, ok ? `버전 ${v}` : `실행 결과 코드 ${r.code}${v ? `, 버전 ${v}` : ''} (기준 ${want})`,
        ok ? '' : '설치 파일을 다시 실행하면 도구를 다시 준비합니다. 계속 실패하면 "설치.cmd -Reset" 으로 실행하세요.');
    } catch (e) {
      add('tool-' + tool, label, false, e.message, '설치 파일을 다시 실행해 실행환경을 준비하세요.');
    }
  }

  const ok = items.every((i) => i.ok);
  return { ok, at: new Date().toISOString(), items };
}
