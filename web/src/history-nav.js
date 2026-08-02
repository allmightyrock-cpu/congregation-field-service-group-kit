const ADMIN_SCREEN = 'adminLogin';

export function buildScreenUrl(groupKey, screen) {
  const params = new URLSearchParams();
  const key = String(groupKey || '').trim();
  if (key) params.set('g', key);
  if (screen === ADMIN_SCREEN) params.set('admin', '1');
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function buildHistoryEntry(screen, params = {}) {
  return {
    screen,
    params: { ...params }
  };
}

export function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== 'object' || typeof entry.screen !== 'string') return null;
  return {
    screen: entry.screen,
    params: entry.params && typeof entry.params === 'object' ? { ...entry.params } : {}
  };
}
