// 편집자 앱 (조정자·집단 감독자 등) — PDF 광고 업로드 + 본인 PIN 변경
// 별도 엔트리(admin.html)라 성원 앱(main.js)과 충돌 없음.
import { auth, db, WORKER_URL } from './firebase.js';
import { signInWithCustomToken } from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, query, orderBy, where, serverTimestamp, writeBatch, onSnapshot } from 'firebase/firestore';
import { buildNoticePayload, normalizeEditorSource } from './notice-content.js';
import { resolveAdminLoginDefaults, shouldAutoStartStandaloneAdmin } from './admin-entry.js';
import { compressImage, nextNoticePageIndex, sortNoticePages } from './notice-images.js';
import { NOTICE_LABELS } from './notice-labels.js';
import {
  CONG_NOTICE_KEY, BOARD_NOTICE_KEYS, isBoardNoticeKey,
  buildCongItemPayload, buildCongItemSoftDeletePayload, congItemPreview, sortCongItems,
  defaultNoticeExpiryDate, dateInputValue, dateFromInput
} from './cong-board.js';
import { parseMwbWeeks, buildMidBodyAll, parseMidBody, mergeWeeks, pruneExpired, weekSortKey } from './mwb-parse.js';
import { titleByNo, noByTitle, numberedTitle, isRetiredTalkNo, RETIRED_FROM } from './talk-titles.js';
import { defaultDutyData, parseDutyData, buildDutyHtml, buildDutyPlain } from './duty.js';
import {
  GROUP_ORDER, ROSTER_NOTICE_KEY, MEMBER_GENDERS, MEMBER_ROLES,
  buildMemberPayload, buildMemberPrivatePayload, buildRosterColumns, buildRosterMove,
  memberFormDefaults, nextMemberId, nextMemberSeq, rosterNoticePayload, rosterPagePayload
} from './admin-members.js';
import {
  buildEmergencyContactPayload, contactReadableGroups, contactSearchText, stableContactId
} from './emergency-contacts.js';
import {
  PUBLICATION_ITEMS, STANDING_DOC_ID, buildPublicationPayload,
  memberCount, normalizePublicationDoc, publicationSummary, setMemberCount
} from './publication-distributions.js';

const ROLE_LABELS = {
  coord: '회중 조정자', life: '생활과 봉사 감독자',
  talk: '공개강연 조정자', secretary: '회중 서기', service: '봉사 감독자', elder: '회중 장로'
};
const GROUP_LABELS = {
  group1: '\u0031\uc9d1\ub2e8',
  group2: '\u0032\uc9d1\ub2e8',
  group3: '\u0033\uc9d1\ub2e8'
};
let appEl = document.querySelector('#app');
const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
let activeEditor = null;
const shell = (html) => {
  if (activeEditor) {
    activeEditor.destroy();
    activeEditor = null;
  }
  appEl.innerHTML = `<section class="wrap">${html}</section>`;
};

let session = null;   // { scope, key, claims, uid }
let rendered = [];
let currentKey = null;
let loginSearch = location.search;
let onExitToMember = null;

export function startAdminApp(options = {}) {
  appEl = options.root || document.querySelector('#app');
  loginSearch = options.search ?? location.search;
  onExitToMember = typeof options.onExit === 'function' ? options.onExit : null;
  session = options.session || null;
  rendered = [];
  currentKey = null;
  if (session) {
    const initialTool = String(options.initialTool || '').trim();
    if (initialTool) {
      goTool(initialTool);
    } else {
      home();
    }
    return;
  }
  loginScreen();
}

// ---------- 로그인 ----------
function keyOptions(scope) {
  const map = scope === 'group' ? GROUP_LABELS : ROLE_LABELS;
  return Object.keys(map).map((k) => `<option value="${k}">${esc(map[k])}${scope === 'group' ? ' 감독자·보조자' : ''} (${k})</option>`).join('');
}

function loginScreen(msg = '') {
  const defaults = resolveAdminLoginDefaults(loginSearch, GROUP_LABELS);
  let scope = defaults.scope;
  shell(`
    <h1>편집자 로그인</h1>
    <p class="muted">역할 담당자·집단 감독자·보조자가 사용합니다.</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    <label>구분</label>
    <div class="seg">
      <button class="seg-b ${scope === 'role' ? 'on' : ''}" data-scope="role">역할</button>
      <button class="seg-b ${scope === 'group' ? 'on' : ''}" data-scope="group">집단 감독자·보조자</button>
    </div>
    <label>누구신가요?</label>
    <select id="key">${keyOptions(scope)}</select>
    <label>PIN <span class="muted">(집단 초기 PIN은 0000)</span></label>
    <input id="pin" type="password" inputmode="numeric" placeholder="****" autocomplete="off" />
    <button class="primary" id="go">로그인</button>
    ${onExitToMember ? '<button class="link" id="member-home">← 성원 화면</button>' : ''}
  `);
  if (defaults.key) document.getElementById('key').value = defaults.key;
  document.querySelectorAll('.seg-b').forEach((b) => b.onclick = () => {
    scope = b.dataset.scope;
    document.querySelectorAll('.seg-b').forEach((x) => x.classList.toggle('on', x === b));
    document.getElementById('key').innerHTML = keyOptions(scope);
  });
  document.getElementById('go').onclick = () => doLogin(
    scope, document.getElementById('key').value, document.getElementById('pin').value.trim());
  const memberHome = document.getElementById('member-home');
  if (memberHome) memberHome.onclick = onExitToMember;
}

async function doLogin(scope, key, pin) {
  shell(`<h1>로그인 중…</h1>`);
  try {
    const res = await fetch(`${WORKER_URL}/auth/pin-login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope, key, pin })
    });
    const data = await res.json();
    if (!res.ok || !data.ok) return loginScreen(loginError(data.error));
    const cred = await signInWithCustomToken(auth, data.customToken);
    session = { scope, key, claims: (await cred.user.getIdTokenResult()).claims, uid: cred.user.uid };
    home();
  } catch (e) {
    loginScreen('오류: ' + e.message);
  }
}
function loginError(code) {
  if (code === 'INVALID_CREDENTIALS') return 'PIN이 올바르지 않거나 자격이 없습니다.';
  if (code === 'INVALID_PIN_FORMAT') return 'PIN은 숫자 4~8자리입니다.';
  return '로그인 실패: ' + (code || '알 수 없음');
}

function whoLabel() {
  return session.scope === 'group'
    ? `${GROUP_LABELS[session.key] || session.key} 감독자·보조자`
    : (ROLE_LABELS[session.key] || session.key);
}

// ---------- 홈 (도구 메뉴) ----------
function noticeKeysOf() {
  return (session.claims.noticeKeys || []).filter((k) => k in NOTICE_LABELS);
}
function myGroupKey() {
  return session.scope === 'group' ? session.key : (session.claims.groupKeys || [])[0];
}
function canWriteContacts() {
  return session?.claims?.canWriteContacts === true;
}
function contactGroupsForSession() {
  const groups = contactReadableGroups(session?.claims || {}, session?.scope || '', session?.key || '', GROUP_LABELS);
  return GROUP_ORDER.filter((g) => groups.includes(g));
}
function canManagePublications() {
  return session?.claims?.canManagePublications === true;
}
function publicationGroupsForSession() {
  if (canManagePublications()) return GROUP_ORDER.slice();
  const claimGroups = Array.isArray(session?.claims?.groupKeys) ? session.claims.groupKeys : [];
  const groups = session?.scope === 'group' ? [session.key] : claimGroups;
  return GROUP_ORDER.filter((g) => groups.includes(g));
}

function home() {
  clearPubListeners();
  const nkeys = noticeKeysOf();
  const isGroup = session.scope === 'group';
  const tools = [];
  if (publicationGroupsForSession().length) {
    tools.push(['📚 출판물 신청', canManagePublications() ? '전 집단 신청 부수 현황' : '우리 집단 신청 부수', 'publications']);
  }
  if (nkeys.includes('duty')) {
    tools.push(['🧹 이 달의 봉사·청소 임명', '명단·집단명 입력·수정', 'duty']);
  }
  if (nkeys.length) {
    tools.push(['📝 광고 글 편집', '제목·내용·표시 여부 수정', 'notice']);
    tools.push(['📎 첨부 이미지·PDF 관리', '사진·PDF 추가 · 개별 삭제 · 교체', 'pdf']);
  }
  if (nkeys.includes('mid')) tools.push(['🗓️ 평일 집회 프로그램', '교재 업로드→편집→이름 배정', 'mwb']);
  if (isGroup) {
    tools.push(['📋 봉사 보고 현황', '우리 집단 제출/미제출 확인', 'reports']);
    tools.push(['📢 우리 집단 소식', '집단 성원에게 소식 게시', 'board']);
  }
  if (session.claims.canManageTalks) tools.push(['🎤 공개강연 계획', '일자·회중·연사·연제 편집', 'talks']);
  if (session.claims.canAssignTalkParts) tools.push(['🎤 공개강연 임명', '사회·낭독·기도 배정', 'talkassign']);
  if (session.claims.canManageVisits) tools.push(['🚗 집단 방문 계획', '봉사 감독자 방문 편집', 'visits']);
  if (session.claims.canReadCongReports) tools.push(['🗂️ 회중 봉사 보고 현황', '전 집단 제출/미제출', 'secretary']);
  if (session.claims.canWriteCongMembers) {
    tools.push(['👥 집단 성원 관리', '명단 수정·비활성·추가·이동', 'members']);
    tools.push(['🧾 집단 편성표', '전체 편성 보기·이동·출력·게시', 'roster']);
  }
  if (contactGroupsForSession().length) {
    tools.push(['☎️ 비상연락처·주소록', canWriteContacts() ? '전체 주소록 관리·엑셀 이관' : '공유 주소록 열람', 'contacts']);
  }
  if (session.claims.canManagePins) {
    tools.push(['🔑 회중 장로 PIN 설정', '장로 공유 로그인 PIN 생성·변경', 'elderpin']);
  }
  // 회중 장로는 여러 명이 공유하는 로그인 → 셀프 변경 금지(조정자가 설정)
  if (!(session.scope === 'role' && session.key === 'elder')) {
    tools.push(['🔑 내 PIN 변경', '로그인 번호 변경', 'pin']);
  }

  shell(`
    <p class="eyebrow">편집자</p>
    <h1>${esc(whoLabel())}</h1>
    <div class="menu">${tools.map(([t, d, id]) =>
      `<button class="tool" data-go="${id}"><b>${esc(t)}</b><span>${esc(d)}</span></button>`).join('')}</div>
    ${onExitToMember ? '<button class="link" id="member-home">← 성원 화면</button>' : ''}
    <button class="link" id="logout">로그아웃</button>
  `);
  const memberHome = document.getElementById('member-home');
  if (memberHome) memberHome.onclick = onExitToMember;
  document.getElementById('logout').onclick = () => { session = null; loginScreen(); };
  document.querySelectorAll('.tool').forEach((b) => b.onclick = () => goTool(b.dataset.go));
}

function goTool(id) {
  const tools = {
    pin: pinChangeScreen,
    elderpin: elderPinScreen,
    notice: noticeListScreen,
    duty: dutyEditScreen,
    pdf: pdfPickScreen,
    reports: reportDashScreen,
    board: boardEditScreen,
    talks: talksScreen,
    talkassign: talkAssignScreen,
    visits: visitsScreen,
    secretary: secretaryScreen,
    members: memberGroupPickScreen,
    roster: rosterScreen,
    contacts: contactsScreen,
    publications: publicationsScreen,
    mwb: () => { mwbState.loaded = false; mwbBuilderScreen(); }
  };
  const fn = tools[id];
  if (fn) fn();
  else home();
}

function backBtn() {
  const el = document.getElementById('back');
  if (el) el.onclick = home;
}

// ---------- 평일 집회 프로그램 빌더 (교재 파싱 + 편집 + 이름 배정) ----------
// WYSIWYG: 열면 현재 임명표 전체를 불러와 편집, 업로드는 '없는 주만 추가'(기존 배정 안 지움), 저장=보이는 그대로.
let mwbState = { weeks: [], loaded: false };

async function mwbBuilderScreen(msg = '') {
  if (!mwbState.loaded) {
    shell(`<p class="eyebrow">${esc(whoLabel())}</p><h1>평일 집회 프로그램</h1><p class="lead muted">현재 임명표 불러오는 중…</p>`);
    try {
      const s = await getDoc(doc(db, 'notices', 'mid'));
      mwbState.weeks = s.exists() ? parseMidBody(s.data().body || '') : [];
    } catch { mwbState.weeks = []; }
    mwbState.loaded = true;
  }
  const ws = mwbState.weeks;
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>평일 집회 프로그램</h1>
    <details class="mwb-add">
      <summary>➕ 교재로 새 주 추가 (기존 임명은 안 지워짐)</summary>
      <p class="muted">jw.org 「생활과 봉사 집회 교재」 <b>TXT(ZIP)</b> 업로드 또는 붙여넣기. <b>이미 있는 주는 건너뛰고 새 주만 추가</b>됩니다.</p>
      <input type="file" id="mwb-file" accept=".zip,.txt,text/plain" />
      <textarea id="mwb-paste" rows="4" placeholder="교재 텍스트 붙여넣기(선택)"></textarea>
      <button class="mwb-sm" id="load">추가</button>
    </details>
    <p class="muted">${ws.length ? `${ws.length}개 주 · 편집·이름 배정 후 저장하세요.` : '아직 주가 없습니다. 위에서 교재를 추가하세요.'}</p>
    ${ws.map((w, i) => `
      <div class="mwb-week">
        <div><b>${esc(w.date || '(날짜 미상)')}</b> <span class="muted">${esc(w.reading || '')}</span></div>
        <div class="muted">파트 ${w.sections.reduce((a, s) => a + s.parts.length, 0)}개 · 노래 ${esc(w.openingSong || '?')}/${esc(w.closingSong || '?')} · 사회자 ${esc(w.chairman || '미정')}</div>
        <div class="mwb-row">
          <button class="mwb-sm" data-edit="${i}">편집·이름배정</button>
          <button class="mwb-sm danger" data-del="${i}">이 주 삭제</button>
        </div>
      </div>`).join('')}
    <button class="primary" id="save">성원 화면에 저장</button>
    <p id="msg" class="savemsg">${esc(msg)}</p>
    <button class="link" id="back">← 홈</button>
  `);
  document.getElementById('back').onclick = home;
  document.getElementById('mwb-file').onchange = mwbHandleFile;
  document.getElementById('load').onclick = () => mwbAddText(document.getElementById('mwb-paste').value);
  document.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => mwbWeekEdit(Number(b.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
    if (confirm('이 주를 삭제할까요?')) { mwbState.weeks.splice(Number(b.dataset.del), 1); mwbBuilderScreen(); }
  });
  document.getElementById('save').onclick = mwbSave;
}

async function mwbHandleFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const msg = document.getElementById('msg');
  msg.textContent = '읽는 중…';
  try {
    let text = '';
    if (/\.zip$/i.test(file.name)) {
      const buf = new Uint8Array(await file.arrayBuffer());
      const { unzipSync, strFromU8 } = await import('fflate');
      const files = unzipSync(buf);
      text = Object.keys(files).filter((n) => /\.txt$/i.test(n)).sort()
        .map((n) => strFromU8(files[n])).join('\n');
    } else {
      text = await file.text();
    }
    mwbAddText(text);
  } catch (err) {
    msg.innerHTML = `<span class="err">파일 읽기 실패: ${esc(err.message)}</span>`;
  }
}

// 없는 주만 추가(기존 배정·수동편집 절대 안 지움) + 정렬
function mwbAddText(text) {
  const incoming = parseMwbWeeks(text);
  const msg = document.getElementById('msg');
  if (!incoming.length) {
    if (msg) msg.innerHTML = '<span class="err">프로그램을 인식하지 못했습니다. 교재 텍스트인지 확인하세요.</span>';
    return;
  }
  const have = new Set(mwbState.weeks.map((w) => w.date));
  const added = incoming.filter((w) => !have.has(w.date));
  mwbState.weeks = [...mwbState.weeks, ...added].sort((a, b) => weekSortKey(a.date) - weekSortKey(b.date));
  const skipped = incoming.length - added.length;
  mwbBuilderScreen(`${added.length}개 주 추가${skipped ? `, ${skipped}개는 이미 있어 건너뜀(기존 유지)` : ''}.`);
}

function mwbWeekEdit(idx) {
  const w = mwbState.weeks[idx];
  if (!w) return mwbBuilderScreen();
  const partRow = (si, pi, p) => `
    <div class="mwb-part" data-si="${si}" data-pi="${pi}">
      <input class="p-title" value="${esc(p.title || '')}" placeholder="파트 제목" />
      <input class="p-min" value="${esc(p.minutes || '')}" placeholder="시간" />
      <input class="p-name" value="${esc(p.name || '')}" placeholder="배정 이름" />
      <button class="mwb-sm danger p-del">✕</button>
    </div>`;
  shell(`
    <p class="eyebrow">평일 집회 · 편집</p>
    <h1>${esc(w.date || '주 편집')}</h1>
    <label>날짜</label><input id="w-date" value="${esc(w.date || '')}" />
    <label>주간 성경 읽기</label><input id="w-reading" value="${esc(w.reading || '')}" />
    <div class="mwb-row">
      <div><label>시작 노래</label><input id="w-osong" class="w-song" value="${esc(w.openingSong || '')}" /></div>
      <div><label>마침 노래</label><input id="w-csong" class="w-song" value="${esc(w.closingSong || '')}" /></div>
    </div>
    <label>사회자</label><input id="w-chair" value="${esc(w.chairman || '')}" />
    <label>시작하는 기도</label><input id="w-oprayer" value="${esc(w.openingPrayer || '')}" />
    ${w.sections.map((sec, si) => `
      <div class="mwb-sec">
        <h3>${esc(sec.title)}${sec.song ? ` · 노래 ${esc(sec.song)}` : ''}</h3>
        ${sec.parts.map((p, pi) => partRow(si, pi, p)).join('')}
        <button class="mwb-sm" data-addsec="${si}">+ 파트 추가</button>
      </div>`).join('')}
    <label>마치는 기도</label><input id="w-cprayer" value="${esc(w.closingPrayer || '')}" />
    <button class="primary" id="done">완료</button>
    <button class="link" id="back">← 주 목록</button>
  `);
  const finish = () => { mwbReadWeek(idx); mwbBuilderScreen(); };
  document.getElementById('done').onclick = finish;
  document.getElementById('back').onclick = finish;
  document.querySelectorAll('.p-del').forEach((b) => b.onclick = () => {
    mwbReadWeek(idx);
    const el = b.closest('.mwb-part');
    w.sections[Number(el.dataset.si)].parts.splice(Number(el.dataset.pi), 1);
    mwbWeekEdit(idx);
  });
  document.querySelectorAll('[data-addsec]').forEach((b) => b.onclick = () => {
    mwbReadWeek(idx);
    w.sections[Number(b.dataset.addsec)].parts.push({ no: 0, title: '', minutes: '', name: '' });
    mwbWeekEdit(idx);
  });
}

function mwbReadWeek(idx) {
  const w = mwbState.weeks[idx];
  const g = (id) => document.getElementById(id);
  if (!w || !g('w-date')) return;
  w.date = g('w-date').value.trim();
  w.reading = g('w-reading').value.trim();
  w.openingSong = g('w-osong').value.trim();
  w.closingSong = g('w-csong').value.trim();
  w.chairman = g('w-chair').value.trim();
  w.openingPrayer = g('w-oprayer').value.trim();
  w.closingPrayer = g('w-cprayer').value.trim();
  document.querySelectorAll('.mwb-part').forEach((el) => {
    const sec = w.sections[Number(el.dataset.si)];
    const p = sec && sec.parts[Number(el.dataset.pi)];
    if (!p) return;
    p.title = el.querySelector('.p-title').value.trim();
    p.minutes = el.querySelector('.p-min').value.trim();
    p.name = el.querySelector('.p-name').value.trim();
  });
}

async function mwbSave() {
  const msg = document.getElementById('msg');
  if (!mwbState.weeks.length) { msg.textContent = '저장할 주가 없습니다.'; return; }
  const btn = document.getElementById('save');
  btn.disabled = true; msg.textContent = '저장 중…';
  try {
    let ex = {};
    try { const s = await getDoc(doc(db, 'notices', 'mid')); if (s.exists()) ex = s.data(); } catch {}
    // WYSIWYG: 화면(mwbState)이 곧 저장본. 정렬 + 만료 월 정리(익월 말일 지난 달 자동 삭제).
    const finalWeeks = pruneExpired(
      [...mwbState.weeks].sort((a, b) => weekSortKey(a.date) - weekSortKey(b.date)),
      new Date().getMonth() + 1
    );
    const body = buildMidBodyAll(finalWeeks);
    if (body.length > 20000) {
      msg.innerHTML = '<span class="err">전체 내용이 너무 깁니다(2만자 초과). 오래된 달을 정리하거나 나눠 저장하세요.</span>';
      btn.disabled = false; return;
    }
    await setDoc(doc(db, 'notices', 'mid'), {
      key: 'mid',
      category: ex.category || 'now',
      title: ex.title || '평일 집회 임명표',
      subtitle: '그리스도인 생활과 봉사 집회',
      body,
      order: ex.order || 0,
      visible: true,
      updatedBy: session.uid,
      updatedAt: serverTimestamp()
    });
    mwbState.weeks = finalWeeks; // 저장된 상태로 화면 동기화(만료 정리 반영)
    msg.innerHTML = `✅ 저장 완료 — 총 ${finalWeeks.length}개 주. 성원 화면에 반영됩니다.`;
  } catch (e) {
    msg.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
  }
  btn.disabled = false;
}

// ---------- 광고 글 편집 ----------
function noticeListScreen() {
  const nkeys = noticeKeysOf().filter((k) => k !== 'duty'); // duty는 전용 도구에서 편집
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>광고 글 편집</h1>
    <label>어느 광고를 편집할까요?</label>
    <select id="nkey">${nkeys.map((k) => `<option value="${k}">${esc(NOTICE_LABELS[k])} (${k})</option>`).join('')}</select>
    <button class="primary" id="open">편집 열기</button>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  document.getElementById('open').onclick = () => {
    const key = document.getElementById('nkey').value;
    if (key === 'duty') return dutyEditScreen();
    if (isBoardNoticeKey(key)) return congBoardScreen(key);
    return noticeEditScreen(key);
  };
}

// ── 이 달의 봉사·청소 임명 전용 편집(생활과 봉사 감독자) ──
let dutyState = { data: null };

async function dutyEditScreen(msg = '') {
  shell(`<h1>이 달의 봉사·청소 임명</h1><p class="muted">불러오는 중…</p>`);
  let cur = null;
  try { const s = await getDoc(doc(db, 'notices', 'duty')); if (s.exists()) cur = s.data(); } catch {}
  dutyState.data = parseDutyData(cur && cur.bodyJson) || defaultDutyData();
  renderDutyEditor(msg);
}

function renderDutyEditor(msg = '') {
  const d = dutyState.data;
  const sectionsHtml = d.sections.map((s, si) => {
    const colHead = `<th>${esc(s.rowLabel || ' ')}</th>${s.cols.map((c, ci) =>
      `<th><input class="duty-in duty-col" data-s="${si}" data-c="${ci}" value="${esc(c)}"></th>`).join('')}`;
    const rowsHtml = s.rows.map((r, ri) => `
      <tr>
        <td><input class="duty-in duty-cell" data-s="${si}" data-r="${ri}" data-k="0" value="${esc(r[0] || '')}"></td>
        ${s.cols.map((_, ci) => `<td><input class="duty-in duty-cell" data-s="${si}" data-r="${ri}" data-k="${ci + 1}" value="${esc(r[ci + 1] || '')}"></td>`).join('')}
        <td class="duty-del"><button class="mini del" data-delrow="${si}:${ri}" title="행 삭제">✕</button></td>
      </tr>`).join('');
    return `
      <div class="duty-section">
        <input class="duty-in duty-title" data-s="${si}" value="${esc(s.title)}" placeholder="구역/항목 이름">
        <div class="talk-edit-wrap">
          <table class="talk-edit duty-table">
            <thead><tr>${colHead}<th></th></tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
        <button class="link" data-addrow="${si}">+ 행 추가</button>
      </div>`;
  }).join('');
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>이 달의 봉사·청소 임명</h1>
    <p class="muted">각 칸에 <b>이름·집단명</b>을 입력하세요. 첫 칸은 월(또는 주/보조), 맨 윗줄은 항목 제목입니다.
      성원 화면·게시판에 표로 표시됩니다.</p>
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <label>표 제목</label>
    <input class="duty-in duty-heading" value="${esc(d.heading || '')}" placeholder="예: 2026년 회중업무 진행요원 임명">
    ${sectionsHtml}
    <button class="primary" id="saveDuty">전체 저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  document.querySelector('.duty-heading').oninput = (e) => { dutyState.data.heading = e.target.value; };
  document.querySelectorAll('.duty-title').forEach((inp) => inp.oninput = () => {
    dutyState.data.sections[Number(inp.dataset.s)].title = inp.value;
  });
  document.querySelectorAll('.duty-col').forEach((inp) => inp.oninput = () => {
    dutyState.data.sections[Number(inp.dataset.s)].cols[Number(inp.dataset.c)] = inp.value;
  });
  document.querySelectorAll('.duty-cell').forEach((inp) => inp.oninput = () => {
    const s = Number(inp.dataset.s), r = Number(inp.dataset.r), k = Number(inp.dataset.k);
    dutyState.data.sections[s].rows[r][k] = inp.value;
  });
  document.querySelectorAll('[data-addrow]').forEach((b) => b.onclick = () => {
    const si = Number(b.dataset.addrow);
    dutyState.data.sections[si].rows.push(new Array(dutyState.data.sections[si].cols.length + 1).fill(''));
    renderDutyEditor();
  });
  document.querySelectorAll('[data-delrow]').forEach((b) => b.onclick = () => {
    const [si, ri] = b.dataset.delrow.split(':').map(Number);
    dutyState.data.sections[si].rows.splice(ri, 1);
    renderDutyEditor();
  });
  document.getElementById('saveDuty').onclick = saveDutyEditor;
}

async function saveDutyEditor() {
  const btn = document.getElementById('saveDuty');
  const msgEl = document.getElementById('msg');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    const d = dutyState.data;
    const cur = (await getDoc(doc(db, 'notices', 'duty'))).data() || {};
    await setDoc(doc(db, 'notices', 'duty'), {
      ...cur,
      key: 'duty',
      title: cur.title || '이 달의 봉사·청소 임명',
      visible: true,
      bodyJson: JSON.stringify(d),
      bodyHtml: buildDutyHtml(d),
      plainText: buildDutyPlain(d),
      body: '',
      updatedBy: session.uid, updatedAt: serverTimestamp()
    });
    dutyEditScreen('저장되었습니다. 성원 화면에 바로 반영됩니다.');
  } catch (e) {
    btn.disabled = false; btn.textContent = '전체 저장';
    msgEl.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
  }
}

async function congBoardScreen(key = CONG_NOTICE_KEY, msg = '') {
  const label = NOTICE_LABELS[key] || '회중 광고';
  shell(`<h1>${esc(label)}</h1><p class="muted">불러오는 중…</p>`);
  try {
    const snap = await getDocs(collection(db, 'notices', key, 'items'));
    const items = sortCongItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    shell(`
      <p class="eyebrow">${esc(whoLabel())}</p>
      <h1>${esc(label)} 관리</h1>
      ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
      <p class="muted">새 글을 누적하고, 오래된 글은 숨김 처리합니다. 성원은 표시된 글만 볼 수 있습니다.</p>
      <div class="member-toolbar">
        <button class="primary" id="new-cong">+ 새 ${esc(label)}</button>
        <button class="link" id="back">← 광고 선택</button>
      </div>
      <div class="notice-admin-list">
        ${items.map((item) => `
          <div class="notice-admin-row ${item.visible === false ? 'is-hidden' : ''}">
            <div>
              <b>${item.pinned ? '📌 ' : ''}${esc(item.title || '(제목 없음)')}</b>
              ${item.visible === false ? '<span class="muted"> · 숨김</span>' : ''}
              ${item.urgent ? '<span class="badge">긴급</span>' : ''}
              <br><span class="muted">${esc(congItemPreview(item))}</span>
              ${item.expiresAt ? `<br><span class="muted">게시 종료일 ${esc(dateInputValue(item.expiresAt))}</span>` : ''}
            </div>
            <div class="member-actions">
              <button class="mini" data-edit="${esc(item.id)}">수정</button>
              <button class="mini" data-toggle="${esc(item.id)}">${item.visible === false ? '다시 표시' : '성원에게 숨기기'}</button>
            </div>
          </div>`).join('') || `<p class="muted">아직 등록된 ${esc(label)}이(가) 없습니다.</p>`}
      </div>
    `);
    document.getElementById('new-cong').onclick = () => congItemEditScreen(key, null);
    document.getElementById('back').onclick = noticeListScreen;
    document.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => congItemEditScreen(key, items.find((item) => item.id === b.dataset.edit));
    });
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = async () => {
        const item = items.find((x) => x.id === b.dataset.toggle);
        if (!item) return;
        if (item.visible === false) {
          await updateDoc(doc(db, 'notices', key, 'items', item.id), {
            visible: true,
            deletedAt: deleteField(),
            updatedAt: serverTimestamp(),
            updatedBy: session.uid
          });
          return congBoardScreen(key, '다시 표시했습니다.');
        }
        if (!confirm('이 글을 성원에게 숨길까요?')) return;
        await updateDoc(doc(db, 'notices', key, 'items', item.id),
          buildCongItemSoftDeletePayload(session.uid, serverTimestamp()));
        congBoardScreen(key, '숨김 처리했습니다.');
      };
    });
  } catch (e) {
    shell(`<h1>${esc(label)} 관리</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
  }
}

async function congItemEditScreen(key, item) {
  const label = NOTICE_LABELS[key] || '회중 광고';
  const editing = !!item?.id;
  const itemId = item?.id || doc(collection(db, 'notices', key, 'items')).id;
  const defaultExpiry = key === 'branch' ? defaultNoticeExpiryDate() : null;
  const expiryValue = dateInputValue(item?.expiresAt || defaultExpiry);
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>${editing ? `${esc(label)} 수정` : `새 ${esc(label)}`}</h1>
    <label>제목</label>
    <input id="title" value="${esc(item?.title || '')}" />
    <label>부제 (선택)</label>
    <input id="subtitle" value="${esc(item?.subtitle || '')}" />
    <label>내용</label>
    <div id="rich-editor" class="rich-editor"></div>
    <textarea id="body" class="editor-fallback">${esc(item?.plainText || item?.body || '')}</textarea>
    <label class="chk"><input type="checkbox" id="visible" ${item?.visible !== false ? 'checked' : ''}/> 성원에게 표시</label>
    <label class="chk"><input type="checkbox" id="urgent" ${item?.urgent ? 'checked' : ''}/> 긴급 (빨간 강조)</label>
    <label class="chk"><input type="checkbox" id="pinned" ${item?.pinned ? 'checked' : ''}/> 목록 상단 고정</label>
    <label>게시 종료일</label>
    <input type="date" id="expires" value="${esc(expiryValue)}" />
    <p class="muted">종료일이 지나면 성원 화면 목록에서 자동으로 보이지 않습니다. 지부 서신은 기본 2개월 후로 잡힙니다.</p>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <div id="item-pages"></div>
    <button class="link" id="back">← ${esc(label)} 목록</button>
  `);
  document.getElementById('back').onclick = () => congBoardScreen(key);
  let editorHandle = null;
  try {
    const { mountRichNoticeEditor } = await import('./rich-editor.js');
    editorHandle = mountRichNoticeEditor({
      root: document.getElementById('rich-editor'),
      content: item?.bodyJson ? normalizeEditorSource(item) : (item?.bodyHtml || normalizeEditorSource(item || {}))
    });
    activeEditor = editorHandle;
    document.getElementById('body').hidden = true;
  } catch {
    document.getElementById('rich-editor').innerHTML = '<p class="err">문서 편집기를 불러오지 못했습니다. 기본 입력창으로 저장합니다.</p>';
  }
  if (editing) renderCongItemPages(key, itemId);
  else document.getElementById('item-pages').innerHTML = '<p class="muted">이미지 첨부는 먼저 저장한 뒤 사용할 수 있습니다.</p>';
  document.getElementById('save').onclick = async () => {
    const msg = document.getElementById('msg');
    const editorValue = editorHandle
      ? editorHandle.getValue()
      : { html: '', json: normalizeEditorSource({ body: document.getElementById('body').value }), text: document.getElementById('body').value };
    try {
      const payload = buildCongItemPayload({
        parentKey: key,
        title: document.getElementById('title').value,
        subtitle: document.getElementById('subtitle').value,
        editorValue,
        visible: document.getElementById('visible').checked,
        urgent: document.getElementById('urgent').checked,
        pinned: document.getElementById('pinned').checked,
        expiresAt: dateFromInput(document.getElementById('expires').value),
        createdAt: item?.createdAt
      }, session.uid, serverTimestamp());
      document.getElementById('save').disabled = true;
      msg.textContent = '저장 중…';
      await setDoc(doc(db, 'notices', key, 'items', itemId), payload);
      msg.textContent = '저장되었습니다.';
      document.getElementById('save').disabled = false;
      if (!editing) return congItemEditScreen(key, { id: itemId, ...payload });
    } catch (e) {
      document.getElementById('save').disabled = false;
      msg.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
    }
  };
}

async function renderCongItemPages(key, itemId) {
  const box = document.getElementById('item-pages');
  if (!box) return;
  box.innerHTML = '<p class="muted">첨부 이미지 확인 중…</p>';
  try {
    const snap = await getDocs(collection(db, 'notices', key, 'items', itemId, 'pages'));
    const pages = sortNoticePages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    box.innerHTML = `
      <h2 class="sec">첨부 이미지</h2>
      <input type="file" id="cong-image" accept="image/*" multiple hidden />
      <button class="primary soft" id="add-cong-image">🖼️ 사진/이미지 추가</button>
      <div class="thumbs existing-thumbs">${pages.map((p) => `
        <div class="thumb">
          <img src="${esc(p.dataUrl)}" alt="첨부 이미지 ${esc(p.index || p.id)}" />
          <span>${esc(p.index || p.id)}번 · ${Math.round(String(p.dataUrl || '').length / 1024)}KB</span>
          <button class="mini del" data-del-page="${esc(p.id)}">이 이미지 제거</button>
        </div>`).join('') || '<p class="muted">첨부 이미지가 없습니다.</p>'}</div>`;
    document.getElementById('add-cong-image').onclick = () => document.getElementById('cong-image').click();
    document.getElementById('cong-image').onchange = (event) =>
      event.target.files.length && appendCongItemImages(key, itemId, [...event.target.files]);
    box.querySelectorAll('[data-del-page]').forEach((b) => {
      b.onclick = async () => {
        await deleteDoc(doc(db, 'notices', key, 'items', itemId, 'pages', b.dataset.delPage));
        renderCongItemPages(key, itemId);
      };
    });
  } catch (e) {
    box.innerHTML = `<p class="err">첨부 이미지 확인 실패: ${esc(e.message)}</p>`;
  }
}

async function appendCongItemImages(key, itemId, files) {
  const box = document.getElementById('item-pages');
  try {
    const snap = await getDocs(collection(db, 'notices', key, 'items', itemId, 'pages'));
    let index = nextNoticePageIndex(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    for (const file of files) {
      const { dataUrl } = await compressImage(file);
      await setDoc(doc(db, 'notices', key, 'items', itemId, 'pages', String(index)),
        { index, dataUrl, updatedBy: session.uid });
      index += 1;
    }
    await updateDoc(doc(db, 'notices', key, 'items', itemId), {
      updatedAt: serverTimestamp(),
      updatedBy: session.uid
    });
    renderCongItemPages(key, itemId);
  } catch (e) {
    box.innerHTML = `<p class="err">이미지 추가 실패: ${esc(e.message)}</p>`;
  }
}

async function noticeEditScreen(key) {
  shell(`<h1>${esc(NOTICE_LABELS[key] || key)}</h1><p class="muted">불러오는 중…</p>`);
  let n = {};
  try { const s = await getDoc(doc(db, 'notices', key)); n = s.exists() ? s.data() : { key }; } catch { n = { key }; }
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>${esc(NOTICE_LABELS[key] || key)} 편집</h1>
    <label>제목</label>
    <input id="title" value="${esc(n.title || '')}" />
    <label>부제 (선택)</label>
    <input id="subtitle" value="${esc(n.subtitle || '')}" />
    <label>내용</label>
    <div id="rich-editor" class="rich-editor"></div>
    <textarea id="body" class="editor-fallback">${esc(n.plainText || n.body || '')}</textarea>
    <label class="chk"><input type="checkbox" id="visible" ${n.visible !== false ? 'checked' : ''}/> 성원에게 표시</label>
    <label class="chk"><input type="checkbox" id="urgent" ${n.urgent ? 'checked' : ''}/> 긴급 (빨간 강조)</label>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="manage-images">📎 첨부 이미지·PDF 관리 (추가·삭제·교체)</button>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  document.getElementById('manage-images').onclick = () => { currentKey = key; pdfPickScreen(); };
  let editorHandle = null;
  try {
    const { mountRichNoticeEditor } = await import('./rich-editor.js');
    editorHandle = mountRichNoticeEditor({
      root: document.getElementById('rich-editor'),
      content: n.bodyJson ? normalizeEditorSource(n) : (n.bodyHtml || normalizeEditorSource(n))
    });
    activeEditor = editorHandle;
    document.getElementById('body').hidden = true;
  } catch (e) {
    const root = document.getElementById('rich-editor');
    root.innerHTML = `<p class="err">문서 편집기를 불러오지 못했습니다. 기본 입력창으로 저장합니다.</p>`;
  }
  document.getElementById('save').onclick = async () => {
    const msg = document.getElementById('msg');
    const title = document.getElementById('title').value.trim();
    if (!title) { msg.textContent = '제목을 입력하세요.'; return; }
    const editorValue = editorHandle
      ? editorHandle.getValue()
      : { html: '', json: normalizeEditorSource({ body: document.getElementById('body').value }), text: document.getElementById('body').value };
    const data = {
      key,
      category: n.category || 'now',
      title,
      subtitle: document.getElementById('subtitle').value.trim(),
      ...buildNoticePayload(editorValue),
      order: n.order || 0,
      visible: document.getElementById('visible').checked,
      urgent: document.getElementById('urgent').checked,
      updatedAt: serverTimestamp(),
      updatedBy: session.uid
    };
    if (n.attachmentUrl) data.attachmentUrl = n.attachmentUrl;
    if (typeof n.pageCount === 'number') data.pageCount = n.pageCount;
    document.getElementById('save').disabled = true; msg.textContent = '저장 중…';
    try {
      await setDoc(doc(db, 'notices', key), data);
      msg.innerHTML = '✅ 저장되었습니다.';
      document.getElementById('save').disabled = false;
    } catch (e) {
      document.getElementById('save').disabled = false;
      msg.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
    }
  };
}

// ---------- 봉사 보고 현황 (집단 감독자) ----------
async function reportDashScreen() {
  const g = myGroupKey();
  shell(`<h1>봉사 보고 현황</h1><p class="muted">불러오는 중…</p>`);
  try {
    const cfg = (await getDoc(doc(db, 'config', 'app'))).data() || {};
    const period = cfg.reportPeriod || '';
    const msnap = await getDocs(collection(db, 'groups', g, 'members'));
    const members = [];
    msnap.forEach((d) => { const v = d.data(); if (v.active !== false) members.push({ id: d.id, ...v }); });
    members.sort((a, b) => (a.seq || 0) - (b.seq || 0));
    const submitted = new Set();
    const reports = {};
    if (period) {
      const rsnap = await getDocs(collection(db, 'reports', period, 'groups', g, 'members'));
      rsnap.forEach((d) => {
        submitted.add(d.id);
        reports[d.id] = { id: d.id, ...d.data() };
      });
    }
    const miss = members.filter((m) => !submitted.has(m.id));
    const pm = /^(\d{4})-(\d{2})$/.exec(period);
    const plabel = pm ? `${pm[1]}년 ${Number(pm[2])}월` : period || '(보고월 미설정)';
    const rows = members.map((m) => {
      const ok = submitted.has(m.id);
      return `<div class="rrow ${ok ? '' : 'miss'}"><span>${esc(m.name)}</span><span class="${ok ? 'okb' : 'missb'}">${ok ? '제출 ✓' : '미제출'}</span></div>`;
    }).join('');
    const detailRows = members.map((m) => {
      const ok = submitted.has(m.id);
      return `<div class="rrow report-row ${ok ? '' : 'miss'}">
        <span class="report-member">
          <b>${esc(m.name)}</b>
          ${ok ? reportDetailHtml(reports[m.id]) : '<small class="muted">아직 보고가 없습니다.</small>'}
        </span>
        <span class="${ok ? 'okb' : 'missb'}">${ok ? '제출 완료' : '미제출'}</span>
      </div>`;
    }).join('');
    shell(`
      <p class="eyebrow">${esc(GROUP_LABELS[g] || g)} 감독자·보조자</p>
      <h1>봉사 보고 현황</h1>
      <p class="sum">${esc(plabel)} · 제출 <b>${submitted.size}</b> / 성원 ${members.length} · 미제출 <b>${miss.length}</b></p>
      ${miss.length ? `<button class="primary" id="copy">미제출자 이름 복사 (${miss.length})</button>` : ''}
      <div class="rlist">${detailRows || '<p class="muted">명단이 없습니다.</p>'}</div>
      <button class="link" id="back">← 뒤로</button>
    `);
    backBtn();
    const cp = document.getElementById('copy');
    if (cp) cp.onclick = async () => {
      try { await navigator.clipboard.writeText(miss.map((m) => m.name).join(', ')); cp.textContent = '복사됨 ✓'; }
      catch { cp.textContent = miss.map((m) => m.name).join(', '); }
    };
  } catch (e) {
    shell(`<h1>봉사 보고 현황</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
  }
}

// ---------- 우리 집단 소식 ----------
// 우리 집단 소식 — 다건 게시물 관리(목록)

function reportDetailHtml(report = {}) {
  const participated = report.participated === true;
  const bibleStudies = Number(report.bibleStudies) || 0;
  const hours = Number(report.hours) || 0;
  const pioneerType = report.pioneerType || (report.auxiliaryPioneer ? 'auxiliary' : '');
  const pioneerLabel = {
    regular: '정규 파이오니아',
    auxiliary: '보조 파이오니아',
    special: '특별 파이오니아'
  }[pioneerType] || '';
  const details = [
    participated ? '봉사 참여' : '봉사 참여 없음',
    `성서 연구 ${bibleStudies}건`
  ];
  if (pioneerLabel || hours) details.push(`${pioneerLabel || '시간 보고'} ${hours}시간`);
  const submittedAt = formatReportTimestamp(report.submittedAt);
  if (submittedAt) details.push(`제출 ${submittedAt}`);
  const memo = String(report.memo || '').trim();
  if (memo) details.push(`메모: ${memo.slice(0, 80)}`);
  return `<small class="report-detail">${details.map(esc).join(' · ')}</small>`;
}

function formatReportTimestamp(value) {
  let date = null;
  if (value?.toDate) date = value.toDate();
  else if (value instanceof Date) date = value;
  else if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }
  if (!date) return '';
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function boardEditScreen(msg = '') {
  const g = myGroupKey();
  shell(`<h1>우리 집단 소식</h1><p class="muted">불러오는 중…</p>`);
  let posts = [], legacy = '';
  try {
    const snap = await getDocs(query(collection(db, 'boards', g, 'posts'), orderBy('sort', 'desc')));
    snap.forEach((d) => posts.push({ id: d.id, ...d.data() }));
  } catch {}
  try { const s = await getDoc(doc(db, 'boards', g)); if (s.exists()) legacy = (s.data().news || '').trim(); } catch {}
  const rows = posts.map((p) => `
    <div class="rrow"><span>${esc(p.title || '(제목 없음)')}</span>
      <span><button class="mini" data-edit="${esc(p.id)}">수정</button> <button class="mini del" data-del="${esc(p.id)}">삭제</button></span>
    </div>`).join('');
  shell(`
    <p class="eyebrow">${esc(GROUP_LABELS[g] || g)} 감독자·보조자</p>
    <h1>우리 집단 소식</h1>
    <p class="muted">우리 집단 성원에게만 보입니다. 여러 게시물을 올리면 성원이 선택해서 봅니다.</p>
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <button class="primary" id="add">+ 새 게시물</button>
    <div class="rlist">${rows || '<p class="muted">등록된 게시물이 없습니다.</p>'}</div>
    ${legacy ? `<div class="legacy-news"><p class="muted">이전 단일 소식(구버전):</p>
      <div class="body">${esc(legacy).replace(/\r?\n/g, '<br>')}</div>
      <button class="link" id="clearlegacy">이 소식 삭제</button></div>` : ''}
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  document.getElementById('add').onclick = () => boardPostForm(g, null);
  document.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () =>
    boardPostForm(g, posts.find((p) => p.id === b.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!confirm('이 게시물을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'boards', g, 'posts', b.dataset.del));
    boardEditScreen('삭제되었습니다.');
  });
  const cl = document.getElementById('clearlegacy');
  if (cl) cl.onclick = async () => {
    if (!confirm('이전 단일 소식을 삭제할까요?')) return;
    await setDoc(doc(db, 'boards', g), { groupKey: g, news: '', updatedBy: session.uid });
    boardEditScreen('이전 소식을 삭제했습니다.');
  };
}

function boardPostForm(g, p) {
  const editing = !!p;
  shell(`
    <p class="eyebrow">${esc(GROUP_LABELS[g] || g)} 감독자·보조자</p>
    <h1>${editing ? '게시물 수정' : '새 게시물'}</h1>
    <label>제목</label>
    <input id="p_title" value="${esc((p && p.title) || '')}" placeholder="예: 7월 6주 · 여호와의 친구가 되세요" />
    <label>내용</label>
    <textarea id="p_body" placeholder="게시물 내용">${esc((p && p.body) || '')}</textarea>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back2">← 목록</button>
  `);
  document.getElementById('back2').onclick = () => boardEditScreen();
  document.getElementById('save').onclick = async () => {
    const title = document.getElementById('p_title').value.trim();
    const body = document.getElementById('p_body').value;
    const msgEl = document.getElementById('msg');
    if (!title) { msgEl.textContent = '제목을 입력하세요.'; return; }
    document.getElementById('save').disabled = true; msgEl.textContent = '저장 중…';
    try {
      const now = new Date();
      const id = editing ? p.id : ('P' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0') + Math.floor(performance.now()));
      const sort = editing && typeof p.sort === 'number'
        ? p.sort
        : Number(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`);
      await setDoc(doc(db, 'boards', g, 'posts', id), {
        title, body, sort,
        createdAt: (p && p.createdAt) || serverTimestamp(),
        updatedAt: serverTimestamp(), updatedBy: session.uid
      });
      boardEditScreen('저장되었습니다.');
    } catch (e) {
      document.getElementById('save').disabled = false;
      msgEl.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
    }
  };
}

// ---------- PDF 업로드 화면 ----------
function pdfPickScreen() {
  const nkeys = noticeKeysOf().filter((k) => !isBoardNoticeKey(k));
  if (!nkeys.length) {
    shell(`
      <p class="eyebrow">${esc(whoLabel())}</p>
      <h1>첨부 이미지·PDF 관리</h1>
      <p class="muted">회중 광고·지부 서신·새 소식의 첨부는 광고 글 편집 → 각 목록에서 글마다 추가·삭제하세요.</p>
      <button class="link" id="back">← 뒤로</button>
    `);
    backBtn();
    return;
  }
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>첨부 이미지·PDF 관리</h1>
    <p class="muted">사진·PDF를 본문 아래에 첨부하고, <b>이미지별로 삭제·교체</b>할 수 있습니다.
    PDF에 장로용 부분이 있으면 <b>회중용 페이지만 선택</b>하세요.</p>
    <label>어느 광고에?</label>
    <select id="nkey">${nkeys.map((k) => `<option value="${k}" ${k === currentKey ? 'selected' : ''}>${esc(NOTICE_LABELS[k])} (${k})</option>`).join('')}</select>
    <input type="file" id="file" accept="application/pdf" hidden />
    <input type="file" id="imageFile" accept="image/*" multiple hidden />
    <button class="primary" id="pick">📄 PDF 선택</button>
    <button class="primary soft" id="pickImage">🖼️ 사진/이미지 추가</button>
    <button class="link" id="remove">선택한 광고의 게시 이미지 모두 제거</button>
    <div id="existing"></div>
    <div id="work"></div>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  const fileEl = document.getElementById('file');
  const imageEl = document.getElementById('imageFile');
  const nkeyEl = document.getElementById('nkey');
  const refresh = () => renderExistingPages(nkeyEl.value);
  refresh();
  nkeyEl.onchange = refresh;
  document.getElementById('pick').onclick = () => { currentKey = document.getElementById('nkey').value; fileEl.click(); };
  fileEl.onchange = () => fileEl.files[0] && convertPdf(fileEl.files[0]);
  document.getElementById('pickImage').onclick = () => { currentKey = document.getElementById('nkey').value; imageEl.click(); };
  imageEl.onchange = () => imageEl.files.length && appendImages([...imageEl.files]);
  document.getElementById('remove').onclick = async () => {
    const k = document.getElementById('nkey').value;
    const work = document.getElementById('work');
    work.innerHTML = '<p class="muted">제거 중…</p>';
    try {
      const snap = await getDocs(collection(db, 'notices', k, 'pages'));
      for (const d of snap.docs) await deleteDoc(d.ref);
      await bumpNoticeUpdatedAt(k);
      work.innerHTML = `<p class="muted">✅ '${esc(NOTICE_LABELS[k] || k)}' 게시 이미지 ${snap.size}개 제거됨.</p>`;
      refresh();
    } catch (e) { work.innerHTML = `<p class="err">제거 실패: ${esc(e.message)}</p>`; }
  };
}

async function renderExistingPages(key = currentKey) {
  const box = document.getElementById('existing');
  if (!box || !key) return;
  box.innerHTML = '<p class="muted">게시 이미지 확인 중…</p>';
  try {
    const snap = await getDocs(collection(db, 'notices', key, 'pages'));
    const pages = sortNoticePages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    if (!pages.length) {
      box.innerHTML = '<p class="muted">현재 게시된 이미지가 없습니다.</p>';
      return;
    }
    box.innerHTML = `
      <p class="muted">현재 게시 이미지 ${pages.length}개</p>
      <div class="thumbs existing-thumbs">${pages.map((p) => `
        <div class="thumb">
          <img src="${esc(p.dataUrl)}" alt="게시 이미지 ${esc(p.index || p.id)}" />
          <span>${esc(p.index || p.id)}번 · ${Math.round(String(p.dataUrl || '').length / 1024)}KB</span>
          <button class="mini del image-remove" data-id="${esc(p.id)}">이 이미지 제거</button>
        </div>`).join('')}</div>`;
    box.querySelectorAll('[data-id]').forEach((b) => {
      b.onclick = async () => {
        await deleteDoc(doc(db, 'notices', key, 'pages', b.dataset.id));
        await bumpNoticeUpdatedAt(key);
        renderExistingPages(key);
      };
    });
  } catch (e) {
    box.innerHTML = `<p class="err">게시 이미지 확인 실패: ${esc(e.message)}</p>`;
  }
}

async function appendImages(files) {
  const key = currentKey || document.getElementById('nkey').value;
  const work = document.getElementById('work');
  work.innerHTML = `<p class="muted">이미지 압축 중… 0/${files.length}</p>`;
  try {
    const snap = await getDocs(collection(db, 'notices', key, 'pages'));
    let index = nextNoticePageIndex(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    let saved = 0;
    for (const file of files) {
      work.querySelector('p').textContent = `이미지 압축 중… ${saved + 1}/${files.length} (${file.name})`;
      const { dataUrl } = await compressImage(file);
      await setDoc(doc(db, 'notices', key, 'pages', String(index)),
        { index, dataUrl, updatedBy: session.uid });
      index += 1;
      saved += 1;
    }
    work.innerHTML = `<p class="muted">✅ 이미지 ${saved}개 추가 완료 — 성원 화면 본문 아래에 표시됩니다.</p>`;
    await bumpNoticeUpdatedAt(key);
    renderExistingPages(key);
    const imageEl = document.getElementById('imageFile');
    if (imageEl) imageEl.value = '';
  } catch (e) {
    work.innerHTML = `<p class="err">이미지 추가 실패: ${esc(e.message)}</p>`;
  }
}

// ---------- 공개강연 편집 (talks) ----------
// 공개강연 조정자가 계획하는 칸
// 회중 조정자가 임명하는 칸
const TALK_ASSIGN_FIELDS = [
  ['chairman', '사회'], ['watchtowerReader', '낭독'], ['closingPrayer', '기도']
];
// 강연 종류(예외 일정). '' = 일반(번호강연)
const TALK_TYPES = [
  ['', '일반'], ['circuit', '순회감독자 강연'], ['special', '특별강연'],
  ['convention', '지역대회'], ['assembly', '순회대회']
];
const TALK_TYPE_LABEL = { circuit: '순회방문', special: '특별', convention: '지역대회', assembly: '순회대회' };
// 회중 모임(사회/낭독/기도)이 없는 종류 = 지역대회·순회대회
function talkHasNoMeeting(type) { return type === 'convention' || type === 'assembly'; }
// 종류별 임명 칸: 순회 방문 주간은 사회만(낭독·기도 임명 없음)
function talkAssignFields(t) {
  if ((t && t.talkType) === 'circuit') return [['chairman', '사회']];
  return TALK_ASSIGN_FIELDS;
}
// 종류 선택 시 자동 채울 기본값
const TALK_TYPE_DEFAULT = {
  circuit: { speakerName: '순회감독자' }, special: { title: '특별공개강연' },
  convention: { title: '지역대회' }, assembly: { title: '순회대회' }
};

// ── 공개강연 조정자: 문서형(표) 편집 — 번호 입력 시 제목 자동완성 ──
let talkEdit = { rows: [], removed: [] };

async function talksScreen(msg = '') {
  shell(`<h1>공개강연 계획</h1><p class="muted">불러오는 중…</p>`);
  talkEdit = { rows: [], removed: [] };
  try {
    const snap = await getDocs(query(collection(db, 'talks'), orderBy('date')));
    snap.forEach((d) => talkEdit.rows.push({ id: d.id, ...d.data() }));
  } catch {}
  renderTalksEditor(msg);
}

function renderTalksEditor(msg = '') {
  const retiredCount = talkEdit.rows.filter((t) => isRetiredTalkNo(t.talkNo, t.date)).length;
  const rowsHtml = talkEdit.rows.map((t, i) => `
    <tr>
      <td><input class="tk-in" data-i="${i}" data-f="date" value="${esc(t.date || '')}" placeholder="2026-07-05"></td>
      <td><select class="tk-type" data-i="${i}">${TALK_TYPES.map(([v, l]) =>
        `<option value="${v}"${(t.talkType || '') === v ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></td>
      <td><input class="tk-in" data-i="${i}" data-f="speakerCong" value="${esc(t.speakerCong || '')}" placeholder="회중"></td>
      <td><input class="tk-in" data-i="${i}" data-f="speakerName" value="${esc(t.speakerName || '')}" placeholder="연사"></td>
      <td><input class="tk-in tk-no${isRetiredTalkNo(t.talkNo, t.date) ? ' tk-retired' : ''}" data-i="${i}" data-f="talkNo" value="${esc(t.talkNo || '')}" placeholder="번호" inputmode="numeric"${talkHasNoMeeting(t.talkType) ? ' disabled' : ''}></td>
      <td><input class="tk-in tk-title" data-i="${i}" data-f="title" value="${esc(t.title || '')}" placeholder="${(t.talkType || '') ? '연제 직접 입력' : '번호 입력 시 자동 완성'}">
        <div class="tk-warn" data-i="${i}"${isRetiredTalkNo(t.talkNo, t.date) ? '' : ' hidden'}>⚠️ ${RETIRED_FROM.replace(/-/g, '.')}부터 사용 중지된 골자입니다 (45분 골자)</div></td>
      <td class="tk-delcell"><button class="mini del" data-del="${i}" title="행 삭제">✕</button></td>
    </tr>`).join('');
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>공개강연 계획</h1>
    <p class="muted"><b>번호</b>를 입력하면 <b>연제</b>가 자동 완성됩니다. 예외 일정은 <b>종류</b>를 선택하세요
      (순회감독자 강연·특별강연=연제 직접 입력, 지역대회·순회대회=회중 강연 없음).<br>
      사회·낭독·기도는 회중 조정자가 배정합니다.</p>
    ${retiredCount ? `<p class="warnbox">⚠️ <b>${retiredCount}건</b>이 ${esc(RETIRED_FROM.replace(/-/g, '.'))}부터
      <b>사용 중지된 45분 골자</b>입니다. 다른 강연으로 조정해 주세요.</p>` : ''}
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <div class="talk-edit-wrap">
      <table class="talk-edit">
        <thead><tr><th>일자</th><th>종류</th><th>회중명</th><th>연사</th><th>번호</th><th>연 제</th><th></th></tr></thead>
        <tbody>${rowsHtml || ''}</tbody>
      </table>
    </div>
    <button class="link" id="addrow">+ 행 추가</button>
    <button class="primary" id="saveAll">전체 저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  // 사용 중지 골자 경고 갱신(번호·날짜 변경 시)
  const refreshWarn = (i) => {
    const r = talkEdit.rows[i];
    const bad = isRetiredTalkNo(r.talkNo, r.date);
    const w = document.querySelector(`.tk-warn[data-i="${i}"]`);
    if (w) w.hidden = !bad;
    const noEl = document.querySelector(`.tk-no[data-i="${i}"]`);
    if (noEl) noEl.classList.toggle('tk-retired', bad);
  };
  document.querySelectorAll('.tk-in').forEach((inp) => {
    inp.oninput = () => {
      const i = Number(inp.dataset.i), f = inp.dataset.f;
      talkEdit.rows[i][f] = inp.value;
      if (f === 'talkNo') {
        const title = titleByNo(inp.value);
        if (title) {
          talkEdit.rows[i].title = title;
          const ti = document.querySelector(`.tk-title[data-i="${i}"]`);
          if (ti) ti.value = title;
        }
      }
      if (f === 'talkNo' || f === 'date') refreshWarn(i);
    };
  });
  document.querySelectorAll('.tk-type').forEach((sel) => {
    sel.onchange = () => {
      const i = Number(sel.dataset.i);
      const type = sel.value;
      talkEdit.rows[i].talkType = type;
      const def = TALK_TYPE_DEFAULT[type];
      if (def) for (const [f, val] of Object.entries(def)) {
        if (!String(talkEdit.rows[i][f] || '').trim()) talkEdit.rows[i][f] = val;
      }
      renderTalksEditor();   // 종류 반영(번호칸 비활성·기본값 표시)
    };
  });
  document.getElementById('addrow').onclick = () => {
    talkEdit.rows.push({ date: '', speakerCong: '', speakerName: '', talkNo: '', title: '', talkType: '',
      chairman: '', watchtowerReader: '', closingPrayer: '' });
    renderTalksEditor();
  };
  document.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
    const i = Number(b.dataset.del);
    const row = talkEdit.rows[i];
    if (row && row.id) talkEdit.removed.push(row.id);
    talkEdit.rows.splice(i, 1);
    renderTalksEditor();
  });
  document.getElementById('saveAll').onclick = saveTalksEditor;
}

async function saveTalksEditor() {
  const btn = document.getElementById('saveAll');
  const msg = document.getElementById('msg');
  btn.disabled = true; btn.textContent = '저장 중…';
  try {
    let i = 0;
    for (const t of talkEdit.rows) {
      const date = String(t.date || '').trim();
      if (!date) continue;                       // 날짜 없는 행 건너뜀
      const id = t.id || ('T' + date.replace(/\D/g, '') + Math.floor(performance.now()) + (i++));
      await setDoc(doc(db, 'talks', id), {
        id, date,
        speakerCong: String(t.speakerCong || '').trim(),
        speakerName: String(t.speakerName || '').trim(),
        talkNo: talkHasNoMeeting(t.talkType) ? '' : String(t.talkNo || '').trim().replace(/\.$/, ''),
        title: String(t.title || '').trim(),
        talkType: String(t.talkType || '').trim(),
        // 임명 칸은 회중 조정자 담당 → 기존 값 보존
        chairman: t.chairman || '', watchtowerReader: t.watchtowerReader || '', closingPrayer: t.closingPrayer || '',
        updatedBy: session.uid, updatedAt: serverTimestamp()
      });
      t.id = id;
    }
    for (const id of talkEdit.removed) await deleteDoc(doc(db, 'talks', id));
    talkEdit.removed = [];
    talksScreen('저장되었습니다.');
  } catch (e) {
    btn.disabled = false; btn.textContent = '전체 저장';
    msg.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
  }
}

// ── 회중 조정자: 문서형(표) — 강연 번호만 표시(탭 시 풍선말 제목) + 사회·낭독·기도 배정 ──
async function talkAssignScreen(msg = '') {
  shell(`<h1>공개강연 임명</h1><p class="muted">불러오는 중…</p>`);
  let talks = [];
  try {
    const snap = await getDocs(query(collection(db, 'talks'), orderBy('date')));
    snap.forEach((d) => talks.push({ id: d.id, ...d.data() }));
  } catch {}
  const chip = (t) => {
    const label = TALK_TYPE_LABEL[t.talkType] || (t.talkNo ? esc(t.talkNo) : '★');
    const tip = esc(numberedTitle(t.talkNo, t.title) || TALK_TYPE_LABEL[t.talkType] || '(제목 미정)');
    return `<button class="tk-chip${t.talkType ? ' tk-chip-x' : ''}" data-tip type="button">${label}<span class="tk-tip">${tip}</span></button>`;
  };
  const rows = talks.map((t) => {
    if (talkHasNoMeeting(t.talkType)) {
      return `<tr class="ta-nomeet">
        <td class="ta-date">${esc(talkDateShort(t.date))}</td>
        <td colspan="4">${chip(t)} <span class="muted">— 회중 공개강연 없음</span></td>
      </tr>`;
    }
    const fields = talkAssignFields(t);
    const cells = TALK_ASSIGN_FIELDS.map(([k]) =>
      fields.some(([fk]) => fk === k)
        ? `<td><input class="ta-in" id="a_${esc(t.id)}_${k}" value="${esc(t[k] || '')}" placeholder="이름"></td>`
        : `<td class="ta-na">—</td>`).join('');
    return `<tr data-id="${esc(t.id)}">
      <td class="ta-date">${esc(talkDateShort(t.date))}</td>
      <td class="ta-no">${chip(t)}</td>
      ${cells}
    </tr>`;
  }).join('');
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>공개강연 임명</h1>
    <p class="muted"><b>강연 번호</b>만 표시됩니다. 번호를 <b>탭</b>하면 제목이 뜹니다. 사회·낭독·기도만 배정하세요.</p>
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <div class="talk-assign-wrap">
      <table class="talk-assign-tbl">
        <thead><tr><th>일자</th><th>강연</th><th>사회</th><th>낭독</th><th>기도</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="muted">계획된 강연이 없습니다.</td></tr>'}</tbody>
      </table>
    </div>
    ${talks.length ? '<button class="primary" id="saveAll">전체 저장</button>' : ''}
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  document.querySelectorAll('.tk-chip[data-tip]').forEach((c) => c.onclick = (e) => {
    e.stopPropagation();
    const open = c.classList.contains('show');
    document.querySelectorAll('.tk-chip.show').forEach((x) => x.classList.remove('show'));
    if (!open) c.classList.add('show');
  });
  document.addEventListener('click', () =>
    document.querySelectorAll('.tk-chip.show').forEach((x) => x.classList.remove('show')), { once: true });
  const saveAll = document.getElementById('saveAll');
  if (saveAll) saveAll.onclick = async () => {
    saveAll.disabled = true; saveAll.textContent = '저장 중…';
    const m = document.getElementById('msg');
    let changed = 0;
    try {
      for (const t of talks) {
        if (talkHasNoMeeting(t.talkType)) continue;   // 지역대회·순회대회는 임명칸 없음
        const next = {}; let diff = false;
        talkAssignFields(t).forEach(([k]) => {        // 순회 방문 주간은 사회만
          const el = document.getElementById(`a_${t.id}_${k}`);
          if (!el) return;
          const v = el.value.trim();
          next[k] = v;
          if (v !== (t[k] || '')) diff = true;
        });
        if (!diff) continue;
        await updateDoc(doc(db, 'talks', t.id), { ...next, updatedBy: session.uid, updatedAt: serverTimestamp() });
        changed++;
      }
      talkAssignScreen(`${changed}건 저장되었습니다.`);
    } catch (e) {
      saveAll.disabled = false; saveAll.textContent = '전체 저장';
      m.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
    }
  };
}

// 2026-05-03 → 5/3
function talkDateShort(d) {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? `${Number(m[1])}/${Number(m[2])}` : String(d || '');
}

// ---------- 방문 계획 편집 (visits) ----------
async function visitsScreen(msg = '') {
  shell(`<h1>집단 방문 계획</h1><p class="muted">불러오는 중…</p>`);
  let visits = [];
  try {
    const snap = await getDocs(query(collection(db, 'visits'), orderBy('date')));
    snap.forEach((d) => visits.push({ id: d.id, ...d.data() }));
  } catch {}
  const rows = visits.map((v) => `
    <div class="rrow"><span>${esc(GROUP_LABELS[v.groupKey] || v.groupKey)} · ${esc(v.date || '')}<br>
      <span class="muted">${esc(v.withService || '')} ${esc(v.memo || '')}</span></span>
      <span><button class="mini" data-edit="${esc(v.id)}">수정</button> <button class="mini del" data-del="${esc(v.id)}">삭제</button></span>
    </div>`).join('');
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>집단 방문 계획</h1>
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <button class="primary" id="add">+ 새 방문 추가</button>
    <div class="rlist">${rows || '<p class="muted">등록된 방문 계획이 없습니다.</p>'}</div>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  document.getElementById('add').onclick = () => visitForm(null);
  document.querySelectorAll('[data-edit]').forEach((b) => b.onclick = () => visitForm(visits.find((v) => v.id === b.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => {
    if (!confirm('이 방문 계획을 삭제할까요?')) return;
    await deleteDoc(doc(db, 'visits', b.dataset.del)); visitsScreen('삭제되었습니다.');
  });
}
function visitForm(v) {
  const editing = !!v;
  const opts = Object.keys(GROUP_LABELS).map((k) =>
    `<option value="${k}" ${v && v.groupKey === k ? 'selected' : ''}>${esc(GROUP_LABELS[k])}</option>`).join('');
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>${editing ? '방문 수정' : '새 방문'}</h1>
    <label>대상 집단</label><select id="gk">${opts}</select>
    <label>날짜 (예: 2026-08-01)</label><input id="date" value="${esc((v && v.date) || '')}" />
    <label>함께 할 봉사</label><input id="ws" value="${esc((v && v.withService) || '')}" />
    <label>메모</label><textarea id="memo">${esc((v && v.memo) || '')}</textarea>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back2">← 목록</button>
  `);
  document.getElementById('back2').onclick = () => visitsScreen();
  document.getElementById('save').onclick = async () => {
    const gk = document.getElementById('gk').value;
    const date = document.getElementById('date').value.trim();
    if (!date) { document.getElementById('msg').textContent = '날짜를 입력하세요.'; return; }
    const id = editing ? v.id : ('V' + gk + date.replace(/\D/g, '') + Math.floor(performance.now()));
    const data = { id, groupKey: gk, date, withService: document.getElementById('ws').value.trim(), memo: document.getElementById('memo').value.trim(), updatedBy: session.uid };
    try { await setDoc(doc(db, 'visits', id), data); visitsScreen('저장되었습니다.'); }
    catch (e) { document.getElementById('msg').innerHTML = `<span class="err">${esc(e.message)}</span>`; }
  };
}

// ---------- 비상연락처·주소록 ----------
// ---------- 출판물 신청 부수 (고정) ----------
let pubUnsubs = [];   // 전체 현황 실시간 리스너
let pubGen = 0;       // 화면 세대(오래된 스냅샷 콜백 무시)
function clearPubListeners() {
  pubGen += 1;
  pubUnsubs.forEach((unsub) => { try { unsub(); } catch {} });
  pubUnsubs = [];
}

async function publicationsScreen(msg = '') {
  clearPubListeners();
  const groups = publicationGroupsForSession();
  if (!groups.length) {
    shell(`<h1>출판물 신청</h1><p class="err">출판물 신청 관리 권한이 없습니다.</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
    return;
  }
  if (canManagePublications() && groups.length > 1) {
    publicationOverviewScreen(msg);
    return;
  }
  publicationDetailScreen(groups[0], msg);
}

async function publicationOverviewScreen(msg = '') {
  clearPubListeners();
  shell(`<h1>출판물 신청</h1><p class="muted">전 집단 현황을 불러오는 중…</p>`);
  try {
    const groups = publicationGroupsForSession();
    // 성원 명단은 1회 로드, 부수는 집단 문서 실시간 구독
    const groupData = [];
    for (const groupKey of groups) {
      const { members } = await loadMemberBundle(groupKey);
      groupData.push({ groupKey, members, pubDoc: normalizePublicationDoc(null) });
    }
    const gen = ++pubGen;
    renderPublicationOverview(groupData, msg);
    groups.forEach((groupKey, i) => {
      const unsub = onSnapshot(
        doc(db, 'groups', groupKey, 'publicationDistributions', STANDING_DOC_ID),
        (snap) => {
          if (gen !== pubGen) return;
          groupData[i].pubDoc = normalizePublicationDoc(snap.exists() ? snap.data() : null);
          renderPublicationOverview(groupData);
        },
        () => {}
      );
      pubUnsubs.push(unsub);
    });
  } catch (e) {
    shell(`<h1>출판물 신청</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
  }
}

// 실시간 갱신용 순수 렌더(리스너는 건드리지 않음)
function renderPublicationOverview(groupData, msg = '') {
  const totals = PUBLICATION_ITEMS.map((item) => ({ label: item.label, copies: 0 }));
  const perGroup = groupData.map((g) => {
    const summary = publicationSummary(g.pubDoc, g.members);
    summary.rows.forEach((row, i) => { totals[i].copies += row.copies; });
    return { groupKey: g.groupKey, summary };
  });
  const grand = totals.reduce((sum, t) => sum + t.copies, 0);
  shell(`
    <p class="eyebrow">봉사 감독자 · 실시간</p>
    <h1>출판물 신청 부수</h1>
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <div class="pub-total">
      <b>회중 전체 ${grand}부</b>
      <div class="pub-total-items">${totals.map((t) => `<span>${esc(t.label)} <b>${t.copies}</b></span>`).join('')}</div>
    </div>
    <table class="pub-overview">
      <thead><tr><th>집단</th>${PUBLICATION_ITEMS.map((it) => `<th>${esc(it.label)}</th>`).join('')}<th>계</th></tr></thead>
      <tbody>
        ${perGroup.map((g) => `<tr data-group="${esc(g.groupKey)}">
          <th>${esc(GROUP_LABELS[g.groupKey] || g.groupKey)}</th>
          ${g.summary.rows.map((r) => `<td>${r.copies || ''}</td>`).join('')}
          <td class="pub-rowtotal">${g.summary.totalCopies || ''}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <p class="muted small">집단에서 부수를 바꾸면 자동 반영됩니다. 집단을 누르면 성원별 부수를 편집합니다.</p>
    <button class="link" id="back">← 뒤로</button>
  `);
  document.querySelectorAll('tr[data-group]').forEach((tr) => {
    tr.onclick = () => { clearPubListeners(); publicationDetailScreen(tr.dataset.group); };
  });
  document.getElementById('back').onclick = () => { clearPubListeners(); home(); };
}

async function publicationDetailScreen(groupKey, msg = '') {
  clearPubListeners();
  shell(`<h1>출판물 신청</h1><p class="muted">불러오는 중…</p>`);
  try {
    const bundle = await loadPublicationGroupData(groupKey);
    renderPublicationDetail(bundle.groupKey, bundle.members, bundle.pubDoc, msg);
  } catch (e) {
    shell(`<h1>출판물 신청</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
  }
}

async function loadPublicationGroupData(groupKey) {
  const { members } = await loadMemberBundle(groupKey);
  const snap = await getDoc(doc(db, 'groups', groupKey, 'publicationDistributions', STANDING_DOC_ID));
  const pubDoc = normalizePublicationDoc(snap.exists() ? snap.data() : null);
  return { groupKey, members, pubDoc };
}

function renderPublicationDetail(groupKey, members, pubDoc, msg = '') {
  const activeMembers = members.filter((member) => member.active !== false);
  const summary = publicationSummary(pubDoc, activeMembers);
  const overviewAllowed = canManagePublications() && publicationGroupsForSession().length > 1;
  shell(`
    <p class="eyebrow">${esc(GROUP_LABELS[groupKey] || groupKey)} · 출판물</p>
    <h1>출판물 신청 부수</h1>
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <p class="pub-summary">${summary.rows.map((r) => `<span>${esc(r.label)} <b>${r.copies}</b></span>`).join('')}<span class="pub-summary-total">계 <b>${summary.totalCopies}</b></span></p>
    <p class="muted small">부수만 입력하세요. 빈칸/0 = 미신청. 변동 시에만 수정하면 됩니다.</p>
    <table class="pub-grid">
      <thead>
        <tr><th class="pub-name">성원</th>${PUBLICATION_ITEMS.map((it) => `<th>${esc(it.label)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${activeMembers.map((member) => `
          <tr>
            <th class="pub-name">${esc(member.name || member.id)}</th>
            ${PUBLICATION_ITEMS.map((it) => {
              const n = memberCount(pubDoc, it.key, member.id);
              return `<td><input class="pub-count" inputmode="numeric" pattern="[0-9]*" maxlength="2" data-item="${esc(it.key)}" data-member="${esc(member.id)}" value="${n > 0 ? n : ''}" aria-label="${esc(member.name || member.id)} ${esc(it.label)}" /></td>`;
            }).join('')}
          </tr>`).join('')}
      </tbody>
    </table>
    <button class="primary" id="pub-save">저장</button>
    <p id="pub-msg" class="savemsg"></p>
    ${overviewAllowed ? `<button class="link" id="pub-overview">← 전체 현황</button>` : ''}
    <button class="link" id="back">← 뒤로</button>
  `);
  document.querySelectorAll('.pub-count').forEach((input) => {
    input.oninput = () => { input.value = input.value.replace(/[^0-9]/g, '').slice(0, 2); };
  });
  const overview = document.getElementById('pub-overview');
  if (overview) overview.onclick = () => publicationOverviewScreen();
  document.getElementById('back').onclick = () => overviewAllowed ? publicationOverviewScreen() : home();
  document.getElementById('pub-save').onclick = async () => {
    try {
      const next = normalizePublicationDoc(pubDoc);
      next.createdAt = pubDoc.createdAt;
      document.querySelectorAll('.pub-count').forEach((input) => {
        setMemberCount(next, input.dataset.item, input.dataset.member, input.value);
      });
      const payload = buildPublicationPayload(next, session.uid, serverTimestamp());
      if (!pubDoc.createdAt) payload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'groups', groupKey, 'publicationDistributions', STANDING_DOC_ID), payload);
      publicationDetailScreen(groupKey, '저장되었습니다.');
    } catch (e) {
      document.getElementById('pub-msg').innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
    }
  };
}

async function contactsScreen(msg = '') {
  const groups = contactGroupsForSession();
  if (!groups.length) {
    shell(`<h1>비상연락처·주소록</h1><p class="err">주소록 열람 권한이 없습니다.</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
    return;
  }
  shell(`<h1>비상연락처·주소록</h1><p class="muted">불러오는 중…</p>`);
  try {
    const contacts = await loadEmergencyContacts(groups);
    shell(`
      <p class="eyebrow">${canWriteContacts() ? '회중 서기' : esc(whoLabel())}</p>
      <h1>비상연락처·주소록</h1>
      ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
      <div class="member-toolbar contacts-toolbar">
        <input id="contact-search" placeholder="이름·연락처·주소 검색" />
        <select id="contact-group">
          <option value="">전체 집단</option>
          ${groups.map((g) => `<option value="${g}">${esc(GROUP_LABELS[g])}</option>`).join('')}
        </select>
      </div>
      ${canWriteContacts() ? `
        <div class="member-toolbar">
          <button class="primary" id="new-contact">+ 새 연락처</button>
          <input type="file" id="contacts-xlsx" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden />
          <button class="primary soft" id="import-xlsx">엑셀 이관</button>
        </div>` : '<p class="muted">읽기 전용입니다. 수정은 서기에게 요청하세요.</p>'}
      <div id="contacts-list"></div>
      <p id="contacts-msg" class="savemsg"></p>
      <button class="link" id="back">← 뒤로</button>
    `);
    backBtn();
    const render = () => renderContactsList(contacts);
    document.getElementById('contact-search').oninput = render;
    document.getElementById('contact-group').onchange = render;
    render();
    const newBtn = document.getElementById('new-contact');
    if (newBtn) newBtn.onclick = () => contactEditScreen(groups[0]);
    const importBtn = document.getElementById('import-xlsx');
    const fileInput = document.getElementById('contacts-xlsx');
    if (importBtn && fileInput) {
      importBtn.onclick = () => fileInput.click();
      fileInput.onchange = () => fileInput.files[0] && importContactsFromXlsx(fileInput.files[0]);
    }
  } catch (e) {
    shell(`<h1>비상연락처·주소록</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
  }
}

async function loadEmergencyContacts(groups) {
  const contacts = [];
  for (const groupKey of groups) {
    const snap = await getDocs(collection(db, 'groups', groupKey, 'emergencyContacts'));
    snap.forEach((d) => contacts.push({ id: d.id, groupKey, ...d.data() }));
  }
  contacts.sort((a, b) =>
    GROUP_ORDER.indexOf(a.groupKey) - GROUP_ORDER.indexOf(b.groupKey)
    || String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
  return contacts;
}

function renderContactsList(contacts) {
  const list = document.getElementById('contacts-list');
  const keyword = document.getElementById('contact-search').value.trim().toLowerCase();
  const groupFilter = document.getElementById('contact-group').value;
  const canWrite = canWriteContacts();
  const filtered = contacts.filter((c) =>
    (!groupFilter || c.groupKey === groupFilter)
    && (canWrite || c.active !== false)
    && (!keyword || contactSearchText(c, GROUP_LABELS[c.groupKey]).includes(keyword))
  );
  list.innerHTML = `
    <p class="muted">총 ${filtered.length}명</p>
    <div class="contact-list">${filtered.map((c) => `
      <div class="contact-card ${c.active === false ? 'inactive' : ''}">
        <div>
          <b>${esc(c.name || '(이름 없음)')}</b>
          <span class="badge-soft">${esc(GROUP_LABELS[c.groupKey] || c.groupKey)}</span>
          ${c.active === false ? '<span class="muted"> · 비활성</span>' : ''}
          <div class="contact-lines">
            ${c.phone ? `<span>본인: ${esc(c.phone)}</span>` : ''}
            ${c.address ? `<span>주소: ${esc(c.address)}</span>` : ''}
            ${(c.emergencyName || c.emergencyPhone) ? `<span>비상: ${esc(c.emergencyName || '')} ${esc(c.emergencyPhone || '')}${c.relation ? ' · ' + esc(c.relation) : ''}</span>` : ''}
            ${c.memo ? `<span>메모: ${esc(c.memo)}</span>` : ''}
          </div>
        </div>
        ${canWrite ? `<div class="member-actions">
          <button class="mini" data-edit-contact="${esc(c.groupKey)}:${esc(c.id)}">수정</button>
          <button class="mini ${c.active === false ? '' : 'del'}" data-toggle-contact="${esc(c.groupKey)}:${esc(c.id)}">${c.active === false ? '활성' : '비활성'}</button>
        </div>` : ''}
      </div>`).join('') || '<p class="muted">표시할 연락처가 없습니다.</p>'}</div>
  `;
  if (!canWrite) return;
  list.querySelectorAll('[data-edit-contact]').forEach((b) => {
    b.onclick = () => {
      const [groupKey, id] = b.dataset.editContact.split(':');
      contactEditScreen(groupKey, contacts.find((c) => c.groupKey === groupKey && c.id === id));
    };
  });
  list.querySelectorAll('[data-toggle-contact]').forEach((b) => {
    b.onclick = async () => {
      const [groupKey, id] = b.dataset.toggleContact.split(':');
      const contact = contacts.find((c) => c.groupKey === groupKey && c.id === id);
      if (!contact) return;
      await updateDoc(doc(db, 'groups', groupKey, 'emergencyContacts', id), {
        active: contact.active === false,
        updatedBy: session.uid,
        updatedAt: serverTimestamp()
      });
      contactsScreen(contact.active === false ? '활성 처리했습니다.' : '비활성 처리했습니다.');
    };
  });
}

function contactEditScreen(groupKey, contact = null) {
  if (!canWriteContacts()) return contactsScreen();
  const editing = !!contact?.id;
  const field = (id, label, value = '') => `
    <label>${label}</label>
    <input id="${id}" value="${esc(value)}" />`;
  shell(`
    <p class="eyebrow">회중 서기</p>
    <h1>${editing ? '연락처 수정' : '새 연락처'}</h1>
    <label>집단</label>
    <select id="groupKey">${groupOptions(groupKey)}</select>
    ${field('name', '이름', contact?.name || '')}
    ${field('phone', '본인 연락처', contact?.phone || '')}
    ${field('address', '주소', contact?.address || '')}
    ${field('emergencyName', '비상연락처 이름', contact?.emergencyName || '')}
    ${field('emergencyPhone', '비상연락처 전화', contact?.emergencyPhone || '')}
    ${field('relation', '관계', contact?.relation || '')}
    <label>메모</label>
    <textarea id="memo">${esc(contact?.memo || '')}</textarea>
    <label class="chk"><input type="checkbox" id="active" ${contact?.active !== false ? 'checked' : ''}/> 활성</label>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 주소록</button>
  `);
  document.getElementById('back').onclick = () => contactsScreen();
  document.getElementById('save').onclick = async () => {
    const selectedGroup = document.getElementById('groupKey').value;
    const id = editing && selectedGroup === contact.groupKey
      ? contact.id
      : doc(collection(db, 'groups', selectedGroup, 'emergencyContacts')).id;
    try {
      const payload = buildEmergencyContactPayload({
        name: document.getElementById('name').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        emergencyName: document.getElementById('emergencyName').value,
        emergencyPhone: document.getElementById('emergencyPhone').value,
        relation: document.getElementById('relation').value,
        memo: document.getElementById('memo').value,
        active: document.getElementById('active').checked,
        createdAt: contact?.createdAt
      }, session.uid, serverTimestamp());
      if (!payload.createdAt) payload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'groups', selectedGroup, 'emergencyContacts', id), payload);
      if (editing && selectedGroup !== contact.groupKey) {
        await updateDoc(doc(db, 'groups', contact.groupKey, 'emergencyContacts', contact.id), {
          active: false,
          updatedBy: session.uid,
          updatedAt: serverTimestamp()
        });
      }
      contactsScreen('저장되었습니다.');
    } catch (e) {
      document.getElementById('msg').innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
    }
  };
}

async function importContactsFromXlsx(file) {
  const msg = document.getElementById('contacts-msg');
  msg.textContent = '엑셀 파일을 읽는 중…';
  try {
    const { parseEmergencyContactXlsx } = await import('./contact-xlsx.js');
    const parsed = await parseEmergencyContactXlsx(file, GROUP_LABELS);
    if (!parsed.total) {
      msg.innerHTML = '<span class="err">가져올 연락처를 찾지 못했습니다.</span>';
      return;
    }
    if (!confirm(`엑셀에서 ${parsed.total}명을 가져옵니다. 기존 같은 이름/연락처 ID는 덮어쓸 수 있습니다. 진행할까요?`)) {
      msg.textContent = '취소했습니다.';
      return;
    }
    let batch = writeBatch(db);
    let count = 0;
    let batchCount = 0;
    for (const [groupKey, rows] of Object.entries(parsed.groups)) {
      for (let i = 0; i < rows.length; i += 1) {
        const payload = buildEmergencyContactPayload({
          ...rows[i],
          createdAt: serverTimestamp()
        }, session.uid, serverTimestamp());
        const id = stableContactId(rows[i], i);
        batch.set(doc(db, 'groups', groupKey, 'emergencyContacts', id), payload);
        count += 1;
        batchCount += 1;
        if (batchCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }
    if (batchCount) await batch.commit();
    const skipped = parsed.skippedGroups.length ? ` 알 수 없는 집단명: ${parsed.skippedGroups.join(', ')}` : '';
    contactsScreen(`엑셀 이관 완료: ${count}명.${skipped}`);
  } catch (e) {
    msg.innerHTML = `<span class="err">엑셀 이관 실패: ${esc(e.message)}</span>`;
  }
}

// ---------- 회중 서기 전체 보고 현황 ----------
async function secretaryScreen() {
  shell(`<h1>회중 봉사 보고 현황</h1><p class="muted">불러오는 중…</p>`);
  try {
    const cfg = (await getDoc(doc(db, 'config', 'app'))).data() || {};
    const period = cfg.reportPeriod || '';
    const pm = /^(\d{4})-(\d{2})$/.exec(period);
    const plabel = pm ? `${pm[1]}년 ${Number(pm[2])}월` : period || '(보고월 미설정)';
    const groups = Object.keys(GROUP_LABELS);
    let totalM = 0, totalS = 0;
    const blocks = [];
    const exportRows = [];
    const groupSummaryRows = [];
    for (const g of groups) {
      const ms = await getDocs(collection(db, 'groups', g, 'members'));
      const members = [];
      ms.forEach((d) => {
        const v = d.data();
        if (v.active !== false) members.push({ id: d.id, ...v });
      });
      members.sort((a, b) => (a.seq || 0) - (b.seq || 0));

      const submitted = new Set();
      const reports = {};
      if (period) {
        const rs = await getDocs(collection(db, 'reports', period, 'groups', g, 'members'));
        rs.forEach((d) => {
          submitted.add(d.id);
          reports[d.id] = { id: d.id, ...d.data() };
        });
      }

      const submittedMembers = members.filter((m) => submitted.has(m.id));
      const miss = members.filter((m) => !submitted.has(m.id));
      totalM += members.length; totalS += submittedMembers.length;
      const regularCount = submittedMembers.filter((m) => (reports[m.id]?.pioneerType || '') === 'regular').length;
      const auxiliaryCount = submittedMembers.filter((m) => (reports[m.id]?.pioneerType || (reports[m.id]?.auxiliaryPioneer ? 'auxiliary' : '')) === 'auxiliary').length;
      const bibleStudiesTotal = submittedMembers.reduce((sum, m) => sum + (Number(reports[m.id]?.bibleStudies) || 0), 0);
      const hoursTotal = submittedMembers.reduce((sum, m) => sum + (Number(reports[m.id]?.hours) || 0), 0);
      groupSummaryRows.push({
        보고월: plabel,
        집단: GROUP_LABELS[g] || g,
        성원수: members.length,
        제출: submittedMembers.length,
        미제출: miss.length,
        제출률: members.length ? `${Math.round((submittedMembers.length / members.length) * 100)}%` : '0%',
        성서연구합계: bibleStudiesTotal,
        파이오니아시간합계: hoursTotal,
        정규파이오니아: regularCount,
        보조파이오니아: auxiliaryCount
      });
      members.forEach((m) => {
        const report = reports[m.id] || {};
        const hasReport = submitted.has(m.id);
        exportRows.push(buildSecretaryReportCsvRow({
          periodLabel: plabel,
          groupLabel: GROUP_LABELS[g] || g,
          member: m,
          report,
          submitted: hasReport
        }));
      });
      const reportRows = submittedMembers.map((m) => `<div class="rrow report-row report-row-nested">
        <span class="report-member">
          <b>${esc(m.name)}</b>
          ${reportDetailHtml(reports[m.id])}
        </span>
        <span class="okb">제출 완료</span>
      </div>`).join('');

      blocks.push(`<section class="report-group-block ${miss.length ? 'miss' : ''}">
        <div class="rrow report-group-head"><span><b>${esc(GROUP_LABELS[g])}</b> 제출 ${submittedMembers.length}/${members.length}
          ${miss.length ? `<br><span class="muted">미제출: ${esc(miss.map((m) => m.name).join(', '))}</span>` : ''}</span>
          <span class="${miss.length ? 'missb' : 'okb'}">${miss.length ? miss.length + '명' : '완료'}</span></div>
        ${reportRows || '<p class="muted report-empty">제출된 보고가 없습니다.</p>'}
      </section>`);
    }
    shell(`
      <p class="eyebrow">회중 서기</p>
      <h1>회중 봉사 보고 현황</h1>
      <p class="sum">${esc(plabel)} · 전체 제출 <b>${totalS}</b> / 성원 ${totalM} · 미제출 <b>${totalM - totalS}</b></p>
      <button class="primary" id="export-report-xlsx">엑셀 파일 다운로드</button>
      <div class="rlist">${blocks.join('')}</div>
      <button class="link" id="back">← 뒤로</button>
    `);
    const exportBtn = document.getElementById('export-report-xlsx');
    if (exportBtn) exportBtn.onclick = () => downloadSecretaryReportWorkbook(exportRows, groupSummaryRows, plabel);
    backBtn();
  } catch (e) {
    shell(`<h1>회중 봉사 보고 현황</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`); backBtn();
  }
}

function buildSecretaryReportCsvRow({ periodLabel, groupLabel, member, report, submitted }) {
  const pioneerType = report.pioneerType || (report.auxiliaryPioneer ? 'auxiliary' : '');
  const pioneerLabel = {
    regular: '정규 파이오니아',
    auxiliary: '보조 파이오니아',
    special: '특별 파이오니아'
  }[pioneerType] || '';
  return {
    보고월: periodLabel,
    집단: groupLabel,
    이름: member.name || report.memberName || '',
    제출여부: submitted ? '제출 완료' : '미제출',
    봉사참여: submitted ? (report.participated === true ? '참여' : '참여 없음') : '',
    성서연구: submitted ? String(Number(report.bibleStudies) || 0) : '',
    파이오니아구분: submitted ? pioneerLabel : '',
    시간: submitted && (pioneerLabel || Number(report.hours)) ? String(Number(report.hours) || 0) : '',
    메모: submitted ? String(report.memo || '') : '',
    제출시각: submitted ? formatReportTimestamp(report.submittedAt) : ''
  };
}

async function downloadSecretaryReportWorkbook(rows, groupSummaryRows, periodLabel) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const allRows = rows.slice();
  const submittedRows = allRows.filter((row) => row.제출여부 === '제출 완료');
  const generalRows = submittedRows.filter((row) => !row.파이오니아구분);
  const regularRows = submittedRows.filter((row) => row.파이오니아구분 === '정규 파이오니아');
  const auxiliaryRows = submittedRows.filter((row) => row.파이오니아구분 === '보조 파이오니아');
  const missingRows = allRows
    .filter((row) => row.제출여부 === '미제출')
    .map((row) => ({ 보고월: row.보고월, 집단: row.집단, 이름: row.이름, 제출여부: row.제출여부 }));

  appendSheet(XLSX, wb, '전체 보고', allRows);
  appendSheet(XLSX, wb, '일반 참여', generalRows);
  appendSheet(XLSX, wb, '정규 파이오니아', regularRows);
  appendSheet(XLSX, wb, '보조 파이오니아', auxiliaryRows);
  appendSheet(XLSX, wb, '미제출', missingRows);
  appendSheet(XLSX, wb, '집단별 집계', groupSummaryRows);

  const safePeriod = String(periodLabel || '봉사보고').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `회중_봉사보고_${safePeriod}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function appendSheet(XLSX, wb, name, rows) {
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  const headers = rows.length ? Object.keys(rows[0]) : [];
  if (headers.length) {
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(10, h.length + 4, ...rows.map((row) => String(row[h] ?? '').length + 2).slice(0, 80)) }));
    ws['!autofilter'] = { ref: XLSX.utils.encode_range(XLSX.utils.decode_range(ws['!ref'])) };
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

// ---------- 서기 성원 관리 ----------
function canManageMembers() {
  return session?.claims?.canWriteCongMembers === true;
}

function groupOptions(selected = '') {
  return GROUP_ORDER.map((k) =>
    `<option value="${k}" ${selected === k ? 'selected' : ''}>${esc(GROUP_LABELS[k])}</option>`).join('');
}

async function loadMemberBundle(groupKey) {
  const members = [];
  const notes = {};
  const msnap = await getDocs(collection(db, 'groups', groupKey, 'members'));
  msnap.forEach((d) => members.push({ id: d.id, ...d.data() }));
  members.sort((a, b) => (a.seq || 0) - (b.seq || 0));
  try {
    const psnap = await getDocs(collection(db, 'groups', groupKey, 'membersPrivate'));
    psnap.forEach((d) => { notes[d.id] = d.data().note || ''; });
  } catch {
    // note 권한이 없거나 아직 문서가 없는 경우에도 명단 관리는 계속 가능하게 둔다.
  }
  return { members, notes };
}

function memberGroupPickScreen() {
  if (!canManageMembers()) {
    shell(`<h1>집단 성원 관리</h1><p class="err">서기 권한이 필요합니다.</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
    return;
  }
  shell(`
    <p class="eyebrow">회중 서기</p>
    <h1>집단 성원 관리</h1>
    <p class="muted">성원 명단을 수정하거나 비활성화하고, 새 성원을 추가합니다.</p>
    <label>집단 선택</label>
    <select id="gk">${groupOptions()}</select>
    <button class="primary" id="open">명단 열기</button>
    <button class="link" id="back">← 뒤로</button>
  `);
  backBtn();
  document.getElementById('open').onclick = () => memberListScreen(document.getElementById('gk').value);
}

async function memberListScreen(groupKey, msg = '') {
  if (!canManageMembers()) return memberGroupPickScreen();
  shell(`<h1>집단 성원 관리</h1><p class="muted">불러오는 중…</p>`);
  try {
    const { members, notes } = await loadMemberBundle(groupKey);
    const active = members.filter((m) => m.active !== false);
    const inactive = members.filter((m) => m.active === false);
    const row = (m) => `
      <div class="member-row ${m.active === false ? 'inactive' : ''}">
        <div>
          <b>${esc(m.seq ?? '')}. ${esc(m.name || '')}</b>
          ${m.displayName ? `<span class="muted"> · ${esc(m.displayName)}</span>` : ''}
          <br><span class="muted">${esc(m.gender || '성별 미지정')} · ${esc(m.role || '역할 없음')}${m.elder ? ' · 회중 장로' : ''}${m.regularPioneer ? ' · 정규파이오니아' : ''}${notes[m.id] ? ' · 메모 있음' : ''}</span>
        </div>
        <div class="member-actions">
          <button class="mini" data-edit="${esc(m.id)}">수정</button>
          <button class="mini" data-toggle="${esc(m.id)}">${m.active === false ? '되살리기' : '명단에서 빼기'}</button>
          <button class="mini" data-move="${esc(m.id)}">이동</button>
        </div>
      </div>`;
    shell(`
      <p class="eyebrow">회중 서기 · ${esc(GROUP_LABELS[groupKey] || groupKey)}</p>
      <h1>집단 성원 관리</h1>
      ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
      <div class="member-toolbar">
        <button class="primary" id="add">+ 성원 추가</button>
        <button class="link" id="change-group">다른 집단 선택</button>
      </div>
      <h2 class="sec">활성 성원 ${active.length}명</h2>
      <div class="member-list">${active.map(row).join('') || '<p class="muted">활성 성원이 없습니다.</p>'}</div>
      <h2 class="sec">비활성 ${inactive.length}명</h2>
      <div class="member-list">${inactive.map(row).join('') || '<p class="muted">비활성 성원이 없습니다.</p>'}</div>
      <button class="link" id="back">← 뒤로</button>
    `);
    document.getElementById('back').onclick = home;
    document.getElementById('change-group').onclick = memberGroupPickScreen;
    document.getElementById('add').onclick = () => memberFormScreen(groupKey, null, '', members);
    document.querySelectorAll('[data-edit]').forEach((b) => {
      b.onclick = () => {
        const member = members.find((m) => m.id === b.dataset.edit);
        memberFormScreen(groupKey, member, notes[member.id] || '', members);
      };
    });
    document.querySelectorAll('[data-toggle]').forEach((b) => {
      b.onclick = async () => {
        const member = members.find((m) => m.id === b.dataset.toggle);
        await saveMember(groupKey, member.id, { ...member, active: member.active === false }, notes[member.id] || '');
        memberListScreen(groupKey, member.active === false ? '명단에 다시 올렸습니다.' : '명단에서 뺐습니다.');
      };
    });
    document.querySelectorAll('[data-move]').forEach((b) => {
      b.onclick = () => {
        const member = members.find((m) => m.id === b.dataset.move);
        memberMoveScreen(groupKey, member, notes[member.id] || '');
      };
    });
  } catch (e) {
    shell(`<h1>집단 성원 관리</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
  }
}

function selectOptions(values, selected) {
  const options = values.includes(selected) ? values : [...values, selected];
  return options.map((v) => `<option value="${esc(v)}" ${v === selected ? 'selected' : ''}>${esc(v || '없음')}</option>`).join('');
}

function memberFormScreen(groupKey, member, note = '', members = []) {
  const defaults = memberFormDefaults(member, groupKey, members);
  const editing = !!member;
  shell(`
    <p class="eyebrow">회중 서기 · ${esc(GROUP_LABELS[groupKey] || groupKey)}</p>
    <h1>${editing ? '성원 수정' : '성원 추가'}</h1>
    <p class="muted">문서 ID: <b>${esc(defaults.id)}</b>${editing ? ' · ID는 변경하지 않습니다.' : ' · 저장 후 ID는 변경하지 않습니다.'}</p>
    <label>이름</label>
    <input id="m_name" value="${esc(defaults.name)}" />
    <label>표시명 (선택)</label>
    <input id="m_display" value="${esc(defaults.displayName)}" />
    <label>순번</label>
    <input id="m_seq" type="number" inputmode="numeric" min="0" max="999" value="${esc(defaults.seq)}" />
    <label>성별</label>
    <select id="m_gender">${selectOptions(MEMBER_GENDERS, defaults.gender)}</select>
    <label>역할</label>
    <select id="m_role">${selectOptions(MEMBER_ROLES, defaults.role)}</select>
    <label class="chk"><input type="checkbox" id="m_elder" ${defaults.elder ? 'checked' : ''}/> 회중 장로</label>
    <label class="chk"><input type="checkbox" id="m_rp" ${defaults.regularPioneer ? 'checked' : ''}/> 정규파이오니아</label>
    <label>서기 메모 (민감 정보)</label>
    <textarea id="m_note" maxlength="2000">${esc(note)}</textarea>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 목록</button>
  `);
  document.getElementById('back').onclick = () => memberListScreen(groupKey);
  document.getElementById('save').onclick = async () => {
    const form = readMemberForm(defaults.active);
    const msg = document.getElementById('msg');
    msg.textContent = '저장 중…';
    document.getElementById('save').disabled = true;
    try {
      await saveMember(groupKey, defaults.id, form, document.getElementById('m_note').value);
      memberListScreen(groupKey, editing ? '수정되었습니다.' : '성원이 추가되었습니다.');
    } catch (e) {
      document.getElementById('save').disabled = false;
      msg.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
    }
  };
}

function readMemberForm(active = true) {
  return {
    name: document.getElementById('m_name').value,
    displayName: document.getElementById('m_display').value,
    seq: document.getElementById('m_seq').value,
    gender: document.getElementById('m_gender').value,
    role: document.getElementById('m_role').value,
    regularPioneer: document.getElementById('m_rp').checked,
    elder: document.getElementById('m_elder').checked,
    active
  };
}

async function saveMember(groupKey, memberId, form, note) {
  await setDoc(doc(db, 'groups', groupKey, 'members', memberId),
    buildMemberPayload(form, session.uid, serverTimestamp()));
  await setDoc(doc(db, 'groups', groupKey, 'membersPrivate', memberId),
    buildMemberPrivatePayload(note, session.uid, serverTimestamp()));
}

function memberMoveScreen(fromGroup, member, note = '') {
  const targetOptions = GROUP_ORDER
    .filter((g) => g !== fromGroup)
    .map((g) => `<option value="${g}">${esc(GROUP_LABELS[g])}</option>`).join('');
  shell(`
    <p class="eyebrow">회중 서기 · ${esc(GROUP_LABELS[fromGroup] || fromGroup)}</p>
    <h1>성원 집단 이동</h1>
    <p class="muted"><b>${esc(member.name || '')}</b> 님을 다른 집단으로 이동합니다. 기존 집단 문서는 비활성 처리되고, 새 집단에 새 ID로 생성됩니다.</p>
    <label>이동할 집단</label>
    <select id="target">${targetOptions}</select>
    <button class="primary" id="move">이동 실행</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 목록</button>
  `);
  document.getElementById('back').onclick = () => memberListScreen(fromGroup);
  document.getElementById('move').onclick = async () => {
    const targetGroup = document.getElementById('target').value;
    const msg = document.getElementById('msg');
    msg.textContent = '이동 중…';
    document.getElementById('move').disabled = true;
    try {
      const { members: targetMembers } = await loadMemberBundle(targetGroup);
      const targetSeq = nextMemberSeq(targetMembers);
      const targetId = nextMemberId(targetGroup, targetSeq);
      const batch = writeBatch(db);
      batch.set(doc(db, 'groups', targetGroup, 'members', targetId),
        buildMemberPayload({ ...member, seq: targetSeq, active: true }, session.uid, serverTimestamp()));
      batch.set(doc(db, 'groups', targetGroup, 'membersPrivate', targetId),
        buildMemberPrivatePayload(note, session.uid, serverTimestamp()));
      batch.set(doc(db, 'groups', fromGroup, 'members', member.id),
        buildMemberPayload({ ...member, active: false }, session.uid, serverTimestamp()));
      await batch.commit();
      memberListScreen(fromGroup, `${member.name || '성원'} 님을 ${GROUP_LABELS[targetGroup] || targetGroup}으로 이동했습니다.`);
    } catch (e) {
      document.getElementById('move').disabled = false;
      msg.innerHTML = `<span class="err">이동 실패: ${esc(e.message)}</span>`;
    }
  };
}

// ---------- 서기 집단 편성표 ----------
async function loadRosterData() {
  const groups = {};
  const membersByGroup = {};
  await Promise.all(GROUP_ORDER.map(async (groupKey) => {
    let group = {};
    try {
      const gsnap = await getDoc(doc(db, 'groups', groupKey));
      group = gsnap.exists() ? gsnap.data() : {};
    } catch {
      group = {};
    }
    groups[groupKey] = { ...group, label: GROUP_LABELS[groupKey] || groupKey };
    const { members } = await loadMemberBundle(groupKey);
    membersByGroup[groupKey] = members;
  }));
  return { groups, membersByGroup, columns: buildRosterColumns(groups, membersByGroup, GROUP_ORDER) };
}

async function rosterScreen(msg = '') {
  if (!canManageMembers()) return memberGroupPickScreen();
  shell(`<h1>집단 편성표</h1><p class="muted">불러오는 중…</p>`);
  try {
    const data = await loadRosterData();
    renderRoster(data, msg);
  } catch (e) {
    shell(`<h1>집단 편성표</h1><p class="err">${esc(e.message)}</p><button class="link" id="back">← 뒤로</button>`);
    backBtn();
  }
}

function renderRoster(data, msg = '') {
  const maxRows = Math.max(0, ...data.columns.map((col) => col.rows.length));
  const tableRows = Array.from({ length: maxRows }, (_, rowIndex) => `
    <tr>${data.columns.map((col) => rosterCellHtml(col, col.rows[rowIndex])).join('')}</tr>
  `).join('');
  shell(`
    <p class="eyebrow">회중 서기</p>
    <h1>집단 편성표</h1>
    ${msg ? `<p class="savemsg">${esc(msg)}</p>` : ''}
    <p class="muted">성원 이름을 다른 집단 열로 끌어 놓으면 집단 이동을 처리합니다. 비활성 성원은 편성표에서 제외됩니다.</p>
    <div class="member-toolbar roster-actions">
      <button class="primary" id="roster-refresh">새로고침</button>
      <button class="primary soft" id="roster-print">PDF 저장/인쇄</button>
      <button class="primary soft" id="roster-publish">성원 앱에 게시</button>
      <button class="link" id="back">← 뒤로</button>
    </div>
    <div class="roster-scroll">
      <table class="roster-table" id="roster-board">
        <thead><tr>${data.columns.map((col) => `
          <th class="roster-drop" data-group="${esc(col.groupKey)}">${esc(col.label)}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
    <p id="roster-msg" class="savemsg"></p>
  `);
  document.getElementById('back').onclick = home;
  document.getElementById('roster-refresh').onclick = () => rosterScreen();
  document.getElementById('roster-print').onclick = () => printRoster();
  document.getElementById('roster-publish').onclick = () => publishRosterImage();
  wireRosterDrag(data);
}

function rosterCellHtml(col, row) {
  if (!row) return `<td class="roster-drop empty" data-group="${esc(col.groupKey)}"></td>`;
  const base = row.type === 'member'
    ? `<span class="roster-name member-only">${esc(row.name)}</span>`
    : `<span class="roster-label">${esc(row.label)}</span><span class="roster-name">${esc(row.name)}</span>`;
  if (row.type !== 'member') return `<td class="roster-leader roster-drop" data-group="${esc(col.groupKey)}">${base}</td>`;
  return `
    <td class="roster-drop" data-group="${esc(col.groupKey)}">
      <button class="roster-member" draggable="true" data-group="${esc(col.groupKey)}" data-member="${esc(row.member.id)}" title="다른 집단으로 이동">
        ${base}
      </button>
    </td>`;
}

function wireRosterDrag(data) {
  document.querySelectorAll('.roster-member').forEach((el) => {
    el.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', JSON.stringify({
        fromGroup: el.dataset.group,
        memberId: el.dataset.member
      }));
      event.dataTransfer.effectAllowed = 'move';
    });
  });
  document.querySelectorAll('.roster-drop').forEach((el) => {
    el.addEventListener('dragover', (event) => {
      event.preventDefault();
      el.classList.add('over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('over'));
    el.addEventListener('drop', async (event) => {
      event.preventDefault();
      el.classList.remove('over');
      const targetGroup = el.dataset.group;
      let payload = {};
      try { payload = JSON.parse(event.dataTransfer.getData('text/plain')); } catch { return; }
      if (!targetGroup || !payload.fromGroup || !payload.memberId || targetGroup === payload.fromGroup) return;
      await moveRosterMember(data, payload.fromGroup, payload.memberId, targetGroup);
    });
  });
}

async function moveRosterMember(data, fromGroup, memberId, targetGroup) {
  const sourceMembers = data.membersByGroup[fromGroup] || [];
  const member = sourceMembers.find((m) => m.id === memberId);
  if (!member) return;
  const ok = confirm(`${member.name || '성원'} 님을 ${GROUP_LABELS[targetGroup] || targetGroup} 집단으로 이동할까요?`);
  if (!ok) return;
  const msg = document.getElementById('roster-msg');
  msg.textContent = '이동 중…';
  try {
    let note = '';
    try {
      const privateDoc = await getDoc(doc(db, 'groups', fromGroup, 'membersPrivate', memberId));
      note = privateDoc.exists() ? (privateDoc.data().note || '') : '';
    } catch {
      note = '';
    }
    const targetBundle = await loadMemberBundle(targetGroup);
    const move = buildRosterMove({ fromGroup, targetGroup, member, targetMembers: targetBundle.members });
    const batch = writeBatch(db);
    batch.set(doc(db, 'groups', targetGroup, 'members', move.targetId),
      buildMemberPayload(move.targetForm, session.uid, serverTimestamp()));
    batch.set(doc(db, 'groups', targetGroup, 'membersPrivate', move.targetId),
      buildMemberPrivatePayload(note, session.uid, serverTimestamp()));
    batch.set(doc(db, 'groups', fromGroup, 'members', member.id),
      buildMemberPayload(move.sourceForm, session.uid, serverTimestamp()));
    await batch.commit();
    rosterScreen(`${member.name || '성원'} 님을 ${GROUP_LABELS[targetGroup] || targetGroup}으로 이동했습니다.`);
  } catch (e) {
    msg.innerHTML = `<span class="err">이동 실패: ${esc(e.message)}</span>`;
  }
}

function printRoster() {
  const board = document.getElementById('roster-board');
  if (!board) return;
  const win = window.open('', '_blank');
  if (!win) {
    alert('새 창을 열 수 없습니다. 브라우저 팝업 차단을 확인해 주세요.');
    return;
  }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>집단 편성표</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: Arial, "Malgun Gothic", sans-serif; color:#15202b; }
      .print-title { text-align:center; font-size:18pt; font-weight:800; margin:0; }
      .print-date { text-align:right; font-size:8pt; color:#526173; margin:2mm 0 4mm; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; border:1.4pt solid #35513f; }
      thead { display: table-header-group; }
      th { background:#2f7d52; color:#fff; border:1pt solid #245f3f; padding:5px 2px; font-size:11pt; text-align:center; font-weight:800; }
      td { border:0.6pt solid #ccd6df; padding:4px 2px; height:24px; vertical-align:middle; text-align:center; font-size:10.5pt; line-height:1.2; }
      tbody tr:nth-child(even) td:not(.roster-leader) { background:#fafbfc; }
      .roster-member { all: unset; display:block; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:800; }
      .roster-label { display:block; color:#526173; font-size:8pt; line-height:1; }
      .roster-name { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:800; text-align:center; }
      .member-only { font-size:12pt; font-weight:800; }
      .roster-leader { background:#eef2f7 !important; }
      .empty { background:#fff; }
    </style></head><body><h1 class="print-title">회중 야외 봉사 집단 편성표</h1><div class="print-date">${new Date().toLocaleDateString('ko-KR')}</div>${board.outerHTML}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

async function publishRosterImage() {
  const msg = document.getElementById('roster-msg');
  const board = document.getElementById('roster-board');
  if (!board) return;
  msg.textContent = '편성표 이미지를 만드는 중…';
  try {
    const dataUrl = await captureRosterDataUrl(board);
    const page = rosterPagePayload(dataUrl, session.uid);
    const snap = await getDocs(collection(db, 'notices', ROSTER_NOTICE_KEY, 'pages'));
    for (const d of snap.docs) await deleteDoc(d.ref);
    await setDoc(doc(db, 'notices', ROSTER_NOTICE_KEY), rosterNoticePayload(session.uid, serverTimestamp()));
    await setDoc(doc(db, 'notices', ROSTER_NOTICE_KEY, 'pages', '1'), page);
    msg.textContent = '성원 앱 광고·안내에 집단 편성표를 게시했습니다.';
  } catch (e) {
    msg.innerHTML = `<span class="err">게시 실패: ${esc(e.message)}</span>`;
  }
}

async function captureRosterDataUrl(board) {
  const clone = board.cloneNode(true);
  clone.querySelectorAll('button').forEach((button) => {
    const span = document.createElement('span');
    span.className = button.className;
    span.innerHTML = button.innerHTML;
    button.replaceWith(span);
  });
  const width = 794;
  const height = 1123;
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${width}px;height:${height}px;padding:30px;background:#ffffff;font-family:Arial,'Malgun Gothic',sans-serif;color:#15202b;">
      <h1 style="font-size:28px;font-weight:800;text-align:center;margin:0;">회중 야외 봉사 집단 편성표</h1>
      <div style="font-size:12px;text-align:right;color:#526173;margin:8px 0 16px;">${new Date().toLocaleDateString('ko-KR')}</div>
      <style>
        table{border-collapse:collapse;width:100%;table-layout:fixed;border:2px solid #35513f}
        th{background:#2f7d52;color:#fff;border:1px solid #245f3f;padding:8px 2px;font-size:19px;text-align:center;font-weight:800}
        td{border:1px solid #ccd6df;padding:6px 2px;vertical-align:middle;text-align:center;font-size:18px;height:34px;line-height:1.2}
        tbody tr:nth-child(even) td:not(.roster-leader){background:#fafbfc}
        .roster-label{display:block;color:#526173;font-size:11px;line-height:1}
        .roster-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:800;text-align:center}
        .member-only{font-size:21px;font-weight:800}
        .roster-leader{background:#eef2f7!important}.empty{background:#fff}
      </style>
      ${clone.outerHTML}
    </div>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <foreignObject width="100%" height="100%">${html}</foreignObject>
  </svg>`;
  const img = await loadDataImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > 700000 && quality > 0.42) {
    quality = Number((quality - 0.1).toFixed(2));
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }
  return dataUrl;
}

function loadDataImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('편성표 이미지를 만들지 못했습니다.'));
    img.src = src;
  });
}

// ---------- PIN 변경 ----------
function pinChangeScreen(msg = '') {
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>PIN 변경</h1>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    <label>현재 PIN</label>
    <input id="old" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 PIN (숫자 4~8자리)</label>
    <input id="n1" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 PIN 확인</label>
    <input id="n2" type="password" inputmode="numeric" autocomplete="off" />
    <button class="primary" id="save">변경하기</button>
    <button class="link" id="back">← 뒤로</button>
  `);
  document.getElementById('back').onclick = home;
  document.getElementById('save').onclick = doChangePin;
}

async function doChangePin() {
  const oldPin = document.getElementById('old').value.trim();
  const n1 = document.getElementById('n1').value.trim();
  const n2 = document.getElementById('n2').value.trim();
  if (!/^[0-9]{4,8}$/.test(n1)) return pinChangeScreen('새 PIN은 숫자 4~8자리입니다.');
  if (n1 !== n2) return pinChangeScreen('새 PIN 확인이 일치하지 않습니다.');

  const btn = document.getElementById('save');
  btn.disabled = true; btn.textContent = '변경 중…';
  try {
    const res = await fetch(`${WORKER_URL}/auth/change-pin`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scope: session.scope, key: session.key, oldPin, newPin: n1 })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      shell(`<h1>PIN 변경 완료 ✓</h1><p class="muted">다음부터 새 PIN으로 로그인하세요.</p>
        <button class="primary" id="ok">확인</button>`);
      document.getElementById('ok').onclick = () => { session = null; loginScreen(); };
      return;
    }
    pinChangeScreen(changePinError(data.error));
  } catch (e) {
    pinChangeScreen('오류: ' + e.message);
  }
}
function changePinError(code) {
  if (code === 'PIN_TAKEN') return '이미 다른 분이 쓰는 번호입니다. 다른 번호를 사용하세요.';
  if (code === 'SAME_PIN') return '현재 번호와 다른 번호로 정하세요.';
  if (code === 'INVALID_CREDENTIALS') return '현재 PIN이 올바르지 않습니다.';
  if (code === 'INVALID_NEW_PIN') return '새 PIN은 숫자 4~8자리입니다.';
  if (code === 'PIN_MANAGED') return '회중 장로 PIN은 조정자만 설정할 수 있습니다.';
  return '변경 실패: ' + (code || '알 수 없음');
}

// ---------- 회중 장로 PIN 설정 (조정자 전용) ----------
function elderPinScreen(msg = '') {
  shell(`
    <p class="eyebrow">${esc(whoLabel())}</p>
    <h1>회중 장로 PIN 설정</h1>
    <p class="muted">장로들이 공유하는 로그인 PIN입니다. 여기서 정한 뒤 장로들에게 안내하세요.
      장로 본인은 이 PIN을 바꿀 수 없습니다.</p>
    ${msg ? `<p class="err">${esc(msg)}</p>` : ''}
    <label>내(조정자) PIN <span class="muted">(본인 확인)</span></label>
    <input id="cpin" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 회중 장로 PIN (숫자 4~8자리)</label>
    <input id="e1" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 회중 장로 PIN 확인</label>
    <input id="e2" type="password" inputmode="numeric" autocomplete="off" />
    <button class="primary" id="save">설정하기</button>
    <button class="link" id="back">← 뒤로</button>
  `);
  document.getElementById('back').onclick = home;
  document.getElementById('save').onclick = doSetElderPin;
}

async function doSetElderPin() {
  const coordPin = document.getElementById('cpin').value.trim();
  const e1 = document.getElementById('e1').value.trim();
  const e2 = document.getElementById('e2').value.trim();
  if (!/^[0-9]{4,8}$/.test(e1)) return elderPinScreen('새 회중 장로 PIN은 숫자 4~8자리입니다.');
  if (e1 !== e2) return elderPinScreen('새 PIN 확인이 일치하지 않습니다.');

  const btn = document.getElementById('save');
  btn.disabled = true; btn.textContent = '설정 중…';
  try {
    const res = await fetch(`${WORKER_URL}/auth/set-elder-pin`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ coordPin, newPin: e1 })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      shell(`<h1>회중 장로 PIN 설정 완료 ✓</h1>
        <p class="muted">이제 장로들에게 새 PIN을 안내하세요. 기존 PIN으로는 로그인되지 않습니다.</p>
        <button class="primary" id="ok">확인</button>`);
      document.getElementById('ok').onclick = home;
      return;
    }
    elderPinScreen(setElderPinError(data.error));
  } catch (e) {
    elderPinScreen('오류: ' + e.message);
  }
}
function setElderPinError(code) {
  if (code === 'INVALID_CREDENTIALS') return '내(조정자) PIN이 올바르지 않거나 권한이 없습니다.';
  if (code === 'INVALID_NEW_PIN') return '새 회중 장로 PIN은 숫자 4~8자리입니다.';
  if (code === 'INVALID_PIN_FORMAT') return 'PIN은 숫자 4~8자리입니다.';
  return '설정 실패: ' + (code || '알 수 없음');
}

// ---------- PDF 변환·저장 ----------
async function convertPdf(file) {
  const work = document.getElementById('work');
  work.innerHTML = `<p class="muted">변환 중… (${esc(file.name)})</p>`;
  try {
    const { pdfToImages } = await import('./pdf-to-images.js');
    const { images } = await pdfToImages(file, {
      scale: 1.5, type: 'image/jpeg', quality: 0.72,
      onProgress: (d, t) => { work.querySelector('p').textContent = `변환 중… ${d}/${t} 페이지`; }
    });
    rendered = images;
    const thumbs = images.map((im, i) => `
      <label class="thumb">
        <input type="checkbox" data-i="${i}" checked />
        <img src="${im.dataUrl}" alt="page ${im.page}" />
        <span>${im.page}쪽 · ${Math.round(im.dataUrl.length / 1024)}KB</span>
      </label>`).join('');
    work.innerHTML = `
      <p class="muted">저장할(회중용) 페이지를 체크하세요.</p>
      <div class="thumbs">${thumbs}</div>
      <button class="primary" id="save">선택한 페이지 저장</button>
      <p id="savemsg" class="muted"></p>`;
    document.getElementById('save').onclick = savePages;
  } catch (e) {
    work.innerHTML = `<p class="err">변환 실패: ${esc(e.message)}</p>`;
  }
}

async function savePages() {
  const checked = [...document.querySelectorAll('.thumb input:checked')].map((c) => rendered[+c.dataset.i]);
  const btn = document.getElementById('save');
  const msg = document.getElementById('savemsg');
  if (!checked.length) { msg.textContent = '최소 한 페이지를 선택하세요.'; return; }
  btn.disabled = true; msg.textContent = '저장 중…';
  try {
    const existing = await getDocs(collection(db, 'notices', currentKey, 'pages'));
    for (const d of existing.docs) await deleteDoc(d.ref);
    for (let i = 0; i < checked.length; i++) {
      await setDoc(doc(db, 'notices', currentKey, 'pages', String(i + 1)),
        { index: i + 1, dataUrl: checked[i].dataUrl, updatedBy: session.uid });
    }
    await bumpNoticeUpdatedAt(currentKey);
    msg.innerHTML = `✅ ${checked.length}페이지 저장 완료 — 성원 화면 '${esc(NOTICE_LABELS[currentKey] || currentKey)}'에서 보입니다.`;
    btn.disabled = false;
  } catch (e) {
    btn.disabled = false;
    msg.innerHTML = `<span class="err">저장 실패: ${esc(e.message)}</span>`;
  }
}

async function bumpNoticeUpdatedAt(key) {
  await setDoc(doc(db, 'notices', key), {
    key,
    updatedAt: serverTimestamp(),
    updatedBy: session.uid
  }, { merge: true });
}

if (shouldAutoStartStandaloneAdmin(document.querySelector('#app')?.dataset)) {
  startAdminApp();
}
