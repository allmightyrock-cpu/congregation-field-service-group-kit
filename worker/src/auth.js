// 편집자 PIN 로그인 코어
// { scope, key, pin } → pinCredentials/{scope}-{key} 읽기 → PIN 검증 → 편집자 claims 커스텀 토큰 발급
// pinLogin 은 순수 함수로 두어 Worker(index.js)와 테스트가 함께 사용.

import { getDoc, listDocs, writeDoc } from './firestore.js';
import { getAccessToken } from './oauth.js';
import { verifyPin, hashPin, makeCredential } from './pin.js';
import { mintTokenEmulator, mintTokenSigned } from './token.js';

const SCOPES = ['group', 'role'];

export function validateInput({ scope, key, pin }) {
  if (!SCOPES.includes(scope)) return 'INVALID_SCOPE';
  if (typeof key !== 'string' || !/^[a-z0-9]{1,32}$/.test(key)) return 'INVALID_KEY';
  if (typeof pin !== 'string' || !/^[0-9]{4,8}$/.test(pin)) return 'INVALID_PIN_FORMAT';
  return null;
}

// opts: { projectId, tokenMode:'emulator'|'signed', serviceAccount?, emulatorHost? }
export async function pinLogin({ scope, key, pin }, opts) {
  const bad = validateInput({ scope, key, pin });
  if (bad) return { ok: false, status: 400, error: bad };

  const { projectId, tokenMode, serviceAccount, emulatorHost } = opts;
  const credId = `${scope}-${key}`;

  // Firestore admin 접근 토큰
  let accessToken;
  if (tokenMode === 'emulator') {
    accessToken = 'owner';
  } else {
    accessToken = await getAccessToken(serviceAccount);
  }

  const cred = await getDoc({
    path: `pinCredentials/${credId}`,
    projectId,
    accessToken,
    emulatorHost
  });

  // 존재/PIN 노출 최소화: 같은 실패 메시지
  const ok = await verifyPin(pin, cred);
  if (!ok) return { ok: false, status: 401, error: 'INVALID_CREDENTIALS' };

  const uid = `editor-${credId}`;
  const claims = { kind: 'editor', ...(cred.claims || {}) };

  const customToken =
    tokenMode === 'emulator'
      ? mintTokenEmulator({ projectId, uid, claims })
      : await mintTokenSigned({ uid, claims, serviceAccount });

  return { ok: true, status: 200, customToken, mode: tokenMode };
}

async function adminAccess(opts) {
  const { tokenMode, serviceAccount } = opts;
  return tokenMode === 'emulator' ? 'owner' : await getAccessToken(serviceAccount);
}

// 본인 PIN 변경: 현재 PIN 검증 → (다른 자격과 중복 금지) → 새 PIN 해시 저장
export async function changePin({ scope, key, oldPin, newPin }, opts) {
  const bad = validateInput({ scope, key, pin: oldPin });
  if (bad) return { ok: false, status: 400, error: bad };
  // 회중 장로(elder)는 여러 명이 공유하는 로그인 → 본인 셀프 변경 금지(조정자만 설정).
  if (scope === 'role' && key === 'elder') {
    return { ok: false, status: 403, error: 'PIN_MANAGED' };
  }
  if (typeof newPin !== 'string' || !/^[0-9]{4,8}$/.test(newPin)) {
    return { ok: false, status: 400, error: 'INVALID_NEW_PIN' };
  }
  if (newPin === oldPin) return { ok: false, status: 400, error: 'SAME_PIN' };

  const { projectId, emulatorHost } = opts;
  const accessToken = await adminAccess(opts);
  const credId = `${scope}-${key}`;

  const cred = await getDoc({ path: `pinCredentials/${credId}`, projectId, accessToken, emulatorHost });
  if (!(await verifyPin(oldPin, cred))) return { ok: false, status: 401, error: 'INVALID_CREDENTIALS' };

  // 중복 방지: 다른 자격이 이미 쓰는 번호면 거부
  const all = await listDocs({ path: 'pinCredentials', projectId, accessToken, emulatorHost });
  for (const c of all) {
    if (c.id === credId || !c.data || !c.data.hash || !c.data.salt) continue;
    const h = await hashPin(newPin, c.data.salt, c.data.iterations || 100000);
    if (h === c.data.hash) return { ok: false, status: 409, error: 'PIN_TAKEN' };
  }

  const fresh = await makeCredential(newPin);
  await writeDoc({
    path: `pinCredentials/${credId}`,
    data: { scope: cred.scope || scope, key: cred.key || key, active: true, claims: cred.claims || {}, ...fresh },
    projectId, accessToken, emulatorHost
  });
  return { ok: true, status: 200 };
}

// 조정자가 회중 장로(elder) 공유 로그인 PIN을 생성/변경.
// 조정자 본인 PIN으로 인가(canManagePins 권한 필요) → elder 자격의 PIN 해시만 교체(claims/active 보존).
export async function setElderPin({ coordPin, newPin }, opts) {
  if (typeof coordPin !== 'string' || !/^[0-9]{4,8}$/.test(coordPin)) {
    return { ok: false, status: 400, error: 'INVALID_PIN_FORMAT' };
  }
  if (typeof newPin !== 'string' || !/^[0-9]{4,8}$/.test(newPin)) {
    return { ok: false, status: 400, error: 'INVALID_NEW_PIN' };
  }

  const { projectId, emulatorHost } = opts;
  const accessToken = await adminAccess(opts);

  // 조정자 인가: role-coord 자격의 PIN 검증 + canManagePins 권한 확인
  const coord = await getDoc({ path: 'pinCredentials/role-coord', projectId, accessToken, emulatorHost });
  const authorized = (await verifyPin(coordPin, coord))
    && !!(coord && coord.claims && coord.claims.canManagePins === true);
  if (!authorized) return { ok: false, status: 401, error: 'INVALID_CREDENTIALS' };

  const elder = await getDoc({ path: 'pinCredentials/role-elder', projectId, accessToken, emulatorHost });
  const fresh = await makeCredential(newPin);
  await writeDoc({
    path: 'pinCredentials/role-elder',
    data: {
      scope: 'role', key: 'elder', active: true,
      claims: (elder && elder.claims) || { role: 'elder', canReadContacts: true },
      ...fresh
    },
    projectId, accessToken, emulatorHost
  });
  return { ok: true, status: 200 };
}
