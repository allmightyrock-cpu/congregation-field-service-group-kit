import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 개발(dev)에서는 로컬 에뮬레이터에 연결 — 실데이터/실키 불필요
export const USE_EMULATOR = import.meta.env.DEV;

// Worker API 주소 (dev: 로컬 wrangler, prod: 배포된 Worker)
// prod 기본값을 하드코딩 → VITE_WORKER_URL 없이 빌드해도 로그인이 깨지지 않음.
export const WORKER_URL =
  import.meta.env.VITE_WORKER_URL || (USE_EMULATOR ? 'http://127.0.0.1:8787' : '');

if (USE_EMULATOR) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
