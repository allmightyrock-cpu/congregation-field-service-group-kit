import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// ── 런타임 설정 우선 ─────────────────────────────────────────────
// /config.js 가 module 스크립트보다 먼저 실행되어 window.__FSG_CONFIG__ 를 채운다.
// (설치 도우미가 dist/config.js 를 실제 값으로 생성 → 회중마다 재빌드 불필요)
// 없으면 빌드 시점 VITE_* 환경변수로 폴백(개발·기존 방식 호환).
const env = import.meta.env;
const rt = (typeof window !== 'undefined' && window.__FSG_CONFIG__) || {};
const pick = (rtKey, envKey) => String(rt[rtKey] || env[envKey] || '').trim();

export const firebaseConfig = {
  apiKey: pick('apiKey', 'VITE_FIREBASE_API_KEY'),
  authDomain: pick('authDomain', 'VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: pick('projectId', 'VITE_FIREBASE_PROJECT_ID'),
  storageBucket: pick('storageBucket', 'VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: pick('messagingSenderId', 'VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: pick('appId', 'VITE_FIREBASE_APP_ID')
};

// 런타임 설정 파일이 실제 값으로 채워졌는지(설치 도우미 완료 여부) 판단용
export const RUNTIME_CONFIG_LOADED = Object.keys(rt).length > 0;
export const CONFIG_MISSING = !firebaseConfig.apiKey || !firebaseConfig.projectId;

// 설정이 비어 있으면(압축만 푼 상태 등) Firebase를 초기화하지 않는다.
// getAuth()는 apiKey가 없으면 import 시점에 예외(auth/invalid-api-key)를 던져 앱 전체가 죽기 때문.
// main.js 가 CONFIG_MISSING 을 보고 '설정 필요' 안내 화면을 띄운다.
export const app = CONFIG_MISSING ? null : initializeApp(firebaseConfig);
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;

// 개발(dev)에서는 로컬 에뮬레이터에 연결 — 실데이터/실키 불필요
export const USE_EMULATOR = env.DEV;

// Worker API 주소 (런타임 config.js의 workerUrl 우선 → VITE_WORKER_URL → dev 로컬 wrangler)
export const WORKER_URL =
  pick('workerUrl', 'VITE_WORKER_URL') || (USE_EMULATOR ? 'http://127.0.0.1:8787' : '');

if (USE_EMULATOR && app) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
