export const DUTY_HEADING = '회중 업무 진행요원 임명';

export function defaultDutyData() {
  return {
    heading: DUTY_HEADING,
    sections: [
      {
        title: '봉사·청소 담당',
        rowLabel: '월',
        cols: ['담당 1', '담당 2'],
        rows: [
          ['1월', '1집단', '2집단'],
          ['2월', '3집단', '4집단'],
          ['3월', '5집단', '6집단']
        ]
      },
      {
        title: '안내 담당',
        rowLabel: '월',
        cols: ['안내', '보조'],
        rows: [
          ['1월', '홍길동', '김샘플'],
          ['2월', '이샘플', '박샘플'],
          ['3월', '최샘플', '정샘플']
        ]
      }
    ]
  };
}

export function parseDutyData(raw) {
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (d && Array.isArray(d.sections) && d.sections.length) {
      return {
        heading: typeof d.heading === 'string' ? d.heading : DUTY_HEADING,
        sections: d.sections.map((s) => ({
          title: String(s.title || ''),
          rowLabel: String(s.rowLabel == null ? ' ' : s.rowLabel),
          cols: Array.isArray(s.cols) ? s.cols.map((c) => String(c)) : [],
          rows: Array.isArray(s.rows) ? s.rows.map((r) => (Array.isArray(r) ? r.map((c) => String(c ?? '')) : [])) : []
        }))
      };
    }
  } catch {
    // Fall through to null.
  }
  return null;
}

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

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

export function buildDutyPlain(data) {
  const lines = [];
  if (data.heading) lines.push(data.heading);
  for (const s of data.sections) {
    lines.push('', `[${s.title}]`, [s.rowLabel || ' ', ...s.cols].join(' / '));
    for (const r of s.rows) lines.push(r.join(' / '));
  }
  return lines.join('\n').trim();
}
