// Claude, le joueur : déplacement, tirs façon Isaac, cœurs, objets.

class Player {
  constructor(o = {}) {
    this.x = CX;
    this.y = CY + 30;
    this.r = 6;
    this.hitR = 5;
    this.h = 22;
    this.vx = 0;
    this.vy = 0;
    this.dir = 'down';
    this.face = 'down';
    this.walkT = 0;
    this.fireCd = 0;
    this.eye = 1;
    this.invuln = 0;
    this.hurtT = 0;
    this.blinkT = 2;
    this.costume = o.costume || 'classic';
    this.maxHearts = 6;
    this.hearts = 6;
    this.soul = 0;
    this.coins = 0;
    this.bombs = 1;
    this.keys = 0;
    this.active = null;
    this.items = [];
    this.famKinds = [];
    this.revive = 0;
    this.dead = false;
    this.deadT = 0;
    this.hold = null;
    this.trail = [];
    this.inverted = 0;
    this.s = {
      damage: 0, dmgMult: 1, tears: 0, tearsMult: 1, range: 0, shotSpeed: 1, speed: 0, luck: 0,
      shots: 1, homing: false, pierce: false, spectral: false, bounce: false, wiggle: false, big: false,
      explosive: false, slow: false, flight: false, dodge: 0, heartDrop: 0, discount: false, map: false,
    };
    this.temp = { damage: 0, dmgMult: 1, speed: 0, homing: false, shots: 0 };
  }

  // --- Stats dérivées
  dmg() {
    return Math.max(0.5, (3.5 + this.s.damage + this.temp.damage) * this.s.dmgMult * this.temp.dmgMult);
  }
  fireRate() {
    return clamp(2.4 + this.s.tears * 0.75, 0.7, 10) * this.s.tearsMult;
  }
  range() {
    return Math.max(60, 150 + this.s.range);
  }
  shotSpeed() {
    return 190 * clamp(this.s.shotSpeed, 0.6, 2);
  }
  speedMul() {
    return clamp(1 + this.s.speed + this.temp.speed, 0.5, 2);
  }
  priceOf(p) {
    let m = 1;
    if (this.s.discount) m *= 0.6;
    if (COSTUMES[this.costume].flags && COSTUMES[this.costume].flags.discount) m *= 0.7;
    return Math.max(1, Math.round(p * m));
  }

  addMax(n) {
    this.maxHearts = Math.min(24, this.maxHearts + n);
    this.hearts = Math.min(this.maxHearts, this.hearts + n);
  }
  heal(n) {
    this.hearts = Math.min(this.maxHearts, this.hearts + n);
  }
  addFamiliar(kind) {
    this.famKinds.push(kind);
    if (G && G.fams) G.fams.push(new Familiar(kind, this.x, this.y));
  }
  revealMap() {
    if (G && G.dungeon) G.dungeon.revealAll();
  }

  payHearts(n) {
    if (this.maxHearts >= n * 2 && (this.maxHearts - n * 2 > 0 || this.soul > 0)) {
      this.maxHearts -= n * 2;
      this.hearts = Math.min(this.hearts, this.maxHearts);
      Sound.play('bad');
      return true;
    }
    if (this.soul >= 3 * n) {
      this.soul -= 3 * n;
      Sound.play('bad');
      return true;
    }
    Sound.play('error');
    return false;
  }

  pickItem(id, charge) {
    const it = ITEMS[id];
    let old = null;
    if (it.active) {
      if (this.active) old = { id: this.active.id, charge: this.active.charge };
      this.active = { id, charge: charge !== undefined ? charge : it.charge, max: it.charge };
    } else {
      this.items.push(id);
      it.apply(this.s, this);
    }
    if (!Meta.data.seenItems.includes(id)) {
      Meta.data.seenItems.push(id);
      Meta.save();
    }
    this.hold = { id, t: 1.1 };
    Sound.play('item');
    if (G && G.banner) G.banner(it.name, it.desc);
    return old;
  }

  hurt(n, src) {
    if (this.dead || this.invuln > 0 || (G && G.noDamage)) return;
    if (this.s.dodge && Math.random() < this.s.dodge) {
      this.invuln = 0.5;
      Particles.text(this.x, this.y - 26, 'Dropout !', '#a0e0ff');
      Sound.play('shield');
      return;
    }
    if (this.soul > 0) {
      this.soul -= n;
      if (this.soul < 0) {
        this.hearts += this.soul;
        this.soul = 0;
      }
    } else this.hearts -= n;
    this.invuln = 1;
    this.hurtT = 0.35;
    this.lastHit = src;
    Sound.play('hurt');
    G.shake(4);
    Particles.burst(this.x, this.y - 10, ['#d97757', '#b85a3a', '#ff9a70'], 8);
    if (G.onPlayerHurt) G.onPlayerHurt();
    if (this.hearts <= 0 && this.soul <= 0) {
      if (this.revive > 0) {
        this.revive--;
        this.hearts = Math.min(this.maxHearts, 2) || 0;
        if (this.maxHearts === 0) this.soul = 2;
        this.invuln = 2;
        Particles.ring(this.x, this.y - 10, '#80c0ff', 40, 0.5);
        Particles.text(this.x, this.y - 30, 'Sauvegarde auto restaurée !', '#80c0ff');
        Sound.play('power');
        return;
      }
      this.die(src);
    }
  }

  die(src) {
    this.dead = true;
    this.deadT = 0;
    this.lastHit = src;
    Sound.play('roar');
    if (G.onPlayerDeath) G.onPlayerDeath(src);
  }

  update(dt, scene) {
    if (this.dead) {
      this.deadT += dt;
      return;
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.fireCd -= dt;
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = rand(2, 4);
    if (this.hold) {
      this.hold.t -= dt;
      if (this.hold.t <= 0) this.hold = null;
    }
    // Déplacement avec un peu d'inertie
    let mv = scene.frozenInput ? { x: 0, y: 0 } : Input.moveVec();
    if (this.inverted > 0) {
      this.inverted -= dt;
      mv = { x: -mv.x, y: -mv.y };
    }
    const sp = 88 * this.speedMul();
    const k = 1 - Math.exp(-dt * 14);
    this.vx = lerp(this.vx, mv.x * sp, k);
    this.vy = lerp(this.vy, mv.y * sp, k);
    const moving = Math.hypot(this.vx, this.vy) > 12;
    if (moving) {
      this.walkT += dt * (Math.hypot(this.vx, this.vy) / 60);
      if (Math.abs(mv.x) > Math.abs(mv.y)) this.dir = mv.x < 0 ? 'left' : 'right';
      else if (mv.y) this.dir = mv.y < 0 ? 'up' : 'down';
    } else this.walkT = 0;
    scene.movePlayer(this, this.vx * dt, this.vy * dt);
    this.trail.unshift([this.x, this.y]);
    if (this.trail.length > 60) this.trail.pop();
    // Tir
    const sd = scene.frozenInput || this.hold ? null : Input.shootDir();
    if (sd) {
      this.face = sd;
      if (this.fireCd <= 0 && scene.canShoot !== false) {
        this.fire(sd);
        this.fireCd = 1 / this.fireRate();
      }
    } else this.face = this.dir;
    this.shooting = !!sd;
    this.shootDirNow = sd;
    // Pics et feux
    if (scene.room && !this.s.flight) {
      const c = scene.room.cell(toGX(this.x), toGY(this.y));
      if (c && c.t === 'spikes') this.hurt(scene.floorIdx >= 2 ? 2 : 1, 'des pics');
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const gx = toGX(this.x + dx * (this.r + 3));
        const gy = toGY(this.y + dy * (this.r + 3));
        const cc = scene.room.cell(gx, gy);
        if (cc && cc.t === 'fire') { this.hurt(1, 'un feu de serveur'); break; }
      }
    }
  }

  fire(dir) {
    const d = DIRS[dir];
    const sp = this.shotSpeed();
    const px = -d.dy;
    const py = d.dx;
    this.eye = -this.eye;
    const ox = this.x + d.dx * 5 + px * this.eye * 3;
    const oy = this.y - 2 + d.dy * 4 + py * this.eye * 2;
    const flags = {
      homing: this.s.homing || this.temp.homing, pierce: this.s.pierce, spectral: this.s.spectral || (COSTUMES[this.costume].flags || {}).spectral,
      bounce: this.s.bounce, wiggle: this.s.wiggle, big: this.s.big, explosive: this.s.explosive, slow: this.s.slow,
    };
    const shots = Math.max(this.s.shots, this.temp.shots || 0);
    const base = Math.atan2(d.dy, d.dx);
    for (let i = 0; i < shots; i++) {
      const a = base + (shots === 1 ? 0 : (i / (shots - 1) - 0.5) * 0.36);
      const vx = Math.cos(a) * sp + this.vx * 0.3;
      const vy = Math.sin(a) * sp + this.vy * 0.3;
      G.tears.push(new Tear(ox, oy, vx, vy, { dmg: this.dmg(), range: this.range(), flags }));
    }
    Sound.play('tear');
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y, 10, 3.5, 0.35);
    if (this.dead) {
      drawAt(ctx, claudeSpr(this.costume, 'down', 0, 'dead'), this.x, this.y + 2, { sy: Math.max(0.5, 1 - this.deadT) });
      return;
    }
    if (this.invuln > 0 && Math.floor(this.invuln * 16) % 2 === 0 && this.hurtT <= 0) return;
    let face = 'normal';
    if (this.hold) face = 'happy';
    else if (this.hurtT > 0) face = 'hurt';
    else if (this.fireCd > 1 / this.fireRate() - 0.12 && this.shooting) face = 'shoot';
    else if (this.blinkT < 0) face = 'blink';
    const frame = this.walkT > 0 ? Math.floor(this.walkT * 8) % 4 : 0;
    const dir = this.hold ? 'down' : this.face;
    const fly = this.s.flight ? Math.sin(performance.now() / 200) * 2 - 4 : 0;
    drawAt(ctx, claudeSpr(this.costume, dir, frame, face), this.x, this.y + 2 + fly, { tint: this.hurtT > 0 ? '#ff2020' : null, tintA: 0.45 });
    if (this.hold) {
      drawAt(ctx, 'item_' + this.hold.id, this.x, this.y - 30 + fly);
    }
  }
}
