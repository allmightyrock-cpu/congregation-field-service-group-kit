import { mintMemberTokenEmulator, mintMemberTokenSigned, GROUP_KEYS } from './token.js';
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
      congName: next.congName || '샘플 회중',
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
    const projectId = env && env.FIREBASE_PROJECT_ID;
    if (!projectId) return json({ ok: false, error: 'FIREBASE_PROJECT_ID_REQUIRED' }, { status: 500 });
    const tokenMode = (env && env.TOKEN_MODE) || 'emulator'; // 諛고룷 ??'signed'
    // emulator 紐⑤뱶?먯꽌留?濡쒖뺄 Firestore ?먮??덉씠?곕? 遊? signed 紐⑤뱶????Firestore(OAuth).
    const emulatorHost = tokenMode === 'emulator'
      ? ((env && env.FIRESTORE_EMULATOR_HOST) || '127.0.0.1:8080')
      : undefined;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ?ъ뒪泥댄겕
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'congregation-fsg-kit-api', tokenMode });
    }

    // Member group token without PIN.
    if (request.method === 'POST' && url.pathname === '/auth/member-token') {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'INVALID_JSON' }, { status: 400 });
      }
      const groupKey = body && body.groupKey;
      if (!groupKey || !GROUP_KEYS.includes(groupKey)) {
        return json({ ok: false, error: 'INVALID_GROUP_KEY' }, { status: 400 });
      }

      if (tokenMode === 'emulator') {
        const customToken = mintMemberTokenEmulator({ projectId, groupKey });
        return json({ ok: true, customToken, mode: 'emulator' });
      }

      // signed mode uses a service account secret.
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

    // ?몄쭛??PIN 濡쒓렇?????몄쭛??claims ?좏겙
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

    // Change an editor PIN.
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

    // 議곗젙?먭? ?뚯쨷 ?λ줈(elder) 怨듭쑀 濡쒓렇??PIN ?ㅼ젙
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
    const projectId = env && env.FIREBASE_PROJECT_ID;
    if (!projectId) throw new Error('FIREBASE_PROJECT_ID_REQUIRED');
    const tokenMode = (env && env.TOKEN_MODE) || 'emulator';
    const emulatorHost = tokenMode === 'emulator'
      ? ((env && env.FIRESTORE_EMULATOR_HOST) || '127.0.0.1:8080')
      : undefined;

    ctx.waitUntil(syncReportConfig({ env, projectId, tokenMode, emulatorHost }));
  }
};


