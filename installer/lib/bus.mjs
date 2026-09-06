// 이벤트 버스 + SSE 구독자 + 기록(log) — 화면 실시간 갱신의 통로.
// 기록은 마스킹을 거친 뒤에만 메모리 버퍼·파일·화면으로 나간다.

import fs from 'node:fs';
import path from 'node:path';
import { mask } from './errors.mjs';

export class Bus {
  constructor(kitRoot) {
    this.clients = new Set();
    this.logBuffer = [];       // 최근 600줄(화면 '자세한 기록'용)
    this.logDir = path.join(kitRoot, '.install', 'logs');
    this.logFile = path.join(this.logDir, `install-${new Date().toISOString().slice(0, 10)}.log`);
    try { fs.mkdirSync(this.logDir, { recursive: true }); } catch {}
  }

  subscribe(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    res.write(': connected\n\n');
    this.clients.add(res);
    const ping = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);
    res.on('close', () => { clearInterval(ping); this.clients.delete(res); });
  }

  emit(type, data) {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const c of this.clients) { try { c.write(payload); } catch {} }
  }

  log(line, level = 'info') {
    const text = mask(String(line ?? '')).replace(/\s+$/, '');
    if (!text) return;
    const entry = { t: new Date().toISOString(), level, text };
    this.logBuffer.push(entry);
    if (this.logBuffer.length > 600) this.logBuffer.shift();
    try { fs.appendFileSync(this.logFile, `${entry.t} [${level}] ${text}\n`, 'utf8'); } catch {}
    const consoleLine = `  ${level === 'error' ? '[오류] ' : level === 'warn' ? '[주의] ' : ''}${text}`;
    if (level === 'error') console.error(consoleLine); else console.log(consoleLine);
    this.emit('log', entry);
  }
}
