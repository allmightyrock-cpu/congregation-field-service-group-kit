import createDOMPurify from 'dompurify';
import { escapeHtml } from './notice-content.js';

export function getNoticeDisplayHtml(notice = {}) {
  if (notice.bodyHtml && String(notice.bodyHtml).trim()) {
    return sanitizeNoticeHtml(notice.bodyHtml);
  }
  if (notice.body && String(notice.body).trim()) {
    return escapeHtml(notice.body).replace(/\r?\n/g, '<br>');
  }
  return '';
}

export function sanitizeNoticeHtml(html) {
  const dirty = String(html || '');
  const purify = getPurifier();
  if (!purify) return fallbackSanitize(dirty);
  return purify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'mark', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'hr',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'colspan', 'rowspan', 'scope'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  });
}

function getPurifier() {
  if (createDOMPurify && typeof createDOMPurify.sanitize === 'function') return createDOMPurify;
  if (typeof window !== 'undefined') return createDOMPurify(window);
  return null;
}

function fallbackSanitize(html) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\s+on\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+href=(?:"javascript:[^"]*"|'javascript:[^']*'|javascript:[^\s>]+)/gi, '');
}
