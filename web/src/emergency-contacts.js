const LIMITS = {
  name: 60,
  phone: 40,
  address: 200,
  emergencyName: 60,
  emergencyPhone: 40,
  relation: 40,
  memo: 500
};

export const CONTACT_FIELDS = [
  'name', 'phone', 'address', 'emergencyName', 'emergencyPhone', 'relation', 'memo'
];

export function buildEmergencyContactPayload(source = {}, uid, timestamp) {
  const name = clean(source.name, LIMITS.name);
  if (!name) throw new Error('이름을 입력하세요.');
  const payload = {
    name,
    phone: clean(source.phone, LIMITS.phone),
    address: clean(source.address, LIMITS.address),
    emergencyName: clean(source.emergencyName, LIMITS.emergencyName),
    emergencyPhone: clean(source.emergencyPhone, LIMITS.emergencyPhone),
    relation: clean(source.relation, LIMITS.relation),
    memo: clean(source.memo, LIMITS.memo),
    active: source.active !== false,
    updatedAt: timestamp,
    updatedBy: uid
  };
  if (source.createdAt) payload.createdAt = source.createdAt;
  return payload;
}

export function contactReadableGroups(claims = {}, scope = '', key = '', groupLabels = {}) {
  const allGroups = Object.keys(groupLabels);
  if (claims.canWriteContacts === true || claims.canReadContacts === true) return allGroups;
  const groups = Array.isArray(claims.groupKeys) ? claims.groupKeys.filter((g) => g in groupLabels) : [];
  if (scope === 'group' && key in groupLabels && !groups.includes(key)) groups.unshift(key);
  return groups;
}

export function contactSearchText(contact = {}, groupLabel = '') {
  return [
    groupLabel, contact.name, contact.phone, contact.address,
    contact.emergencyName, contact.emergencyPhone, contact.relation, contact.memo
  ].map((v) => String(v || '').toLowerCase()).join(' ');
}

export function stableContactId(contact = {}, index = 0) {
  const base = `${contact.name || 'contact'}-${contact.phone || ''}-${contact.address || ''}-${index}`;
  const slug = String(contact.name || 'contact')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .slice(0, 24) || 'contact';
  return `${slug}-${hashString(base).slice(0, 8)}`;
}

export function parseEmergencyContactGrid(grid = [], groupLabels = {}) {
  if (hasVerticalSections(grid, groupLabels)) return parseVerticalSections(grid, groupLabels);
  const groups = {};
  const skippedGroups = [];
  const firstRow = grid[0] || [];
  for (let col = 0; col < firstRow.length; col += 1) {
    const groupKey = groupKeyFromLabel(firstRow[col], groupLabels);
    if (!groupKey) {
      if (String(firstRow[col] || '').trim()) skippedGroups.push(String(firstRow[col]).trim());
      continue;
    }
    const rows = [];
    for (let r = 2; r < grid.length; r += 1) {
      const contact = rowToContact(grid[r] || [], col);
      if (!contact.name) continue;
      rows.push(contact);
    }
    groups[groupKey] = rows;
  }
  const total = Object.values(groups).reduce((sum, rows) => sum + rows.length, 0);
  return { groups, skippedGroups, total };
}

function hasVerticalSections(grid, groupLabels) {
  return grid.some((row, index) => index > 0 && groupKeyFromLabel(row?.[0], groupLabels));
}

function parseVerticalSections(grid, groupLabels) {
  const groups = {};
  const skippedGroups = [];
  let currentGroup = '';
  for (const row of grid) {
    const first = row?.[0];
    const groupKey = groupKeyFromLabel(first, groupLabels);
    if (groupKey) {
      currentGroup = groupKey;
      if (!groups[currentGroup]) groups[currentGroup] = [];
      continue;
    }
    if (!currentGroup || isHeaderRow(row)) continue;
    for (const startCol of [0, 7]) {
      const contact = rowToContact(row || [], startCol);
      if (contact.name) groups[currentGroup].push(contact);
    }
  }
  const total = Object.values(groups).reduce((sum, rows) => sum + rows.length, 0);
  return { groups, skippedGroups, total };
}

export function groupKeyFromLabel(label, groupLabels = {}) {
  const normalized = normalizeGroupLabel(label);
  if (!normalized) return '';
  for (const [key, value] of Object.entries(groupLabels)) {
    if (normalizeGroupLabel(value) === normalized) return key;
  }
  const aliases = {
    '1집단': 'group1',
    '2집단': 'group2',
    '3집단': 'group3',
    '4집단': 'group4',
    '5집단': 'group5',
    '6집단': 'group6',
    '7집단': 'group7'
  };
  return aliases[normalized] && aliases[normalized] in groupLabels ? aliases[normalized] : '';
}

function rowToContact(row, startCol) {
  return {
    name: clean(row[startCol], LIMITS.name),
    phone: clean(row[startCol + 1], LIMITS.phone),
    address: clean(row[startCol + 2], LIMITS.address),
    emergencyName: clean(row[startCol + 3], LIMITS.emergencyName),
    emergencyPhone: clean(row[startCol + 4], LIMITS.emergencyPhone),
    relation: clean(row[startCol + 5], LIMITS.relation),
    active: true
  };
}

function isHeaderRow(row = []) {
  return normalizeGroupLabel(row[0]) === '이름'
    || normalizeGroupLabel(row[1]) === '연락처'
    || normalizeGroupLabel(row[2]) === '주소';
}

function clean(value, limit) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function normalizeGroupLabel(value) {
  return String(value || '').replace(/\s+/g, '').replace(/집단$/, '').trim();
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
