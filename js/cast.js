/* ---------- 开局随机：七种人，每次抽六个 ---------- */
/* 固定的六个人玩第三次就腻了。这里准备 12 个可抽的人物，
   每个有 3 个"性格切面"——同一张脸，每次抽到的脾气不一样。 */

const POOL = [
  { id:'wgp', name:'王桂芬', room:'602', floor:6, age:68, job:'退休教师', look:'#c47a5a', ini:'王',
    faces:[
      { char:'热心但有账本。嗓门大，替人说话的时候是在记账。', fear:'被人发现她其实谁都指望不上。' },
      { char:'教了一辈子书，改不了那种"我说了算"的口气。心是好的，只是不会好好说话。', fear:'没人再听她的话。' },
      { char:'一个人住了十二年。夜里会把电视开着，虽然早就没电了。', fear:'死在家里没人知道。' }
    ], temp:[40,48,52], food:[70,86,90] },

  { id:'lq', name:'李强', room:'401', floor:4, age:43, job:'货运司机', look:'#5a7a9c', ini:'李',
    faces:[
      { char:'先立规矩的人。不是坏，是怕乱。说话短、硬，不爱解释。', fear:'老婆孩子先撑不住。' },
      { char:'跑长途跑了二十年，见过路上更糟的。他不怕冷，怕的是有人在他眼皮底下出事。', fear:'自己判断错了，害了人。' },
      { char:'老婆孩子上个月回娘家，被封在那边了。现在他一个人。', fear:'再也见不到他们，而且他知道自己不会去找。' }
    ], temp:[24,30,36], food:[35,45,55] },

  { id:'zxy', name:'赵小雅', room:'203', floor:3, age:26, job:'幼师', look:'#9c7ab5', ini:'赵',
    faces:[
      { char:'习惯问别人怎么办。男友在身边，但她不敢什么都靠他。', fear:'男友其实靠不住。' },
      { char:'从小被夸漂亮，也从小知道漂亮换不来什么。她不会求人，因为求过，没用。', fear:'被看见她其实什么都不会。' },
      { char:'幼儿园最后一个孩子是她抱出来的。那之后她说话就变得很少。', fear:'当时要是能多抱一个。' }
    ], temp:[30,40,50], food:[26,36,45] },

  { id:'cw', name:'陈武', room:'102', floor:1, age:55, job:'下岗工人', look:'#7a8f5a', ini:'陈',
    faces:[
      { char:'话少，报数就行。会自己出去干活，不解释干了什么。', fear:'说了实话就没人管他。' },
      { char:'厂子倒了以后他没再找事做，修了二十年邻居家的水管。他觉得自己没用。', fear:'被人当成累赘。' },
      { char:'他其实想上楼看看那孩子，但腿不行了，来回一趟要歇三次。', fear:'爬不动最后那几级台阶。' }
    ], temp:[26,31,38], food:[55,64,72] },

  { id:'xc', name:'许晨', room:'501', floor:5, age:21, job:'大学生', look:'#5a9c8f', ini:'许',
    faces:[
      { char:'老实到把底牌全亮了。想被人当成好人，是因为不想一个人待着。', fear:'被人发现他其实没那么大方。' },
      { char:'在学校是那种谁都喜欢但谁都不熟的人。他囤东西，是因为一个人待着太清楚该准备什么。', fear:'东西分完了，人就散了。' },
      { char:'他还相信"大家好好说总能说清楚"。这栋楼会教他别的。', fear:'有一天他自己也变成不信人的人。' }
    ], temp:[45,52,60], food:[30,40,50] },

  { id:'cx', name:'崔晓', room:'702', floor:7, age:28, job:'?', look:'#8f8f5a', ini:'崔',
    faces:[
      { char:'搬来半年没人见过。所有的话都是交易，从不说自己缺什么。', fear:'被认出是谁。' },
      { char:'他不看电视，不出门，冰箱里永远有东西。楼上楼下都以为那是空房。', fear:'有人上楼来敲门。' },
      { char:'他其实是个好人，只是有过一次事之后，就不再解释自己了。', fear:'再解释一次也没人信。' }
    ], temp:[60,70,78], food:[70,80,88] },

  { id:'zhk', name:'周慧兰', room:'302', floor:3, age:34, job:'护士', look:'#b5895a', ini:'周',
    faces:[
      { char:'在医院值了最后一个夜班才被封回来。她比谁都知道冷到什么程度会死。', fear:'她知道，但救不了。' },
      { char:'她把家里的药都分装成了小袋，写了名字。没人知道她为什么这么做。', fear:'分完了还是不够。' },
      { char:'她说话很轻，像怕吵醒谁。这是夜班的习惯。', fear:'有一天她说话没人应。' }
    ], temp:[38,46,55], food:[40,50,60] },

  { id:'dyc', name:'杜勇', room:'403', floor:4, age:51, job:'工地领班', look:'#8a7a5a', ini:'杜',
    faces:[
      { char:'嗓门比谁都大，但不敢一个人下楼。', fear:'别人看出来他怕。' },
      { char:'工地上他管过两百人，现在管不了四户邻居。', fear:'他这辈子唯一会的本事没用了。' },
      { char:'他囤了一箱白酒。他说这玩意儿能烧，也能换。', fear:'有人为了那箱酒上来。' }
    ], temp:[30,38,44], food:[42,52,62] },

  { id:'lmr', name:'刘美蓉', room:'201', floor:2, age:39, job:'超市理货员', look:'#9c6a7a', ini:'刘',
    faces:[
      { char:'她见过仓库后门最后一车的卸货单。她比谁都清楚这座城市还剩多少东西。', fear:'说出来，人就疯了。' },
      { char:'嘴甜，会看人脸色，被生活磨出来的一种本事。', fear:'被人看穿她只是在讨好。' },
      { char:'她把儿子送去姥姥家那天，路上还没结冰。', fear:'那个决定是对的。' }
    ], temp:[36,44,52], food:[48,58,66] },

  { id:'gh', name:'高原', room:'502', floor:5, age:24, job:'外卖员', look:'#6a9ca0', ini:'高',
    faces:[
      { char:'全楼最熟悉楼梯的人。他知道哪层有几个台阶。', fear:'跑不动的时候。' },
      { char:'他从不多话，别人说什么他都点头，然后做自己的。', fear:'被人发现他比大家都清醒。' },
      { char:'他的电动车停在楼下一周了，电池还满着。没人问过。', fear:'没人问过这件事本身。' }
    ], temp:[42,50,58], food:[36,46,54] },

  { id:'qfs', name:'钱福生', room:'701', floor:7, age:62, job:'退休会计', look:'#7a8a9c', ini:'钱',
    faces:[
      { char:'他算得清每户该分多少，也算得清谁多拿了。', fear:'算错了被人抓着说。' },
      { char:'一辈子跟数字打交道，老了以后跟人打交道，两样都很吃力。', fear:'别人嫌他烦。' },
      { char:'他有个本子，记了这栋楼所有人的名字和门牌。', fear:'有一天他记不动了。' }
    ], temp:[34,42,50], food:[52,60,70] },

  { id:'syl', name:'孙玉兰', room:'601b', floor:6, age:71, job:'独居', look:'#a88a6a', ini:'孙',
    faces:[
      { char:'她耳朵不好，说话声音很大，自己不知道。', fear:'听不见有人敲门。' },
      { char:'她在门口放了一把椅子，白天就坐在那儿看来往的人。', fear:'有一天没人来往了。' },
      { char:'她做饭还是做两个人的量，说是习惯了。', fear:'习惯这个东西改不掉。' }
    ], temp:[32,40,46], food:[44,54,64] }
];

const ROOMS = ['602','401','203','102','501','702','302','403','201','502','701'];
const FLOOR_OF = { '2':'3', '4':'4', '5':'5', '7':'7' };

function floorFromRoom(room) {
  return parseInt(room[0], 10);
}

/* 抽六个：保证低层有人、高层有人，且性格不重复 */
function rollCast(anchor) {
  anchor = anchor || [];
  const pool = POOL.slice();
  /* 洗牌 */
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = [];
  const usedFloors = {};
  /* 先把固定人物放进去 */
  anchor.forEach(id => {
    const p = pool.find(x => x.id === id);
    if (p) { picked.push(p); const f = floorFromRoom(p.room); usedFloors[f] = (usedFloors[f] || 0) + 1; }
  });
  for (const p of pool) {
    if (picked.length >= 6) break;
    if (picked.includes(p)) continue;
    const f = floorFromRoom(p.room);
    if ((usedFloors[f] || 0) >= 2) continue;   // 每层最多两个人
    usedFloors[f] = (usedFloors[f] || 0) + 1;
    picked.push(p);
  }
  /* 兜底：万一楼层限制导致不够 */
  for (const p of pool) {
    if (picked.length >= 6) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked.map(p => {
    const face = p.faces[Math.floor(Math.random() * p.faces.length)];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    return {
      id: p.id, name: p.name, room: p.room, floor: floorFromRoom(p.room),
      age: p.age, job: p.job, look: p.look, ini: p.ini,
      char: face.char, fear: face.fear,
      state: { temp: pick(p.temp), food: pick(p.food), hp: 80 + Math.floor(Math.random() * 18) },
      knows: { self: 1, player: 0 },
      alive: true, at: '家'
    };
  }).sort((a, b) => b.floor - a.floor);
}

window.POOL = POOL;
window.rollCast = rollCast;
