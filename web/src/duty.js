// 이 달의 봉사·청소 임명(notices/duty) — 구조화 데이터 ↔ 표 HTML.
// 저장: bodyJson(=JSON 문자열)에 구조, bodyHtml(성원 표시용 표), plainText(검색/대체).

export const DUTY_HEADING = '2026년 회중업무 진행요원 임명';

// 기본 template (사진 기준). 감독자가 값을 채우고 필요시 행 추가.
export function defaultDutyData() {
  return {
    heading: DUTY_HEADING,
    sections: [
      { title: '청소 (구역 집단)', rowLabel: '월', cols: ['청중석', '회의실·화장실·로비'],
        rows: [
          ['7월', '주공3집단', '휴먼빌1집단'], ['8월', '휴먼빌2집단', '부영집단'],
          ['9월', '지행집단', '주공1집단'], ['10월', '대방집단', '주공3집단'],
          ['11월', '휴먼빌1집단', '휴먼빌2집단'], ['12월', '부영집단', '지행집단'],
          ['1월', '주공1집단', '대방집단']
        ] },
      { title: '내부 안내', rowLabel: '월', cols: ['실내', '로비'],
        rows: [
          ['5월', '오주영', '채혁'], ['6월', '구철우', '김성진'], ['7월', '정병수', '임지완'],
          ['8월', '신무환', '정현'], ['9월', '박건', '채혁'], ['10월', '오주영', '김성진'],
          ['11월', '구철우', '임지완']
        ] },
      { title: '주차 안내', rowLabel: '월', cols: ['1', '2'],
        rows: [
          ['5월', '신무환', '이종섭'], ['6월', '박건', '임지완'], ['7월', '채혁', '정현'],
          ['8월', '장용국', '김성진'], ['9월', '김영일', '구철우'], ['10월', '신무환', '오주영'],
          ['11월', '이종섭', '임지완']
        ] },
      { title: '연사 음료', rowLabel: '월', cols: ['담당'],
        rows: [
          ['5월', '최미란 자매'], ['6월', '유세윤 자매'], ['7월', '임지영 자매'],
          ['8월', '장한나 자매'], ['9월', '박민혜 자매'], ['10월', '민유진 자매'],
          ['11월', '안지원 자매']
        ] },
      { title: '호스트 · 엠프 · 연단', rowLabel: ' ', cols: ['호스트', '엠프', '연단'],
        rows: [['주', '장용국', '장용국', '채혁'], ['보조', '—', '구가빈', '김성진']] }
    ]
  };
}

// bodyJson(문자열/객체) → 구조 데이터. 없거나 형식이 다르면 기본값.
export function parseDutyData(raw) {
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (d && Array.isArray(d.sections) && d.sections.length) {
      return {
        heading: typeof d.heading === 'string' ? d.heading : DUTY_HEADING,
        sections: d.sections.map((s) => ({
          title: String(s.title || ''),
          rowLabel: String(s.rowLabel == null ? '월' : s.rowLabel),
          cols: Array.isArray(s.cols) ? s.cols.map((c) => String(c)) : [],
          rows: Array.isArray(s.rows) ? s.rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : [])) : []
        }))
      };
    }
  } catch { /* fallthrough */ }
  return null;
}

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// 구조 → 성원 표시용 HTML(표)
export function buildDutyHtml(data) {
  const parts = [];
  if (data.heading) parts.push(`<h2>${esc(data.heading)}</h2>`);
  for (const s of data.sections) {
    if (s.title) parts.push(`<h3>${esc(s.title)}</h3>`);
    const head = `<tr><th scope="col">${esc(s.rowLabel || ' ')}</th>${s.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr>`;
    const body = s.rows.map((r) =>
      `<tr><th scope="row">${esc(r[0] || '')}</th>${s.cols.map((_, ci) => `<td>${esc(r[ci + 1] || '')}</td>`).join('')}</tr>`).join('');
    parts.push(`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
  }
  return parts.join('\n');
}

// 구조 → 검색/대체용 평문
export function buildDutyPlain(data) {
  const lines = [];
  if (data.heading) lines.push(data.heading);
  for (const s of data.sections) {
    lines.push('', `【${s.title}】`, [s.rowLabel || ' ', ...s.cols].join(' / '));
    for (const r of s.rows) lines.push(r.join(' / '));
  }
  return lines.join('\n').trim();
}
