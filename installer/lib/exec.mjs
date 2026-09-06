// 번들 도구(wrangler / firebase / node) 실행기 — 출력은 줄 단위로 기록(마스킹)하고 결과를 돌려준다.

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { InstallError } from './errors.mjs';

const IS_WIN = process.platform === 'win32';

export function makeExec({ toolsBin, nodeExe, bus, kitRoot }) {
  function toolPath(name) {
    return IS_WIN ? path.join(toolsBin, `${name}.cmd`) : path.join(toolsBin, name);
  }

  /**
   * run('wrangler', ['deploy'], { cwd, env, timeoutMs, input, quiet, onLine })
   * → { code, stdout, stderr, out }   (실패해도 throw 하지 않음; 호출자가 판단)
   */
  function run(tool, args, opts = {}) {
    return new Promise((resolve, reject) => {
      const file = tool === 'node' ? nodeExe : toolPath(tool);
      if (!fs.existsSync(file)) {
        return reject(new InstallError('TOOL_MISSING', `${tool} 실행 파일이 없어요. 설치 파일을 다시 실행해 실행환경을 준비하세요.`, { detail: file }));
      }
      const env = {
        ...process.env,
        ...(opts.env || {}),
        NO_UPDATE_NOTIFIER: '1',
        CI: opts.interactive ? '' : '1',
        FORCE_COLOR: '0',
        WRANGLER_SEND_METRICS: 'false',
        NO_COLOR: '1'
      };
      const cwd = opts.cwd || kitRoot;
      let child;
      if (IS_WIN) {
        // .cmd 심은 cmd.exe 로 실행. 경로에 공백·한글이 있어도 안전하게 따옴표 처리
        const cmdline = [`"${file}"`, ...args.map(quoteWin)].join(' ');
        child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"${cmdline}"`], { cwd, env, windowsHide: true, windowsVerbatimArguments: true });
      } else {
        child = spawn(file, args, { cwd, env });
      }
      const label = `${tool} ${args.filter((a) => !/^--?token|secret/i.test(a)).join(' ')}`;
      if (!opts.quiet) bus.log(`$ ${label}`);
      let stdout = '', stderr = '';
      const timer = setTimeout(() => { try { child.kill(); } catch {} ; timedOut = true; }, opts.timeoutMs || 10 * 60 * 1000);
      let timedOut = false;
      const feed = (chunk, isErr) => {
        const s = chunk.toString('utf8');
        if (isErr) stderr += s; else stdout += s;
        for (const line of s.split(/\r?\n/)) {
          if (!line.trim()) continue;
          if (!opts.quiet) bus.log(line, isErr ? 'warn' : 'info');
          if (opts.onLine) { try { opts.onLine(line, isErr); } catch {} }
        }
      };
      child.stdout.on('data', (c) => feed(c, false));
      child.stderr.on('data', (c) => feed(c, true));
      if (opts.input) { child.stdin.write(opts.input); }
      child.stdin.end();
      child.on('error', (e) => { clearTimeout(timer); reject(new InstallError('SPAWN_FAILED', `${tool} 을(를) 실행하지 못했어요.`, { detail: e.message })); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) return reject(new InstallError('TIMEOUT', `${tool} 작업이 너무 오래 걸려 중단했어요. 인터넷 상태를 확인하고 다시 시도하세요.`, { detail: label }));
        resolve({ code: code ?? -1, stdout, stderr, out: stdout + (stderr ? '\n' + stderr : '') });
      });
    });
  }

  return { run, toolPath };
}

function quoteWin(a) {
  const s = String(a);
  if (s === '' ) return '""';
  if (!/[\s"&|<>^()]/.test(s)) return s;
  return '"' + s.replace(/"/g, '\\"') + '"';
}
