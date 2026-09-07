// Step 6: 초기 데이터 등록 — 회중 정보 화면에서 정한 집단 목록으로 groups.csv 를 만들고
// 배포본의 scripts/setup-from-csv.mjs 를 포터블 Node 로 실행한다(서비스 계정 키 사용, npm 의존 없음).
// 재실행 안전: 스크립트가 config/app 이 이미 있으면 건너뛴다(SEED_SKIP_IF_INITIALIZED=1). 강제는 body.force.

import fs from 'node:fs';
import path from 'node:path';
import { InstallError } from '../lib/errors.mjs';

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function writeSeedTemplates(ctx) {
  const st = ctx.store.state;
  const src = path.join(ctx.kitRoot, 'templates');
  const dest = path.join(ctx.kitRoot, '.install', 'templates');
  fs.mkdirSync(dest, { recursive: true });
  for (const f of ['members.csv', 'notices.csv', 'roles.csv']) {
    const p = path.join(src, f);
    if (!fs.existsSync(p)) throw new InstallError('TEMPLATE_MISSING', `초기 데이터 틀이 없어요: templates/${f}`, { actions: [] });
    fs.writeFileSync(path.join(dest, f), fs.readFileSync(p, 'utf8').replace(/^﻿/, ''), 'utf8');
  }
  const groups = (st.cong.groups || []).map((g, i) => ({ key: g.key || `group${i + 1}`, name: g.name || `${i + 1}집단`, sortOrder: i + 1 }));
  if (!groups.length) throw new InstallError('NO_GROUPS', '집단 목록이 비어 있어요. 회중 정보 화면에서 집단을 정해 주세요.', { actions: [] });
  const lines = ['key,name,overseerName,assistantName,active,sortOrder', ...groups.map((g) => [g.key, csvCell(g.name), '', '', 'true', g.sortOrder].join(','))];
  fs.writeFileSync(path.join(dest, 'groups.csv'), lines.join('\n') + '\n', 'utf8');
  return { dir: dest, groups };
}

export async function runSeed(ctx, report, body = {}) {
  const st = ctx.store.state;
  const fb = st.firebase;
  if (!fb.saKeyPath || !fs.existsSync(fb.saKeyPath)) throw new InstallError('NO_SAKEY', '서비스 계정 키 파일이 없어요(5단계).', { actions: [] });
  const { dir, groups } = writeSeedTemplates(ctx);
  const script = path.join(ctx.kitRoot, 'scripts', 'setup-from-csv.mjs');
  if (!fs.existsSync(script)) throw new InstallError('SEED_SCRIPT', '초기 데이터 등록 도구(scripts/setup-from-csv.mjs)가 없어요.', { actions: [] });
  const env = {
    GOOGLE_APPLICATION_CREDENTIALS: fb.saKeyPath,
    FIREBASE_PROJECT_ID: fb.projectId,
    CONG_NAME: st.cong.name,
    TEMPLATE_DIR: dir,
    SEED_SKIP_IF_INITIALIZED: body.force ? '' : '1'
  };
  const r = await ctx.exec.run('node', [script], { cwd: ctx.kitRoot, env, timeoutMs: 5 * 60 * 1000 });
  if (r.code !== 0) {
    const t = r.out;
    if (/PERMISSION_DENIED|403/.test(t)) throw new InstallError('SEED_PERMISSION', '초기 데이터를 쓸 권한이 없어요. 서비스 계정 키가 이 프로젝트 것인지 확인하세요.', { detail: t.slice(-600) });
    if (/ENOTFOUND|ECONNRESET|fetch failed|ETIMEDOUT/i.test(t)) throw new InstallError('NETWORK', '인터넷 연결이 불안정해요. 연결을 확인한 뒤 다시 시도하세요.', { detail: t.slice(-400) });
    throw new InstallError('SEED', '초기 데이터를 등록하지 못했어요.', { detail: t.slice(-800) });
  }
  const skipped = /이미 초기화/.test(r.out);
  const detail = skipped ? '이미 등록되어 있어 그대로 둠' : `집단 ${groups.length}개, 역할·광고 항목 기본값`;
  ctx.store.patch({ install: { ...ctx.store.state.install, seeded: true, seededAt: new Date().toISOString() } }); ctx.emitState();
  if (report) report.done('seed', detail);
  return { ok: true, skipped, groups: groups.length };
}
