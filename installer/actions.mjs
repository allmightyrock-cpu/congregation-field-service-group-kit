// 화면 버튼 ↔ 서버 작업 연결표.
//  - quick: 즉시 결과를 돌려주는 작업(상태 저장, 제안값 계산, 링크 열기)
//  - job  : 시간이 걸리는 작업(진행 상황은 SSE 'job' 으로 중계)
// Step 4(Google)·5(Cloudflare)·6(시딩) 에서 NOT_READY 자리표시자를 실제 구현으로 바꾼다.

import { spawn } from 'node:child_process';
import { InstallError } from './lib/errors.mjs';
import { runPrecheck } from './lib/precheck.mjs';
import { suggestSlug, namesFromSlug, defaultGroupNames } from './lib/slug.mjs';
import { isValidSlug } from './lib/state.mjs';

const OPEN_ALLOW = [
  /^https:\/\/([a-z0-9-]+\.)*google\.com\//i,
  /^https:\/\/([a-z0-9-]+\.)*firebase\.google\.com\//i,
  /^https:\/\/console\.firebase\.google\.com\//i,
  /^https:\/\/console\.cloud\.google\.com\//i,
  /^https:\/\/([a-z0-9-]+\.)*cloudflare\.com\//i,
  /^https:\/\/([a-z0-9-]+\.)*pages\.dev\//i,
  /^https:\/\/([a-z0-9-]+\.)*workers\.dev\//i,
  /^https:\/\/nodejs\.org\//i,
  /^https:\/\/github\.com\//i
];

export function createActions(ctx) {
  const { store, bus, exec, jobs, spec, kitRoot, toolsBin, emitState, dev } = ctx;
  const notReady = (what) => async () => {
    throw new InstallError('NOT_READY', `${what} 기능은 아직 연결되지 않았어요(개발 진행 중). 다음 업데이트에서 이어집니다.`, { actions: [] });
  };
  // 설치 실행 작업 공통: 시작 시 status=running(진행 화면 열림), 실패 시 status=error(다시 시도 가능), 성공은 작업 안에서 ok 로 기록
  const withInstallStatus = (fn) => async (body, report) => {
    store.patch({ install: { ...store.state.install, status: 'running', startedAt: new Date().toISOString(), finishedAt: null, lastError: null } });
    emitState();
    try {
      return await fn(body, report);
    } catch (e) {
      store.patch({ install: { ...store.state.install, status: 'error', finishedAt: new Date().toISOString(), lastError: e?.code || 'UNKNOWN' } });
      emitState();
      throw e;
    }
  };

  const actions = {
    // ---------- 화면 0 ----------
    'precheck.run': {
      job: true,
      steps: [{ key: 'net', label: '인터넷 연결 확인' }, { key: 'bundle', label: '배포본 파일 확인' }, { key: 'tools', label: '배포 도구 실행 확인' }],
      run: async (body, report) => {
        report.step('net'); report.step('bundle'); report.step('tools');
        const result = await runPrecheck({ kitRoot, spec, exec, toolsBin });
        const by = (prefix) => result.items.filter((i) => i.key.startsWith(prefix));
        const mark = (key, items) => { const bad = items.filter((i) => !i.ok); if (bad.length) report.fail(key, bad.map((i) => i.label).join(', ')); else report.done(key); };
        mark('net', by('net-')); mark('bundle', by('bundle')); mark('tools', [...by('node'), ...by('tool-')]);
        store.patch({ precheck: result });
        emitState();
        return result;
      }
    },

    // ---------- 화면 2 ----------
    'cong.suggest': {
      run: async (body) => {
        const slug = suggestSlug(body.name);
        return { slug, names: namesFromSlug(slug), groups: defaultGroupNames(body.groupCount || 3) };
      }
    },
    'cong.save': {
      run: async (body) => {
        const name = String(body.name || '').trim();
        const slug = String(body.slug || '').trim().toLowerCase();
        const groupCount = Math.max(1, Math.min(12, parseInt(body.groupCount, 10) || 0));
        let groups = Array.isArray(body.groups) ? body.groups : [];
        groups = groups.slice(0, groupCount).map((g, i) => ({ key: `group${i + 1}`, name: String(g?.name ?? g ?? '').trim() }));
        while (groups.length < groupCount) groups.push({ key: `group${groups.length + 1}`, name: `${groups.length + 1}집단` });
        const errors = {};
        if (name.length < 2) errors.name = '회중 이름을 2자 이상 입력하세요.';
        if (!isValidSlug(slug)) errors.slug = '영문 소문자로 시작, 소문자·숫자·하이픈만, 4~22자, 하이픈으로 끝나지 않게 입력하세요.';
        if (!groupCount) errors.groupCount = '집단 수는 1~12 사이여야 해요.';
        if (groups.some((g) => !g.name)) errors.groups = '비어 있는 집단 이름이 있어요.';
        else if (new Set(groups.map((g) => g.name)).size !== groups.length) errors.groups = '같은 집단 이름이 두 번 있어요.';
        if (Object.keys(errors).length) return { ok: false, errors };
        const names = namesFromSlug(slug);
        store.patch({
          cong: { name, slug, groupCount, groups },
          cloudflare: { ...store.state.cloudflare, workerName: store.state.cloudflare.workerName || names.workerName, pagesProject: store.state.cloudflare.pagesProject || names.pagesProject }
        });
        emitState();
        bus.log(`회중 정보 저장: ${name} / ${slug} / 집단 ${groupCount}개`);
        return { ok: true, names };
      }
    },

    // ---------- 화면 3~6: Step 4·5 에서 구현 ----------
    'google.login': { job: true, run: notReady('Google 로그인') },
    'google.project': { job: true, run: notReady('Firebase 프로젝트 준비') },
    'auth.open': { run: notReady('인증 설정 페이지 열기') },
    'auth.verify': { job: true, run: notReady('인증 상태 확인') },
    'sakey.open': { run: notReady('키 만들기 페이지 열기') },
    'sakey.scan': { run: notReady('다운로드 폴더에서 키 찾기') },
    'sakey.pick': { run: notReady('키 파일 등록') },
    'cf.login': { job: true, run: notReady('Cloudflare 로그인') },

    // ---------- 화면 7→8: Step 5·6 에서 구현 ----------
    'install.run': { job: true, run: withInstallStatus(notReady('설치 실행')) },

    // ---------- 공통 ----------
    'open': {
      run: async (body) => {
        const url = String(body.url || '');
        if (!OPEN_ALLOW.some((re) => re.test(url))) throw new InstallError('OPEN_DENIED', '허용되지 않은 주소라 열지 않았어요.', { actions: [], detail: url });
        openBrowser(url);
        bus.log(`브라우저 열기: ${url}`);
        return { ok: true };
      }
    },
    'reset': {
      run: async () => { store.reset(); emitState(); bus.log('설치 상태를 처음으로 되돌렸습니다.'); return { ok: true }; }
    }
  };

  // ---------- 개발 확인용(FSG_DEV=1 일 때만) — 화면 흐름을 실제 클라우드 없이 점검 ----------
  if (dev) {
    actions['demo.job'] = {
      job: true,
      steps: [
        { key: 'rules', label: '데이터 보안 규칙 배포' }, { key: 'worker', label: '서버(Worker) 배포' }, { key: 'secret', label: '서버에 키 저장' },
        { key: 'seed', label: '초기 데이터 등록' }, { key: 'config', label: '웹 설정 파일 생성' }, { key: 'pages', label: '웹 사이트 프로젝트 만들기' },
        { key: 'deploy', label: '웹 사이트 배포' }, { key: 'verify', label: '접속 확인' }
      ],
      run: withInstallStatus(async (body, report) => {
        const failAt = body.failAt || '';
        for (const s of actions['demo.job'].steps) {
          report.step(s.key);
          await new Promise((r) => setTimeout(r, 400));
          if (s.key === failAt) throw new InstallError('DEMO_FAIL', `(시연) ${s.label} 단계에서 실패한 상황입니다.`, { hint: '실제 설치에서는 여기에 원인과 조치가 표시됩니다.' });
          report.done(s.key, s.key === 'worker' ? 'https://example-fsg-api.example.workers.dev' : '');
        }
        store.patch({ install: { ...store.state.install, status: 'ok', finishedAt: new Date().toISOString() }, result: { siteUrl: 'https://example-fsg.pages.dev', workerUrl: 'https://example-fsg-api.example.workers.dev', pins: (store.state.cong.groups || []).map((g) => ({ group: g.name, role: '집단 감독자', pin: '0000' })), savedAt: null } });
        emitState();
        return { ok: true };
      })
    };
    actions['demo.unlock'] = {
      run: async () => {
        store.patch({
          firebase: { projectId: 'demo-fsg', webAppId: '1:1:web:demo', config: { apiKey: 'demo', authDomain: 'demo-fsg.firebaseapp.com', projectId: 'demo-fsg', storageBucket: '', messagingSenderId: '1', appId: '1:1:web:demo' }, authEnabled: true, saKeyPath: 'C:\\demo\\.secrets\\demo-fsg-key.json', saKeyProjectId: 'demo-fsg' },
          cloudflare: { ...store.state.cloudflare, loggedIn: true, accountName: 'demo@example.com' }
        });
        emitState();
        return { ok: true };
      }
    };
    actions['demo.installing'] = {
      run: async () => { store.patch({ install: { ...store.state.install, status: 'running', startedAt: new Date().toISOString() } }); emitState(); return { ok: true }; }
    };
  }

  return actions;
}

export function openBrowser(url) {
  const IS_WIN = process.platform === 'win32';
  if (IS_WIN) spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `start "" "${url}"`], { detached: true, stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true }).unref();
  else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
  else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}
