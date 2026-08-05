// 서비스 계정 → Google OAuth 액세스토큰 (JWT bearer grant)
// signed(실서비스) 모드에서 Firestore REST를 admin 권한으로 호출하기 위해 사용.
// 6a의 RS256 서명(token.js)을 재사용.

import { base64url, signRS256 } from './token.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FIRESTORE_SCOPE = 'https://www.googleapis.com/auth/datastore';

export async function getAccessToken(serviceAccount, scope = FIRESTORE_SCOPE) {
  const { client_email, private_key } = serviceAccount;
  if (!client_email || !private_key) throw new Error('SERVICE_ACCOUNT_INVALID');

  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: client_email,
    scope,
    aud: TOKEN_URL,
    iat,
    exp: iat + 3600
  };
  const input =
    `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;
  const assertion = `${input}.${await signRS256(input, private_key)}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body:
      'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer' +
      `&assertion=${assertion}`
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error('OAUTH_' + (data.error || res.status));
  }
  return data.access_token;
}
