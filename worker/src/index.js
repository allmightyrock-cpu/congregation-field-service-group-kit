import { mintMemberTokenEmulator, mintMemberTokenSigned, isValidGroupKey } from './token.js';
import { pinLogin, changePin, setElderPin } from './auth.js';
import { getAccessToken } from './oauth.js';
import { getDoc, writeDoc } from './firestore.js';
import { resolveReportConfig } from '../../shared/report-period.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type'
};

const json = (body, init = {}) => new Response(JSON.stringify(body), {
  ...init,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    ...CORS,
    ...(init.headers || {})
  }
});

function loadServiceAccount(env) {
  return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
}

async function syncReportConfig({ env, projectId, tokenMode, emulatorHost }) {
  let serviceAccount;
  let accessToken = 'owner';
  if (tokenMode !== 'emulator') {
    serviceAccount = loadServiceAccount(env);
    accessToken = await getAccessToken(serviceAccount);
  }
  const current = await getDoc({ path: 'config/app', projectId, accessToken, emulatorHost }) || {};
  const next = resolveReportConfig(current);
  await writeDoc({
    path: 'config/app',
    projectId,
    accessToken,
    emulatorHost,
    data: {
      congName: next.congName || '회중',
      reportPeriodOverride: next.reportPeriodOverride || '',
      reportPeriod: next.reportPeriod,
      reportOpen: next.reportOpen,
      updatedAt: new Date().toISOString(),
      updatedBy: 'system'
    }
  });
  return next;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const projectId = (env && env.FIREBASE_PROJECT_ID) || '';
    const tokenMode = (env && env.TOKEN_MODE) || 'emulator'; // 배포 시 'signed'
    // emulator 모드에서만 로컬 Firestore 에뮬레이터를 봄. signed 모드는 실 Firestore(OAuth).
    const emulatorHost = tokenMode === 'emulator'
      ? ((env && env.FIRESTORE_EMULATOR_HOST) || '127.0.0.1:8080')
      : undefined;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // 헬스체크
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'congregation-field-service-group-api', tokenMode });
    }

    // 성원 집단 토큰 발급 (PIN 없음) — A안
    if (request.method === 'POST' && url.pathname === '/auth/member-token') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
      }
      const groupKey = body && body.groupKey;
      if (!isValidGroupKey(groupKey)) {
        return json({ ok: false, error: 'INVALID_GROUP_KEY' }, { status: 400 });
      }

      if (tokenMode === 'emulator') {
        const customToken = mintMemberTokenEmulator({ projectId, groupKey });
        return json({ ok: true, customToken, mode: 'emulator' });
      }

      // signed: 서비스 계정 키(RS256)로 실서명
      let serviceAccount;
      try {
        serviceAccount = loadServiceAccount(env);
      } catch {
        return json({ ok: false, error: 'SERVICE_ACCOUNT_NOT_CONFIGURED' }, { status: 500 });
      }
      try {
        const customToken = await mintMemberTokenSigned({ groupKey, serviceAccount });
        return json({ ok: true, customToken, mode: 'signed' });
      } catch (e) {
        return json({ ok: false, error: String(e.message || e) }, { status: 500 });
      }
    }

    // 편집자 PIN 로그인 → 편집자 claims 토큰
    if (request.method === 'POST' && url.pathname === '/auth/pin-login') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
      }

      let serviceAccount;
      if (tokenMode !== 'emulator') {
        try {
          serviceAccount = loadServiceAccount(env);
        } catch {
          return json({ ok: false, error: 'SERVICE_ACCOUNT_NOT_CONFIGURED' }, { status: 500 });
        }
      }

      try {
        const result = await pinLogin(
          { scope: body.scope, key: body.key, pin: body.pin },
          { projectId, tokenMode, serviceAccount, emulatorHost }
        );
        const { status, ...rest } = result;
        return json(rest, { status });
      } catch (e) {
        return json({ ok: false, error: String(e.message || e) }, { status: 500 });
      }
    }

    // 본인 PIN 변경
    if (request.method === 'POST' && url.pathname === '/auth/change-pin') {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'INVALID_JSON' }, { status: 400 }); }

      let serviceAccount;
      if (tokenMode !== 'emulator') {
        try { serviceAccount = loadServiceAccount(env); }
        catch { return json({ ok: false, error: 'SERVICE_ACCOUNT_NOT_CONFIGURED' }, { status: 500 }); }
      }
      try {
        const result = await changePin(
          { scope: body.scope, key: body.key, oldPin: body.oldPin, newPin: body.newPin },
          { projectId, tokenMode, serviceAccount, emulatorHost }
        );
        const { status, ...rest } = result;
        return json(rest, { status });
      } catch (e) {
        return json({ ok: false, error: String(e.message || e) }, { status: 500 });
      }
    }

    // 조정자가 회중 장로(elder) 공유 로그인 PIN 설정
    if (request.method === 'POST' && url.pathname === '/auth/set-elder-pin') {
      let body;
      try { body = await request.json(); } catch { return json({ ok: false, error: 'INVALID_JSON' }, { status: 400 }); }

      let serviceAccount;
      if (tokenMode !== 'emulator') {
        try { serviceAccount = loadServiceAccount(env); }
        catch { return json({ ok: false, error: 'SERVICE_ACCOUNT_NOT_CONFIGURED' }, { status: 500 }); }
      }
      try {
        const result = await setElderPin(
          { coordPin: body.coordPin, newPin: body.newPin },
          { projectId, tokenMode, serviceAccount, emulatorHost }
        );
        const { status, ...rest } = result;
        return json(rest, { status });
      } catch (e) {
        return json({ ok: false, error: String(e.message || e) }, { status: 500 });
      }
    }

    return json({ ok: false, error: 'NOT_FOUND' }, { status: 404 });
  },

  async scheduled(event, env, ctx) {
    const projectId = (env && env.FIREBASE_PROJECT_ID) || '';
    const tokenMode = (env && env.TOKEN_MODE) || 'emulator';
    const emulatorHost = tokenMode === 'emulator'
      ? ((env && env.FIRESTORE_EMULATOR_HOST) || '127.0.0.1:8080')
      : undefined;

    ctx.waitUntil(syncReportConfig({ env, projectId, tokenMode, emulatorHost }));
  }
};
