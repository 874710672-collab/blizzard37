/* ---------- 防止复读：把说过的话记下来，下一次明确禁止 ---------- */

const REPEAT = {
  hist: {},          // npcId -> [最近说过的句子]
  max: 6,

  remember(id, text) {
    const h = this.hist[id] || (this.hist[id] = []);
    h.push(text.replace(/[，。！？…\s]/g, ''));
    if (h.length > this.max) h.shift();
  },

  /* 相似度：按 3 字片段重合算，简单够用 */
  similar(a, b) {
    a = a.replace(/[，。！？…\s]/g, '');
    b = b.replace(/[，。！？…\s]/g, '');
    if (!a || !b) return 0;
    const grams = s => { const r = new Set(); for (let i = 0; i < s.length - 2; i++) r.add(s.slice(i, i + 3)); return r; };
    const A = grams(a), B = grams(b);
    if (!A.size || !B.size) return a === b ? 1 : 0;
    let hit = 0;
    A.forEach(g => { if (B.has(g)) hit++; });
    return hit / Math.min(A.size, B.size);
  },

  isRepeat(id, text) {
    const h = this.hist[id] || [];
    return h.some(t => this.similar(t, text) > 0.55);
  },

  /* 给 prompt 用：这个人最近说过什么 */
  context(id) {
    const h = this.hist[id] || [];
    if (!h.length) return '';
    return `\n\n你最近已经说过这些话（不要重复，也不要换个说法说同一件事）：\n` +
      h.map(t => `- ${t}`).join('\n');
  },

  /* 全群最近说过的话，防止所有人都端着同一套说辞 */
  groupContext(log) {
    const recent = log.filter(m => (m.type === 'msg' || m.type === 'me')).slice(-10).map(m => m.text);
    if (!recent.length) return '';
    return `\n\n群里最近这几句已经有人说过类似的意思了，你别说同样的：\n` +
      recent.map(t => `- ${t}`).join('\n');
  }
};

/* 风格池：让同一个人的台词不一定总是从同一个角度开口 */
const ANGLES = [
  '只谈自己，不提别人',
  '提一件具体的旧事（哪一年、哪一次）',
  '说一个数字或时间',
  '反问一句',
  '说别人的事，不说自己的',
  '说一件你正在做的小事（烧水、缝东西、数东西）',
  '什么都不说，只发一半的话'
];

function pickAngle(n) {
  /* 用 id + 当前拍的哈希，保证同类事件不会总是同一个角度 */
  const seed = (n.id.charCodeAt(0) * 31 + (G.t || 0) * 17) % ANGLES.length;
  return ANGLES[seed];
}

/* 状态语里加"此刻在做什么"，让同一场景也有变化 */
function activityOf(n) {
  const t = n.state.temp;
  if (t <= 12) return '你现在几乎不动，说话要费很大劲。';
  if (n.at === '门口') return '你现在站在别人家门口，手插在袖子里。';
  if (n.at === '楼道') return '你现在在楼道里，冷得很，想快点说完。';
  const acts = ['你现在正在把小半块饼干掰成三份。', '你刚把最后一点水烧热，还在冒气。',
    '你在把两床被子摞在一起，用别针别住边。', '你在窗玻璃上刮霜，刮开一条缝往外看。',
    '你在数剩下的煤，数了两遍。', '你坐着没动，手放在膝盖上，很凉。'];
  return acts[(n.id.charCodeAt(0) + (G.t || 0)) % acts.length];
}
