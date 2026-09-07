// Google 로그인(OAuth 루프백) + Firebase CLI 자격증명 저장소 연동 + Google REST 호출
//
// 왜 직접 구현하나: firebase-tools 의 `login` 은 자식 프로세스(비대화형)에서 "Cannot run login in non-interactive mode" 로 거부한다.
// 그래서 CLI 와 같은 방식(설치형 앱 OAuth, 루프백 리다이렉트)으로 도우미가 직접 로그인하고,
// 결과 토큰을 CLI 의 자격증명 저장소(~/.config/configstore/firebase-tools.json)에 CLI 형식 그대로 써 준다.
// 이후 모든 firebase 명령은 `--account <email>` 로 이 계정을 명시해 실행한다.
//
// 아래 client_id / client_secret 은 Firebase CLI(오픈소스)에 공개되어 있는 "설치형 앱" 자격증명이다.
// (설치형 앱의 secret 은 비밀로 취급되지 않으며, 사용자 동의 화면과 리프레시 토큰이 보안의 근거다.)

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { InstallError } from './errors.mjs';

const FIREBASE_CLI_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/firebase',
  'https://www.googleapis.com/auth/cloudplatformprojects.readonly'
];

export const CONFIGSTORE_PATH = path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json');

function readStore() {
  try { return JSON.parse(fs.readFileSync(CONFIGSTORE_PATH, 'utf8')); } catch { return {}; }
}
function writeStore(obj) {
  fs.mkdirSync(path.dirname(CONFIGSTORE_PATH), { recursive: true });
  const tmp = CONFIGSTORE_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, '\t'), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, CONFIGSTORE_PATH);
}
function decodeJwtPayload(jwt) {
  try { return JSON.parse(Buffer.from(String(jwt).split('.')[1], 'base64url').toString('utf8')); } catch { return {}; }
}

// ---------- 저장된 계정 ----------
export function listAccounts() {
  const s = readStore();
  const out = [];
  if (s.user?.email && s.tokens) out.push({ email: s.user.email, primary: true });
  for (const a of s.additionalAccounts || []) if (a?.user?.email && a.tokens) out.push({ email: a.user.email, primary: false });
  // 중복 제거(같은 이메일이 여러 번 들어간 저장소가 실제로 있었음)
  const seen = new Set();
  return out.filter((a) => (seen.has(a.email) ? false : (seen.add(a.email), true)));
}

function findAccount(store, email) {
  if (store.user?.email === email && store.tokens) return { slot: 'user', user: store.user, tokens: store.tokens };
  const idx = (store.additionalAccounts || []).findIndex((a) => a?.user?.email === email && a.tokens);
  if (idx >= 0) return { slot: idx, user: store.additionalAccounts[idx].user, tokens: store.additionalAccounts[idx].tokens };
  return null;
}

function saveAccount(user, tokens) {
  const s = readStore();
  const entry = { user, tokens };
  if (!s.user || !s.tokens || s.user.email === user.email) {
    s.user = user; s.tokens = tokens;                       // 기본 계정으로 저장(비어 있거나 같은 계정)
    s.additionalAccounts = (s.additionalAccounts || []).filter((a) => a?.user?.email !== user.email);
  } else {
    s.additionalAccounts = (s.additionalAccounts || []).filter((a) => a?.user?.email !== user.email);
    s.additionalAccounts.push(entry);                       // 다른 기본 계정이 있으면 추가 계정으로
  }
  writeStore(s);
}

function updateTokens(email, tokens) {
  const s = readStore();
  const found = findAccount(s, email);
  if (!found) return;
  if (found.slot === 'user') s.tokens = { ...s.tokens, ...tokens };
  else s.additionalAccounts[found.slot].tokens = { ...s.additionalAccounts[found.slot].tokens, ...tokens };
  writeStore(s);
}

// ---------- 로그인 흐름 ----------
const pending = new Map(); // state → { createdAt, resolve }

export function buildLoginUrl(port, { loginHint = '' } = {}) {
  const state = crypto.randomBytes(16).toString('hex');
  pending.set(state, { createdAt: Date.now() });
  for (const [k, v] of pending) if (Date.now() - v.createdAt > 15 * 60 * 1000) pending.delete(k);
  const redirect = `http://127.0.0.1:${port}/oauth/callback`;
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', FIREBASE_CLI_CLIENT_ID);
  u.searchParams.set('redirect_uri', redirect);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES.join(' '));
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent select_account');
  u.searchParams.set('state', state);
  if (loginHint) u.searchParams.set('login_hint', loginHint);
  return { url: u.toString(), state, redirect };
}

// GET /oauth/callback?code=…&state=… 처리. 성공 시 { email } 반환.
export async function handleCallback(port, query) {
  const { code, state, error } = query;
  if (error) throw new InstallError('LOGIN_DENIED', 'Google 로그인이 취소되었거나 거부되었어요. 다시 시도하세요.', { detail: String(error) });
  if (!state || !pending.has(state)) throw new InstallError('LOGIN_STATE', '로그인 요청이 만료되었거나 일치하지 않아요. [Google로 로그인]을 다시 누르세요.');
  pending.delete(state);
  const redirect = `http://127.0.0.1:${port}/oauth/callback`;
  const body = new URLSearchParams({ code, client_id: FIREBASE_CLI_CLIENT_ID, client_secret: FIREBASE_CLI_CLIENT_SECRET, redirect_uri: redirect, grant_type: 'authorization_code' });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const tok = await r.json().catch(() => ({}));
  if (!r.ok || !tok.access_token) throw new InstallError('LOGIN_EXCHANGE', 'Google 로그인 토큰을 받지 못했어요. 다시 시도하세요.', { detail: JSON.stringify(tok).slice(0, 300) });
  const user = decodeJwtPayload(tok.id_token);
  if (!user.email) throw new InstallError('LOGIN_NOEMAIL', 'Google 계정 이메일을 확인하지 못했어요. 다시 시도하세요.');
  const tokens = {
    expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
    refresh_token: tok.refresh_token,
    scopes: [],
    access_token: tok.access_token,
    expires_in: tok.expires_in,
    scope: tok.scope,
    token_type: tok.token_type,
    id_token: tok.id_token
  };
  if (!tokens.refresh_token) {
    // 이전에 동의한 계정이면 refresh_token 이 안 올 수 있음 → 기존 저장분 유지
    const s = readStore(); const found = findAccount(s, user.email);
    if (found?.tokens?.refresh_token) tokens.refresh_token = found.tokens.refresh_token;
    else throw new InstallError('LOGIN_NOREFRESH', '로그인은 됐지만 갱신 토큰을 받지 못했어요. 다시 로그인해 주세요(동의 화면이 다시 나옵니다).');
  }
  saveAccount(user, tokens);
  return { email: user.email };
}

// ---------- 액세스 토큰(자동 갱신) ----------
export async function getAccessToken(email) {
  const s = readStore();
  const found = findAccount(s, email);
  if (!found) throw new InstallError('AUTH_EXPIRED', '로그인이 풀렸어요. 다시 로그인하면 이어서 진행됩니다.', { actions: [{ id: 'relogin', label: '다시 로그인' }] });
  const t = found.tokens;
  if (t.access_token && t.expires_at && t.expires_at - 60 * 1000 > Date.now()) return t.access_token;
  if (!t.refresh_token) throw new InstallError('AUTH_EXPIRED', '로그인이 풀렸어요. 다시 로그인하면 이어서 진행됩니다.', { actions: [{ id: 'relogin', label: '다시 로그인' }] });
  const body = new URLSearchParams({ client_id: FIREBASE_CLI_CLIENT_ID, client_secret: FIREBASE_CLI_CLIENT_SECRET, refresh_token: t.refresh_token, grant_type: 'refresh_token' });
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const tok = await r.json().catch(() => ({}));
  if (!r.ok || !tok.access_token) {
    throw new InstallError('AUTH_EXPIRED', '로그인이 풀렸어요. 다시 로그인하면 이어서 진행됩니다.', { actions: [{ id: 'relogin', label: '다시 로그인' }], detail: JSON.stringify(tok).slice(0, 200) });
  }
  updateTokens(email, { access_token: tok.access_token, expires_at: Date.now() + (tok.expires_in || 3600) * 1000, expires_in: tok.expires_in, id_token: tok.id_token || t.id_token });
  return tok.access_token;
}

// ---------- Google REST ----------
// gapi(email, 'GET', url) → { ok, status, data }   (401 은 AUTH_EXPIRED 로 throw, 나머지는 호출자가 판단)
export async function gapi(email, method, url, body) {
  const token = await getAccessToken(email);
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await r.text();
  let data = null; try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  if (r.status === 401) throw new InstallError('AUTH_EXPIRED', '로그인이 풀렸어요. 다시 로그인하면 이어서 진행됩니다.', { actions: [{ id: 'relogin', label: '다시 로그인' }], detail: text.slice(0, 300) });
  return { ok: r.ok, status: r.status, data };
}

export function describeApiError(res) {
  const e = res?.data?.error;
  if (!e) return `HTTP ${res?.status}`;
  return `${e.status || e.code || ''} ${e.message || ''}`.trim();
}
