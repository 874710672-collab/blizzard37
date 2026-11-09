/* ---------- 关系时间线：每个人对你的看法是什么时候变的 ---------- */
/* 记忆不是一堆状态，是一条线。
   每次有关键事件（收留/投送/拒绝/被点破/当面对话），就在那个人的线上打一个点。
   点在，说明那一天他对你的看法动过。 */

const LOG = {
  events: {},       // npcId -> [{t, day, hh, kind, delta, note}]
  MAX: 40,

  mark(id, kind, delta, note) {
    const arr = this.events[id] || (this.events[id] = []);
    arr.push({
      t: Date.now(),
      day: G.day, hh: G.hh, mm: G.mm,
      kind, delta, note
    });
    if (arr.length > this.MAX) arr.shift();
    /* 同步写进这个人的长期记忆，让她自己也知道 */
    if (typeof TH !== 'undefined' && note) {
      const t = TH.get(id);
      const tag = delta > 0 ? '我欠他' : delta < 0 ? '他让我记恨' : '这事我记着';
      t.mem = (t.mem ? t.mem + '；' : '') + `${tag}：${note}`;
      if (t.mem.length > 400) t.mem = t.mem.slice(-400);
    }
  },

  of(id) { return (this.events[id] || []).slice().reverse(); },

  /* 这条线现在的走向：正 = 亲近，负 = 疏远 */
  trend(id) {
    const arr = (this.events[id] || []).slice(-5);
    if (!arr.length) return 0;
    return arr.reduce((s, e) => s + e.delta, 0);
  },

  dump() { return this.events; },
  load(d) { this.events = d || {}; }
};
