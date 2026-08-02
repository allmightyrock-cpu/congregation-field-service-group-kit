// 성원 데이터 계층 — Worker 집단 토큰 로그인 + Firestore 읽기/쓰기 (규칙 적용)
import { auth, db, WORKER_URL } from './firebase.js';
import { signInWithCustomToken } from 'firebase/auth';
import {
  doc, getDoc, collection, getDocs, query, where, orderBy, setDoc, serverTimestamp
} from 'firebase/firestore';
import { CONG_NOTICE_KEY, sortCongItems } from './cong-board.js';

let signedInGroup = null;

// 집단 링크 접속 시 PIN 없는 멤버 토큰으로 로그인 (A안)
export async function memberSignIn(groupKey) {
  if (signedInGroup === groupKey && auth.currentUser) return;
  const res = await fetch(`${WORKER_URL}/auth/member-token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ groupKey })
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'TOKEN_FAILED');
  await signInWithCustomToken(auth, data.customToken);
  signedInGroup = groupKey;
}

export async function getGroup(g) {
  const s = await getDoc(doc(db, 'groups', g));
  return s.exists() ? s.data() : null;
}

export async function getConfig() {
  const s = await getDoc(doc(db, 'config', 'app'));
  return s.exists() ? s.data() : {};
}

export async function getMembers(g) {
  const snap = await getDocs(collection(db, 'groups', g, 'members'));
  const list = [];
  snap.forEach((d) => {
    const v = d.data();
    if (v.active !== false) list.push({ id: d.id, ...v });
  });
  list.sort((a, b) => (a.seq || 0) - (b.seq || 0));
  return list;
}

// 봉사 보고 제출/정정 (규칙: 열린 기간·활성 성원·필드 화이트리스트)
export async function submitReport(g, period, member, form) {
  const participated = !!form.participated;
  // 파이오니아 유형: regular(정규) / auxiliary(보조) / special(특별) / '' (해당 없음)
  const pioneerType = participated ? (['regular', 'auxiliary', 'special'].includes(form.pioneerType) ? form.pioneerType : '') : '';
  const payload = {
    period,
    groupKey: g,
    memberId: member.id,
    memberName: member.name || '',
    participated,
    bibleStudies: participated ? (form.bibleStudies | 0) : 0,
    auxiliaryPioneer: pioneerType === 'auxiliary',       // 하위 호환
    // 시간: 파이오니아 유형 선택 시 직접 입력한 값(그 외 0)
    hours: pioneerType ? (Number(form.hours) || 0) : 0,
    submittedBy: auth.currentUser.uid,
    submittedAt: serverTimestamp()
  };
  if (pioneerType) payload.pioneerType = pioneerType;
  const memo = String(form.memo || '').trim();
  if (participated && memo) payload.memo = memo.slice(0, 300);
  await setDoc(
    doc(db, 'reports', period, 'groups', g, 'members', member.id),
    payload
  );
}

// 광고·안내 (표시된 것만)
export async function getNotices() {
  const snap = await getDocs(query(collection(db, 'notices'), where('visible', '==', true)));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  list.sort((a, b) => (a.order || 0) - (b.order || 0));
  return list;
}

// 광고 PDF → 이미지 페이지 (성원 읽기)
export async function getNoticePages(key) {
  const snap = await getDocs(query(collection(db, 'notices', key, 'pages'), orderBy('index')));
  const arr = [];
  snap.forEach((d) => arr.push(d.data()));
  return arr; // [{ index, dataUrl }]
}

// 게시판형 항목 (표시된 글만) — key로 cong/branch/week 등 지원
export async function getCongNoticeItems(key = CONG_NOTICE_KEY) {
  const snap = await getDocs(query(
    collection(db, 'notices', key, 'items'),
    where('visible', '==', true)
  ));
  const arr = [];
  snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
  return sortCongItems(arr, { visibleOnly: true });
}

export async function getCongNoticeItemPages(itemId, key = CONG_NOTICE_KEY) {
  const snap = await getDocs(query(
    collection(db, 'notices', key, 'items', itemId, 'pages'),
    orderBy('index')
  ));
  const arr = [];
  snap.forEach((d) => arr.push(d.data()));
  return arr;
}

// 주말 공개강연 (전체)
export async function getTalks() {
  const snap = await getDocs(query(collection(db, 'talks'), orderBy('date')));
  const arr = [];
  snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
  return arr;
}

// 봉사 감독자 방문 (자기 집단만)
export async function getVisits(groupKey) {
  const snap = await getDocs(query(collection(db, 'visits'), where('groupKey', '==', groupKey)));
  const arr = [];
  snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
  arr.sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  return arr;
}

// 우리 집단 소식
export async function getBoard(groupKey) {
  const s = await getDoc(doc(db, 'boards', groupKey));
  return s.exists() ? s.data() : null;
}

// 우리 집단 다건 게시물(최신 주차 먼저)
export async function getGroupPosts(groupKey) {
  const snap = await getDocs(query(collection(db, 'boards', groupKey, 'posts'), orderBy('sort', 'desc')));
  const arr = [];
  snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
  return arr;
}
