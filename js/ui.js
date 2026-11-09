/* ---------- 渲染：iPad 双栏（可折叠为手机单栏） ---------- */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

let showCost = false;
let showMem = false;
let showOv = false;
let costData = null;
let lastRender = 0;

function render() { lastRender = Date.now(); renderChat(); renderLog(); }

function renderAll() { renderTop(); renderMap(); renderChat(); renderRight(); renderLog(); if (showOv) renderOverview(); }

function renderLog() {
  const el = document.getElementById('log');
  if (!el) return;
  el.innerHTML = G.log.slice(-6).map(m => {
    if (m.type === 'knock') return `<div class="lg k">${m.t} · ${m.text}</div>`;
    if (m.type === 'sys') return `<div class="lg s">${m.t} · ${m.text}</div>`;
    if (m.type === 'dmu') return `<div class="lg d">私聊 ${m.who}：${m.text}</div>`;
    if (m.type === 'dmm') return `<div class="lg d me">你 → ${m.who}：${m.text}</div>`;
    if (m.type === 'me') return `<div class="lg m me"><b>你(601)</b>：${m.text}</div>`;
    return `<div class="lg m"><b>${m.who}</b>：${m.text}</div>`;
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function renderTop() {
  $('#clock').textContent = `${String(G.hh).padStart(2,'0')}:${String(G.mm).padStart(2,'0')}`;
  $('#day').textContent = `第 ${G.day} 天`;
  $('#out').textContent = `${G.outside}°`;
  $('#in').textContent = `${G.indoor}°`;
}

/* ------- 地图 ------- */
const ROWS = [
  { k:'7',  f:[7],  label:'7' },
  { k:'6',  f:[6],  label:'6' },
  { k:'5',  f:[5],  label:'5' },
  { k:'4',  f:[4],  label:'4' },
  { k:'3',  f:[3],  label:'3' },
  { k:'12', f:[1,2], label:'2·1', flat:true },
];
function renderMap() {
  const el = $('#map');
  let h = '';
  ROWS.forEach(row => {
    const here = G.npcs.filter(n => row.f.includes(n.floor) && n.alive);
    h += `<div class="fl"><div class="fl-n">${row.flat ? '2<span>·</span>1' : row.label}<span>F</span></div>`;
    h += `<div class="fl-row">`;
    here.sort((a,b)=>a.floor-b.floor).forEach(n => {
      const t = n.state.temp;
      const col = t > 50 ? '#4a7fa5' : t > 28 ? '#8a7038' : t > 12 ? '#c0713e' : '#a03c46';
      h += `<div class="unit${G.selected === n.id ? ' sel' : ''}" data-id="${n.id}" style="--c:${col}">
        <div class="u-nm">${n.name}</div>
        <div class="u-rm">${n.room}</div>
        <div class="u-bar"><i style="width:${t}%;background:${col}"></i></div>
        <div class="u-at">${n.at === '家' ? '' : n.at === '门口' ? '· 在门口' : '· 在楼道'}</div>
      </div>`;
    });
    if (row.k === '6') {
      h += `<div class="unit me"><div class="u-nm">你</div><div class="u-rm">601</div>
        <div class="u-bar"><i style="width:${G.player.state.temp}%;background:#5f8ba6"></i></div>
        <div class="u-at">空间 ${G.guests.length}/3</div>
        ${G.playerDoor ? '<div class="u-door">有人站在门口</div>' : ''}</div>`;
    }
    h += `</div></div>`;
  });
  h += `<div class="unit0">楼外 · 积雪两米 · 无人进出</div>`;
  el.innerHTML = h;
  el.querySelectorAll('.unit[data-id]').forEach(u => {
    u.onclick = () => { G.selected = u.dataset.id; renderMap(); renderRight(); };
  });
}

/* ------- 群聊 ------- */
function renderChat() {
  const el = $('#chat');
  const near = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
  el.innerHTML = G.log.map(m => {
    if (m.type === 'sys') return `<div class="sys">${esc(m.t)} · ${esc(m.text)}</div>`;
    if (m.type === 'knock') return `<div class="knock">${esc(m.t)} · ${esc(m.text)}</div>`;
    if (m.type === 'dmu') return `<div class="sys dmline">私聊 · ${esc(m.who)}：${esc(m.text)}</div>`;
    if (m.type === 'dmm') return `<div class="sys dmline me">你 → ${esc(m.who)}：${esc(m.text)}</div>`;
    if (m.type === 'me') return `<div class="msg self"><div class="av me">我</div>
      <div class="body"><div class="who">601<span class="room">你</span></div>
      <div class="bubble">${esc(m.text)}</div></div></div>`;
    const n = G.npcs.find(x => x.id === m.id) || {};
    const frozen = (n.state && n.state.temp <= 12);
    return `<div class="msg"><div class="av" style="background:${m.look || (n.look||'#555')}">${m.ini || n.ini || '?'}</div>
      <div class="body"><div class="who">${esc(m.who)}<span class="room">${n.room || ''}</span>${frozen?'<span class="fz">冻僵</span>':''}</div>
      <div class="bubble${frozen ? ' fz' : ''}">${esc(m.text)}</div></div></div>`;
  }).join('');
  if (near) el.scrollTop = el.scrollHeight;
}

/* ------- 右栏 ------- */
function renderRight() {
  const n = G.npcs.find(x => x.id === G.selected);
  if (!n) return;
  const t = n.state.temp, f = n.state.food;
  $('#panel').innerHTML = `
  <div class="p-head">
    <div class="p-av" style="background:${n.look}">${n.ini}</div>
    <div><div class="p-nm">${esc(n.name)}</div>
      <div class="p-id">${n.room} · ${n.age} 岁 · ${esc(n.job)}</div></div>
  </div>
  <div class="p-bars">
    <div class="pb"><span>体温</span><div class="pt"><i style="width:${t}%;background:${t>50?'#4a7fa5':t>28?'#8a7038':'#a03c46'}"></i></div><em>${Math.round(t)}</em></div>
    <div class="pb"><span>饱腹</span><div class="pt"><i style="width:${f}%;background:#8a7038"></i></div><em>${Math.round(f)}</em></div>
    <div class="pb"><span>体力</span><div class="pt"><i style="width:${n.state.hp}%;background:#59915f"></i></div><em>${Math.round(n.state.hp)}</em></div>
  </div>
  <div class="p-acts">
    <button class="ab" data-a="dm">私聊</button>
    <button class="ab" data-a="coal">投送煤球</button>
    <button class="ab" data-a="food">投送食物</button>
    <button class="ab${G.guests.includes(n.id)?' on':''}" data-a="${G.guests.includes(n.id)?'evict':'accept'}">
      ${G.guests.includes(n.id)?'让他走':'收进空间'}</button>
  </div>
  <div class="know">
    <div class="kn-h">${esc(n.name)} 知道多少</div>
    <div class="kn-v">${['不知道 601 有东西','隐约觉得 601 有点什么','确定 601 有吃的','知道，且认为不该瞒着'][Math.min(3, knowLevel(n.id))]}</div>
    ${knowLevel(n.id) ? `<div class="kn-w">${esc((G.knowledge[n.id]||{}).how || '')}</div>` : ''}
    ${(G.owes[n.id]||0) ? `<div class="kn-o">欠你 ${G.owes[n.id]} 次</div>` : ''}
  </div>
  ${n.id === 'zxy' ? `<div class="arc"><div class="ar-h">她的体面</div>
    <div class="ar-t"><i style="width:${arcOf('zxy').pride}%"></i></div>
    <div class="ar-n">${arcOf('zxy').opened ? `她开过 ${arcOf('zxy').opened} 次口` : '一次也没开过口'}${arcOf('zxy').collapsed ? ' · 她坐在你门口了' : ''}</div></div>` : ''}
  ${G.revealed ? `<div class="stance">她的立场：<b>${stanceOf(n)}</b><span>${stanceDesc(stanceOf(n))}</span></div>` : ''}
  ${showMem ? tlHtml(n) : ''}
  ${showMem && TH.get(n.id).mem ? `<div class="membox"><div class="mb-h">她私下记得的事</div><div class="mb-v">${esc(TH.get(n.id).mem)}</div></div>` : ''}
  <div class="p-note">你能看见她的位置和体温。你看不见她怎么想你。</div>`;

  const kbox = $('#knockbox');
  if (kbox) {
    if (G.pendingKnock) {
      const kn = G.npcs.find(x => x.id === G.pendingKnock);
      kbox.style.display = 'block';
      kbox.innerHTML = `<div class="kb-h">门口有人</div>
        <div class="kb-n">${esc(kn ? kn.name : '')} 在敲门。体温 ${Math.round(kn ? kn.state.temp : 0)}%</div>
        <div class="kb-b"><button id="kb-yes">开门</button><button id="kb-no">不开</button></div>`;
      document.getElementById('kb-yes').onclick = () => answerKnock(true);
      document.getElementById('kb-no').onclick = () => answerKnock(false);
    } else kbox.style.display = 'none';
  }

  $('#panel').querySelectorAll('.ab').forEach(b => {
    b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'dm') { G.dmOpen = n.id; renderDM(); }
      if (a === 'coal') deliver(n.id, '煤球', 2);
      if (a === 'food') deliver(n.id, '食物包', 1);
      if (a === 'accept') acceptGuest(n.id);
      if (a === 'evict') evictGuest(n.id);
    };
  });
  renderDM();
}

/* 全楼总览：六条线并排，看谁在靠近、谁在远处冷掉 */
function renderOverview() {
  const box = document.getElementById('overview');
  if (!box) return;
  if (!showOv) { box.style.display = 'none'; return; }
  box.style.display = 'block';

  const alive = G.npcs.filter(n => n.alive);
  const W = 250, H = 60, ROW = 30;
  const parts = [];
  const rows = [];

  alive.forEach((n, idx) => {
    const evs = (typeof LOG !== 'undefined') ? LOG.of(n.id).slice(0, 8).reverse() : [];
    let acc = 0;
    const pts = evs.length ? evs.map(e => { acc += e.delta; return acc; }) : [0];
    const max = Math.max(3, ...pts.map(Math.abs));
    const step = pts.length > 1 ? W / (pts.length - 1) : 0;
    const y0 = idx * ROW + ROW / 2;
    const path = pts.map((v, i) =>
      `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(y0 - (v / max) * (ROW / 2 - 5)).toFixed(1)}`).join(' ');
    const t = (typeof LOG !== 'undefined') ? LOG.trend(n.id) : 0;

    parts.push(`<line x1="0" y1="${y0}" x2="${W}" y2="${y0}" stroke="#151a21" stroke-width="1"/>`);
    if (pts.length > 1) parts.push(`<path d="${path}" fill="none" stroke="${n.look}" stroke-width="1.6" opacity=".9"/>`);
    parts.push(`<circle cx="0" cy="${y0}" r="3" fill="${n.look}"/>`);

    rows.push(`<div class="ov-i" data-id="${n.id}">
      <i style="background:${n.look}"></i>
      <b>${esc(n.name)}</b>
      <span class="ov-t">${t > 0 ? '走近' : t < 0 ? '疏远' : '没动'}<em>${t > 0 ? '+' + t : t}</em></span>
      <span class="ov-s">${Math.round(n.state.temp)}°</span>
    </div>`);
  });

  box.innerHTML = `<div class="ov-h">全楼 · 谁和你走得近</div>
    <svg class="ov-svg" viewBox="0 0 ${W} ${alive.length * ROW}" preserveAspectRatio="none">
      ${parts.join('')}</svg>
    <div class="ov-list">${rows.join('')}</div>
    <div class="ov-note">线往上＝离你近，往下＝离你远。右边是此刻体温。</div>`;

  box.querySelectorAll('.ov-i').forEach(el => {
    el.onclick = () => { G.selected = el.dataset.id; renderMap(); renderRight(); showOv = true; renderOverview(); };
  });
}

/* 关系线：一个点 = 一次看法变动；线往上跟你近，往下离你远 */
const KIND_COLOR = { '投送': '#6a9c5a', '收留': '#5a9cc0', '拒绝': '#c05a5a', '离开': '#a06a4a', '听见': '#6a6a7a' };

function tlHtml(n) {
  const evs = (typeof LOG !== 'undefined') ? LOG.of(n.id).slice(0, 10).reverse() : [];
  if (!evs.length) return `<div class="tlbox"><div class="tl-h">她和你</div><div class="tl-none">还没有什么发生过。</div></div>`;
  /* 累积曲线 */
  let acc = 0;
  const pts = evs.map(e => { acc += e.delta; return acc; });
  const max = Math.max(4, ...pts.map(Math.abs));
  const W = 240, H = 46;
  const step = evs.length > 1 ? W / (evs.length - 1) : 0;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(H / 2 - (v / max) * (H / 2 - 4)).toFixed(1)}`).join(' ');
  const dots = evs.map((e, i) => {
    const y = H / 2 - (pts[i] / max) * (H / 2 - 4);
    return `<circle cx="${(i * step).toFixed(1)}" cy="${y.toFixed(1)}" r="2.4" fill="${KIND_COLOR[e.kind] || '#666'}"/>`;
  }).join('');
  const last = evs.slice(-4).reverse();
  return `<div class="tlbox">
    <div class="tl-h">她和你 · ${LOG.trend(n.id) > 0 ? '在走近' : LOG.trend(n.id) < 0 ? '在疏远' : '没动'}</div>
    <svg class="tl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#1e242c" stroke-width="1"/>
      <path d="${path}" fill="none" stroke="#4a6a80" stroke-width="1.4"/>
      ${dots}
    </svg>
    <div class="tl-list">${last.map(e =>
      `<div class="tl-i"><i style="background:${KIND_COLOR[e.kind] || '#666'}"></i>
        <b>${e.day}日${String(e.hh).padStart(2, '0')}:${String(e.mm).padStart(2, '0')}</b>
        <span>${esc(e.note || e.kind)}</span></div>`).join('')}</div>
  </div>`;
}

function renderDM() {
  const box = $('#dmbox');
  if (!G.dmOpen) { box.style.display = 'none'; renderCost(); return; }
  const n = G.npcs.find(x => x.id === G.dmOpen);
  const hist = G.dm[G.dmOpen] || [];
  box.style.display = 'block';
  box.innerHTML = `<div class="dm-h">私聊 · ${esc(n.name)}<span id="dmclose">×</span></div>
    <div class="dm-body" id="dmb">${hist.map(m =>
      `<div class="drow ${m.role === 'user' ? 'mine' : ''}"><div class="db">${esc(m.content)}</div></div>`).join('')}</div>
    <div class="dm-in"><input id="dmin" placeholder="说点什么…"><button id="dmsend">发</button></div>`;
  const b = $('#dmb'); b.scrollTop = b.scrollHeight;
  $('#dmclose').onclick = () => { G.dmOpen = null; renderDM(); };
  $('#dmsend').onclick = () => {
    const v = $('#dmin').value.trim();
    if (!v) return;
    $('#dmin').value = '';
    sendDM(G.dmOpen, v);
  };
  $('#dmin').onkeydown = e => { if (e.key === 'Enter') $('#dmsend').click(); };
  renderCost();
}

/* ------- 花费 ------- */
async function renderCost() {
  const el = $('#cost');
  try {
    const r = await fetch(AW + '/api/cost', { signal: AbortSignal.timeout(6000) });
    costData = await r.json();
    SAVE.net = true;
  } catch (e) { costData = null; }
  if (!costData) {
    el.innerHTML = '<span class="dim">离线 · 模型不可达</span><span class="dim">进度只存本机</span>';
    return;
  }
  const c = costData;
  const cny = typeof c.cny === 'number' ? c.cny : 0;
  el.innerHTML = `<span class="cny">￥${cny.toFixed(4)}</span>
    <span class="dim">${c.calls || 0} 次 · ${((c.in || 0) + (c.out || 0)).toLocaleString()} tok</span>
    <span class="dim">模型 ${(c.price && c.price.model) || '—'} · ￥${(c.price && c.price.in) || 0}/M 入</span>`;
}

/* ------- 绑定 ------- */
async function boot() {
  initWorld();
  const s = await SAVE.load();
  if (s && s.v === 2 && s.log && s.log.length) {
    SAVE.apply(s);
    renderAll();
    document.getElementById('savestate').textContent = '已读档 · 第' + G.day + '天';
  }
  window.__errs = [];
  window.addEventListener('error', e => window.__errs.push(String(e.message)));
  renderAll();
  renderCost();
  setInterval(renderTop, 1000);
  /* 降级：页面不可见或定时器被节流时，提示用手动推进 */
  setInterval(() => {
    const el = document.getElementById('next');
    if (!el) return;
    const throttled = document.hidden || (G.t === window.__lastT && speedIdx > 0 && !G.paused);
    window.__lastT = G.t;
    el.classList.toggle('pulse', throttled && G.t > 0);
  }, 6000);
  setInterval(renderCost, 8000);

  $('#speeds').querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      $('#speeds').querySelectorAll('button').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); setSpeed(+b.dataset.s);
    };
  });
  /* 手动推进：任何时候都能用，也是后台降级手段 */
  const mk = document.getElementById('next');
  if (mk) mk.onclick = () => { G.paused = true; syncPause(); step(1); };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) renderAll();
  });
  const gi = document.getElementById('gin');
  const send = () => {
    const v = gi.value.trim();
    if (!v) return;
    gi.value = '';
    speak(v);
  };
  if (gi) {
    document.getElementById('gsend').onclick = send;
    gi.onkeydown = e => { if (e.key === 'Enter') send(); };
  }

  const ov = document.getElementById('ovtoggle');
  if (ov) ov.onclick = () => {
    showOv = !showOv;
    ov.classList.toggle('on', showOv);
    ov.textContent = showOv ? '总览中' : '全楼';
    renderOverview();
  };

  const mt = document.getElementById('memtoggle');
  if (mt) mt.onclick = () => {
    showMem = !showMem;
    mt.classList.toggle('on', showMem);
    mt.textContent = showMem ? '记忆已开' : '看记忆';
    renderRight();
  };

  const ng = document.getElementById('newgame');
  if (ng) ng.onclick = async () => {
    if (!confirm('重新开始？当前进度会删掉。')) return;
    await SAVE.clear();
    location.reload();
  };
  $('#pause').onclick = () => {
    G.paused = !G.paused; syncPause(); };
}

function syncPause() {
  ['#pause'].forEach(id => {
    const el = document.querySelector(id);
    if (!el) return;
    el.textContent = G.paused ? '继续' : '暂停';
    el.classList.toggle('on', G.paused);
  });
}
