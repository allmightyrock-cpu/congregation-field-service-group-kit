// 설치 상태 파일(install-state.json) — 재실행 시 이어하기의 근거.
// 위치: <배포본>/.install/install-state.json  (.gitignore 대상)
// 원칙: 비밀값(서비스 계정 키 내용, 토큰, PIN)은 절대 저장하지 않는다. 키는 "경로"만 기록.

import fs from 'node:fs';
import path from 'node:path';

export const STATE_VERSION = 1;

export const STEP_IDS = ['precheck', 'start', 'cong', 'google', 'auth', 'sakey', 'cloudflare', 'confirm', 'install', 'done'];

export function emptyState() {
  const now = new Date().toISOString();
  return {
    version: STATE_VERSION,
    createdAt: now,
    updatedAt: now,
    currentStep: 0,
    precheck: { ok: false, at: null, items: [] },
    cong: { name: '', slug: '', groupCount: 3, groups: [] },
    firebase: { projectId: '', webAppId: '', config: null, authEnabled: false, saKeyPath: '', saKeyProjectId: '' },
    cloudflare: { loggedIn: false, accountId: '', accountName: '', workerName: '', workerUrl: '', pagesProject: '', pagesUrl: '' },
    install: { status: 'idle', startedAt: null, finishedAt: null, tasks: {} , lastError: null },
    result: { siteUrl: '', workerUrl: '', pins: [], savedAt: null }
  };
}

export class StateStore {
  constructor(kitRoot) {
    this.dir = path.join(kitRoot, '.install');
    this.file = path.join(this.dir, 'install-state.json');
    this.state = emptyState();
    this.resumed = false;
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        const raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
        if (raw && raw.version === STATE_VERSION) {
          this.state = { ...emptyState(), ...raw };
          this.resumed = true;
        }
      }
    } catch {
      // 손상된 상태 파일은 무시하고 새로 시작(백업 남김)
      try { fs.renameSync(this.file, this.file + '.broken-' + Date.now()); } catch {}
      this.state = emptyState();
    }
    return this.state;
  }

  save() {
    this.state.updatedAt = new Date().toISOString();
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  reset() {
    try { if (fs.existsSync(this.file)) fs.renameSync(this.file, this.file + '.reset-' + Date.now()); } catch {}
    this.state = emptyState();
    this.resumed = false;
    this.save();
  }

  // 얕은 경로 병합: patch({ cong: {...} })
  patch(partial) {
    for (const [k, v] of Object.entries(partial || {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && this.state[k] && typeof this.state[k] === 'object') {
        this.state[k] = { ...this.state[k], ...v };
      } else {
        this.state[k] = v;
      }
    }
    this.save();
    return this.state;
  }
}

// ---------- 화면 게이트(다음 버튼 활성 조건) — 서버가 단일 진실 ----------
export function gates(state) {
  const c = state.cong || {};
  const groupsOk = Array.isArray(c.groups) && c.groups.length >= 1 && c.groups.length <= 12 &&
    c.groups.every((g) => g && String(g.name || '').trim()) &&
    new Set(c.groups.map((g) => String(g.name).trim())).size === c.groups.length;
  const congOk = String(c.name || '').trim().length >= 2 && isValidSlug(c.slug) && groupsOk;
  const fb = state.firebase || {};
  const cf = state.cloudflare || {};
  return {
    precheck: !!state.precheck?.ok,
    start: true,
    cong: congOk,
    google: !!(fb.projectId && fb.config && fb.config.apiKey && fb.config.appId),
    auth: !!fb.authEnabled,
    sakey: !!fb.saKeyPath,
    cloudflare: !!cf.loggedIn,
    confirm: ['running', 'ok', 'error'].includes(state.install?.status), // 한 번 시작하면 진행 화면(오류 포함) 접근 가능
    install: state.install?.status === 'ok',
    done: false
  };
}

// 열려 있는 최대 화면 번호: 앞 화면들의 게이트가 모두 통과한 곳까지
export function unlockedStep(state) {
  const g = gates(state);
  let n = 0;
  for (let i = 0; i < STEP_IDS.length - 1; i++) {
    if (g[STEP_IDS[i]]) n = i + 1; else break;
  }
  return n;
}

export function isValidSlug(s) {
  return /^[a-z][a-z0-9-]{3,21}$/.test(String(s || '')) && !/--/.test(s) && !/-$/.test(s);
}
