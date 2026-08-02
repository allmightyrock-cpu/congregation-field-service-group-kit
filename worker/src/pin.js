// PIN 해시/검증 — PBKDF2-SHA256 (Web Crypto, Worker/Node 공용)
// PIN 평문은 절대 저장하지 않음. pinCredentials 에는 { algo, iterations, salt, hash } 만.

const DEFAULT_ITER = 100000;

function b64ToBytes(b64) {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function bytesToB64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function randomSaltB64(len = 16) {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return bytesToB64(b);
}

export async function hashPin(pin, saltB64, iterations = DEFAULT_ITER) {
  const salt = b64ToBytes(saltB64);
  const keyMat = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMat,
    256
  );
  return bytesToB64(new Uint8Array(bits));
}

// 새 PIN 자격 생성용 (셀프 PIN 변경/시드에서 사용)
export async function makeCredential(pin, iterations = DEFAULT_ITER) {
  const salt = randomSaltB64();
  const hash = await hashPin(pin, salt, iterations);
  return { algo: 'pbkdf2-sha256', iterations, salt, hash };
}

function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyPin(pin, cred) {
  if (!cred || cred.active === false || !cred.hash || !cred.salt) return false;
  const h = await hashPin(pin, cred.salt, cred.iterations || DEFAULT_ITER);
  return constantTimeEqual(h, cred.hash);
}
