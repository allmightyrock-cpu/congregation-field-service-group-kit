const STORAGE_KEY = 'fsg_seen_notices';
const NEW_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

export function noticeUpdatedAtMillis(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.seconds === 'number') return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1000000);
  return 0;
}

export function shouldShowNewNotice(notice, seen = {}, now = Date.now()) {
  const key = notice?.id || notice?.key;
  const updated = noticeUpdatedAtMillis(notice?.updatedAt);
  if (!key || !updated) return false;
  if (now - updated > NEW_WINDOW_MS) return false;
  return updated > Number(seen[key] || 0);
}

export function getNewNotices(notices = [], seen = {}, now = Date.now()) {
  return notices
    .filter((notice) => shouldShowNewNotice(notice, seen, now))
    .sort((a, b) => noticeUpdatedAtMillis(b.updatedAt) - noticeUpdatedAtMillis(a.updatedAt));
}

export function markNoticeSeen(seen = {}, notice) {
  const key = notice?.id || notice?.key;
  const updated = noticeUpdatedAtMillis(notice?.updatedAt);
  if (!key || !updated) return { ...seen };
  return { ...seen, [key]: updated };
}

export function buildNewNoticeMessage(notices = []) {
  if (notices.length === 1) {
    return `🆕 ${noticeLabel(notices[0])}가 새로 올라왔어요`;
  }
  const labels = notices.slice(0, 3).map(noticeLabel).join(' · ');
  const more = notices.length > 3 ? ` 외 ${notices.length - 3}건` : '';
  return `🆕 새로운 안내 ${notices.length}건 — ${labels}${more}`;
}

export function readSeenNotices(storage = globalThis.localStorage) {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

export function writeSeenNotices(seen, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(seen || {}));
  } catch {}
}

function noticeLabel(notice) {
  return String(notice?.title || notice?.subtitle || '새 안내').trim();
}
