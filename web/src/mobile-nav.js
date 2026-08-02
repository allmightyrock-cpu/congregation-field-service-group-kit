const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const BACK_LABELS = {
  home: '← 홈으로 돌아가기',
  names: '← 이름 다시 선택',
  list: '← 목록으로 돌아가기',
  member: '← 성원 화면'
};

export function topbarHtml(title, options = {}) {
  const { showHome = false } = options;
  return `
    <nav class="topbar" aria-label="화면 이동">
      <button class="topbar-back" id="topbar-back" type="button">← 뒤로</button>
      <strong class="topbar-title">${esc(title)}</strong>
      ${showHome ? '<button class="topbar-home" id="topbar-home" type="button">홈</button>' : '<span class="topbar-spacer" aria-hidden="true"></span>'}
    </nav>`;
}

export function backButtonHtml(kind = 'home', id = 'back') {
  return `<button class="link-back" id="${esc(id)}" type="button">${esc(BACK_LABELS[kind] || BACK_LABELS.home)}</button>`;
}
