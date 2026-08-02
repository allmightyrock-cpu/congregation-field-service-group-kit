export const NOTICE_IMAGE_MAX_LENGTH = 700000;

export function sortNoticePages(pages = []) {
  return [...pages].sort((a, b) =>
    pageIndex(a) - pageIndex(b) || String(a.id || '').localeCompare(String(b.id || '')));
}

export function nextNoticePageIndex(pages = []) {
  return Math.max(0, ...pages.map(pageIndex).filter(Number.isFinite)) + 1;
}

export function assertImageDataUrlSize(dataUrl, maxLength = NOTICE_IMAGE_MAX_LENGTH) {
  if (String(dataUrl || '').length > maxLength) {
    throw new Error('이미지가 너무 큽니다. 700KB 이하로 줄여 주세요.');
  }
}

export async function compressImage(file, opts = {}) {
  const { maxW = 1000, quality = 0.7, minQuality = 0.4, maxLength = NOTICE_IMAGE_MAX_LENGTH } = opts;
  const img = await loadImage(file);
  const scale = Math.min(1, maxW / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);

  let q = quality;
  let dataUrl = canvas.toDataURL('image/jpeg', q);
  while (dataUrl.length > maxLength && q > minQuality) {
    q = Math.max(minQuality, Number((q - 0.1).toFixed(2)));
    dataUrl = canvas.toDataURL('image/jpeg', q);
  }
  assertImageDataUrlSize(dataUrl, maxLength);
  return { dataUrl, width: canvas.width, height: canvas.height, quality: q };
}

function pageIndex(page) {
  const value = Number(page?.index ?? page?.id);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'));
    img.src = URL.createObjectURL(file);
  });
}
