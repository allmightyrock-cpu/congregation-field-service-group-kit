const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/contact-xlsx-s5FAEm2Z.js","assets/main-C6_j79Zc.js","assets/main-D6INwyzq.css","assets/pdf-to-images-krGMqgjH.js"])))=>i.map(i=>d[i]);
import{N as H,W as Le,s as Dt,a as Rt,g as D,d as g,b as d,c as x,e as I,q as $e,o as ve,f as O,u as V,h as f,i as S,j as nt,C as qt,p as Ht,k as Ot,_ as X,w as pe,n as Ft,l as de,R as Ge,t as Ut,m as Kt,r as zt,v as at,x as Gt,y as Vt,z,A as Wt,B as Jt,D as be,E as Yt,F as Xt,G as Qt,H as Zt,I as en}from"./main-C6_j79Zc.js";function tn(e,t){const a=new URLSearchParams(e||"").get("g")||"";return a&&Object.prototype.hasOwnProperty.call(t||{},a)?{scope:"group",key:a}:{scope:"role",key:""}}function nn(e){return e?.standalone==="1"}const st=7e5;function ot(e=[]){return[...e].sort((t,n)=>Be(t)-Be(n)||String(t.id||"").localeCompare(String(n.id||"")))}function it(e=[]){return Math.max(0,...e.map(Be).filter(Number.isFinite))+1}function an(e,t=st){if(String(e||"").length>t)throw new Error("이미지가 너무 큽니다. 700KB 이하로 줄여 주세요.")}async function ct(e,t={}){const{maxW:n=1e3,quality:a=.7,minQuality:s=.4,maxLength:o=st}=t,i=await sn(e),l=Math.min(1,n/i.width),r=document.createElement("canvas");r.width=Math.max(1,Math.round(i.width*l)),r.height=Math.max(1,Math.round(i.height*l)),r.getContext("2d").drawImage(i,0,0,r.width,r.height),URL.revokeObjectURL(i.src);let u=a,b=r.toDataURL("image/jpeg",u);for(;b.length>o&&u>s;)u=Math.max(s,Number((u-.1).toFixed(2))),b=r.toDataURL("image/jpeg",u);return an(b,o),{dataUrl:b,width:r.width,height:r.height,quality:u}}function Be(e){const t=Number(e?.index??e?.id);return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER}function sn(e){return new Promise((t,n)=>{const a=new Image;a.onload=()=>t(a),a.onerror=()=>n(new Error("이미지를 읽지 못했습니다.")),a.src=URL.createObjectURL(e)})}const lt="2026년 회중업무 진행요원 임명";function on(){return{heading:lt,sections:[{title:"청소 (구역 집단)",rowLabel:"월",cols:["청중석","회의실·화장실·로비"],rows:[["7월","주공3집단","휴먼빌1집단"],["8월","휴먼빌2집단","부영집단"],["9월","지행집단","주공1집단"],["10월","대방집단","주공3집단"],["11월","휴먼빌1집단","휴먼빌2집단"],["12월","부영집단","지행집단"],["1월","주공1집단","대방집단"]]},{title:"내부 안내",rowLabel:"월",cols:["실내","로비"],rows:[["5월","오주영","채혁"],["6월","구철우","김성진"],["7월","정병수","임지완"],["8월","신무환","정현"],["9월","박건","채혁"],["10월","오주영","김성진"],["11월","구철우","임지완"]]},{title:"주차 안내",rowLabel:"월",cols:["1","2"],rows:[["5월","신무환","이종섭"],["6월","박건","임지완"],["7월","채혁","정현"],["8월","장용국","김성진"],["9월","김영일","구철우"],["10월","신무환","오주영"],["11월","이종섭","임지완"]]},{title:"연사 음료",rowLabel:"월",cols:["담당"],rows:[["5월","최미란 자매"],["6월","유세윤 자매"],["7월","임지영 자매"],["8월","장한나 자매"],["9월","박민혜 자매"],["10월","민유진 자매"],["11월","안지원 자매"]]},{title:"호스트 · 엠프 · 연단",rowLabel:" ",cols:["호스트","엠프","연단"],rows:[["주","장용국","장용국","채혁"],["보조","—","구가빈","김성진"]]}]}}function cn(e){try{const t=typeof e=="string"?JSON.parse(e):e;if(t&&Array.isArray(t.sections)&&t.sections.length)return{heading:typeof t.heading=="string"?t.heading:lt,sections:t.sections.map(n=>({title:String(n.title||""),rowLabel:String(n.rowLabel==null?"월":n.rowLabel),cols:Array.isArray(n.cols)?n.cols.map(a=>String(a)):[],rows:Array.isArray(n.rows)?n.rows.map(a=>Array.isArray(a)?a.map(s=>String(s??"")):[]):[]}))}}catch{}return null}const U=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");function ln(e){const t=[];e.heading&&t.push(`<h2>${U(e.heading)}</h2>`);for(const n of e.sections){n.title&&t.push(`<h3>${U(n.title)}</h3>`);const a=`<tr><th scope="col">${U(n.rowLabel||" ")}</th>${n.cols.map(o=>`<th scope="col">${U(o)}</th>`).join("")}</tr>`,s=n.rows.map(o=>`<tr><th scope="row">${U(o[0]||"")}</th>${n.cols.map((i,l)=>`<td>${U(o[l+1]||"")}</td>`).join("")}</tr>`).join("");t.push(`<table><thead>${a}</thead><tbody>${s}</tbody></table>`)}return t.join(`
`)}function rn(e){const t=[];e.heading&&t.push(e.heading);for(const n of e.sections){t.push("",`【${n.title}】`,[n.rowLabel||" ",...n.cols].join(" / "));for(const a of n.rows)t.push(a.join(" / "))}return t.join(`
`).trim()}const dn=["","형제","자매"],un=["","장로","봉사의 종","전도인"],q=["daebang","buyeong","jihaeng","jugong1","jugong3","human1","human2"],ue="roster";function Me(e=[]){return e.reduce((n,a)=>{const s=Number(a?.seq);return Number.isFinite(s)&&s>n?s:n},0)+1}function _e(e,t){const n=Number(t)||0,a=n<100?String(n).padStart(2,"0"):String(n);return`${e}-${a}`}function mn(e=null,t="",n=[]){if(e)return{id:e.id||"",name:e.name||"",displayName:e.displayName||"",seq:Number.isFinite(Number(e.seq))?Number(e.seq):0,gender:e.gender||"",role:e.role||"",regularPioneer:e.regularPioneer===!0,elder:e.elder===!0,active:e.active!==!1};const a=Me(n);return{id:_e(t,a),name:"",displayName:"",seq:a,gender:"",role:"",regularPioneer:!1,elder:!1,active:!0}}function ae(e,t,n){const a=String(e?.name||"").trim();if(!a)throw new Error("name is required");const s=Number.parseInt(e?.seq,10);return{name:a,displayName:String(e?.displayName||"").trim(),seq:Number.isFinite(s)?s:0,gender:String(e?.gender||"").trim().slice(0,10),role:String(e?.role||"").trim().slice(0,20),regularPioneer:e?.regularPioneer===!0,elder:e?.elder===!0,active:e?.active!==!1,updatedBy:t,updatedAt:n}}function je(e,t,n){return{note:String(e||"").slice(0,2e3),updatedBy:t,updatedAt:n}}function pn(e){const t=String(e||"").replace(/\s*야외\s*봉사\s*집단\s*$/u,"").replace(/\s*야외봉사\s*집단\s*$/u,"").replace(/\s*집단\s*$/u,"").trim();return t?`${t} 집단`:"집단"}function bn(e={},t={},n=q){return n.map(a=>{const s=e[a]||{},o=[];s.overseerName&&o.push({type:"overseer",label:"감독자",name:s.overseerName}),s.assistantName&&o.push({type:"assistant",label:"보조자",name:s.assistantName});const i=[...t[a]||[]].filter(l=>l?.active!==!1).sort((l,r)=>(Number(l.seq)||0)-(Number(r.seq)||0)||String(l.name||"").localeCompare(String(r.name||"")));for(const l of i)o.push({type:"member",label:"",name:l.name||"",member:l});return{groupKey:a,label:pn(s.label||s.name||a),rows:o}})}function gn({fromGroup:e,targetGroup:t,member:n,targetMembers:a=[]}){const s=Me(a);return{fromGroup:e,targetGroup:t,targetId:_e(t,s),targetForm:{...n,seq:s,active:!0},sourceForm:{...n,active:!1}}}function yn(e,t){return{key:ue,title:"집단 편성표",visible:!0,updatedBy:e,updatedAt:t}}function hn(e,t,n=1){const a=String(e||"");if(a.length>7e5)throw new Error("이미지가 너무 큽니다. 700KB 이하로 줄여 주세요.");return{index:n,dataUrl:a,updatedBy:t}}const M={name:60,phone:40,address:200,emergencyName:60,emergencyPhone:40,relation:40,memo:500};function rt(e={},t,n){const a=_(e.name,M.name);if(!a)throw new Error("이름을 입력하세요.");const s={name:a,phone:_(e.phone,M.phone),address:_(e.address,M.address),emergencyName:_(e.emergencyName,M.emergencyName),emergencyPhone:_(e.emergencyPhone,M.emergencyPhone),relation:_(e.relation,M.relation),memo:_(e.memo,M.memo),active:e.active!==!1,updatedAt:n,updatedBy:t};return e.createdAt&&(s.createdAt=e.createdAt),s}function fn(e={},t="",n="",a={}){const s=Object.keys(a);if(e.canWriteContacts===!0||e.canReadContacts===!0)return s;const o=Array.isArray(e.groupKeys)?e.groupKeys.filter(i=>i in a):[];return t==="group"&&n in a&&!o.includes(n)&&o.unshift(n),o}function $n(e={},t=""){return[t,e.name,e.phone,e.address,e.emergencyName,e.emergencyPhone,e.relation,e.memo].map(n=>String(n||"").toLowerCase()).join(" ")}function vn(e={},t=0){const n=`${e.name||"contact"}-${e.phone||""}-${e.address||""}-${t}`;return`${String(e.name||"contact").trim().replace(/\s+/g,"-").replace(/[^\p{L}\p{N}-]/gu,"").slice(0,24)||"contact"}-${In(n).slice(0,8)}`}function ya(e=[],t={}){if(wn(e,t))return kn(e,t);const n={},a=[],s=e[0]||[];for(let i=0;i<s.length;i+=1){const l=Ce(s[i],t);if(!l){String(s[i]||"").trim()&&a.push(String(s[i]).trim());continue}const r=[];for(let u=2;u<e.length;u+=1){const b=dt(e[u]||[],i);b.name&&r.push(b)}n[l]=r}const o=Object.values(n).reduce((i,l)=>i+l.length,0);return{groups:n,skippedGroups:a,total:o}}function wn(e,t){return e.some((n,a)=>a>0&&Ce(n?.[0],t))}function kn(e,t){const n={},a=[];let s="";for(const i of e){const l=i?.[0],r=Ce(l,t);if(r){s=r,n[s]||(n[s]=[]);continue}if(!(!s||En(i)))for(const u of[0,7]){const b=dt(i||[],u);b.name&&n[s].push(b)}}const o=Object.values(n).reduce((i,l)=>i+l.length,0);return{groups:n,skippedGroups:a,total:o}}function Ce(e,t={}){const n=te(e);if(!n)return"";for(const[s,o]of Object.entries(t))if(te(o)===n)return s;const a={주공1:"jugong1",주공1단지:"jugong1",주공3:"jugong3",주공3단지:"jugong3",휴먼빌1:"human1",휴먼빌2:"human2"};return a[n]&&a[n]in t?a[n]:""}function dt(e,t){return{name:_(e[t],M.name),phone:_(e[t+1],M.phone),address:_(e[t+2],M.address),emergencyName:_(e[t+3],M.emergencyName),emergencyPhone:_(e[t+4],M.emergencyPhone),relation:_(e[t+5],M.relation),active:!0}}function En(e=[]){return te(e[0])==="이름"||te(e[1])==="연락처"||te(e[2])==="주소"}function _(e,t){return String(e??"").replace(/\s+/g," ").trim().slice(0,t)}function te(e){return String(e||"").replace(/\s+/g,"").replace(/집단$/,"").trim()}function In(e){let t=2166136261;for(let n=0;n<e.length;n+=1)t^=e.charCodeAt(n),t=Math.imul(t,16777619);return(t>>>0).toString(36)}const W=[{key:"watchtowerRegular",label:"파수대",full:"연구용 파수대(일반)"},{key:"watchtowerLarge",label:"대형활자",full:"연구용 파수대 대형활자"},{key:"meetingWorkbook",label:"집회 교재",full:"평일 집회 교재"}],De="standing",Bn=99;function se(e={}){const t=e||{},n={};for(const a of W)n[a.key]=An(t.counts?.[a.key]);return{counts:n,createdAt:t.createdAt}}function xn(e,t,n){const s={counts:se(e).counts,updatedBy:t,updatedAt:n};return e?.createdAt&&(s.createdAt=e.createdAt),s}function Sn(e,t,n,a){if(!n||!e.counts?.[t])return e;const s=mt(a);return s>0?e.counts[t][n]=s:delete e.counts[t][n],e}function Nn(e,t,n){const a=Number(e.counts?.[t]?.[n])||0;return a>0?a:0}function ut(e,t=[]){const n=new Set(Pn(t).map(s=>s.id)),a=W.map(s=>{const o=e.counts?.[s.key]||{};let i=0,l=0;for(const[r,u]of Object.entries(o)){if(!n.has(r))continue;const b=Number(u)||0;b>0&&(i+=b,l+=1)}return{key:s.key,label:s.label,copies:i,requesters:l}});return{rows:a,totalCopies:a.reduce((s,o)=>s+o.copies,0)}}function mt(e){const t=Math.floor(Number(e)||0);return!Number.isFinite(t)||t<=0?0:Math.min(t,Bn)}function An(e){if(!e||typeof e!="object"||Array.isArray(e))return{};const t={};for(const[n,a]of Object.entries(e)){if(typeof n!="string"||n.length>80)continue;const s=mt(a);s>0&&(t[n]=s)}return t}function Pn(e){return e.filter(t=>t?.id&&t.active!==!1)}const pt={coord:"회중 조정자",life:"생활과 봉사 감독자",talk:"공개강연 조정자",secretary:"회중 서기",service:"봉사 감독자",elder:"회중 장로"},h={group1:"1집단",group2:"2집단",group3:"3집단"};let bt=document.querySelector("#app");const c=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");let ne=null;const p=e=>{ne&&(ne.destroy(),ne=null),bt.innerHTML=`<section class="wrap">${e}</section>`};let m=null,Re=[],j=null,gt=location.search,oe=null;function yt(e={}){if(bt=e.root||document.querySelector("#app"),gt=e.search??location.search,oe=typeof e.onExit=="function"?e.onExit:null,m=e.session||null,Re=[],j=null,m){const t=String(e.initialTool||"").trim();t?$t(t):C();return}ie()}function Ve(e){const t=e==="group"?h:pt;return Object.keys(t).map(n=>`<option value="${n}">${c(t[n])}${e==="group"?" 감독자·보조자":""} (${n})</option>`).join("")}function ie(e=""){const t=tn(gt,h);let n=t.scope;p(`
    <h1>편집자 로그인</h1>
    <p class="muted">역할 담당자·집단 감독자·보조자가 사용합니다.</p>
    ${e?`<p class="err">${c(e)}</p>`:""}
    <label>구분</label>
    <div class="seg">
      <button class="seg-b ${n==="role"?"on":""}" data-scope="role">역할</button>
      <button class="seg-b ${n==="group"?"on":""}" data-scope="group">집단 감독자·보조자</button>
    </div>
    <label>누구신가요?</label>
    <select id="key">${Ve(n)}</select>
    <label>PIN <span class="muted">(집단 초기 PIN은 0000)</span></label>
    <input id="pin" type="password" inputmode="numeric" placeholder="****" autocomplete="off" />
    <button class="primary" id="go">로그인</button>
    ${oe?'<button class="link" id="member-home">← 성원 화면</button>':""}
  `),t.key&&(document.getElementById("key").value=t.key),document.querySelectorAll(".seg-b").forEach(s=>s.onclick=()=>{n=s.dataset.scope,document.querySelectorAll(".seg-b").forEach(o=>o.classList.toggle("on",o===s)),document.getElementById("key").innerHTML=Ve(n)}),document.getElementById("go").onclick=()=>Tn(n,document.getElementById("key").value,document.getElementById("pin").value.trim());const a=document.getElementById("member-home");a&&(a.onclick=oe)}async function Tn(e,t,n){p("<h1>로그인 중…</h1>");try{const a=await fetch(`${Le}/auth/pin-login`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:e,key:t,pin:n})}),s=await a.json();if(!a.ok||!s.ok)return ie(Ln(s.error));const o=await Dt(Rt,s.customToken);m={scope:e,key:t,claims:(await o.user.getIdTokenResult()).claims,uid:o.user.uid},C()}catch(a){ie("오류: "+a.message)}}function Ln(e){return e==="INVALID_CREDENTIALS"?"PIN이 올바르지 않거나 자격이 없습니다.":e==="INVALID_PIN_FORMAT"?"PIN은 숫자 4~8자리입니다.":"로그인 실패: "+(e||"알 수 없음")}function A(){return m.scope==="group"?`${h[m.key]||m.key} 감독자·보조자`:pt[m.key]||m.key}function qe(){return(m.claims.noticeKeys||[]).filter(e=>e in H)}function ht(){return m.scope==="group"?m.key:(m.claims.groupKeys||[])[0]}function ce(){return m?.claims?.canWriteContacts===!0}function ft(){const e=fn(m?.claims||{},m?.scope||"",m?.key||"",h);return q.filter(t=>e.includes(t))}function we(){return m?.claims?.canManagePublications===!0}function ke(){if(we())return q.slice();const e=Array.isArray(m?.claims?.groupKeys)?m.claims.groupKeys:[],t=m?.scope==="group"?[m.key]:e;return q.filter(n=>t.includes(n))}function C(){J();const e=qe(),t=m.scope==="group",n=[];ke().length&&n.push(["📚 출판물 신청",we()?"전 집단 신청 부수 현황":"우리 집단 신청 부수","publications"]),e.includes("duty")&&n.push(["🧹 이 달의 봉사·청소 임명","명단·집단명 입력·수정","duty"]),e.length&&(n.push(["📝 광고 글 편집","제목·내용·표시 여부 수정","notice"]),n.push(["📎 첨부 이미지·PDF 관리","사진·PDF 추가 · 개별 삭제 · 교체","pdf"])),e.includes("mid")&&n.push(["🗓️ 평일 집회 프로그램","교재 업로드→편집→이름 배정","mwb"]),t&&(n.push(["📋 봉사 보고 현황","우리 집단 제출/미제출 확인","reports"]),n.push(["📢 우리 집단 소식","집단 성원에게 소식 게시","board"])),m.claims.canManageTalks&&n.push(["🎤 공개강연 계획","일자·회중·연사·연제 편집","talks"]),m.claims.canAssignTalkParts&&n.push(["🎤 공개강연 임명","사회·낭독·기도 배정","talkassign"]),m.claims.canManageVisits&&n.push(["🚗 집단 방문 계획","봉사 감독자 방문 편집","visits"]),m.claims.canReadCongReports&&n.push(["🗂️ 회중 봉사 보고 현황","전 집단 제출/미제출","secretary"]),m.claims.canWriteCongMembers&&(n.push(["👥 집단 성원 관리","명단 수정·비활성·추가·이동","members"]),n.push(["🧾 집단 편성표","전체 편성 보기·이동·출력·게시","roster"])),ft().length&&n.push(["☎️ 비상연락처·주소록",ce()?"전체 주소록 관리·엑셀 이관":"공유 주소록 열람","contacts"]),m.claims.canManagePins&&n.push(["🔑 회중 장로 PIN 설정","장로 공유 로그인 PIN 생성·변경","elderpin"]),m.scope==="role"&&m.key==="elder"||n.push(["🔑 내 PIN 변경","로그인 번호 변경","pin"]),p(`
    <p class="eyebrow">편집자</p>
    <h1>${c(A())}</h1>
    <div class="menu">${n.map(([s,o,i])=>`<button class="tool" data-go="${i}"><b>${c(s)}</b><span>${c(o)}</span></button>`).join("")}</div>
    ${oe?'<button class="link" id="member-home">← 성원 화면</button>':""}
    <button class="link" id="logout">로그아웃</button>
  `);const a=document.getElementById("member-home");a&&(a.onclick=oe),document.getElementById("logout").onclick=()=>{m=null,ie()},document.querySelectorAll(".tool").forEach(s=>s.onclick=()=>$t(s.dataset.go))}function $t(e){const n={pin:Z,elderpin:ee,notice:wt,duty:He,pdf:It,reports:Rn,board:re,talks:xt,talkassign:St,visits:he,secretary:Jn,members:fe,roster:ze,contacts:G,publications:Un,mwb:()=>{T.loaded=!1,le()}}[e];n?n():C()}function E(){const e=document.getElementById("back");e&&(e.onclick=C)}let T={weeks:[],loaded:!1};async function le(e=""){if(!T.loaded){p(`<p class="eyebrow">${c(A())}</p><h1>평일 집회 프로그램</h1><p class="lead muted">현재 임명표 불러오는 중…</p>`);try{const n=await D(g(d,"notices","mid"));T.weeks=n.exists()?Ht(n.data().body||""):[]}catch{T.weeks=[]}T.loaded=!0}const t=T.weeks;p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>평일 집회 프로그램</h1>
    <details class="mwb-add">
      <summary>➕ 교재로 새 주 추가 (기존 임명은 안 지워짐)</summary>
      <p class="muted">jw.org 「생활과 봉사 집회 교재」 <b>TXT(ZIP)</b> 업로드 또는 붙여넣기. <b>이미 있는 주는 건너뛰고 새 주만 추가</b>됩니다.</p>
      <input type="file" id="mwb-file" accept=".zip,.txt,text/plain" />
      <textarea id="mwb-paste" rows="4" placeholder="교재 텍스트 붙여넣기(선택)"></textarea>
      <button class="mwb-sm" id="load">추가</button>
    </details>
    <p class="muted">${t.length?`${t.length}개 주 · 편집·이름 배정 후 저장하세요.`:"아직 주가 없습니다. 위에서 교재를 추가하세요."}</p>
    ${t.map((n,a)=>`
      <div class="mwb-week">
        <div><b>${c(n.date||"(날짜 미상)")}</b> <span class="muted">${c(n.reading||"")}</span></div>
        <div class="muted">파트 ${n.sections.reduce((s,o)=>s+o.parts.length,0)}개 · 노래 ${c(n.openingSong||"?")}/${c(n.closingSong||"?")} · 사회자 ${c(n.chairman||"미정")}</div>
        <div class="mwb-row">
          <button class="mwb-sm" data-edit="${a}">편집·이름배정</button>
          <button class="mwb-sm danger" data-del="${a}">이 주 삭제</button>
        </div>
      </div>`).join("")}
    <button class="primary" id="save">성원 화면에 저장</button>
    <p id="msg" class="savemsg">${c(e)}</p>
    <button class="link" id="back">← 홈</button>
  `),document.getElementById("back").onclick=C,document.getElementById("mwb-file").onchange=Mn,document.getElementById("load").onclick=()=>vt(document.getElementById("mwb-paste").value),document.querySelectorAll("[data-edit]").forEach(n=>n.onclick=()=>xe(Number(n.dataset.edit))),document.querySelectorAll("[data-del]").forEach(n=>n.onclick=()=>{confirm("이 주를 삭제할까요?")&&(T.weeks.splice(Number(n.dataset.del),1),le())}),document.getElementById("save").onclick=_n}async function Mn(e){const t=e.target.files[0];if(!t)return;const n=document.getElementById("msg");n.textContent="읽는 중…";try{let a="";if(/\.zip$/i.test(t.name)){const s=new Uint8Array(await t.arrayBuffer()),{unzipSync:o,strFromU8:i}=await X(async()=>{const{unzipSync:r,strFromU8:u}=await import("./browser-BzBbrBKd.js");return{unzipSync:r,strFromU8:u}},[]),l=o(s);a=Object.keys(l).filter(r=>/\.txt$/i.test(r)).sort().map(r=>i(l[r])).join(`
`)}else a=await t.text();vt(a)}catch(a){n.innerHTML=`<span class="err">파일 읽기 실패: ${c(a.message)}</span>`}}function vt(e){const t=Jt(e),n=document.getElementById("msg");if(!t.length){n&&(n.innerHTML='<span class="err">프로그램을 인식하지 못했습니다. 교재 텍스트인지 확인하세요.</span>');return}const a=new Set(T.weeks.map(i=>i.date)),s=t.filter(i=>!a.has(i.date));T.weeks=[...T.weeks,...s].sort((i,l)=>be(i.date)-be(l.date));const o=t.length-s.length;le(`${s.length}개 주 추가${o?`, ${o}개는 이미 있어 건너뜀(기존 유지)`:""}.`)}function xe(e){const t=T.weeks[e];if(!t)return le();const n=(s,o,i)=>`
    <div class="mwb-part" data-si="${s}" data-pi="${o}">
      <input class="p-title" value="${c(i.title||"")}" placeholder="파트 제목" />
      <input class="p-min" value="${c(i.minutes||"")}" placeholder="시간" />
      <input class="p-name" value="${c(i.name||"")}" placeholder="배정 이름" />
      <button class="mwb-sm danger p-del">✕</button>
    </div>`;p(`
    <p class="eyebrow">평일 집회 · 편집</p>
    <h1>${c(t.date||"주 편집")}</h1>
    <label>날짜</label><input id="w-date" value="${c(t.date||"")}" />
    <label>주간 성경 읽기</label><input id="w-reading" value="${c(t.reading||"")}" />
    <div class="mwb-row">
      <div><label>시작 노래</label><input id="w-osong" class="w-song" value="${c(t.openingSong||"")}" /></div>
      <div><label>마침 노래</label><input id="w-csong" class="w-song" value="${c(t.closingSong||"")}" /></div>
    </div>
    <label>사회자</label><input id="w-chair" value="${c(t.chairman||"")}" />
    <label>시작하는 기도</label><input id="w-oprayer" value="${c(t.openingPrayer||"")}" />
    ${t.sections.map((s,o)=>`
      <div class="mwb-sec">
        <h3>${c(s.title)}${s.song?` · 노래 ${c(s.song)}`:""}</h3>
        ${s.parts.map((i,l)=>n(o,l,i)).join("")}
        <button class="mwb-sm" data-addsec="${o}">+ 파트 추가</button>
      </div>`).join("")}
    <label>마치는 기도</label><input id="w-cprayer" value="${c(t.closingPrayer||"")}" />
    <button class="primary" id="done">완료</button>
    <button class="link" id="back">← 주 목록</button>
  `);const a=()=>{Ie(e),le()};document.getElementById("done").onclick=a,document.getElementById("back").onclick=a,document.querySelectorAll(".p-del").forEach(s=>s.onclick=()=>{Ie(e);const o=s.closest(".mwb-part");t.sections[Number(o.dataset.si)].parts.splice(Number(o.dataset.pi),1),xe(e)}),document.querySelectorAll("[data-addsec]").forEach(s=>s.onclick=()=>{Ie(e),t.sections[Number(s.dataset.addsec)].parts.push({no:0,title:"",minutes:"",name:""}),xe(e)})}function Ie(e){const t=T.weeks[e],n=a=>document.getElementById(a);!t||!n("w-date")||(t.date=n("w-date").value.trim(),t.reading=n("w-reading").value.trim(),t.openingSong=n("w-osong").value.trim(),t.closingSong=n("w-csong").value.trim(),t.chairman=n("w-chair").value.trim(),t.openingPrayer=n("w-oprayer").value.trim(),t.closingPrayer=n("w-cprayer").value.trim(),document.querySelectorAll(".mwb-part").forEach(a=>{const s=t.sections[Number(a.dataset.si)],o=s&&s.parts[Number(a.dataset.pi)];o&&(o.title=a.querySelector(".p-title").value.trim(),o.minutes=a.querySelector(".p-min").value.trim(),o.name=a.querySelector(".p-name").value.trim())}))}async function _n(){const e=document.getElementById("msg");if(!T.weeks.length){e.textContent="저장할 주가 없습니다.";return}const t=document.getElementById("save");t.disabled=!0,e.textContent="저장 중…";try{let n={};try{const o=await D(g(d,"notices","mid"));o.exists()&&(n=o.data())}catch{}const a=Yt([...T.weeks].sort((o,i)=>be(o.date)-be(i.date)),new Date().getMonth()+1),s=Xt(a);if(s.length>2e4){e.innerHTML='<span class="err">전체 내용이 너무 깁니다(2만자 초과). 오래된 달을 정리하거나 나눠 저장하세요.</span>',t.disabled=!1;return}await S(g(d,"notices","mid"),{key:"mid",category:n.category||"now",title:n.title||"평일 집회 임명표",subtitle:"그리스도인 생활과 봉사 집회",body:s,order:n.order||0,visible:!0,updatedBy:m.uid,updatedAt:f()}),T.weeks=a,e.innerHTML=`✅ 저장 완료 — 총 ${a.length}개 주. 성원 화면에 반영됩니다.`}catch(n){e.innerHTML=`<span class="err">저장 실패: ${c(n.message)}</span>`}t.disabled=!1}function wt(){const e=qe().filter(t=>t!=="duty");p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>광고 글 편집</h1>
    <label>어느 광고를 편집할까요?</label>
    <select id="nkey">${e.map(t=>`<option value="${t}">${c(H[t])} (${t})</option>`).join("")}</select>
    <button class="primary" id="open">편집 열기</button>
    <button class="link" id="back">← 뒤로</button>
  `),E(),document.getElementById("open").onclick=()=>{const t=document.getElementById("nkey").value;return t==="duty"?He():nt(t)?ge(t):Dn(t)}}let R={data:null};async function He(e=""){p('<h1>이 달의 봉사·청소 임명</h1><p class="muted">불러오는 중…</p>');let t=null;try{const n=await D(g(d,"notices","duty"));n.exists()&&(t=n.data())}catch{}R.data=cn(t&&t.bodyJson)||on(),Se(e)}function Se(e=""){const t=R.data,n=t.sections.map((a,s)=>{const o=`<th>${c(a.rowLabel||" ")}</th>${a.cols.map((l,r)=>`<th><input class="duty-in duty-col" data-s="${s}" data-c="${r}" value="${c(l)}"></th>`).join("")}`,i=a.rows.map((l,r)=>`
      <tr>
        <td><input class="duty-in duty-cell" data-s="${s}" data-r="${r}" data-k="0" value="${c(l[0]||"")}"></td>
        ${a.cols.map((u,b)=>`<td><input class="duty-in duty-cell" data-s="${s}" data-r="${r}" data-k="${b+1}" value="${c(l[b+1]||"")}"></td>`).join("")}
        <td class="duty-del"><button class="mini del" data-delrow="${s}:${r}" title="행 삭제">✕</button></td>
      </tr>`).join("");return`
      <div class="duty-section">
        <input class="duty-in duty-title" data-s="${s}" value="${c(a.title)}" placeholder="구역/항목 이름">
        <div class="talk-edit-wrap">
          <table class="talk-edit duty-table">
            <thead><tr>${o}<th></th></tr></thead>
            <tbody>${i}</tbody>
          </table>
        </div>
        <button class="link" data-addrow="${s}">+ 행 추가</button>
      </div>`}).join("");p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>이 달의 봉사·청소 임명</h1>
    <p class="muted">각 칸에 <b>이름·집단명</b>을 입력하세요. 첫 칸은 월(또는 주/보조), 맨 윗줄은 항목 제목입니다.
      성원 화면·게시판에 표로 표시됩니다.</p>
    ${e?`<p class="savemsg">${c(e)}</p>`:""}
    <label>표 제목</label>
    <input class="duty-in duty-heading" value="${c(t.heading||"")}" placeholder="예: 2026년 회중업무 진행요원 임명">
    ${n}
    <button class="primary" id="saveDuty">전체 저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 뒤로</button>
  `),E(),document.querySelector(".duty-heading").oninput=a=>{R.data.heading=a.target.value},document.querySelectorAll(".duty-title").forEach(a=>a.oninput=()=>{R.data.sections[Number(a.dataset.s)].title=a.value}),document.querySelectorAll(".duty-col").forEach(a=>a.oninput=()=>{R.data.sections[Number(a.dataset.s)].cols[Number(a.dataset.c)]=a.value}),document.querySelectorAll(".duty-cell").forEach(a=>a.oninput=()=>{const s=Number(a.dataset.s),o=Number(a.dataset.r),i=Number(a.dataset.k);R.data.sections[s].rows[o][i]=a.value}),document.querySelectorAll("[data-addrow]").forEach(a=>a.onclick=()=>{const s=Number(a.dataset.addrow);R.data.sections[s].rows.push(new Array(R.data.sections[s].cols.length+1).fill("")),Se()}),document.querySelectorAll("[data-delrow]").forEach(a=>a.onclick=()=>{const[s,o]=a.dataset.delrow.split(":").map(Number);R.data.sections[s].rows.splice(o,1),Se()}),document.getElementById("saveDuty").onclick=jn}async function jn(){const e=document.getElementById("saveDuty"),t=document.getElementById("msg");e.disabled=!0,e.textContent="저장 중…";try{const n=R.data,a=(await D(g(d,"notices","duty"))).data()||{};await S(g(d,"notices","duty"),{...a,key:"duty",title:a.title||"이 달의 봉사·청소 임명",visible:!0,bodyJson:JSON.stringify(n),bodyHtml:ln(n),plainText:rn(n),body:"",updatedBy:m.uid,updatedAt:f()}),He("저장되었습니다. 성원 화면에 바로 반영됩니다.")}catch(n){e.disabled=!1,e.textContent="전체 저장",t.innerHTML=`<span class="err">저장 실패: ${c(n.message)}</span>`}}async function ge(e=qt,t=""){const n=H[e]||"회중 광고";p(`<h1>${c(n)}</h1><p class="muted">불러오는 중…</p>`);try{const a=await x(I(d,"notices",e,"items")),s=Kt(a.docs.map(o=>({id:o.id,...o.data()})));p(`
      <p class="eyebrow">${c(A())}</p>
      <h1>${c(n)} 관리</h1>
      ${t?`<p class="savemsg">${c(t)}</p>`:""}
      <p class="muted">새 글을 누적하고, 오래된 글은 숨김 처리합니다. 성원은 표시된 글만 볼 수 있습니다.</p>
      <div class="member-toolbar">
        <button class="primary" id="new-cong">+ 새 ${c(n)}</button>
        <button class="link" id="back">← 광고 선택</button>
      </div>
      <div class="notice-admin-list">
        ${s.map(o=>`
          <div class="notice-admin-row ${o.visible===!1?"is-hidden":""}">
            <div>
              <b>${o.pinned?"📌 ":""}${c(o.title||"(제목 없음)")}</b>
              ${o.visible===!1?'<span class="muted"> · 숨김</span>':""}
              ${o.urgent?'<span class="badge">긴급</span>':""}
              <br><span class="muted">${c(zt(o))}</span>
              ${o.expiresAt?`<br><span class="muted">게시 종료일 ${c(at(o.expiresAt))}</span>`:""}
            </div>
            <div class="member-actions">
              <button class="mini" data-edit="${c(o.id)}">수정</button>
              <button class="mini" data-toggle="${c(o.id)}">${o.visible===!1?"다시 표시":"성원에게 숨기기"}</button>
            </div>
          </div>`).join("")||`<p class="muted">아직 등록된 ${c(n)}이(가) 없습니다.</p>`}
      </div>
    `),document.getElementById("new-cong").onclick=()=>Ne(e,null),document.getElementById("back").onclick=wt,document.querySelectorAll("[data-edit]").forEach(o=>{o.onclick=()=>Ne(e,s.find(i=>i.id===o.dataset.edit))}),document.querySelectorAll("[data-toggle]").forEach(o=>{o.onclick=async()=>{const i=s.find(l=>l.id===o.dataset.toggle);if(i){if(i.visible===!1)return await V(g(d,"notices",e,"items",i.id),{visible:!0,deletedAt:Gt(),updatedAt:f(),updatedBy:m.uid}),ge(e,"다시 표시했습니다.");confirm("이 글을 성원에게 숨길까요?")&&(await V(g(d,"notices",e,"items",i.id),Vt(m.uid,f())),ge(e,"숨김 처리했습니다."))}}})}catch(a){p(`<h1>${c(n)} 관리</h1><p class="err">${c(a.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}async function Ne(e,t){const n=H[e]||"회중 광고",a=!!t?.id,s=t?.id||g(I(d,"notices",e,"items")).id,o=e==="branch"?Qt():null,i=at(t?.expiresAt||o);p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>${a?`${c(n)} 수정`:`새 ${c(n)}`}</h1>
    <label>제목</label>
    <input id="title" value="${c(t?.title||"")}" />
    <label>부제 (선택)</label>
    <input id="subtitle" value="${c(t?.subtitle||"")}" />
    <label>내용</label>
    <div id="rich-editor" class="rich-editor"></div>
    <textarea id="body" class="editor-fallback">${c(t?.plainText||t?.body||"")}</textarea>
    <label class="chk"><input type="checkbox" id="visible" ${t?.visible!==!1?"checked":""}/> 성원에게 표시</label>
    <label class="chk"><input type="checkbox" id="urgent" ${t?.urgent?"checked":""}/> 긴급 (빨간 강조)</label>
    <label class="chk"><input type="checkbox" id="pinned" ${t?.pinned?"checked":""}/> 목록 상단 고정</label>
    <label>게시 종료일</label>
    <input type="date" id="expires" value="${c(i)}" />
    <p class="muted">종료일이 지나면 성원 화면 목록에서 자동으로 보이지 않습니다. 지부 서신은 기본 2개월 후로 잡힙니다.</p>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <div id="item-pages"></div>
    <button class="link" id="back">← ${c(n)} 목록</button>
  `),document.getElementById("back").onclick=()=>ge(e);let l=null;try{const{mountRichNoticeEditor:r}=await X(async()=>{const{mountRichNoticeEditor:u}=await import("./rich-editor-BAnJyzlj.js");return{mountRichNoticeEditor:u}},[]);l=r({root:document.getElementById("rich-editor"),content:t?.bodyJson?z(t):t?.bodyHtml||z(t||{})}),ne=l,document.getElementById("body").hidden=!0}catch{document.getElementById("rich-editor").innerHTML='<p class="err">문서 편집기를 불러오지 못했습니다. 기본 입력창으로 저장합니다.</p>'}a?Oe(e,s):document.getElementById("item-pages").innerHTML='<p class="muted">이미지 첨부는 먼저 저장한 뒤 사용할 수 있습니다.</p>',document.getElementById("save").onclick=async()=>{const r=document.getElementById("msg"),u=l?l.getValue():{html:"",json:z({body:document.getElementById("body").value}),text:document.getElementById("body").value};try{const b=Zt({parentKey:e,title:document.getElementById("title").value,subtitle:document.getElementById("subtitle").value,editorValue:u,visible:document.getElementById("visible").checked,urgent:document.getElementById("urgent").checked,pinned:document.getElementById("pinned").checked,expiresAt:en(document.getElementById("expires").value),createdAt:t?.createdAt},m.uid,f());if(document.getElementById("save").disabled=!0,r.textContent="저장 중…",await S(g(d,"notices",e,"items",s),b),r.textContent="저장되었습니다.",document.getElementById("save").disabled=!1,!a)return Ne(e,{id:s,...b})}catch(b){document.getElementById("save").disabled=!1,r.innerHTML=`<span class="err">저장 실패: ${c(b.message)}</span>`}}}async function Oe(e,t){const n=document.getElementById("item-pages");if(n){n.innerHTML='<p class="muted">첨부 이미지 확인 중…</p>';try{const a=await x(I(d,"notices",e,"items",t,"pages")),s=ot(a.docs.map(o=>({id:o.id,...o.data()})));n.innerHTML=`
      <h2 class="sec">첨부 이미지</h2>
      <input type="file" id="cong-image" accept="image/*" multiple hidden />
      <button class="primary soft" id="add-cong-image">🖼️ 사진/이미지 추가</button>
      <div class="thumbs existing-thumbs">${s.map(o=>`
        <div class="thumb">
          <img src="${c(o.dataUrl)}" alt="첨부 이미지 ${c(o.index||o.id)}" />
          <span>${c(o.index||o.id)}번 · ${Math.round(String(o.dataUrl||"").length/1024)}KB</span>
          <button class="mini del" data-del-page="${c(o.id)}">이 이미지 제거</button>
        </div>`).join("")||'<p class="muted">첨부 이미지가 없습니다.</p>'}</div>`,document.getElementById("add-cong-image").onclick=()=>document.getElementById("cong-image").click(),document.getElementById("cong-image").onchange=o=>o.target.files.length&&Cn(e,t,[...o.target.files]),n.querySelectorAll("[data-del-page]").forEach(o=>{o.onclick=async()=>{await O(g(d,"notices",e,"items",t,"pages",o.dataset.delPage)),Oe(e,t)}})}catch(a){n.innerHTML=`<p class="err">첨부 이미지 확인 실패: ${c(a.message)}</p>`}}}async function Cn(e,t,n){const a=document.getElementById("item-pages");try{const s=await x(I(d,"notices",e,"items",t,"pages"));let o=it(s.docs.map(i=>({id:i.id,...i.data()})));for(const i of n){const{dataUrl:l}=await ct(i);await S(g(d,"notices",e,"items",t,"pages",String(o)),{index:o,dataUrl:l,updatedBy:m.uid}),o+=1}await V(g(d,"notices",e,"items",t),{updatedAt:f(),updatedBy:m.uid}),Oe(e,t)}catch(s){a.innerHTML=`<p class="err">이미지 추가 실패: ${c(s.message)}</p>`}}async function Dn(e){p(`<h1>${c(H[e]||e)}</h1><p class="muted">불러오는 중…</p>`);let t={};try{const a=await D(g(d,"notices",e));t=a.exists()?a.data():{key:e}}catch{t={key:e}}p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>${c(H[e]||e)} 편집</h1>
    <label>제목</label>
    <input id="title" value="${c(t.title||"")}" />
    <label>부제 (선택)</label>
    <input id="subtitle" value="${c(t.subtitle||"")}" />
    <label>내용</label>
    <div id="rich-editor" class="rich-editor"></div>
    <textarea id="body" class="editor-fallback">${c(t.plainText||t.body||"")}</textarea>
    <label class="chk"><input type="checkbox" id="visible" ${t.visible!==!1?"checked":""}/> 성원에게 표시</label>
    <label class="chk"><input type="checkbox" id="urgent" ${t.urgent?"checked":""}/> 긴급 (빨간 강조)</label>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="manage-images">📎 첨부 이미지·PDF 관리 (추가·삭제·교체)</button>
    <button class="link" id="back">← 뒤로</button>
  `),E(),document.getElementById("manage-images").onclick=()=>{j=e,It()};let n=null;try{const{mountRichNoticeEditor:a}=await X(async()=>{const{mountRichNoticeEditor:s}=await import("./rich-editor-BAnJyzlj.js");return{mountRichNoticeEditor:s}},[]);n=a({root:document.getElementById("rich-editor"),content:t.bodyJson?z(t):t.bodyHtml||z(t)}),ne=n,document.getElementById("body").hidden=!0}catch{const s=document.getElementById("rich-editor");s.innerHTML='<p class="err">문서 편집기를 불러오지 못했습니다. 기본 입력창으로 저장합니다.</p>'}document.getElementById("save").onclick=async()=>{const a=document.getElementById("msg"),s=document.getElementById("title").value.trim();if(!s){a.textContent="제목을 입력하세요.";return}const o=n?n.getValue():{html:"",json:z({body:document.getElementById("body").value}),text:document.getElementById("body").value},i={key:e,category:t.category||"now",title:s,subtitle:document.getElementById("subtitle").value.trim(),...Wt(o),order:t.order||0,visible:document.getElementById("visible").checked,urgent:document.getElementById("urgent").checked,updatedAt:f(),updatedBy:m.uid};t.attachmentUrl&&(i.attachmentUrl=t.attachmentUrl),typeof t.pageCount=="number"&&(i.pageCount=t.pageCount),document.getElementById("save").disabled=!0,a.textContent="저장 중…";try{await S(g(d,"notices",e),i),a.innerHTML="✅ 저장되었습니다.",document.getElementById("save").disabled=!1}catch(l){document.getElementById("save").disabled=!1,a.innerHTML=`<span class="err">저장 실패: ${c(l.message)}</span>`}}}async function Rn(){const e=ht();p('<h1>봉사 보고 현황</h1><p class="muted">불러오는 중…</p>');try{const n=((await D(g(d,"config","app"))).data()||{}).reportPeriod||"",a=await x(I(d,"groups",e,"members")),s=[];a.forEach(y=>{const v=y.data();v.active!==!1&&s.push({id:y.id,...v})}),s.sort((y,v)=>(y.seq||0)-(v.seq||0));const o=new Set,i={};n&&(await x(I(d,"reports",n,"groups",e,"members"))).forEach(v=>{o.add(v.id),i[v.id]={id:v.id,...v.data()}});const l=s.filter(y=>!o.has(y.id)),r=/^(\d{4})-(\d{2})$/.exec(n),u=r?`${r[1]}년 ${Number(r[2])}월`:n||"(보고월 미설정)",b=s.map(y=>{const v=o.has(y.id);return`<div class="rrow ${v?"":"miss"}"><span>${c(y.name)}</span><span class="${v?"okb":"missb"}">${v?"제출 ✓":"미제출"}</span></div>`}).join(""),w=s.map(y=>{const v=o.has(y.id);return`<div class="rrow report-row ${v?"":"miss"}">
        <span class="report-member">
          <b>${c(y.name)}</b>
          ${v?kt(i[y.id]):'<small class="muted">아직 보고가 없습니다.</small>'}
        </span>
        <span class="${v?"okb":"missb"}">${v?"제출 완료":"미제출"}</span>
      </div>`}).join("");p(`
      <p class="eyebrow">${c(h[e]||e)} 감독자·보조자</p>
      <h1>봉사 보고 현황</h1>
      <p class="sum">${c(u)} · 제출 <b>${o.size}</b> / 성원 ${s.length} · 미제출 <b>${l.length}</b></p>
      ${l.length?`<button class="primary" id="copy">미제출자 이름 복사 (${l.length})</button>`:""}
      <div class="rlist">${w||'<p class="muted">명단이 없습니다.</p>'}</div>
      <button class="link" id="back">← 뒤로</button>
    `),E();const B=document.getElementById("copy");B&&(B.onclick=async()=>{try{await navigator.clipboard.writeText(l.map(y=>y.name).join(", ")),B.textContent="복사됨 ✓"}catch{B.textContent=l.map(y=>y.name).join(", ")}})}catch(t){p(`<h1>봉사 보고 현황</h1><p class="err">${c(t.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}function kt(e={}){const t=e.participated===!0,n=Number(e.bibleStudies)||0,a=Number(e.hours)||0,s=e.pioneerType||(e.auxiliaryPioneer?"auxiliary":""),o={regular:"정규 파이오니아",auxiliary:"보조 파이오니아",special:"특별 파이오니아"}[s]||"",i=[t?"봉사 참여":"봉사 참여 없음",`성서 연구 ${n}건`];(o||a)&&i.push(`${o||"시간 보고"} ${a}시간`);const l=Et(e.submittedAt);l&&i.push(`제출 ${l}`);const r=String(e.memo||"").trim();return r&&i.push(`메모: ${r.slice(0,80)}`),`<small class="report-detail">${i.map(c).join(" · ")}</small>`}function Et(e){let t=null;if(e?.toDate)t=e.toDate();else if(e instanceof Date)t=e;else if(typeof e=="string"||typeof e=="number"){const n=new Date(e);Number.isNaN(n.getTime())||(t=n)}return t?t.toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"}):""}async function re(e=""){const t=ht();p('<h1>우리 집단 소식</h1><p class="muted">불러오는 중…</p>');let n=[],a="";try{(await x($e(I(d,"boards",t,"posts"),ve("sort","desc")))).forEach(l=>n.push({id:l.id,...l.data()}))}catch{}try{const i=await D(g(d,"boards",t));i.exists()&&(a=(i.data().news||"").trim())}catch{}const s=n.map(i=>`
    <div class="rrow"><span>${c(i.title||"(제목 없음)")}</span>
      <span><button class="mini" data-edit="${c(i.id)}">수정</button> <button class="mini del" data-del="${c(i.id)}">삭제</button></span>
    </div>`).join("");p(`
    <p class="eyebrow">${c(h[t]||t)} 감독자·보조자</p>
    <h1>우리 집단 소식</h1>
    <p class="muted">우리 집단 성원에게만 보입니다. 여러 게시물을 올리면 성원이 선택해서 봅니다.</p>
    ${e?`<p class="savemsg">${c(e)}</p>`:""}
    <button class="primary" id="add">+ 새 게시물</button>
    <div class="rlist">${s||'<p class="muted">등록된 게시물이 없습니다.</p>'}</div>
    ${a?`<div class="legacy-news"><p class="muted">이전 단일 소식(구버전):</p>
      <div class="body">${c(a).replace(/\r?\n/g,"<br>")}</div>
      <button class="link" id="clearlegacy">이 소식 삭제</button></div>`:""}
    <button class="link" id="back">← 뒤로</button>
  `),E(),document.getElementById("add").onclick=()=>We(t,null),document.querySelectorAll("[data-edit]").forEach(i=>i.onclick=()=>We(t,n.find(l=>l.id===i.dataset.edit))),document.querySelectorAll("[data-del]").forEach(i=>i.onclick=async()=>{confirm("이 게시물을 삭제할까요?")&&(await O(g(d,"boards",t,"posts",i.dataset.del)),re("삭제되었습니다."))});const o=document.getElementById("clearlegacy");o&&(o.onclick=async()=>{confirm("이전 단일 소식을 삭제할까요?")&&(await S(g(d,"boards",t),{groupKey:t,news:"",updatedBy:m.uid}),re("이전 소식을 삭제했습니다."))})}function We(e,t){const n=!!t;p(`
    <p class="eyebrow">${c(h[e]||e)} 감독자·보조자</p>
    <h1>${n?"게시물 수정":"새 게시물"}</h1>
    <label>제목</label>
    <input id="p_title" value="${c(t&&t.title||"")}" placeholder="예: 7월 6주 · 여호와의 친구가 되세요" />
    <label>내용</label>
    <textarea id="p_body" placeholder="게시물 내용">${c(t&&t.body||"")}</textarea>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back2">← 목록</button>
  `),document.getElementById("back2").onclick=()=>re(),document.getElementById("save").onclick=async()=>{const a=document.getElementById("p_title").value.trim(),s=document.getElementById("p_body").value,o=document.getElementById("msg");if(!a){o.textContent="제목을 입력하세요.";return}document.getElementById("save").disabled=!0,o.textContent="저장 중…";try{const i=new Date,l=n?t.id:"P"+i.getFullYear()+String(i.getMonth()+1).padStart(2,"0")+String(i.getDate()).padStart(2,"0")+Math.floor(performance.now()),r=n&&typeof t.sort=="number"?t.sort:+`${i.getFullYear()}${String(i.getMonth()+1).padStart(2,"0")}${String(i.getDate()).padStart(2,"0")}`;await S(g(d,"boards",e,"posts",l),{title:a,body:s,sort:r,createdAt:t&&t.createdAt||f(),updatedAt:f(),updatedBy:m.uid}),re("저장되었습니다.")}catch(i){document.getElementById("save").disabled=!1,o.innerHTML=`<span class="err">저장 실패: ${c(i.message)}</span>`}}}function It(){const e=qe().filter(o=>!nt(o));if(!e.length){p(`
      <p class="eyebrow">${c(A())}</p>
      <h1>첨부 이미지·PDF 관리</h1>
      <p class="muted">회중 광고·지부 서신·새 소식의 첨부는 광고 글 편집 → 각 목록에서 글마다 추가·삭제하세요.</p>
      <button class="link" id="back">← 뒤로</button>
    `),E();return}p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>첨부 이미지·PDF 관리</h1>
    <p class="muted">사진·PDF를 본문 아래에 첨부하고, <b>이미지별로 삭제·교체</b>할 수 있습니다.
    PDF에 장로용 부분이 있으면 <b>회중용 페이지만 선택</b>하세요.</p>
    <label>어느 광고에?</label>
    <select id="nkey">${e.map(o=>`<option value="${o}" ${o===j?"selected":""}>${c(H[o])} (${o})</option>`).join("")}</select>
    <input type="file" id="file" accept="application/pdf" hidden />
    <input type="file" id="imageFile" accept="image/*" multiple hidden />
    <button class="primary" id="pick">📄 PDF 선택</button>
    <button class="primary soft" id="pickImage">🖼️ 사진/이미지 추가</button>
    <button class="link" id="remove">선택한 광고의 게시 이미지 모두 제거</button>
    <div id="existing"></div>
    <div id="work"></div>
    <button class="link" id="back">← 뒤로</button>
  `),E();const t=document.getElementById("file"),n=document.getElementById("imageFile"),a=document.getElementById("nkey"),s=()=>Fe(a.value);s(),a.onchange=s,document.getElementById("pick").onclick=()=>{j=document.getElementById("nkey").value,t.click()},t.onchange=()=>t.files[0]&&pa(t.files[0]),document.getElementById("pickImage").onclick=()=>{j=document.getElementById("nkey").value,n.click()},n.onchange=()=>n.files.length&&qn([...n.files]),document.getElementById("remove").onclick=async()=>{const o=document.getElementById("nkey").value,i=document.getElementById("work");i.innerHTML='<p class="muted">제거 중…</p>';try{const l=await x(I(d,"notices",o,"pages"));for(const r of l.docs)await O(r.ref);await Ee(o),i.innerHTML=`<p class="muted">✅ '${c(H[o]||o)}' 게시 이미지 ${l.size}개 제거됨.</p>`,s()}catch(l){i.innerHTML=`<p class="err">제거 실패: ${c(l.message)}</p>`}}}async function Fe(e=j){const t=document.getElementById("existing");if(!(!t||!e)){t.innerHTML='<p class="muted">게시 이미지 확인 중…</p>';try{const n=await x(I(d,"notices",e,"pages")),a=ot(n.docs.map(s=>({id:s.id,...s.data()})));if(!a.length){t.innerHTML='<p class="muted">현재 게시된 이미지가 없습니다.</p>';return}t.innerHTML=`
      <p class="muted">현재 게시 이미지 ${a.length}개</p>
      <div class="thumbs existing-thumbs">${a.map(s=>`
        <div class="thumb">
          <img src="${c(s.dataUrl)}" alt="게시 이미지 ${c(s.index||s.id)}" />
          <span>${c(s.index||s.id)}번 · ${Math.round(String(s.dataUrl||"").length/1024)}KB</span>
          <button class="mini del image-remove" data-id="${c(s.id)}">이 이미지 제거</button>
        </div>`).join("")}</div>`,t.querySelectorAll("[data-id]").forEach(s=>{s.onclick=async()=>{await O(g(d,"notices",e,"pages",s.dataset.id)),await Ee(e),Fe(e)}})}catch(n){t.innerHTML=`<p class="err">게시 이미지 확인 실패: ${c(n.message)}</p>`}}}async function qn(e){const t=j||document.getElementById("nkey").value,n=document.getElementById("work");n.innerHTML=`<p class="muted">이미지 압축 중… 0/${e.length}</p>`;try{const a=await x(I(d,"notices",t,"pages"));let s=it(a.docs.map(l=>({id:l.id,...l.data()}))),o=0;for(const l of e){n.querySelector("p").textContent=`이미지 압축 중… ${o+1}/${e.length} (${l.name})`;const{dataUrl:r}=await ct(l);await S(g(d,"notices",t,"pages",String(s)),{index:s,dataUrl:r,updatedBy:m.uid}),s+=1,o+=1}n.innerHTML=`<p class="muted">✅ 이미지 ${o}개 추가 완료 — 성원 화면 본문 아래에 표시됩니다.</p>`,await Ee(t),Fe(t);const i=document.getElementById("imageFile");i&&(i.value="")}catch(a){n.innerHTML=`<p class="err">이미지 추가 실패: ${c(a.message)}</p>`}}const Bt=[["chairman","사회"],["watchtowerReader","낭독"],["closingPrayer","기도"]],Hn=[["","일반"],["circuit","순회감독자 강연"],["special","특별강연"],["convention","지역대회"],["assembly","순회대회"]],Je={circuit:"순회방문",special:"특별",convention:"지역대회",assembly:"순회대회"};function ye(e){return e==="convention"||e==="assembly"}function Ye(e){return(e&&e.talkType)==="circuit"?[["chairman","사회"]]:Bt}const On={circuit:{speakerName:"순회감독자"},special:{title:"특별공개강연"},convention:{title:"지역대회"},assembly:{title:"순회대회"}};let N={rows:[],removed:[]};async function xt(e=""){p('<h1>공개강연 계획</h1><p class="muted">불러오는 중…</p>'),N={rows:[],removed:[]};try{(await x($e(I(d,"talks"),ve("date")))).forEach(n=>N.rows.push({id:n.id,...n.data()}))}catch{}me(e)}function me(e=""){const t=N.rows.filter(s=>de(s.talkNo,s.date)).length,n=N.rows.map((s,o)=>`
    <tr>
      <td><input class="tk-in" data-i="${o}" data-f="date" value="${c(s.date||"")}" placeholder="2026-07-05"></td>
      <td><select class="tk-type" data-i="${o}">${Hn.map(([i,l])=>`<option value="${i}"${(s.talkType||"")===i?" selected":""}>${c(l)}</option>`).join("")}</select></td>
      <td><input class="tk-in" data-i="${o}" data-f="speakerCong" value="${c(s.speakerCong||"")}" placeholder="회중"></td>
      <td><input class="tk-in" data-i="${o}" data-f="speakerName" value="${c(s.speakerName||"")}" placeholder="연사"></td>
      <td><input class="tk-in tk-no${de(s.talkNo,s.date)?" tk-retired":""}" data-i="${o}" data-f="talkNo" value="${c(s.talkNo||"")}" placeholder="번호" inputmode="numeric"${ye(s.talkType)?" disabled":""}></td>
      <td><input class="tk-in tk-title" data-i="${o}" data-f="title" value="${c(s.title||"")}" placeholder="${s.talkType?"연제 직접 입력":"번호 입력 시 자동 완성"}">
        <div class="tk-warn" data-i="${o}"${de(s.talkNo,s.date)?"":" hidden"}>⚠️ ${Ge.replace(/-/g,".")}부터 사용 중지된 골자입니다 (45분 골자)</div></td>
      <td class="tk-delcell"><button class="mini del" data-del="${o}" title="행 삭제">✕</button></td>
    </tr>`).join("");p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>공개강연 계획</h1>
    <p class="muted"><b>번호</b>를 입력하면 <b>연제</b>가 자동 완성됩니다. 예외 일정은 <b>종류</b>를 선택하세요
      (순회감독자 강연·특별강연=연제 직접 입력, 지역대회·순회대회=회중 강연 없음).<br>
      사회·낭독·기도는 회중 조정자가 배정합니다.</p>
    ${t?`<p class="warnbox">⚠️ <b>${t}건</b>이 ${c(Ge.replace(/-/g,"."))}부터
      <b>사용 중지된 45분 골자</b>입니다. 다른 강연으로 조정해 주세요.</p>`:""}
    ${e?`<p class="savemsg">${c(e)}</p>`:""}
    <div class="talk-edit-wrap">
      <table class="talk-edit">
        <thead><tr><th>일자</th><th>종류</th><th>회중명</th><th>연사</th><th>번호</th><th>연 제</th><th></th></tr></thead>
        <tbody>${n||""}</tbody>
      </table>
    </div>
    <button class="link" id="addrow">+ 행 추가</button>
    <button class="primary" id="saveAll">전체 저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 뒤로</button>
  `),E();const a=s=>{const o=N.rows[s],i=de(o.talkNo,o.date),l=document.querySelector(`.tk-warn[data-i="${s}"]`);l&&(l.hidden=!i);const r=document.querySelector(`.tk-no[data-i="${s}"]`);r&&r.classList.toggle("tk-retired",i)};document.querySelectorAll(".tk-in").forEach(s=>{s.oninput=()=>{const o=Number(s.dataset.i),i=s.dataset.f;if(N.rows[o][i]=s.value,i==="talkNo"){const l=Ut(s.value);if(l){N.rows[o].title=l;const r=document.querySelector(`.tk-title[data-i="${o}"]`);r&&(r.value=l)}}(i==="talkNo"||i==="date")&&a(o)}}),document.querySelectorAll(".tk-type").forEach(s=>{s.onchange=()=>{const o=Number(s.dataset.i),i=s.value;N.rows[o].talkType=i;const l=On[i];if(l)for(const[r,u]of Object.entries(l))String(N.rows[o][r]||"").trim()||(N.rows[o][r]=u);me()}}),document.getElementById("addrow").onclick=()=>{N.rows.push({date:"",speakerCong:"",speakerName:"",talkNo:"",title:"",talkType:"",chairman:"",watchtowerReader:"",closingPrayer:""}),me()},document.querySelectorAll("[data-del]").forEach(s=>s.onclick=()=>{const o=Number(s.dataset.del),i=N.rows[o];i&&i.id&&N.removed.push(i.id),N.rows.splice(o,1),me()}),document.getElementById("saveAll").onclick=Fn}async function Fn(){const e=document.getElementById("saveAll"),t=document.getElementById("msg");e.disabled=!0,e.textContent="저장 중…";try{let n=0;for(const a of N.rows){const s=String(a.date||"").trim();if(!s)continue;const o=a.id||"T"+s.replace(/\D/g,"")+Math.floor(performance.now())+n++;await S(g(d,"talks",o),{id:o,date:s,speakerCong:String(a.speakerCong||"").trim(),speakerName:String(a.speakerName||"").trim(),talkNo:ye(a.talkType)?"":String(a.talkNo||"").trim().replace(/\.$/,""),title:String(a.title||"").trim(),talkType:String(a.talkType||"").trim(),chairman:a.chairman||"",watchtowerReader:a.watchtowerReader||"",closingPrayer:a.closingPrayer||"",updatedBy:m.uid,updatedAt:f()}),a.id=o}for(const a of N.removed)await O(g(d,"talks",a));N.removed=[],xt("저장되었습니다.")}catch(n){e.disabled=!1,e.textContent="전체 저장",t.innerHTML=`<span class="err">저장 실패: ${c(n.message)}</span>`}}async function St(e=""){p('<h1>공개강연 임명</h1><p class="muted">불러오는 중…</p>');let t=[];try{(await x($e(I(d,"talks"),ve("date")))).forEach(i=>t.push({id:i.id,...i.data()}))}catch{}const n=o=>{const i=Je[o.talkType]||(o.talkNo?c(o.talkNo):"★"),l=c(Ft(o.talkNo,o.title)||Je[o.talkType]||"(제목 미정)");return`<button class="tk-chip${o.talkType?" tk-chip-x":""}" data-tip type="button">${i}<span class="tk-tip">${l}</span></button>`},a=t.map(o=>{if(ye(o.talkType))return`<tr class="ta-nomeet">
        <td class="ta-date">${c(Xe(o.date))}</td>
        <td colspan="4">${n(o)} <span class="muted">— 회중 공개강연 없음</span></td>
      </tr>`;const i=Ye(o),l=Bt.map(([r])=>i.some(([u])=>u===r)?`<td><input class="ta-in" id="a_${c(o.id)}_${r}" value="${c(o[r]||"")}" placeholder="이름"></td>`:'<td class="ta-na">—</td>').join("");return`<tr data-id="${c(o.id)}">
      <td class="ta-date">${c(Xe(o.date))}</td>
      <td class="ta-no">${n(o)}</td>
      ${l}
    </tr>`}).join("");p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>공개강연 임명</h1>
    <p class="muted"><b>강연 번호</b>만 표시됩니다. 번호를 <b>탭</b>하면 제목이 뜹니다. 사회·낭독·기도만 배정하세요.</p>
    ${e?`<p class="savemsg">${c(e)}</p>`:""}
    <div class="talk-assign-wrap">
      <table class="talk-assign-tbl">
        <thead><tr><th>일자</th><th>강연</th><th>사회</th><th>낭독</th><th>기도</th></tr></thead>
        <tbody>${a||'<tr><td colspan="5" class="muted">계획된 강연이 없습니다.</td></tr>'}</tbody>
      </table>
    </div>
    ${t.length?'<button class="primary" id="saveAll">전체 저장</button>':""}
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 뒤로</button>
  `),E(),document.querySelectorAll(".tk-chip[data-tip]").forEach(o=>o.onclick=i=>{i.stopPropagation();const l=o.classList.contains("show");document.querySelectorAll(".tk-chip.show").forEach(r=>r.classList.remove("show")),l||o.classList.add("show")}),document.addEventListener("click",()=>document.querySelectorAll(".tk-chip.show").forEach(o=>o.classList.remove("show")),{once:!0});const s=document.getElementById("saveAll");s&&(s.onclick=async()=>{s.disabled=!0,s.textContent="저장 중…";const o=document.getElementById("msg");let i=0;try{for(const l of t){if(ye(l.talkType))continue;const r={};let u=!1;Ye(l).forEach(([b])=>{const w=document.getElementById(`a_${l.id}_${b}`);if(!w)return;const B=w.value.trim();r[b]=B,B!==(l[b]||"")&&(u=!0)}),u&&(await V(g(d,"talks",l.id),{...r,updatedBy:m.uid,updatedAt:f()}),i++)}St(`${i}건 저장되었습니다.`)}catch(l){s.disabled=!1,s.textContent="전체 저장",o.innerHTML=`<span class="err">저장 실패: ${c(l.message)}</span>`}})}function Xe(e){const t=/^\d{4}-(\d{2})-(\d{2})/.exec(String(e||""));return t?`${Number(t[1])}/${Number(t[2])}`:String(e||"")}async function he(e=""){p('<h1>집단 방문 계획</h1><p class="muted">불러오는 중…</p>');let t=[];try{(await x($e(I(d,"visits"),ve("date")))).forEach(s=>t.push({id:s.id,...s.data()}))}catch{}const n=t.map(a=>`
    <div class="rrow"><span>${c(h[a.groupKey]||a.groupKey)} · ${c(a.date||"")}<br>
      <span class="muted">${c(a.withService||"")} ${c(a.memo||"")}</span></span>
      <span><button class="mini" data-edit="${c(a.id)}">수정</button> <button class="mini del" data-del="${c(a.id)}">삭제</button></span>
    </div>`).join("");p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>집단 방문 계획</h1>
    ${e?`<p class="savemsg">${c(e)}</p>`:""}
    <button class="primary" id="add">+ 새 방문 추가</button>
    <div class="rlist">${n||'<p class="muted">등록된 방문 계획이 없습니다.</p>'}</div>
    <button class="link" id="back">← 뒤로</button>
  `),E(),document.getElementById("add").onclick=()=>Qe(null),document.querySelectorAll("[data-edit]").forEach(a=>a.onclick=()=>Qe(t.find(s=>s.id===a.dataset.edit))),document.querySelectorAll("[data-del]").forEach(a=>a.onclick=async()=>{confirm("이 방문 계획을 삭제할까요?")&&(await O(g(d,"visits",a.dataset.del)),he("삭제되었습니다."))})}function Qe(e){const t=!!e,n=Object.keys(h).map(a=>`<option value="${a}" ${e&&e.groupKey===a?"selected":""}>${c(h[a])}</option>`).join("");p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>${t?"방문 수정":"새 방문"}</h1>
    <label>대상 집단</label><select id="gk">${n}</select>
    <label>날짜 (예: 2026-08-01)</label><input id="date" value="${c(e&&e.date||"")}" />
    <label>함께 할 봉사</label><input id="ws" value="${c(e&&e.withService||"")}" />
    <label>메모</label><textarea id="memo">${c(e&&e.memo||"")}</textarea>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back2">← 목록</button>
  `),document.getElementById("back2").onclick=()=>he(),document.getElementById("save").onclick=async()=>{const a=document.getElementById("gk").value,s=document.getElementById("date").value.trim();if(!s){document.getElementById("msg").textContent="날짜를 입력하세요.";return}const o=t?e.id:"V"+a+s.replace(/\D/g,"")+Math.floor(performance.now()),i={id:o,groupKey:a,date:s,withService:document.getElementById("ws").value.trim(),memo:document.getElementById("memo").value.trim(),updatedBy:m.uid};try{await S(g(d,"visits",o),i),he("저장되었습니다.")}catch(l){document.getElementById("msg").innerHTML=`<span class="err">${c(l.message)}</span>`}}}let Ae=[],Pe=0;function J(){Pe+=1,Ae.forEach(e=>{try{e()}catch{}}),Ae=[]}async function Un(e=""){J();const t=ke();if(!t.length){p('<h1>출판물 신청</h1><p class="err">출판물 신청 관리 권한이 없습니다.</p><button class="link" id="back">← 뒤로</button>'),E();return}if(we()&&t.length>1){Te(e);return}Ue(t[0],e)}async function Te(e=""){J(),p('<h1>출판물 신청</h1><p class="muted">전 집단 현황을 불러오는 중…</p>');try{const t=ke(),n=[];for(const s of t){const{members:o}=await Q(s);n.push({groupKey:s,members:o,pubDoc:se(null)})}const a=++Pe;Ze(n,e),t.forEach((s,o)=>{const i=Ot(g(d,"groups",s,"publicationDistributions",De),l=>{a===Pe&&(n[o].pubDoc=se(l.exists()?l.data():null),Ze(n))},()=>{});Ae.push(i)})}catch(t){p(`<h1>출판물 신청</h1><p class="err">${c(t.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}function Ze(e,t=""){const n=W.map(o=>({label:o.label,copies:0})),a=e.map(o=>{const i=ut(o.pubDoc,o.members);return i.rows.forEach((l,r)=>{n[r].copies+=l.copies}),{groupKey:o.groupKey,summary:i}}),s=n.reduce((o,i)=>o+i.copies,0);p(`
    <p class="eyebrow">봉사 감독자 · 실시간</p>
    <h1>출판물 신청 부수</h1>
    ${t?`<p class="savemsg">${c(t)}</p>`:""}
    <div class="pub-total">
      <b>회중 전체 ${s}부</b>
      <div class="pub-total-items">${n.map(o=>`<span>${c(o.label)} <b>${o.copies}</b></span>`).join("")}</div>
    </div>
    <table class="pub-overview">
      <thead><tr><th>집단</th>${W.map(o=>`<th>${c(o.label)}</th>`).join("")}<th>계</th></tr></thead>
      <tbody>
        ${a.map(o=>`<tr data-group="${c(o.groupKey)}">
          <th>${c(h[o.groupKey]||o.groupKey)}</th>
          ${o.summary.rows.map(i=>`<td>${i.copies||""}</td>`).join("")}
          <td class="pub-rowtotal">${o.summary.totalCopies||""}</td>
        </tr>`).join("")}
      </tbody>
    </table>
    <p class="muted small">집단에서 부수를 바꾸면 자동 반영됩니다. 집단을 누르면 성원별 부수를 편집합니다.</p>
    <button class="link" id="back">← 뒤로</button>
  `),document.querySelectorAll("tr[data-group]").forEach(o=>{o.onclick=()=>{J(),Ue(o.dataset.group)}}),document.getElementById("back").onclick=()=>{J(),C()}}async function Ue(e,t=""){J(),p('<h1>출판물 신청</h1><p class="muted">불러오는 중…</p>');try{const n=await Kn(e);zn(n.groupKey,n.members,n.pubDoc,t)}catch(n){p(`<h1>출판물 신청</h1><p class="err">${c(n.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}async function Kn(e){const{members:t}=await Q(e),n=await D(g(d,"groups",e,"publicationDistributions",De)),a=se(n.exists()?n.data():null);return{groupKey:e,members:t,pubDoc:a}}function zn(e,t,n,a=""){const s=t.filter(r=>r.active!==!1),o=ut(n,s),i=we()&&ke().length>1;p(`
    <p class="eyebrow">${c(h[e]||e)} · 출판물</p>
    <h1>출판물 신청 부수</h1>
    ${a?`<p class="savemsg">${c(a)}</p>`:""}
    <p class="pub-summary">${o.rows.map(r=>`<span>${c(r.label)} <b>${r.copies}</b></span>`).join("")}<span class="pub-summary-total">계 <b>${o.totalCopies}</b></span></p>
    <p class="muted small">부수만 입력하세요. 빈칸/0 = 미신청. 변동 시에만 수정하면 됩니다.</p>
    <table class="pub-grid">
      <thead>
        <tr><th class="pub-name">성원</th>${W.map(r=>`<th>${c(r.label)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${s.map(r=>`
          <tr>
            <th class="pub-name">${c(r.name||r.id)}</th>
            ${W.map(u=>{const b=Nn(n,u.key,r.id);return`<td><input class="pub-count" inputmode="numeric" pattern="[0-9]*" maxlength="2" data-item="${c(u.key)}" data-member="${c(r.id)}" value="${b>0?b:""}" aria-label="${c(r.name||r.id)} ${c(u.label)}" /></td>`}).join("")}
          </tr>`).join("")}
      </tbody>
    </table>
    <button class="primary" id="pub-save">저장</button>
    <p id="pub-msg" class="savemsg"></p>
    ${i?'<button class="link" id="pub-overview">← 전체 현황</button>':""}
    <button class="link" id="back">← 뒤로</button>
  `),document.querySelectorAll(".pub-count").forEach(r=>{r.oninput=()=>{r.value=r.value.replace(/[^0-9]/g,"").slice(0,2)}});const l=document.getElementById("pub-overview");l&&(l.onclick=()=>Te()),document.getElementById("back").onclick=()=>i?Te():C(),document.getElementById("pub-save").onclick=async()=>{try{const r=se(n);r.createdAt=n.createdAt,document.querySelectorAll(".pub-count").forEach(b=>{Sn(r,b.dataset.item,b.dataset.member,b.value)});const u=xn(r,m.uid,f());n.createdAt||(u.createdAt=f()),await S(g(d,"groups",e,"publicationDistributions",De),u),Ue(e,"저장되었습니다.")}catch(r){document.getElementById("pub-msg").innerHTML=`<span class="err">저장 실패: ${c(r.message)}</span>`}}}async function G(e=""){const t=ft();if(!t.length){p('<h1>비상연락처·주소록</h1><p class="err">주소록 열람 권한이 없습니다.</p><button class="link" id="back">← 뒤로</button>'),E();return}p('<h1>비상연락처·주소록</h1><p class="muted">불러오는 중…</p>');try{const n=await Gn(t);p(`
      <p class="eyebrow">${ce()?"회중 서기":c(A())}</p>
      <h1>비상연락처·주소록</h1>
      ${e?`<p class="savemsg">${c(e)}</p>`:""}
      <div class="member-toolbar contacts-toolbar">
        <input id="contact-search" placeholder="이름·연락처·주소 검색" />
        <select id="contact-group">
          <option value="">전체 집단</option>
          ${t.map(l=>`<option value="${l}">${c(h[l])}</option>`).join("")}
        </select>
      </div>
      ${ce()?`
        <div class="member-toolbar">
          <button class="primary" id="new-contact">+ 새 연락처</button>
          <input type="file" id="contacts-xlsx" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden />
          <button class="primary soft" id="import-xlsx">엑셀 이관</button>
        </div>`:'<p class="muted">읽기 전용입니다. 수정은 서기에게 요청하세요.</p>'}
      <div id="contacts-list"></div>
      <p id="contacts-msg" class="savemsg"></p>
      <button class="link" id="back">← 뒤로</button>
    `),E();const a=()=>Vn(n);document.getElementById("contact-search").oninput=a,document.getElementById("contact-group").onchange=a,a();const s=document.getElementById("new-contact");s&&(s.onclick=()=>Nt(t[0]));const o=document.getElementById("import-xlsx"),i=document.getElementById("contacts-xlsx");o&&i&&(o.onclick=()=>i.click(),i.onchange=()=>i.files[0]&&Wn(i.files[0]))}catch(n){p(`<h1>비상연락처·주소록</h1><p class="err">${c(n.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}async function Gn(e){const t=[];for(const n of e)(await x(I(d,"groups",n,"emergencyContacts"))).forEach(s=>t.push({id:s.id,groupKey:n,...s.data()}));return t.sort((n,a)=>q.indexOf(n.groupKey)-q.indexOf(a.groupKey)||String(n.name||"").localeCompare(String(a.name||""),"ko")),t}function Vn(e){const t=document.getElementById("contacts-list"),n=document.getElementById("contact-search").value.trim().toLowerCase(),a=document.getElementById("contact-group").value,s=ce(),o=e.filter(i=>(!a||i.groupKey===a)&&(s||i.active!==!1)&&(!n||$n(i,h[i.groupKey]).includes(n)));t.innerHTML=`
    <p class="muted">총 ${o.length}명</p>
    <div class="contact-list">${o.map(i=>`
      <div class="contact-card ${i.active===!1?"inactive":""}">
        <div>
          <b>${c(i.name||"(이름 없음)")}</b>
          <span class="badge-soft">${c(h[i.groupKey]||i.groupKey)}</span>
          ${i.active===!1?'<span class="muted"> · 비활성</span>':""}
          <div class="contact-lines">
            ${i.phone?`<span>본인: ${c(i.phone)}</span>`:""}
            ${i.address?`<span>주소: ${c(i.address)}</span>`:""}
            ${i.emergencyName||i.emergencyPhone?`<span>비상: ${c(i.emergencyName||"")} ${c(i.emergencyPhone||"")}${i.relation?" · "+c(i.relation):""}</span>`:""}
            ${i.memo?`<span>메모: ${c(i.memo)}</span>`:""}
          </div>
        </div>
        ${s?`<div class="member-actions">
          <button class="mini" data-edit-contact="${c(i.groupKey)}:${c(i.id)}">수정</button>
          <button class="mini ${i.active===!1?"":"del"}" data-toggle-contact="${c(i.groupKey)}:${c(i.id)}">${i.active===!1?"활성":"비활성"}</button>
        </div>`:""}
      </div>`).join("")||'<p class="muted">표시할 연락처가 없습니다.</p>'}</div>
  `,s&&(t.querySelectorAll("[data-edit-contact]").forEach(i=>{i.onclick=()=>{const[l,r]=i.dataset.editContact.split(":");Nt(l,e.find(u=>u.groupKey===l&&u.id===r))}}),t.querySelectorAll("[data-toggle-contact]").forEach(i=>{i.onclick=async()=>{const[l,r]=i.dataset.toggleContact.split(":"),u=e.find(b=>b.groupKey===l&&b.id===r);u&&(await V(g(d,"groups",l,"emergencyContacts",r),{active:u.active===!1,updatedBy:m.uid,updatedAt:f()}),G(u.active===!1?"활성 처리했습니다.":"비활성 처리했습니다."))}}))}function Nt(e,t=null){if(!ce())return G();const n=!!t?.id,a=(s,o,i="")=>`
    <label>${o}</label>
    <input id="${s}" value="${c(i)}" />`;p(`
    <p class="eyebrow">회중 서기</p>
    <h1>${n?"연락처 수정":"새 연락처"}</h1>
    <label>집단</label>
    <select id="groupKey">${At(e)}</select>
    ${a("name","이름",t?.name||"")}
    ${a("phone","본인 연락처",t?.phone||"")}
    ${a("address","주소",t?.address||"")}
    ${a("emergencyName","비상연락처 이름",t?.emergencyName||"")}
    ${a("emergencyPhone","비상연락처 전화",t?.emergencyPhone||"")}
    ${a("relation","관계",t?.relation||"")}
    <label>메모</label>
    <textarea id="memo">${c(t?.memo||"")}</textarea>
    <label class="chk"><input type="checkbox" id="active" ${t?.active!==!1?"checked":""}/> 활성</label>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 주소록</button>
  `),document.getElementById("back").onclick=()=>G(),document.getElementById("save").onclick=async()=>{const s=document.getElementById("groupKey").value,o=n&&s===t.groupKey?t.id:g(I(d,"groups",s,"emergencyContacts")).id;try{const i=rt({name:document.getElementById("name").value,phone:document.getElementById("phone").value,address:document.getElementById("address").value,emergencyName:document.getElementById("emergencyName").value,emergencyPhone:document.getElementById("emergencyPhone").value,relation:document.getElementById("relation").value,memo:document.getElementById("memo").value,active:document.getElementById("active").checked,createdAt:t?.createdAt},m.uid,f());i.createdAt||(i.createdAt=f()),await S(g(d,"groups",s,"emergencyContacts",o),i),n&&s!==t.groupKey&&await V(g(d,"groups",t.groupKey,"emergencyContacts",t.id),{active:!1,updatedBy:m.uid,updatedAt:f()}),G("저장되었습니다.")}catch(i){document.getElementById("msg").innerHTML=`<span class="err">저장 실패: ${c(i.message)}</span>`}}}async function Wn(e){const t=document.getElementById("contacts-msg");t.textContent="엑셀 파일을 읽는 중…";try{const{parseEmergencyContactXlsx:n}=await X(async()=>{const{parseEmergencyContactXlsx:r}=await import("./contact-xlsx-s5FAEm2Z.js");return{parseEmergencyContactXlsx:r}},__vite__mapDeps([0,1,2])),a=await n(e,h);if(!a.total){t.innerHTML='<span class="err">가져올 연락처를 찾지 못했습니다.</span>';return}if(!confirm(`엑셀에서 ${a.total}명을 가져옵니다. 기존 같은 이름/연락처 ID는 덮어쓸 수 있습니다. 진행할까요?`)){t.textContent="취소했습니다.";return}let s=pe(d),o=0,i=0;for(const[r,u]of Object.entries(a.groups))for(let b=0;b<u.length;b+=1){const w=rt({...u[b],createdAt:f()},m.uid,f()),B=vn(u[b],b);s.set(g(d,"groups",r,"emergencyContacts",B),w),o+=1,i+=1,i>=400&&(await s.commit(),s=pe(d),i=0)}i&&await s.commit();const l=a.skippedGroups.length?` 알 수 없는 집단명: ${a.skippedGroups.join(", ")}`:"";G(`엑셀 이관 완료: ${o}명.${l}`)}catch(n){t.innerHTML=`<span class="err">엑셀 이관 실패: ${c(n.message)}</span>`}}async function Jn(){p('<h1>회중 봉사 보고 현황</h1><p class="muted">불러오는 중…</p>');try{const t=((await D(g(d,"config","app"))).data()||{}).reportPeriod||"",n=/^(\d{4})-(\d{2})$/.exec(t),a=n?`${n[1]}년 ${Number(n[2])}월`:t||"(보고월 미설정)",s=Object.keys(h);let o=0,i=0;const l=[],r=[],u=[];for(const w of s){const B=await x(I(d,"groups",w,"members")),y=[];B.forEach($=>{const P=$.data();P.active!==!1&&y.push({id:$.id,...P})}),y.sort(($,P)=>($.seq||0)-(P.seq||0));const v=new Set,L={};t&&(await x(I(d,"reports",t,"groups",w,"members"))).forEach(P=>{v.add(P.id),L[P.id]={id:P.id,...P.data()}});const k=y.filter($=>v.has($.id)),F=y.filter($=>!v.has($.id));o+=y.length,i+=k.length;const Tt=k.filter($=>(L[$.id]?.pioneerType||"")==="regular").length,Lt=k.filter($=>(L[$.id]?.pioneerType||(L[$.id]?.auxiliaryPioneer?"auxiliary":""))==="auxiliary").length,Mt=k.reduce(($,P)=>$+(Number(L[P.id]?.bibleStudies)||0),0),_t=k.reduce(($,P)=>$+(Number(L[P.id]?.hours)||0),0);u.push({보고월:a,집단:h[w]||w,성원수:y.length,제출:k.length,미제출:F.length,제출률:y.length?`${Math.round(k.length/y.length*100)}%`:"0%",성서연구합계:Mt,파이오니아시간합계:_t,정규파이오니아:Tt,보조파이오니아:Lt}),y.forEach($=>{const P=L[$.id]||{},Ct=v.has($.id);r.push(Yn({periodLabel:a,groupLabel:h[w]||w,member:$,report:P,submitted:Ct}))});const jt=k.map($=>`<div class="rrow report-row report-row-nested">
        <span class="report-member">
          <b>${c($.name)}</b>
          ${kt(L[$.id])}
        </span>
        <span class="okb">제출 완료</span>
      </div>`).join("");l.push(`<section class="report-group-block ${F.length?"miss":""}">
        <div class="rrow report-group-head"><span><b>${c(h[w])}</b> 제출 ${k.length}/${y.length}
          ${F.length?`<br><span class="muted">미제출: ${c(F.map($=>$.name).join(", "))}</span>`:""}</span>
          <span class="${F.length?"missb":"okb"}">${F.length?F.length+"명":"완료"}</span></div>
        ${jt||'<p class="muted report-empty">제출된 보고가 없습니다.</p>'}
      </section>`)}p(`
      <p class="eyebrow">회중 서기</p>
      <h1>회중 봉사 보고 현황</h1>
      <p class="sum">${c(a)} · 전체 제출 <b>${i}</b> / 성원 ${o} · 미제출 <b>${o-i}</b></p>
      <button class="primary" id="export-report-xlsx">엑셀 파일 다운로드</button>
      <div class="rlist">${l.join("")}</div>
      <button class="link" id="back">← 뒤로</button>
    `);const b=document.getElementById("export-report-xlsx");b&&(b.onclick=()=>Xn(r,u,a)),E()}catch(e){p(`<h1>회중 봉사 보고 현황</h1><p class="err">${c(e.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}function Yn({periodLabel:e,groupLabel:t,member:n,report:a,submitted:s}){const o=a.pioneerType||(a.auxiliaryPioneer?"auxiliary":""),i={regular:"정규 파이오니아",auxiliary:"보조 파이오니아",special:"특별 파이오니아"}[o]||"";return{보고월:e,집단:t,이름:n.name||a.memberName||"",제출여부:s?"제출 완료":"미제출",봉사참여:s?a.participated===!0?"참여":"참여 없음":"",성서연구:s?String(Number(a.bibleStudies)||0):"",파이오니아구분:s?i:"",시간:s&&(i||Number(a.hours))?String(Number(a.hours)||0):"",메모:s?String(a.memo||""):"",제출시각:s?Et(a.submittedAt):""}}async function Xn(e,t,n){const a=await X(()=>import("./xlsx-CNerDvZX.js"),[]),s=a.utils.book_new(),o=e.slice(),i=o.filter(k=>k.제출여부==="제출 완료"),l=i.filter(k=>!k.파이오니아구분),r=i.filter(k=>k.파이오니아구분==="정규 파이오니아"),u=i.filter(k=>k.파이오니아구분==="보조 파이오니아"),b=o.filter(k=>k.제출여부==="미제출").map(k=>({보고월:k.보고월,집단:k.집단,이름:k.이름,제출여부:k.제출여부}));K(a,s,"전체 보고",o),K(a,s,"일반 참여",l),K(a,s,"정규 파이오니아",r),K(a,s,"보조 파이오니아",u),K(a,s,"미제출",b),K(a,s,"집단별 집계",t);const w=String(n||"봉사보고").replace(/[\\/:*?"<>|]/g,"").replace(/\s+/g,"_"),B=a.write(s,{bookType:"xlsx",type:"array"}),y=new Blob([B],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),v=URL.createObjectURL(y),L=document.createElement("a");L.href=v,L.download=`회중_봉사보고_${w}.xlsx`,document.body.appendChild(L),L.click(),L.remove(),URL.revokeObjectURL(v)}function K(e,t,n,a){const s=e.utils.json_to_sheet(a.length?a:[{}]),o=a.length?Object.keys(a[0]):[];o.length&&(s["!cols"]=o.map(i=>({wch:Math.max(10,i.length+4,...a.map(l=>String(l[i]??"").length+2).slice(0,80))})),s["!autofilter"]={ref:e.utils.encode_range(e.utils.decode_range(s["!ref"]))}),e.utils.book_append_sheet(t,s,n)}function Ke(){return m?.claims?.canWriteCongMembers===!0}function At(e=""){return q.map(t=>`<option value="${t}" ${e===t?"selected":""}>${c(h[t])}</option>`).join("")}async function Q(e){const t=[],n={};(await x(I(d,"groups",e,"members"))).forEach(s=>t.push({id:s.id,...s.data()})),t.sort((s,o)=>(s.seq||0)-(o.seq||0));try{(await x(I(d,"groups",e,"membersPrivate"))).forEach(o=>{n[o.id]=o.data().note||""})}catch{}return{members:t,notes:n}}function fe(){if(!Ke()){p('<h1>집단 성원 관리</h1><p class="err">서기 권한이 필요합니다.</p><button class="link" id="back">← 뒤로</button>'),E();return}p(`
    <p class="eyebrow">회중 서기</p>
    <h1>집단 성원 관리</h1>
    <p class="muted">성원 명단을 수정하거나 비활성화하고, 새 성원을 추가합니다.</p>
    <label>집단 선택</label>
    <select id="gk">${At()}</select>
    <button class="primary" id="open">명단 열기</button>
    <button class="link" id="back">← 뒤로</button>
  `),E(),document.getElementById("open").onclick=()=>Y(document.getElementById("gk").value)}async function Y(e,t=""){if(!Ke())return fe();p('<h1>집단 성원 관리</h1><p class="muted">불러오는 중…</p>');try{const{members:n,notes:a}=await Q(e),s=n.filter(l=>l.active!==!1),o=n.filter(l=>l.active===!1),i=l=>`
      <div class="member-row ${l.active===!1?"inactive":""}">
        <div>
          <b>${c(l.seq??"")}. ${c(l.name||"")}</b>
          ${l.displayName?`<span class="muted"> · ${c(l.displayName)}</span>`:""}
          <br><span class="muted">${c(l.gender||"성별 미지정")} · ${c(l.role||"역할 없음")}${l.elder?" · 회중 장로":""}${l.regularPioneer?" · 정규파이오니아":""}${a[l.id]?" · 메모 있음":""}</span>
        </div>
        <div class="member-actions">
          <button class="mini" data-edit="${c(l.id)}">수정</button>
          <button class="mini" data-toggle="${c(l.id)}">${l.active===!1?"되살리기":"명단에서 빼기"}</button>
          <button class="mini" data-move="${c(l.id)}">이동</button>
        </div>
      </div>`;p(`
      <p class="eyebrow">회중 서기 · ${c(h[e]||e)}</p>
      <h1>집단 성원 관리</h1>
      ${t?`<p class="savemsg">${c(t)}</p>`:""}
      <div class="member-toolbar">
        <button class="primary" id="add">+ 성원 추가</button>
        <button class="link" id="change-group">다른 집단 선택</button>
      </div>
      <h2 class="sec">활성 성원 ${s.length}명</h2>
      <div class="member-list">${s.map(i).join("")||'<p class="muted">활성 성원이 없습니다.</p>'}</div>
      <h2 class="sec">비활성 ${o.length}명</h2>
      <div class="member-list">${o.map(i).join("")||'<p class="muted">비활성 성원이 없습니다.</p>'}</div>
      <button class="link" id="back">← 뒤로</button>
    `),document.getElementById("back").onclick=C,document.getElementById("change-group").onclick=fe,document.getElementById("add").onclick=()=>tt(e,null,"",n),document.querySelectorAll("[data-edit]").forEach(l=>{l.onclick=()=>{const r=n.find(u=>u.id===l.dataset.edit);tt(e,r,a[r.id]||"",n)}}),document.querySelectorAll("[data-toggle]").forEach(l=>{l.onclick=async()=>{const r=n.find(u=>u.id===l.dataset.toggle);await Pt(e,r.id,{...r,active:r.active===!1},a[r.id]||""),Y(e,r.active===!1?"명단에 다시 올렸습니다.":"명단에서 뺐습니다.")}}),document.querySelectorAll("[data-move]").forEach(l=>{l.onclick=()=>{const r=n.find(u=>u.id===l.dataset.move);Zn(e,r,a[r.id]||"")}})}catch(n){p(`<h1>집단 성원 관리</h1><p class="err">${c(n.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}function et(e,t){return(e.includes(t)?e:[...e,t]).map(a=>`<option value="${c(a)}" ${a===t?"selected":""}>${c(a||"없음")}</option>`).join("")}function tt(e,t,n="",a=[]){const s=mn(t,e,a),o=!!t;p(`
    <p class="eyebrow">회중 서기 · ${c(h[e]||e)}</p>
    <h1>${o?"성원 수정":"성원 추가"}</h1>
    <p class="muted">문서 ID: <b>${c(s.id)}</b>${o?" · ID는 변경하지 않습니다.":" · 저장 후 ID는 변경하지 않습니다."}</p>
    <label>이름</label>
    <input id="m_name" value="${c(s.name)}" />
    <label>표시명 (선택)</label>
    <input id="m_display" value="${c(s.displayName)}" />
    <label>순번</label>
    <input id="m_seq" type="number" inputmode="numeric" min="0" max="999" value="${c(s.seq)}" />
    <label>성별</label>
    <select id="m_gender">${et(dn,s.gender)}</select>
    <label>역할</label>
    <select id="m_role">${et(un,s.role)}</select>
    <label class="chk"><input type="checkbox" id="m_elder" ${s.elder?"checked":""}/> 회중 장로</label>
    <label class="chk"><input type="checkbox" id="m_rp" ${s.regularPioneer?"checked":""}/> 정규파이오니아</label>
    <label>서기 메모 (민감 정보)</label>
    <textarea id="m_note" maxlength="2000">${c(n)}</textarea>
    <button class="primary" id="save">저장</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 목록</button>
  `),document.getElementById("back").onclick=()=>Y(e),document.getElementById("save").onclick=async()=>{const i=Qn(s.active),l=document.getElementById("msg");l.textContent="저장 중…",document.getElementById("save").disabled=!0;try{await Pt(e,s.id,i,document.getElementById("m_note").value),Y(e,o?"수정되었습니다.":"성원이 추가되었습니다.")}catch(r){document.getElementById("save").disabled=!1,l.innerHTML=`<span class="err">저장 실패: ${c(r.message)}</span>`}}}function Qn(e=!0){return{name:document.getElementById("m_name").value,displayName:document.getElementById("m_display").value,seq:document.getElementById("m_seq").value,gender:document.getElementById("m_gender").value,role:document.getElementById("m_role").value,regularPioneer:document.getElementById("m_rp").checked,elder:document.getElementById("m_elder").checked,active:e}}async function Pt(e,t,n,a){await S(g(d,"groups",e,"members",t),ae(n,m.uid,f())),await S(g(d,"groups",e,"membersPrivate",t),je(a,m.uid,f()))}function Zn(e,t,n=""){const a=q.filter(s=>s!==e).map(s=>`<option value="${s}">${c(h[s])}</option>`).join("");p(`
    <p class="eyebrow">회중 서기 · ${c(h[e]||e)}</p>
    <h1>성원 집단 이동</h1>
    <p class="muted"><b>${c(t.name||"")}</b> 님을 다른 집단으로 이동합니다. 기존 집단 문서는 비활성 처리되고, 새 집단에 새 ID로 생성됩니다.</p>
    <label>이동할 집단</label>
    <select id="target">${a}</select>
    <button class="primary" id="move">이동 실행</button>
    <p id="msg" class="savemsg"></p>
    <button class="link" id="back">← 목록</button>
  `),document.getElementById("back").onclick=()=>Y(e),document.getElementById("move").onclick=async()=>{const s=document.getElementById("target").value,o=document.getElementById("msg");o.textContent="이동 중…",document.getElementById("move").disabled=!0;try{const{members:i}=await Q(s),l=Me(i),r=_e(s,l),u=pe(d);u.set(g(d,"groups",s,"members",r),ae({...t,seq:l,active:!0},m.uid,f())),u.set(g(d,"groups",s,"membersPrivate",r),je(n,m.uid,f())),u.set(g(d,"groups",e,"members",t.id),ae({...t,active:!1},m.uid,f())),await u.commit(),Y(e,`${t.name||"성원"} 님을 ${h[s]||s}으로 이동했습니다.`)}catch(i){document.getElementById("move").disabled=!1,o.innerHTML=`<span class="err">이동 실패: ${c(i.message)}</span>`}}}async function ea(){const e={},t={};return await Promise.all(q.map(async n=>{let a={};try{const o=await D(g(d,"groups",n));a=o.exists()?o.data():{}}catch{a={}}e[n]={...a,label:h[n]||n};const{members:s}=await Q(n);t[n]=s})),{groups:e,membersByGroup:t,columns:bn(e,t,q)}}async function ze(e=""){if(!Ke())return fe();p('<h1>집단 편성표</h1><p class="muted">불러오는 중…</p>');try{const t=await ea();ta(t,e)}catch(t){p(`<h1>집단 편성표</h1><p class="err">${c(t.message)}</p><button class="link" id="back">← 뒤로</button>`),E()}}function ta(e,t=""){const n=Math.max(0,...e.columns.map(s=>s.rows.length)),a=Array.from({length:n},(s,o)=>`
    <tr>${e.columns.map(i=>na(i,i.rows[o])).join("")}</tr>
  `).join("");p(`
    <p class="eyebrow">회중 서기</p>
    <h1>집단 편성표</h1>
    ${t?`<p class="savemsg">${c(t)}</p>`:""}
    <p class="muted">성원 이름을 다른 집단 열로 끌어 놓으면 집단 이동을 처리합니다. 비활성 성원은 편성표에서 제외됩니다.</p>
    <div class="member-toolbar roster-actions">
      <button class="primary" id="roster-refresh">새로고침</button>
      <button class="primary soft" id="roster-print">PDF 저장/인쇄</button>
      <button class="primary soft" id="roster-publish">성원 앱에 게시</button>
      <button class="link" id="back">← 뒤로</button>
    </div>
    <div class="roster-scroll">
      <table class="roster-table" id="roster-board">
        <thead><tr>${e.columns.map(s=>`
          <th class="roster-drop" data-group="${c(s.groupKey)}">${c(s.label)}</th>`).join("")}</tr></thead>
        <tbody>${a}</tbody>
      </table>
    </div>
    <p id="roster-msg" class="savemsg"></p>
  `),document.getElementById("back").onclick=C,document.getElementById("roster-refresh").onclick=()=>ze(),document.getElementById("roster-print").onclick=()=>oa(),document.getElementById("roster-publish").onclick=()=>ia(),aa(e)}function na(e,t){if(!t)return`<td class="roster-drop empty" data-group="${c(e.groupKey)}"></td>`;const n=t.type==="member"?`<span class="roster-name member-only">${c(t.name)}</span>`:`<span class="roster-label">${c(t.label)}</span><span class="roster-name">${c(t.name)}</span>`;return t.type!=="member"?`<td class="roster-leader roster-drop" data-group="${c(e.groupKey)}">${n}</td>`:`
    <td class="roster-drop" data-group="${c(e.groupKey)}">
      <button class="roster-member" draggable="true" data-group="${c(e.groupKey)}" data-member="${c(t.member.id)}" title="다른 집단으로 이동">
        ${n}
      </button>
    </td>`}function aa(e){document.querySelectorAll(".roster-member").forEach(t=>{t.addEventListener("dragstart",n=>{n.dataTransfer.setData("text/plain",JSON.stringify({fromGroup:t.dataset.group,memberId:t.dataset.member})),n.dataTransfer.effectAllowed="move"})}),document.querySelectorAll(".roster-drop").forEach(t=>{t.addEventListener("dragover",n=>{n.preventDefault(),t.classList.add("over")}),t.addEventListener("dragleave",()=>t.classList.remove("over")),t.addEventListener("drop",async n=>{n.preventDefault(),t.classList.remove("over");const a=t.dataset.group;let s={};try{s=JSON.parse(n.dataTransfer.getData("text/plain"))}catch{return}!a||!s.fromGroup||!s.memberId||a===s.fromGroup||await sa(e,s.fromGroup,s.memberId,a)})})}async function sa(e,t,n,a){const o=(e.membersByGroup[t]||[]).find(r=>r.id===n);if(!o||!confirm(`${o.name||"성원"} 님을 ${h[a]||a} 집단으로 이동할까요?`))return;const l=document.getElementById("roster-msg");l.textContent="이동 중…";try{let r="";try{const B=await D(g(d,"groups",t,"membersPrivate",n));r=B.exists()&&B.data().note||""}catch{r=""}const u=await Q(a),b=gn({fromGroup:t,targetGroup:a,member:o,targetMembers:u.members}),w=pe(d);w.set(g(d,"groups",a,"members",b.targetId),ae(b.targetForm,m.uid,f())),w.set(g(d,"groups",a,"membersPrivate",b.targetId),je(r,m.uid,f())),w.set(g(d,"groups",t,"members",o.id),ae(b.sourceForm,m.uid,f())),await w.commit(),ze(`${o.name||"성원"} 님을 ${h[a]||a}으로 이동했습니다.`)}catch(r){l.innerHTML=`<span class="err">이동 실패: ${c(r.message)}</span>`}}function oa(){const e=document.getElementById("roster-board");if(!e)return;const t=window.open("","_blank");if(!t){alert("새 창을 열 수 없습니다. 브라우저 팝업 차단을 확인해 주세요.");return}t.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>집단 편성표</title>
    <style>
      @page { size: A4 portrait; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin:0; font-family: Arial, "Malgun Gothic", sans-serif; color:#15202b; }
      .print-title { text-align:center; font-size:18pt; font-weight:800; margin:0; }
      .print-date { text-align:right; font-size:8pt; color:#526173; margin:2mm 0 4mm; }
      table { border-collapse: collapse; width: 100%; table-layout: fixed; border:1.4pt solid #35513f; }
      thead { display: table-header-group; }
      th { background:#2f7d52; color:#fff; border:1pt solid #245f3f; padding:5px 2px; font-size:11pt; text-align:center; font-weight:800; }
      td { border:0.6pt solid #ccd6df; padding:4px 2px; height:24px; vertical-align:middle; text-align:center; font-size:10.5pt; line-height:1.2; }
      tbody tr:nth-child(even) td:not(.roster-leader) { background:#fafbfc; }
      .roster-member { all: unset; display:block; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:800; }
      .roster-label { display:block; color:#526173; font-size:8pt; line-height:1; }
      .roster-name { display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:800; text-align:center; }
      .member-only { font-size:12pt; font-weight:800; }
      .roster-leader { background:#eef2f7 !important; }
      .empty { background:#fff; }
    </style></head><body><h1 class="print-title">회중 야외 봉사 집단 편성표</h1><div class="print-date">${new Date().toLocaleDateString("ko-KR")}</div>${e.outerHTML}</body></html>`),t.document.close(),t.focus(),setTimeout(()=>t.print(),250)}async function ia(){const e=document.getElementById("roster-msg"),t=document.getElementById("roster-board");if(t){e.textContent="편성표 이미지를 만드는 중…";try{const n=await ca(t),a=hn(n,m.uid),s=await x(I(d,"notices",ue,"pages"));for(const o of s.docs)await O(o.ref);await S(g(d,"notices",ue),yn(m.uid,f())),await S(g(d,"notices",ue,"pages","1"),a),e.textContent="성원 앱 광고·안내에 집단 편성표를 게시했습니다."}catch(n){e.innerHTML=`<span class="err">게시 실패: ${c(n.message)}</span>`}}}async function ca(e){const t=e.cloneNode(!0);t.querySelectorAll("button").forEach(w=>{const B=document.createElement("span");B.className=w.className,B.innerHTML=w.innerHTML,w.replaceWith(B)});const n=794,a=1123,s=`
    <div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:${n}px;height:${a}px;padding:30px;background:#ffffff;font-family:Arial,'Malgun Gothic',sans-serif;color:#15202b;">
      <h1 style="font-size:28px;font-weight:800;text-align:center;margin:0;">회중 야외 봉사 집단 편성표</h1>
      <div style="font-size:12px;text-align:right;color:#526173;margin:8px 0 16px;">${new Date().toLocaleDateString("ko-KR")}</div>
      <style>
        table{border-collapse:collapse;width:100%;table-layout:fixed;border:2px solid #35513f}
        th{background:#2f7d52;color:#fff;border:1px solid #245f3f;padding:8px 2px;font-size:19px;text-align:center;font-weight:800}
        td{border:1px solid #ccd6df;padding:6px 2px;vertical-align:middle;text-align:center;font-size:18px;height:34px;line-height:1.2}
        tbody tr:nth-child(even) td:not(.roster-leader){background:#fafbfc}
        .roster-label{display:block;color:#526173;font-size:11px;line-height:1}
        .roster-name{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:800;text-align:center}
        .member-only{font-size:21px;font-weight:800}
        .roster-leader{background:#eef2f7!important}.empty{background:#fff}
      </style>
      ${t.outerHTML}
    </div>`,o=`<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${a}">
    <foreignObject width="100%" height="100%">${s}</foreignObject>
  </svg>`,i=await la(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(o)}`),l=document.createElement("canvas");l.width=n,l.height=a;const r=l.getContext("2d");r.fillStyle="#ffffff",r.fillRect(0,0,l.width,l.height),r.drawImage(i,0,0);let u=.82,b=l.toDataURL("image/jpeg",u);for(;b.length>7e5&&u>.42;)u=Number((u-.1).toFixed(2)),b=l.toDataURL("image/jpeg",u);return b}function la(e){return new Promise((t,n)=>{const a=new Image;a.onload=()=>t(a),a.onerror=()=>n(new Error("편성표 이미지를 만들지 못했습니다.")),a.src=e})}function Z(e=""){p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>PIN 변경</h1>
    ${e?`<p class="err">${c(e)}</p>`:""}
    <label>현재 PIN</label>
    <input id="old" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 PIN (숫자 4~8자리)</label>
    <input id="n1" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 PIN 확인</label>
    <input id="n2" type="password" inputmode="numeric" autocomplete="off" />
    <button class="primary" id="save">변경하기</button>
    <button class="link" id="back">← 뒤로</button>
  `),document.getElementById("back").onclick=C,document.getElementById("save").onclick=ra}async function ra(){const e=document.getElementById("old").value.trim(),t=document.getElementById("n1").value.trim(),n=document.getElementById("n2").value.trim();if(!/^[0-9]{4,8}$/.test(t))return Z("새 PIN은 숫자 4~8자리입니다.");if(t!==n)return Z("새 PIN 확인이 일치하지 않습니다.");const a=document.getElementById("save");a.disabled=!0,a.textContent="변경 중…";try{const s=await fetch(`${Le}/auth/change-pin`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({scope:m.scope,key:m.key,oldPin:e,newPin:t})}),o=await s.json();if(s.ok&&o.ok){p(`<h1>PIN 변경 완료 ✓</h1><p class="muted">다음부터 새 PIN으로 로그인하세요.</p>
        <button class="primary" id="ok">확인</button>`),document.getElementById("ok").onclick=()=>{m=null,ie()};return}Z(da(o.error))}catch(s){Z("오류: "+s.message)}}function da(e){return e==="PIN_TAKEN"?"이미 다른 분이 쓰는 번호입니다. 다른 번호를 사용하세요.":e==="SAME_PIN"?"현재 번호와 다른 번호로 정하세요.":e==="INVALID_CREDENTIALS"?"현재 PIN이 올바르지 않습니다.":e==="INVALID_NEW_PIN"?"새 PIN은 숫자 4~8자리입니다.":e==="PIN_MANAGED"?"회중 장로 PIN은 조정자만 설정할 수 있습니다.":"변경 실패: "+(e||"알 수 없음")}function ee(e=""){p(`
    <p class="eyebrow">${c(A())}</p>
    <h1>회중 장로 PIN 설정</h1>
    <p class="muted">장로들이 공유하는 로그인 PIN입니다. 여기서 정한 뒤 장로들에게 안내하세요.
      장로 본인은 이 PIN을 바꿀 수 없습니다.</p>
    ${e?`<p class="err">${c(e)}</p>`:""}
    <label>내(조정자) PIN <span class="muted">(본인 확인)</span></label>
    <input id="cpin" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 회중 장로 PIN (숫자 4~8자리)</label>
    <input id="e1" type="password" inputmode="numeric" autocomplete="off" />
    <label>새 회중 장로 PIN 확인</label>
    <input id="e2" type="password" inputmode="numeric" autocomplete="off" />
    <button class="primary" id="save">설정하기</button>
    <button class="link" id="back">← 뒤로</button>
  `),document.getElementById("back").onclick=C,document.getElementById("save").onclick=ua}async function ua(){const e=document.getElementById("cpin").value.trim(),t=document.getElementById("e1").value.trim(),n=document.getElementById("e2").value.trim();if(!/^[0-9]{4,8}$/.test(t))return ee("새 회중 장로 PIN은 숫자 4~8자리입니다.");if(t!==n)return ee("새 PIN 확인이 일치하지 않습니다.");const a=document.getElementById("save");a.disabled=!0,a.textContent="설정 중…";try{const s=await fetch(`${Le}/auth/set-elder-pin`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({coordPin:e,newPin:t})}),o=await s.json();if(s.ok&&o.ok){p(`<h1>회중 장로 PIN 설정 완료 ✓</h1>
        <p class="muted">이제 장로들에게 새 PIN을 안내하세요. 기존 PIN으로는 로그인되지 않습니다.</p>
        <button class="primary" id="ok">확인</button>`),document.getElementById("ok").onclick=C;return}ee(ma(o.error))}catch(s){ee("오류: "+s.message)}}function ma(e){return e==="INVALID_CREDENTIALS"?"내(조정자) PIN이 올바르지 않거나 권한이 없습니다.":e==="INVALID_NEW_PIN"?"새 회중 장로 PIN은 숫자 4~8자리입니다.":e==="INVALID_PIN_FORMAT"?"PIN은 숫자 4~8자리입니다.":"설정 실패: "+(e||"알 수 없음")}async function pa(e){const t=document.getElementById("work");t.innerHTML=`<p class="muted">변환 중… (${c(e.name)})</p>`;try{const{pdfToImages:n}=await X(async()=>{const{pdfToImages:o}=await import("./pdf-to-images-krGMqgjH.js");return{pdfToImages:o}},__vite__mapDeps([3,1,2])),{images:a}=await n(e,{scale:1.5,type:"image/jpeg",quality:.72,onProgress:(o,i)=>{t.querySelector("p").textContent=`변환 중… ${o}/${i} 페이지`}});Re=a;const s=a.map((o,i)=>`
      <label class="thumb">
        <input type="checkbox" data-i="${i}" checked />
        <img src="${o.dataUrl}" alt="page ${o.page}" />
        <span>${o.page}쪽 · ${Math.round(o.dataUrl.length/1024)}KB</span>
      </label>`).join("");t.innerHTML=`
      <p class="muted">저장할(회중용) 페이지를 체크하세요.</p>
      <div class="thumbs">${s}</div>
      <button class="primary" id="save">선택한 페이지 저장</button>
      <p id="savemsg" class="muted"></p>`,document.getElementById("save").onclick=ba}catch(n){t.innerHTML=`<p class="err">변환 실패: ${c(n.message)}</p>`}}async function ba(){const e=[...document.querySelectorAll(".thumb input:checked")].map(a=>Re[+a.dataset.i]),t=document.getElementById("save"),n=document.getElementById("savemsg");if(!e.length){n.textContent="최소 한 페이지를 선택하세요.";return}t.disabled=!0,n.textContent="저장 중…";try{const a=await x(I(d,"notices",j,"pages"));for(const s of a.docs)await O(s.ref);for(let s=0;s<e.length;s++)await S(g(d,"notices",j,"pages",String(s+1)),{index:s+1,dataUrl:e[s].dataUrl,updatedBy:m.uid});await Ee(j),n.innerHTML=`✅ ${e.length}페이지 저장 완료 — 성원 화면 '${c(H[j]||j)}'에서 보입니다.`,t.disabled=!1}catch(a){t.disabled=!1,n.innerHTML=`<span class="err">저장 실패: ${c(a.message)}</span>`}}async function Ee(e){await S(g(d,"notices",e),{key:e,updatedAt:f(),updatedBy:m.uid},{merge:!0})}nn(document.querySelector("#app")?.dataset)&&yt();const ha=Object.freeze(Object.defineProperty({__proto__:null,startAdminApp:yt},Symbol.toStringTag,{value:"Module"}));export{ha as a,ya as p};
