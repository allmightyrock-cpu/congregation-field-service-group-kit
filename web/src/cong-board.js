import { buildNoticePayload, getNoticePreview } from './notice-content.js';

export const CONG_NOTICE_KEY = 'cong';

// 게시판형(월별 목록)으로 관리하는 알림 키 — 여기 추가하면 자동으로 목록형이 됨
export const BOARD_NOTICE_KEYS = ['cong', 'branch', 'week'];
export function isBoardNoticeKey(key) {
  return BOARD_NOTICE_KEYS.includes(String(key || ''));
}

export function buildCongItemPayload({
  parentKey = CONG_NOTICE_KEY,
  title = '',
  subtitle = '',
  editorValue = {},
  visible = true,
  urgent = false,
  pinned = false,
  createdAt = null
} = {}, uid, timestamp) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('제목을 입력하세요.');
  const payload = {
    parentKey,
    title: cleanTitle,
    subtitle: String(subtitle || '').trim(),
    ...buildNoticePayload(editorValue),
    visible: visible !== false,
    urgent: urgent === true,
    pinned: pinned === true,
    createdAt: createdAt || timestamp,
    updatedAt: timestamp,
    updatedBy: uid
  };
  delete payload.body;
  return payload;
}

export function buildCongItemSoftDeletePayload(uid, timestamp) {
  return {
    visible: false,
    deletedAt: timestamp,
    updatedAt: timestamp,
    updatedBy: uid
  };
}

export function sortCongItems(items = [], opts = {}) {
  const { visibleOnly = false } = opts;
  return [...items]
    .filter((item) => !visibleOnly || item.visible === true)
    .sort((a, b) => {
      const pinned = Number(b.pinned === true) - Number(a.pinned === true);
      if (pinned) return pinned;
      return timestampMillis(b.updatedAt || b.createdAt) - timestampMillis(a.updatedAt || a.createdAt);
    });
}

export function groupCongItemsForDisplay(items = []) {
  const visible = sortCongItems(items, { visibleOnly: true });
  return {
    pinned: visible.filter((item) => item.pinned === true),
    regular: visible.filter((item) => item.pinned !== true)
  };
}

export function getNewCongItems(items = [], seen = {}) {
  return sortCongItems(items, { visibleOnly: true })
    .filter((item) => {
      const id = item?.id;
      const updated = timestampMillis(item?.updatedAt || item?.createdAt);
      if (!id || !updated) return false;
      return updated > (Number(seen[id]) || 0);
    });
}

export function markCongItemSeen(seen = {}, item = {}) {
  const id = item?.id;
  const updated = timestampMillis(item?.updatedAt || item?.createdAt);
  if (!id || !updated) return { ...seen };
  return { ...seen, [id]: updated };
}

export function formatCongItemDate(value) {
  const millis = timestampMillis(value);
  if (!millis) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  }).format(new Date(millis));
}

export function congItemPreview(item = {}) {
  if (item.deletedAt) return '숨김 처리됨';
  return getNoticePreview(item);
}

export function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value.seconds === 'number') return value.seconds * 1000;
  return 0;
}
