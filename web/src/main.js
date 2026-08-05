import './styles.css';
import {
  memberSignIn, getGroup, getGroups, getConfig, getMembers, submitReport, getNotices, getNoticePages,
  getCongNoticeItems, getCongNoticeItemPages, getTalks, getVisits, getBoard, getGroupPosts
} from './data.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, WORKER_URL } from './firebase.js';
import { resolveReportConfig } from '../../shared/report-period.js';
import { getNoticePreview } from './notice-content.js';
import {
  CONG_NOTICE_KEY,
  isBoardNoticeKey,
  congItemPreview,
  formatCongItemDate,
  getNewCongItems,
  groupCongItemsForDisplay,
  markCongItemSeen
} from './cong-board.js';
import {
  buildNewNoticeMessage, getNewNotices, markNoticeSeen, readSeenNotices, writeSeenNotices
} from './notice-new.js';
import { isDeprecatedNoticeKey } from './notice-labels.js';
import { DUP_NAMES, resolveAssigneeGroup } from './mwb-parse.js';
import { numberedTitle } from './talk-titles.js';
import { backButtonHtml, topbarHtml } from './mobile-nav.js';
import { buildHistoryEntry, buildScreenUrl, normalizeHistoryEntry } from './history-nav.js';
import { todayDailyTextUrl, todayDateLabel } from './daily-bible.js';
import { fetchJwMediaDetails, fetchSubtitleText } from './jw-media.js';
import {
  agreeJwScript, disableJwScript, enableJwScript, isJwScriptAgreed, isJwScriptDisabled,
  safeScriptFileName, scriptOutputForMode
} from './jw-script.js';

let GROUP_NAMES = {
  group1: '1집단',
  group2: '2집단',
  group3: '3집단'
};
const DEFAULT_CONG_NAME = '회중';
let publicCongName = '';
const ROLE_SHORT_LABELS = {
  coord: '조정자',
  secretary: '서기',
  service: '봉사감독자',
  life: '생활과봉사 감독자',
  talk: '공개강연 조정자',
  elder: '회중 장로'
};

const app = document.querySelector('#app');
const IS_LOCAL_PREVIEW = ['127.0.0.1', 'localhost'].includes(location.hostname);
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const state = {
  g: null, name: '', config: {}, members: null, notices: null,
  member: null, form: null, newNotices: [],
  jwScript: { input: '', mode: 'plain', title: '', thumbnailUrl: '', vtt: '', output: '', status: '', error: '' }
};
let navSeq = 0;
let appHistoryDepth = 0;
let editorSession = null;
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label || 'TIMEOUT')), ms))
  ]);
}

function shell(inner) { app.innerHTML = `<section class="shell">${inner}</section>`; }
function wideShell(inner) { app.innerHTML = `<section class="shell shell-wide">${inner}</section>`; }
function header() {
  return `<p class="eyebrow"><span style="color:var(--accent)">${esc(state.name)}</span> <span class="muted">야외 봉사 집단</span></p>`;
}
function congNameLabel() {
  return state.config.congName || publicCongName || DEFAULT_CONG_NAME;
}
function fsgMarkHtml() {
  return '<span class="fsg-mark"><span class="fsg-mark-main">FSG</span><span class="fsg-mark-sub">GROUP</span></span>';
}
function iconHtml(name) {
  const icons = {
    home: '<path d="M3 11.5 12 4l9 7.5"></path><path d="M5.5 10.5V21h13V10.5"></path><path d="M9.5 21v-6h5v6"></path>',
    report: '<path d="M7 3h8l4 4v14H7z"></path><path d="M15 3v5h5"></path><path d="m9 15 2 2 4-5"></path>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="1"></rect><path d="M8 3v4M16 3v4M4 10h16"></path><path d="m8 15 2 2 5-5"></path>',
    notice: '<path d="M4 11v4h4l8 4V7l-8 4z"></path><path d="M18 10c1 .8 1 2.2 0 3"></path><path d="m7 15 1 5"></path>',
    list: '<path d="M8 7h12M8 12h12M8 17h12"></path><circle cx="4" cy="7" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="17" r="1"></circle>',
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c1.7-4 4.4-6 8-6s6.3 2 8 6"></path>',
    key: '<circle cx="8" cy="15" r="4"></circle><path d="m11 12 8-8"></path><path d="m16 7 2 2"></path><path d="m14 9 2 2"></path>'
  };
  return `<span class="fsg-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.home}</svg></span>`;
}
function siteTopHtml(active = 'home') {
  const groupLoggedIn = editorSession?.scope === 'group';
  const supervisorDisabled = !state.g && !groupLoggedIn;
  const supervisorLabel = groupLoggedIn ? '감독자 로그아웃' : '감독자 로그인';
  const nav = [
    ['home', '홈', 'home'],
    ['report', '온라인 보고', 'report'],
    ['assignments', '나의 임명', 'calendar'],
    ['notices', '광고', 'notice'],
    ['groups', '집단 편성표', 'list'],
    ['tools', '보조 도구', 'report'],
    ['admin', '편집자', 'key']
  ];
  return `
    <header class="fsg-topbar">
      <div class="fsg-brand">${fsgMarkHtml()}<span class="fsg-brand-title">회중 야외 봉사 집단</span></div>
      <button class="fsg-login ${supervisorDisabled ? 'is-disabled' : ''}" id="go-admin-top" type="button" ${supervisorDisabled ? 'disabled aria-disabled="true" title="집단 화면에서 사용할 수 있습니다."' : ''}>${iconHtml('user')}${supervisorLabel}</button>
    </header>
    <nav class="fsg-nav">
      ${nav.map(([key, label, icon]) => `<button class="${active === key ? 'on' : ''}" type="button" data-fsg-nav="${key}">${iconHtml(icon)}${esc(label)}</button>`).join('')}
    </nav>
    <section class="fsg-mega" id="fsg-mega" hidden>
      <button class="fsg-mega-close" id="fsg-mega-close" type="button" aria-label="상세 메뉴 닫기">×</button>
      <div class="fsg-mega-inner" id="fsg-mega-inner"></div>
    </section>`;
}

function megaLink(action, icon, title, desc, options = {}) {
  const disabled = options.disabled === true;
  return `<button class="fsg-mega-link ${disabled ? 'is-disabled' : ''}" type="button" data-fsg-action="${esc(action)}" ${disabled ? 'disabled aria-disabled="true"' : ''}>
    ${iconHtml(icon)}
    <span><b>${esc(title)}</b><em>${esc(desc)}</em></span>
  </button>`;
}

function loggedInAdminLinks() {
  if (!editorSession) return '';
  const c = editorSession.claims || {};
  const links = [];
  if (editorSession.scope === 'group') {
    links.push(megaLink('admin-current:reports', 'user', '집단 봉사 보고 현황', '자기 집단 제출·미제출 확인'));
    links.push(megaLink('admin-current:board', 'notice', '우리 집단 소식', '집단 성원에게 소식 게시'));
    links.push(megaLink('admin-current:publications', 'report', '출판물 신청', '우리 집단 신청 부수 확인과 관리'));
    links.push(megaLink('admin-current:contacts', 'list', '비상연락처·주소록', '우리 집단 주소록과 비상연락처 확인'));
    links.push(megaLink('admin-current:pin', 'key', '내 PIN 변경', '감독자 로그인 PIN 변경'));
    links.push(megaLink('admin-logout', 'key', '감독자 로그아웃', '현재 감독자 로그인 상태를 해제'));
    return links.join('');
  }
  if ((c.noticeKeys || []).includes('mid')) links.push(megaLink('admin-current:mwb', 'calendar', '평일 집회 프로그램', '교재 업로드, 편집, 이름 배정'));
  if ((c.noticeKeys || []).includes('duty')) links.push(megaLink('admin-current:duty', 'list', '봉사·청소 임명', '봉사와 청소 관련 임명 편집'));
  if (Array.isArray(c.noticeKeys) && c.noticeKeys.length) {
    links.push(megaLink('admin-current:notice', 'notice', '광고 글 편집', '담당 광고의 제목, 내용, 표시 여부 수정'));
    links.push(megaLink('admin-current:pdf', 'report', '첨부 이미지·PDF 관리', '담당 광고에 이미지와 PDF 첨부'));
  }
  if (c.canReadCongReports) links.push(megaLink('admin-current:secretary', 'report', '회중 봉사 보고 현황', '전 집단 제출·미제출 및 개별 보고 확인'));
  if (c.canWriteCongMembers) links.push(megaLink('admin-current:members', 'list', '집단 성원 관리', '성원 추가, 수정, 이동, 삭제'));
  if (c.canWriteCongMembers) links.push(megaLink('admin-current:roster', 'list', '집단 편성표 관리', '전체 편성표 보기, 이동, 출력, 게시'));
  if (c.canManageTalks) links.push(megaLink('admin-current:talks', 'notice', '공개강연 계획', '일자, 회중, 연사, 연제 편집'));
  if (c.canAssignTalkParts) links.push(megaLink('admin-current:talkassign', 'notice', '공개강연 임명', '사회·낭독·기도 배정'));
  if (c.canManageVisits) links.push(megaLink('admin-current:visits', 'calendar', '봉사 감독자 방문', '집단 방문 계획 편집'));
  if (c.canManagePublications || (Array.isArray(c.groupKeys) && c.groupKeys.length)) {
    links.push(megaLink('admin-current:publications', 'report', '출판물 신청', c.canManagePublications ? '전 집단 신청 부수 현황' : '담당 집단 신청 부수 확인'));
  }
  if (c.canWriteContacts || c.canReadContacts || (Array.isArray(c.groupKeys) && c.groupKeys.length)) {
    links.push(megaLink('admin-current:contacts', 'list', '비상연락처·주소록', c.canWriteContacts ? '전체 주소록 관리·엑셀 이관' : '공유 주소록 열람'));
  }
  if (c.canManagePins) links.push(megaLink('admin-current:elderpin', 'key', '회중 장로 PIN 설정', '장로 공유 로그인 PIN 생성과 변경'));
  if (!links.length) links.push(megaLink('admin-current', 'key', `${editorSessionLabel()} 권한 메뉴`, '로그인된 권한으로 가능한 편집 메뉴'));
  if (!(editorSession.scope === 'role' && editorSession.key === 'elder')) {
    links.push(megaLink('admin-current:pin', 'key', '내 PIN 변경', '현재 로그인 PIN 변경'));
  }
  links.push(megaLink('admin-logout', 'key', `${editorSessionLabel()} 로그아웃`, '현재 로그인 상태를 해제'));
  return links.join('');
}

function megaMenuHtml(key) {
  if (key === 'assignments') {
    return `<h2>${iconHtml('calendar')}나의 임명</h2>
      <div class="fsg-mega-grid">
        ${megaLink('assignment-hub', 'calendar', '나의 임명 전체', '개인·집단 임명 확인 입구')}
        ${megaLink('mid', 'calendar', '평일 집회 임명표', '프로그램, 사회, 기도, 낭독 임명')}
        ${megaLink('talk', 'notice', '주말 성서공개강연', '사회, 낭독, 마치는 기도 임명')}
        ${megaLink('duty', 'list', '월 단위 개인 임명', '주차, 안내, 연사 음료, 청소 임명')}
      </div>`;
  }
  if (key === 'notices') {
    return `<h2>${iconHtml('notice')}광고</h2>
      <div class="fsg-mega-grid">
        ${megaLink('notices', 'notice', '광고·안내 전체', '회중 광고와 지부 서신 목록')}
        ${megaLink('cong', 'notice', '회중 광고', '회중 전체에 내려온 안내')}
        ${megaLink('branch', 'report', '지부 광고 서신', '첨부 문서와 공지 확인')}
        ${megaLink('groupnews', 'list', '우리 집단 소식', '집단 성원에게만 전하는 소식')}
        ${megaLink('visit', 'calendar', '봉사 감독자 방문', '우리 집단 방문 계획')}
      </div>`;
  }
  if (key === 'groups') {
    return `<h2>${iconHtml('list')}집단 편성표</h2>
      <div class="fsg-mega-grid">
        ${megaLink('roster', 'list', '집단 편성표', '집단 구성과 담당자 확인')}
        ${megaLink('allgroups', 'home', '전체 야외 봉사 집단', '회중 전체 집단 목록')}
        ${megaLink('duty', 'calendar', '우리 집단 임명', '집단별 청소·봉사 관련 임명')}
      </div>`;
  }
  if (key === 'tools') {
    return `<h2>${iconHtml('report')}보조 도구</h2>
      <div class="fsg-mega-grid">
        ${megaLink('jwscript', 'report', '동영상 자막 추출', 'jw.org 동영상 자막을 개인 연구용 텍스트로 정리')}
      </div>`;
  }
  if (key === 'admin') {
    if (editorSession) {
      const isGroup = editorSession.scope === 'group';
      const label = editorSessionLabel();
      return `<h2>${iconHtml('key')}편집자</h2>
        <div class="fsg-mega-session"><b>${esc(label)} 로그인 중</b><span>${isGroup ? '집단감독자·보조자 전용 메뉴를 사용할 수 있습니다.' : `${esc(label)} 권한으로 편집 메뉴를 사용할 수 있습니다.`}</span></div>
        <div class="fsg-mega-grid">
          ${loggedInAdminLinks()}
        </div>`;
    }
    return `<h2>${iconHtml('key')}편집자</h2>
      <div class="fsg-mega-grid">
        ${megaLink('admin-role', 'key', '회중 역할자 로그인', '조정자, 서기, 봉사 감독자 등')}
        ${megaLink('admin-group', 'user', '감독자 로그인', state.g ? '집단 감독자·보조자 전용' : '집단 화면에서만 사용할 수 있습니다', { disabled: !state.g })}
      </div>`;
  }
  return '';
}

function showMegaMenu(key) {
  const mega = document.getElementById('fsg-mega');
  const inner = document.getElementById('fsg-mega-inner');
  if (!mega || !inner) return false;
  const html = megaMenuHtml(key);
  if (!html) return false;
  inner.innerHTML = html;
  mega.hidden = false;
  document.querySelectorAll('[data-fsg-nav]').forEach((b) => b.classList.toggle('menu-open', b.dataset.fsgNav === key));
  bindMegaActions();
  return true;
}

function hideMegaMenu() {
  const mega = document.getElementById('fsg-mega');
  if (mega) mega.hidden = true;
  document.querySelectorAll('[data-fsg-nav]').forEach((b) => b.classList.remove('menu-open'));
}

function bindMegaActions() {
  document.querySelectorAll('[data-fsg-action]').forEach((button) => {
    button.onclick = () => {
      hideMegaMenu();
      runFsgAction(button.dataset.fsgAction);
    };
  });
}

function runFsgAction(action) {
  if (action === 'report') return state.config.reportOpen ? openReportNames() : document.querySelector('.notice-off')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (action === 'assignment-hub') return openAssignmentHub();
  if (action === 'mid' || action === 'talk' || action === 'duty' || action === 'roster' || action === 'cong' || action === 'branch' || action === 'groupnews' || action === 'visit') return openNoticeByKey(action);
  if (action === 'notices') return openNotices();
  if (action === 'jwscript') return openJwScript();
  if (action === 'allgroups') return devPicker();
  if (action === 'admin-role') return openAdminLogin({ scope: 'role' });
  if (action === 'admin-group') return openAdminLogin({ scope: 'group' });
  if (action === 'admin-current') return openAdminLogin({ scope: editorSession?.scope === 'group' ? 'group' : 'role', reuseSession: true });
  if (action.startsWith('admin-current:')) return openAdminLogin({
    scope: editorSession?.scope === 'group' ? 'group' : 'role',
    reuseSession: true,
    target: action.split(':')[1] || ''
  });
  if (action === 'admin-logout') return logoutEditorSession();
}

function bindSiteTop(reportOpen) {
  document.getElementById('go-admin-top')?.addEventListener('click', (event) => {
    if (editorSession?.scope === 'group') {
      logoutEditorSession();
      return;
    }
    if (!state.g) {
      event.preventDefault();
      return;
    }
    openAdminLogin({ scope: 'group' });
  });
  document.getElementById('fsg-mega-close')?.addEventListener('click', hideMegaMenu);
  document.querySelectorAll('[data-fsg-nav]').forEach((button) => {
    button.onclick = () => {
      const key = button.dataset.fsgNav;
      if (['assignments', 'notices', 'groups', 'tools', 'admin'].includes(key)) return showMegaMenu(key);
      if (key === 'home') return goHome();
      if (key === 'report') return reportOpen ? openReportNames() : document.querySelector('.notice-off')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (key === 'admin') return openAdminLogin({ scope: 'role' });
    };
  });
}

function editorSessionLabel() {
  if (!editorSession) return '';
  if (editorSession.scope === 'group') {
    const groupKey = (editorSession.claims.groupKeys || [])[0] || editorSession.key || state.g;
    return `${GROUP_NAMES[groupKey] || '집단'} 감독자`;
  }
  return ROLE_SHORT_LABELS[editorSession.key || editorSession.claims.role] || '회중 역할자';
}

async function logoutEditorSession() {
  await signOut(auth);
  editorSession = null;
  if (state.g) goHome();
  else devPicker();
}

async function refreshEditorSession(user) {
  try {
    if (!user) {
      editorSession = null;
    } else {
      const claims = (await user.getIdTokenResult()).claims || {};
      if (claims.kind === 'editor') {
        const scope = claims.role === 'group' ? 'group' : 'role';
        const key = scope === 'group' ? (claims.groupKeys || [])[0] : claims.role;
        editorSession = { scope, key, claims, uid: user.uid };
      } else {
        editorSession = null;
      }
    }
  } catch {
    editorSession = null;
  }
}

function canSeeReportSummary() {
  return editorSession?.scope === 'group' || editorSession?.claims?.canReadCongReports === true;
}

function reportSummaryPlaceholderHtml() {
  if (!canSeeReportSummary()) {
    return `
      <div class="restricted-head"><span>보고 현황</span><span class="role-badge">로그인 시 표시</span></div>
      <p class="muted">집단감독자·보조자는 회중 전체 집계와 자기 집단 보고 기록을 확인할 수 있습니다. 서기·조정자·봉사감독자는 회중 전체 보고 기록을 확인합니다.</p>`;
  }
  return `
    <button class="home-report-status-link" id="home-report-status-link" type="button">
      <span class="home-report-loading">보고 현황을 불러오는 중입니다.</span>
    </button>`;
}

function reportSummaryContentHtml(summary) {
  const t = summary.totals || {};
  const groups = summary.groups || [];
  return `
    <button class="home-report-status-link" id="home-report-status-link" type="button">
      <div class="restricted-head"><span>보고 현황</span><span class="role-badge">${esc(summary.periodLabel || '이번 달')}</span></div>
      <div class="home-report-total">
        <b>${Number(t.rate || 0)}%</b>
        <span>제출 ${Number(t.submitted || 0)} · 미제출 ${Number(t.missing || 0)} · 대상 ${Number(t.members || 0)}</span>
      </div>
      <div class="home-report-groups">
        ${groups.map((g) => `
          <span class="home-report-group">
            <b>${esc(g.name)}</b>
            <em>${Number(g.submitted || 0)}/${Number(g.members || 0)} · ${Number(g.rate || 0)}%</em>
          </span>`).join('')}
      </div>
    </button>`;
}

function reportSummaryErrorHtml() {
  return `
    <div class="restricted-head"><span>보고 현황</span><span class="role-badge">확인 필요</span></div>
    <p class="muted">보고 현황을 불러오지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.</p>`;
}

function bindHomeReportStatus() {
  const link = document.getElementById('home-report-status-link');
  if (!link) return;
  link.onclick = () => openAdminLogin({ scope: editorSession?.scope === 'group' ? 'group' : 'role' });
}

function refreshHomeReportStatusBox() {
  const box = document.getElementById('home-report-status');
  if (!box) return;
  box.innerHTML = reportSummaryPlaceholderHtml();
  bindHomeReportStatus();
  hydrateHomeReportSummary();
}

async function hydrateHomeReportSummary() {
  if (!canSeeReportSummary() || !auth.currentUser || !WORKER_URL) return;
  const box = document.getElementById('home-report-status');
  if (!box) return;
  try {
    const idToken = await auth.currentUser.getIdToken();
    const res = await fetch(`${WORKER_URL}/reports/summary`, {
      headers: { authorization: `Bearer ${idToken}` }
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'REPORT_SUMMARY_FAILED');
    box.innerHTML = reportSummaryContentHtml(data);
    bindHomeReportStatus();
  } catch (e) {
    console.warn('Report summary failed:', e);
    box.innerHTML = reportSummaryErrorHtml();
  }
}

function groupEntries() {
  return Object.entries(GROUP_NAMES).map(([key, name], index) => ({ key, name, index }));
}
function currentGroupPosition() {
  const entries = groupEntries();
  const index = entries.findIndex((g) => g.key === state.g);
  return index >= 0 ? index + 1 : '';
}
function siteFooterHtml() {
  const footerGroupName = (name) => {
    const base = String(name || '').replace(/\s*야외\s*봉사\s*집단\s*$/u, '').replace(/\s*집단\s*$/u, '').trim();
    return `${base} 집단`;
  };
  const links = groupEntries().map((g) => `<a href="?g=${esc(g.key)}">${esc(footerGroupName(g.name))}</a>`).join('');
  return `
    <footer class="fsg-footer">
      <a href="${location.pathname}"><strong>${esc(congNameLabel())}</strong> 야외 봉사 집단</a>
      <span class="fsg-group-links">${links}</span>
    </footer>`;
}
function subHeader(title, options = {}) {
  return `${topbarHtml(title, options)}${header()}`;
}
function bindTopbar(onBack, options = {}) {
  const back = document.getElementById('topbar-back');
  if (back) back.onclick = onBack;
  const home = document.getElementById('topbar-home');
  if (home) home.onclick = options.onHome || goHome;
}
function bindBackButton(handler, id = 'back') {
  const back = document.getElementById(id);
  if (back) back.onclick = handler;
}

function enterScreen(screen, params = {}, options = {}) {
  const seq = options.navSeq || ++navSeq;
  if (!options.fromHistory) {
    const entry = buildHistoryEntry(screen, params);
    const url = buildScreenUrl(state.g, screen, params);
    if (options.replace) {
      history.replaceState(entry, '', url);
    } else {
      history.pushState(entry, '', url);
      appHistoryDepth += 1;
    }
  }
  return seq;
}

function isActiveNav(seq) {
  return seq === navSeq;
}

function goBack(fallback) {
  if (appHistoryDepth > 0) {
    history.back();
    return;
  }
  fallback();
}

async function goHome() {
  appHistoryDepth = 0;
  await refreshEditorSession(auth.currentUser);
  screenHome({ replace: true });
}

function previewMembers() {
  return [
    { id: 'preview-1', name: '김성원', active: true },
    { id: 'preview-2', name: '이봉사', active: true },
    { id: 'preview-3', name: '박자매', active: true },
    { id: 'preview-4', name: '최형제', active: true }
  ];
}

function previewNotices() {
  return [
    {
      id: 'cong-preview',
      title: '회중 광고',
      subtitle: '회중 전체에 필요한 안내 사항',
      body: '이번 주 회중 전체 안내 사항을 이곳에서 확인할 수 있습니다.',
      visible: true,
      order: 1
    },
    {
      id: 'roster-preview',
      title: '집단 편성표',
      subtitle: '집단 구성과 담당자 정보',
      body: '해당 집단의 집단 감독자와 보조자, 성원 구성을 확인하는 화면입니다.',
      visible: true,
      order: 2
    },
    {
      id: 'assign-preview',
      title: '나의 임명 확인',
      subtitle: '봉사·청소·집회 관련 임명',
      body: '평일 집회, 공개강연, 주차, 안내, 연사 음료, 청소 임명 등을 확인할 수 있습니다.',
      visible: true,
      order: 3
    }
  ];
}

async function ensureMembers() {
  if (!state.members) {
    try {
      state.members = IS_LOCAL_PREVIEW
        ? await withTimeout(getMembers(state.g), 5000, 'LOCAL_PREVIEW_MEMBERS_TIMEOUT')
        : await getMembers(state.g);
    } catch (e) {
      if (!IS_LOCAL_PREVIEW) throw e;
      console.warn('Using preview members:', e);
      state.members = previewMembers();
    }
  }
  return state.members;
}

async function ensureNotices() {
  if (!state.notices) {
    try {
      state.notices = IS_LOCAL_PREVIEW
        ? await withTimeout(getNotices(), 5000, 'LOCAL_PREVIEW_NOTICES_TIMEOUT')
        : await getNotices();
    } catch (e) {
      if (!IS_LOCAL_PREVIEW) throw e;
      console.warn('Using preview notices:', e);
      state.notices = previewNotices();
    }
  }
  state.notices = state.notices.filter((n) => !isDeprecatedNoticeKey(n.id || n.key));
  refreshNewNotices();
  return state.notices;
}

async function renderFromHistory(rawEntry) {
  const entry = normalizeHistoryEntry(rawEntry);
  const seq = ++navSeq;
  const options = { fromHistory: true, navSeq: seq };
  if (!entry) {
    if (state.g) screenHome(options);
    return;
  }
  try {
    if (entry.screen === 'home') return screenHome(options);
    if (entry.screen === 'jwScript') return openJwScript(options);
    if (entry.screen === 'names') return openReportNames(options);
    if (entry.screen === 'reportDone') return renderReportDone(options);
    if (entry.screen === 'reportForm') {
      const members = await ensureMembers();
      if (!isActiveNav(seq)) return;
      const member = members.find((m) => m.id === entry.params.memberId || m.name === entry.params.memberId);
      return member ? openReportForm(member, options) : openReportNames(options);
    }
    if (entry.screen === 'notices') return openNotices(options);
    if (entry.screen === 'noticeDetail') {
      const notices = await ensureNotices();
      if (!isActiveNav(seq)) return;
      const notice = notices.find((n) => (n.id || n.key) === entry.params.key);
      return notice ? openNoticeDetail(notice, options) : openNotices(options);
    }
    if (entry.screen === 'congItem') {
      const key = entry.params.key || CONG_NOTICE_KEY;
      const items = await getCongNoticeItems(key);
      if (!isActiveNav(seq)) return;
      const item = items.find((x) => x.id === entry.params.itemId);
      return item ? openCongNoticeItem(item, { ...options, key }) : openCongNoticeBoard(null, { ...options, key });
    }
    if (entry.screen === 'adminLogin') return openAdminLogin(options);
    screenHome(options);
  } catch (e) {
    screenError(e);
  }
}

window.addEventListener('popstate', (event) => {
  appHistoryDepth = Math.max(0, appHistoryDepth - 1);
  renderFromHistory(event.state);
});
// ---------- 화면들 ----------
function screenHome(options = {}) {
  enterScreen('home', {}, { replace: true, ...options });
  if (!options.fromHistory) appHistoryDepth = 0;
  const open = state.config.reportOpen === true;
  const reportPanel = open
    ? `<div class="fsg-report-panel">
        <div><span class="badge">이번 달</span><h2>온라인 봉사 보고</h2><p>${esc(state.config.periodLabel)} 보고 · 마감 ${esc(state.config.deadlineLabel)}</p></div>
        <button class="primary" id="go-report" type="button">보고 제출</button>
      </div>`
    : `<div class="notice-off fsg-report-closed">봉사 보고는 매월 말일 전날부터 다음 달 10일까지 할 수 있어요.<br><span class="muted">${esc(state.config.periodLabel)} 보고 마감은 ${esc(state.config.deadlineLabel)}입니다.</span></div>`;
  const dateLabel = todayDateLabel();
  const dailyTextUrl = todayDailyTextUrl();
  wideShell(`
    <div class="fsg-site">
      ${siteTopHtml('home')}
      <section class="fsg-hero">
        <div class="fsg-hero-visual" style="background-image:linear-gradient(90deg, rgba(255,255,255,.16), rgba(255,255,255,0) 38%, rgba(0,0,0,.08)), url('/field-service-hero-original.png')"></div>
        <div class="fsg-hero-copy">
          <div class="fsg-group-strip">
            <span>${esc(congNameLabel())}</span>
            <strong>${esc(state.name)}</strong>
            <em>전체 ${groupEntries().length}개 집단 중 ${esc(currentGroupPosition() || '-')}번</em>
          </div>
          <h1>오늘의 봉사와 임명을 한눈에 확인하세요</h1>
          <p>성원은 온라인 봉사 보고를 제출하고, 자신에게 배정된 봉사·청소·집회 관련 임명을 확인할 수 있습니다.</p>
          ${open ? '<button class="fsg-hero-button" id="go-report-hero" type="button">온라인 보고하기</button>' : ''}
        </div>
      </section>
      <div class="fsg-quick">
        <button type="button" data-home-feature="report"><b>온라인 봉사 보고</b><span>${open ? '이번 달 봉사 보고 제출' : '보고 기간 안내'}</span></button>
        <button type="button" data-home-feature="assignment-hub"><b>나의 임명</b><span>봉사·청소·집회 관련 임명 확인</span></button>
        <button type="button" data-home-feature="notices"><b>회중 광고</b><span>최근 안내와 첨부 자료</span></button>
        <button type="button" data-home-feature="roster"><b>집단 편성표</b><span>집단 구성과 담당자 확인</span></button>
      </div>
      <main class="fsg-content">
        <section>
          ${newNoticeBannerHtml()}
          ${reportPanel}
          <h2 class="section-title">최근 안내</h2>
          <button class="fsg-list-card" id="go-notices" type="button"><span><b>광고·안내 보기</b><em>회중 광고, 지부 광고 서신, 집단 소식 확인</em></span><strong>열기</strong></button>
          <article class="daily-bible-card">
            <span class="daily-bible-date">${esc(dateLabel)}</span>
            <button class="daily-text-card" id="go-daily-text" type="button">
              <span class="daily-bible-kicker">날마다 성경을 검토함</span>
              <span class="daily-text-title">오늘의 성구와 해설 보기</span>
            </button>
          </article>
        </section>
        <aside class="fsg-side">
          <section class="sidebox">
            <h2>나의 임명</h2>
            <div class="week-summary"><b>이번 주 임명 확인</b><span>역할자가 입력한 임명표에서 이번 주 해당 내용을 확인합니다.</span></div>
            <button class="fsg-duty-link" type="button" data-home-feature="assignment-meetings"><b>평일 집회·공개강연 임명</b><span>사회, 낭독, 기도, 프로그램 임명 확인</span></button>
            <button class="fsg-duty-link" type="button" data-home-feature="assignment-monthly"><b>월 단위 개인 임명</b><span>주차, 안내, 연사 음료 확인</span></button>
            <button class="fsg-duty-link" type="button" data-home-feature="assignment-group"><b>우리 집단 임명</b><span>집단별 청소 임명 확인</span></button>
          </section>
          <section class="sidebox">
            <h2>봉사 보고 안내</h2>
            <div class="notice-card"><b>${open ? '봉사 보고 기간입니다' : '보고 기간 안내'}</b><span>${open ? '아직 보고하지 않았다면 이번 달 보고를 제출해 주세요.' : `${esc(state.config.periodLabel)} 보고 마감은 ${esc(state.config.deadlineLabel)}입니다.`}</span></div>
          </section>
          <section class="sidebox restricted" id="home-report-status">
            ${reportSummaryPlaceholderHtml()}
          </section>
        </aside>
      </main>
      ${siteFooterHtml()}
    </div>
  `);
  bindSiteTop(open);
  document.querySelectorAll('#go-report, #go-report-hero').forEach((rb) => { rb.onclick = () => openReportNames(); });
  document.getElementById('go-daily-text').onclick = () => window.open(dailyTextUrl, '_blank', 'noopener,noreferrer');
  document.getElementById('go-notices').onclick = () => openNotices();
  const jsb = document.getElementById('go-jw-script');
  if (jsb) jsb.onclick = () => openJwScript();
  const nb = document.getElementById('new-notice');
  if (nb) nb.onclick = () => state.newNotices.length === 1 ? openNoticeDetail(state.newNotices[0]) : openNotices();
  bindHomeFeatureGrid(open);
  hydrateHomeFeatureGrid(open);
  bindHomeReportStatus();
  hydrateHomeReportSummary();
}

function homeFeatureGridHtml(reportOpen) {
  const notices = state.notices || [];
  const hasGroupNews = notices.some((n) => (n.id || n.key) === 'groupnews');
  const scriptCard = isJwScriptDisabled() ? '' : `
        <button class="home-feature-card" type="button" data-home-feature="jwscript">
          <span class="home-feature-title">동영상 자막 추출</span>
          <span class="home-feature-sub">jw.org 동영상 자막을 개인 연구용으로 정리</span>
        </button>`;
  const groupNewsCard = hasGroupNews ? `
        <button class="home-feature-card" type="button" data-home-feature="groupnews">
          <span class="home-feature-title">집단 소식</span>
          <span class="home-feature-sub">우리 집단 안내를 확인</span>
        </button>` : '';
  if (!groupNewsCard && !scriptCard) return '';
  return `
    <section class="home-feature-wrap" id="home-feature-wrap">
      <h2 class="home-feature-heading">보조 도구</h2>
      <div class="home-feature-grid">
        ${groupNewsCard}
        ${scriptCard}
      </div>
    </section>`;
}

function bindHomeFeatureGrid(reportOpen) {
  document.querySelectorAll('[data-home-feature]').forEach((button) => {
    button.onclick = () => {
      const feature = button.dataset.homeFeature;
      if (feature === 'notices') return openNoticeByKey('cong');
      if (feature === 'assignment-hub') return openAssignmentHub();
      if (feature === 'assignment-meetings') return openMeetingAssignmentHub();
      if (feature === 'assignment-monthly' || feature === 'assignment-group') return openNoticeByKey('duty');
      if (feature === 'roster' || feature === 'groups') return openNoticeByKey('roster');
      if (feature === 'report') {
        if (reportOpen) return openReportNames();
        document.querySelector('.notice-off')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (feature === 'groupnews') return openGroupNewsFromHome();
      if (feature === 'jwscript') return openJwScript();
    };
  });
}

async function hydrateHomeFeatureGrid(reportOpen) {
  if (state.notices) return;
  try {
    await ensureNotices();
    const target = document.getElementById('home-feature-wrap');
    if (!target) return;
    target.outerHTML = homeFeatureGridHtml(reportOpen);
    bindHomeFeatureGrid(reportOpen);
  } catch {
    // 홈 기능 모음은 보조 영역이므로 안내 로드 실패가 홈 진입을 막지 않게 둔다.
  }
}

async function openGroupNewsFromHome() {
  await ensureNotices();
  const notice = (state.notices || []).find((n) => (n.id || n.key) === 'groupnews');
  return notice ? openNoticeDetail(notice) : openNotices();
}

async function openNoticeByKey(key) {
  await ensureNotices();
  const notice = (state.notices || []).find((n) => (n.id || n.key) === key);
  return notice ? openNoticeDetail(notice) : openNotices();
}

function assignmentHubCard(key, title, sub) {
  return `<button class="assignment-hub-card" type="button" data-assignment-key="${esc(key)}">
    <b>${esc(title)}</b>
    <span>${esc(sub)}</span>
  </button>`;
}

async function openAssignmentHub(options = {}) {
  const seq = enterScreen('assignmentHub', {}, options);
  shell(`${subHeader('나의 임명', { showHome: true })}<h1>나의 임명</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(goHome));
  try {
    await ensureNotices();
    if (!isActiveNav(seq)) return;
    shell(`
      ${subHeader('나의 임명', { showHome: true })}
      <h1>나의 임명</h1>
      <p class="lead muted">자신의 이름이 배정된 임명표를 선택해서 확인하세요.</p>
      <div class="assignment-hub-grid">
        ${assignmentHubCard('mid', '평일 집회 임명표', '프로그램, 사회, 기도, 낭독 관련 임명 확인')}
        ${assignmentHubCard('talk', '주말 성서공개강연', '사회, 낭독, 마치는 기도 임명 확인')}
        ${assignmentHubCard('duty', '월 단위 개인 임명', '주차, 안내, 연사 음료, 봉사·청소 임명 확인')}
        ${assignmentHubCard('roster', '집단 편성표', '집단 구성과 담당자 확인')}
      </div>
      ${backButtonHtml('home')}
    `);
    bindTopbar(() => goBack(goHome));
    bindBackButton(() => goBack(goHome));
    document.querySelectorAll('[data-assignment-key]').forEach((b) => {
      b.onclick = () => openNoticeByKey(b.dataset.assignmentKey);
    });
  } catch (e) {
    screenError(e);
  }
}

async function openMeetingAssignmentHub(options = {}) {
  const seq = enterScreen('meetingAssignmentHub', {}, options);
  shell(`${subHeader('집회 임명', { showHome: true })}<h1>집회 임명</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(goHome));
  try {
    await ensureNotices();
    if (!isActiveNav(seq)) return;
    shell(`
      ${subHeader('집회 임명', { showHome: true })}
      <h1>평일 집회·공개강연 임명</h1>
      <p class="lead muted">평일 집회 프로그램 임명과 주말 공개강연 임명을 따로 확인할 수 있습니다.</p>
      <div class="assignment-hub-grid">
        ${assignmentHubCard('mid', '평일 집회 임명표', '그리스도인 생활과 봉사 집회 프로그램 임명')}
        ${assignmentHubCard('talk', '주말 성서공개강연', '사회, 낭독, 기도 임명')}
      </div>
      ${backButtonHtml('assignments')}
    `);
    bindTopbar(() => goBack(() => openAssignmentHub({ replace: true })));
    bindBackButton(() => goBack(() => openAssignmentHub({ replace: true })));
    document.querySelectorAll('[data-assignment-key]').forEach((b) => {
      b.onclick = () => openNoticeByKey(b.dataset.assignmentKey);
    });
  } catch (e) {
    screenError(e);
  }
}

function openJwScript(options = {}) {
  enterScreen('jwScript', {}, options);
  if (isJwScriptDisabled()) return renderJwScriptDisabled();
  if (!isJwScriptAgreed()) return renderJwScriptConsent();
  renderJwScriptTool();
}

function renderJwScriptConsent() {
  shell(`
    ${subHeader('동영상 자막 추출', { showHome: true })}
    <h1>사용 전 안내</h1>
    <section class="jw-consent">
      <p>이 기능은 jw.org에서 제공하는 동영상 자막과 대표 사진을, <b>여러분의 기기가 jw.org에서 직접 불러와</b> 읽기 좋게 다듬어 보여 줍니다. 우리 앱 서버에는 자막이 저장되지 않습니다.</p>
      <ul>
        <li>자막과 대표 사진의 <b>지적 재산권은 Watch Tower에 있습니다.</b> 원본은 jw.org에서 확인하실 수 있습니다.</li>
        <li><b>개인 성경 연구·복습 목적으로만</b> 사용해 주십시오. 내려받은 내용을 다시 배포하거나 게시하지 마십시오.</li>
        <li>이 기능은 회중이 만든 비공식 보조 도구이며, jw.org의 공식 기능이 아닙니다.</li>
        <li>JW.ORG는 Watch Tower Bible and Tract Society of Pennsylvania의 등록 상표입니다.</li>
      </ul>
      <div class="jw-actions">
        <button class="big primary" id="jw-agree" type="button">동의하고 사용</button>
        <button class="big" id="jw-disable" type="button">사용하지 않기</button>
      </div>
    </section>
    ${backButtonHtml('home')}
  `);
  bindTopbar(() => goBack(goHome));
  bindBackButton(() => goBack(goHome));
  document.getElementById('jw-agree').onclick = () => {
    agreeJwScript();
    renderJwScriptTool();
  };
  document.getElementById('jw-disable').onclick = () => {
    disableJwScript();
    goHome();
  };
}

function renderJwScriptDisabled() {
  shell(`
    ${subHeader('동영상 자막 추출', { showHome: true })}
    <h1>기능을 꺼 두었습니다</h1>
    <p class="lead muted">켜면 이 기기가 jw.org에 직접 접속해 동영상 자막을 불러올 수 있습니다.</p>
    <section class="jw-consent">
      <h2>동영상 자막 추출 사용</h2>
      <p>끄면 이 기능이 메뉴에서 사라지고, 기기가 jw.org에 직접 접속하지 않습니다.</p>
      <button class="big primary" id="jw-enable" type="button">다시 사용하기</button>
    </section>
    ${backButtonHtml('home')}
  `);
  bindTopbar(() => goBack(goHome));
  bindBackButton(() => goBack(goHome));
  document.getElementById('jw-enable').onclick = () => {
    enableJwScript();
    renderJwScriptConsent();
  };
}

function renderJwScriptTool() {
  const tool = state.jwScript;
  const hasOutput = !!tool.output;
  shell(`
    ${subHeader('동영상 자막 추출', { showHome: true })}
    <h1>동영상 자막 추출</h1>
    <p class="lead muted">jw.org 동영상 공유 링크를 붙여넣으면 자막을 개인 연구용 텍스트로 정리합니다.</p>
    <section class="jw-tool">
      <label class="field">
        <span>동영상 공유 링크</span>
        <textarea id="jw-input" class="jw-input" rows="3" placeholder="https://www.jw.org/finder?srcid=share&wtlocale=KO&lank=pub-...">${esc(tool.input)}</textarea>
      </label>
      <div class="jw-mode" role="group" aria-label="자막 다듬기 방식">
        <button class="choice ${tool.mode === 'plain' ? 'on' : ''}" data-mode="plain" type="button">줄글</button>
        <button class="choice ${tool.mode === 'raw' ? 'on' : ''}" data-mode="raw" type="button">원본</button>
      </div>
      <div class="jw-actions">
        <button class="big primary" id="jw-load" type="button">자막 불러오기</button>
        <button class="big" id="jw-turn-off" type="button">이 기능 끄기</button>
      </div>
      ${tool.status ? `<p class="ok">${esc(tool.status)}</p>` : ''}
      ${tool.error ? `<p class="err">${esc(tool.error)}</p>` : ''}
    </section>
    ${hasOutput ? jwScriptResultHtml(tool) : ''}
    <p class="jw-footnote">자막·대표 사진의 저작권은 Watch Tower에 있습니다. 원본: jw.org · 개인 성경 연구용</p>
    ${backButtonHtml('home')}
  `);
  bindTopbar(() => goBack(goHome));
  bindBackButton(() => goBack(goHome));
  document.querySelectorAll('[data-mode]').forEach((button) => {
    button.onclick = () => {
      tool.mode = button.dataset.mode || 'plain';
      tool.output = scriptOutputForMode(tool.vtt, tool.mode);
      renderJwScriptTool();
    };
  });
  document.getElementById('jw-load').onclick = loadJwScript;
  document.getElementById('jw-turn-off').onclick = () => {
    if (!confirm('동영상 자막 추출 기능을 끌까요?')) return;
    disableJwScript();
    goHome();
  };
  const copy = document.getElementById('jw-copy');
  if (copy) copy.onclick = copyJwScriptOutput;
  const download = document.getElementById('jw-download');
  if (download) download.onclick = downloadJwScriptOutput;
}

function jwScriptResultHtml(tool) {
  return `
    <section class="jw-result">
      <div class="jw-result-head">
        <div>
          <p class="daily-bible-kicker">불러온 자막</p>
          <h2>${esc(tool.title)}</h2>
        </div>
        ${tool.thumbnailUrl ? `<a class="jw-thumb" href="${esc(tool.thumbnailUrl)}" target="_blank" rel="noopener noreferrer"><img src="${esc(tool.thumbnailUrl)}" alt=""></a>` : ''}
      </div>
      <textarea class="jw-output" id="jw-output" rows="14" readonly>${esc(tool.output)}</textarea>
      <div class="jw-actions">
        <button class="big primary" id="jw-copy" type="button">복사</button>
        <button class="big" id="jw-download" type="button">.txt 내려받기</button>
      </div>
    </section>`;
}

async function loadJwScript() {
  const tool = state.jwScript;
  tool.input = document.getElementById('jw-input').value.trim();
  tool.status = 'jw.org에서 자막을 불러오는 중입니다…';
  tool.error = '';
  tool.output = '';
  renderJwScriptTool();
  try {
    const details = await fetchJwMediaDetails(tool.input);
    const vtt = await fetchSubtitleText(details.subtitleUrl);
    tool.title = details.title;
    tool.thumbnailUrl = details.thumbnailUrl;
    tool.vtt = vtt;
    tool.output = scriptOutputForMode(vtt, tool.mode);
    tool.status = '자막을 불러왔습니다.';
  } catch (e) {
    tool.status = '';
    tool.error = e.message || String(e);
  }
  renderJwScriptTool();
}

async function copyJwScriptOutput() {
  const output = state.jwScript.output || '';
  try {
    await navigator.clipboard.writeText(output);
    state.jwScript.status = '복사했습니다.';
    state.jwScript.error = '';
  } catch {
    const area = document.getElementById('jw-output');
    if (area) area.select();
    state.jwScript.status = '텍스트를 선택했습니다. 복사해 주세요.';
    state.jwScript.error = '';
  }
  renderJwScriptTool();
}

function downloadJwScriptOutput() {
  const tool = state.jwScript;
  const blob = new Blob([tool.output || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeScriptFileName(tool.title);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function newNoticeBannerHtml() {
  if (!state.newNotices.length) return '';
  return `<button class="new-notice-banner" id="new-notice">
    <span>${esc(buildNewNoticeMessage(state.newNotices))}</span>
  </button>`;
}

async function openAdminLogin(options = {}) {
  const currentParams = new URLSearchParams(location.search);
  const requestedScope = options.scope || currentParams.get('adminScope');
  const loginScope = requestedScope === 'group' ? 'group' : 'role';
  const seq = enterScreen('adminLogin', { scope: loginScope }, options);
  const title = loginScope === 'group' ? '감독자 로그인' : '편집자 로그인';
  shell(`${subHeader(title)}<h1>${esc(title)}</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => state.g ? goBack(goHome) : devPicker());
  try {
    const { startAdminApp } = await import('./admin.js');
    if (!isActiveNav(seq)) return;
    const params = new URLSearchParams(location.search);
    params.set('adminScope', loginScope);
    if (state.g) params.set('g', state.g);
    startAdminApp({
      root: app,
      search: `?${params.toString()}`,
      session: options.reuseSession ? editorSession : null,
      initialTool: options.target || '',
      onExit: state.g ? goHome : devPicker
    });
  } catch (e) {
    screenError(e);
  }
}

async function openReportNames(options = {}) {
  const seq = enterScreen('names', {}, options);
  shell(`${subHeader('보고할 이름')}<h1>보고할 이름을 눌러 주세요</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(goHome));
  try {
    await ensureMembers();
    if (!isActiveNav(seq)) return;
    const grid = state.members.map((m, i) =>
      `<button class="name" data-i="${i}">${esc(m.name)}</button>`).join('');
    shell(`
      ${subHeader('보고할 이름')}
      <h1>보고할 이름</h1>
      <p class="lead muted">본인의 이름을 눌러 보고를 시작하세요.</p>
      <div class="names">${grid || '<p class="lead muted">명단이 없습니다.</p>'}</div>
      ${backButtonHtml('home')}
    `);
    bindTopbar(() => goBack(goHome));
    bindBackButton(() => goBack(goHome));
    document.querySelectorAll('.name').forEach((b) => {
      b.onclick = () => confirmReportName(state.members[+b.dataset.i]);
    });
  } catch (e) {
    screenError(e);
  }
}

// 오클릭 방지 — 이름 선택 후 본인 확인 단계 (봉사 보고는 본인만 제출)
function confirmReportName(member) {
  if (!member) return openReportNames({ replace: true });
  shell(`
    ${subHeader('본인 확인', { showHome: true })}
    <h1>${esc(member.name)} 님이 맞나요?</h1>
    <p class="lead muted">본인의 이름이 맞는지 꼭 확인해 주세요. 봉사 보고는 <b>본인만</b> 제출할 수 있습니다.</p>
    <div class="name-confirm">
      <button class="big primary" id="confirm-yes">네, ${esc(member.name)} 님 맞습니다</button>
      <button class="big" id="confirm-no">아니요, 다시 선택</button>
    </div>
  `);
  bindTopbar(() => goBack(() => openReportNames({ replace: true })));
  document.getElementById('confirm-yes').onclick = () => openReportForm(member);
  document.getElementById('confirm-no').onclick = () => openReportNames({ replace: true });
}

function openReportForm(member, options = {}) {
  enterScreen('reportForm', { memberId: member?.id || member?.name || '' }, options);
  state.member = member;
  state.form = {
    participated: true, bibleStudies: 0, hours: 0, memo: '',
    pioneerType: member?.regularPioneer ? 'regular' : ''  // 정규 파이오니아면 기본 선택
  };
  renderReportForm();
}

function renderReportForm() {
  const f = state.form;
  const ptype = f.pioneerType || '';
  const ptypeBtn = (val, label) => `<button type="button" class="choice ptype ${ptype === val ? 'on' : ''}" data-ptype="${val}">${label}</button>`;
  const hoursSection = `
    <div class="field">
      <label>파이오니아 봉사 (해당하면 선택)</label>
      <div class="twochoice ptype-group">
        ${ptypeBtn('', '해당 없음')}
        ${ptypeBtn('regular', '정규 파이오니아')}
        ${ptypeBtn('auxiliary', '보조 파이오니아')}
        ${ptypeBtn('special', '특별 파이오니아')}
      </div>
      ${ptype ? `
        <div class="hours">
          <label>봉사 시간 <span class="muted">(직접 입력)</span></label>
          <input type="number" inputmode="numeric" min="0" max="400" step="1" id="hours" value="${f.hours || ''}" placeholder="예: 55" />
        </div>` : ''}
    </div>`;
  const detail = f.participated ? `
    <div class="field">
      <label>사회한 개별 성서 연구 건수</label>
      <div class="stepper">
        <button data-step="bs-">−</button>
        <span class="val">${f.bibleStudies}</span>
        <button data-step="bs+">＋</button>
      </div>
    </div>
    ${hoursSection}
    <div class="field">
      <label>비고 <span class="muted">(LDC·지역건축 등 다른 방식으로 인정받은 봉사)</span></label>
      <textarea id="memo" class="report-memo" rows="2" maxlength="300" placeholder="예: LDC 지역건축 봉사 참여">${esc(f.memo || '')}</textarea>
    </div>` : '';

  shell(`
    ${subHeader('봉사 보고', { showHome: true })}
    <h1>${esc(state.member.name)} 님</h1>
    <p class="lead muted">${esc(state.config.periodLabel)} 봉사 보고</p>
    <div class="field">
      <label>이번 달 봉사에 참여하셨나요?</label>
      <div class="twochoice">
        <button class="choice ${f.participated ? 'on' : ''}" data-p="1">네, 참여했습니다</button>
        <button class="choice ${!f.participated ? 'on' : ''}" data-p="0">참여 못했어요</button>
      </div>
    </div>
    ${detail}
    <button class="big primary" id="submit">제출하기</button>
    ${backButtonHtml('names')}
  `);

  bindTopbar(() => goBack(() => openReportNames({ replace: true })));
  bindBackButton(() => goBack(() => openReportNames({ replace: true })));
  document.querySelectorAll('.choice').forEach((b) => {
    b.onclick = () => { f.participated = b.dataset.p === '1'; renderReportForm(); };
  });
  document.querySelectorAll('[data-step]').forEach((b) => {
    b.onclick = () => {
      if (b.dataset.step === 'bs+') f.bibleStudies = Math.min(50, f.bibleStudies + 1);
      if (b.dataset.step === 'bs-') f.bibleStudies = Math.max(0, f.bibleStudies - 1);
      renderReportForm();
    };
  });
  document.querySelectorAll('[data-ptype]').forEach((b) => {
    b.onclick = () => { f.pioneerType = b.dataset.ptype; renderReportForm(); };
  });
  const hoursEl = document.getElementById('hours');
  if (hoursEl) hoursEl.oninput = () => { f.hours = hoursEl.value; };
  const memoEl = document.getElementById('memo');
  if (memoEl) memoEl.oninput = () => { f.memo = memoEl.value; };
  document.getElementById('submit').onclick = doSubmit;
}

async function doSubmit() {
  const btn = document.getElementById('submit');
  btn.disabled = true; btn.textContent = '제출 중…';
  try {
    await submitReport(state.g, state.config.reportPeriod, state.member, state.form);
    renderReportDone({ replace: true });
    return;
    shell(`
      ${subHeader('보고 완료', { showHome: true })}
      <div class="done">
        <div class="check-big">✓</div>
        <h1>제출 완료</h1>
        <p class="lead">${esc(state.member.name)} 님, 감사합니다.</p>
      </div>
      <div class="bigs">
        <button class="big primary" id="home">홈으로 돌아가기</button>
        <button class="big" id="again">다른 사람 보고하기</button>
      </div>
    `);
    bindTopbar(screenHome);
    document.getElementById('home').onclick = () => screenHome();
    document.getElementById('again').onclick = () => openReportNames();
  } catch (e) {
    btn.disabled = false; btn.textContent = '제출하기';
    alert('제출하지 못했습니다: ' + e.message);
  }
}

function renderReportDone(options = {}) {
  enterScreen('reportDone', {}, options);
  shell(`
    ${subHeader('보고 완료', { showHome: true })}
    <div class="done">
      <div class="check-big">✓</div>
      <h1>제출 완료</h1>
      <p class="lead">${esc(state.member?.name || '')} 님, 감사합니다.</p>
    </div>
    <div class="bigs">
      <button class="big primary" id="home">홈으로 돌아가기</button>
      <button class="big" id="again">다른 사람 보고하기</button>
    </div>
  `);
  bindTopbar(() => goBack(() => openReportNames({ replace: true })));
  document.getElementById('home').onclick = goHome;
  document.getElementById('again').onclick = () => openReportNames();
}

async function openNotices(options = {}) {
  const seq = enterScreen('notices', {}, options);
  shell(`${subHeader('광고·안내')}<h1>광고·안내</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(goHome));
  try {
    await ensureNotices();
    if (!isActiveNav(seq)) return;
    const isNew = (n) => state.newNotices.some((x) => x.id === n.id);
    const card = (n) => `<button class="cat ${isNew(n) ? 'is-new' : ''}" data-id="${esc(n.id)}"${n.urgent ? ' style="border-left:6px solid #d64545"' : ''}>
        ${n.urgent ? '<span class="badge">긴급</span>' : ''}
        ${isNew(n) ? '<span class="new-badge">NEW</span>' : ''}
        <span class="cat-t"${n.urgent ? ' style="color:#b3261e"' : ''}>${esc(n.title)}</span>
        <span class="cat-s">${esc(previewOf(n))}</span>
      </button>`;
    shell(`
      ${subHeader('광고·안내')}
      <h1>광고·안내</h1>
      ${state.notices.length ? `<h2 class="sec">안내</h2>${state.notices.map(card).join('')}` : ''}
      ${!state.notices.length ? '<p class="lead muted">표시할 안내가 없습니다.</p>' : ''}
      ${backButtonHtml('home')}
    `);
    bindTopbar(() => goBack(goHome));
    bindBackButton(() => goBack(goHome));
    document.querySelectorAll('.cat').forEach((b) => {
      b.onclick = () => openNoticeDetail(state.notices.find((n) => n.id === b.dataset.id));
    });
  } catch (e) {
    screenError(e);
  }
}

function previewOf(n) {
  if (n.attachmentUrl) return '📄 첨부 문서';
  return getNoticePreview(n).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function openNoticeDetail(n, options = {}) {
  if (!n) return openNotices();
  const nkey = n.id || n.key;
  const seq = enterScreen('noticeDetail', { key: nkey }, options);
  markSeenAndRefresh(n);
  if (isBoardNoticeKey(nkey)) return openCongNoticeBoard(n, { ...options, navSeq: seq });
  if (isMidMeetingNotice(n)) return openMidMeetingDetail(n);
  if (nkey === 'talk') return openTalkNotice(n);
  if (nkey === 'visit') return openVisitNotice(n);
  if (nkey === 'groupnews') return openGroupNewsNotice(n);

  const { getNoticeDisplayHtml } = await import('./notice-display.js');
  if (!isActiveNav(seq)) return;
  const bodyHtml = getNoticeDisplayHtml(n);
  const hasBody = bodyHtml.trim();
  // 광고 PDF → 이미지 페이지가 있으면 이미지로 표시(카톡 포함 어디서나 확실)
  let pages = [];
  try { pages = await getNoticePages(n.id || n.key); } catch { pages = []; }
  const isRosterNotice = nkey === 'roster';
  const showRosterPages = !(isRosterNotice && hasBody);
  const pagesHtml = pages.length && showRosterPages
    ? `<div class="notice-pages ${isRosterNotice ? 'notice-pages-roster' : ''}">${pages.map((p) =>
        `<img src="${esc(p.dataUrl)}" alt="${isRosterNotice ? '집단 편성표' : '문서 페이지'}" />`).join('')}</div>`
    : '';

  shell(`
    ${subHeader(n.title || '광고·안내', { showHome: true })}
    ${n.urgent ? '<span class="badge">긴급</span>' : ''}
    <h1>${esc(n.title)}</h1>
    ${n.subtitle ? `<p class="lead muted">${esc(n.subtitle)}</p>` : ''}
    ${hasBody ? `<div class="body rich-body">${bodyHtml}</div>` : ''}
    ${pagesHtml}
    ${!hasBody && !pages.length ? '<div class="body"><span class="muted">내용이 없습니다.</span></div>' : ''}
    ${backButtonHtml('list')}
  `);
  bindTopbar(() => goBack(() => openNotices({ replace: true })));
  bindBackButton(() => goBack(() => openNotices({ replace: true })));
}

async function openCongNoticeBoard(parentNotice = null, options = {}) {
  const key = options.key || parentNotice?.id || parentNotice?.key || CONG_NOTICE_KEY;
  const seq = options.navSeq || enterScreen('noticeDetail', { key }, options);
  const fromState = (state.notices || []).find((n) => (n.id || n.key) === key);
  const title = parentNotice?.title || fromState?.title || '회중 광고';
  shell(`${subHeader(title, { showHome: true })}<h1>${esc(title)}</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(() => openNotices({ replace: true })));
  try {
    const items = await getCongNoticeItems(key);
    if (!isActiveNav(seq)) return;
    let legacyHtml = '';
    if (!items.length && parentNotice) {
      const { getNoticeDisplayHtml } = await import('./notice-display.js');
      const bodyHtml = getNoticeDisplayHtml(parentNotice);
      let pages = [];
      try { pages = await getNoticePages(key); } catch { pages = []; }
      const pagesHtml = pages.length
        ? `<div class="notice-pages">${pages.map((p) =>
            `<img src="${esc(p.dataUrl)}" alt="기존 이미지" />`).join('')}</div>`
        : '';
      if (bodyHtml.trim() || pages.length) {
        legacyHtml = `
          <div class="body rich-body">
            <p class="muted">기존 방식으로 등록된 글입니다. 새 글부터는 목록형으로 누적됩니다.</p>
            ${bodyHtml}
          </div>
          ${pagesHtml}`;
      }
    }
    const seenItems = readSeenCongItems();
    const newIds = new Set(getNewCongItems(items, seenItems).map((item) => item.id));
    const grouped = groupCongItemsForDisplay(items);
    const card = (item) => {
      const dateLabel = formatCongItemDate(item.updatedAt || item.createdAt);
      return `
        <button class="cat cong-item-card ${item.pinned ? 'is-pinned' : ''}" data-id="${esc(item.id)}"${item.urgent ? ' style="border-left:6px solid #d64545"' : ''}>
          ${item.pinned ? '<span class="pin-badge">고정</span>' : ''}
          ${item.urgent ? '<span class="badge">긴급</span>' : ''}
          ${newIds.has(item.id) ? '<span class="new-badge">NEW</span>' : ''}
          <span class="cat-t"${item.urgent ? ' style="color:#b3261e"' : ''}>${esc(item.title || '회중 광고')}</span>
          ${item.subtitle ? `<span class="cat-s">${esc(item.subtitle)}</span>` : ''}
          <span class="cat-s">${esc(congItemPreview(item))}</span>
          ${dateLabel ? `<span class="cat-s">수정일 ${esc(dateLabel)}</span>` : ''}
        </button>`;
    };
    const pinnedHtml = grouped.pinned.length
      ? `<h2 class="sec">고정 안내</h2>${grouped.pinned.map(card).join('')}`
      : '';
    const regularHtml = grouped.regular.length
      ? `<h2 class="sec">최근 안내</h2>${grouped.regular.map(card).join('')}`
      : '';
    shell(`
      ${subHeader(title, { showHome: true })}
      <h1>${esc(title)}</h1>
      ${items.length ? `${pinnedHtml}${regularHtml}` : (legacyHtml || '<p class="lead muted">표시할 내용이 없습니다.</p>')}
      ${backButtonHtml('list')}
    `);
    bindTopbar(() => goBack(() => openNotices({ replace: true })));
    bindBackButton(() => goBack(() => openNotices({ replace: true })));
    document.querySelectorAll('.cong-item-card').forEach((b) => {
      b.onclick = () => openCongNoticeItem(items.find((item) => item.id === b.dataset.id), { key });
    });
  } catch (e) {
    screenError(e);
  }
}

async function openCongNoticeItem(item, options = {}) {
  const key = options.key || CONG_NOTICE_KEY;
  if (!item) return openCongNoticeBoard(null, { key });
  const seq = enterScreen('congItem', { itemId: item.id, key }, options);
  writeSeenCongItems(markCongItemSeen(readSeenCongItems(), item));
  const { getNoticeDisplayHtml } = await import('./notice-display.js');
  if (!isActiveNav(seq)) return;
  const bodyHtml = getNoticeDisplayHtml(item);
  const hasBody = bodyHtml.trim();
  let pages = [];
  try { pages = await getCongNoticeItemPages(item.id, key); } catch { pages = []; }
  const pagesHtml = pages.length
    ? `<div class="notice-pages">${pages.map((p) =>
        `<img src="${esc(p.dataUrl)}" alt="첨부 이미지" />`).join('')}</div>`
    : '';

  shell(`
    ${subHeader(item.title || '회중 광고', { showHome: true })}
    ${item.urgent ? '<span class="badge">긴급</span>' : ''}
    <h1>${esc(item.title || '회중 광고')}</h1>
    ${item.subtitle ? `<p class="lead muted">${esc(item.subtitle)}</p>` : ''}
    ${hasBody ? `<div class="body rich-body">${bodyHtml}</div>` : ''}
    ${pagesHtml}
    ${!hasBody && !pages.length ? '<div class="body"><span class="muted">내용이 없습니다.</span></div>' : ''}
    ${backButtonHtml('list')}
  `);
  bindTopbar(() => goBack(() => openCongNoticeBoard(null, { key, replace: true })));
  bindBackButton(() => goBack(() => openCongNoticeBoard(null, { key, replace: true })));
}

function refreshNewNotices() {
  state.newNotices = getNewNotices(state.notices || [], readSeenNotices());
}

function markSeenAndRefresh(notice) {
  const seen = markNoticeSeen(readSeenNotices(), notice);
  writeSeenNotices(seen);
  refreshNewNotices();
}

const CONG_SEEN_STORAGE_KEY = 'fsg_seen_cong_items';

function readSeenCongItems() {
  try {
    return JSON.parse(localStorage.getItem(CONG_SEEN_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeSeenCongItems(seen) {
  try {
    localStorage.setItem(CONG_SEEN_STORAGE_KEY, JSON.stringify(seen || {}));
  } catch {}
}

function talkDateMD(d) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? `${+m[2]}/${+m[3]}` : (d || '');
}

async function openTalkNotice(n) {
  shell(`${subHeader(n.title || '주말 공개강연', { showHome: true })}<h1>${esc(n.title || '주말 공개강연')}</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(() => openNotices({ replace: true })));
  let talks = [];
  try { talks = await getTalks(); } catch {}

  const rows = talks.map((t) => {
    const noMeeting = t.talkType === 'convention' || t.talkType === 'assembly'; // 회중 강연 없는 안내 행
    if (noMeeting) {
      const lbl = t.talkType === 'convention' ? '지역대회' : t.talkType === 'assembly' ? '순회대회' : '';
      const title = String(t.title || '');
      const body = (lbl && !title.startsWith(lbl))
        ? [lbl, title].filter(Boolean).join(' · ')
        : (title || lbl);
      return `<tr class="talk-special">
        <td>${esc(talkDateMD(t.date))}</td>
        <td colspan="6">${esc(body)}</td>
      </tr>`;
    }
    if (t.talkType === 'circuit') {   // 순회 방문 주간: 낭독·기도 임명 없음
      const cap = ['순회 방문 주간', String(t.title || '')].filter(Boolean).join(' · ');
      return `<tr class="talk-circuit">
        <td>${esc(talkDateMD(t.date))}</td>
        <td>${esc(t.speakerCong || '')}</td>
        <td>${esc(t.speakerName || '')}</td>
        <td class="tt-title">${esc(cap)}</td>
        <td>${esc(t.chairman || '')}</td>
        <td></td>
        <td></td>
      </tr>`;
    }
    return `<tr>
      <td>${esc(talkDateMD(t.date))}</td>
      <td>${esc(t.speakerCong || '')}</td>
      <td>${esc(t.speakerName || '')}</td>
      <td class="tt-title">${esc(numberedTitle(t.talkNo, t.title))}</td>
      <td>${esc(t.chairman || '')}</td>
      <td>${esc(t.watchtowerReader || '')}</td>
      <td>${esc(t.closingPrayer || '')}</td>
    </tr>`;
  }).join('');

  const sheet = `
    <div class="talk-sheet">
      <div class="talk-sheet-head">
        <h2 class="ts-title">성서 공개 강연 <span class="ts-cong">- 회중</span></h2>
        <span class="ts-note">마치는 기도: 연사 우선</span>
      </div>
      <div class="talk-table-wrap">
        <table class="talk-table">
          <thead><tr>
            <th>일자</th><th>회중명</th><th>연사</th><th>연 제</th><th>사회</th><th>낭독</th><th>기도</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="tt-empty">등록된 공개강연이 없습니다.</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;

  shell(`${subHeader(n.title || '주말 공개강연', { showHome: true })}
    <h1 class="no-print">${esc(n.title || '주말 공개강연')}</h1>
    ${talks.length ? '<div class="no-print" style="margin:4px 0 12px"><button class="primary" id="printTalks">🖨️ A4로 인쇄 / PDF 저장</button></div>' : ''}
    ${sheet}
    <div class="no-print">${backButtonHtml('list')}</div>`);
  bindTopbar(() => goBack(() => openNotices({ replace: true })));
  bindBackButton(() => goBack(() => openNotices({ replace: true })));
  const pbtn = document.getElementById('printTalks');
  if (pbtn) pbtn.onclick = () => window.print();
}

async function openVisitNotice(n) {
  shell(`${subHeader(n.title || '봉사 감독자 방문', { showHome: true })}<h1>${esc(n.title || '봉사 감독자 방문')}</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(() => openNotices({ replace: true })));
  let visits = [];
  try { visits = await getVisits(state.g); } catch {}
  const cards = visits.map((v) => `
    <div class="body" style="margin-bottom:12px;">
      <b>${esc(v.date || '')}</b>
      ${v.withService ? `<br>함께 할 봉사: ${esc(v.withService)}` : ''}
      ${v.memo ? `<br><span class="muted">${esc(v.memo)}</span>` : ''}
    </div>`).join('');
  shell(`${subHeader(n.title || '봉사 감독자 방문', { showHome: true })}<h1>${esc(n.title || '봉사 감독자 방문')}</h1>
    ${cards || '<p class="lead muted">예정된 방문이 없습니다.</p>'}
    ${backButtonHtml('list')}`);
  bindTopbar(() => goBack(() => openNotices({ replace: true })));
  bindBackButton(() => goBack(() => openNotices({ replace: true })));
}

async function openGroupNewsNotice(n) {
  const title = n.title || '우리 집단 소식';
  shell(`${subHeader(title, { showHome: true })}<h1>${esc(title)}</h1><p class="lead muted">불러오는 중…</p>`);
  bindTopbar(() => goBack(() => openNotices({ replace: true })));

  let posts = [], board = null;
  try { posts = await getGroupPosts(state.g); } catch {}
  try { board = await getBoard(state.g); } catch {}
  const legacy = board && board.news && board.news.trim();
  const items = [];
  if (legacy) items.push({ id: '__news__', title: '집단 소식', body: board.news });
  items.push(...posts);

  const bindNav = () => {
    bindTopbar(() => goBack(() => openNotices({ replace: true })));
    bindBackButton(() => goBack(() => openNotices({ replace: true })));
  };
  const asBody = (b) => esc(String(b || '')).replace(/\r?\n/g, '<br>');

  const renderList = () => {
    shell(`${subHeader(title, { showHome: true })}<h1>${esc(title)}</h1>
      ${items.length
        ? `<p class="lead muted">보고 싶은 게시물을 선택하세요.</p>
           <div class="post-list">${items.map((p, i) =>
             `<button class="post-item" data-i="${i}"><b>${esc(p.title || '(제목 없음)')}</b></button>`).join('')}</div>`
        : '<p class="lead muted">등록된 소식이 없습니다.</p>'}
      ${backButtonHtml('list')}`);
    bindNav();
    document.querySelectorAll('.post-item').forEach((b) =>
      b.onclick = () => renderDetail(items[Number(b.dataset.i)], true));
  };
  const renderDetail = (p, fromList) => {
    shell(`${subHeader(title, { showHome: true })}
      ${fromList ? '<button class="link" id="tolist">← 목록으로</button>' : ''}
      <h1 class="post-title">${esc(p.title || title)}</h1>
      <div class="body post-body">${asBody(p.body)}</div>
      ${backButtonHtml('list')}`);
    bindNav();
    const tolist = document.getElementById('tolist');
    if (tolist) tolist.onclick = renderList;
  };

  if (items.length <= 1) renderDetail(items[0] || { title, body: '' }, false);
  else renderList();
}

function isMidMeetingNotice(n) {
  return n.id === 'mid' || n.key === 'mid' || /평일 집회|생활과 봉사/.test(n.title || '');
}

function parseMidMeeting(body) {
  const blocks = String(body || '')
    .split(/\n{2,}(?=■\s*)/)
    .map((x) => x.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const lines = block.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    const first = lines.shift() || '';
    const title = first.replace(/^■\s*/, '');
    const [datePart, readingPart] = title.split('|').map((x) => (x || '').trim());
    const week = {
      date: normalizeWeekLabel(datePart || title),
      reading: readingPart || '',
      openingSong: '',
      openingItems: [],
      closingSong: '',
      meta: [],
      closingPrayer: '',
      sections: []
    };
    let current = { title: '시작', items: [] };

    const pushCurrent = () => {
      if (!current.items.length) return;
      if (current.title === '시작') {
        week.openingItems.push(...current.items);
      } else {
        week.sections.push(current);
      }
    };

    for (const line of lines) {
      const sectionMatch = /^\[(.+)\]$/.exec(line);
      if (sectionMatch) {
        pushCurrent();
        current = { title: sectionMatch[1], items: [] };
        continue;
      }

      if (/^(사회자|노래|시작하는 기도|마치는 기도)\s*:/.test(line)) {
        const [label, ...rest] = line.split(':');
        const key = label.trim();
        const value = rest.join(':').trim();
        if (key === '마치는 기도') {
          const lastItem = current.items[current.items.length - 1];
          if (lastItem?.kind === 'song') {
            week.closingSong = lastItem.label;
            current.items.pop();
          }
          week.closingPrayer = value;
        } else if (key === '시작하는 기도') {
          week.meta.push({ label: '시작하는 기도', value });
        } else {
          week.meta.push({ label: key, value });
        }
        continue;
      }

      const itemLine = line.replace(/^-\s*/, '');
      if (/^노래\s*\d+\s*번/.test(itemLine)) {
        if (current.title === '시작') {
          week.openingSong = itemLine;
        } else {
          current.items.push({ label: itemLine, value: '', kind: 'song' });
        }
        continue;
      }
      const [label, ...rest] = itemLine.split(':');
      current.items.push({
        label: label.trim(),
        value: rest.join(':').trim()
      });
    }
    pushCurrent();
    return week;
  });
}

function normalizeWeekLabel(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  return /주$/.test(text) ? text : `${text} 주`;
}

function groupMemberNames() {
  return new Set((state.members || [])
    .map((m) => String(m.name || '').replace(/\s+/g, ''))
    .filter(Boolean));
}

// 동명이인 보정: 이 (섹션,파트)의 배정이 다른 집단 소속이면 강조 대상에서 제외.
// 배포본에서는 동명이인 자동 판정 규칙을 비워 둡니다. 필요하면 mwb-parse.js에서 회중 상황에 맞게 설정하세요.
function partNames(baseNames, sectionTitle, partLabel) {
  if (!DUP_NAMES.some((d) => baseNames.has(d))) return baseNames;
  const set = new Set(baseNames);
  for (const dup of DUP_NAMES) {
    if (!set.has(dup)) continue;
    const g = resolveAssigneeGroup(dup, sectionTitle, partLabel);
    if (g && g !== state.g) set.delete(dup);
  }
  return set;
}

function highlightAssignedNames(text, names) {
  let source = String(text || '');
  if (!source) return '';
  const markers = [];
  const sorted = [...names].sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    source = source.replace(re, (match) => {
      const token = `@@HL${markers.length}@@`;
      markers.push(`<mark class="member-hit">${esc(match)}</mark>`);
      return token;
    });
  }
  let html = esc(source);
  markers.forEach((value, i) => {
    html = html.replace(`@@HL${i}@@`, value);
  });
  return html;
}

function readingHtml(reading) {
  const text = String(reading || '').trim();
  if (!text) return '';
  const [label, ...rest] = text.split(':');
  const range = rest.join(':').trim();
  if (!range) return `<span class="reading-body"><span class="reading-label">${esc(text)}</span></span>`;
  return `<span class="reading-body"><span class="reading-label">${esc(label.trim())} :</span> <span class="reading-range">${esc(range)}</span></span>`;
}

// 월 활성 여부: 현재월·직전월·미래월은 유지, 그 이전은 만료(익월 말일 지나면 숨김)
function monthActive(m) {
  const mn = Number(m);
  if (!mn) return true;
  let d = mn - (new Date().getMonth() + 1);
  while (d > 6) d -= 12;
  while (d < -6) d += 12;
  return d >= -1;
}

// 우측 임명(사회자·시작하는 기도는 미임명이라도 항상 슬롯 표시 + 그 외 meta)
function metaSideHtml(w, names) {
  const mm = {};
  (w.meta || []).forEach((m) => { mm[m.label] = m.value; });
  const row = (label, val) => `<div><span>${esc(label)}:</span><strong>${highlightAssignedNames(val || '', names)}</strong></div>`;
  const extra = (w.meta || [])
    .filter((m) => m.label !== '사회자' && m.label !== '시작하는 기도')
    .map((m) => row(m.label, m.value)).join('');
  return row('사회자', mm['사회자']) + row('시작하는 기도', mm['시작하는 기도']) + extra;
}

function meetingItemHtml(it, names, extraClass = '') {
  const classes = ['meeting-item', extraClass, it.kind === 'song' ? 'song-line' : ''].filter(Boolean).join(' ');
  return `
    <div class="${classes}">
      <span>${highlightAssignedNames(it.label, names)}</span>
      ${it.value ? `<strong>${highlightAssignedNames(it.value, names)}</strong>` : ''}
    </div>`;
}

async function openMidMeetingDetail(n) {
  if (!state.members) {
    shell(`${subHeader(n.title, { showHome: true })}<h1>${esc(n.title)}</h1><p class="lead muted">임명표를 준비하는 중…</p>`);
    bindTopbar(() => goBack(() => openNotices({ replace: true })));
    state.members = await getMembers(state.g);
  }
  const monthOf = (w) => { const m = /(\d{1,2})월/.exec(w.date || ''); return m ? m[1] : ''; };
  const names = groupMemberNames();
  const weeks = parseMidMeeting(n.body).filter((w) => monthActive(monthOf(w))); // 익월 말일 지난 월 자동 숨김
  const months = [...new Set(weeks.map(monthOf).filter(Boolean))];
  const nowMonth = String(new Date().getMonth() + 1);
  let selected = months.includes(nowMonth) ? nowMonth : (months[months.length - 1] || '');

  const weekCard = (w) => `
    <article class="meeting-week paper-week">
      <div class="paper-week-top">
        <div class="paper-opening">
          <div class="paper-reading"><mark class="date-mark">${esc(w.date)}</mark>${w.reading ? ` ${readingHtml(w.reading)}` : ''}</div>
          ${w.openingSong ? `<div class="paper-song">${esc(w.openingSong)}</div>` : ''}
        </div>
        <div class="paper-meta-side">${metaSideHtml(w, names)}</div>
      </div>
      ${w.openingItems.map((it) => meetingItemHtml(it, names, 'opening-item')).join('')}
      ${w.sections.map((s) => `
        <section class="meeting-section ${sectionClass(s.title)}">
          <h3>${esc(s.title)}</h3>
          ${s.items.map((it) => meetingItemHtml(it, partNames(names, s.title, it.label))).join('')}
        </section>
      `).join('')}
      <div class="closing-prayer${w.closingSong ? '' : ' no-song'}">
        <span class="closing-song">${w.closingSong ? esc(w.closingSong) : ''}</span>
        <span class="closing-line"><em>마치는 기도:</em><strong>${highlightAssignedNames(w.closingPrayer || '', names)}</strong></span>
      </div>
    </article>`;

  const render = () => {
    const multi = months.length > 1;
    const shown = multi ? weeks.filter((w) => monthOf(w) === selected) : weeks;
    const tabs = multi
      ? `<div class="month-tabs">${months.map((m) =>
          `<button class="month-tab ${m === selected ? 'on' : ''}" data-m="${esc(m)}">${esc(m)}월</button>`).join('')}</div>`
      : '';
    shell(`
      ${subHeader(n.title, { showHome: true })}
      <h1>${esc(n.title)}</h1>
      ${n.subtitle ? `<p class="lead muted">${esc(n.subtitle)}</p>` : ''}
      ${tabs}
      <div class="meeting-list">
        <div class="paper-title"><strong>${esc(state.config.congName || '회중')}</strong><strong>${esc(midMeetingPaperTitle(shown))}</strong></div>
        ${shown.map(weekCard).join('') || '<p class="lead muted">표시할 임명표가 없습니다.</p>'}
      </div>
      ${backButtonHtml('list')}
    `);
    bindTopbar(() => goBack(() => openNotices({ replace: true })));
    bindBackButton(() => goBack(() => openNotices({ replace: true })));
    document.querySelectorAll('.month-tab').forEach((b) => b.onclick = () => { selected = b.dataset.m; render(); });
  };
  render();
}

function midMeetingPaperTitle(weeks) {
  const months = [...new Set(weeks
    .map((w) => { const m = /(\d{1,2})월/.exec(w.date || ''); return m ? Number(m[1]) : null; })
    .filter((x) => x != null))];
  if (!months.length) return '2026년 평일 집회 계획표';
  const label = months.length === 1 ? `${months[0]}월` : `${months[0]}~${months[months.length - 1]}월`;
  return `2026년 ${label} 평일 집회 계획표`;
}

function sectionClass(title) {
  if (/성경에 담긴 보물/.test(title)) return 'treasures';
  if (/야외 봉사/.test(title)) return 'ministry';
  if (/그리스도인 생활/.test(title)) return 'living';
  return '';
}

function screenError(e) {
  const message = String(e?.message || e || '');
  const isChunkLoadError = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(message);
  const title = isChunkLoadError ? '새 버전 적용 중' : '오류';
  const guide = isChunkLoadError
    ? '프로그램 파일이 새로 만들어진 뒤 브라우저가 이전 파일을 기억하고 있을 때 생기는 화면입니다. 새로고침하면 정상으로 돌아옵니다.'
    : message;
  shell(`${subHeader(title)}<h1>${esc(title)}</h1><p class="lead">${esc(guide)}</p>
    <button class="big primary" id="retry">${isChunkLoadError ? '새로고침' : '다시 시도'}</button>
    ${isChunkLoadError ? '<p class="lead muted">계속 보이면 Ctrl + F5로 강력 새로고침해 주세요.</p>' : ''}`);
  bindTopbar(goHome);
  document.getElementById('retry').onclick = () => {
    if (isChunkLoadError) {
      const url = new URL(location.href);
      url.searchParams.set('v', String(Date.now()));
      location.replace(url.toString());
    } else {
      boot();
    }
  };
}

function devPicker() {
  const links = groupEntries()
    .map((g) => `<a class="fsg-group-card" href="?g=${esc(g.key)}">
      <span><b>${esc(g.name)}</b><em>집단 화면으로 이동</em></span><strong>${g.index + 1}</strong>
    </a>`).join('');
  wideShell(`
    <div class="fsg-site">
      ${siteTopHtml('groups')}
      <section class="fsg-index-hero">
        <div class="eyebrow">${esc(congNameLabel())}</div>
        <h1>야외 봉사 집단 목록</h1>
        <p>집단명을 선택하면 해당 집단의 온라인 봉사 보고, 임명, 광고, 집단 편성표 화면으로 이동합니다.</p>
      </section>
      <main class="fsg-content fsg-index-content">
        <section>
          <h2 class="section-title">전체 ${groupEntries().length}개 집단</h2>
          <div class="fsg-groups-grid">${links}</div>
          <div class="notice-card"><b>전체 집단 링크방</b><span>각 성원에게 자기 집단 주소를 바로 공유하거나, 이 전체 목록 주소를 함께 공유할 수 있습니다.</span></div>
        </section>
      </main>
      ${siteFooterHtml()}
    </div>
  `);
  bindSiteTop(false);
}

async function loadGroupNames() {
  try {
    const groups = await getGroups();
    if (groups.length) GROUP_NAMES = Object.fromEntries(groups.map((g) => [g.key || g.id, g.name || g.key || g.id]));
    return;
  } catch {}
  if (!WORKER_URL) return;
  try {
    const res = await fetch(`${WORKER_URL}/groups`);
    const data = await res.json();
    if (!res.ok || !data.ok) return;
    if (data.congName) publicCongName = data.congName;
    if (Array.isArray(data.groups) && data.groups.length) {
      GROUP_NAMES = Object.fromEntries(data.groups.map((g) => [g.key || g.id, g.name || g.key || g.id]));
    }
  } catch {}
}

// ---------- 부트 ----------
async function boot() {
  const params = new URLSearchParams(location.search);
  const g = params.get('g');
  if (!g && params.get('admin') === '1') return openAdminLogin({ replace: true });
  if (!g) {
    await loadGroupNames();
    return devPicker();
  }

  state.g = g;
  state.name = GROUP_NAMES[g] || g;
  shell(`${header()}<h1>연결 중…</h1><p class="lead muted">잠시만 기다려 주세요.</p>`);
  loadGroupNames().then(() => {
    if (GROUP_NAMES[g]) state.name = GROUP_NAMES[g];
  }).catch(() => {});
  try {
    await withTimeout(memberSignIn(g), 5000, 'LOCAL_PREVIEW_AUTH_TIMEOUT');
    state.config = resolveReportConfig(await withTimeout(getConfig(), 5000, 'LOCAL_PREVIEW_CONFIG_TIMEOUT'));
    if (state.config.congName) publicCongName = state.config.congName;
    if (params.get('admin') === '1') openAdminLogin({ replace: true });
    else screenHome({ replace: true });
  } catch (e) {
    console.warn('Using local preview mode:', e);
    state.config = resolveReportConfig({});
    if (params.get('admin') === '1') openAdminLogin({ replace: true });
    else screenHome({ replace: true });
  }
}

onAuthStateChanged(auth, async (user) => {
  await refreshEditorSession(user);
  refreshHomeReportStatusBox();
});

boot();
