// 날마다 성경을 검토함 — 오늘 자 항목으로 가는 링크만 담당.
//
// 성경 읽기(개인 책갈피) 기능은 2026-07-14 제거됨(사용성 개선 필요 → 재설계 예정).
// 저작권상 성구 본문·해설을 앱에 싣지 않는다. wol.jw.org 링크로만 연결한다.
const SEOUL_TIME_ZONE = 'Asia/Seoul';

function seoulDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type)?.value;
  return { year: part('year'), month: part('month'), day: part('day') };
}

export function seoulDateKey(date = new Date()) {
  const { year, month, day } = seoulDateParts(date);
  return `${year}-${month}-${day}`;
}

export function todayDateLabel(date = new Date()) {
  const [year, month, day] = seoulDateKey(date).split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

// wol.jw.org 오늘 자 항목. 월·일에 0을 붙이지 않는다. (2026-01-05 → .../2026/1/5)
export function buildDailyTextUrl(dateKey) {
  const [year, month, day] = String(dateKey).split('-').map(Number);
  return `https://wol.jw.org/ko/wol/dt/r8/lp-ko/${year}/${month}/${day}`;
}

export function todayDailyTextUrl(date = new Date()) {
  return buildDailyTextUrl(seoulDateKey(date));
}
