// Scène de jeu : exploration des étages, combats, HUD.

class GameScene {
  constructor(charId = 'claude') {
    this.charId = charId;
    this.player = new Player(this, charId);
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
    this.nextFloor();
  }

  // ------------------------------------------------------------------ Étages
  nextFloor() {
    this.floorNum++;
    this.floorDef = FLOORS[this.floorNum - 1];
    this.floor = generateFloor(this.floorNum);
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
      if (room.type === 'start' && this.floorNum === 1) opts.tutorial = true;
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

  hurtPlayer(n) {
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
    if (p.hp <= 0) {
      p.hp = 0;
      this.dead = true;
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
    if (this.floorNum >= FLOORS.length) {
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
    r.trapdoor = { x: 120, y: 96 };
    r.pickups.push(new Pickup(this, 'heart', 88, 80, rand(-20, 20), rand(-20, 20)));
    this.burst(120, 96, 20, '#a86ae8', 80, 0.6);
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
        App.go(() => new VictoryScene(game));
      }
      return;
    }
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
      if (this.descendT <= 0) this.nextFloor();
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
    if (r.trapdoor && dist(p.x, p.y, r.trapdoor.x, r.trapdoor.y) < 8 && p.holdT <= 0) {
      this.descendT = 0.9;
      Sound.play('stairs');
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
      else if (this.pauseSel === 1) App.go(() => new GameScene(this.charId));
      else App.go(() => new TitleScene());
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
    ctx.drawImage(r.bg, 0, 0);
    // LEDs clignotantes (ferme de serveurs)
    if (th.id === 2) {
      for (let i = 0; i < 6; i++) {
        const k = Math.floor(this.t * 3 + i * 7.3) % 15;
        rect(ctx, k * TILE + 12, 4 + (i % 3) * 3, 1, 1, i % 2 ? '#6af06a' : '#7fe8f0');
      }
    }
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
    if (r.trapdoor) drawTrapdoor(ctx, r.trapdoor.x, r.trapdoor.y, this.t);
    for (const pd of r.pedestals) pd.draw(ctx);
    for (const pk of r.pickups) pk.draw(ctx);

    // Entités triées par profondeur
    const list = [];
    if (!this.dead || this.deathT > 1.6) list.push(this.player);
    for (const e of this.enemies) list.push(e);
    for (const f of this.familiars) list.push(f);
    if (r.vendor) list.push({ y: r.vendor.y, draw: (c) => this.drawVendor(c, r.vendor) });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (e === this.player && this.descendT > 0) {
        const k = this.descendT / 0.9;
        ctx.save();
        ctx.globalAlpha = k;
        drawSpr(ctx, 'claude_down_0', this.player.x - 8, this.player.y - 11 + (1 - k) * 6);
        ctx.restore();
        continue;
      }
      if (e === this.player && this.dead) {
        if (Math.floor(this.deathT * 20) % 2) drawSpr(ctx, 'claude_down_0', e.x - 8, e.y - 11, { flash: true });
        else drawSpr(ctx, 'claude_blink', e.x - 8, e.y - 11);
        continue;
      }
      e.draw(ctx);
    }
    for (const t of this.tears) t.draw(ctx);
    for (const b of this.ebullets) b.draw(ctx);

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

  drawVendor(ctx, v) {
    drawShadow(ctx, v.x, v.y + 4, 6, 2);
    drawSpr(ctx, 'vendor', v.x - 6, v.y - 10 + Math.round(Math.sin(this.t * 2)));
    Font.draw(ctx, 'API STORE', v.x, v.y - 22, '#78d05a', { align: 'center', outline: '#1a1016' });
  }

  drawHUD(ctx) {
    const p = this.player;
    // Coeurs
    const total = Math.ceil(p.maxHp / 2);
    for (let i = 0; i < total; i++) {
      const x = 4 + (i % 6) * 8;
      const y = 4 + Math.floor(i / 6) * 8;
      const v = p.hp - i * 2;
      const name = v >= 2 ? 'heart_full' : v === 1 ? 'heart_half' : 'heart_empty';
      drawSpr(ctx, name, x, y);
    }
    if (p.shieldUp) drawSpr(ctx, 'heart_shield', 4 + (total % 6) * 8, 4 + Math.floor(total / 6) * 8);

    // Pièces / clés
    drawSpr(ctx, 'coin', 4, 38);
    Font.draw(ctx, String(p.coins).padStart(2, '0'), 13, 38, '#fff');
    drawSpr(ctx, 'key', 4, 49);
    Font.draw(ctx, String(p.keys).padStart(2, '0'), 13, 50, '#fff');

    // Jauge d'Artefact
    const full = p.special >= 100;
    Font.draw(ctx, 'ART', 4, 64, full ? '#f8d048' : '#8a8290');
    rect(ctx, 5, 74, 10, 52, '#1a1016');
    rect(ctx, 6, 75, 8, 50, '#2a2130');
    const h = Math.round((p.special / 100) * 50);
    const col = full ? (Math.floor(this.t * 8) % 2 ? '#f8d048' : '#ffffff') : '#d97757';
    rect(ctx, 6, 125 - h, 8, h, col);
    if (full) Font.draw(ctx, 'E', 8, 130, '#f8d048');

    // Dash
    const dashReady = p.dashCd <= 0;
    rect(ctx, 20, 74, 3, 52, '#1a1016');
    const dh = dashReady ? 50 : Math.round((1 - p.dashCd / p.stats.dashCd) * 50);
    rect(ctx, 21, 125 - dh, 1, dh, dashReady ? '#7fe8f0' : '#4a4452');

    // Bénédictions
    p.boons.forEach((id, i) => {
      const b = BOON_MAP[id];
      drawBoonOrb(ctx, 31, 80 + i * 16, b.color, null, this.t, 5);
    });

    // Étage
    Font.draw(ctx, 'ÉTAGE ' + this.floorNum, 160, 4, '#c8c0c8', { align: 'center' });
    Font.draw(ctx, this.floorDef.name, 160, 14, '#8a8290', { align: 'center' });

    this.drawMinimap(ctx, 254, 2);

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
      const bw = 160;
      const bx = 80;
      const by = 170;
      rect(ctx, bx - 1, by - 1, bw + 2, 7, '#1a1016');
      rect(ctx, bx, by, bw, 5, '#4a1a20');
      rect(ctx, bx, by, Math.round((boss.hp / boss.maxHp) * bw), 5, '#e8404a');
      rect(ctx, bx, by, Math.round((boss.hp / boss.maxHp) * bw), 1, '#f07078');
      Font.draw(ctx, boss.name, 160, by - 10, '#fff', { align: 'center', outline: '#1a1016' });
    }
  }

  drawMinimap(ctx, x0, y0) {
    const cw = 6;
    const ch = 3;
    rect(ctx, x0 - 2, y0 - 1, MAP_W * (cw + 1) + 3, MAP_H * (ch + 1) + 2, 'rgba(0,0,0,0.5)');
    for (const r of this.floor.rooms) {
      if (!r.seen) continue;
      const x = x0 + r.gx * (cw + 1);
      const y = y0 + r.gy * (ch + 1);
      let c = r.visited ? '#8a8290' : '#3a3440';
      if (r === this.room) c = '#ffffff';
      rect(ctx, x, y, cw, ch, c);
      const icon = { boss: '#e8404a', treasure: '#f8d048', shop: '#78d05a' }[r.type];
      if (icon) rect(ctx, x + 2, y + 1, 2, 1, icon);
    }
  }

  drawOverlays(ctx) {
    // Nom de l'étage
    if (this.floorCard > 0 && this.bossIntro <= 0) {
      const a = Math.min(1, this.floorCard, (3 - this.floorCard) * 3);
      Font.draw(ctx, 'ÉTAGE ' + this.floorNum, 160, 64, '#f2a88a', { align: 'center', scale: 2, outline: '#1a1016', alpha: a });
      Font.draw(ctx, this.floorDef.name, 160, 86, '#ffffff', { align: 'center', outline: '#1a1016', alpha: a });
    }
    // Bannière d'objet
    if (this.banner) {
      const a = Math.min(1, this.banner.t * 2);
      const y = 44;
      ctx.save();
      ctx.globalAlpha = a * 0.7;
      rect(ctx, RX, y - 4, ROOM_PX_W, 24, '#000');
      ctx.restore();
      Font.draw(ctx, this.banner.title, 160, y, this.banner.color || '#f8d048', { align: 'center', outline: '#1a1016', alpha: a });
      Font.draw(ctx, this.banner.sub, 160, y + 10, '#ffffff', { align: 'center', alpha: a });
    }
    if (this.bossIntro > 0) this.drawBossIntro(ctx);
    if (this.boonChoice) this.drawBoonChoice(ctx);
    if (this.victoryT > 0) {
      const a = Math.min(1, (3.5 - this.victoryT) / 1.5);
      Font.draw(ctx, 'LE MAXIMISEUR EST VAINCU !', 160, 80, '#f8d048', { align: 'center', outline: '#1a1016', alpha: a });
    }
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
    rect(ctx, 0, by, W, 92, '#1a1016');
    rect(ctx, 0, by, W, 2, '#e8404a');
    rect(ctx, 0, by + 90, W, 2, '#e8404a');
    // Claude
    const cx = lerp(-60, 40, slide);
    drawSpr(ctx, 'claude_right_0', cx, by + 22, { scale: 3 });
    Font.draw(ctx, 'CLAUDE', cx + 24, by + 10, '#f2a88a', { align: 'center' });
    // VS
    if (t > 0.3) Font.draw(ctx, 'VS', 160, by + 34, '#ffffff', { align: 'center', scale: 3, outline: '#e8404a' });
    // Boss
    const b = this.bossRef;
    if (b) {
      const bx = lerp(W + 60, 252, slide);
      ctx.save();
      ctx.translate(bx, by + 46);
      ctx.scale(2, 2);
      b.drawPortrait(ctx, 0, 0);
      ctx.restore();
      if (t > 0.5) {
        Font.draw(ctx, b.name, 160, by + 62, '#e8404a', { align: 'center', outline: '#000' });
        Font.draw(ctx, b.subtitle, 160, by + 78, '#8a8290', { align: 'center' });
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
    Font.draw(ctx, 'UN DON DU RÉSEAU', 160, 12, '#f8d048', { align: 'center', scale: 2, outline: '#1a1016' });
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
    ctx.globalAlpha = 0.85;
    rect(ctx, 0, 0, W, H, '#0b0710');
    ctx.restore();
    Font.draw(ctx, 'PAUSE', 160, 10, '#f2a88a', { align: 'center', scale: 2, outline: '#1a1016' });
    // Statistiques
    const lines = [
      ['DÉGÂTS', s.dmg.toFixed(1)],
      ['CADENCE', (1 / s.fireDelay).toFixed(1) + '/S'],
      ['VITESSE', Math.round(s.speed)],
      ['PORTÉE', Math.round(s.range * s.shotSpeed)],
      ['TIRS', s.shots],
      ['ESQUIVE', Math.round(s.dodge * 100) + '%'],
    ];
    Font.draw(ctx, 'STATISTIQUES', 20, 36, '#f8d048');
    lines.forEach(([k, v], i) => {
      Font.draw(ctx, k, 20, 50 + i * 11, '#c8c0c8');
      Font.draw(ctx, String(v), 110, 50 + i * 11, '#ffffff', { align: 'right' });
    });
    Font.draw(ctx, 'OBJETS', 140, 36, '#f8d048');
    if (!p.items.length) Font.draw(ctx, 'AUCUN POUR L\'INSTANT', 140, 50, '#4a4452');
    p.items.slice(0, 7).forEach((id, i) => {
      drawSpr(ctx, ITEMS[id].icon, 140, 47 + i * 13);
      Font.draw(ctx, ITEMS[id].name, 156, 50 + i * 13, '#c8c0c8');
    });
    if (p.boons.length) {
      Font.draw(ctx, 'BÉNÉDICTIONS', 20, 122, '#f8d048');
      p.boons.forEach((id, i) => {
        const b = BOON_MAP[id];
        Font.draw(ctx, b.name, 20, 134 + i * 10, b.color);
      });
    }
    const opts = ['REPRENDRE', 'RECOMMENCER', 'MENU PRINCIPAL'];
    rect(ctx, 0, 158, W, 1, '#2a2130');
    opts.forEach((o, i) => {
      const sel = i === this.pauseSel;
      const x = 60 + i * 100;
      Font.draw(ctx, o, x, 166, sel ? '#f2a88a' : '#8a8290', { align: 'center' });
      if (sel) Font.draw(ctx, '>', x - Font.width(o) / 2 - 8, 166, '#f2a88a');
    });
  }
}
