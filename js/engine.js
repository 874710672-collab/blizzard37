/* ---------- 引擎：时钟 / 生理 / 地图可观测 / 事件 ---------- */

const G = {
  t: 0,                 // tick 数
  day: 4, hh: 7, mm: 40,
  outside: -37, indoor: 4,
  log: [],              // 群聊 + 系统 + 私聊
  dm: {},               // 私聊线程 {npcId: [{role,content}]}
  dmOpen: null,
  guests: [],
  stock: { 煤球: 40, 药: 6, 蜡烛: 12 },
  busy: 0,
  sessionCny: 0, calls: 0,
  fired: {},
  npcs: [],
  paused: false,
  selected: 'xc',
  player: { id:'me', name:'你', room:'601', floor:6,
    state:{ temp:74, food:96, hp:100 }, space:true, capacity:3 },
  playerDoor: false,
  knowledge: {},     // 谁知道 601 有东西
  owes: {},          // 人情账 {npcId: n}
  trust: {},         // 信任矩阵 trust[a][b]
  autosaveAt: 0,
  saveState: ''
};

function now(day = G.day, hh = G.hh, mm = G.mm) {
  return `第${day}天 ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}
function stamp() { return now(G.day, G.hh, G.mm); }

function initWorld() {
  /* 开局阵容：三个固定的骨架人物 + 三个随机抽的，共 6 人 */
  const anchor = ['zxy', 'lq', 'cw'];
  G.npcs = rollCast(anchor);
  G.npcs.forEach(n => {
    n.state.temp = Math.min(n.state.temp, 62);
    n.state.food = Math.min(n.state.food, 88);
  });
  G.npcs.forEach(n => { n.at = '家'; });
  G.npcs.sort((a, b) => b.floor - a.floor);
  G.knowledge = seedKnowledge();
  G.owes = {}; G.trust = {};
  G.npcs.forEach(a => { G.trust[a.id] = {}; G.npcs.forEach(b => { G.trust[a.id][b.id] = 0; }); });
  arcOf('zxy');
  const opener = G.npcs.find(n => n.id === 'lq') || G.npcs[0];
  const quiet = G.npcs.filter(n => n.state.temp < 35).sort((a, b) => a.state.temp - b.state.temp)[0] || G.npcs[1];
  addSys('07:20', '物业公告：本楼供电第三日未恢复。请勿开启外窗。');
  if (opener) addMsg(opener.id, `${quiet ? quiet.name : '楼下那位'}昨晚一直没动静。`);
  addSys('07:38', '6 楼走廊传来敲门声。两下，很短。');
  pickSelected();
}

function pickSelected() { G.selected = G.npcs[0].id; }

function addMsg(npcId, text, extra) {
  const n = G.npcs.find(x => x.id === npcId);
  G.log.push(Object.assign({ type: 'msg', id: npcId, who: n ? n.name : npcId, t: stamp(), text }, extra || {}));
  render();
}
function addSys(t, text) {
  G.log.push({ type: 'sys', t, text });
  render();
}
function addKnock(text) { G.log.push({ type: 'knock', t: stamp(), text }); render(); }

/* ---------- 时间 ------------- */
const SPEEDS = [0, 1, 2, 4];
let speedIdx = 1, tickTimer = null;

function setSpeed(i) {
  speedIdx = i;
  if (tickTimer) { cancelAnimationFrame(tickTimer); tickTimer = null; }
  if (i === 0) return;
  const ms = [0, 9000, 4500, 2200][i];
  let last = performance.now();
  const loop = (ts) => {
    tickTimer = requestAnimationFrame(loop);
    if (G.paused || document.hidden) { last = ts; return; }
    if (ts - last >= ms) {
      last = ts;
      try { tick(); } catch (e) { console.warn(e); }
    }
  };
  tickTimer = requestAnimationFrame(loop);
}

function step(n) {
  n = n || 1;
  for (let k = 0; k < n; k++) {
    try { tick(); } catch (e) { console.warn(e); }
  }
  renderAll();
}

function tick() {
  if (G.dead && G.t > -1) { /* 允许手动推进 */ }
  G.t++;
  /* 时间推进：2 分钟/tick */
  G.mm += 2;
  if (G.mm >= 60) { G.mm -= 60; G.hh++; }
  if (G.hh >= 24) { G.hh = 0; G.day++; if (G.day >= 7 && !ENDING.done) ENDING.run().catch(x => console.warn(x)); }

  /* 室外越来越冷 */
  if (G.t % 10 === 0) G.outside -= 1;
  G.indoor = Math.max(0, 4 - Math.floor(G.t / 12));

  /* 生理衰减
     在你屋里的人：有饭吃、有暖，往 88/90 回填；屋外的人继续掉 */
  const dt = 1;
  G.npcs.forEach(n => {
    if (!n.alive) return;
    const inRoom = G.guests.includes(n.id);
    if (inRoom) {
      /* 靠火炉慢慢回暖，而不是瞬间满血 */
      n.state.temp = clamp(n.state.temp + Math.max(2.2, (88 - n.state.temp) * 0.18), 0, 100);
      n.state.food = clamp(n.state.food + Math.max(4, (90 - n.state.food) * 0.22), 0, 100);
      n.state.hp = clamp(n.state.hp + 1.2, 0, 100);
      if (n.state.temp > 60) n.frozenBefore = false;
    } else {
      n.state.temp = clamp(n.state.temp - 0.72 * dt, 0, 100);
      n.state.food = clamp(n.state.food - 0.35 * dt, 0, 100);
      n.state.hp = clamp(n.state.hp - 0.15 * dt, 0, 100);
    }
    if (n.state.temp <= 0 || n.state.food <= 0) { n.alive = false; deathOf(n); }
  });

  /* 行为：谁在动 */
  if (G.t % 3 === 0) npcDrift();

  /* 事件：定时触发 */
  const q = [];
  if (G.t === 1) q.push('zxy_knock');
  if (G.t === 4) q.push('lq_question');
  if (G.t % 13 === 5) q.push('ask_' + (G.t % 2 ? 'food' : 'warm'));
  if (G.t % 17 === 6) { const cold = G.npcs.filter(n=>n.alive).sort((a,b)=>a.state.temp-b.state.temp)[0]; if (cold) q.push('cold_' + cold.id); }
  q.forEach(k => { G.fired[k] = 1; runEvent(k).catch(e => console.warn('evt', k, e)); });

  /* 传播链：每 5 拍，有人可能把话说出去 */
  if (G.t % 5 === 0 && G.t > 3) {
    const holders = G.npcs.filter(n => n.alive && knowLevel(n.id) >= 1);
    if (holders.length) {
      const from = holders[Math.floor(Math.random() * holders.length)];
      spread(from.id, knowLevel(from.id)).forEach(tid => {
        setKnow(tid, Math.max(1, knowLevel(from.id) - 1), `${(G.npcs.find(x=>x.id===from.id)||{}).name} 说的`);
      });
      if (Math.random() < 0.35) rumorTick().catch(e => console.warn(e));
    }
    if (G.revealed && !G.afterRevealDone) { G.afterRevealDone = 1; afterReveal().catch(e=>console.warn(e)); }
    checkReveal();
  }

  /* 挑明之后的第 5 天 */
  if (G.revealed && G.t > 8 && !G.fired.d5 && G.hh >= 7) {
    day5Morning().catch(x => console.warn(x));
  }
  /* 挑明后每 12 拍可能有人夜里来敲门 */
  if (G.revealed && G.t % 12 === 9 && !G.pendingKnock) {
    nightKnock().catch(x => console.warn(x));
  }

  /* 女主线 */
  if (G.t % 9 === 4 && G.t > 2) {
    const a = arcOf('zxy');
    const z = G.npcs.find(n => n.id === 'zxy');
    if (z && z.alive) {
      if (a.pride <= 0 && !a.collapsed) zxyCollapse().catch(e=>console.warn(e));
      else if (z.state.temp < 40 && G.t - (a.lastAsk || 0) > 8) zxyAsk().catch(e=>console.warn(e));
    }
  }
  if (G.t % 14 === 7) xcAsk().catch(e=>console.warn(e));
  if (G.guests.includes('xc') && !G.contrastDone && G.t > 6) {
    G.contrastDone = 1; contrastScene().catch(e=>console.warn(e));
  }

  renderRight();
  renderAll();
  maybeSave();
}

let saveTimer = null;
function maybeSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    SAVE.save().then(() => { G.saveState = '已存'; flashSave(); });
  }, 1200);
}
function flashSave() {
  const el = document.getElementById('savestate');
  if (!el) return;
  el.textContent = '已存档 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  el.style.opacity = 1;
  setTimeout(() => { el.style.opacity = .35; }, 2500);
}

function lastSpoke(id) {
  for (let i = G.log.length - 1; i >= 0; i--) {
    const m = G.log[i];
    if ((m.type === 'msg' && m.id === id) || (m.type === 'me' && id === 'me')) return i;
  }
  return -1;
}

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function deathOf(n) {
  addSys(stamp(), `${n.room} 无设备活动记录。`);
  /* 死在门口的人和死在自己家的人，是不一样的 */
  if (n.at === '门口' || G.playerDoor) {
    n.diedAtDoor = true;
    addKnock(`${n.name} 倒在了 6 楼走廊。`);
  }
}

/* 地图上的漂移：只在玩家能"看见"的硬件层面 */
function npcDrift() {
  let r = 0;
  const alive = G.npcs.filter(n => n.alive);
  const n = alive[Math.floor(Math.random() * alive.length)];
  r = Math.random();
  n.at = r < 0.74 ? '家' : (r < 0.9 ? '门口' : '楼道');
  if (n.at === '门口' && n.far) { G.playerDoor = true; }
}

/* ---------- 事件脚本 ---------- */
async function scriptedEvent(key) {
  if (G.fired[key]) return;
  return runEvent(key);
}
async function runEvent(key) {
  G.fired[key] = 1;
  if (key === 'zxy_knock') {
    G.playerDoor = true;
    addKnock('6 楼走廊，有人在你门口站了一会儿。没有敲门。');
    const z = G.npcs.find(n => n.id === 'zxy');
    const r = await react(z, G, G.log,
      '你上到 6 楼，站在 601 门口。你知道里面有人，也知道那个人家里有吃的。你在那儿站了十分钟没敲。', 
      '你极其不愿被看成来要东西的人。你现在正在犹豫。');
    if (r) addMsg('zxy', r.text);
    return;
  }
  if (key === 'lq_question') {
    const l = G.npcs.find(n => n.id === 'lq');
    const r = await decideChat(l, G, G.log, '楼上有人一直在走廊里走来走去，一整天没人说句话。', null);
    if (r) addMsg('lq', r.text);
    return;
  }
  if (key.startsWith('ask_')) {
    const alive = G.npcs.filter(n => n.alive && n.state.temp > 20);
    if (!alive.length) return;
    /* 优先挑最近没在群里说过话的人，避免总是同几个人发言 */
    const spoken = alive.map(n => ({ n, last: lastSpoke(n.id) }));
    spoken.sort((a, b) => a.last - b.last);
    const n = spoken[0].n;
    const r = await decideChat(n, G, G.log,
      '你家只够撑到今天晚上了。你在群里绕了一圈，最后决定开口问一句——但不是直接要。', null);
    if (r) addMsg(n.id, r.text);
    return;
  }
  if (key.startsWith('cold_')) {
    const id = key.slice(5);
    const n = G.npcs.find(x => x.id === id);
    if (!n || !n.alive) return;
    const r = await decideChat(n, G, G.log, '你现在冷得厉害，手不太听使唤。', null);
    if (r) addMsg(n.id, r.text);
    return;
  }
}

/* ---------- 玩家行动 ---------- */
async function deliver(toId, item, qty) {
  const n = G.npcs.find(x => x.id === toId);
  if (!n || !n.alive) return;
  G.stock[item] = Math.max(0, (G.stock[item] || 0) - qty);
  if (item === '煤球') { n.state.temp = clamp(n.state.temp + qty * 6, 0, 100); }
  if (item === '食物包') { n.state.food = clamp(n.state.food + qty * 20, 0, 100); }
  if (item === '药') { n.state.hp = clamp(n.state.hp + qty * 15, 0, 100); }
  addKnock(`你把 ${qty} 份${item}放在了 ${n.room} 门口。`);
  /* 他自己会知道；同时"有人在楼道放东西"这件事会漏出去 */
  setKnow(n.id, 2, '你给他放的东西');
  LOG.mark(n.id, '投送', +2, `他给我放了 ${qty} 份${item}`);
  G.owes[n.id] = (G.owes[n.id] || 0) + 1;
  G.trust[n.id] = G.trust[n.id] || {};
  G.trust[n.id]['me'] = (G.trust[n.id]['me'] || 0) + 1;
  /* 有 35% 概率被邻居撞见 → 直接怀疑 */
  const witness = G.npcs.filter(x => x.alive && x.id !== n.id && Math.random() < 0.35);
  witness.forEach(w => {
    setKnow(w.id, Math.max(knowLevel(w.id), Math.random() < 0.45 ? 2 : 1), '看见有人往他门口放东西');
    G.trust[w.id] = G.trust[w.id] || {};
  });
  /* 传播：收下的人会说出去，或被邻居看见 */
  const r = await react(n, G, G.log,
    `有人把 ${qty} 份${item} 放在你家门口，没敲门，你从猫眼里只看见一个背影。`, null);
  if (r) addMsg(n.id, r.text);
  if (item === '煤球' || item === '食物包') {
    const seen = G.npcs.filter(x => x.alive && x.id !== n.id && Math.random() < 0.35);
    for (const s of seen) {
      const r2 = await react(s, G, G.log,
        `你听见 ${n.room} 门口有响动，后来看见他们抱着东西进门。`, 
        '你不太高兴，但也不会直接说。你会绕着说。');
      if (r2) addMsg(s.id, r2.text);
    }
  }
  renderAll();
}

/* 判断这句话暴露了多少
   L1 暗示   —— 我有多的、我这儿暖、可以来拿
   L2 明说   —— 我有吃的 / 有煤 / 有药 / 有存货
   L3 兜不住 —— 吃不完、管够、一直有、随便拿、都来 */
function analyzeLeak(text) {
  const t = text;
  const L3 = /(吃不完|管够|随便拿|不够再拿|一直在|从来就没缺|要多少有多少)/;
  const L2 = /(我有吃的|有吃的|有存粮|囤了|有煤|有药|存货|家里还有|够吃|剩下的|分你|给你点|我这儿有)/;
  const L1 = /(热水|剩下的|多的|来拿|可以来|暖和|我这儿|不至于|帮忙|匀一点|匀点)/;
  if (L3.test(t)) return 3;
  if (L2.test(t)) return 2;
  if (L1.test(t)) return 1;
  return 0;
}

function applyLeak(level, text) {
  const alive = G.npcs.filter(n => n.alive);
  if (level >= 3) {
    /* 全群直接确定：话已经说出去了，收不回来 */
    alive.forEach(n => setKnow(n.id, Math.max(knowLevel(n.id), 2), '你自己在群里说的'));
    addKnock('群里的消息被截图转发了。你自己的话，删不掉。');
    G.revealed = true; G.afterRevealDone = 0;
    return;
  }
  if (level === 2) {
    alive.forEach(n => {
      const chance = 0.55 + (knowLevel(n.id) > 0 ? 0.25 : 0);
      if (Math.random() < chance) setKnow(n.id, Math.max(knowLevel(n.id), 2), '你自己在群里说的');
      else setKnow(n.id, Math.max(knowLevel(n.id), 1), '听你自己说的，但没听全');
    });
    return;
  }
  /* L1 只让一部分人起疑；知道的人会把它当真 */
  alive.forEach(n => {
    const chance = knowLevel(n.id) >= 2 ? 0.5 : 0.3;
    if (Math.random() < chance) setKnow(n.id, Math.max(knowLevel(n.id), 1), '从你的话里听出来的');
  });
}

/* 玩家在群里说话。一句话，不一定有人接——这本身就是信息。 */
async function speak(text) {
  text = (text || '').trim();
  if (!text) return;
  G.log.push({ type: 'me', t: stamp(), who: '601', text });
  /* 你自己说的话，所有人都会记一笔 */
  G.npcs.filter(n => n.alive).forEach(n => {
    if (Math.random() < 0.5) LOG.mark(n.id, '听见', 0, `他在群里说「${text.slice(0, 18)}」`);
  });
  G.mySpoken = (G.mySpoken || 0) + 1;
  render();

  /* 你自己说出来的话，比被人看见更致命：话是公开的，而且收不回来 */
  const leak = analyzeLeak(text);
  if (leak) applyLeak(leak, text);

  /* 防刷屏：每分钟最多 1 次多人回应，其余时间最多 1 个人接 */
  const nowT = G.t;
  const burst = (nowT - (G.lastBurst || -99)) > 2;
  if (burst) G.lastBurst = nowT;

  /* 谁回应？不是所有人都该接话：
     - 刚被点过名、知道你有东西、或者性格外向的人更可能接 */
  const alive = G.npcs.filter(n => n.alive);
  const scored = alive.map(n => {
    let s = 0.1;
    if (knowLevel(n.id) >= 2) s += 0.25;
    if ((G.owes[n.id] || 0) > 0) s += 0.2;
    if (n.id === 'lq' || n.id === 'wgp') s += 0.2;
    if (n.state.temp < 20) s -= 0.15;
    if (/601|六楼/.test(text)) s += 0.3;
    return { n, s };
  }).sort((a, b) => b.s - a.s);

  /* 你说漏了嘴 / 明说了，会有人当场接住这句话 */
  const hot = leak >= 2 || G.revealed;

  const n = hot ? 2 : (burst ? (Math.random() < 0.7 ? 1 : 2) : 1);
  for (let i = 0; i < Math.min(n, scored.length); i++) {
    const pick = scored[i];
    if (Math.random() > pick.s + 0.25) continue;
    const tone = hot
      ? (knowLevel(pick.n.id) >= 2
          ? '他这句话等于承认了。你现在不想再装不知道了。你要么问他要，要么问他凭什么。'
          : '你一直怀疑 601 那户有问题，这句话让你确定了。你不会直接要，但你会让他知道你不傻。')
      : '你自己决定要不要接这句话。可以接、可以顶、可以装没看见——装没看见就别说话。';
    const r = await react(pick.n, G, G.log,
      `601 在群里说话了：「${text}」`, tone);
    if (r) addMsg(pick.n.id, r.text);
    await new Promise(res => setTimeout(res, 400));
  }
  renderAll();
  maybeSave();
}

async function openDM(id) {
  G.dmOpen = id;
  if (!G.dm[id]) G.dm[id] = [];
  renderDM();
}

async function sendDM(id, text) {
  const n = G.npcs.find(x => x.id === id);
  if (!n) return;
  const hist = G.dm[id] || (G.dm[id] = []);
  hist.push({ role: 'user', content: text });
  G.log.push({ type: 'dmm', t: stamp(), who: n.name, text });
  render();
  const r = await dmReply(n, G, G.log, hist);
  if (r && r.text) {
    hist.push({ role: 'assistant', content: r.text });
    G.log.push({ type: 'dmu', t: stamp(), who: n.name, text: r.text });
  }
  render();
  renderDM();
}

/* 有人知道"601 有东西"并且态度恶化 → 挑明 */
function checkReveal() {
  if (G.revealed) return;
  const bold = G.npcs.filter(n => n.alive && knowLevel(n.id) >= 2);
  if (bold.length >= 2 && Math.random() < 0.4) {
    const by = bold[Math.floor(Math.random() * bold.length)];
    G.revealed = true;
    confront(by.id).catch(e => console.warn(e));
  }
}

async function acceptGuest(id) {
  const n = G.npcs.find(x => x.id === id);
  if (!n || G.guests.includes(id) || G.guests.length >= 3) return;
  G.guests.push(id);
  n.at = '601';
  addKnock(`你开了门。${n.name} 进来了。`);
  setKnow(id, 3, '进过你家');
  LOG.mark(id, '收留', +4, `他让我进了屋，这儿是暖的，还有得吃`);
  G.owes[id] = (G.owes[id] || 0) + 2;
  n.state.temp = Math.max(n.state.temp, 45);
  const r = await react(n, G, G.log,
    '门开了。屋里有热度，桌上有吃的东西。你站在门口没有立刻进来——你身上还在发抖。', null);
  if (r) addMsg(n.id, r.text);
  renderAll();
}

function evictGuest(id) {
  G.guests = G.guests.filter(x => x !== id);
  const n = G.npcs.find(x => x.id === id);
  if (n) n.at = '家';
  addKnock(`${n ? n.name : id} 走了。`);
  LOG.mark(id, '离开', -2, '我走了，他没留我');
  renderAll();
}
