const MEDIA_API_BASE = 'https://b.jw-cdn.org/apis/mediator/v1';
const DEFAULT_LOCALE = 'KO';

export function parseJwVideoInput(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('jw.org 동영상 공유 링크를 붙여넣어 주세요.');

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('동영상 공유 링크(lank 포함)를 붙여넣어 주세요.');
  }

  const lank = (url.searchParams.get('lank') || '').trim();
  if (!lank) throw new Error('동영상 공유 링크(lank 포함)를 붙여넣어 주세요.');

  const locale = (url.searchParams.get('wtlocale') || DEFAULT_LOCALE).trim().toUpperCase();
  return { lank, locale: locale || DEFAULT_LOCALE };
}

export function buildMediaItemUrl({ lank, locale }) {
  return `${MEDIA_API_BASE}/media-items/${encodeURIComponent(locale)}/${encodeURIComponent(lank)}?clientType=www`;
}

export function pickSubtitleUrl(mediaItem) {
  const file = (mediaItem?.files || []).find((f) => f?.subtitles?.url);
  return file?.subtitles?.url || '';
}

export function pickThumbnailUrl(mediaItem) {
  const images = mediaItem?.images || {};
  const groups = [images.wss, images.sqr, images.lsr, images.pnr, images.lss].filter(Boolean);
  for (const group of groups) {
    if (typeof group === 'string') return group;
    if (group.lg) return group.lg;
    if (group.md) return group.md;
    if (group.sm) return group.sm;
  }
  return '';
}

export async function fetchJwMediaDetails(input, fetchImpl = fetch) {
  const parsed = parseJwVideoInput(input);
  const response = await fetchImpl(buildMediaItemUrl(parsed));
  if (!response.ok) throw new Error(`jw.org 동영상 정보를 불러오지 못했습니다. (${response.status})`);

  const payload = await response.json();
  const mediaItem = payload?.media?.[0];
  if (!mediaItem) throw new Error('동영상 정보를 찾지 못했습니다.');

  const subtitleUrl = pickSubtitleUrl(mediaItem);
  if (!subtitleUrl) throw new Error('이 동영상은 자막이 제공되지 않습니다.');

  return {
    lank: parsed.lank,
    locale: parsed.locale,
    title: mediaItem.title || parsed.lank,
    subtitleUrl,
    thumbnailUrl: pickThumbnailUrl(mediaItem),
    mediaItem
  };
}

export async function fetchSubtitleText(subtitleUrl, fetchImpl = fetch) {
  const response = await fetchImpl(subtitleUrl);
  if (!response.ok) throw new Error(`자막 파일을 불러오지 못했습니다. (${response.status})`);
  return response.text();
}
