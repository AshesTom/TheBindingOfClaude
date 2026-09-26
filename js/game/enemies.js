// Ennemis : bugs, spams, processus zombies, web crawlers, fuites mémoire…

class Enemy {
  constructor(type, x, y, o = {}) {
    const d = ENEMY_DEFS[type] || {};
    this.type = type;
    this.def = d;
    this.name = d.name || type;
    this.x = x;
    this.y = y;
    const hpMul = 1 + (G && G.floorIdx ? G.floorIdx * 0.22 : 0);
    this.hp = (o.hp || d.hp || 10) * (o.noScale ? 1 : hpMul);
    this.maxHp = this.hp;
    this.r = d.r || 7;
    this.h = d.h || 16;
    this.flying = !!d.flying;
    this.heavy = !!d.heavy;
    this.speed = d.speed || 30;
    this.spawning = o.noSpawn ? 0 : 0.45;
    this.flashT = 0;
    this.t = Math.random() * 3;
    this.cd = rand(0.8, 2);
    this.kx = 0;
    this.ky = 0;
    this.slowT = 0;
    this.dead = false;
    this.z = 0;
    this.st = {};
    this.flip = false;
    this.contact = d.contact !== undefined ? d.contact : true;
    this.untargetable = false;
    this.isBoss = false;
    if (d.init) d.init(this);
  }

  get dmgUnit() {
    return G && G.floorIdx >= 2 ? 2 : 1;
  }

  hit(dmg, src) {
    if (this.dead || this.spawning > 0) return false;
    if (this.untargetable) return 'block';
    if (this.def.blocks && this.def.blocks(this, src)) {
      Sound.play('shield');
      Particles.sparks(this.x, this.y - this.h * 0.5, ['#ffffff', '#c0c0c0'], 4);
      return 'block';
    }
    this.hp -= dmg;
    this.flashT = 0.09;
    Sound.play('hit');
    if (Math.random() < 0.6) Particles.burst(this.x, this.y - this.h * 0.4, [G.fl ? G.fl.blood : '#6a1a14', shade(G.fl ? G.fl.blood : '#6a1a14', 0.2)], 3, { max: 50 });
    if (this.onHit) this.onHit(dmg, src);
    if (this.hp <= 0) this.die();
    return true;
  }

  push(nx, ny, f) {
    if (this.heavy) return;
    this.kx += nx * f * 3;
    this.ky += ny * f * 3;
  }

  die() {
    if (this.dead) return;
    this.dead = true;
    Sound.play('kill');
    const bc = G.fl ? G.fl.blood : '#6a1a14';
    Particles.burst(this.x, this.y - this.h * 0.4, [bc, shade(bc, 0.25), shade(bc, -0.2)], 14, { max: 100 });
    if (G.room) G.room.splat(this.x, this.y, bc, 8, this.r + 4);
    if (this.def.onDeath) this.def.onDeath(this);
    G.onEnemyKilled(this);
  }

  // Se rapprocher d'un point en contournant les obstacles.
  seek(tx, ty, speed, dt) {
    let dir = null;
    if (!this.flying && G.room) {
      const blocked = this.lineBlocked(tx, ty);
      if (blocked) {
        G.room.flowTo(toGX(tx), toGY(ty));
        dir = G.room.flowDir(this.x, this.y);
      }
    }
    if (!dir) dir = norm(tx - this.x, ty - this.y);
    this.step(dir.x * speed * dt, dir.y * speed * dt);
    if (Math.abs(dir.x) > 0.2) this.flip = dir.x < 0;
  }

  lineBlocked(tx, ty) {
    const d = dist(this.x, this.y, tx, ty);
    const n = Math.ceil(d / 10);
    for (let i = 1; i < n; i++) {
      const x = lerp(this.x, tx, i / n);
      const y = lerp(this.y, ty, i / n);
      if (G.room.solid(toGX(x), toGY(y))) return true;
    }
    return false;
  }

  step(dx, dy) {
    if (G.room) return G.room.move(this, dx, dy, this.flying ? 'fly' : 'walk');
    this.x += dx;
    this.y += dy;
    return false;
  }

  update(dt) {
    this.t += dt;
    this.flashT -= dt;
    if (this.spawning > 0) {
      this.spawning -= dt;
      return;
    }
    const ts = G.timeScaleEnemies !== undefined ? G.timeScaleEnemies : 1;
    if (ts <= 0) return;
    dt *= ts;
    if (this.slowT > 0) {
      this.slowT -= dt;
      dt *= 0.55;
    }
    this.cd -= dt;
    if (typeof this.ai === 'function') this.ai(dt);
    else if (this.def.ai) this.def.ai(this, dt);
    // Les volants ne restent pas planqués au-dessus des obstacles
    if (this.flying && !this.isBoss && G.room) {
      const gx = toGX(this.x);
      const gy = toGY(this.y);
      if (G.room.solid(gx, gy)) {
        const n = norm(this.x - cellX(gx), this.y - cellY(gy));
        this.step((n.x || 1) * 45 * dt, n.y * 45 * dt);
      }
    }
    if (this.kx || this.ky) {
      this.step(this.kx * dt, this.ky * dt);
      this.kx *= 0.82;
      this.ky *= 0.82;
      if (Math.abs(this.kx) < 1) this.kx = 0;
      if (Math.abs(this.ky) < 1) this.ky = 0;
    }
    // Contact avec Claude
    const p = G.player;
    if (this.contact && p && !p.dead && this.z < 10 && !this.untargetable) {
      if (dist(p.x, p.y - 5, this.x, this.y - this.h * 0.35) < this.r + p.hitR) p.hurt(this.dmgUnit, this.name);
    }
  }

  sprite() {
    return this.def.sprite ? this.def.sprite(this) : this.type + '_' + (Math.floor(this.t * 6) % 2);
  }

  draw(ctx) {
    const s = this.sprite();
    if (!s) return;
    const c = spr(s);
    let sx = 1;
    let sy = 1;
    let alpha;
    if (this.spawning > 0) {
      const k = 1 - this.spawning / 0.45;
      sx = sy = k;
      alpha = k;
    }
    if (this.st.squash) { sx *= 1 + this.st.squash; sy *= 1 - this.st.squash; }
    if (this.def.alpha) alpha = this.def.alpha(this);
    const shw = this.def.shadow !== undefined ? this.def.shadow : Math.max(5, c.width * 0.35);
    if (shw) drawShadow(ctx, this.x, this.y, shw, shw * 0.35, 0.3 * (alpha === undefined ? 1 : alpha));
    const fy = this.flying ? -6 + Math.sin(this.t * 5) * 2 : 0;
    drawAt(ctx, c, this.x, this.y + 1 + fy - this.z, { sx, sy, flip: this.flip, alpha, tint: this.flashT > 0 ? '#ffffff' : this.slowT > 0 ? '#80ff60' : null, tintA: this.flashT > 0 ? 0.75 : 0.25 });
  }
}

// Ennemi « s'écrase » avant de tirer (télégraphe).
function telegraph(e, dt, dur, then) {
  if (e.st.tele === undefined) e.st.tele = -1;
  if (e.st.tele < 0 && e.cd <= 0) e.st.tele = dur;
  if (e.st.tele > 0) {
    e.st.tele -= dt;
    e.st.squash = Math.sin((1 - e.st.tele / dur) * Math.PI) * 0.18;
    if (Math.random() < 0.3) Particles.sparks(e.x, e.y - e.h * 0.5, ['#ffffff', '#ffd0d0'], 1, { speed: 20 });
    if (e.st.tele <= 0) {
      e.st.tele = -1;
      e.st.squash = 0;
      then();
      return true;
    }
  }
  return false;
}

const ENEMY_DEFS = {
  bug: {
    name: 'un bug', hp: 4, r: 5, h: 12, speed: 42, flying: true, shadow: 3,
    ai: (e, dt) => {
      const p = G.player;
      const a = angTo(e.x, e.y, p.x, p.y) + Math.sin(e.t * 3 + e.x) * 1.2;
      e.step(Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt);
      e.flip = p.x < e.x;
    },
    sprite: (e) => 'bug_' + (Math.floor(e.t * 16) % 2),
  },
  spam: {
    name: 'un spam', hp: 9, r: 7, h: 14, speed: 22, flying: true, shadow: 5,
    ai: (e, dt) => {
      const p = G.player;
      const d = dist(e.x, e.y, p.x, p.y);
      const a = angTo(e.x, e.y, p.x, p.y) + (d < 70 ? Math.PI : 0) + Math.sin(e.t) * 0.8;
      e.step(Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt);
      telegraph(e, dt, 0.45, () => {
        aimAt(e.x, e.y - 8, 115, { style: 'red', size: 3, dmg: e.dmgUnit, src: e.name });
        e.cd = rand(2.2, 3.2);
      });
    },
    sprite: (e) => 'spam_' + (Math.floor(e.t * 10) % 2),
  },
  zombie: {
    name: 'un processus zombie', hp: 11, r: 7, h: 22, speed: 30,
    ai: (e, dt) => { const p = G.player; e.seek(p.x, p.y, e.speed, dt); },
    sprite: (e) => 'zombie_' + (Math.floor(e.t * 4) % 2),
  },
  crawler: {
    name: 'un web crawler', hp: 7, r: 7, h: 12, speed: 150,
    ai: (e, dt) => {
      if (!e.st.hop) {
        if (e.cd <= 0) {
          const p = G.player;
          const a = angTo(e.x, e.y, p.x, p.y) + rand(-0.6, 0.6);
          e.st.hop = 0.28;
          e.st.dx = Math.cos(a);
          e.st.dy = Math.sin(a);
          e.flip = e.st.dx < 0;
        }
      } else {
        e.st.hop -= dt;
        if (e.step(e.st.dx * e.speed * dt, e.st.dy * e.speed * dt) || e.st.hop <= 0) {
          e.st.hop = 0;
          e.cd = rand(0.4, 0.9);
        }
      }
    },
    sprite: (e) => 'crawler_' + (e.st.hop ? Math.floor(e.t * 16) % 2 : 0),
  },
  leak: {
    name: 'une fuite mémoire', hp: 13, r: 8, h: 14, speed: 16,
    ai: (e, dt) => {
      const p = G.player;
      if (!e.st.wd || e.t > e.st.wt) {
        e.st.wt = e.t + rand(1, 2);
        const a = angTo(e.x, e.y, p.x, p.y) + rand(-1.2, 1.2);
        e.st.wd = { x: Math.cos(a), y: Math.sin(a) };
      }
      e.step(e.st.wd.x * e.speed * dt, e.st.wd.y * e.speed * dt);
      if (Math.random() < dt * 2 && G.room) G.room.decal(e.x + rand(-6, 6), e.y + rand(-2, 3), '#5a2a7a', 2, 0.4);
      telegraph(e, dt, 0.5, () => {
        e.st.alt = !e.st.alt;
        ring(e.x, e.y - 6, 4, 95, { style: 'purple', size: 3, dmg: e.dmgUnit, src: e.name }, e.st.alt ? Math.PI / 4 : 0);
        e.cd = rand(2.6, 3.4);
      });
    },
    sprite: (e) => 'leak_' + (Math.floor(e.t * 3) % 2),
  },
  cookie: {
    name: 'un cookie traceur', hp: 4, r: 5, h: 10, speed: 66,
    ai: (e, dt) => { const p = G.player; e.seek(p.x, p.y, e.speed, dt); },
    sprite: (e) => 'cookie_' + (Math.floor(e.t * 8) % 2),
  },
  worm: {
    name: 'un ver informatique', hp: 11, r: 7, h: 10, speed: 38,
    init: (e) => { e.st.dir = choice(DIR_NAMES); },
    ai: (e, dt) => {
      const p = G.player;
      if (e.st.pause > 0) { e.st.pause -= dt; return; }
      const d = DIRS[e.st.dir];
      const sp = e.st.charge ? 170 : e.speed;
      if (!e.st.charge) {
        if (Math.abs(p.y - e.y) < 9) { e.st.dir = p.x < e.x ? 'left' : 'right'; e.st.charge = true; Sound.play('charge'); }
        else if (Math.abs(p.x - e.x) < 9) { e.st.dir = p.y < e.y ? 'up' : 'down'; e.st.charge = true; Sound.play('charge'); }
      }
      const dd = DIRS[e.st.dir];
      if (e.step(dd.dx * sp * dt, dd.dy * sp * dt)) {
        e.st.charge = false;
        e.st.pause = 0.4;
        e.st.dir = choice(DIR_NAMES.filter((n) => n !== e.st.dir));
      }
      e.flip = dd.dx < 0;
      void d;
    },
    sprite: (e) => 'worm_' + (Math.floor(e.t * (e.st.charge ? 14 : 6)) % 2),
  },
  popup: {
    name: 'une pop-up', hp: 12, r: 9, h: 18, speed: 0, heavy: true, contact: false,
    init: (e) => { e.st.open = false; e.cd = rand(1, 2.5); },
    ai: (e, dt) => {
      if (!e.st.open) {
        e.untargetable = true;
        if (e.cd <= 0) { e.st.open = true; e.st.ot = 0; e.untargetable = false; Sound.play('spawn'); }
      } else {
        e.st.ot += dt;
        if (e.st.ot > 0.45 && !e.st.shot) {
          e.st.shot = true;
          aimAt(e.x, e.y - 10, 120, { style: 'red', size: 3, dmg: e.dmgUnit, src: e.name }, 0.5, 3);
        }
        if (e.st.ot > 1.6) { e.st.open = false; e.st.shot = false; e.cd = rand(1.4, 2.4); }
      }
    },
    blocks: (e) => !e.st.open,
    sprite: (e) => (e.st.open ? 'popup_open' : 'popup_closed'),
  },
  bloat: {
    name: 'un bloatware', hp: 30, r: 11, h: 24, speed: 19, heavy: true,
    ai: (e, dt) => { const p = G.player; e.seek(p.x, p.y, e.speed, dt); },
    onDeath: (e) => { for (let i = 0; i < 2; i++) G.spawnEnemy('bug', e.x + rand(-8, 8), e.y + rand(-6, 6), { noSpawn: true }); },
    sprite: (e) => 'bloat_' + (Math.floor(e.t * 2) % 2),
  },
  trojan: {
    name: 'un cheval de Troie', hp: 16, r: 9, h: 20, speed: 0,
    ai: (e, dt) => {
      if (e.st.jump) {
        e.st.jt += dt;
        const k = clamp(e.st.jt / 0.75, 0, 1);
        e.x = lerp(e.st.x0, e.st.x1, k);
        e.y = lerp(e.st.y0, e.st.y1, k);
        e.z = Math.sin(k * Math.PI) * 44;
        e.untargetable = e.z > 12;
        if (k >= 1) {
          e.st.jump = false;
          e.z = 0;
          e.untargetable = false;
          e.cd = rand(1.6, 2.4);
          Sound.play('slam');
          G.shake(2);
          Particles.puff(e.x, e.y, '#8a7a6a', 6);
          ring(e.x, e.y - 4, G.floorIdx >= 2 ? 6 : 4, 90, { style: 'red', size: 3, dmg: e.dmgUnit, src: e.name });
        }
      } else if (e.cd <= 0) {
        const p = G.player;
        e.st.jump = true;
        e.st.jt = 0;
        e.st.x0 = e.x; e.st.y0 = e.y;
        const tx = clamp(p.x + rand(-10, 10), FX + 12, FX2 - 12);
        const ty = clamp(p.y + rand(-6, 6), FY + 12, FY2 - 12);
        e.st.x1 = tx; e.st.y1 = ty;
        e.flip = tx < e.x;
        Sound.play('jump');
      }
    },
    sprite: (e) => 'trojan_' + (e.st.jump ? 0 : e.cd < 0.4 ? 1 : 0),
  },
  captcha: {
    name: 'un captcha', hp: 20, r: 10, h: 22, speed: 0, heavy: true,
    ai: (e, dt) => {
      telegraph(e, dt, 0.5, () => {
        aimAt(e.x, e.y - 12, 125, { style: 'red', size: 3, dmg: e.dmgUnit, src: e.name }, 0.35, G.floorIdx >= 3 ? 3 : 1);
        e.cd = rand(1.8, 2.6);
      });
    },
    sprite: (e) => 'captcha_' + (e.st.tele > 0 ? 1 : 0),
  },
  firewall: {
    name: 'un pare-feu', hp: 24, r: 9, h: 24, speed: 50, heavy: true,
    init: (e) => { e.st.dir = choice(DIR_NAMES); },
    ai: (e, dt) => {
      const p = G.player;
      if (Math.abs(p.y - e.y) < 8 && e.st.turn <= 0) { e.st.dir = p.x < e.x ? 'left' : 'right'; e.st.turn = 0.8; }
      else if (Math.abs(p.x - e.x) < 8 && e.st.turn <= 0) { e.st.dir = p.y < e.y ? 'up' : 'down'; e.st.turn = 0.8; }
      e.st.turn = (e.st.turn || 0) - dt;
      const d = DIRS[e.st.dir];
      if (e.step(d.dx * e.speed * dt, d.dy * e.speed * dt)) {
        const opts = DIR_NAMES.filter((n) => n !== e.st.dir);
        e.st.dir = choice(opts);
      }
    },
    // Invulnérable de face : un tir qui arrive en sens inverse de sa marche rebondit.
    blocks: (e, src) => {
      if (!src || src.vx === undefined) return false;
      const d = DIRS[e.st.dir];
      const n = norm(src.vx, src.vy);
      return n.x * d.dx + n.y * d.dy < -0.6;
    },
    sprite: (e) => 'firewall_' + e.st.dir,
  },
  ghost: {
    name: 'une hallucination', hp: 14, r: 8, h: 18, speed: 22, flying: true,
    init: (e) => { e.st.phase = 'show'; e.st.pt = 0; },
    ai: (e, dt) => {
      const p = G.player;
      e.st.pt += dt;
      if (e.st.phase === 'show') {
        e.untargetable = false;
        e.seek(p.x, p.y, e.speed, dt);
        if (e.st.pt > 1.2 && !e.st.shot) {
          e.st.shot = true;
          aimAt(e.x, e.y - 12, 110, { style: 'white', size: 3, dmg: e.dmgUnit, src: e.name }, 0.3, 2);
        }
        if (e.st.pt > 2.6) { e.st.phase = 'fade'; e.st.pt = 0; }
      } else if (e.st.phase === 'fade') {
        e.untargetable = true;
        if (e.st.pt > 0.45) {
          const a = Math.random() * TAU;
          const r = rand(60, 100);
          e.x = clamp(p.x + Math.cos(a) * r, FX + 14, FX2 - 14);
          e.y = clamp(p.y + Math.sin(a) * r, FY + 14, FY2 - 14);
          e.st.phase = 'in';
          e.st.pt = 0;
          Sound.play('teleport');
        }
      } else if (e.st.phase === 'in') {
        e.untargetable = true;
        if (e.st.pt > 0.45) { e.st.phase = 'show'; e.st.pt = 0; e.st.shot = false; }
      }
    },
    alpha: (e) => (e.st.phase === 'fade' ? 1 - e.st.pt / 0.45 : e.st.phase === 'in' ? e.st.pt / 0.45 : 0.85),
    sprite: (e) => 'ghost_' + (Math.floor(e.t * 4) % 2),
  },
  glitch: {
    name: 'un glitch', hp: 10, r: 7, h: 14, speed: 70, flying: true,
    ai: (e, dt) => {
      const p = G.player;
      if (e.cd <= 0) {
        const a = angTo(e.x, e.y, p.x, p.y) + rand(-1.4, 1.4);
        e.st.d = { x: Math.cos(a), y: Math.sin(a) };
        e.cd = rand(0.25, 0.5);
        if (Math.random() < 0.15) {
          e.x = clamp(e.x + rand(-30, 30), FX + 10, FX2 - 10);
          e.y = clamp(e.y + rand(-30, 30), FY + 10, FY2 - 10);
          Sound.play('glitch');
        }
      }
      if (e.st.d) e.step(e.st.d.x * e.speed * dt, e.st.d.y * e.speed * dt);
    },
    sprite: (e) => 'glitch_' + (Math.floor(e.t * 12) % 3),
  },
  drone: {
    name: 'un drone de sécurité', hp: 14, r: 8, h: 14, speed: 40, flying: true,
    ai: (e, dt) => {
      const p = G.player;
      const d = dist(e.x, e.y, p.x, p.y);
      const a = angTo(e.x, e.y, p.x, p.y) + (d < 90 ? Math.PI : 0) + Math.sin(e.t * 1.3) * 0.9;
      e.step(Math.cos(a) * e.speed * dt, Math.sin(a) * e.speed * dt);
      telegraph(e, dt, 0.45, () => {
        aimAt(e.x, e.y - 10, 125, { style: 'red', size: 3, dmg: e.dmgUnit, src: e.name }, 0.45, 3);
        e.cd = rand(2.2, 2.9);
      });
    },
    sprite: (e) => 'drone_' + (Math.floor(e.t * 16) % 2),
  },
  intern: {
    name: 'un stagiaire de Sam', hp: 12, r: 7, h: 22, speed: 44,
    ai: (e, dt) => { const p = G.player; e.seek(p.x, p.y, e.speed, dt); },
    sprite: (e) => 'intern_' + (Math.floor(e.t * 5) % 2),
  },
};
