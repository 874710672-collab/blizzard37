/* ---------- 女主线：赵小雅（骄傲）与许晨（互补） ---------- */

/* 赵小雅：她自己开口 = 她的骄傲塌了。
   所以她的"求助"只有三种合法形式：
   1. 交易（我拿东西换）
   2. 反问（你们谁还有…）—— 等别人接
   3. 装傻（问一个她其实知道答案的问题）
   她的 arc：pride 100 → 0，每一次她开口都掉一点。
   掉到 0 她会自己下来找你；这之前她宁可冻着。 */

const ARC = {
  zxy: { pride: 100, opened: 0, lastAsk: 0 },
  xc:  { warmth: 100, trust: 20, lastContact: 0 },
};

function arcOf(id) {
  if (!ARC[id]) ARC[id] = { pride: 100, opened: 0, lastAsk: 0 };
  return ARC[id];
}

/* 赵小雅的台词校验：她说的话必须是"不像求助的求助" */
function prideGuard(text) {
  if (!text) return null;
  const begging = /(求|拜托|能不能给|给我一点|救救|帮帮我|我没有了)/;
  if (begging.test(text)) {
    /* 让她重写一次，而不是直接把台词丢掉 */
    return { flag: 'rewrite', text };
  }
  return { flag: 'ok', text };
}

async function zxyAsk() {
  const z = G.npcs.find(n => n.id === 'zxy');
  const a = arcOf('zxy');
  if (!z || !z.alive) return;
  a.lastAsk = G.t;
  const form = a.pride > 60 ? '交易或反问' : a.pride > 25 ? '绕圈子' : '几乎明说，但还是不肯说出"给我"';
  const r = await react(z, G, G.log,
    `你家里已经没有什么能吃的了，你也没有煤了。你上到 6 楼那户门口，知道里面暖。` +
    `你不能开口要——那等于承认你输了。`,
    `你现在只能以「${form}」的方式说话。绝不能出现"求""给""帮帮我"这类字眼。` +
    `你宁愿绕三圈，也不肯说一句直接的。`);
  if (!r) return;
  const g = prideGuard(r.text);
  if (g.flag === 'rewrite') {
    const r2 = await react(z, G, G.log,
      '你刚才那句话说得太软了，你自己都觉得丢人。重说一遍。',
      '用你那种"我不是来要东西的"口气。');
    if (r2) { addMsg('zxy', r2.text); a.pride = Math.max(0, a.pride - 6); a.opened++; }
    return;
  }
  addMsg('zxy', r.text);
  a.pride = Math.max(0, a.pride - 8);
  a.opened++;
}

/* 她撑不住了，自己下来敲门——这是她线的高潮点 */
async function zxyCollapse() {
  const z = G.npcs.find(n => n.id === 'zxy');
  const a = arcOf('zxy');
  if (!z || !z.alive || a.pride > 0) return;
  a.collapsed = true;
  G.playerDoor = true;
  addKnock('6 楼走廊。有人在你门口坐下了，没有敲门。');
  const r = await react(z, G, G.log,
    '你在 601 门口坐下了。你不是来敲门的。你只是坐一会儿。',
    '你已经不打算开口了。如果他要开，他会自己开。');
  if (r) addMsg('zxy', r.text);
}

/* 许晨：他不需要你救，他救别人。他来找你是"别人需要"。 */
async function xcAsk() {
  const x = G.npcs.find(n => n.id === 'xc');
  if (!x || !x.alive) return;
  const a = ARC.xc;
  a.lastContact = G.t;
  const others = G.npcs.filter(n => n.alive && n.id !== 'xc').sort((p, q) => p.state.temp - q.state.temp)[0];
  const r = await react(x, G, G.log,
    `你自己还撑得住。但你听说 ${others ? others.name : '楼下那家'} 快不行了。`,
    `你不是来为自己要东西的。你甚至不确定 601 有没有。你只是觉得，如果不去问一句，你会过不去。`);
  if (r) addMsg('xc', r.text);
  a.trust = Math.min(100, a.trust + 5);
}

/* 两个女人的对照：她把好东西给了一个不需要的人 */
async function contrastScene() {
  const x = G.npcs.find(n => n.id === 'xc');
  const z = G.npcs.find(n => n.id === 'zxy');
  if (!x || !z || !x.alive || !z.alive) return;
  if (!G.guests.includes('xc')) return;
  const r = await react(x, G, G.log,
    `你在 601 屋里。你把一半的东西分出来，说楼下 203 那个姑娘快不行了，问能不能带下去给她。`,
    '你不是在替她说话，也不是在做好人。你只是觉得，待在这儿吃独食，不如去干点别的。');
  if (r) addMsg('xc', r.text);
}

/* 玩家送东西给赵小雅时的"她怎么看待" */
function zxyReceipt(item, qty) {
  const a = arcOf('zxy');
  if (a.pride > 60) return `你没有谢。你把东西拖进门，然后站在门后听了很久。`;
  if (a.pride > 25) return `你拿了，没说话。过了一会儿，你发了一条消息，问的是别的事。`;
  return `你拿了，说了一句很短的话，然后很快把门关了。`;
}
