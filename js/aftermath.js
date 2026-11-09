/* ---------- 挑明之后：第 5 天的政治 ---------- */
/* 全员知道你家里有东西，博弈从"猜"变成"分"。
   四个阵营不是写死的标签，是每个人根据性格 + 欠账 + 体温临时算出来的立场：
   - 护你：拿过你的东西，或者本身讲规矩
   - 要你：觉得应该平分，理由越正当越好
   - 观望：什么都不说，等别人先动
   - 怕你：知道你有东西，反而不敢靠近——他怕他欠不起 */

function stanceOf(n) {
  if (!G.revealed) return '未知';
  const owes = G.owes[n.id] || 0;
  const cold = n.state.temp < 25;
  const role = n.id;
  if (owes >= 3) return '护你';
  if (cold && owes === 0) return '要你';
  if (owes >= 1) return '护你';
  /* 按人设判，身份不在列的直接按性格里的关键字 */
  if (role === 'lq') return '立规矩';
  if (role === 'cx' || role === 'gh') return '观望';
  if (role === 'xc' || role === 'zhk') return '护你';
  if (role === 'qfs' || role === 'syl') return '观望';
  if (/账|算|规矩|管/.test(n.char || '')) return '立规矩';
  return '要你';
}

function stanceDesc(s) {
  return {
    '护你': '拿过你的东西，现在替你说话',
    '要你': '认定你该分出来，而且会讲出一套道理',
    '立规矩': '不站队，只负责定分配办法',
    '观望': '不说话，等别人先动',
    '怕你': '知道你富，反而不敢靠近',
    '未知': ''
  }[s] || s;
}

/* 挑明后的第一个早晨：群里必须有一次"怎么分"的正面冲突 */
async function day5Morning() {
  if (G.fired.d5) return;
  G.fired.d5 = 1;
  addSys(stamp(), '第 5 天。楼里已经没人再问"601 到底有没有"了。');
  await sleep(600);

  /* 第一个开口的永远是想立规矩的那个 */
  const lq = G.npcs.find(n => n.id === 'lq' && n.alive);
  if (lq) {
    const r = await react(lq, G, G.log,
      '昨天的事已经摊开了。现在楼道里的人开始往 6 楼走。你知道再不管，今晚就会出事。',
      '你要定一个办法。你不问 601 同不同意，你直接定。');
    if (r) addMsg('lq', r.text);
    await sleep(500);
  }

  /* 要东西的人接话（性格决定理由） */
  const askers = G.npcs.filter(n => n.alive && stanceOf(n) === '要你');
  for (const a of askers.slice(0, 2)) {
    const r = await react(a, G, G.log,
      '李强刚刚在群里定了规矩：按户分。',
      '你觉得这规矩对你不公平，或者太少。你要说出你自己的那套道理——用道德、用孩子、用身体，不用求。');
    if (r) addMsg(a.id, r.text);
    await sleep(500);
  }

  /* 护你的人必须冒头，否则玩家会以为自己孤立无援 */
  const guards = G.npcs.filter(n => n.alive && stanceOf(n) === '护你');
  if (guards.length) {
    const g = guards[0];
    const r = await react(g, G, G.log,
      '有人在群里开始算 601 该分多少。',
      '你替 601 说了一句话。你不是在报恩，你只是觉得这么算不对。');
    if (r) addMsg(g.id, r.text);
  }
  renderAll();
}

/* 夜里：有人在你门口排队 / 有人敲门 */
async function nightKnock() {
  const alive = G.npcs.filter(n => n.alive && !G.guests.includes(n.id));
  if (!alive.length) return;
  /* 挑最冷的那个：冻到极致的人会做平时不做的事 */
  const n = alive.sort((a, b) => a.state.temp - b.state.temp)[0];
  if (n.state.temp > 35) return;
  G.playerDoor = true;
  addKnock(`${n.name}（${n.room}）站在你门口。这次是敲了门的。`);
  const r = await react(n, G, G.log,
    '你敲了 601 的门。你知道里面有吃的，你已经不在乎体面了。',
    '你现在只想要一个结果：进去，或者听他说一句不。');
  if (r) addMsg(n.id, r.text);
  G.pendingKnock = n.id;
  renderAll();
}

/* 玩家开门（收进空间）／不开（对方离开但记住） */
async function answerKnock(accept) {
  const id = G.pendingKnock;
  if (!id) return;
  G.pendingKnock = null;
  G.playerDoor = false;
  const n = G.npcs.find(x => x.id === id);
  if (!n) return;
  if (accept) {
    await acceptGuest(id);
  } else {
    addKnock(`你没有开门。${n.name} 在门口站了一会儿，走了。`);
    setKnow(id, 3, '你把他关在门外');
    LOG.mark(id, '拒绝', -4, '我敲了门，他没开');
    G.owes[id] = Math.max(0, (G.owes[id] || 0) - 1);
    const r = await react(n, G, G.log,
      '601 没有开门。你站了一会儿，回自己家去了。',
      '你不会在群里骂他。你会记着。');
    if (r) addMsg(n.id, r.text);
  }
  renderAll();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
