// Firebase Custom Token 발급 모듈
// - 5단계(스텁): 에뮬레이터용 토큰(서명 미검증) — 실키 불필요
// - 6단계(예정): 서비스 계정 개인키로 RS256 서명 (crypto.subtle)
//
// 두 런타임(Cloudflare Worker / Node 테스트)에서 모두 동작하도록 btoa 사용.

const AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

// 허용된 집단키 (임의 집단 토큰 발급 방지)
export const GROUP_KEYS = ['daebang', 'buyeong', 'jihaeng', 'jugong1', 'jugong3', 'human1', 'human2'];

export function base64url(str) {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function serviceAccountEmail(projectId) {
  return `firebase-adminsdk@${projectId}.iam.gserviceaccount.com`;
}

// 공통 페이로드 생성
function buildPayload({ projectId, uid, claims }) {
  const iat = nowSec();
  const iss = serviceAccountEmail(projectId);
  return {
    iss,
    sub: iss,
    aud: AUD,
    iat,
    exp: iat + 3600,
    uid,
    claims
  };
}

// ---- 5단계: 에뮬레이터용 (alg:none, 서명 없음) ----
export function mintTokenEmulator({ projectId, uid, claims }) {
  const header = { alg: 'none', typ: 'JWT' };
  const payload = buildPayload({ projectId, uid, claims });
  return `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.`;
}

// 성원(멤버) 토큰: { kind:'member', groupKey }
export function mintMemberTokenEmulator({ projectId, groupKey }) {
  if (!GROUP_KEYS.includes(groupKey)) {
    throw new Error('INVALID_GROUP_KEY');
  }
  return mintTokenEmulator({
    projectId,
    uid: `member-${groupKey}`,
    claims: { kind: 'member', groupKey }
  });
}

// ---- 6a: 실제 RS256 서명 (서비스 계정 키) ----
// Web Crypto(crypto.subtle) 사용 — Cloudflare Worker / Node 20+ 공용.

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function base64urlBytes(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function signRS256(signingInput, privateKeyPem) {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  return base64urlBytes(new Uint8Array(sig));
}

// serviceAccount = 서비스 계정 JSON 파싱 객체 { client_email, private_key, private_key_id }
export async function mintTokenSigned({ uid, claims, serviceAccount }) {
  const { client_email, private_key, private_key_id } = serviceAccount;
  if (!client_email || !private_key) throw new Error('SERVICE_ACCOUNT_INVALID');
  const header = { alg: 'RS256', typ: 'JWT', kid: private_key_id };
  const iat = nowSec();
  const payload = {
    iss: client_email,
    sub: client_email,
    aud: AUD,
    iat,
    exp: iat + 3600,
    uid,
    claims
  };
  const signingInput =
    `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const sig = await signRS256(signingInput, private_key);
  return `${signingInput}.${sig}`;
}

export async function mintMemberTokenSigned({ groupKey, serviceAccount }) {
  if (!GROUP_KEYS.includes(groupKey)) throw new Error('INVALID_GROUP_KEY');
  return mintTokenSigned({
    uid: `member-${groupKey}`,
    claims: { kind: 'member', groupKey },
    serviceAccount
  });
}
