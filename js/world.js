/* ---------- 零下三十七 · 世界数据 ---------- */

/* 代理地址：本地运行时由 start.sh 自动改写；线上可用 ?proxy= 覆盖 */
const AW = (function () {
  try {
    const q = new URLSearchParams(location.search).get('proxy');
    if (q) { localStorage.setItem('zb37_proxy', q); return q.replace(/\/$/, ''); }
    const saved = localStorage.getItem('zb37_proxy');
    if (saved) return saved;
  } catch (e) {}
  return 'https://dis-waters-separated-fairfield.trycloudflare.com';
})();

const WORLD = {
  cast: null,   // 开局由 rollCast() 填
  firm: '幸福里小区 · 3 号楼',
  outside: -37,
  day: 4, hour: 7, minute: 40,
  indoor: 4,

  npcs: [
    { id:'wgp', name:'王桂芬', room:'602', floor:6, far:true, age:68, job:'退休教师',
      look:'#c47a5a', ini:'王',
      char:'热心但有账本。嗓门大，替人说话的时候是在记账。年轻时管过教导处，改不了那种口气。',
      fear:'被人发现她其实谁都指望不上。',
      state:{ temp:19, food:12, hp:60 },
      knows:{ self:1, player:0 },
      alive:true, at:'602' },

    { id:'lq', name:'李强', room:'401', floor:4, age:43, job:'货运司机',
      look:'#5a7a9c', ini:'李',
      char:'先立规矩的人。不是坏，是怕乱。说话短、硬，不爱解释。',
      fear:'老婆孩子先撑不住。',
      state:{ temp:52, food:48, hp:88 },
      knows:{ self:1, player:0 },
      alive:true, at:'401' },

    { id:'zxy', name:'赵小雅', room:'203', floor:3, age:26, job:'幼师',
      look:'#9c7ab5', ini:'赵',
      char:'习惯问别人怎么办。男友在身边，但她不敢什么都靠他。',
      fear:'男友其实靠不住。',
      state:{ temp:58, food:55, hp:90 },
      knows:{ self:1, player:0 },
      alive:true, at:'203' },

    { id:'cw', name:'陈武', room:'102', floor:1, age:55, job:'下岗工人',
      look:'#7a8f5a', ini:'陈',
      char:'话少，报数就行。会自己出去干活，不解释干了什么。',
      fear:'说了实话就没人管他。',
      state:{ temp:31, food:64, hp:74 },
      knows:{ self:1, player:0 },
      alive:true, at:'102' },

    { id:'xc', name:'许晨', room:'501', floor:5, age:21, job:'大学生',
      look:'#5a9c8f', ini:'许',
      char:'老实到把底牌全亮了。想被人当成好人，是因为不想一个人待着。',
      fear:'被人发现他其实没那么大方。',
      state:{ temp:61, food:40, hp:90 },
      knows:{ self:1, player:0 },
      alive:true, at:'501' },

    { id:'cx', name:'崔晓', room:'702', floor:7, age:28, job:'?',
      look:'#8f8f5a', ini:'崔',
      char:'搬来半年没人见过。所有的话都是交易，从不说自己缺什么。',
      fear:'被认出是谁。',
      state:{ temp:70, food:80, hp:95 },
      knows:{ self:1, player:0 },
      alive:true, at:'702' },
  ],

};
