/* 설치 도우미 화면 — 서버 상태(SSE)를 그대로 그린다. 판단(다음 가능 여부)은 서버가 한다. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STEPS = [
    { id: 'precheck', label: '사전 점검' },
    { id: 'start', label: '시작' },
    { id: 'cong', label: '회중 정보' },
    { id: 'google', label: 'Google 로그인' },
    { id: 'auth', label: '로그인 기능 켜기' },
    { id: 'sakey', label: '서버 키 등록' },
    { id: 'cloudflare', label: 'Cloudflare 로그인' },
    { id: 'confirm', label: '확인' },
    { id: 'install', label: '설치 진행' },
    { id: 'done', label: '완료' }
  ];

  let S = null;          // 서버 publicState
  let job = null;        // 현재 작업
  let lastAction = null; // 다시 시도용 {name, body}
  let localErr = null;   // 즉시 작업 실패 표시용
  const logs = [];

  // ---------- 통신 ----------
  async function api(path, body) {
    const r = await fetch('/api/' + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-FSG-Installer': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store'
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok && data.error) throw data.error;
    if (!r.ok) throw { code: 'HTTP_' + r.status, message: '요청이 실패했어요.' };
    return data;
  }
  async function act(name, body = {}, { remember = true } = {}) {
    if (remember) lastAction = { name, body };
    localErr = null;
    try {
      const res = await api('action/' + name, body);
      if (res.job) { job = res.job; render(); }
      return res;
    } catch (e) {
      localErr = e; render();
      throw e;
    }
  }
  function connectEvents() {
    const es = new EventSource('/api/events');
    es.onopen = () => setConn(true);
    es.onerror = () => setConn(false);
    es.addEventListener('state', (ev) => { S = JSON.parse(ev.data); job = S.job || job; render(); });
    es.addEventListener('job', (ev) => { job = JSON.parse(ev.data); render(); });
    es.addEventListener('log', (ev) => { const e = JSON.parse(ev.data); logs.push(e); if (logs.length > 600) logs.shift(); renderLog(); });
    es.addEventListener('login-error', (ev) => { localErr = JSON.parse(ev.data); render(); });
  }
  function setConn(on) { const c = $('#conn'); c.textContent = on ? '연결됨' : '연결 끊김 — 설치 창(검은 창)이 닫혔는지 확인하세요'; c.className = 'conn ' + (on ? 'on' : 'off'); }

  // ---------- 그리기 ----------
  function cur() { return S ? S.state.currentStep : 0; }
  function curId() { return STEPS[cur()].id; }

  function render() {
    if (!S) return;
    renderRail(); renderBanner(); renderScreen(); renderFoot(); renderDev();
  }

  function renderRail() {
    const unlocked = S.unlocked;
    $('#rail').innerHTML = STEPS.map((st, i) => {
      const cls = i === cur() ? 'current' : i < cur() ? 'done' : (i <= unlocked ? 'unlocked' : 'locked');
      const mark = cls === 'done' ? '✓' : String(i);
      return `<button type="button" class="step ${cls}" data-step="${i}" ${cls === 'locked' ? 'disabled' : ''}><span class="num">${mark}</span><span class="lbl">${esc(st.label)}</span></button>`;
    }).join('');
    $('#rail').querySelectorAll('.step:not([disabled])').forEach((b) => b.onclick = () => nav(+b.dataset.step));
  }

  function renderBanner() {
    const b = $('#resume-banner');
    if (S.resumed && cur() > 0 && !sessionStorage.getItem('fsg.resume.seen')) {
      const t = new Date(S.state.updatedAt);
      b.hidden = false;
      b.innerHTML = `<span>이전에 진행하던 설치를 이어갑니다. (마지막 저장 ${esc(t.toLocaleString('ko-KR'))})</span>
        <span><button type="button" class="btn tiny ghost" id="b-restart">처음부터 다시</button><button type="button" class="btn tiny ghost" id="b-dismiss">닫기</button></span>`;
      $('#b-dismiss').onclick = () => { sessionStorage.setItem('fsg.resume.seen', '1'); b.hidden = true; };
      $('#b-restart').onclick = resetAll;
    } else b.hidden = true;
  }

  async function resetAll() {
    if (!confirm('지금까지 저장한 설치 정보를 지우고 처음부터 다시 시작할까요?\n(이미 만들어진 Firebase/Cloudflare 자원은 지워지지 않습니다.)')) return;
    await act('reset', {}, { remember: false });
    sessionStorage.removeItem('fsg.resume.seen');
    toast('처음부터 다시 시작합니다.');
  }

  async function nav(step) {
    try { await api('nav', { step }); } catch (e) { toast(e.message || '이동할 수 없어요.'); }
  }

  function renderFoot() {
    const i = cur(); const id = curId();
    const prev = $('#btn-prev'), next = $('#btn-next'), hint = $('#next-hint');
    prev.disabled = i === 0;
    prev.onclick = () => nav(i - 1);
    const busy = job && job.status === 'running';
    const custom = { start: '시작', confirm: '설치 시작', done: '' }[id];
    if (id === 'done') { next.hidden = true; hint.textContent = ''; return; }
    next.hidden = false;
    next.textContent = custom || '다음';
    if (id === 'confirm') {
      next.disabled = busy || !(S.gates.cloudflare && S.gates.sakey && S.gates.auth && S.gates.google && S.gates.cong);
      next.onclick = () => startInstall();
      hint.textContent = '';
      return;
    }
    const can = S.gates[id] && !busy;
    next.disabled = !can;
    next.onclick = () => nav(i + 1);
    hint.textContent = can ? '' : ({
      precheck: '모든 점검 항목이 초록색이어야 다음으로 갈 수 있어요.',
      cong: '회중 이름·영문 이름·집단 이름을 채우고 [저장]을 누르세요.',
      google: 'Google 로그인과 프로젝트 준비가 끝나야 해요.',
      auth: '로그인 기능이 켜진 것을 확인해야 해요.',
      sakey: '서버 키 파일을 등록해야 해요.',
      cloudflare: 'Cloudflare 로그인이 필요해요.',
      install: '설치가 끝나면 자동으로 넘어갑니다.'
    }[id] || '');
  }

  function renderScreen() {
    const id = curId();
    const el = $('#screen');
    const fn = SCREENS[id];
    el.innerHTML = fn.html();
    if (fn.bind) fn.bind(el);
    // 공통: 오류 카드
    const errHost = $('#err-host', el);
    if (errHost) errHost.innerHTML = errorCardHtml(id);
    bindErrorActions(el);
  }

  function currentError(id) {
    if (localErr) return localErr;
    if (job && job.status === 'error' && jobBelongsTo(job.name, id)) return job.error;
    return null;
  }
  function jobBelongsTo(name, id) {
    const map = { precheck: /^precheck\./, google: /^google\./, auth: /^auth\./, sakey: /^sakey\./, cloudflare: /^cf\./, confirm: /^(install\.|demo\.job)/, install: /^(install\.|demo\.job)/ };
    return map[id] ? map[id].test(name) : false;
  }
  function errorCardHtml(id) {
    const e = currentError(id);
    if (!e) return '';
    const btns = (Array.isArray(e.actions) ? e.actions : [{ id: 'retry', label: '다시 시도' }])
      .map((a) => `<button type="button" class="btn ghost" data-erract="${esc(a.id)}">${esc(a.label)}</button>`).join('');
    return `<div class="errcard"><b>${esc(e.message)}</b>${e.hint ? `<div class="hint">${esc(e.hint)}</div>` : ''}
      <div class="btnrow">${btns}<button type="button" class="btn ghost" data-erract="copylog">기록 복사</button></div></div>`;
  }
  function bindErrorActions(el) {
    el.querySelectorAll('[data-erract]').forEach((b) => b.onclick = async () => {
      const a = b.dataset.erract;
      if (a === 'copylog') return copyLog();
      if (a === 'relogin') { try { await act('google.login', {}, { remember: false }); toast('브라우저에서 로그인을 마치고 돌아오세요.'); } catch {} return; }
      if (a === 'relogin-cf') { try { await act('cf.login', { choice: 'relogin' }); toast('브라우저에서 Cloudflare 로그인을 마치고 돌아오세요.'); } catch {} return; }
      if (a === 'openauth') { try { await act('auth.open', {}, { remember: false }); } catch (e) { toast(e.message); } return; }
      if (a === 'opensa') { try { await act('sakey.open', {}, { remember: false }); } catch (e) { toast(e.message); } return; }
      if (a === 'opencf') { try { await act('cf.dash', {}, { remember: false }); } catch (e) { toast(e.message); } return; }
      if (a === 'rename') {
        const cur = (S.state.firebase && S.state.firebase.projectId) || ((S.state.cong.slug || '') + '-fsg');
        const v = prompt('사용할 Firebase 프로젝트 ID를 입력하세요 (소문자·숫자·하이픈, 6~30자):', cur);
        if (!v) return;
        try { await act('google.project', { mode: 'new', projectId: v.trim().toLowerCase() }); } catch {}
        return;
      }
      if (a === 'retry' || a === 'suffix') {
        if (!lastAction) return;
        try { await act(lastAction.name, { ...lastAction.body, choice: a }); } catch {}
      }
    });
  }

  function jobListHtml(steps) {
    if (!steps || !steps.length) return '';
    return `<ul class="checklist">${steps.map((s) => `<li><span class="mark ${s.status}">${s.status === 'ok' ? '✓' : s.status === 'error' ? '!' : ''}</span><span><span class="lbl">${esc(s.label)}</span>${s.detail ? `<div class="detail">${esc(s.detail)}</div>` : ''}</span></li>`).join('')}</ul>`;
  }

  // ---------- 화면들 ----------
  const SCREENS = {
    precheck: {
      html() {
        const pc = S.state.precheck || {};
        const running = job && job.name === 'precheck.run' && job.status === 'running';
        const items = pc.items || [];
        return `<h1>사전 점검</h1><p class="lead">설치에 필요한 인터넷 연결과 파일, 도구를 확인합니다. 모두 초록색이면 [다음]이 켜집니다.</p>
          ${running ? jobListHtml(job.steps) : items.length ? `<ul class="checklist">${items.map((i) => `<li><span class="mark ${i.ok ? 'ok' : 'error'}">${i.ok ? '✓' : '!'}</span><span><span class="lbl">${esc(i.label)}</span><div class="detail">${esc(i.detail)}</div>${!i.ok && i.fix ? `<div class="fix">${esc(i.fix)}</div>` : ''}</span></li>`).join('')}</ul>` : '<p class="muted">아직 점검하지 않았습니다.</p>'}
          <div id="err-host"></div>
          <div class="btnrow"><button type="button" class="btn ${items.length ? 'ghost' : ''}" id="b-precheck" ${running ? 'disabled' : ''}>${items.length ? '다시 점검' : '점검 시작'}</button></div>
          ${pc.at ? `<p class="muted">마지막 점검: ${esc(new Date(pc.at).toLocaleString('ko-KR'))}</p>` : ''}`;
      },
      bind(el) {
        $('#b-precheck', el).onclick = () => act('precheck.run').catch(() => {});
        if (!(S.state.precheck && S.state.precheck.items && S.state.precheck.items.length) && !(job && job.name === 'precheck.run')) act('precheck.run').catch(() => {});
      }
    },

    start: {
      html() {
        return `<h1>시작하기</h1>
          <p class="lead">이 도우미는 회중 전용 <b>야외 봉사 집단 앱</b>을 인터넷에 설치합니다. 집단 성원은 설치가 끝난 뒤 주소 하나로 접속해 봉사 보고, 임명, 광고를 볼 수 있습니다.</p>
          <h2>걸리는 시간</h2><p>보통 10~15분. 중간에 멈춰도 다음에 이 도우미를 다시 열면 이어서 진행됩니다.</p>
          <h2>미리 준비할 것 두 가지</h2>
          <ul class="clean">
            <li><b>Google 계정</b> — 데이터를 저장할 Firebase에 씁니다. 회중 공용 계정을 권장합니다. 없으면 <a href="#" data-open="https://accounts.google.com/signup">Google 계정 만들기</a></li>
            <li><b>Cloudflare 계정</b> — 앱을 인터넷에 올리는 데 씁니다(무료). 없으면 <a href="#" data-open="https://dash.cloudflare.com/sign-up">Cloudflare 가입</a></li>
          </ul>
          <h2>도우미가 대신 해 주는 일</h2>
          <ul class="clean"><li>Firebase 프로젝트·데이터 저장소 만들기와 설정값 받아오기</li><li>서버와 웹 사이트 배포, 서버 비밀 키 저장</li><li>집단·역할 초기 데이터 등록과 접속 주소 확인</li></ul>
          <p class="muted">직접 입력하는 것은 회중 이름과 집단 이름뿐입니다. 로그인은 브라우저에서 평소처럼 하면 됩니다.</p>`;
      },
      bind(el) { bindOpenLinks(el); }
    },

    cong: {
      html() {
        const c = S.state.cong || {};
        const groups = c.groups && c.groups.length ? c.groups : [];
        return `<h1>회중 정보</h1><p class="lead">회중 이름, 집단 수, 그리고 <b>각 집단의 이름</b>을 정합니다. 집단 이름은 앱 화면과 접속 주소 안내에 그대로 표시됩니다.</p>
          <div class="field"><label for="f-name">회중 이름</label><input type="text" id="f-name" value="${esc(c.name)}" placeholder="예: 동두천 남부" autocomplete="off"><div class="help">앱 화면과 문서에 표시됩니다. "회중"은 빼고 적어도 됩니다.</div><div class="err" id="e-name"></div></div>
          <div class="field"><label for="f-slug">영문 이름 (인터넷 주소용)</label><input type="text" id="f-slug" value="${esc(c.slug)}" placeholder="자동 제안" autocomplete="off" spellcheck="false"><div class="help" id="h-slug">영문 소문자·숫자·하이픈, 4~22자. 이 이름으로 접속 주소가 정해집니다.</div><div class="err" id="e-slug"></div></div>
          <div class="field"><label for="f-count">집단 수</label><input type="number" id="f-count" min="1" max="12" value="${esc(c.groupCount || 3)}" style="max-width:120px"><div class="err" id="e-count"></div></div>
          <div class="field groups-field"><label>집단 이름 <span class="muted">— 회중에서 부르는 이름으로 고쳐 쓰세요 (예: 대방, 부영, 주공1단지)</span></label>
            <div class="groups" id="f-groups">${groups.map((g, i) => groupRowHtml(i, g.name)).join('')}</div>
            <div class="help">칸을 비워 두면 "1집단, 2집단…" 처럼 번호로 들어갑니다. 나중에 편집자 화면(집단 편성표)에서도 바꿀 수 있습니다.</div>
            <div class="err" id="e-groups"></div></div>
          <h2>만들어질 이름 미리보기</h2>
          <table class="kv"><tbody>
            <tr><th>접속 주소(예정)</th><td><code id="p-site">-</code></td></tr>
            <tr><th>Firebase 프로젝트</th><td><code id="p-project">-</code></td></tr>
            <tr><th>서버(Worker)</th><td><code id="p-worker">-</code></td></tr>
          </tbody></table>
          <p class="muted">이름이 이미 사용 중이면 다음 단계에서 자동으로 "-2"를 붙여 제안합니다.</p>
          <div id="err-host"></div>
          <div class="btnrow"><button type="button" class="btn" id="b-save">저장</button><span class="muted" id="s-saved">${S.gates.cong ? '저장됨 — [다음]을 누르세요.' : ''}</span></div>`;
      },
      bind(el) {
        const name = $('#f-name', el), slug = $('#f-slug', el), count = $('#f-count', el), groupsEl = $('#f-groups', el);
        let slugTouched = !!(S.state.cong && S.state.cong.slug);
        const preview = () => {
          const s = slug.value.trim().toLowerCase();
          $('#p-site', el).textContent = s ? `https://${s}-fsg.pages.dev` : '-';
          $('#p-project', el).textContent = s ? `${s}-fsg` : '-';
          $('#p-worker', el).textContent = s ? `${s}-fsg-api` : '-';
        };
        const rebuildGroups = () => {
          const n = Math.max(1, Math.min(12, parseInt(count.value, 10) || 1));
          const existing = [...groupsEl.querySelectorAll('input')].map((i) => i.value);
          groupsEl.innerHTML = Array.from({ length: n }, (_, i) => groupRowHtml(i, existing[i] ?? '')).join('');
        };
        let t;
        name.oninput = () => {
          clearTimeout(t);
          t = setTimeout(async () => {
            if (slugTouched) return;
            try { const r = await api('action/cong.suggest', { name: name.value, groupCount: count.value }); slug.value = r.slug; preview(); } catch {}
          }, 250);
        };
        slug.oninput = () => { slugTouched = slug.value.trim().length > 0; preview(); };
        count.onchange = rebuildGroups;
        if (!groupsEl.children.length) rebuildGroups();
        preview();
        $('#b-save', el).onclick = async () => {
          ['name', 'slug', 'count', 'groups'].forEach((k) => $('#e-' + k, el).textContent = '');
          const groups = [...groupsEl.querySelectorAll('input')].map((i, idx) => ({ name: i.value.trim() || `${idx + 1}집단` }));
          try {
            const r = await act('cong.save', { name: name.value, slug: slug.value, groupCount: count.value, groups }, { remember: false });
            if (!r.ok) { for (const [k, v] of Object.entries(r.errors)) { const m = { name: 'name', slug: 'slug', groupCount: 'count', groups: 'groups' }[k]; if (m) $('#e-' + m, el).textContent = v; } return; }
            toast('저장했습니다.');
          } catch (e) { toast(e.message || '저장 실패'); }
        };
      }
    },

    google: {
      html() {
        const fb = S.state.firebase || {};
        const running = job && job.name === 'google.project' && job.status === 'running';
        const jobDone = job && job.name === 'google.project' && job.status !== 'running';
        const acct = fb.account || '';
        const c = S.state.cong || {};
        return `<h1>Google 로그인과 Firebase 준비</h1><p class="lead">회중용 Google 계정으로 로그인하면, 도우미가 Firebase 프로젝트·데이터 저장소·웹 앱을 만들고 설정값을 자동으로 받아옵니다. 복사해 붙여 넣을 것이 없습니다.</p>
          <h2>1. Google 계정</h2>
          ${acct ? `<div class="okcard">로그인됨 ✓ — ${esc(acct)}</div>` : '<p class="muted">아직 로그인하지 않았습니다. 버튼을 누르면 브라우저 창이 열립니다. 계정을 고르고 <b>허용</b>을 누른 뒤 이 화면으로 돌아오세요.</p>'}
          <div id="acct-list"></div>
          <div class="btnrow"><button type="button" class="btn ${acct ? 'ghost' : 'big'}" id="b-glogin" ${running ? 'disabled' : ''}>${acct ? '다른 계정으로 로그인' : 'Google로 로그인'}</button></div>
          <div id="login-err"></div>
          ${acct ? `
          <h2>2. Firebase 프로젝트</h2>
          ${fb.projectId && fb.config ? `<div class="okcard">받아왔습니다 ✓ — 프로젝트 <code>${esc(fb.projectId)}</code> · 웹 앱 <code>${esc(fb.webAppId)}</code></div>` : `
          <div class="field"><label><input type="radio" name="pmode" value="new" checked> 새로 만들기(권장) — <code id="p-newid">${esc(c.slug)}-fsg</code></label></div>
          <div class="field"><label><input type="radio" name="pmode" value="existing"> 이 계정의 기존 프로젝트 사용</label>
            <div id="p-existing" hidden style="margin:6px 0 0 22px"><select id="p-select" style="min-width:280px;padding:7px"><option value="">목록 불러오는 중…</option></select> <button type="button" class="btn tiny ghost" id="p-reload">새로 고침</button>
            <div class="help">비어 있는 프로젝트를 고르세요. 이미 쓰는 프로젝트를 고르면 데이터가 섞일 수 있어요.</div></div></div>`}
          ${running || jobDone ? jobListHtml(job.steps) : ''}
          <div id="err-host"></div>
          ${!(fb.projectId && fb.config) ? `<div class="btnrow"><button type="button" class="btn big" id="b-provision" ${running ? 'disabled' : ''}>${jobDone && job.status === 'error' ? '다시 시도' : '프로젝트 준비 시작'}</button><span class="muted">1~2분 걸립니다.</span></div>` : ''}
          ` : '<div id="err-host"></div>'}
          <p class="muted">로그인 창이 안 열리면 검은 창(설치 창)에 표시된 주소를 브라우저에 직접 붙여 넣으세요.</p>`;
      },
      bind(el) {
        const fb = S.state.firebase || {};
        $('#b-glogin', el).onclick = () => act('google.login', {}, { remember: false }).then(() => toast('브라우저에서 로그인을 마치고 돌아오세요.')).catch(() => {});
        // 저장된 계정이 있으면 고를 수 있게
        api('action/google.status', {}).then((s) => {
          const others = (s.accounts || []).filter((e) => e !== fb.account);
          if (!others.length) return;
          $('#acct-list', el).innerHTML = `<p class="muted">이 PC에 저장된 다른 로그인: ${others.map((e) => `<button type="button" class="btn tiny ghost" data-use="${esc(e)}">${esc(e)} 사용</button>`).join(' ')}</p>`;
          el.querySelectorAll('[data-use]').forEach((b) => b.onclick = () => act('google.use', { email: b.dataset.use }, { remember: false }).catch((e) => toast(e.message)));
        }).catch(() => {});
        const prov = $('#b-provision', el);
        if (prov) {
          const radios = el.querySelectorAll('input[name=pmode]');
          const sel = $('#p-select', el);
          const loadProjects = async () => {
            sel.innerHTML = '<option value="">목록 불러오는 중…</option>';
            try { const r = await api('action/google.projects', {}); sel.innerHTML = '<option value="">— 프로젝트 선택 —</option>' + r.projects.map((p) => `<option value="${esc(p.projectId)}">${esc(p.displayName)} (${esc(p.projectId)})</option>`).join(''); }
            catch (e) { sel.innerHTML = `<option value="">불러오기 실패: ${esc(e.message)}</option>`; }
          };
          radios.forEach((r) => r.onchange = () => { const ex = $('#p-existing', el); ex.hidden = r.value !== 'existing' || !r.checked; if (r.value === 'existing' && r.checked && sel.options.length <= 1) loadProjects(); });
          $('#p-reload', el).onclick = loadProjects;
          prov.onclick = () => {
            const mode = [...radios].find((r) => r.checked)?.value || 'new';
            const body = mode === 'existing' ? { mode, projectId: sel.value } : { mode: 'new' };
            if (mode === 'existing' && !sel.value) return toast('기존 프로젝트를 골라 주세요.');
            act('google.project', body).catch(() => {});
          };
        }
      }
    },

    auth: {
      html() {
        const fb = S.state.firebase || {};
        const running = job && job.name === 'auth.verify' && job.status === 'running';
        const j = job && job.name === 'auth.verify' ? job : null;
        return `<h1>로그인 기능 켜기</h1><p class="lead">앱의 감독자·편집자 로그인은 Firebase의 로그인 기능(Authentication)을 씁니다. 이 기능은 Google 정책상 콘솔에서 <b>"시작하기"</b> 버튼을 한 번 직접 눌러야 켜집니다. 설치 전체에서 직접 클릭하는 건 이것 하나뿐입니다.</p>
          ${fb.authEnabled ? '<div class="okcard">로그인 기능이 켜져 있습니다 ✓ — [다음]을 누르세요.</div>' : `
          <ol>
            <li><b>[페이지 열기]</b>를 누르면 Firebase 콘솔의 Authentication 페이지가 열립니다. (같은 Google 계정으로 로그인되어 있어야 해요)</li>
            <li>페이지 가운데 <b>시작하기</b>(Get started)를 누릅니다. 로그인 방법을 고르는 화면이 나와도 아무것도 고르지 않아도 됩니다.</li>
            <li>이 화면으로 돌아와 <b>[확인]</b>을 누릅니다.</li>
          </ol>`}
          ${j ? jobListHtml(j.steps) : ''}
          <div id="err-host"></div>
          <div class="btnrow">${fb.authEnabled ? '' : `<button type="button" class="btn big" id="b-aopen">페이지 열기</button><button type="button" class="btn" id="b-averify" ${running ? 'disabled' : ''}>확인</button>`}${fb.authEnabled ? '<button type="button" class="btn ghost" id="b-aopen">페이지 열기</button>' : ''}</div>`;
      },
      bind(el) {
        const v = $('#b-averify', el); if (v) v.onclick = () => act('auth.verify').catch(() => {});
        $('#b-aopen', el).onclick = () => act('auth.open', {}, { remember: false }).then(() => toast('브라우저에서 "시작하기"를 누른 뒤 돌아와 [확인]을 누르세요.')).catch((e) => toast(e.message));
      }
    },

    sakey: {
      html() {
        const fb = S.state.firebase || {};
        const running = job && job.name === 'sakey.auto' && job.status === 'running';
        const j = job && job.name === 'sakey.auto' ? job : null;
        return `<h1>서버 키 등록</h1><p class="lead">서버가 데이터에 접근하려면 "서비스 계정 키"가 필요합니다. 도우미가 자동으로 만들어 이 PC의 배포본 폴더 안 <code>.secrets</code>에 저장합니다.</p>
          ${fb.saKeyPath ? `<div class="okcard">키 등록됨 ✓ — <code>${esc(fb.saKeyPath)}</code>${fb.saClientEmail ? `<div class="muted">${esc(fb.saClientEmail)}</div>` : ''}</div>` : ''}
          ${j ? jobListHtml(j.steps) : ''}
          <div id="err-host"></div>
          <div class="btnrow">${fb.saKeyPath ? '' : `<button type="button" class="btn big" id="b-sauto" ${running ? 'disabled' : ''}>자동으로 키 만들기</button>`}</div>
          <details ${fb.saKeyPath ? '' : ''}><summary class="muted">자동으로 안 될 때(직접 만들기)</summary>
            <ol><li>[키 만들기 페이지 열기] → 페이지에서 <b>새 비공개 키 생성</b> → <b>키 생성</b>. 파일이 다운로드됩니다.</li><li>돌아와서 [다운로드 폴더에서 찾기]를 누르면 방금 받은 파일을 제안합니다.</li></ol>
            <div class="btnrow"><button type="button" class="btn ghost" id="b-sopen">키 만들기 페이지 열기</button><button type="button" class="btn ghost" id="b-sscan">다운로드 폴더에서 찾기</button></div>
            <div id="sa-cands"></div>
            <div class="field"><label for="f-sapath">또는 파일 경로 직접 입력</label><input type="text" id="f-sapath" placeholder="C:\\Users\\이름\\Downloads\\프로젝트-xxxx.json"> <button type="button" class="btn ghost" id="b-spick" style="margin-top:6px">이 파일 사용</button></div>
          </details>
          <p class="muted">키는 서버에 비밀값으로 저장하는 것 외에는 어디에도 보내지 않습니다. 키 파일을 다른 사람에게 보내지 마세요.</p>`;
      },
      bind(el) {
        const a = $('#b-sauto', el); if (a) a.onclick = () => act('sakey.auto').catch(() => {});
        $('#b-sopen', el).onclick = () => act('sakey.open', {}, { remember: false }).catch((e) => toast(e.message));
        $('#b-sscan', el).onclick = async () => {
          try {
            const r = await act('sakey.scan', {}, { remember: false });
            const host = $('#sa-cands', el);
            if (!r.candidates.length) { host.innerHTML = '<p class="muted">최근 30일 안에 받은 서비스 계정 키 파일을 다운로드·바탕화면 폴더에서 찾지 못했어요.</p>'; return; }
            host.innerHTML = `<ul class="checklist">${r.candidates.map((c) => `<li><span class="mark ${c.match ? 'ok' : ''}">${c.match ? '✓' : ''}</span><span><span class="lbl">${esc(c.name)}</span><div class="detail">${esc(c.projectId)} · ${esc(new Date(c.mtime).toLocaleString('ko-KR'))}${c.match ? '' : ' · <b>다른 프로젝트 키</b>'}</div>${c.match ? `<button type="button" class="btn tiny" data-pick="${esc(c.path)}">이 키 사용</button>` : ''}</span></li>`).join('')}</ul>`;
            host.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => act('sakey.pick', { path: b.dataset.pick }, { remember: false }).then(() => toast('키를 등록했습니다.')).catch(() => {}));
          } catch {}
        };
        $('#b-spick', el).onclick = () => act('sakey.pick', { path: $('#f-sapath', el).value }, { remember: false }).then(() => toast('키를 등록했습니다.')).catch(() => {});
      }
    },

    cloudflare: {
      html() {
        const cf = S.state.cloudflare || {};
        const running = job && /^cf\./.test(job.name) && job.status === 'running';
        const j = job && job.name === 'cf.login' ? job : null;
        const multi = (cf.accounts || []).length > 1;
        return `<h1>Cloudflare 로그인</h1><p class="lead">[Cloudflare로 로그인]을 누르면 브라우저가 열립니다. 로그인 후 <b>Allow</b>를 누르고 돌아오세요. 앱은 이 계정의 무료 요금제에 올라갑니다.</p>
          <table class="kv"><tbody>
            <tr><th>서버(Worker) 이름</th><td><code>${esc(cf.workerName || '-')}</code></td></tr>
            <tr><th>웹 사이트 프로젝트</th><td><code>${esc(cf.pagesProject || '-')}</code> → <code>https://${esc(cf.pagesProject || '…')}.pages.dev</code></td></tr>
          </tbody></table>
          ${cf.loggedIn ? `<div class="okcard">로그인됨 ✓ — ${esc(cf.email || '')}${cf.accountName ? ` · 계정: ${esc(cf.accountName)}` : ''}</div>` : ''}
          ${multi ? `<div class="field"><label for="cf-acct">사용할 Cloudflare 계정</label><select id="cf-acct" style="padding:7px;min-width:280px">${cf.accounts.map((a) => `<option value="${esc(a.id)}" ${a.id === cf.accountId ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}</select></div>` : ''}
          ${j ? jobListHtml(j.steps) : ''}
          <div id="err-host"></div>
          <div class="btnrow"><button type="button" class="btn ${cf.loggedIn ? 'ghost' : 'big'}" id="b-cflogin" ${running ? 'disabled' : ''}>${cf.loggedIn ? '다른 계정으로 로그인' : 'Cloudflare로 로그인'}</button></div>
          <p class="muted">로그인 창이 안 열리면 검은 창(설치 창)에 표시된 dash.cloudflare.com 주소를 브라우저에 직접 붙여 넣으세요. 계정이 없으면 그 화면에서 가입할 수 있어요.</p>`;
      },
      bind(el) {
        const cf = S.state.cloudflare || {};
        $('#b-cflogin', el).onclick = () => act('cf.login', cf.loggedIn ? { choice: 'relogin' } : {}).catch(() => {});
        const sel = $('#cf-acct', el); if (sel) sel.onchange = () => act('cf.account', { id: sel.value }, { remember: false }).catch((e) => toast(e.message));
      }
    },

    confirm: {
      html() {
        const c = S.state.cong, fb = S.state.firebase, cf = S.state.cloudflare;
        return `<h1>확인</h1><p class="lead">아래 내용으로 설치합니다. [설치 시작]을 누르면 되돌릴 수 없는 작업(프로젝트 배포)이 시작됩니다.</p>
          <table class="kv"><tbody>
            <tr><th>회중</th><td>${esc(c.name)} <span class="muted">(${esc(c.slug)})</span></td></tr>
            <tr><th>집단 ${c.groups.length}개</th><td>${c.groups.map((g) => esc(g.name)).join(', ')}</td></tr>
            <tr><th>Firebase 프로젝트</th><td><code>${esc(fb.projectId)}</code></td></tr>
            <tr><th>서버 키</th><td><code>${esc(fb.saKeyPath)}</code></td></tr>
            <tr><th>Cloudflare</th><td>${esc(cf.accountName || '로그인됨')} · 서버 <code>${esc(cf.workerName)}</code> · 사이트 <code>${esc(cf.pagesProject)}</code></td></tr>
            <tr><th>기본 PIN</th><td>집단 감독자·역할별 기본 PIN은 완료 화면에 표시됩니다. 첫 로그인 후 꼭 바꾸세요.</td></tr>
          </tbody></table>
          <div id="err-host"></div>
          <p class="muted">진행 중에는 창을 닫지 마세요. 3~5분 걸립니다.</p>`;
      }
    },

    install: {
      html() {
        const j = job && /^(install\.|demo\.job)/.test(job.name) ? job : null;
        const st = S.state.install || {};
        const steps = j ? j.steps : [];
        const upd = !!(S.meta && S.meta.updateMode);
        const finishedNow = j && j.status === 'ok';
        const lead = upd && !j
          ? `새 버전 프로그램 파일을 받았습니다 (배포본 ${esc(S.meta.kitVersion || '')}). <b>[다시 배포]</b>를 누르면 서버와 사이트를 최신으로 갱신합니다. 회중 데이터·PIN·설정은 그대로 유지됩니다.`
          : finishedNow ? (upd ? '업데이트 배포가 끝났습니다.' : '설치가 끝났습니다.')
          : j && j.status === 'running' ? (upd ? '업데이트 중입니다. 창을 닫지 마세요.' : '설치 중입니다. 창을 닫지 마세요.')
          : j && j.status === 'error' ? '중단되었습니다. 원인을 확인하고 다시 시도하세요.'
          : st.status === 'ok' ? '이전에 설치를 마쳤습니다. 다시 배포하려면 아래 버튼을 누르세요.' : '설치를 시작하지 않았습니다.';
        const btnLabel = j ? (j.status === 'error' ? '다시 시도' : '다시 배포') : (upd || st.status === 'ok' ? '다시 배포' : '설치 시작');
        return `<h1>${upd ? '업데이트 배포' : '설치 진행'}</h1><p class="lead">${lead}</p>
          ${jobListHtml(steps)}
          <div id="err-host"></div>
          ${finishedNow ? '<div class="okcard">모든 단계가 끝났습니다 ✓ 잠시 후 완료 화면으로 넘어갑니다.</div>' : ''}
          ${!j || j.status !== 'running' ? `<div class="btnrow">${finishedNow ? '' : `<button type="button" class="btn" id="b-install">${btnLabel}</button>`}</div>` : ''}`;
      },
      bind(el) {
        const b = $('#b-install', el); if (b) b.onclick = () => startInstall();
        if (job && /^(install\.|demo\.job)/.test(job.name) && job.status === 'ok') setTimeout(() => { if (cur() === 8) nav(9); }, 1200);
      }
    },

    done: {
      html() {
        const r = S.state.result || {}; const c = S.state.cong || {};
        return `<h1>설치 완료</h1><p class="lead">${esc(c.name)} 야외 봉사 집단 앱이 준비되었습니다. 아래 주소를 성원에게 공유하세요. 휴대폰 카메라로 QR을 찍으면 바로 열립니다.</p>
          <div class="bigurl">${esc(r.siteUrl || '(주소 확인 중)')}</div>
          <div class="btnrow"><button type="button" class="btn big" id="b-open-site" ${r.siteUrl ? '' : 'disabled'}>지금 열기</button><button type="button" class="btn ghost" id="b-copy-url">주소 복사</button><button type="button" class="btn ghost" id="b-save-result">결과 파일 저장</button>${r.savedPath ? '<button type="button" class="btn ghost" id="b-reveal">저장한 폴더 열기</button>' : ''}</div>
          ${r.savedPath ? `<p class="muted">저장됨: <code>${esc(r.savedPath)}</code> <span class="muted">(키·PIN은 파일에 들어가지 않습니다)</span></p>` : ''}
          <div style="display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start">
            <div class="qr" id="qr" title="${esc(r.siteUrl || '')}">QR 준비 중…</div>
            <div style="flex:1;min-width:260px">
              <h2>기본 PIN <span class="muted">(첫 로그인 후 꼭 바꾸세요)</span></h2>
              <table class="kv"><tbody>${(r.pins || []).map((p) => `<tr><th>${esc(p.group)} · ${esc(p.role)}</th><td><code>${esc(p.pin)}</code></td></tr>`).join('') || '<tr><td class="muted">표시할 PIN이 없습니다.</td></tr>'}</tbody></table>
            </div>
          </div>
          <h2>집단별 주소</h2>
          <table class="kv"><tbody>${(c.groups || []).map((g) => `<tr><th>${esc(g.name)}</th><td><code>${esc((r.siteUrl || '') + '/?g=' + g.key)}</code></td></tr>`).join('')}</tbody></table>
          <h2>다음에 할 일 세 가지</h2>
          <ol><li>편집자로 로그인해 <b>PIN을 바꾸세요</b>. (접속 주소 뒤에 <code>/?admin=1</code>)</li><li>편집자 화면에서 <b>집단 성원을 입력</b>하세요.</li><li>성원에게 <b>접속 주소</b>를 안내하세요. 휴대폰에서는 "홈 화면에 추가"로 앱처럼 쓸 수 있습니다.</li></ol>
          <p class="muted">서버 키 파일(.secrets 폴더)은 이 PC 밖으로 보내지 마세요. 이 도우미는 이제 닫아도 됩니다. 나중에 업데이트할 때 설치 파일을 다시 실행하면 됩니다.</p>
          <div class="btnrow"><button type="button" class="btn ghost" id="b-quit">도우미 닫기</button></div>`;
      },
      bind(el) {
        const r = S.state.result || {};
        const o = $('#b-open-site', el); if (o) o.onclick = () => act('open', { url: r.siteUrl }, { remember: false }).catch((e) => toast(e.message));
        $('#b-copy-url', el).onclick = async () => { try { await navigator.clipboard.writeText(r.siteUrl || ''); toast('주소를 복사했습니다.'); } catch { toast('복사하지 못했어요. 주소를 드래그해 복사하세요.'); } };
        $('#b-save-result', el).onclick = () => act('result.save', {}, { remember: false }).then((res) => toast('저장했습니다: ' + res.path)).catch((e) => toast(e.message));
        const rv = $('#b-reveal', el); if (rv) rv.onclick = () => act('result.reveal', {}, { remember: false }).catch((e) => toast(e.message));
        $('#b-quit', el).onclick = quit;
        renderQr($('#qr', el), r.siteUrl);
      }
    }
  };

  function renderQr(host, url) {
    if (!host) return;
    if (!url) { host.textContent = '주소가 정해지면 QR이 표시됩니다.'; return; }
    if (typeof window.QRCode !== 'function') { host.textContent = 'QR 라이브러리를 불러오지 못했어요. 위 주소를 그대로 공유하세요.'; return; }
    host.textContent = '';
    try { new window.QRCode(host, { text: url, width: 164, height: 164, correctLevel: window.QRCode.CorrectLevel.M }); }
    catch { host.textContent = 'QR 생성 실패. 위 주소를 그대로 공유하세요.'; }
  }

  async function startInstall() {
    try { await act('install.run'); if (cur() !== 8) nav(8); } catch {}
  }

  // 집단 이름 한 줄: "n번 집단" 라벨 + 입력칸(비우면 번호 이름). 저장된 이름이 기본값("n집단")이면 빈칸+자리표시로 보여 고치기 쉽게
  function groupRowHtml(i, name) {
    const def = `${i + 1}집단`;
    const v = String(name || '').trim();
    return `<label class="group-row"><span class="group-no">${i + 1}번 집단</span><input type="text" data-i="${i}" value="${esc(v === def ? '' : v)}" placeholder="${esc(def)} (이름을 입력하세요)" autocomplete="off"></label>`;
  }

  function bindOpenLinks(el) {
    el.querySelectorAll('[data-open]').forEach((a) => a.onclick = (ev) => { ev.preventDefault(); act('open', { url: a.dataset.open }, { remember: false }).catch((e) => toast(e.message)); });
  }

  async function quit() {
    if (!confirm('설치 도우미를 닫을까요?')) return;
    try { await api('quit', {}); } catch {}
    document.body.innerHTML = '<main class="layout" style="display:block"><section class="card"><h1>설치 도우미를 닫았습니다.</h1><p>이 탭은 닫아도 됩니다. 다시 열려면 배포본 폴더의 설치 파일을 실행하세요.</p></section></main>';
  }

  // ---------- 기록 ----------
  function renderLog() {
    const pre = $('#log');
    pre.innerHTML = logs.map((e) => `<span class="${e.level}">${esc(e.t.slice(11, 19))} ${esc(e.text)}</span>`).join('\n');
    $('#log-count').textContent = `(${logs.length}줄)`;
    if ($('#logbox').open) pre.scrollTop = pre.scrollHeight;
  }
  async function copyLog() {
    try {
      const r = await fetch('/api/log', { cache: 'no-store' }); const text = await r.text();
      await navigator.clipboard.writeText(text);
      toast('기록을 복사했습니다. 메신저나 메일에 붙여 넣으세요.');
    } catch { toast('복사하지 못했어요. 기록 파일을 직접 여세요: ' + (S && S.meta.logFile)); }
  }
  $('#btn-copylog').onclick = (ev) => { ev.preventDefault(); copyLog(); };

  // ---------- 개발 패널 ----------
  function renderDev() {
    const d = $('#devpanel');
    if (!S.dev) { d.hidden = true; return; }
    d.hidden = false;
    d.innerHTML = `<b>개발 확인용</b> (FSG_DEV=1 일 때만 보임) — <button type="button" class="btn tiny ghost" data-dev="unlock">3~6단계 통과 처리</button> <button type="button" class="btn tiny ghost" data-dev="installing">설치 중 상태</button> <button type="button" class="btn tiny ghost" data-dev="job">가짜 설치 실행</button> <button type="button" class="btn tiny ghost" data-dev="jobfail">가짜 설치(실패)</button> <button type="button" class="btn tiny ghost" data-dev="reset">상태 초기화</button>`;
    d.querySelectorAll('[data-dev]').forEach((b) => b.onclick = async () => {
      const k = b.dataset.dev;
      try {
        if (k === 'unlock') await act('demo.unlock', {}, { remember: false });
        if (k === 'installing') await act('demo.installing', {}, { remember: false });
        if (k === 'job') { await act('demo.job', {}); nav(8); }
        if (k === 'jobfail') { await act('demo.job', { failAt: 'secret' }); nav(8); }
        if (k === 'reset') await act('reset', {}, { remember: false });
      } catch (e) { toast(e.message || String(e)); }
    });
  }

  // ---------- 잡동사니 ----------
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3200); }

  // ---------- 시작 ----------
  api('state').then((s) => { S = s; job = s.job; render(); connectEvents(); }).catch(() => setConn(false));
})();
