// 생활과 봉사 집회 교재 텍스트 → 프로그램 구조 파서
// 지원 형식 2가지:
//   (A) WOL 웹 복사: 날짜/성경읽기 별도 줄, 파트 다음 줄에 "(N분)", "노래 N 및 기도 | 소개말"
//   (B) 교재 텍스트(zip): "N월 N-N일 (성경범위)" 한 줄, 파트 "N. 제목 (N분)" 한 줄, 노래/소개말/맺음말 별도 줄, 월 전체
// 핵심 노이즈 필터: 진짜 파트 = (N분) 가 같은 줄 또는 (단독) 다음 줄에 있는 번호줄만.
//   → 교재 부록 예시(1~34, 시간 없음)·본문·질문은 자동 제외.

const SECTION_TITLES = ['성경에 담긴 보물', '야외 봉사에 힘쓰십시오', '그리스도인 생활'];
// 주간 헤더: "7월 6-12일" / "7월 27일-8월 2일" (+ 선택 "(성경범위)")
const WEEK_RE = /^(\d{1,2}월\s*\d{1,2}(?:\s*일)?\s*[-–~]\s*(?:\d{1,2}월\s*)?\d{1,2}\s*일)\s*(?:\(([^)]*)\))?\s*$/;

function songNo(line) { const m = /노래\s*(\d+)/.exec(line || ''); return m ? m[1] : ''; }
function minInline(line) { const m = /\(\s*(\d+)\s*분\s*\)/.exec(line || ''); return m ? `${m[1]}분` : ''; }
function minLead(line) { const m = /^\(\s*(\d+)\s*분\s*\)/.exec((line || '').trim()); return m ? `${m[1]}분` : ''; }
function stripMin(t) { return t.replace(/\s*\(\s*\d+\s*분\s*\)\s*$/, '').trim(); }
const isStructural = (s) =>
  WEEK_RE.test(s) || SECTION_TITLES.includes(s) || /^(노래\s*\d+|소개말|맺음말)/.test(s) || /^\d+\.\s/.test(s);

// 여러 주 파싱 → week 배열
export function parseMwbWeeks(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((x) => x.trim()).filter(Boolean);
  const weeks = [];
  let cur = null, section = null, expectClosing = false, closed = false;
  const startWeek = () => {
    cur = { date: '', reading: '', openingSong: '', intro: '', closingSong: '', sections: [] };
    section = null; expectClosing = false; closed = false;
    weeks.push(cur);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const wh = WEEK_RE.exec(line);
    if (wh) {
      startWeek();
      cur.date = wh[1].trim();
      cur.reading = (wh[2] || '').trim();
      if (!cur.reading) { // (A) WOL: 성경읽기가 다음 줄
        const nx = lines[i + 1];
        if (nx && !isStructural(nx)) { cur.reading = nx; i += 1; }
      }
      continue;
    }
    // 맺음말 → 이 주 종료 표시
    if (/^맺음말/.test(line)) {
      if (!cur) startWeek();
      const bar = line.split('|')[1];
      if (bar && /노래/.test(bar)) { cur.closingSong = songNo(bar); expectClosing = false; }
      else expectClosing = true;
      closed = true;
      continue;
    }
    // "노래 N 및 기도": 마침노래 / 시작노래 / 다음 주 시작
    if (/^노래\s*\d+\s*및\s*기도/.test(line)) {
      if (expectClosing && cur) { cur.closingSong = songNo(line); expectClosing = false; continue; }
      if (!cur || cur.sections.length || closed) startWeek(); // 다음 주 시작
      cur.openingSong = songNo(line);
      const bar = line.split('|')[1];
      if (bar && /소개말/.test(bar)) cur.intro = bar.trim();
      continue;
    }
    if (!cur) startWeek();
    if (/^소개말/.test(line)) { cur.intro = line; continue; }
    if (SECTION_TITLES.includes(line)) { section = { title: line, song: '', parts: [] }; cur.sections.push(section); continue; }
    if (/^노래\s*\d+\s*$/.test(line)) { if (section) section.song = songNo(line); continue; }

    // 파트: "N. 제목" + (N분)[같은 줄] 또는 다음 줄 단독 "(N분)"
    const pm = /^(\d+)\.\s*(.+)$/.exec(line);
    if (pm && section) {
      let title = pm[2].trim();
      let minutes = minInline(title);
      if (minutes) title = stripMin(title);
      else {
        const nx = lines[i + 1] || '';
        if (minLead(nx)) { minutes = minLead(nx); i += 1; }
      }
      if (!minutes) continue; // 시간 없는 번호줄 = 노이즈(교재 부록·질문) → 제외
      section.parts.push({ no: Number(pm[1]), title, minutes });
      continue;
    }
    // 그 외 = 노이즈
  }
  // 파트 없는 빈 주 제거
  return weeks.filter((w) => w.sections.some((s) => s.parts.length));
}

// 단일 주(첫 주) — 하위호환
export function parseMwb(text) { return parseMwbWeeks(text)[0] || null; }

// 구조 + 배정 이름 → notices/mid body 한 주 블록
export function buildMidBody(week, assignments = {}) {
  const a = assignments;
  const nameOf = (part) => part.name || a.parts?.[part.no] || '';
  const chairman = week.chairman || a.chairman;
  const openingPrayer = week.openingPrayer || a.openingPrayer;
  const closingPrayer = week.closingPrayer || a.closingPrayer;
  const L = [];
  const readingLabel = week.reading ? `주간 성경 읽기 : ${week.reading}` : '';
  L.push(`■ ${week.date}${readingLabel ? ` | ${readingLabel}` : ''}`);
  if (week.openingSong) L.push(`노래 ${week.openingSong}번`);
  if (chairman) L.push(`사회자: ${chairman}`);
  if (openingPrayer) L.push(`시작하는 기도: ${openingPrayer}`);
  if (week.intro) L.push(week.intro);
  for (const sec of week.sections) {
    L.push(`[${sec.title}]`);
    if (sec.song) L.push(`노래 ${sec.song}번`);
    for (const part of sec.parts) {
      const name = nameOf(part);
      const mins = part.minutes ? ` (${part.minutes})` : '';
      L.push(`${part.title}${mins}${name ? `: ${name}` : ''}`);
    }
  }
  if (week.closingSong) L.push(`노래 ${week.closingSong}번`);
  if (closingPrayer) L.push(`마치는 기도: ${closingPrayer}`);
  return L.join('\n');
}

// 여러 주 → notices/mid body (■ 블록들을 빈 줄로 구분)
export function buildMidBodyAll(weeks) {
  return weeks.map((w) => buildMidBody(w)).join('\n\n');
}

// 저장된 mid body(■ …) → 편집 가능한 week[] 로 되읽기(병합용). buildMidBody의 역함수.
export function parseMidBody(body) {
  const blocks = String(body || '').split(/\n{2,}(?=■)/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const w = { date: '', reading: '', openingSong: '', intro: '', closingSong: '',
      chairman: '', openingPrayer: '', closingPrayer: '', sections: [] };
    let section = null;
    for (const line of lines) {
      let m;
      if ((m = /^■\s*(.+?)(?:\s*\|\s*주간 성경 읽기\s*:\s*(.+))?$/.exec(line)) && !w.date) {
        w.date = m[1].trim(); w.reading = (m[2] || '').trim(); continue;
      }
      if ((m = /^사회자\s*:\s*(.+)$/.exec(line))) { w.chairman = m[1].trim(); continue; }
      if ((m = /^시작하는 기도\s*:\s*(.+)$/.exec(line))) { w.openingPrayer = m[1].trim(); continue; }
      if ((m = /^마치는 기도\s*:\s*(.+)$/.exec(line))) { w.closingPrayer = m[1].trim(); continue; }
      if (/^소개말/.test(line)) { w.intro = line; continue; }
      if ((m = /^\[(.+)\]$/.exec(line))) { section = { title: m[1], song: '', parts: [] }; w.sections.push(section); continue; }
      if ((m = /^노래\s*(\d+)\s*번/.exec(line))) {
        if (!w.sections.length) w.openingSong = m[1];
        else if (section && !section.parts.length) section.song = m[1];
        else w.closingSong = m[1];
        continue;
      }
      if (section) {
        const ci = line.lastIndexOf(':');
        let head = line, name = '';
        if (ci >= 0) { head = line.slice(0, ci).trim(); name = line.slice(ci + 1).trim(); }
        const mm = /\((\d+)\s*분\)/.exec(head);
        const minutes = mm ? `${mm[1]}분` : '';
        const title = head.replace(/\s*\(\d+\s*분\).*$/, '').trim() || head;
        section.parts.push({ no: section.parts.length + 1, title, minutes, name });
      }
    }
    return w;
  });
}

// 월(첫 숫자) 정렬 키
export function weekSortKey(date) {
  const m = /(\d+)월\s*(\d+)/.exec(date || '');
  return m ? Number(m[1]) * 100 + Number(m[2]) : 9999;
}

// 만료 월 제거: 현재월·직전월·미래월만 유지(익월 말일 지난 달 삭제). currentMonth=1~12.
export function pruneExpired(weeks, currentMonth) {
  const active = (m) => {
    const mn = Number(m);
    if (!mn || !currentMonth) return true;
    let d = mn - currentMonth;
    while (d > 6) d -= 12;
    while (d < -6) d += 12;
    return d >= -1;
  };
  return weeks.filter((w) => active((/(\d+)월/.exec(w.date) || [])[1]));
}

// 새 주(교재 구조) 유지 + 기존 주의 배정 이름을 빈 곳에 보존(재업로드 시 이름 안 날아감)
function carryNames(incoming, prev) {
  const w = incoming;
  w.chairman = w.chairman || prev.chairman || '';
  w.openingPrayer = w.openingPrayer || prev.openingPrayer || '';
  w.closingPrayer = w.closingPrayer || prev.closingPrayer || '';
  const prevFlat = (prev.sections || []).flatMap((s) => s.parts || []);
  incoming.sections.flatMap((s) => s.parts).forEach((p, i) => {
    if (!p.name && prevFlat[i] && prevFlat[i].name) p.name = prevFlat[i].name;
  });
  return w;
}

// ── 동명이인(같은 이름·다른 집단) 집단 판정 ──────────────────────────
// 임명표엔 이름만 표시하되, 어느 집단 사람인지는 (섹션·파트)로 규칙 판정.
// 예) 김영일: 형제(휴먼빌2) / 자매(휴먼빌1)
//   - '야외 봉사에 힘쓰십시오' 섹션: '연설'=형제, 그 외 파트=자매
//   - 그 밖 섹션(성경의 보물·그리스도인 생활 등)=형제
const DUP_NAME_GROUP_RULES = {
  '김영일': (sectionTitle, partTitle) => {
    if (/야외\s*봉사/.test(sectionTitle || '')) {
      return /연설/.test(partTitle || '') ? 'human2' : 'human1';
    }
    return 'human2';
  }
};
// 동명이인으로 등록된 이름 목록(공백 제거 기준)
export const DUP_NAMES = Object.keys(DUP_NAME_GROUP_RULES);
// 이 (섹션,파트) 임명이 속한 집단 key 반환. 규칙 없으면 null.
export function resolveAssigneeGroup(name, sectionTitle, partTitle) {
  const key = String(name || '').replace(/\s+/g, '');
  const rule = DUP_NAME_GROUP_RULES[key];
  return rule ? rule(sectionTitle, partTitle) : null;
}

// 기존 주 + 새 주 병합(같은 날짜=새 구조로 대체하되 배정 이름 보존) 후 월/일 정렬
export function mergeWeeks(existing, incoming) {
  const byDate = new Map(existing.map((w) => [w.date, w]));
  for (const w of incoming) {
    const prev = byDate.get(w.date);
    byDate.set(w.date, prev ? carryNames(w, prev) : w);
  }
  return [...byDate.values()].sort((a, b) => weekSortKey(a.date) - weekSortKey(b.date));
}
