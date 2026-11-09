/* ---------- AI 层：prompt 构造 + 调用 ---------- */

const LLM = {
  async ask(messages, opts = {}) {
    const r = await fetch(AW + '/api/llm', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages, max_tokens: opts.max || 500,
        temperature: opts.temp == null ? 0.95 : opts.temp,
        system: opts.system
      })
    });
    if (!r.ok) throw new Error('llm ' + r.status);
    return await r.json();
  }
};

/* 体型 / 说话方式：状态越低，句子越短、越不修饰 */
function stateVoice(n) {
  const t = n.state.temp;
  if (t <= 12) return '你现在冻得快说不出话。句子极短，常常只有几个字，可能打错字或缺标点。不要抱怨，不要求人。';
  if (t <= 30) return '你现在很冷，脑子发钝。说话短，省字，不带语气词。';
  if (t <= 50) return '你觉得冷，但还能整句说话。';
  return '你暂时不冷，说话是正常的。';
}

function threadText(log, n = 24) {
  return log.slice(-n).map(m => {
    if (m.type === 'sys') return `[${m.t}] ${m.text}`;
    if (m.type === 'dmu') return `[${m.t}] ${m.who} 私聊你：${m.text}`;
    if (m.type === 'dmm') return `[${m.t}] 你私聊 ${m.who}：${m.text}`;
    if (m.type === 'knock') return `[${m.t}] ${m.text}`;
    return `[${m.t}] ${m.who}：${m.text}`;
  }).join('\n');
}

function knowLine(n) {
  const lv = knowLevel(n.id);
  const owes = (G.owes && G.owes[n.id]) || 0;
  let s = '';
  if (lv === 1) s += '你隐约觉得 601 那户人家可能有点什么，但你不确定。\n';
  else if (lv === 2) s += '你确定 601 那户家里有吃的，而且吃过不止一次。\n';
  else if (lv >= 3) s += '你确定 601 有东西，而且你觉得这事瞒着大家不对。\n';
  if (owes >= 1) s += `你拿过 601 的东西，${owes >= 3 ? '现在心里欠得慌' : '还没找到机会还'}。\n`;
  return s;
}

function charCard(n) {
  return `【${n.name}｜${n.room}｜${n.age}岁｜${n.job}】
性格：${n.char}
她/他最怕：${n.fear}
当前：体温${Math.round(n.state.temp)}%、饱腹${Math.round(n.state.food)}%
${stateVoice(n)}${knowLine(n)}`;
}

/* 赵小雅的专用约束 */
function prideLine(n) {
  if (n.id !== 'zxy') return '';
  const a = typeof arcOf === 'function' ? arcOf('zxy') : { pride: 100 };
  if (a.pride > 60) return '\n你绝不会开口要东西。你宁可挨着。别人主动给你，你还要装作不缺。';
  if (a.pride > 25) return '\n你开始撑不住了，但你的话还是绕着说。你不会说"给我"。';
  return '\n你已经在往下掉了，但你还是想保住一点体面。你说话会很慢，很轻。';
}

const SYS_BASE = `你在一栋封死的居民楼里，楼下积雪两米，供暖停了四天，室外零下三十七度。
这是一栋普通中国居民楼的业主微信群。说中文，用口语，短句。
绝对禁止：书面语、排比句、"我理解你的感受"这类话、旁白、动作描写、括号里的神态。
你只输出消息正文，不输出姓名，不输出引号。一次最多 40 个字，超了就删。
你可以不说话——如果不该说话，就只输出一个：SILENT

写作底线：
1. 不要用固定的句式开头。不要每次都"X，你……"这种点名开头。
2. 不要复述别人说过的话，也不要换个说法说同一件事。
3. 一条消息只说一件事，不要又关心又抱怨又提议。
4. 允许你说话很难听、很没头没尾、或者只说半句。`;

const SYS_ACTION = `你在一栋封死的居民楼里，供暖停了四天，室外零下三十七度。
只输出一行动作描述（JSON 不允许，纯文本），20 字以内，写你此刻做什么。
例如：去二楼楼道口看箱子 / 站在门口不动 / 敲 601 的门。`;

/* 一个 NPC 是否要在群里说话 */
async function decideChat(n, world, log, trigger, memory) {
  const others = world.npcs.filter(x => x.id !== n.id && x.alive)
    .map(x => `- ${x.name}（${x.room}）：${x.mem?.['public'] || '不熟'}`).join('\n');
  const sys = SYS_BASE + '\n\n' + charCard(n) + prideLine(n) + `\n\n你认识的邻居：\n${others}` +
    (memory ? `\n\n你记得的事：${memory}` : '');
  const user = `现在的群记录：\n${threadText(log)}\n\n刚刚发生：${trigger}
群里现在要不要说话？如果要说，写你要发的这条消息；不说就输出 SILENT。`;
  const msgs = (typeof TH !== 'undefined') ? TH.build(n.id, user) : [{ role: 'user', content: user }];
  const r = await LLM.ask(msgs, { system: sys, max: 120, temp: 1.0 });
  const t = (r.text || '').trim();
  if (!t || /^SILENT/i.test(t)) {
    if (typeof TH !== 'undefined') TH.commit(n.id, user, null);
    return null;
  }
  const clean = t.replace(/^["“]|["”]$/g, '').slice(0, 80);
  if (typeof TH !== 'undefined') {
    TH.commit(n.id, user, clean);
    if (TH.needCompress(n.id)) TH.compress(n.id, n.name).catch(() => {});
  }
  return { text: clean, usage: null };
}

/* 对某个具体事件做出反应（敲门、投送、私聊） */
async function react(n, world, log, event, tone) {
  const sys = SYS_BASE + '\n\n' + charCard(n) + prideLine(n) +
    (typeof REPEAT !== 'undefined' ? REPEAT.context(n.id) + REPEAT.groupContext(log) : '') +
    (tone ? `\n\n${tone}` : '');
  const angle = typeof pickAngle === 'function' ? pickAngle(n) : '';
  const act = typeof activityOf === 'function' ? activityOf(n) : '';
  const user = `最近的群记录：\n${threadText(log, 16)}\n\n刚刚发生：${event}\n\n${act}\n` +
    `这一句请换个角度说：${angle}。\n` +
    `（不要重复你之前说过的话。如果此刻真的没什么可说的，就输出 SILENT。）`;
  let out = null;
  for (let k = 0; k < 2; k++) {
    /* 走这个人自己的会话：带上他的记忆摘要 + 他自己的最近对话 */
    const msgs = (typeof TH !== 'undefined') ? TH.build(n.id, user) : [{ role: 'user', content: user }];
    const r = await LLM.ask(msgs, { system: sys, max: 120, temp: 1.05 });
    const t = (r.text || '').trim();
    if (!t || /^SILENT/i.test(t)) {
      if (typeof TH !== 'undefined') TH.commit(n.id, user, null);
      return null;
    }
    const clean = t.replace(/^["“]|["”]$/g, '').slice(0, 80);
    if (typeof REPEAT === 'undefined' || !REPEAT.isRepeat(n.id, clean)) { out = clean; break; }
    out = null;
  }
  if (!out) return null;
  if (typeof REPEAT !== 'undefined') REPEAT.remember(n.id, out);
  if (typeof TH !== 'undefined') {
    TH.commit(n.id, user, out);
    if (TH.needCompress(n.id)) TH.compress(n.id, n.name).catch(() => {});
  }
  return { text: out, usage: null };
}

/* 私聊回复 */
async function dmReply(n, world, log, history) {
  const sys = SYS_BASE + '\n\n' + charCard(n) + prideLine(n) +
    `\n\n现在有人在私聊你。私聊和群里不一样——你可以端着，也可以露出真的。\n` +
    `你不一定会答应任何事。你的性格决定你怎么回。`;
  const last = history[history.length - 1];
  const msgs = (typeof TH !== 'undefined') ? TH.build(n.id, last ? last.content : '') : history;
  const r = await LLM.ask(msgs, { system: sys, max: 160, temp: 1.0 });
  const text = (r.text || '').trim().replace(/^["“]|["”]$/g, '');
  if (typeof TH !== 'undefined' && text) {
    TH.commit(n.id, last ? last.content : '', text);
    if (TH.needCompress(n.id)) TH.compress(n.id, n.name).catch(() => {});
  }
  return { text, usage: r.usage };
}
