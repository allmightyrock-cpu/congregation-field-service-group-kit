export function buildAdminEntryHref(groupKey) {
  const key = String(groupKey || '').trim();
  return key ? `?g=${encodeURIComponent(key)}&admin=1` : '?admin=1';
}

export function buildAdminRedirectHref(search) {
  const params = new URLSearchParams(search || '');
  params.set('admin', '1');
  return `/?${params.toString()}`;
}

export function resolveAdminLoginDefaults(search, groups) {
  const params = new URLSearchParams(search || '');
  const groupKey = params.get('g') || '';
  if (groupKey && Object.prototype.hasOwnProperty.call(groups || {}, groupKey)) {
    return { scope: 'group', key: groupKey };
  }
  return { scope: 'role', key: '' };
}

export function shouldAutoStartStandaloneAdmin(dataset) {
  return dataset?.standalone === '1';
}
