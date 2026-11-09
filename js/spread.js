/* ---------- 传播链：谁知道 601 有东西 ---------- */
/* knowledge[id] = { know:0-3, how:'', when:'' }
   0 不知道 / 1 怀疑 / 2 确定（欠你人情）/ 3 确定且觉得应该分给别人
   传播分两条路：
   - 看见（见过你放东西、见过你开门）
   - 说出（信任高、或利益相关、或怕被牵连的人会说） */

function seedKnowledge() {
  const k = {};
  G.npcs.forEach(n => { k[n.id] = { know: 0, how: '', when: '' }; });
  return k;
}

function knowLevel(id) { return (G.knowledge[id] || {}).know || 0; }

function setKnow(id, lv, how) {
  const k = G.knowledge[id] || (G.knowledge[id] = { know: 0 });
  if (lv > (k.know || 0)) {
    k.know = lv;
    k.how = how;
    k.when = stamp();
  }
}

/* 一个人知道之后，会传给谁 */
function spread(fromId, lv) {
  const from = G.npcs.find(n => n.id === fromId);
  if (!from || !from.alive) return [];
  const targets = [];
  G.npcs.forEach(t => {
    if (t.id === fromId || !t.alive) return;
    if (knowLevel(t.id) >= lv) return;
    const trust = (G.trust[fromId] || {})[t.id] || 0;   // 我多信得过这个人
    const fear = from.state.temp < 22 ? 0.15 : 0;       // 冻极了什么都肯说
    const chance = (lv >= 2 ? 0.42 : 0.2) + trust * 0.12 + fear;
    if (Math.random() < chance) targets.push(t.id);
  });
  return targets;
}

function revealText(id, how) {
  const n = G.npcs.find(x => x.id === id);
  const nk = n ? n.name : id;
  return `${nk}（${(G.knowledge[id] || {}).how || how}）`;
}

/* 群聊里出现"有人在传"的迹象 */
async function rumorTick() {
  const holders = G.npcs.filter(n => n.alive && knowLevel(n.id) >= 1);
  if (!holders.length) return;
  const n = holders[Math.floor(Math.random() * holders.length)];
  const lv = knowLevel(n.id);
  const others = G.npcs.filter(x => x.alive && x.id !== n.id && knowLevel(x.id) === 0).map(x => x.name);
  if (!others.length) return;
  const r = await decideChat(n, G, G.log,
    `你知道 601 那个人家里有吃的。${others.length ? '但' + others.slice(0, 2).join('、') + '还不知道。' : ''}` +
    (lv >= 3 ? '你觉得这事不该只有一个人知道。' : '你没打算直接说破，但你想看看别人的反应。'),
    null);
  if (r) addMsg(n.id, r.text);
}

/* 直接点破：有人当着群里说出了这件事 */
async function confront(byId) {
  const n = G.npcs.find(x => x.id === byId);
  if (!n) return;
  setKnow(byId, 3, '当面说破');
  const r = await react(n, G, G.log,
    '你决定不再绕了。你在群里把话挑明——601 那个人家里有东西，而且一直有。',
    '你说这话不是求，是讨个说法。你不怕别人怎么看你。');
  if (r) addMsg(byId, r.text);
  /* 一挑明，所有人都知道了 */
  G.npcs.forEach(t => {
    if (t.alive && t.id !== byId) setKnow(t.id, Math.max(knowLevel(t.id), 2), '群里说破');
  });
  renderAll();
}

/* 被点破之后，其它人的反应 */
async function afterReveal() {
  const alive = G.npcs.filter(n => n.alive);
  for (const n of alive) {
    const r = await react(n, G, G.log,
      '群里刚刚有人把话挑明了：601 那户人家有吃的，而且一直有。',
      '你现在知道这件事了，你怎么站？是护着，还是跟着要，还是装作没看见？');
    if (r && Math.random() < 0.7) addMsg(n.id, r.text);
  }
}
