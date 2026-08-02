const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export function buildNoticePayload({ html = '', json = EMPTY_DOC, text = '' } = {}) {
  const plainText = normalizeText(text);
  return {
    bodyHtml: String(html || ''),
    bodyJson: JSON.stringify(json || EMPTY_DOC),
    plainText,
    body: plainText
  };
}

export function getNoticePreview(notice = {}) {
  const source = notice.plainText || notice.body || notice.subtitle || '';
  const line = normalizeText(source).split(/\r?\n/)[0] || '';
  return line.length > 42 ? line.slice(0, 42) + '…' : line;
}

export function normalizeEditorSource(notice = {}) {
  if (notice.bodyJson) {
    if (typeof notice.bodyJson === 'string') {
      try {
        const parsed = JSON.parse(notice.bodyJson);
        if (parsed && parsed.type === 'doc') return parsed;
      } catch {}
    }
    if (typeof notice.bodyJson === 'object' && notice.bodyJson.type === 'doc') return notice.bodyJson;
  }
  const text = String(notice.body || notice.plainText || '').trim();
  if (!text) return EMPTY_DOC;
  return {
    type: 'doc',
    content: text.split(/\r?\n/).map((line) => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : undefined
    }))
  };
}

export function escapeHtml(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeText(value) {
  return String(value || '').replace(/\u00a0/g, ' ').trim();
}
