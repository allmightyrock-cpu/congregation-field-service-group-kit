// PDF → 페이지별 이미지 변환 (조정자/편집자 화면용)
// 목적: 지부 서신 등 PDF를 이미지로 바꿔 Storage에 올리면, 성원이 카카오톡 인앱브라우저를 포함해
//       어디서나 확실히 볼 수 있음. (검토: docs/광고_PDF_방법.md)
// 주의: pdfjs-dist는 용량이 크므로 이 모듈은 편집자 화면에서 "동적 import"로 불러오길 권장.
//   예)  const { loadPdf, pdfToImages } = await import('./pdf-to-images.js');

import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

async function toData(input) {
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (input instanceof Uint8Array) return input;
  if (input && typeof input.arrayBuffer === 'function') return new Uint8Array(await input.arrayBuffer());
  throw new Error('지원하지 않는 입력(파일/ArrayBuffer 필요)');
}

// PDF 로드 → 페이지 수 확인 + 페이지 선택 UI(썸네일) 렌더에 사용
export async function loadPdf(input) {
  const data = await toData(input);
  return pdfjsLib.getDocument({ data }).promise; // .numPages, .getPage()
}

// 단일 페이지 → 이미지 { page, blob, dataUrl, width, height }
export async function renderPage(pdf, pageNum, opts = {}) {
  const { scale = 2, type = 'image/jpeg', quality = 0.85 } = opts;
  const page = await pdf.getPage(pageNum);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
  const blob = await new Promise((res) => canvas.toBlob(res, type, quality));
  return {
    page: pageNum,
    blob,
    dataUrl: canvas.toDataURL(type, quality),
    width: canvas.width,
    height: canvas.height
  };
}

// 전체 또는 선택 페이지 → 이미지 배열
// opts.pages: [1,3] 처럼 회중용 페이지만 선택(없으면 전체)
// opts.onProgress(done, total): 진행률 콜백
export async function pdfToImages(input, opts = {}) {
  const { pages = null, scale = 2, type = 'image/jpeg', quality = 0.85, onProgress } = opts;
  const pdf = await loadPdf(input);
  const list = (pages && pages.length)
    ? pages.filter((p) => p >= 1 && p <= pdf.numPages)
    : Array.from({ length: pdf.numPages }, (_, i) => i + 1);

  const images = [];
  for (let i = 0; i < list.length; i++) {
    images.push(await renderPage(pdf, list[i], { scale, type, quality }));
    if (onProgress) onProgress(i + 1, list.length);
  }
  return { numPages: pdf.numPages, images };
}
