export const JW_SCRIPT_AGREED_KEY = 'fsg_jwscript_agreed';
export const JW_SCRIPT_DISABLED_KEY = 'fsg_jwscript_disabled';

export function isJwScriptAgreed(storage = localStorage) {
  return storage.getItem(JW_SCRIPT_AGREED_KEY) === '1';
}

export function isJwScriptDisabled(storage = localStorage) {
  return storage.getItem(JW_SCRIPT_DISABLED_KEY) === '1';
}

export function agreeJwScript(storage = localStorage) {
  storage.setItem(JW_SCRIPT_AGREED_KEY, '1');
  storage.removeItem(JW_SCRIPT_DISABLED_KEY);
}

export function disableJwScript(storage = localStorage) {
  storage.setItem(JW_SCRIPT_DISABLED_KEY, '1');
  storage.removeItem(JW_SCRIPT_AGREED_KEY);
}

export function enableJwScript(storage = localStorage) {
  storage.removeItem(JW_SCRIPT_DISABLED_KEY);
}

export function plainTextFromVtt(vtt) {
  const lines = String(vtt || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  const output = [];
  let skipBlock = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      skipBlock = false;
      continue;
    }
    if (/^(WEBVTT|Kind:|Language:)/i.test(line)) continue;
    if (/^(NOTE|STYLE|REGION)(\s|$)/i.test(line)) {
      skipBlock = true;
      continue;
    }
    if (skipBlock) continue;
    if (/^\d+$/.test(line)) continue;
    if (/-->/ .test(line)) continue;

    const cleaned = line
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleaned) continue;
    if (output[output.length - 1] === cleaned) continue;
    output.push(cleaned);
  }

  return formatPlainParagraphs(output);
}

function formatPlainParagraphs(lines) {
  const text = lines.join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return '';

  return text
    .replace(/([.!?])([)"'’”]*)\s+/g, '$1$2\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function scriptOutputForMode(vtt, mode = 'plain') {
  return mode === 'raw' ? String(vtt || '').trim() : plainTextFromVtt(vtt);
}

export function safeScriptFileName(title) {
  const base = String(title || 'jw-script')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${base || 'jw-script'}.txt`;
}