/* ---------- 结局：第 7 天 ---------- */
/* 不让玩家"打穿"，让玩家在最后一天做一次总账。
   四种收尾，由这七天做过的事决定，不是由数值好坏决定：
   - 空屋：你一个人熬过去了
   - 满屋：你把能救的都收进来了
   - 关着：有人在你门口死了
   - 分光：你把东西分出去了，自己没剩多少
   结局只输出三段：一段天，一段楼，一段你自己。 */

const ENDING = {
  done: false,

  /* 判断条件 */
  verdict() {
    const alive = G.npcs.filter(n => n.alive);
    const dead = G.npcs.filter(n => !n.alive);
    const guests = G.guests.map(id => G.npcs.find(n => n.id === id)).filter(Boolean);
    const deadAtDoor = dead.some(n => n.diedAtDoor);
    const gave = Object.values(G.owes).reduce((s, v) => s + v, 0);

    if (deadAtDoor) return '关着';
    if (alive.length >= 5 && guests.length === 0) return '空屋';
    if (guests.length >= 2) return '满屋';
    if (gave >= 12) return '分光';
    if (guests.length === 1) return '一盏灯';
    return '熬';
  },

  async run() {
    if (this.done) return;
    this.done = true;
    const v = this.verdict();
    const alive = G.npcs.filter(n => n.alive);

    addSys(stamp(), '第 7 天。温度计停在 -41，不再往下走了。');
    await sleep(900);

    /* 最后一段天 */
    const sky = await LLM.ask([{ role: 'user', content:
      `这是末日的第 7 天清晨。室外零下四十一度，已经不再恶化。楼里还剩 ${alive.length} 户有人。` +
      `请写三句话：第一句写窗外的天气，第二句写楼里的声音，第三句写这一栋楼现在的样子。` +
      `不要抒情，不要比喻，只要看到的东西。每句不超过 20 字。` }],
      { system: '你是一个冷静的旁观者，只写看到的东西。中文，短句，不写感想。', max: 200, temp: 0.9 });
    if (sky.text) addSys(stamp(), sky.text.trim());

    await sleep(700);

    /* 每个人一条终局消息 */
    for (const n of alive) {
      const tone = G.guests.includes(n.id)
        ? '你在 601 屋里。这是第七天。你想说一句什么。'
        : '这是第七天。你还活着，自己在家里。你想在群里说一句什么。';
      const r = await react(n, G, G.log, tone,
        '这是最后一天你能说的一句话。不要总结，不要说大道理。');
      if (r) addMsg(n.id, r.text);
      await sleep(500);
    }

    await sleep(600);

    /* 结局正文 */
    const guestNames = G.guests.map(id => (G.npcs.find(n => n.id === id) || {}).name).filter(Boolean);
    const deadNames = G.npcs.filter(n => !n.alive).map(n => n.name);
    const body = await LLM.ask([{ role: 'user', content:
      `写这个冬天的结尾。第三人称，视角是 601 这户人家，不要写"你"。\n` +
      `第七天，室外零下四十一度。\n` +
      `收留在他屋里的：${guestNames.join('、') || '没有人'}。\n` +
      `没能活下来的：${deadNames.join('、') || '没有人'}。\n` +
      `欠他东西的人：${Object.entries(G.owes).filter(([, v]) => v > 0).map(([id, v]) => (G.npcs.find(n => n.id === id) || {}).name + ' ' + v + ' 次').join('、') || '没有'}。\n` +
      `写三段，每段两到三句。第一段写屋里的人，第二段写楼里剩下的，第三段写他自己。\n` +
      `不要写"终于"，不要写"希望"，不要写春天来了这种话。结尾停在具体的东西上。` }],
      { system: '你写小说，冷，克制，不煽情。中文。', max: 600, temp: 0.95 });
    addSys(stamp(), '—— 完 ——');
    if (body.text) endPage(v, body.text.trim(), guestNames, deadNames);
    else { window.__endErr = 'empty body'; endPage(v, '（模型没有返回正文）', guestNames, deadNames); }
  }
};

function endPage(verdict, text, guests, dead) {
  window.__endText = text;
  const el = document.createElement('div');
  el.className = 'endmask';
  el.innerHTML = `<div class="endcard">
    <div class="end-v">${esc(verdict)}</div>
    <div class="end-t">${text.split('\n').filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}</div>
    <div class="end-s">
      <div>收留：${guests.length ? esc(guests.join('、')) : '没有人'}</div>
      <div>没熬过来：${dead.length ? esc(dead.join('、')) : '没有人'}</div>
      <div>这七天花了：￥${(costData && costData.cny) ? costData.cny.toFixed(4) : '—'}</div>
    </div>
    <button id="endclose">继续看这栋楼</button>
  </div>`;
  document.body.appendChild(el);
  document.getElementById('endclose').onclick = () => el.remove();
}
