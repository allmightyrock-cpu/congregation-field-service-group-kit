// Step 7: 완료 화면 산출물 — 설치 결과 파일(키·PIN 제외) 저장, 폴더 열기

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { InstallError } from '../lib/errors.mjs';

function safeName(s) {
  return String(s || '회중').replace(/[\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 40) || '회중';
}

export function buildResultText(ctx) {
  const st = ctx.store.state;
  const c = st.cong, fb = st.firebase, cf = st.cloudflare, r = st.result || {};
  const now = new Date();
  const lines = [
    `${c.name} 야외 봉사 집단 앱 — 설치 결과`,
    `작성: ${now.toLocaleString('ko-KR')}`,
    '',
    '■ 접속 주소 (성원에게 공유)',
    `  ${r.siteUrl || cf.pagesUrl || '(미확인)'}`,
    `  집단별 주소: ${(c.groups || []).map((g) => `${g.name} → ${(r.siteUrl || cf.pagesUrl || '')}/?g=${g.key}`).join('  |  ')}`,
    '',
    '■ 서버',
    `  Worker 주소: ${r.workerUrl || cf.workerUrl || '(미확인)'}`,
    `  Cloudflare 계정: ${cf.email || ''}${cf.accountName ? ` (${cf.accountName})` : ''}`,
    `  Worker 이름: ${cf.workerName || ''} / Pages 프로젝트: ${cf.pagesProject || ''}`,
    '',
    '■ 데이터',
    `  Firebase 프로젝트: ${fb.projectId || ''}  (Google 계정: ${fb.account || ''})`,
    `  콘솔: https://console.firebase.google.com/project/${fb.projectId || ''}/overview`,
    `  집단 ${c.groups?.length || 0}개: ${(c.groups || []).map((g) => `${g.name}(${g.key})`).join(', ')}`,
    '',
    '■ 로그인 PIN',
    '  기본 PIN 은 보안상 이 파일에 적지 않습니다. 설치 도우미 완료 화면의 표 또는 배포본 templates/roles.csv 를 참고하세요.',
    '  첫 로그인 후 편집자 화면에서 반드시 PIN 을 바꾸세요. (집단 감독자 PIN 기본값은 0000)',
    '',
    '■ 다음에 할 일',
    '  1. 편집자 로그인 → PIN 변경',
    '  2. 편집자 화면 → 집단 성원 입력',
    '  3. 성원에게 접속 주소 안내 (휴대폰: "홈 화면에 추가")',
    '',
    '■ 다시 설치·업데이트할 때',
    `  배포본 폴더: ${ctx.kitRoot}`,
    '  설치 파일(설치.cmd / 설치.command)을 다시 실행하면 저장된 진행 상태에서 이어갑니다.',
    '  서비스 계정 키(.secrets 폴더)는 이 PC 밖으로 보내지 마세요. 이 파일에는 키가 들어 있지 않습니다.',
    ''
  ];
  return lines.join('\n');
}

export function saveResult(ctx) {
  const st = ctx.store.state;
  if (st.install?.status !== 'ok') throw new InstallError('NOT_DONE', '설치가 끝난 뒤에 저장할 수 있어요.', { actions: [] });
  const file = path.join(ctx.kitRoot, `설치결과_${safeName(st.cong.name)}.txt`);
  fs.writeFileSync(file, '﻿' + buildResultText(ctx), 'utf8');   // BOM: Windows 메모장에서 한글 깨짐 방지
  ctx.store.patch({ result: { ...st.result, savedAt: new Date().toISOString(), savedPath: file } }); ctx.emitState();
  ctx.bus.log(`설치 결과 파일 저장: ${file}`);
  return { ok: true, path: file };
}

export function revealFile(ctx, p) {
  const file = String(p || ctx.store.state.result?.savedPath || '');
  if (!file || !fs.existsSync(file)) throw new InstallError('NO_FILE', '아직 저장된 파일이 없어요. 먼저 [결과 파일 저장]을 누르세요.', { actions: [] });
  if (process.platform === 'win32') spawn('explorer.exe', ['/select,', file], { detached: true, stdio: 'ignore' }).unref();
  else if (process.platform === 'darwin') spawn('open', ['-R', file], { detached: true, stdio: 'ignore' }).unref();
  else spawn('xdg-open', [path.dirname(file)], { detached: true, stdio: 'ignore' }).unref();
  return { ok: true };
}
