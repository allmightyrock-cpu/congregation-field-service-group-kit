export const MEMBER_GENDERS = ['', '형제', '자매'];
export const MEMBER_ROLES = ['', '장로', '봉사의 종', '전도인'];
export const GROUP_ORDER = ['daebang', 'buyeong', 'jihaeng', 'jugong1', 'jugong3', 'human1', 'human2'];
export const ROSTER_NOTICE_KEY = 'roster';

export function nextMemberSeq(members = []) {
  const max = members.reduce((acc, member) => {
    const seq = Number(member?.seq);
    return Number.isFinite(seq) && seq > acc ? seq : acc;
  }, 0);
  return max + 1;
}

export function nextMemberId(groupKey, seq) {
  const n = Number(seq) || 0;
  const suffix = n < 100 ? String(n).padStart(2, '0') : String(n);
  return `${groupKey}-${suffix}`;
}

export function memberFormDefaults(member = null, groupKey = '', members = []) {
  if (member) {
    return {
      id: member.id || '',
      name: member.name || '',
      displayName: member.displayName || '',
      seq: Number.isFinite(Number(member.seq)) ? Number(member.seq) : 0,
      gender: member.gender || '',
      role: member.role || '',
      regularPioneer: member.regularPioneer === true,
      elder: member.elder === true,
      active: member.active !== false
    };
  }
  const seq = nextMemberSeq(members);
  return {
    id: nextMemberId(groupKey, seq),
    name: '',
    displayName: '',
    seq,
    gender: '',
    role: '',
    regularPioneer: false,
    elder: false,
    active: true
  };
}

export function buildMemberPayload(form, uid, timestamp) {
  const name = String(form?.name || '').trim();
  if (!name) throw new Error('name is required');
  const seq = Number.parseInt(form?.seq, 10);
  return {
    name,
    displayName: String(form?.displayName || '').trim(),
    seq: Number.isFinite(seq) ? seq : 0,
    gender: String(form?.gender || '').trim().slice(0, 10),
    role: String(form?.role || '').trim().slice(0, 20),
    regularPioneer: form?.regularPioneer === true,
    elder: form?.elder === true,
    active: form?.active !== false,
    updatedBy: uid,
    updatedAt: timestamp
  };
}

export function buildMemberPrivatePayload(note, uid, timestamp) {
  return {
    note: String(note || '').slice(0, 2000),
    updatedBy: uid,
    updatedAt: timestamp
  };
}

export function buildRosterColumns(groups = {}, membersByGroup = {}, groupOrder = GROUP_ORDER) {
  return groupOrder.map((groupKey) => {
    const group = groups[groupKey] || {};
    const rows = [];
    if (group.overseerName) rows.push({ type: 'overseer', label: '감독자', name: group.overseerName });
    if (group.assistantName) rows.push({ type: 'assistant', label: '보조자', name: group.assistantName });
    const members = [...(membersByGroup[groupKey] || [])]
      .filter((member) => member?.active !== false)
      .sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0) || String(a.name || '').localeCompare(String(b.name || '')));
    for (const member of members) {
      rows.push({ type: 'member', label: '', name: member.name || '', member });
    }
    return {
      groupKey,
      label: group.label || group.name || groupKey,
      rows
    };
  });
}

export function buildRosterMove({ fromGroup, targetGroup, member, targetMembers = [] }) {
  const targetSeq = nextMemberSeq(targetMembers);
  return {
    fromGroup,
    targetGroup,
    targetId: nextMemberId(targetGroup, targetSeq),
    targetForm: { ...member, seq: targetSeq, active: true },
    sourceForm: { ...member, active: false }
  };
}

export function rosterNoticePayload(uid, timestamp) {
  return {
    key: ROSTER_NOTICE_KEY,
    title: '집단 편성표',
    visible: true,
    updatedBy: uid,
    updatedAt: timestamp
  };
}

export function rosterPagePayload(dataUrl, uid, index = 1) {
  const value = String(dataUrl || '');
  if (value.length > 700000) throw new Error('이미지가 너무 큽니다. 700KB 이하로 줄여 주세요.');
  return {
    index,
    dataUrl: value,
    updatedBy: uid
  };
}
