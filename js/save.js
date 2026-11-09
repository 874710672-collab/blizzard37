/* ---------- 存档：服务端 JSON + 本地兜底 ---------- */

const SAVE = {
  key: 'blizzard37_save',
  net: false,   // 没有代理时只走本地
  remoteOk: true,

  snapshot() {
    return {
      v: 2, at: Date.now(),
      t: G.t, day: G.day, hh: G.hh, mm: G.mm,
      outside: G.outside, indoor: G.indoor,
      log: G.log.slice(-180),
      dm: G.dm,
      guests: G.guests,
      stock: G.stock,
      fired: G.fired,
      knowledge: G.knowledge,
      owes: G.owes,
      trust: G.trust,
      player: G.player,
      selected: G.selected,
      threads: (typeof TH !== 'undefined') ? TH.dump() : {},
      repeat: (typeof REPEAT !== 'undefined') ? REPEAT.hist : {},
      log45: (typeof LOG !== 'undefined') ? LOG.dump() : {},
      ending: ENDING.done,
      cast: G.npcs.map(n => ({ id: n.id, name: n.name, room: n.room, floor: n.floor,
        age: n.age, job: n.job, look: n.look, ini: n.ini, char: n.char, fear: n.fear })),
      npcs: G.npcs.map(n => ({
        id: n.id, at: n.at, alive: n.alive,
        state: n.state, knows: n.knows, mood: n.mood || null
      }))
    };
  },

  async save(quiet) {
    const s = this.snapshot();
    try { localStorage.setItem(this.key, JSON.stringify(s)); } catch (e) {}
    if (!this.net || !this.remoteOk) return;
    try {
      const r = await fetch(AW + '/api/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s)
      });
      if (!r.ok) throw new Error('save ' + r.status);
    } catch (e) {
      /* 服务端存档失败就靠本地，不打扰玩家 */
    }
  },

  async load() {
    let s = null;
    try {
      const r = await fetch(AW + '/api/save', { signal: AbortSignal.timeout(6000) });
      this.net = true;
      if (r.ok) { const d = await r.json(); if (d && d.v) s = d; }
    } catch (e) { this.net = false; }
    if (!s) {
      try {
        const raw = localStorage.getItem(this.key);
        if (raw) s = JSON.parse(raw);
      } catch (e) {}
    }
    return s;
  },

  async clear() {
    try { localStorage.removeItem(this.key); } catch (e) {}
    try { await fetch(AW + '/api/save', { method: 'DELETE' }); } catch (e) {}
  },

  apply(s) {
    if (!s || s.v !== 2) return false;
    G.t = s.t; G.day = s.day; G.hh = s.hh; G.mm = s.mm;
    G.outside = s.outside; G.indoor = s.indoor;
    G.log = s.log || [];
    G.dm = s.dm || {};
    G.guests = s.guests || [];
    G.stock = s.stock || G.stock;
    G.fired = s.fired || {};
    G.knowledge = s.knowledge || seedKnowledge();
    G.owes = s.owes || {};
    G.trust = s.trust || {};
    if (s.player) Object.assign(G.player, s.player);
    G.selected = s.selected || 'xc';
    if (s.threads && typeof TH !== 'undefined') TH.load(s.threads);
    if (s.repeat && typeof REPEAT !== 'undefined') REPEAT.hist = s.repeat;
    if (s.log45 && typeof LOG !== 'undefined') LOG.load(s.log45);
    if (s.ending) ENDING.done = true;
    G.playerDoor = false;
    if (s.cast) {
      G.npcs = s.cast.map(c => Object.assign({}, c, {
        state: { temp: 50, food: 50, hp: 90 }, knows: { self: 1, player: 0 }, alive: true, at: '家'
      }));
    }
    (s.npcs || []).forEach(p => {
      const n = G.npcs.find(x => x.id === p.id);
      if (!n) return;
      n.at = p.at || '家'; n.alive = p.alive !== false;
      if (p.state) n.state = p.state;
      if (p.knows) n.knows = p.knows;
      n.mood = p.mood || null;
    });
    return true;
  }
};
