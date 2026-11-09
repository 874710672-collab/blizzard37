/* ---------- 常驻会话：每个 NPC 有自己的一条记忆线 ---------- */
/* 结构：
   TH[ nid ] = {
     mem:     长期摘要（每 N 句压缩一次，纯文本，300 字以内）
     recent:  最近若干条 [{role:'user'|'assistant', content}]
     lines:   已累计多少句
     tick:    上次压缩时的 lines
   }
   调用时 = 摘要 + recent + 本次新输入。不同角色之间完全不共享。 */

const TH = {
  nid: {},
  RECENT_MAX: 12,      // 只带最近 12 条原文
  COMPRESS_EVERY: 10,  // 每 10 句压一次

  get(id) {
    if (!this.nid[id]) this.nid[id] = { mem: '', recent: [], lines: 0, tick: 0 };
    return this.nid[id];
  },

  /* 组装发给模型的 messages */
  build(id, userText) {
    const t = this.get(id);
    const msgs = [];
    if (t.mem) msgs.push({ role: 'assistant', content: `（你记得的事：${t.mem}）` });
    t.recent.forEach(m => msgs.push(m));
    msgs.push({ role: 'user', content: userText });
    return msgs;
  },

  /* 存下一轮 */
  commit(id, userText, reply) {
    const t = this.get(id);
    t.recent.push({ role: 'user', content: userText });
    if (reply) t.recent.push({ role: 'assistant', content: reply });
    t.lines++;
    while (t.recent.length > this.RECENT_MAX) t.recent.shift();
  },

  needCompress(id) {
    const t = this.get(id);
    return t.lines - t.tick >= this.COMPRESS_EVERY && t.recent.length > 3;
  },

  /* 压缩：把 recent 里较早的几条并进摘要 */
  async compress(id, name) {
    const t = this.get(id);
    t.tick = t.lines;
    const chunk = t.recent.slice(0, Math.max(2, t.recent.length - 4));
    const keep = t.recent.slice(Math.max(2, t.recent.length - 4));
    const dialog = chunk.map(m => (m.role === 'user' ? '（别人）' : '（你）') + m.content).join('\n');
    const sys = `你在帮一个人整理记忆。只输出摘要，不要解释，不要加标题。
把下面这段经历压缩成 3 行以内，只保留：谁说了什么关键的话、你欠了谁、谁欠你、你答应过什么、你对谁的看法变了。
用第一人称"我"。中文。不超过 120 字。`;
    try {
      const r = await LLM.ask([{ role: 'user', content: `已有的记忆：${t.mem || '（空）'}\n\n新的经历：\n${dialog}` }],
        { system: sys, max: 260, temp: 0.3 });
      const mem = (r.text || '').trim();
      if (mem) t.mem = mem.slice(0, 400);
      t.recent = keep;
    } catch (e) { /* 压不了就算了，保留原文 */ }
  },

  /* 存档用 */
  dump() { return this.nid; },
  load(d) { this.nid = d || {}; }
};
