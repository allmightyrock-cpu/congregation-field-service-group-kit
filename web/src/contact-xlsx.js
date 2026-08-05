import { parseEmergencyContactGrid } from './emergency-contacts.js';

export async function parseEmergencyContactXlsx(file, groupLabels) {
  const { unzipSync, strFromU8 } = await import('fflate');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const zip = unzipSync(bytes);
  const text = (path) => zip[path] ? strFromU8(zip[path]) : '';
  const sharedStrings = parseSharedStrings(text('xl/sharedStrings.xml'));
  const sheetPath = firstWorksheetPath(text('xl/workbook.xml'), text('xl/_rels/workbook.xml.rels'));
  if (!sheetPath || !zip[sheetPath]) throw new Error('엑셀 첫 번째 시트를 찾지 못했습니다.');
  const grid = parseWorksheet(text(sheetPath), sharedStrings);
  return parseEmergencyContactGrid(grid, groupLabels);
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  return [...xml.matchAll(/<si\b[\s\S]*?<\/si>/g)].map((m) =>
    [...m[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => decodeXml(t[1])).join('')
  );
}

function firstWorksheetPath(workbookXml, relsXml) {
  const sheet = /<sheet\b[^>]*r:id="([^"]+)"/.exec(workbookXml);
  if (!sheet) return 'xl/worksheets/sheet1.xml';
  const relId = sheet[1];
  const relRe = new RegExp(`<Relationship\\b[^>]*Id="${escapeRegExp(relId)}"[^>]*Target="([^"]+)"`);
  const rel = relRe.exec(relsXml);
  if (!rel) return 'xl/worksheets/sheet1.xml';
  const target = rel[1].replace(/^\/+/, '');
  return target.startsWith('xl/') ? target : `xl/${target}`;
}

function parseWorksheet(xml, sharedStrings) {
  const grid = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const body = cellMatch[2];
      const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
      if (!ref) continue;
      const col = columnIndex(ref[1]);
      const row = Number(ref[2]) - 1;
      if (!grid[row]) grid[row] = [];
      grid[row][col] = cellValue(attrs, body, sharedStrings);
    }
  }
  return grid.map((row) => row || []);
}

function cellValue(attrs, body, sharedStrings) {
  const inline = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/.exec(body);
  if (inline) return decodeXml(inline[1]);
  const value = /<v>([\s\S]*?)<\/v>/.exec(body);
  if (!value) return '';
  const raw = decodeXml(value[1]);
  if (/\bt="s"/.test(attrs)) return sharedStrings[Number(raw)] || '';
  return raw;
}

function columnIndex(label) {
  let n = 0;
  for (const ch of label) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function decodeXml(value) {
  return String(value || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
