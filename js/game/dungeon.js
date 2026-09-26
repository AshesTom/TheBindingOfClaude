// Génération d'un étage façon Isaac : grille de salles, cul-de-sac pour le boss et les
// salles spéciales, salle secrète nichée entre plusieurs salles.

const MAP_W = 11;
const MAP_H = 9;
const NB = [[0, -1, 'up'], [0, 1, 'down'], [-1, 0, 'left'], [1, 0, 'right']];
const rkey = (x, y) => x + ',' + y;

class RoomData {
  constructor(gx, gy, type) {
    this.gx = gx;
    this.gy = gy;
    this.type = type; // start | normal | boss | treasure | shop | secret | offer | ally
    this.doors = {};
    this.cleared = type !== 'normal' && type !== 'boss';
    this.visited = false;
    this.seen = false;
    this.cells = null;
    this.layout = null;
    this.spawns = [];
    this.saved = null; // entités persistantes (ramassables, piédestaux…)
    this.decals = null;
    this.bg = 0;
  }
  get key() {
    return rkey(this.gx, this.gy);
  }
}

class Dungeon {
  constructor(floorIdx, opts = {}) {
    this.floorIdx = floorIdx;
    this.fl = FLOORS[floorIdx];
    this.rooms = new Map();
    this.opts = opts;
    for (let tries = 0; tries < 200; tries++) {
      if (this.generate()) break;
    }
  }

  get(x, y) {
    return this.rooms.get(rkey(x, y));
  }

  neighbors(x, y) {
    let n = 0;
    for (const [dx, dy] of NB) if (this.get(x + dx, y + dy)) n++;
    return n;
  }

  generate() {
    this.rooms.clear();
    const target = this.fl.rooms + randInt(0, 2);
    const sx = 5;
    const sy = 4;
    this.rooms.set(rkey(sx, sy), new RoomData(sx, sy, 'start'));
    const queue = [[sx, sy]];
    let count = 1;
    while (queue.length && count < target) {
      const [x, y] = queue.shift();
      for (const [dx, dy] of shuffle(NB.slice())) {
        if (count >= target) break;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        if (this.get(nx, ny)) continue;
        if (this.neighbors(nx, ny) > 1) continue;
        if (Math.random() < 0.5 && !(x === sx && y === sy)) continue;
        this.rooms.set(rkey(nx, ny), new RoomData(nx, ny, 'normal'));
        queue.push([nx, ny]);
        count++;
      }
      if (!queue.length && count < target) {
        // relance depuis une salle au hasard
        const all = [...this.rooms.values()];
        const r = choice(all);
        queue.push([r.gx, r.gy]);
      }
    }
    if (count < target) return false;
    // Distances depuis le départ
    const dist = new Map([[rkey(sx, sy), 0]]);
    const q2 = [[sx, sy]];
    while (q2.length) {
      const [x, y] = q2.shift();
      for (const [dx, dy] of NB) {
        const k = rkey(x + dx, y + dy);
        if (this.rooms.has(k) && !dist.has(k)) {
          dist.set(k, dist.get(rkey(x, y)) + 1);
          q2.push([x + dx, y + dy]);
        }
      }
    }
    const deadEnds = [...this.rooms.values()].filter((r) => r.type === 'normal' && this.neighbors(r.gx, r.gy) === 1);
    const needAlly = !!this.opts.allyRoom;
    if (deadEnds.length < (needAlly ? 4 : 3)) return false;
    deadEnds.sort((a, b) => dist.get(b.key) - dist.get(a.key));
    const boss = deadEnds.shift();
    if (dist.get(boss.key) < 3) return false;
    boss.type = 'boss';
    boss.cleared = false;
    shuffle(deadEnds);
    const tre = deadEnds.shift();
    tre.type = 'treasure';
    tre.cleared = true;
    const shop = deadEnds.shift();
    shop.type = 'shop';
    shop.cleared = true;
    if (needAlly) {
      const al = deadEnds.shift();
      al.type = 'ally';
      al.cleared = true;
    }
    // Salle secrète : case vide entourée d'au moins 2 salles (hors boss)
    const cands = [];
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        if (this.get(x, y)) continue;
        let n = 0;
        let nearBoss = false;
        for (const [dx, dy] of NB) {
          const r = this.get(x + dx, y + dy);
          if (r) {
            n++;
            if (r.type === 'boss') nearBoss = true;
          }
        }
        if (n >= 2 && !nearBoss) cands.push({ x, y, n });
      }
    }
    if (cands.length) {
      cands.sort((a, b) => b.n - a.n);
      const best = cands.filter((c) => c.n === cands[0].n);
      const c = choice(best);
      const sr = new RoomData(c.x, c.y, 'secret');
      this.rooms.set(sr.key, sr);
    }
    // Salle des Offres : case vide collée au boss seulement (révélée après le boss)
    if (this.floorIdx >= 1) {
      for (const [dx, dy] of shuffle(NB.slice())) {
        const x = boss.gx + dx;
        const y = boss.gy + dy;
        if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H || this.get(x, y)) continue;
        if (this.neighbors(x, y) !== 1) continue;
        const orm = new RoomData(x, y, 'offer');
        this.rooms.set(orm.key, orm);
        break;
      }
    }
    this.link();
    this.fill();
    this.start = this.get(sx, sy);
    this.boss = boss;
    return true;
  }

  // Crée les portes entre salles adjacentes.
  link() {
    for (const r of this.rooms.values()) {
      for (const [dx, dy, dir] of NB) {
        const o = this.get(r.gx + dx, r.gy + dy);
        if (!o) continue;
        const special = ['boss', 'treasure', 'shop', 'secret', 'offer', 'ally'];
        if (r.type === 'offer' && o.type !== 'boss') continue;
        if (o.type === 'offer' && r.type !== 'boss') continue;
        const noSecret = ['boss', 'secret', 'offer'];
        if (r.type === 'secret' && noSecret.includes(o.type)) continue;
        if (o.type === 'secret' && noSecret.includes(r.type)) continue;
        let type = 'normal';
        let other = null;
        if (special.includes(o.type)) { type = o.type; other = o; }
        else if (special.includes(r.type)) { type = r.type; other = r; }
        const d = { to: o.key, type, locked: false, hidden: false };
        if (other && (type === 'treasure' || type === 'shop') && this.floorIdx >= 1 && other === o) d.locked = true;
        if (other && type === 'ally' && other === o) d.locked = true;
        if (type === 'secret' && other === o) d.hidden = true;
        if (type === 'offer' && other === o) d.hidden = true;
        r.doors[dir] = d;
      }
    }
  }

  // Choisit le plan de chaque salle et ses ennemis.
  fill() {
    const pool = this.fl.enemies;
    for (const r of this.rooms.values()) {
      r.bg = randInt(0, 2);
      if (r.type === 'normal') {
        r.layout = choice(LAYOUTS);
        if (Math.random() < 0.5) r.layout = r.layout.map((row) => row.split('').reverse().join(''));
      } else if (r.type === 'secret') r.layout = LAYOUT_SECRET;
      else if (r.type === 'treasure') r.layout = LAYOUT_TREASURE;
      else r.layout = LAYOUT_EMPTY;
      if (r.type === 'normal') {
        const light = pool.slice(0, 4);
        const heavy = pool.slice(3);
        r.layout.forEach((row, gy) => {
          for (let gx = 0; gx < GW; gx++) {
            const ch = row[gx];
            if (ch === 'e') r.spawns.push({ type: choice(light), gx, gy });
            else if (ch === 'E') r.spawns.push({ type: choice(heavy), gx, gy });
            else if (ch === 'm') {
              for (let i = 0; i < 3; i++) r.spawns.push({ type: 'bug', gx, gy, jitter: true });
            }
          }
        });
        if (!r.spawns.length) r.spawns.push({ type: choice(light), gx: 3, gy: 3 }, { type: choice(light), gx: 9, gy: 3 });
      }
    }
  }

  revealAll() {
    for (const r of this.rooms.values()) if (r.type !== 'secret' && r.type !== 'offer') r.seen = true;
  }
}
