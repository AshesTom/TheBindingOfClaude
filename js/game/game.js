// Scène de jeu : exploration des étages, combats, HUD.

class GameScene {
  // opts : { model, hub } — hub = le QG entre deux runs.
  constructor(opts = {}) {
    if (typeof opts === 'string') opts = { model: opts };
    this.model = opts.model || Meta.data.model;
    this.hub = !!opts.hub;
    this.heat = this.hub ? 0 : Meta.data.heat;
    this.runTokens = 0;
    this.player = new Player(this, this.model);
    this.floorNum = 0;
    this.stats = { kills: 0, time: 0, rooms: 0, cause: null };
    this.tears = [];
    this.ebullets = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.particles = [];
    this.familiars = [];
    this.seenItems = new Set();
    this.shake = 0;
    this.flash = 0;
    this.freeze = 0;
    this.fadeIn = 0;
    this.paused = false;
    this.pauseSel = 0;
    this.banner = null;
    this.floorCard = 0;
    this.bossIntro = 0;
    this.boonChoice = null;
    this.dead = false;
    this.deathT = 0;
    this.descendT = 0;
    this.victoryT = 0;
    this.denyT = 0;
    this.t = 0;
    this.flowTimer = 0;
    if (this.hub) this.setupHub();
    else {
      if (this.player.char.startItem) {
        const it = this.rollItem('treasure');
        if (it) { this.player.items.push(it); if (ITEMS[it].onPickup) ITEMS[it].onPickup(this.player, this); this.player.recompute(); this.addFamiliar(it); }
      }
      this.nextFloor(0);
    }
  }

  addFamiliar(id) {
    const it = ITEMS[id];
    if (it.familiar === 'subagent') this.familiars.push(new SubAgent(this, this.familiars.filter((f) => f instanceof SubAgent).length));
    if (it.familiar === 'orbital') this.familiars.push(new Orbital(this, this.familiars.filter((f) => f instanceof Orbital).length));
  }

  // ------------------------------------------------------------------- QG
  setupHub() {
    const tiles = new Array(ROOM_W * ROOM_H).fill(0);
    for (let y = 0; y < ROOM_H; y++) {
      for (let x = 0; x < ROOM_W; x++) if (!x || !y || x === ROOM_W - 1 || y === ROOM_H - 1) tiles[y * ROOM_W + x] = 1;
    }
    // Colonnes de part et d'autre du tapis rouge
    for (const [tx, ty] of [[5, 3], [9, 3], [5, 6], [9, 6]]) tiles[ty * ROOM_W + tx] = 2;
    const room = { gx: 4, gy: 4, type: 'hub', doors: {}, locks: {}, tiles, hp: {}, cleared: true, visited: true, seen: true, pickups: [], pedestals: [], setup: true };
    this.floorDef = { name: 'LE QG DE CLAUDE', music: 'title', theme: HUB_THEME, pool: [] };
    this.floor = { rooms: [room], start: room, get: () => null };
    this.floorNum = 0;
    this.npcs = NPCS.map((n) => Object.assign({ ph: Math.random() * 6 }, n));
    this.hubProps = [
      { spr: 'stairs', x: 120, y: 28 },
      { spr: 'brazier', x: 92, y: 36, fire: true },
      { spr: 'brazier', x: 148, y: 36, fire: true },
      { spr: 'pool', x: 60, y: 122, pool: true },
      { spr: 'maptable', x: 34, y: 100 },
    ];
    this.player.x = 120;
    this.player.y = 96;
    this.enterRoom(room, null);
    this.enemies.push(new Dummy(this, 212, 122));
    this.hubMenu = null;
    this.dialog = null;
    this.fadeIn = 0.6;
    Sound.music('title');
  }


  // ------------------------------------------------------------------ Étages
  nextFloor(defIndex) {
    this.floorNum++;
    if (defIndex === undefined) defIndex = FLOOR_ROUTE[this.floorNum - 1][0];
    this.floorDef = FLOORS[defIndex];
    this.floor = generateFloor(this.floorNum, this.floorDef);
    if (this.floorNum > 1) this.runTokens += 10;
    this.player.x = 120;
    this.player.y = 72;
    this.enterRoom(this.floor.start, null);
    this.floorCard = 3;
    this.fadeIn = 0.6;
    Sound.music(this.floorDef.music);
  }

  enterRoom(room, dir) {
    const p = this.player;
    this.room = room;
    room.visited = true;
    room.seen = true;
    for (const d of DIR_NAMES) {
      if (!room.doors[d]) continue;
      const nb = this.neighbor(room, d);
      if (nb) nb.seen = true;
    }
    this.tears = [];
    this.ebullets = [];
    this.enemies = [];
    this.spawnQueue = [];
    this.particles = [];

    if (dir === 'up') { p.x = 120; p.y = ROOM_PX_H - TILE - 9; }
    else if (dir === 'down') { p.x = 120; p.y = TILE + 9; }
    else if (dir === 'left') { p.x = ROOM_PX_W - TILE - 9; p.y = 72; }
    else if (dir === 'right') { p.x = TILE + 9; p.y = 72; }
    p.vx *= 0.3;
    p.vy *= 0.3;
    p.dashT = 0;
    p.ghosts = [];
    p.shieldUp = p.stats.shield;
    for (const f of this.familiars) f.reset();

    if (!room.bg) {
      const opts = {};
      if (room.type === 'start' && this.floorNum === 1 && Meta.data.runs < 2) opts.tutorial = true;
      else if (room.type === 'start') opts.label = this.floorDef.name;
      room.bg = renderRoomBG(room, this.floorDef.theme, opts);
    }
    this.setupRoom(room);

    if (!room.cleared) {
      if (room.type === 'boss') {
        const Cls = BOSS_TYPES[this.floorDef.boss];
        const bx = 120;
        const by = dir === 'up' ? 56 : dir === 'down' ? 88 : 64;
        const b = new Cls(this, bx, by);
        this.enemies.push(b);
        this.bossRef = b;
        this.bossIntro = 2.6;
        this.banner = null;
        this.floorCard = 0;
        Sound.music('boss');
      } else if (room.enemySpec) {
        this.spawnEnemies(room, p.x, p.y);
      }
    }
    this.computeFlow();
    this.fadeIn = Math.max(this.fadeIn, 0.18);
  }

  setupRoom(room) {
    if (room.setup) return;
    room.setup = true;
    if (room.type === 'treasure') {
      const it = this.rollItem('treasure');
      if (it) room.pedestals.push(new Pedestal(this, 120, 76, 'item', it));
      else for (let i = 0; i < 5; i++) room.pickups.push(new Pickup(this, 'coin', 120, 76, rand(-60, 60), rand(-60, 60)));
    } else if (room.type === 'shop') {
      room.vendor = { x: 120, y: 44 };
      const a = this.rollItem('shop');
      if (a) room.pedestals.push(new Pedestal(this, 72, 84, 'item', a, 15));
      const b = Math.random() < 0.5 ? this.rollItem('shop') : null;
      if (b) room.pedestals.push(new Pedestal(this, 120, 84, 'item', b, 15));
      else room.pedestals.push(new Pedestal(this, 120, 84, 'heart', null, 3));
      if (Math.random() < 0.6) room.pedestals.push(new Pedestal(this, 168, 84, 'key', null, 5));
      else room.pedestals.push(new Pedestal(this, 168, 84, 'heart', null, 3));
    }
  }

  spawnEnemies(room, px, py) {
    const free = [];
    for (let ty = 1; ty < ROOM_H - 1; ty++) {
      for (let tx = 1; tx < ROOM_W - 1; tx++) {
        if (room.tiles[ty * ROOM_W + tx] !== 0) continue;
        const cx = tx * TILE + 8;
        const cy = ty * TILE + 8;
        if (dist(cx, cy, px, py) < 64) continue;
        free.push({ x: cx, y: cy });
      }
    }
    shuffle(free);
    room.enemySpec.forEach((type, i) => {
      const pos = free[i % free.length];
      const Cls = ENEMY_TYPES[type];
      const e = new Cls(this, pos.x + rand(-3, 3), pos.y + rand(-3, 3));
      e.spawnT += i * 0.08;
      this.enemies.push(e);
    });
    Sound.play('spawn');
  }

  neighbor(room, d) {
    return this.floor.get(room.gx + DIRS[d].dx, room.gy + DIRS[d].dy);
  }

  changeRoom(d) {
    const nb = this.neighbor(this.room, d);
    if (!nb) return;
    Sound.play('door');
    this.enterRoom(nb, d);
  }

  // ------------------------------------------------------------- Collisions
  tileAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= ROOM_W || ty >= ROOM_H) return 1;
    return this.room.tiles[ty * ROOM_W + tx];
  }

  isDoorOpen(d) {
    const r = this.room;
    return r.doors[d] && r.cleared && !r.locks[d];
  }

  solidAt(tx, ty, mode) {
    const t = this.tileAt(tx, ty);
    if (t === 1) {
      if (mode === 'player') {
        const d = doorAtTile(tx, ty);
        if (d && this.isDoorOpen(d)) return false;
      }
      return true;
    }
    if (t === 2 || t === 3) return mode !== 'fly';
    if (t === 4) return true;
    return false;
  }

  boxSolid(x, y, hw, hh, mode) {
    const x0 = Math.floor((x - hw) / TILE);
    const x1 = Math.floor((x + hw - 0.01) / TILE);
    const y0 = Math.floor((y - hh) / TILE);
    const y1 = Math.floor((y + hh - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.solidAt(tx, ty, mode)) return true;
      }
    }
    return false;
  }

  moveEntity(e, dx, dy, hw, hh, mode) {
    const hit = { x: false, y: false };
    const stepAxis = (axis, d) => {
      if (!d) return;
      const steps = Math.ceil(Math.abs(d) / 4);
      const inc = d / steps;
      for (let i = 0; i < steps; i++) {
        e[axis] += inc;
        if (this.boxSolid(e.x, e.y, hw, hh, mode)) {
          e[axis] -= inc;
          // Approche fine jusqu'au contact
          let lo = 0;
          let hiV = inc;
          for (let k = 0; k < 4; k++) {
            const mid = (lo + hiV) / 2;
            e[axis] += mid;
            if (this.boxSolid(e.x, e.y, hw, hh, mode)) { e[axis] -= mid; hiV = mid; } else { e[axis] -= mid; lo = mid; }
          }
          e[axis] += lo;
          hit[axis] = true;
          return;
        }
      }
    };
    stepAxis('x', dx);
    stepAxis('y', dy);
    return hit;
  }

  // Carte de distances vers le joueur (pour que les ennemis contournent les rochers).
  computeFlow() {
    const p = this.player;
    const dist = new Int16Array(ROOM_W * ROOM_H).fill(-1);
    const sx = clamp(Math.floor(p.x / TILE), 1, ROOM_W - 2);
    const sy = clamp(Math.floor(p.y / TILE), 1, ROOM_H - 2);
    const q = [sx, sy];
    dist[sy * ROOM_W + sx] = 0;
    let qi = 0;
    while (qi < q.length) {
      const x = q[qi++];
      const y = q[qi++];
      const d = dist[y * ROOM_W + x];
      for (const dn of DIR_NAMES) {
        const nx = x + DIRS[dn].dx;
        const ny = y + DIRS[dn].dy;
        if (nx < 1 || ny < 1 || nx > ROOM_W - 2 || ny > ROOM_H - 2) continue;
        const i = ny * ROOM_W + nx;
        if (dist[i] >= 0 || this.room.tiles[i] !== 0) continue;
        dist[i] = d + 1;
        q.push(nx, ny);
      }
    }
    this.flow = dist;
  }

  lineClear(x0, y0, x1, y1) {
    const d = dist(x0, y0, x1, y1);
    const n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) {
      const x = lerp(x0, x1, i / n);
      const y = lerp(y0, y1, i / n);
      const t = this.tileAt(Math.floor(x / TILE), Math.floor(y / TILE));
      if (t !== 0) return false;
    }
    return true;
  }

  pathDir(e) {
    const p = this.player;
    if (this.lineClear(e.x, e.y, p.x, p.y)) return norm(p.x - e.x, p.y - e.y);
    const tx = Math.floor(e.x / TILE);
    const ty = Math.floor(e.y / TILE);
    const here = this.flow[ty * ROOM_W + tx];
    if (here === undefined || here < 0) return norm(p.x - e.x, p.y - e.y);
    let best = null;
    let bd = here;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        const nx = tx + ox;
        const ny = ty + oy;
        const v = this.flow[ny * ROOM_W + nx];
        if (v === undefined || v < 0 || v >= bd) continue;
        if (ox && oy && (this.tileAt(tx + ox, ty) !== 0 || this.tileAt(tx, ty + oy) !== 0)) continue;
        bd = v;
        best = { x: nx * TILE + 8, y: ny * TILE + 8 };
      }
    }
    if (!best) return norm(p.x - e.x, p.y - e.y);
    return norm(best.x - e.x, best.y - e.y);
  }

  randomFreeSpot(cx, cy, minD, maxD, flying = false) {
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = rand(minD, maxD);
      const x = cx + Math.cos(a) * d;
      const y = cy + Math.sin(a) * d;
      if (x < 30 || x > 210 || y < 30 || y > 116) continue;
      if (!flying && this.boxSolid(x, y, 6, 5, 'ground')) continue;
      return { x, y };
    }
    return { x: 120, y: 60 };
  }

  // ---------------------------------------------------------------- Combats
  hitEnemy(e, tear) {
    const p = this.player;
    let dmg = tear.dmg;
    if (p.stats.crit && Math.random() < p.stats.crit) {
      dmg *= 3;
      this.floatText(e.x, e.y - 16, 'CRIT !', '#e8404a');
    }
    const n = norm(tear.vx, tear.vy);
    if (e.hurt(dmg, n.x * 90, n.y * 90)) {
      Sound.play('hit');
      this.burst(tear.x, tear.y - 3, 3, '#ffffff', 50, 0.2);
    }
  }

  onEnemyHurt(e, dmg) {
    const p = this.player;
    p.special = Math.min(100, p.special + dmg * 1.0 * p.stats.specialRate);
  }

  onEnemyKilled(e) {
    const p = this.player;
    this.stats.kills++;
    this.runTokens += e.boss ? 20 * this.floorNum : 1;
    const col = e instanceof Ghost ? '#a86ae8' : e instanceof Fly ? '#e8404a' : e instanceof Slime ? '#78d05a' : '#c8c0c8';
    this.burst(e.x, e.y - 4, e.boss ? 40 : 12, col, e.boss ? 120 : 70, 0.5);
    Sound.play('kill');
    if (e.boss) return this.onBossDefeated(e);
    if (p.stats.vamp && Math.random() < p.stats.vamp && p.hp < p.maxHp) {
      p.hp++;
      this.floatText(p.x, p.y - 20, '+SOIN', '#78d05a');
      Sound.play('heart');
    }
    if (Math.random() < 0.06 + p.stats.luck * 0.03) {
      this.room.pickups.push(new Pickup(this, 'coin', e.x, e.y, rand(-30, 30), rand(-30, 30)));
    }
  }

  hurtPlayer(n, src) {
    const p = this.player;
    if (this.dead || p.inv > 0 || p.dashT > 0 || this.bossIntro > 0 || this.boonChoice || this.descendT > 0) return false;
    if (p.stats.dodge && Math.random() < p.stats.dodge) {
      p.inv = 0.5;
      p.dashIframe = true;
      this.floatText(p.x, p.y - 20, 'ESQUIVÉ', '#7fe8f0');
      Sound.play('dodge');
      return true;
    }
    if (p.shieldUp) {
      p.shieldUp = false;
      p.inv = 0.8;
      p.dashIframe = false;
      Sound.play('shield');
      this.burst(p.x, p.y - 4, 14, '#7fe8f0', 80, 0.4);
      return true;
    }
    p.hp -= n;
    p.inv = 1.0;
    p.dashIframe = false;
    this.shake = 5;
    this.freeze = 0.07;
    Sound.play('hurt');
    this.burst(p.x, p.y - 4, 10, '#e8404a', 70, 0.4);
    if (p.hp <= 0 && p.revives > 0) {
      p.revives--;
      p.hp = Math.max(2, Math.ceil(p.maxHp / 4) * 2);
      p.inv = 2.5;
      this.flash = 0.5;
      this.clearEnemyBullets();
      this.floatText(p.x, p.y - 24, 'CHECKPOINT RESTAURÉ !', '#78d05a');
      Sound.play('boon');
      return true;
    }
    if (p.hp <= 0) {
      p.hp = 0;
      this.dead = true;
      let killer = src && src.owner ? src.owner : src;
      if (killer instanceof EBullet) killer = this.bossRef || null;
      this.stats.killer = killer instanceof Enemy ? killer : null;
      if (src && src.label && !(src instanceof Enemy)) this.stats.killerLabel = src.label;
      this.tokensGained = Meta.endRun(this, false);
      this.deathT = 2;
      this.stats.floor = this.floorNum;
      Sound.stopMusic();
      Sound.play('bossDie');
    }
    return true;
  }

  damageTile(tx, ty) {
    const r = this.room;
    const i = ty * ROOM_W + tx;
    r.hp[i] = (r.hp[i] || 1) - 1;
    this.burst(tx * TILE + 8, ty * TILE + 8, 4, '#e8e0e8', 40, 0.3);
    if (r.hp[i] <= 0) {
      r.tiles[i] = 0;
      Sound.play('break');
      this.burst(tx * TILE + 8, ty * TILE + 8, 10, '#f070b8', 60, 0.4);
      if (Math.random() < 0.3) r.pickups.push(new Pickup(this, 'coin', tx * TILE + 8, ty * TILE + 8, rand(-20, 20), rand(-20, 20)));
      this.computeFlow();
    }
  }

  clearEnemyBullets() {
    for (const b of this.ebullets) this.burst(b.x, b.y, 2, '#f2a88a', 30, 0.3);
    this.ebullets = [];
  }

  shockwave(x, y, r, dmg) {
    this.particles.push({ type: 'ring', x, y, r0: 4, r1: r, life: 0.35, max: 0.35, c: '#f2a88a' });
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < r + e.r) {
        const n = norm(e.x - x, e.y - y);
        e.hurt(dmg, n.x * 200, n.y * 200);
      }
    }
  }

  // --------------------------------------------------------------- Effets
  burst(x, y, n, c, speed = 60, life = 0.4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(speed * 0.3, speed);
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.5, life), max: life, c, s: Math.random() < 0.3 ? 2 : 1 });
    }
  }

  floatText(x, y, text, c) {
    this.particles.push({ type: 'text', x, y, vy: -25, life: 0.9, max: 0.9, c, text });
  }

  // ------------------------------------------------------------ Objets
  rollItem(pool) {
    const cands = ITEM_IDS.filter((id) => !this.seenItems.has(id) && ITEMS[id].pools.includes(pool));
    const all = cands.length ? cands : ITEM_IDS.filter((id) => !this.seenItems.has(id));
    if (!all.length) return null;
    const id = choice(all);
    this.seenItems.add(id);
    return id;
  }

  tryTake(ped) {
    const p = this.player;
    if (ped.price > p.coins) {
      if (this.denyT <= 0) {
        this.floatText(ped.x, ped.y - 20, 'PAS ASSEZ DE PIÈCES', '#e8404a');
        Sound.play('error');
        this.denyT = 1.2;
      }
      return;
    }
    if (ped.kind === 'heart' && p.hp >= p.maxHp) {
      if (this.denyT <= 0) {
        this.floatText(ped.x, ped.y - 20, 'DÉJÀ EN PLEINE FORME', '#8a8290');
        this.denyT = 1.2;
      }
      return;
    }
    p.coins -= ped.price;
    ped.taken = true;
    if (ped.price) Sound.play('buy');
    if (ped.kind === 'item') this.giveItem(ped.item);
    else if (ped.kind === 'heart') { p.hp = Math.min(p.maxHp, p.hp + 2); Sound.play('heart'); }
    else if (ped.kind === 'key') { p.keys++; Sound.play('key'); }
  }

  giveItem(id) {
    const p = this.player;
    const it = ITEMS[id];
    p.items.push(id);
    if (it.onPickup) it.onPickup(p, this);
    p.recompute();
    if (it.familiar === 'subagent') this.familiars.push(new SubAgent(this, this.familiars.filter((f) => f instanceof SubAgent).length));
    if (it.familiar === 'orbital') this.familiars.push(new Orbital(this, this.familiars.filter((f) => f instanceof Orbital).length));
    if (it.apply && p.stats.shield) p.shieldUp = true;
    p.holdItem = id;
    p.holdT = 1.1;
    this.banner = { title: it.name, sub: it.desc, t: 3 };
    Sound.play('item');
    this.burst(p.x, p.y - 20, 16, '#f8d048', 70, 0.6);
  }

  // ------------------------------------------------------ Salle nettoyée
  onRoomClear() {
    const r = this.room;
    const p = this.player;
    r.cleared = true;
    this.stats.rooms++;
    this.runTokens += 2;
    Sound.play('doorOpen');
    if (r.type === 'normal') {
      p.special = Math.min(100, p.special + 8 * p.stats.specialRate);
      const luck = p.stats.luck * 0.05;
      const roll = Math.random() - luck;
      const cx = 120;
      const cy = 72;
      const spot = this.boxSolid(cx, cy, 4, 4, 'ground') ? this.randomFreeSpot(cx, cy, 10, 40) : { x: cx, y: cy };
      const drop = (t) => r.pickups.push(new Pickup(this, t, spot.x, spot.y, rand(-40, 40), rand(-40, 40)));
      // Clé garantie si la boutique est verrouillée et qu'on n'en a pas.
      if (this.floorNum >= 2 && p.keys === 0 && !this.floor.keyGiven) {
        this.floor.keyGiven = true;
        drop('key');
      } else if (roll < 0.22) drop('coin');
      else if (roll < 0.32) { drop('coin'); drop('coin'); drop('coin'); }
      else if (roll < 0.44) drop(Math.random() < 0.5 ? 'heart' : 'halfheart');
      else if (roll < 0.52) drop('key');
    }
  }

  onBossDefeated(boss) {
    this.shake = 12;
    this.flash = 0.4;
    Sound.play('bossDie');
    for (const e of this.enemies) {
      if (!e.dead && !e.boss) { e.dead = true; this.burst(e.x, e.y, 8, '#c8c0c8', 60, 0.4); }
    }
    this.spawnQueue = [];
    this.clearEnemyBullets();
    this.room.cleared = true;
    this.stats.rooms++;
    this.bossRef = null;
    if (this.floorNum >= FLOOR_ROUTE.length) {
      this.victoryT = 3.5;
      Sound.stopMusic();
      return;
    }
    Sound.music(this.floorDef.music);
    const owned = new Set(this.player.boons);
    const opts = shuffle(BOONS.filter((b) => !owned.has(b.id))).slice(0, 3);
    if (opts.length) this.boonChoice = { opts, sel: 1, t: 0, delay: 1.4 };
    else this.spawnBossRewards();
  }

  chooseBoon(b) {
    const p = this.player;
    p.boons.push(b.id);
    if (b.onPickup) b.onPickup(p);
    p.recompute();
    this.boonChoice = null;
    this.banner = { title: b.name, sub: b.desc, t: 3, color: b.color };
    Sound.play('boon');
    this.spawnBossRewards();
  }

  spawnBossRewards() {
    const r = this.room;
    const it = this.rollItem('boss');
    if (it) r.pedestals.push(new Pedestal(this, 120, 52, 'item', it));
    const route = FLOOR_ROUTE[this.floorNum] || [];
    const open = route.filter((i) => i !== 3 || Meta.data.paths.archives);
    if (open.length > 1) {
      r.trapdoors = open.map((fi, k) => ({ x: 76 + k * 88, y: 98, route: fi, label: FLOORS[fi].short }));
    } else {
      r.trapdoors = [{ x: 120, y: 96, route: open[0] }];
    }
    r.pickups.push(new Pickup(this, 'heart', 88, 80, rand(-20, 20), rand(-20, 20)));
    for (const td of r.trapdoors) this.burst(td.x, td.y, 20, '#a86ae8', 80, 0.6);
  }

  // ------------------------------------------------------------ Update
  update(dt) {
    this.t += dt;
    if (this.victoryT > 0) {
      this.victoryT -= dt;
      this.updateParticles(dt);
      for (const f of this.familiars) f.update(dt);
      if (this.victoryT <= 0) {
        const game = this;
        this.tokensGained = Meta.endRun(this, true);
        App.go(() => new VictoryScene(game));
      }
      return;
    }
    if (this.dialog) return this.updateDialog(dt);
    if (this.hubMenu) return this.updateHubMenu(dt);
    if (Input.pressed('pause') && !this.dead && !this.boonChoice && this.bossIntro <= 0) {
      this.paused = !this.paused;
      this.pauseSel = 0;
      Sound.play('select');
      return;
    }
    if (this.paused) return this.updatePause();
    if (this.boonChoice) return this.updateBoon(dt);
    if (this.floorCard > 0) this.floorCard -= dt;
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
    if (this.fadeIn > 0) this.fadeIn -= dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.denyT > 0) this.denyT -= dt;
    this.shake = Math.max(0, this.shake - dt * 30);

    if (this.bossIntro > 0) {
      this.bossIntro -= dt;
      if (this.bossIntro <= 0) {
        Sound.play('bossRoar');
        this.shake = 6;
      }
      return;
    }
    if (this.freeze > 0) {
      this.freeze -= dt;
      return;
    }
    if (this.dead) {
      this.deathT -= dt;
      this.updateParticles(dt);
      if (this.deathT < 1.6 && !this.deathBurst) {
        this.deathBurst = true;
        this.burst(this.player.x, this.player.y - 4, 40, '#d97757', 100, 1);
      }
      if (this.deathT <= 0) {
        const game = this;
        App.go(() => new GameOverScene(game));
      }
      return;
    }
    if (this.descendT > 0) {
      this.descendT -= dt;
      if (this.descendT <= 0) this.nextFloor(this.nextRoute);
      return;
    }

    this.stats.time += dt;
    const p = this.player;
    const r = this.room;

    this.flowTimer -= dt;
    if (this.flowTimer <= 0) {
      this.flowTimer = 0.2;
      this.computeFlow();
    }

    p.update(dt);
    for (const f of this.familiars) f.update(dt);
    for (const e of this.enemies) if (!e.dead) e.update(dt);
    // Séparation douce entre ennemis
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.dead || a.boss) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.dead || b.boss) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const min = a.r + b.r - 2;
        if (d > 0 && d < min) {
          const push = (min - d) * 0.5;
          const n = norm(b.x - a.x, b.y - a.y);
          a.move(-n.x * push, -n.y * push);
          b.move(n.x * push, n.y * push);
        }
      }
    }
    for (const t of this.tears) t.update(dt);
    for (const b of this.ebullets) b.update(dt);
    this.tears = this.tears.filter((t) => !t.dead);
    this.ebullets = this.ebullets.filter((b) => !b.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    if (this.spawnQueue.length) {
      this.enemies.push(...this.spawnQueue);
      this.spawnQueue = [];
    }
    for (const pk of r.pickups) pk.update(dt);
    r.pickups = r.pickups.filter((pk) => !pk.dead);
    for (const pd of r.pedestals) pd.update(dt);
    this.updateParticles(dt);

    if (!r.cleared && this.enemies.length === 0 && r.type !== 'boss') this.onRoomClear();

    // Portes verrouillées
    for (const d of DIR_NAMES) {
      if (!r.doors[d] || !r.locks[d] || !r.cleared) continue;
      const dx = DIRS[d].tx * TILE + 8;
      const dy = DIRS[d].ty * TILE + 8;
      if (dist(p.x, p.y, dx, dy) < 17) {
        if (p.keys > 0) {
          p.keys--;
          r.locks[d] = false;
          const nb = this.neighbor(r, d);
          if (nb) nb.locks[DIRS[d].opp] = false;
          Sound.play('unlock');
          this.burst(dx, dy, 10, '#f8d048', 60, 0.4);
        } else if (this.denyT <= 0) {
          this.floatText(dx, dy + 10, 'IL FAUT UNE CLÉ', '#f8d048');
          Sound.play('error');
          this.denyT = 1.2;
        }
      }
    }

    // Trappe vers l'étage suivant
    for (const td of r.trapdoors || []) {
      if (dist(p.x, p.y, td.x, td.y) < 8 && p.holdT <= 0 && this.descendT <= 0) {
        this.descendT = 0.9;
        this.nextRoute = td.route;
        Sound.play('stairs');
      }
    }
    if (this.hub) this.updateHub(dt);
    // Pics
    if (this.tileAt(Math.floor(p.x / TILE), Math.floor((p.y + 2) / TILE)) === 5 && p.dashT <= 0) {
      this.hurtPlayer(1, { label: 'DES PICS' });
    }

    // Sortie de salle
    if (p.y < 7 && this.isDoorOpen('up')) this.changeRoom('up');
    else if (p.y > ROOM_PX_H - 7 && this.isDoorOpen('down')) this.changeRoom('down');
    else if (p.x < 7 && this.isDoorOpen('left')) this.changeRoom('left');
    else if (p.x > ROOM_PX_W - 7 && this.isDoorOpen('right')) this.changeRoom('right');
  }

  updateParticles(dt) {
    for (const pt of this.particles) {
      pt.life -= dt;
      if (pt.type === 'text') pt.y += pt.vy * dt;
      else if (pt.type !== 'ring') {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.vx *= Math.pow(0.05, dt);
        pt.vy *= Math.pow(0.05, dt);
      }
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  updatePause() {
    const opts = 3;
    if (Input.pressed('uiUp') || Input.pressed('uiLeft')) { this.pauseSel = (this.pauseSel + opts - 1) % opts; Sound.play('select'); }
    if (Input.pressed('uiDown') || Input.pressed('uiRight')) { this.pauseSel = (this.pauseSel + 1) % opts; Sound.play('select'); }
    if (Input.pressed('back')) { this.paused = false; return; }
    if (Input.pressed('confirm')) {
      Sound.play('confirm');
      if (this.pauseSel === 0) this.paused = false;
      else if (this.pauseSel === 1) {
        if (!this.hub) Meta.endRun(this, false);
        App.go(() => new GameScene({ hub: true }));
      } else {
        if (!this.hub) Meta.endRun(this, false);
        App.go(() => new TitleScene());
      }
    }
  }

  updateBoon(dt) {
    const bc = this.boonChoice;
    bc.t += dt;
    this.updateParticles(dt);
    if (bc.t < bc.delay) return;
    const n = bc.opts.length;
    if (Input.pressed('uiLeft') || Input.pressed('mLeft')) { bc.sel = (bc.sel + n - 1) % n; Sound.play('select'); }
    if (Input.pressed('uiRight') || Input.pressed('mRight')) { bc.sel = (bc.sel + 1) % n; Sound.play('select'); }
    if (Input.pressed('confirm')) this.chooseBoon(bc.opts[bc.sel]);
  }

  // ------------------------------------------------------------- Dessin
  draw(ctx) {
    rect(ctx, 0, 0, W, H, '#0b0710');
    ctx.save();
    const sx = this.shake > 0 ? Math.round(rand(-this.shake, this.shake) * 0.5) : 0;
    const sy = this.shake > 0 ? Math.round(rand(-this.shake, this.shake) * 0.5) : 0;
    ctx.translate(RX + sx, RY + sy);
    this.drawWorld(ctx);
    ctx.restore();

    if (this.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, this.flash * 2);
      rect(ctx, RX, RY, ROOM_PX_W, ROOM_PX_H, '#ffffff');
      ctx.restore();
    }
    if (this.fadeIn > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.fadeIn / 0.18);
      rect(ctx, RX, RY, ROOM_PX_W, ROOM_PX_H, '#000');
      ctx.restore();
    }
    if (this.descendT > 0) {
      ctx.save();
      ctx.globalAlpha = 1 - this.descendT / 0.9;
      rect(ctx, 0, 0, W, H, '#000');
      ctx.restore();
    }

    this.drawHUD(ctx);
    this.drawOverlays(ctx);
  }

  drawWorld(ctx) {
    const r = this.room;
    const th = this.floorDef.theme;
    ctx.drawImage(r.bg, 0, 0, ROOM_PX_W, ROOM_PX_H);
    for (const tc of r.torches || []) drawTorchFlame(ctx, tc, this.t);
    for (const d of DIR_NAMES) {
      if (!r.doors[d]) continue;
      const nb = this.neighbor(r, d);
      const special = (t) => (t === 'boss' || t === 'treasure' || t === 'shop' ? t : null);
      const kind = special(r.type) || special(nb && nb.type) || 'normal';
      const state = r.locks[d] ? 'locked' : this.isDoorOpen(d) ? 'open' : 'closed';
      drawDoor(ctx, d, state, kind, th, this.t);
    }
    for (let ty = 1; ty < ROOM_H - 1; ty++) {
      for (let tx = 1; tx < ROOM_W - 1; tx++) {
        const i = ty * ROOM_W + tx;
        if (r.tiles[i] === 3) drawDestructible(ctx, tx * TILE, ty * TILE, r.hp[i]);
      }
    }
    for (const td of r.trapdoors || []) {
      drawTrapdoor(ctx, td.x, td.y, this.t);
      if (td.label) Font.draw(ctx, td.label, td.x, td.y - 17, INK, { align: 'center', outline: OUTLINE });
    }
    if (this.hub) this.drawHubProps(ctx);
    for (const pd of r.pedestals) pd.draw(ctx);
    for (const pk of r.pickups) pk.draw(ctx);

    // Entités triées par profondeur
    const list = [];
    if (!this.dead || this.deathT > 1.6) list.push(this.player);
    for (const e of this.enemies) list.push(e);
    for (const f of this.familiars) list.push(f);
    if (r.vendor) list.push({ y: r.vendor.y, draw: (c) => this.drawVendor(c, r.vendor) });
    if (this.hub) for (const n of this.npcs) list.push({ y: n.y, draw: (c) => this.drawNPC(c, n) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e === this.player && this.descendT > 0) {
        const k = this.descendT / 0.9;
        ctx.save();
        ctx.globalAlpha = k;
        drawSpr(ctx, `${this.player.prefix}_down_0`, this.player.x - 10, this.player.y - 15 + (1 - k) * 6);
        ctx.restore();
        continue;
      }
      if (e === this.player && this.dead) {
        if (Math.floor(this.deathT * 20) % 2) drawSpr(ctx, `${e.prefix}_down_0`, e.x - 10, e.y - 15, { flash: true });
        else drawSpr(ctx, `${e.prefix}_blink`, e.x - 10, e.y - 15);
        continue;
      }
      e.draw(ctx);
    }
    for (const t of this.tears) t.draw(ctx);
    for (const b of this.ebullets) b.draw(ctx);

    this.drawLighting(ctx);

    for (const pt of this.particles) {
      const a = Math.max(0, pt.life / pt.max);
      if (pt.type === 'text') {
        Font.draw(ctx, pt.text, pt.x, pt.y, pt.c, { align: 'center', outline: '#1a1016', alpha: Math.min(1, a * 2) });
      } else if (pt.type === 'ring') {
        const rr = lerp(pt.r1, pt.r0, a);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = pt.c;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(Math.round(pt.x), Math.round(pt.y), rr, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.globalAlpha = Math.min(1, a * 1.5);
        rect(ctx, pt.x, pt.y, pt.s, pt.s, pt.c);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Éclairage façon 32 bits : pénombre + halos autour des sources de lumière,
  // puis lueurs additives sur les projectiles.
  drawLighting(ctx) {
    if (!this.lightCanvas) {
      this.lightCanvas = document.createElement('canvas');
      this.lightCanvas.width = ROOM_PX_W;
      this.lightCanvas.height = ROOM_PX_H;
    }
    const lc = this.lightCanvas;
    const x = lc.getContext('2d');
    const dark = [0.2, 0.3, 0.26][this.floorNum - 1] || 0.25;
    x.globalCompositeOperation = 'source-over';
    x.clearRect(0, 0, lc.width, lc.height);
    x.fillStyle = `rgba(6,2,14,${dark})`;
    x.fillRect(0, 0, lc.width, lc.height);
    x.globalCompositeOperation = 'destination-out';
    const light = (lx, ly, r, a = 1) => {
      const g = x.createRadialGradient(lx, ly, 0, lx, ly, r);
      g.addColorStop(0, `rgba(0,0,0,${a})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(lx - r, ly - r, r * 2, r * 2);
    };
    const p = this.player;
    light(p.x, p.y - 4, 80);
    light(120, 72, 120, 0.35);
    for (const t of this.tears) light(t.x, t.y - 4, 16, 0.7);
    for (const b of this.ebullets) if (b.delay <= 0) light(b.x, b.y, 12, 0.6);
    for (const e of this.enemies) if (e.boss) light(e.x, e.y, 50, 0.6);
    for (const pd of this.room.pedestals) if (!pd.taken) light(pd.x, pd.y - 6, 30, 0.8);
    for (const td of this.room.trapdoors || []) light(td.x, td.y, 26, 0.7);
    if (this.hub) {
      for (const n of this.npcs) light(n.x, n.y - 8, 26, 0.6);
      for (const pr of this.hubProps) if (pr.fire) light(pr.x, pr.y - 6, 50, 0.9);
      light(120, 28, 30, 0.6);
    }
    for (const tc of this.room.torches || []) light(tc.x, tc.y + 4, 42, 0.75);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(lc, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Lueurs additives
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.35;
    for (const t of this.tears) drawSprC(ctx, t.sprite === 'tear_blue' ? 'glow_blue' : 'glow_orange', t.x, t.y - 4);
    ctx.globalAlpha = 0.3;
    for (const b of this.ebullets) {
      if (b.delay > 0) continue;
      const gname = { eb: 'glow_red', eb_purple: 'glow_purple', eb_clip: 'glow_white', eb_blue: 'glow_blue', eb_gold: 'glow_gold' }[b.kind] || 'glow_red';
      drawSprC(ctx, gname, b.x, b.y - 2);
    }
    if (p.special >= 100) {
      ctx.globalAlpha = 0.15 + Math.sin(this.t * 6) * 0.08;
      drawSprC(ctx, 'glow_big', p.x, p.y - 4);
    }
    ctx.restore();
  }

  drawVendor(ctx, v) {
    drawShadow(ctx, v.x, v.y + 4, 6, 2);
    drawSprC(ctx, 'vendor', v.x, v.y - 5 + Math.round(Math.sin(this.t * 2)));
    Font.draw(ctx, 'API STORE', v.x, v.y - 22, '#78d05a', { align: 'center', outline: '#1a1016' });
  }

  // ------------------------------------------------------------- QG : logique
  updateHub() {
    const p = this.player;
    // L'escalier lance une nouvelle run
    if (dist(p.x, p.y, 120, 30) < 11 && !this.leaving) {
      this.leaving = true;
      Sound.play('stairs');
      App.go(() => new GameScene({ model: Meta.data.model }));
      return;
    }
    this.nearNPC = null;
    let bd = 24;
    for (const n of this.npcs) {
      const d = dist(p.x, p.y, n.x, n.y);
      if (d < bd) { bd = d; this.nearNPC = n; }
    }
    const n = this.nearNPC;
    if (n && (Input.pressed('special') || Input.pressedCode('Enter'))) {
      if (n.object) {
        this.hubMenu = { type: n.menu, sel: 0, t: 0 };
        Sound.play('confirm');
        return;
      }
      this.dialog = { npc: n, lines: npcLines(n.id), i: 0, chars: 0, t: 0 };
      Sound.play('select');
      if (n.id === 'chat') {
        for (let k = 0; k < 3; k++) this.floatText(n.x + rand(-6, 6), n.y - 14 - k * 4, '<3', '#ff6080');
      }
    }
  }

  updateDialog(dt) {
    const dl = this.dialog;
    dl.t += dt;
    const line = dl.lines[dl.i] || '';
    const before = Math.floor(dl.chars);
    dl.chars = Math.min(line.length, dl.chars + dt * 45);
    if (Math.floor(dl.chars) !== before && Math.floor(dl.chars) % 3 === 0) Sound.play('blip');
    this.updateParticles(dt);
    const go = Input.pressed('special') || Input.pressedCode('Enter') || Input.pressedCode('Space') || (Input.gpNow[0] && !Input.gpPrev[0]);
    if (Input.pressed('back')) { this.dialog = null; return; }
    if (!go || dl.t < 0.15) return;
    if (dl.chars < line.length) { dl.chars = line.length; return; }
    dl.i++;
    dl.chars = 0;
    if (dl.i >= dl.lines.length) {
      this.dialog = null;
      if (dl.npc.menu) this.hubMenu = { type: dl.npc.menu, sel: 0, t: 0, npc: dl.npc };
    }
  }

  drawDialog(ctx) {
    const dl = this.dialog;
    const n = dl.npc;
    const y0 = 116;
    drawPanel(ctx, 6, y0, 308, 58);
    // Portrait
    const port = SPR[n.spr + 'XL'] || SPR[n.spr];
    const bob = Math.round(Math.sin(this.t * 3) * 1);
    drawSpr(ctx, n.spr + 'XL', 14 + (46 - port.w) / 2, y0 + 52 - port.h + bob);
    rect(ctx, 60, y0 + 8, 1, 42, '#5a3a48');
    Font.draw(ctx, n.name, 68, y0 + 8, [tone(n.color || '#f2a060', 0.2), n.color || '#f2a060'], { outline: OUTLINE });
    const line = (dl.lines[dl.i] || '').slice(0, Math.floor(dl.chars));
    Font.wrap(line, 236).forEach((l, j) => Font.draw(ctx, l, 68, y0 + 22 + j * 10, INK));
    if (dl.chars >= (dl.lines[dl.i] || '').length && Math.floor(this.t * 3) % 2) Font.draw(ctx, '>', 302, y0 + 46, INK_RED);
  }

  drawNPC(ctx, n) {
    const s = SPR[n.spr];
    const f = n.float ? Math.round(Math.sin(this.t * 2 + n.ph) * 2) - 3 : 0;
    const breathe = n.object ? 0 : Math.round(Math.sin(this.t * 2.5 + n.ph) * 0.6);
    drawShadow(ctx, n.x, n.y + 3, Math.min(10, s.w / 2 - 1), 2);
    drawSpr(ctx, n.spr, n.x - s.w / 2, n.y + 4 - s.h + f + breathe);
    if (n.id === 'veilleur') Font.draw(ctx, 'Z', n.x + 8 + Math.sin(this.t * 2) * 2, n.y - 30 - ((this.t * 6) % 6), '#a8b8e0', { outline: OUTLINE });
    if (this.nearNPC === n && !this.dialog && !this.hubMenu) {
      Font.draw(ctx, n.object ? 'E : REGARDER' : 'E : PARLER', n.x, n.y - s.h - 4, INK_RED, { align: 'center', outline: OUTLINE });
      Font.draw(ctx, n.name, n.x, n.y - s.h + 5, INK, { align: 'center', outline: OUTLINE });
    }
  }




  hubMenuItems() {
    const m = this.hubMenu;
    if (m.type === 'upgrades') return UPGRADES;
    if (m.type === 'models') return MODEL_IDS;
    return ['archives', 'heat'];
  }

  updateHubMenu(dt) {
    const m = this.hubMenu;
    m.t += dt;
    this.updateParticles(dt);
    const items = this.hubMenuItems();
    const n = items.length;
    const horiz = m.type === 'models';
    if (Input.pressed(horiz ? 'uiLeft' : 'uiUp')) { m.sel = (m.sel + n - 1) % n; Sound.play('select'); }
    if (Input.pressed(horiz ? 'uiRight' : 'uiDown')) { m.sel = (m.sel + 1) % n; Sound.play('select'); }
    if (Input.pressed('back') || (m.t > 0.2 && Input.pressed('special'))) {
      this.hubMenu = null;
      Sound.play('back');
      return;
    }
    const d = Meta.data;
    if (m.type === 'paths' && items[m.sel] === 'heat') {
      const dir = Input.pressed('uiLeft') ? -1 : Input.pressed('uiRight') ? 1 : 0;
      if (dir) {
        d.heat = clamp(d.heat + dir, 0, d.maxHeat);
        Meta.save();
        Sound.play(d.maxHeat ? 'select' : 'error');
      }
    }
    if (!(Input.pressedCode('Enter') || Input.pressedCode('Space') || Input.pressedCode('NumpadEnter') || (Input.gpNow[0] && !Input.gpPrev[0]))) return;
    let ok = false;
    if (m.type === 'upgrades') ok = Meta.buyUpgrade(items[m.sel]);
    else if (m.type === 'models') {
      ok = Meta.buyModel(items[m.sel]);
      if (ok) {
        const old = this.player;
        this.player = new Player(this, items[m.sel]);
        this.player.x = old.x;
        this.player.y = old.y;
        this.burst(old.x, old.y - 6, 20, '#f8d048', 70, 0.6);
      }
    } else if (items[m.sel] === 'archives') ok = Meta.buyPath('archives');
    else ok = true;
    Sound.play(ok ? 'buy' : 'error');
  }

  // ------------------------------------------------------------- QG : dessin
  drawHubProps(ctx) {
    for (const pr of this.hubProps) {
      const s = SPR[pr.spr];
      drawSpr(ctx, pr.spr, pr.x - s.w / 2, pr.y - s.h / 2);
      if (pr.fire) {
        const f = Math.sin(this.t * 10 + pr.x) * 1;
        fillEllipseHD(ctx, pr.x, pr.y - 8 + f * 0.3, 5, 6 + f, '#ff7a20');
        fillEllipseHD(ctx, pr.x, pr.y - 7, 3, 4, '#ffd060');
      }
      if (pr.pool) {
        for (let i = 0; i < 3; i++) {
          const r = ((this.t * 6 + i * 7) % 20);
          ctx.save();
          ctx.globalAlpha = 0.5 * (1 - r / 20);
          ctx.strokeStyle = '#c070a0';
          ctx.beginPath();
          ctx.ellipse(pr.x, pr.y, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    Font.draw(ctx, 'LA DESCENTE', 120, 40, INK_SOFT, { align: 'center', outline: OUTLINE });
  }


  drawHubHUD(ctx) {
    const d = Meta.data;
    const p = this.player;
    drawSpr(ctx, 'tear_big', 4, 5);
    Font.draw(ctx, String(d.tokens), 16, 6, ['#fff4e0', '#f2a060', '#d97757'], { outline: OUTLINE, scale: 2 });
    Font.draw(ctx, 'TOKENS DE CALCUL', 4, 24, INK_SOFT);
    Font.draw(ctx, 'LE QG DE CLAUDE', 160, 4, ['#fff0dc', '#f2c8a0', '#d99070'], { align: 'center', outline: OUTLINE });
    Font.draw(ctx, p.char.name, 160, 15, INK_SOFT, { align: 'center', outline: OUTLINE });
    const info = [['RUNS', d.runs], ['VICTOIRES', d.wins], ['RECORD', 'ÉT. ' + d.bestFloor]];
    info.forEach(([k, v], i) => {
      Font.draw(ctx, String(v), 316, 6 + i * 10, INK, { align: 'right' });
      Font.draw(ctx, k, 316 - Font.width(String(v)) - 6, 6 + i * 10, INK_SOFT, { align: 'right' });
    });
    if (d.lastGain && this.t < 5) {
      Font.draw(ctx, '+' + d.lastGain + ' TOKENS', 20, 40, ['#fff4a0', '#f8d048'], { outline: OUTLINE, alpha: Math.min(1, 5 - this.t) });
    }
    if (d.heat) Font.draw(ctx, 'SURCHAUFFE ' + d.heat, 20, 160, '#ff6040', { outline: OUTLINE });
  }

  drawHubMenu(ctx) {
    const m = this.hubMenu;
    const d = Meta.data;
    ctx.save();
    ctx.globalAlpha = 0.6;
    rect(ctx, 0, 0, W, H, '#000');
    ctx.restore();
    drawPanel(ctx, 16, 10, 288, 160);
    const title = { upgrades: 'ENTRAÎNEMENT', models: 'MODÈLES DE CLAUDE', paths: 'CHEMINS ET SURCHAUFFE' }[m.type];
    Font.draw(ctx, title, 30, 20, ['#fff0dc', '#f2a060', '#d97757'], { outline: OUTLINE, scale: 2 });
    drawSpr(ctx, 'tear_big', 252, 20);
    Font.draw(ctx, String(d.tokens), 264, 22, '#f8d048', { outline: OUTLINE });
    const items = this.hubMenuItems();
    if (m.type === 'upgrades') {
      items.forEach((u, i) => {
        const y = 44 + i * 18;
        const sel = i === m.sel;
        const l = Meta.lvl(u.id);
        if (sel) { ctx.save(); ctx.globalAlpha = 0.25; rect(ctx, 24, y - 3, 272, 17, u.color); ctx.restore(); }
        rect(ctx, 28, y, 6, 6, u.color);
        Font.draw(ctx, u.name, 40, y, sel ? '#ffffff' : INK);
        Font.draw(ctx, u.desc, 40, y + 8, INK_SOFT);
        for (let q = 0; q < u.costs.length; q++) rect(ctx, 200 + q * 8, y + 1, 6, 6, q < l ? u.color : '#3a2a34');
        const cost = l >= u.costs.length ? 'MAX' : u.costs[l];
        Font.draw(ctx, String(cost), 290, y + 1, l >= u.costs.length ? '#78d05a' : d.tokens >= cost ? '#f8d048' : '#8a6060', { align: 'right' });
      });
      Font.draw(ctx, 'ENTRÉE : ACHETER   ÉCHAP : FERMER', 160, 160, INK_SOFT, { align: 'center' });
    } else if (m.type === 'models') {
      items.forEach((id, i) => {
        const md = MODELS[id];
        const x = 34 + i * 88;
        const sel = i === m.sel;
        const owned = d.models[id];
        drawPanel(ctx, x - 6, 42, 82, 108, sel ? 'red' : 'dark');
        const bob = sel ? Math.round(Math.sin(this.t * 4) * 2) : 0;
        drawSpr(ctx, `${id}XL_down_0`, x + 15, 48 + bob, owned ? {} : { tint: '#120a08' });
        Font.draw(ctx, md.name.replace('CLAUDE ', ''), x + 35, 88, sel ? '#ffffff' : INK, { align: 'center' });
        Font.draw(ctx, md.title, x + 35, 97, INK_SOFT, { align: 'center' });
        ['VIE', 'DÉG', 'VIT', 'CAD'].forEach((k, j) => {
          Font.draw(ctx, k, x, 106 + j * 8, INK_SOFT);
          for (let q = 0; q < 5; q++) rect(ctx, x + 26 + q * 8, 107 + j * 8, 6, 5, q < md.bars[j] ? '#d97757' : '#3a2a34');
        });
        const status = d.model === id ? 'ÉQUIPÉ' : owned ? 'CHOISIR' : md.cost + ' TOKENS';
        Font.draw(ctx, status, x + 35, 139, d.model === id ? '#78d05a' : owned ? INK : d.tokens >= md.cost ? '#f8d048' : '#8a6060', { align: 'center' });
      });
      Font.wrap(MODELS[items[m.sel]].desc, 270).forEach((l, j) => Font.draw(ctx, l, 160, 155 + j * 8, INK, { align: 'center' }));
    } else {
      const rows = [
        ['LES ARCHIVES OUBLIÉES', d.paths.archives ? 'DÉBLOQUÉ' : PATHS.archives.cost + ' TOKENS', 'UN CHEMIN ALTERNATIF APRÈS L\'ÉTAGE 1, AVEC SA PROPRE REINE.'],
        ['SURCHAUFFE : ' + d.heat + ' / ' + d.maxHeat, d.maxHeat ? '< >' : 'VERROUILLÉ', d.maxHeat ? 'ENNEMIS +15% PV PAR NIVEAU, TOKENS +25%.' : 'GAGNE UNE PARTIE POUR DÉBLOQUER.'],
      ];
      rows.forEach(([a, b, c], i) => {
        const y = 50 + i * 40;
        const sel = i === m.sel;
        if (sel) { ctx.save(); ctx.globalAlpha = 0.22; rect(ctx, 24, y - 4, 272, 34, '#d97757'); ctx.restore(); }
        Font.draw(ctx, a, 34, y, sel ? '#ffffff' : INK);
        Font.draw(ctx, b, 288, y, '#f8d048', { align: 'right' });
        Font.wrap(c, 250).forEach((l, j) => Font.draw(ctx, l, 34, y + 11 + j * 9, INK_SOFT));
      });
      Font.draw(ctx, 'ENTRÉE : DÉBLOQUER   < > : RÉGLER   ÉCHAP : FERMER', 160, 160, INK_SOFT, { align: 'center' });
    }
  }

  drawHUD(ctx) {
    if (this.hub) return this.drawHubHUD(ctx);
    const p = this.player;
    // Coeurs
    const total = Math.ceil(p.maxHp / 2);
    for (let i = 0; i < total; i++) {
      const x = 3 + (i % 6) * 9;
      const y = 3 + Math.floor(i / 6) * 9;
      const v = p.hp - i * 2;
      const name = v >= 2 ? 'heart_full' : v === 1 ? 'heart_half' : 'heart_empty';
      const pulse = p.hp <= 2 && v > 0 && Math.floor(this.t * 4) % 2 ? 1 : 0;
      drawSpr(ctx, name, x, y - pulse);
    }
    if (p.shieldUp) drawSpr(ctx, 'heart_shield', 3 + (total % 6) * 9, 3 + Math.floor(total / 6) * 9);

    // Pièces / clés
    const numCol = ['#ffffff', '#fff4e0', '#d8c8b8', '#b0a0a0'];
    drawSpr(ctx, 'coin', 4, 38);
    Font.draw(ctx, String(p.coins).padStart(2, '0'), 13, 38, numCol, { outline: '#1a1016' });
    drawSpr(ctx, 'tear', 5, 141);
    Font.draw(ctx, String(this.runTokens), 14, 142, '#f2a060', { outline: OUTLINE });
    if (this.heat) Font.draw(ctx, 'S' + this.heat, 30, 142, '#ff6040', { outline: OUTLINE });
    drawSpr(ctx, 'key', 4, 49);
    Font.draw(ctx, String(p.keys).padStart(2, '0'), 13, 50, numCol, { outline: '#1a1016' });

    // Jauge d'Artefact
    const full = p.special >= 100;
    Font.draw(ctx, 'ART', 4, 64, full ? ['#fff4a0', '#f8d048', '#d89020'] : ['#c8b8c0', '#8a8290'], { outline: '#1a1016' });
    rect(ctx, 4, 73, 12, 54, '#000');
    rect(ctx, 5, 74, 10, 52, '#3a2a40');
    rect(ctx, 6, 75, 8, 50, '#1a1020');
    const h = Math.round((p.special / 100) * 50);
    for (let j = 0; j < h; j++) {
      const yy = 124 - j;
      const k = j / 50;
      let c;
      if (full) c = (Math.floor(this.t * 10) + j) % 6 < 3 ? '#f8d048' : '#fff4a0';
      else c = k > 0.66 ? '#f2a88a' : k > 0.33 ? '#d97757' : '#a8513a';
      rect(ctx, 6, yy, 8, 1, c);
    }
    if (h > 0) rect(ctx, 6, 125 - h, 8, 1, '#ffffff');
    rect(ctx, 6, 75, 1, 50, 'rgba(255,255,255,0.12)');
    if (full) Font.draw(ctx, 'E', 7, 131, ['#fff4a0', '#f8d048'], { outline: '#1a1016' });

    // Dash
    const dashReady = p.dashCd <= 0;
    rect(ctx, 19, 73, 5, 54, '#000');
    rect(ctx, 20, 74, 3, 52, '#1a1020');
    const dh = dashReady ? 52 : Math.round((1 - p.dashCd / p.stats.dashCd) * 52);
    rect(ctx, 20, 126 - dh, 3, dh, dashReady ? '#4ab0e0' : '#3a4a60');
    if (dashReady) rect(ctx, 20, 126 - dh, 1, dh, '#a0e8ff');

    // Bénédictions
    p.boons.forEach((id, i) => {
      const b = BOON_MAP[id];
      drawBoonOrb(ctx, 32, 80 + i * 16, b.color, null, this.t, 5);
    });

    // Étage
    Font.draw(ctx, 'ÉTAGE ' + this.floorNum, 160, 4, ['#fff0dc', '#f2c8a0', '#d99070'], { align: 'center', outline: '#1a1016' });
    Font.draw(ctx, this.floorDef.name, 160, 15, ['#c8b8c0', '#8a7a90'], { align: 'center', outline: '#1a1016' });

    this.drawMinimap(ctx, 254, 3);

    // Objets
    p.items.forEach((id, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      if (row > 9) return;
      drawSpr(ctx, ITEMS[id].icon, 286 + col * 16, 38 + row * 14);
    });

    // Barre de vie du boss
    const boss = this.enemies.find((e) => e.boss);
    if (boss && this.bossIntro <= 0) {
      const bw = 150;
      const bx = 88;
      const by = 169;
      rect(ctx, bx - 2, by - 2, bw + 4, 9, '#000');
      rect(ctx, bx - 1, by - 1, bw + 2, 7, '#5a2030');
      rect(ctx, bx, by, bw, 5, '#200810');
      const fw = Math.round((boss.hp / boss.maxHp) * bw);
      rect(ctx, bx, by, fw, 5, '#c02838');
      rect(ctx, bx, by, fw, 2, '#f05060');
      rect(ctx, bx, by, fw, 1, '#ffa0a8');
      rect(ctx, bx, by + 4, fw, 1, '#801020');
      // Crâne
      fillEllipse(ctx, bx - 8, by + 2, 5, 4, '#000');
      fillEllipse(ctx, bx - 8, by + 1, 4, 3, '#f0e8e0');
      rect(ctx, bx - 10, by + 1, 2, 2, '#1a1016');
      rect(ctx, bx - 7, by + 1, 2, 2, '#1a1016');
      rect(ctx, bx - 9, by + 4, 3, 2, '#f0e8e0');
      Font.draw(ctx, boss.name, 163, by - 11, ['#ffd0d0', '#f05060', '#a02030'], { align: 'center', outline: '#1a1016' });
    }
  }

  drawMinimap(ctx, x0, y0) {
    const cw = 6;
    const ch = 3;
    const mw = MAP_W * (cw + 1) + 3;
    const mh = MAP_H * (ch + 1) + 2;
    ctx.save();
    ctx.globalAlpha = 0.65;
    rect(ctx, x0 - 2, y0 - 1, mw, mh, '#120a10');
    ctx.restore();
    ctx.strokeStyle = '#4a3a40';
    ctx.strokeRect(x0 - 2.5, y0 - 1.5, mw + 1, mh + 1);
    for (const r of this.floor.rooms) {
      if (!r.seen) continue;
      const x = x0 + r.gx * (cw + 1);
      const y = y0 + r.gy * (ch + 1);
      let c = r.visited ? '#a89a90' : '#3e3238';
      if (r === this.room) c = Math.floor(this.t * 3) % 2 ? '#ffffff' : '#f2e0c8';
      rect(ctx, x, y, cw, ch, c);
      if (r.visited) rect(ctx, x, y, cw, 1, r === this.room ? '#ffffff' : '#c8bab0');
      const icon = { boss: '#e8404a', treasure: '#f8d048', shop: '#78d05a' }[r.type];
      if (icon) rect(ctx, x + 2, y + 1, 2, 1, icon);
    }
  }

  drawOverlays(ctx) {
    // Nom de l'étage sur une bande de papier (façon Isaac)
    if (this.floorCard > 0 && this.bossIntro <= 0) {
      const a = Math.min(1, this.floorCard, (3 - this.floorCard) * 3);
      ctx.save();
      ctx.globalAlpha = a;
      const y = 58 + Math.round((1 - Math.min(1, (3 - this.floorCard) * 4)) * -10);
      drawPaper(ctx, 84, y, 152, 42, 7 + this.floorNum);
      Font.draw(ctx, 'ÉTAGE ' + this.floorNum, 160, y + 8, INK_RED, { align: 'center', scale: 2 });
      Font.draw(ctx, this.floorDef.name, 160, y + 28, INK, { align: 'center' });
      ctx.restore();
    }
    // Bannière d'objet sur papier
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 2);
      const y = 40;
      const w = Math.max(Font.width(this.banner.title), Font.width(this.banner.sub)) + 24;
      ctx.save();
      ctx.globalAlpha = a;
      drawPaper(ctx, 160 - w / 2, y - 5, w, 27, 3);
      Font.draw(ctx, this.banner.title, 160, y, this.banner.color ? INK_RED : INK, { align: 'center' });
      Font.draw(ctx, this.banner.sub, 160, y + 10, INK_SOFT, { align: 'center' });
      ctx.restore();
    }
    if (this.bossIntro > 0) this.drawBossIntro(ctx);
    if (this.boonChoice) this.drawBoonChoice(ctx);
    if (this.victoryT > 0) {
      const a = Math.min(1, (3.5 - this.victoryT) / 1.5);
      Font.draw(ctx, 'SAM ALTMAN EST VAINCU !', 160, 80, ['#fff4a0', '#f8d048', '#d89020'], { align: 'center', scale: 2, outline: '#1a1016', alpha: a });
    }
    if (this.dialog) this.drawDialog(ctx);
    if (this.hubMenu) this.drawHubMenu(ctx);
    if (this.paused) this.drawPause(ctx);
  }

  drawBossIntro(ctx) {
    const t = 2.6 - this.bossIntro;
    const slide = Math.min(1, t / 0.35);
    const out = this.bossIntro < 0.3 ? this.bossIntro / 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = out;
    rect(ctx, 0, 0, W, H, 'rgba(0,0,0,0.6)');
    const by = 44;
    // Bande tramée rouge/noire animée
    for (let j = 0; j < 92; j++) {
      for (let i = 0; i < W; i += 1) {
        const v = (Math.sin((i + t * 80) * 0.05) * 0.5 + 0.5) * (1 - Math.abs(j - 46) / 46);
        if (bayer(i, j) < v * 0.8) { ctx.fillStyle = '#4a0c18'; ctx.fillRect(i, by + j, 1, 1); }
      }
    }
    ctx.globalCompositeOperation = 'destination-over';
    rect(ctx, 0, by, W, 92, '#14060c');
    ctx.globalCompositeOperation = 'source-over';
    rect(ctx, 0, by, W, 2, '#f05060');
    rect(ctx, 0, by + 2, W, 1, '#801020');
    rect(ctx, 0, by + 89, W, 1, '#801020');
    rect(ctx, 0, by + 90, W, 2, '#f05060');
    // Claude
    const cx = lerp(-70, 36, slide);
    drawSpr(ctx, 'claudeXXL_right_0', cx + 3, by + 18);
    Font.draw(ctx, 'CLAUDE', cx + 30, by + 8, ['#ffd8c4', '#f2a88a', '#d97757'], { align: 'center', outline: '#1a1016' });
    // VS
    if (t > 0.3) Font.draw(ctx, 'VS', 160, by + 30, ['#ffffff', '#fff4a0', '#f8d048', '#e8404a'], { align: 'center', scale: 3, outline: '#1a1016' });
    // Boss
    const b = this.bossRef;
    if (b) {
      const bx = lerp(W + 60, 256, slide);
      ctx.save();
      ctx.translate(bx, by + 46);
      ctx.scale(2, 2);
      b.drawPortrait(ctx, 0, 0);
      ctx.restore();
      if (t > 0.5) {
        Font.draw(ctx, b.name, 160, by + 62, ['#ffd0d0', '#f05060', '#a02030'], { align: 'center', outline: '#000' });
        Font.draw(ctx, b.subtitle, 160, by + 76, '#c8a8b0', { align: 'center', outline: '#000' });
      }
    }
    ctx.restore();
  }

  drawBoonChoice(ctx) {
    const bc = this.boonChoice;
    const a = Math.min(1, bc.t / 0.5);
    ctx.save();
    ctx.globalAlpha = a * 0.8;
    rect(ctx, 0, 0, W, H, '#0b0710');
    ctx.restore();
    if (bc.t < 0.3) return;
    Font.draw(ctx, 'UN DON DU RÉSEAU', 160, 12, ['#fff8c0', '#f8d048', '#e09020', '#b06010'], { align: 'center', scale: 2, outline: '#1a1016' });
    Font.draw(ctx, 'CHOISIS UNE BÉNÉDICTION', 160, 32, '#c8c0c8', { align: 'center' });
    const cw = 96;
    const chh = 112;
    bc.opts.forEach((b, i) => {
      const sel = i === bc.sel;
      const x = 8 + i * (cw + 8);
      const y = 46 + (sel ? -3 : 0);
      rect(ctx, x - 1, y - 1, cw + 2, chh + 2, sel ? b.color : '#4a4452');
      rect(ctx, x, y, cw, chh, '#1a1016');
      rect(ctx, x + 2, y + 2, cw - 4, chh - 4, sel ? '#2a2130' : '#1f1826');
      for (let j = 0; j < 30; j++) {
        for (let i2 = 0; i2 < cw - 4; i2++) {
          if (bayer(i2, j) < (1 - j / 30) * (sel ? 0.5 : 0.25)) { ctx.fillStyle = b.color; ctx.fillRect(x + 2 + i2, y + 2 + j, 1, 1); }
        }
      }
      drawBoonOrb(ctx, x + cw / 2, y + 20, b.color, b.glyph, this.t, 9);
      Font.draw(ctx, b.name, x + cw / 2, y + 40, sel ? b.color : '#c8c0c8', { align: 'center' });
      const lines = Font.wrap(b.desc, cw - 10);
      lines.forEach((l, j) => Font.draw(ctx, l, x + cw / 2, y + 56 + j * 11, '#ffffff', { align: 'center', alpha: sel ? 1 : 0.6 }));
    });
    if (bc.t > bc.delay) {
      const blink = Math.floor(this.t * 3) % 2;
      Font.draw(ctx, '< >  CHOISIR     ENTRÉE  CONFIRMER', 160, 168, blink ? '#8a8290' : '#c8c0c8', { align: 'center' });
    }
  }

  drawPause(ctx) {
    const p = this.player;
    const s = p.stats;
    ctx.save();
    ctx.globalAlpha = 0.6;
    rect(ctx, 0, 0, W, H, '#000');
    ctx.restore();
    drawPaper(ctx, 18, 8, 284, 164, 11);
    Font.draw(ctx, 'PAUSE', 160, 16, INK_RED, { align: 'center', scale: 2 });
    // Statistiques
    const lines = [
      ['DÉGÂTS', s.dmg.toFixed(1), '#ff6050'],
      ['CADENCE', (1 / s.fireDelay).toFixed(1) + '/S', '#f0a040'],
      ['VITESSE', Math.round(s.speed), '#60b0f0'],
      ['PORTÉE', Math.round(s.range * s.shotSpeed), '#80d060'],
      ['TIRS', s.shots, '#b080f0'],
      ['ESQUIVE', Math.round(s.dodge * 100) + '%', '#50d0d0'],
    ];
    Font.draw(ctx, 'STATISTIQUES', 32, 38, INK);
    rect(ctx, 32, 47, 70, 1, INK_SOFT);
    lines.forEach(([k, v, c], i) => {
      rect(ctx, 32, 53 + i * 11, 5, 5, c);
      Font.draw(ctx, k, 41, 52 + i * 11, INK);
      Font.draw(ctx, String(v), 126, 52 + i * 11, c, { align: 'right' });
    });
    Font.draw(ctx, 'OBJETS', 146, 38, INK);
    rect(ctx, 146, 47, 40, 1, INK_SOFT);
    if (!p.items.length) Font.draw(ctx, 'AUCUN POUR L\'INSTANT', 146, 54, INK_SOFT);
    p.items.slice(0, 7).forEach((id, i) => {
      drawSpr(ctx, ITEMS[id].icon, 146, 51 + i * 13);
      Font.draw(ctx, ITEMS[id].name, 162, 54 + i * 13, INK);
    });
    if (p.boons.length) {
      Font.draw(ctx, 'BÉNÉDICTIONS', 32, 122, INK);
      p.boons.forEach((id, i) => {
        const b = BOON_MAP[id];
        rect(ctx, 32, 134 + i * 10, 5, 5, b.color);
        Font.draw(ctx, b.name, 41, 133 + i * 10, INK_SOFT);
      });
    }
    const opts = ['REPRENDRE', this.hub ? 'RETOUR AU QG' : 'ABANDONNER', 'MENU PRINCIPAL'];
    opts.forEach((o, i) => {
      const sel = i === this.pauseSel;
      const x = 76 + i * 84;
      Font.draw(ctx, o, x, 156, sel ? INK_RED : INK_SOFT, { align: 'center' });
      if (sel) drawScribble(ctx, x, 159, Font.width(o), this.t);
    });
  }
}
