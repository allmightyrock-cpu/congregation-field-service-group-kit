// 작업(job) 실행기: 화면 버튼 → 서버 작업. 한 번에 하나만. 진행 상황은 SSE 'job' 이벤트로 전달.
// job = { id, name, status: running|ok|error, startedAt, finishedAt, steps:[{key,label,status,detail}], error, result }

import { toUserError } from './errors.mjs';

export class JobRunner {
  constructor(bus) {
    this.bus = bus;
    this.current = null;
    this.seq = 0;
  }

  get busy() { return !!(this.current && this.current.status === 'running'); }

  snapshot() { return this.current; }

  /**
   * start(name, fn) — fn(report) 에서 report.step(key,label) / report.done(key,detail) / report.fail(key,detail) / report.note(text)
   * 반환값은 job.result 에 담긴다. 예외는 InstallError 로 변환되어 job.error 에 담긴다.
   */
  start(name, fn, { steps = [] } = {}) {
    if (this.busy) throw new Error('BUSY');
    const job = {
      id: ++this.seq, name, status: 'running',
      startedAt: new Date().toISOString(), finishedAt: null,
      steps: steps.map((s) => ({ key: s.key, label: s.label, status: 'pending', detail: '' })),
      error: null, result: null
    };
    this.current = job;
    const emit = () => this.bus.emit('job', job);
    const find = (key) => job.steps.find((s) => s.key === key);
    const report = {
      step: (key, label) => { let s = find(key); if (!s) { s = { key, label: label || key, status: 'pending', detail: '' }; job.steps.push(s); } s.status = 'running'; if (label) s.label = label; this.bus.log(`▶ ${s.label}`); emit(); },
      done: (key, detail = '') => { const s = find(key); if (s) { s.status = 'ok'; s.detail = detail; this.bus.log(`✓ ${s.label}${detail ? ' — ' + detail : ''}`); } emit(); },
      fail: (key, detail = '') => { const s = find(key); if (s) { s.status = 'error'; s.detail = detail; } emit(); },
      note: (text) => { this.bus.log(text); }
    };
    emit();
    this.bus.log(`작업 시작: ${name}`);
    Promise.resolve()
      .then(() => fn(report))
      .then((result) => {
        job.result = result ?? null; job.status = 'ok'; job.finishedAt = new Date().toISOString();
        this.bus.log(`작업 완료: ${name}`);
        emit();
      })
      .catch((err) => {
        const ue = toUserError(err);
        job.error = ue.toJSON(); job.status = 'error'; job.finishedAt = new Date().toISOString();
        const running = job.steps.find((s) => s.status === 'running');
        if (running) { running.status = 'error'; running.detail = ue.message; }
        this.bus.log(`작업 실패: ${name} — [${ue.code}] ${ue.message}`, 'error');
        if (ue.detail) this.bus.log(ue.detail, 'error');
        emit();
      });
    return job;
  }
}
