// 홈 상단 배경 사진 사용자 지정(기기 로컬 저장, 서버 업로드 없음)
const STORAGE_KEY = 'fsg.heroBg.v1';
const DEFAULT_HERO = '/field-service-hero-original.png';

export function hasCustomHero() {
  try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; }
}

export function heroBgUrl() {
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_HERO; } catch { return DEFAULT_HERO; }
}

export function clearHeroBg() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export async function saveHeroBgFromFile(file) {
  if (!file) return;
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 선택할 수 있습니다.');
  }

  const dataUrl = await readFileAsDataUrl(file);
  const compressed = await compressImage(dataUrl, 1280, 0.82);
  try {
    localStorage.setItem(STORAGE_KEY, compressed);
  } catch {
    const smaller = await compressImage(dataUrl, 1024, 0.7);
    try {
      localStorage.setItem(STORAGE_KEY, smaller);
    } catch {
      throw new Error('사진 용량이 너무 큽니다. 더 작은 사진을 선택해 주세요.');
    }
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('사진을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

function compressImage(src, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const ratio = Math.min(1, maxWidth / image.width);
      const width = Math.max(1, Math.round(image.width * ratio));
      const height = Math.max(1, Math.round(image.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('사진을 처리할 수 없습니다.'));
        return;
      }
      ctx.drawImage(image, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    image.onerror = () => reject(new Error('사진을 불러올 수 없습니다.'));
    image.src = src;
  });
}
