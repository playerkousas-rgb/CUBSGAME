/* =========================================================
   C. 工具
   ========================================================= */
const $ = id => document.getElementById(id);
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));

function toast(msg){
  const t = $('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('on'), 1900);
}
let AC = null;
function beep(type){
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    const n = AC.currentTime;
    if(type === 'ok'){ o.frequency.setValueAtTime(660, n); o.frequency.setValueAtTime(990, n + .08); }
    else if(type === 'no'){ o.frequency.setValueAtTime(220, n); o.frequency.setValueAtTime(160, n + .09); }
    else if(type === 'tick'){ o.frequency.setValueAtTime(440, n); }
    else { o.frequency.setValueAtTime(520, n); o.frequency.setValueAtTime(780, n + .07); o.frequency.setValueAtTime(1040, n + .15); }
    g.gain.setValueAtTime(.055, n);
    g.gain.exponentialRampToValueAtTime(.001, n + .3);
    o.start(n); o.stop(n + .32);
  }catch(e){}
}

/* =========================================================
   D. State
   ========================================================= */
const KEY = 'cubgame_v3';
const todayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);

function defaultState(){
  return { name:'小狼', group:'', avatar:'🐺', passed:{}, badges:{}, bonus:0, streak:0,
    lastActive:null, daily:{ date:todayKey(), done:[] }, card:null, drawnOn:null };
}
let S = load();
function load(){
  try{ const raw = localStorage.getItem(KEY); return raw ? Object.assign(defaultState(), JSON.parse(raw)) : defaultState(); }
  catch(e){ return defaultState(); }
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }

/* =========================================================
   E. 衍生數據
   ========================================================= */
function badgeXP(b){ const lv = S.badges[b.id] || 0; return lv ? (BADGE_XP[b.tiers][lv-1] || 0) : 0; }
function totalXP(){
  let x = Object.keys(S.passed).filter(k => S.passed[k]).length * XP_QUEST;
  BADGES.forEach(b => x += badgeXP(b));
  return x + (S.bonus || 0);
}
function rankOf(xp){
  let r = RANKS[0], next = null;
  for(const R of RANKS){ if(xp >= R.xp) r = R; else { next = R; break; } }
  return { rank:r, next };
}
function stageKeys(st){ return st.items.map((_, i) => st.id + '-' + i); }
function stageDone(st){ return stageKeys(st).filter(k => S.passed[k]).length; }
function stageComplete(st){ return stageDone(st) === st.items.length; }
function touchStreak(){
  const tk = todayKey();
  if(S.lastActive === tk) return;
  S.streak = (S.lastActive && dayDiff(S.lastActive, tk) === 1) ? (S.streak || 0) + 1 : 1;
  S.lastActive = tk;
}
function checkLevelUp(before){
  const n = totalXP();
  if(rankOf(n).rank.name !== rankOf(before).rank.name)
    setTimeout(() => toast('🎉 升級！你已成為「' + rankOf(n).rank.name + '」'), 600);
}

/* =========================================================
   F. 主畫面
   ========================================================= */
let openStage = null;

function renderHero(){
  const xp = totalXP(), { rank, next } = rankOf(xp);
  $('avatar').textContent = S.avatar;
  $('hName').textContent = S.name || '小狼';
  $('hRank').textContent = rank.name;
  $('hSub').textContent = (S.group ? S.group + ' · ' : '') + '幼童軍 · 金紫荊之路';
  $('xpNow').textContent = xp.toLocaleString() + ' XP';
  if(next){
    $('xpNext').textContent = '下一級：' + next.xp.toLocaleString() + ' XP';
    $('xpFill').style.width = Math.max(3, Math.min(100, (xp - rank.xp) / (next.xp - rank.xp) * 100)) + '%';
  }else{ $('xpNext').textContent = '最高等級已達成 🏆'; $('xpFill').style.width = '100%'; }
  $('sBadge').textContent = BADGES.filter(b => S.badges[b.id] > 0).length;
  $('sQuest').textContent = Object.keys(S.passed).filter(k => S.passed[k]).length + '/35';
  $('sStage').textContent = STAGES.filter(stageComplete).length + '/' + STAGES.length;
}

function renderStages(){
  $('stageList').innerHTML = STAGES.map((st, i) => {
    const done = stageDone(st), total = st.items.length, complete = done === total;
    const isOpen = openStage === st.id || (openStage === null && !complete);
    const rows = st.items.map((name, j) => {
      const g = gameOf(st.id, j, name);
      const passed = !!S.passed[g.key];
      return `<div class="q-row ${passed ? 'passed' : ''}" data-quest="${g.key}">
        <div class="q-ic">${passed ? '✓' : (g.icon || '🎯')}</div>
        <div class="q-meta">
          <div class="q-name">${name}</div>
          <div class="q-type">${TYPE_ICON[g.type]} ${g.title !== name ? g.title + ' · ' : ''}${TYPE_LABEL[g.type]}</div>
        </div>
        <div class="q-go">${passed ? '已通關' : '挑戰 ▸'}</div>
      </div>`;
    }).join('');
    return `<div class="stage">
      <div class="rail">
        <div class="node ${complete ? 'done' : 'open'}">${st.emoji}</div>
        ${i < STAGES.length-1 ? `<div class="connector ${complete ? 'solid' : ''}"></div>` : ''}
      </div>
      <div class="stage-body">
        <div class="stage-title">${st.name}<span class="tag ${complete ? 'done' : 'now'}">${complete ? '已完成 ✅' : done + '/' + total}</span></div>
        <div class="stage-req">${st.req}</div>
        <div class="prog"><i style="width:${done/total*100}%"></i></div>
        <button class="btn ghost small" data-toggle="${st.id}" style="margin-top:9px">${isOpen ? '▾ 收起關卡' : '▸ 查看 ' + total + ' 關'}</button>
        <div class="items ${isOpen ? 'open' : ''}">${rows}</div>
      </div>
    </div>`;
  }).join('');
}

function renderCatalog(){
  $('catalogList').innerHTML = STAGES.map(st => {
    const rows = st.items.map((name, j) => {
      const g = gameOf(st.id, j, name);
      const alts = (g.alts || []).map(a => `<span class="alt-chip">${a[0]}<i>${a[1]}</i></span>`).join('');
      return `<div class="cat">
        <div class="cat-top"><span class="cat-dot" style="background:${S.passed[g.key] ? '#2E8B57' : '#D9D2BC'}"></span>
          <span class="cat-name">${name}</span></div>
        <div class="cat-main">★ 現正可玩：<b>${g.icon} ${g.title}</b> · ${TYPE_LABEL[g.type]}</div>
        ${alts ? `<div class="cat-alts">${alts}</div>` : ''}
      </div>`;
    }).join('');
    return `<div class="group-label">${st.emoji} ${st.name}</div><div class="cat-list">${rows}</div>`;
  }).join('');
}

function renderBadges(){
  const groups = ['戶外','技能','服務','興趣'];
  $('badgeCount').textContent = BADGES.filter(b => S.badges[b.id] > 0).length + '/' + BADGES.length;
  $('badgeGrid').innerHTML = groups.map(g => {
    const list = BADGES.filter(b => b.group === g);
    return `<div class="group-label">${g} · ${list.length} 款</div><div class="grid">${list.map(b => {
      const lv = S.badges[b.id] || 0;
      return `<button class="bg" data-badge="${b.id}">
        <div class="ring ${lv ? 'l'+lv : ''}">${b.emoji}${lv ? `<span class="lv">${b.tiers===1?'✓':['Ⅰ','Ⅱ','Ⅲ'][lv-1]}</span>` : ''}</div>
        <div class="bg-name ${lv ? 'on' : ''}">${b.name}</div></button>`;
    }).join('')}</div>`;
  }).join('');
}

function renderDaily(){
  const n = S.daily.done.length;
  $('streakTitle').textContent = '連續 ' + (S.streak || 0) + ' 日';
  $('streakHint').textContent = n ? '今日已完成 ' + n + ' 項，繼續保持這份動能 💪' : '今日完成任何一關，即可保住連續紀錄。';
  const today = MISSIONS.slice(0, 4);
  $('missionList').innerHTML = today.map((m, i) => {
    const on = S.daily.done.includes(i);
    return `<div class="item ${on ? 'on' : ''}" data-mission="${i}"><div class="box">${on?'✓':''}</div>
      <span>${m}</span><span class="xp">+${XP_MISSION}</span></div>`;
  }).join('');
  if(S.card && S.drawnOn === todayKey()){
    $('cardTag').textContent = S.card.tag; $('cardText').textContent = S.card.text;
    $('cardWho').textContent = '— ' + S.card.who;
    $('drawCard').disabled = true; $('drawCard').textContent = '今日已抽（明日再來）';
  }else{
    $('cardTag').textContent = '森林故事'; $('cardText').textContent = '準備好就抽一張。';
    $('cardWho').textContent = '';
    $('drawCard').disabled = false; $('drawCard').textContent = '抽一張卡';
  }
}

function renderMe(){
  $('inName').value = S.name || ''; $('inGroup').value = S.group || '';
  $('avatarRow').innerHTML = AVATARS.map(a =>
    `<button class="lv-btn ${S.avatar===a?'on':''}" data-av="${a}" style="width:50px;padding:6px 0"><b style="font-size:18px">${a}</b></button>`).join('');
}

function renderAll(){ renderHero(); renderStages(); renderCatalog(); renderBadges(); renderDaily(); renderLeader(); renderMe(); }

/* =========================================================
   G. 關卡引擎
   ========================================================= */
let Q = null;

function clearQuestTimers(){
  if(Q && Q.timers){ Q.timers.forEach(t => clearTimeout(t)); Q.timers = []; }
  if(Q && Q.timer){ clearInterval(Q.timer); Q.timer = null; }
}

function openQuest(key){
  const parts = key.split('-'), sid = parts[0], idx = +parts[1];
  const st = STAGES.find(s => s.id === sid); if(!st) return;
  const g = gameOf(sid, idx, st.items[idx]);
  if(Q) clearQuestTimers();
  Q = { key, g, mistakes:0, done:false, timers:[] };

  if(g.type === 'quiz'){ Q.qi = 0; Q.picked = null; }
  if(g.type === 'match'){
    Q.left = shuffle(g.pairs.map((p, i) => ({ t:p[0], i })));
    Q.right = shuffle(g.pairs.map((p, i) => ({ t:p[1], i })));
    Q.selL = null; Q.matched = [];
  }
  if(g.type === 'order'){ Q.pool = shuffle(g.items.slice()); Q.seq = []; }
  if(g.type === 'memory'){
    Q.deck = shuffle(g.pairs.concat(g.pairs).map((s, i) => ({ s, i: Math.floor(i/2) })));
    Q.flip = []; Q.foundCards = []; Q.found = 0; Q.busy = false;
  }
  if(g.type === 'sort'){ Q.pool = shuffle(g.items.map((o, i) => Object.assign({ i }, o))); Q.cur = 0; Q.fb = null; }
  if(g.type === 'find'){
    const arr = [];
    for(let i = 0; i < g.count; i++) arr.push(g.target);
    for(let i = g.count; i < g.cells; i++) arr.push(g.decoys[Math.floor(Math.random() * g.decoys.length)]);
    Q.grid = shuffle(arr); Q.hits = []; Q.missed = []; Q.timeLeft = g.time; Q.failed = false; Q.needTimer = true;
  }
  if(g.type === 'simon'){
    Q.seq = [];
    for(let i = 0; i < g.len; i++) Q.seq.push(g.symbols[Math.floor(Math.random() * g.symbols.length)]);
    Q.showIdx = -1; Q.input = []; Q.phase = 'show'; Q.needPlay = true;
  }

  $('qTitle').textContent = (g.icon || '🎯') + ' ' + g.title;
  $('qSub').textContent = st.name + ' · ' + (TYPE_LABEL[g.type] || '挑戰');
  $('quest').classList.add('on');
  document.body.style.overflow = 'hidden';
  renderQuest();
}

function closeQuest(){
  clearQuestTimers();
  $('quest').classList.remove('on');
  document.body.style.overflow = '';
  Q = null;
  renderAll();
}

function starsOf(){ return Q.mistakes === 0 ? '⭐⭐⭐' : (Q.mistakes <= 2 ? '⭐⭐' : '⭐'); }

function altsNote(g){
  if(!g.alts || !g.alts.length) return '';
  return `<div class="alts-line"><div class="alts-t">🎲 這一項的其他玩法（揀啱就同我講，我幫你換）</div>` +
    g.alts.map(a => `<span class="alt-chip">${a[0]}<i>${a[1]}</i></span>`).join('') + `</div>`;
}

function renderQuest(){
  if(!Q) return;
  const g = Q.g;
  let out = [ '', '' ];
  if(g.type === 'quiz') out = viewQuiz();
  else if(g.type === 'match') out = viewMatch();
  else if(g.type === 'order') out = viewOrder();
  else if(g.type === 'memory') out = viewMemory();
  else if(g.type === 'sort') out = viewSort();
  else if(g.type === 'find') out = viewFind();
  else if(g.type === 'simon') out = viewSimon();
  else out = viewAction();

  $('qBody').innerHTML = out[0] + ((Q.done || Q.failed) ? '' : altsNote(g));
  $('qFoot').innerHTML = out[1];
  $('qScore').textContent = Q.failed ? '⏱️' : starsOf();

  if(Q.needTimer){ Q.needTimer = false; startFindTimer(); }
  if(Q.needPlay){ Q.needPlay = false; simonPlay(); }
  if(g.type === 'match' && Q.matched.length === g.pairs.length && !Q.done) finishQuest();
  if(g.type === 'find' && Q.hits.length === g.count && !Q.done) finishQuest();
}

/* ---------- QUIZ ---------- */
function viewQuiz(){
  const g = Q.g, q = g.qs[Q.qi];
  const body = `<div class="q-step">第 ${Q.qi+1} / ${g.qs.length} 題</div>
    <p class="q-q">${q.q}</p>
    <div class="${q.flags ? 'flag-grid' : ''}">
      ${q.flags
        ? q.flags.map((f, i) => `<button class="opt opt-flag ${Q.picked!==null ? (i===q.a?'ok':(Q.picked===i?'no':'dim')) : ''}" data-pick="${i}">${f}</button>`).join('')
        : q.opts.map((o, i) => `<button class="opt ${Q.picked!==null ? (i===q.a?'ok':(Q.picked===i?'no':'dim')) : ''}" data-pick="${i}">
            <span style="flex:0 0 22px;font-weight:800;color:var(--ink-2)">${'ABCD'[i]}</span><span>${o}</span></button>`).join('')}
    </div>
    ${Q.picked !== null ? `<div class="fb ${Q.picked===q.a?'ok':'no'}"><b>${Q.picked===q.a?'正確！':'再看一次'}</b>${q.why}</div>` : ''}`;
  const foot = Q.picked === null ? '' :
    `<button class="btn" data-act="next">${Q.qi === g.qs.length-1 ? '完成挑戰 🎉' : '下一題'}</button>`;
  return [body, foot];
}

/* ---------- MATCH ---------- */
function viewMatch(){
  const g = Q.g;
  const body = `<p class="q-intro">${g.intro}</p>
    <div class="match-cols">
      <div class="m-col">${Q.left.map(o => `<button class="m-card ${Q.matched.includes(o.i)?'done':''} ${Q.selL===o.i?'sel':''}" data-side="l" data-i="${o.i}">${o.t}</button>`).join('')}</div>
      <div class="m-col">${Q.right.map(o => `<button class="m-card ${Q.matched.includes(o.i)?'done':''}" data-side="r" data-i="${o.i}">${o.t}</button>`).join('')}</div>
    </div>
    <p class="src">${Q.matched.length} / ${g.pairs.length} 對已連線</p>`;
  return [body, ''];
}

/* ---------- ORDER ---------- */
function viewOrder(){
  const g = Q.g;
  const remain = Q.pool.filter(t => !Q.seq.includes(t));
  const ok = Q.seq.length === g.correct.length && Q.seq.every((v, i) => v === g.correct[i]);
  const body = `<p class="q-intro">${g.intro}</p>
    <div class="ord-list">${g.correct.map((_, i) => {
      const v = Q.seq[i];
      return `<div class="ord-slot ${v ? 'filled' : ''}">${v
        ? `<span class="n">${i+1}</span>${v}`
        : `<span class="n" style="background:#EFEDE4;color:#9A9689">${i+1}</span><span style="color:#9A9689">點下面選出這一步</span>`}</div>`;
    }).join('')}</div>
    <div class="q-step" style="margin:18px 0 8px">可選項目</div>
    <div class="ord-pool">${remain.map(t => `<button class="ord-item" data-ord="${encodeURIComponent(t)}">${t}</button>`).join('')}</div>
    ${ok ? `<div class="fb ok" style="margin-top:14px"><b>次序完全正確！</b>${g.tip||''}</div>` : ''}`;
  const foot = ok ? `<button class="btn" data-act="finish">完成挑戰 🎉</button>` : '';
  return [body, foot];
}

/* ---------- MEMORY ---------- */
function viewMemory(){
  const g = Q.g;
  const body = `<p class="q-intro">${g.intro}</p>
    <div class="mem-grid">${Q.deck.map((c, i) => {
      const shown = Q.flip.includes(i) || Q.foundCards.includes(i);
      return `<button class="mem ${shown?'flip':''} ${Q.foundCards.includes(i)?'done':''}" data-mem="${i}">${c.s}</button>`;
    }).join('')}</div>
    <p class="src">已找到 ${Q.found} / ${g.pairs.length} 對${g.tip ? ' · 💡 ' + g.tip : ''}</p>`;
  return [body, ''];
}

/* ---------- SORT ---------- */
function viewSort(){
  const g = Q.g;
  if(Q.cur >= Q.pool.length) return ['', ''];
  const it = Q.pool[Q.cur];
  const body = `<p class="q-intro">${g.intro}</p>
    <div class="q-step">第 ${Q.cur+1} / ${Q.pool.length} 件</div>
    <div class="sort-item">${it.t}</div>
    <div class="sort-buckets">${g.buckets.map((b, i) =>
      `<button class="bucket" data-bucket="${i}">${b}</button>`).join('')}</div>
    ${Q.fb ? `<div class="fb ${Q.fb.ok?'ok':'no'}"><b>${Q.fb.ok?'放對了':'放錯了'}</b>${Q.fb.why}</div>` : ''}`;
  return [body, ''];
}

/* ---------- FIND ---------- */
function viewFind(){
  const g = Q.g;
  if(Q.failed){
    return [`<div class="result"><div class="big">⏱️</div><h3>時間到！</h3>
      <p>只找到 ${Q.hits.length} / ${g.count} 個${g.target}</p>
      <p style="font-size:12.5px">再試一次，先掃視全個畫面再開始點。</p></div>`,
      `<button class="btn" data-act="retry">再試一次</button>`];
  }
  const body = `<div class="find-head"><span>找出 ${g.count} 個 ${g.target}</span>
      <span class="find-timer" id="findTimer">${Q.timeLeft}s</span></div>
    <p class="q-intro" style="margin:0 0 12px">${g.intro}</p>
    <div class="find-grid" style="grid-template-columns:repeat(${Math.min(5, Math.ceil(Math.sqrt(g.cells)))} ,1fr)">
      ${Q.grid.map((c, i) => {
        const hit = Q.hits.includes(i), miss = Q.missed.includes(i);
        return `<button class="find-cell ${hit?'hit':''} ${miss?'miss':''}" data-find="${i}">${(hit||miss) ? (hit?c:'✗') : c}</button>`;
      }).join('')}
    </div>
    <p class="src">已找到 ${Q.hits.length} / ${g.count}${g.tip ? ' · 💡 ' + g.tip : ''}</p>`;
  return [body, ''];
}

function startFindTimer(){
  const tick = () => {
    if(!Q) return;
    Q.timeLeft--;
    const el = $('findTimer');
    if(el) el.textContent = Q.timeLeft + 's';
    if(Q.timeLeft <= 0){ clearQuestTimers(); Q.failed = true; beep('no'); renderQuest(); }
  };
  Q.timer = setInterval(tick, 1000);
}

/* ---------- SIMON ---------- */
function viewSimon(){
  const g = Q.g;
  const body = `<p class="q-intro">${g.intro}</p>
    <div class="simon-status">${Q.phase === 'show'
      ? '👀 看好：留意閃動的次序'
      : `✋ 到你：按次序重複（${Q.input.length}/${Q.seq.length}）`}</div>
    <div class="simon-grid">${g.symbols.map(s => {
      const hi = Q.phase === 'show' && Q.seq[Q.showIdx] === s && Q.showIdx >= 0;
      return `<button class="simon-cell ${hi?'hi':''}" data-simon="${encodeURIComponent(s)}">${s}</button>`;
    }).join('')}</div>
    <p class="src">${Q.phase === 'show' ? ' ' : '按錯會重新播放整組動作。'}${g.tip ? ' 💡 ' + g.tip : ''}</p>`;
  return [body, ''];
}

function simonPlay(){
  const g = Q.g;
  Q.phase = 'show'; Q.input = []; Q.showIdx = -1;
  renderQuest();
  let t = 650;
  Q.seq.forEach((s, i) => {
    Q.timers.push(setTimeout(() => { if(!Q) return; Q.showIdx = i; beep('tick'); renderQuest(); }, t));
    t += 720;
  });
  Q.timers.push(setTimeout(() => { if(!Q) return; Q.showIdx = -1; Q.phase = 'input'; renderQuest(); }, t));
}

/* ---------- ACTION ---------- */
function viewAction(){
  const g = Q.g;
  const body = `<p class="q-intro">${g.intro}</p>
    <div class="action-box">
      <div class="q-step" style="margin:0 0 4px">任務步驟</div>
      <ol>${g.steps.map(s => `<li>${s}</li>`).join('')}</ol>
      ${g.tip ? `<div style="margin-top:12px;font-size:12.5px;color:var(--ink-2);border-top:1px dashed var(--line);padding-top:10px">💡 ${g.tip}</div>` : ''}
    </div>`;
  const foot = `<button class="btn" data-act="finish">✅ 已完成（領袖／家長核對）</button>`;
  return [body, foot];
}

/* ---------- 通關 ---------- */
function finishQuest(){
  if(!Q) return;
  const g = Q.g, xpBefore = totalXP();
  const first = !S.passed[Q.key];
  S.passed[Q.key] = true;
  if(first) touchStreak();
  if(!first) S.bonus += 10;
  save(); beep('win'); clearQuestTimers();

  const stars = starsOf();
  $('qBody').innerHTML = `<div class="result">
      <div class="big">🏅</div><h3>${first ? '關卡通過！' : '再挑戰成功！'}</h3>
      <p>${g.title}</p>
      <div class="reward">+${first ? XP_QUEST : 10} XP · ${stars}</div>
      <p style="margin-top:14px;font-size:12.5px">${Q.mistakes === 0 ? '沒有一次答錯，非常專注！' : '錯過 ' + Q.mistakes + ' 次，再玩一次挑戰三星。'}</p>
      ${g.tip ? `<p style="font-size:12.5px;margin-top:10px;color:var(--ink-2)">💡 ${g.tip}</p>` : ''}
      ${altsNote(g)}
    </div>`;
  $('qFoot').innerHTML = `<div class="row" style="flex-wrap:nowrap">
      <button class="btn ghost" data-act="retry" style="flex:1 1 45%">再玩一次</button>
      <button class="btn" data-act="close" style="flex:1 1 55%">返回地圖</button></div>`;
  $('qScore').textContent = stars;
  Q.done = true;
  renderHero(); checkLevelUp(xpBefore);
}

/* =========================================================
   H. 事件
   ========================================================= */
document.addEventListener('click', e => {
  const qr = e.target.closest('[data-quest]');
  if(qr){ openQuest(qr.dataset.quest); return; }

  const tg = e.target.closest('[data-toggle]');
  if(tg){ openStage = (openStage === tg.dataset.toggle) ? '' : tg.dataset.toggle; renderStages(); return; }

  const bd = e.target.closest('[data-badge]');
  if(bd){ openBadgeModal(bd.dataset.badge); return; }

  const ms = e.target.closest('[data-mission]');
  if(ms){
    const i = +ms.dataset.mission, before = totalXP();
    if(S.daily.done.includes(i)){ S.daily.done = S.daily.done.filter(x => x !== i); S.bonus = Math.max(0, S.bonus - XP_MISSION); }
    else { S.daily.done.push(i); S.bonus += XP_MISSION; touchStreak(); toast('+' + XP_MISSION + ' XP · 連續 ' + S.streak + ' 日 🔥'); }
    save(); renderHero(); renderDaily(); checkLevelUp(before); return;
  }

  const av = e.target.closest('[data-av]');
  if(av){ S.avatar = av.dataset.av; save(); renderMe(); renderHero(); return; }

  const tab = e.target.closest('.tab');
  if(tab){
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t === tab));
    ['path','catalog','badges','daily','leader','me'].forEach(v => $('view-' + v).classList.toggle('hidden', v !== tab.dataset.tab));
    window.scrollTo({ top:0, behavior:'smooth' });
    return;
  }
});

$('qBody').addEventListener('click', e => {
  if(!Q || Q.done) return;
  const g = Q.g;

  /* quiz */
  const pick = e.target.closest('[data-pick]');
  if(pick && g.type === 'quiz'){
    if(Q.picked !== null) return;
    const i = +pick.dataset.pick;
    Q.picked = i;
    if(i !== g.qs[Q.qi].a){ Q.mistakes++; beep('no'); } else beep('ok');
    renderQuest(); return;
  }

  /* match */
  const mc = e.target.closest('.m-card');
  if(mc && g.type === 'match'){
    const side = mc.dataset.side, i = +mc.dataset.i;
    if(side === 'l'){ Q.selL = (Q.selL === i) ? null : i; renderQuest(); return; }
    if(Q.selL === null) return;
    if(Q.selL === i){ Q.matched.push(i); Q.selL = null; beep('ok'); renderQuest(); return; }
    Q.mistakes++; beep('no'); Q.selL = null; renderQuest();
    const el = document.querySelector('.m-card[data-side="r"][data-i="' + i + '"]');
    if(el){ el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 350); }
    return;
  }

  /* order */
  const oi = e.target.closest('[data-ord]');
  if(oi && g.type === 'order'){
    const t = decodeURIComponent(oi.dataset.ord);
    if(t === g.correct[Q.seq.length]){ Q.seq.push(t); beep('ok'); renderQuest(); return; }
    Q.mistakes++; beep('no'); renderQuest();
    const el = document.querySelector('[data-ord="' + encodeURIComponent(t) + '"]');
    if(el){ el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 400); }
    toast('不是這一步，再想想 🤔');
    return;
  }

  /* memory */
  const mm = e.target.closest('[data-mem]');
  if(mm && g.type === 'memory'){ memClick(+mm.dataset.mem); return; }

  /* sort */
  const bk = e.target.closest('[data-bucket]');
  if(bk && g.type === 'sort'){
    const it = Q.pool[Q.cur], b = +bk.dataset.bucket;
    if(it.b === b){ Q.fb = { ok:true, why:it.why || '' }; beep('ok'); Q.cur++; renderQuest(); }
    else { Q.mistakes++; Q.fb = { ok:false, why:it.why || '' }; beep('no'); renderQuest(); }
    if(Q.cur >= Q.pool.length) finishQuest();
    return;
  }

  /* find */
  const fc = e.target.closest('[data-find]');
  if(fc && g.type === 'find'){
    const i = +fc.dataset.find;
    if(Q.hits.includes(i) || Q.missed.includes(i)) return;
    if(Q.grid[i] === g.target){ Q.hits.push(i); beep('ok'); }
    else { Q.missed.push(i); Q.mistakes++; beep('no'); }
    renderQuest(); return;
  }

  /* simon */
  const sc = e.target.closest('[data-simon]');
  if(sc && g.type === 'simon'){
    if(Q.phase !== 'input') return;
    const s = decodeURIComponent(sc.dataset.simon);
    Q.input.push(s);
    const idx = Q.input.length - 1;
    if(Q.seq[idx] !== s){ Q.mistakes++; beep('no'); renderQuest(); setTimeout(simonPlay, 420); return; }
    beep('tick');
    if(Q.input.length === Q.seq.length){ finishQuest(); return; }
    renderQuest(); return;
  }
});

function memClick(i){
  if(Q.busy || Q.foundCards.includes(i) || Q.flip.includes(i)) return;
  Q.flip.push(i); beep('tick'); renderQuest();
  if(Q.flip.length === 2){
    Q.busy = true;
    const [a, b] = Q.flip;
    if(Q.deck[a].i === Q.deck[b].i){
      Q.foundCards.push(a, b); Q.found++; Q.flip = []; Q.busy = false;
      beep('ok'); renderQuest();
      if(Q.found === Q.g.pairs.length) setTimeout(finishQuest, 380);
    }else{
      Q.mistakes++;
      setTimeout(() => { if(!Q) return; Q.flip = []; Q.busy = false; beep('no'); renderQuest(); }, 760);
    }
  }
}

$('qFoot').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if(!b || !Q) return;
  const act = b.dataset.act;
  if(act === 'close'){ closeQuest(); return; }
  if(act === 'retry'){ const k = Q.key; closeQuest(); setTimeout(() => openQuest(k), 80); return; }
  if(act === 'finish'){ finishQuest(); return; }
  if(act === 'next'){
    if(Q.qi === Q.g.qs.length - 1){ finishQuest(); return; }
    Q.qi++; Q.picked = null; renderQuest(); $('qBody').scrollTop = 0; return;
  }
});

$('qClose').addEventListener('click', () => {
  if(Q && !Q.done && Q.g.type !== 'action'){
    if(!confirm('離開會失去這次的進度，確定？')) return;
  }
  closeQuest();
});

/* 徽章 modal */
let modalBadge = null;
function openBadgeModal(id){
  const b = BADGES.find(x => x.id === id);
  modalBadge = b;
  $('mTitle').textContent = b.emoji + ' ' + b.name;
  $('mSub').textContent = b.group + '組 · ' + (b.tiers === 1 ? '一級制徽章' : '三級制徽章（紅初／黃中／綠高）');
  const labels = b.tiers === 1 ? [['0','未取得'],['1','已取得']] : [['0','未取得'],['1','初級'],['2','中級'],['3','高級']];
  $('mLevels').style.gridTemplateColumns = 'repeat(' + labels.length + ',1fr)';
  $('mLevels').innerHTML = labels.map(([v, t]) =>
    `<button class="lv-btn ${S.badges[b.id] === +v ? 'on' : ''}" data-lv="${v}"><b>${v === '0' ? '—' : (b.tiers === 1 ? '✓' : v)}</b><span>${t}</span></button>`).join('');
  $('modalBg').classList.add('on');
}
$('mLevels').addEventListener('click', e => {
  const b = e.target.closest('[data-lv]');
  if(!b || !modalBadge) return;
  const before = totalXP();
  S.badges[modalBadge.id] = +b.dataset.lv;
  save(); renderHero(); renderBadges(); checkLevelUp(before);
  const gain = totalXP() - before;
  if(gain > 0) toast('+' + gain + ' XP · ' + modalBadge.name);
  openBadgeModal(modalBadge.id);
});
$('mClose').addEventListener('click', () => $('modalBg').classList.remove('on'));
$('modalBg').addEventListener('click', e => { if(e.target === $('modalBg')) $('modalBg').classList.remove('on'); });

/* 抽卡 */
$('drawCard').addEventListener('click', () => {
  const c = CARDS[Math.floor(Math.random() * CARDS.length)];
  S.card = c; S.drawnOn = todayKey(); S.bonus += 15;
  save(); renderHero(); renderDaily(); beep('win');
  toast('+15 XP · 抽到「' + c.tag + '」');
});

/* 設定 */
$('inName').addEventListener('input', e => { S.name = e.target.value; save(); renderHero(); });
$('inGroup').addEventListener('input', e => { S.group = e.target.value; save(); renderHero(); });
$('btnExport').addEventListener('click', () => {
  $('exportBox').value = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  $('exportBox').select(); toast('已產生進度碼，複製貼給團長');
});
$('btnImport').addEventListener('click', () => {
  try{
    S = Object.assign(defaultState(), JSON.parse(decodeURIComponent(escape(atob($('exportBox').value.trim())))));
    save(); renderAll(); toast('進度已匯入 ✅');
  }catch(err){ toast('進度碼格式不正確'); }
});
$('btnReset').addEventListener('click', () => {
  if(confirm('確定清除所有進度？此動作無法復原。')){ S = defaultState(); save(); renderAll(); toast('已重置'); }
});

setInterval(() => {
  if(S.daily.date !== todayKey()){ S.daily = { date:todayKey(), done:[] }; S.drawnOn = null; save(); renderDaily(); }
}, 60000);

/* =========================================================
   H. 團長名冊（純前端：進度碼 → 名冊）
   ---------------------------------------------------------
   幼童軍過關 → 「我」分頁傳進度碼俾團長 → 團長貼入即睇到
   每人 tick 咗邊幾關。名冊存團長自己部機（獨立 key），
   唔使後台、唔使帳號。
   ========================================================= */
const ROSTER_KEY = 'cubgame_roster_v1';
let ROSTER = loadRoster();
function loadRoster(){
  try{ const r = localStorage.getItem(ROSTER_KEY); return r ? JSON.parse(r) : { members:{} }; }
  catch(e){ return { members:{} }; }
}
function saveRoster(){ try{ localStorage.setItem(ROSTER_KEY, JSON.stringify(ROSTER)); }catch(e){} }
function decodeCode(txt){ return JSON.parse(decodeURIComponent(escape(atob(txt.trim())))); }
function memberKey(st){ return (st.name || '未命名幼童軍') + '|' + (st.group || ''); }
function passedCount(p){ return Object.values(p || {}).filter(Boolean).length; }
function totalXPOf(m){
  let x = passedCount(m.passed) * XP_QUEST;
  BADGES.forEach(b => { const lv = (m.badges || {})[b.id] || 0; if(lv) x += (BADGE_XP[b.tiers] || [])[lv-1] || 0; });
  return x + (m.bonus || 0);
}

function renderLeader(){
  const ms = Object.entries(ROSTER.members || {});
  if(!ms.length){
    $('rosterList').innerHTML = '<div class="card"><p class="muted">名冊仲係空。貼第一張進度碼落上面，按「登記／更新」開始。</p></div>';
    return;
  }
  ms.sort((a, b) => String(b[1].updatedAt || '').localeCompare(String(a[1].updatedAt || '')));
  $('rosterList').innerHTML = ms.map(([k, m]) => {
    const pills = '<div class="row" style="gap:8px;flex-wrap:wrap">' +
      '<span class="pill" style="background:#EDF7F1;color:#1F6B4A;border-color:#BFE3CE">✅ ' + passedCount(m.passed) + '/35 關</span>' +
      '<span class="pill" style="background:#EDF7F1;color:#1F6B4A;border-color:#BFE3CE">🎖️ ' + Object.values(m.badges || {}).filter(v => v > 0).length + ' 徽章</span>' +
      '<span class="pill" style="background:#EDF7F1;color:#1F6B4A;border-color:#BFE3CE">⭐ ' + totalXPOf(m) + ' XP</span>' +
      (m.streak ? '<span class="pill" style="background:#EDF7F1;color:#1F6B4A;border-color:#BFE3CE">🔥 ' + m.streak + ' 日</span>' : '') +
      '</div>';
    const detail = '<details style="margin-top:10px"><summary class="muted">睇逐關 tick 明細</summary><div style="margin-top:6px">' +
      STAGES.map(st => '<div class="group-label">' + st.emoji + ' ' + esc(st.name) + '</div><div class="cat-list">' +
        st.items.map((it, i) => '<div class="muted" style="padding:3px 0">' + ((m.passed || {})[st.id + '-' + i] ? '✅' : '⬜') + ' ' + esc(it) + '</div>').join('') +
        '</div>').join('') + '</div></details>';
    return '<div class="card"><div class="card-head"><div class="h2">' + (m.avatar || '🐺') + ' ' + esc(m.name || '未命名幼童軍') +
      ' <small>' + esc(m.group || '未填旅團') + ' · 進度碼更新於 ' + String(m.updatedAt || '').slice(0, 10) + '</small></div></div>' +
      pills + detail +
      '<div class="row" style="margin-top:10px"><button class="btn small ghost" data-roster-del="' + esc(k) + '" style="color:#B4453A;border-color:#F0C9C4">移出名冊</button></div></div>';
  }).join('');
}

$('btnRosterAdd').addEventListener('click', () => {
  let st; try{ st = decodeCode($('rosterBox').value); }catch(e){ toast('進度碼格式不正確'); return; }
  if(st && st.members){                                   // 名冊碼 → 合併
    Object.entries(st.members).forEach(([k, v]) => { ROSTER.members[k] = v; });
    saveRoster(); renderLeader(); beep('ok'); toast('名冊已匯入／合併'); $('rosterBox').value = '';
    return;
  }
  if(!st || typeof st.passed !== 'object'){ toast('進度碼格式不正確'); return; }
  const k = memberKey(st);
  ROSTER.members[k] = { name:st.name, group:st.group, avatar:st.avatar, passed:st.passed,
    badges:st.badges || {}, bonus:st.bonus || 0, streak:st.streak || 0,
    lastActive:st.lastActive, updatedAt:new Date().toISOString() };
  saveRoster(); renderLeader(); beep('ok');
  toast('已登記：' + (st.name || '未命名幼童軍') + '（' + passedCount(st.passed) + '/35 關）');
  $('rosterBox').value = '';
});
$('btnRosterExport').addEventListener('click', () => {
  $('rosterBox').value = btoa(unescape(encodeURIComponent(JSON.stringify(ROSTER))));
  $('rosterBox').select(); toast('名冊碼已產生（備份／交俾下一位團長）');
});
$('rosterList').addEventListener('click', e => {
  const d = e.target.closest('[data-roster-del]');
  if(!d) return;
  const k = d.dataset.rosterDel;
  if(confirm('將這位幼童軍移出名冊？（佢自己裝置嘅進度不受影響）')){
    delete ROSTER.members[k]; saveRoster(); renderLeader(); toast('已移出');
  }
});

/* =========================================================
   I. 傳進度碼俾團長 + 安裝引導（PWA）
   ========================================================= */
$('btnShareWa').addEventListener('click', () => {
  const code = btoa(unescape(encodeURIComponent(JSON.stringify(S))));
  $('exportBox').value = code;
  const msg = '【幼童軍歷險 · 進度】' + (S.name || '') + (S.group ? '（' + S.group + '）' : '') +
    '\n已過 ' + passedCount(S.passed) + '/35 關\n進度碼：\n' + code;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
});
$('btnCopyCode').addEventListener('click', () => {
  const code = $('exportBox').value || ($('exportBox').value = btoa(unescape(encodeURIComponent(JSON.stringify(S)))));
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(code).then(() => toast('已複製進度碼'), () => { $('exportBox').select(); toast('請長按內容手動複製'); });
  } else { $('exportBox').select(); toast('已選取，請複製'); }
});

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; showInstallBanner(); });
function isStandalone(){ return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
function showInstallBanner(){
  if(isStandalone()) return;
  try{ if(localStorage.getItem('cubgame_install_dismissed')) return; }catch(e){}
  $('installBanner').classList.remove('hidden');
}
function openHowModal(){
  const ua = navigator.userAgent;
  let txt;
  if(isStandalone()) txt = '你已經裝咗（而家就係獨立視窗模式）。🎉';
  else if(/iPhone|iPad|iPod/.test(ua)) txt = 'iOS Safari：\n1. 撳螢幕下方「分享」按鈕（方框加向上箭嘴）\n2. 向下滑，揀「加入主畫面」\n3. 右上角撳「加入」\n\n之後由主畫面個圖示開 app：離線照玩、進度留住。';
  else if(/Android/.test(ua)) txt = 'Android Chrome：\n1. 撳右上角  選單\n2. 揀「加到主畫面」／「安裝應用程式」\n3. 撳「安裝」\n\n之後由主畫面個圖示開 app：離線照玩、進度留住。';
  else txt = '桌面瀏覽器：\n撳網址列右邊嘅安裝圖示（⊕）即可裝成 app。\n或者直接書籤呢個網址都得。';
  $('howText').textContent = txt;
  $('howBg').classList.add('on');
}
$('btnInstall').addEventListener('click', () => {
  if(deferredInstall){
    deferredInstall.prompt();
    Promise.resolve(deferredInstall.userChoice).catch(() => {});
    deferredInstall = null;
    $('installBanner').classList.add('hidden');
  } else openHowModal();
});
$('btnInstallHow').addEventListener('click', openHowModal);
$('btnInstallDismiss').addEventListener('click', () => {
  $('installBanner').classList.add('hidden');
  try{ localStorage.setItem('cubgame_install_dismissed', '1'); }catch(e){}
});
$('howClose').addEventListener('click', () => $('howBg').classList.remove('on'));
$('howBg').addEventListener('click', e => { if(e.target === $('howBg')) $('howBg').classList.remove('on'); });
showInstallBanner();

renderAll();
