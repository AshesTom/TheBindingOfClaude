// Durées de la machine à états de l'Artefact (secondes)
const ART_CHARGE = 0.4;
const ART_CAST = 0.12;
const ART_RECOVER = 0.3;

// Claude, le héros.

// Les personnages jouables sont les modèles de Claude (voir meta.js).
const CHARACTERS = MODELS;

class Player {
  constructor(g, charId = 'haiku') {
    this.g = g;
    this.char = MODELS[charId] || MODELS.haiku;
    this.prefix = this.char.prefix;
    this.revives = Meta.lvl('revive');
    this.x = 120;
    this.y = 72;
    this.vx = 0;
    this.vy = 0;
    this.hw = 5;
    this.hh = 4;
    this.maxHp = Math.min(24, this.char.hp + Meta.lvl('hp') * 2);
    this.hp = this.maxHp;
    this.coins = Meta.lvl('luck') * 4;
    this.keys = 1;
    this.items = [];
    this.boons = [];
    this.special = Meta.lvl('art') * 30; // 0..100
    this.fireCd = 0;
    this.dashT = 0;
    this.dashCd = 0;
    this.dashDir = { x: 0, y: 1 };
    this.inv = 0;
    this.face = 'down';
    this.aim = { x: 0, y: 1 };
    this.shooting = false;
    this.animT = 0;
    this.walkT = 0;
    this.blinkT = 2;
    this.shieldUp = false;
    this.holdItem = null;
    this.holdT = 0;
    this.ghosts = [];
    // Artefact : machine à états IDLE -> CHARGE -> CAST -> RECOVER
    this.art = { state: 'idle', t: 0 };
    this.echoQueue = [];
    this.fireAnim = 0;
    this.hurtAnim = 0;
    this.scale = 1;
    this.recompute();
  }

  recompute() {
    const c = this.char;
    const s = {
      damage: c.damage, damageAdd: 0, damageMult: 1 + Meta.lvl('dmg') * 0.1, fireDelay: c.fireDelay, shotSpeed: 190, range: 0.55,
      speed: c.speed + Meta.lvl('speed') * 6, shots: 1, spread: 0.18, homing: false, pierce: !!c.pierce, shotSize: c.pierce ? 2 : 1,
      dodge: 0, shield: false, luck: Meta.lvl('luck'), dashCd: 0.7, dashTime: 0.16, dashSpeed: 290, iframes: 0,
      specialRate: c.special, crit: 0, vamp: 0, echo: 0, dashNova: false,
    };
    for (const id of this.items) if (ITEMS[id].apply) ITEMS[id].apply(s);
    for (const id of this.boons) if (BOON_MAP[id].apply) BOON_MAP[id].apply(s);
    s.dmg = (s.damage + s.damageAdd) * s.damageMult;
    s.fireDelay = Math.max(0.09, s.fireDelay);
    s.speed = Math.min(150, s.speed);
    this.stats = s;
  }

  get dir() {
    return { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[this.face];
  }

  update(dt) {
    const g = this.g;
    const s = this.stats;
    this.animT += dt;
    if (this.inv > 0) this.inv -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.holdT > 0) this.holdT -= dt;
    if (this.fireAnim > 0) this.fireAnim -= dt;
    if (this.hurtAnim > 0) this.hurtAnim -= dt;
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = rand(1.5, 4);

    const mv = Input.moveVec();
    const sh = Input.shootVec();

    // --- Dash (esquive à la Hadès)
    if (Input.pressed('dash') && this.dashCd <= 0 && this.dashT <= 0) {
      const d = (mv.x || mv.y) ? norm(mv.x, mv.y) : { x: this.dir[0], y: this.dir[1] };
      this.dashDir = d;
      this.dashT = s.dashTime;
      this.dashCd = s.dashCd;
      this.inv = Math.max(this.inv, s.dashTime + 0.06 + s.iframes);
      this.dashIframe = true;
      Sound.play('dash');
      g.burst(this.x, this.y + 2, 6, '#c8c0c8', 50, 0.3);
    }

    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.dashDir.x * s.dashSpeed;
      this.vy = this.dashDir.y * s.dashSpeed;
      if (Math.floor(this.animT * 60) % 2 === 0) {
        this.ghosts.push({ x: this.x, y: this.y, spr: this.spriteName(), t: 0.25 });
      }
      if (this.dashT <= 0) {
        this.vx *= 0.35;
        this.vy *= 0.35;
        if (s.dashNova) this.nova(8, 0.7);
      }
    } else {
      const k = Math.min(1, dt * 14);
      // On ralentit pendant qu'on canalise l'Artefact
      const slow = this.art.state === 'charge' || this.art.state === 'cast' ? 0.3 : 1;
      this.vx = lerp(this.vx, mv.x * s.speed * slow, k);
      this.vy = lerp(this.vy, mv.y * s.speed * slow, k);
    }

    const before = { x: this.x, y: this.y };
    const hit = g.moveEntity(this, this.vx * dt, this.vy * dt, this.hw, this.hh, 'player');
    this.nudgeToDoors(dt, mv, hit);
    const moving = Math.hypot(this.x - before.x, this.y - before.y) > 0.05;
    if (moving) this.walkT += dt;

    // --- Orientation
    if (sh.x || sh.y) {
      this.face = Math.abs(sh.x) > Math.abs(sh.y) ? (sh.x < 0 ? 'left' : 'right') : (sh.y < 0 ? 'up' : 'down');
    } else if (mv.x || mv.y) {
      this.face = Math.abs(mv.x) > Math.abs(mv.y) ? (mv.x < 0 ? 'left' : 'right') : (mv.y < 0 ? 'up' : 'down');
    }

    // --- Tir
    this.shooting = !!(sh.x || sh.y) && this.holdT <= 0;
    if (this.shooting) {
      this.aim = sh;
      if (this.fireCd <= 0) {
        this.fire(sh);
        this.fireCd = s.fireDelay;
      }
    }
    for (let i = this.echoQueue.length - 1; i >= 0; i--) {
      const e = this.echoQueue[i];
      e.t -= dt;
      if (e.t <= 0) {
        this.fire(e.dir, true);
        this.echoQueue.splice(i, 1);
      }
    }

    // --- Artefact (spécial)
    if (Input.pressed('special') && !g.hub && this.art.state === 'idle') {
      if (this.special >= 100) {
        this.special = 0;
        this.setArt('charge');
        this.inv = Math.max(this.inv, ART_CHARGE + ART_CAST + 0.1);
        Sound.play('charge');
      } else {
        g.floatText(this.x, this.y - 22, 'PAS CHARGÉ', '#8a8290');
      }
    }
    this.updateArt(dt);
    // Artefact prêt : quelques étincelles tournent autour de Claude
    if (this.special >= 100 && this.art.state === 'idle' && !g.hub && Math.random() < dt * 5) {
      g.fx.spiral(this.x, this.y - 6, 13, Math.random() * Math.PI * 2, 0.45, rampFor('#d97757'));
    }

    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].t -= dt;
      if (this.ghosts[i].t <= 0) this.ghosts.splice(i, 1);
    }
  }

  // Position de la gemme de l'Artefact, au-dessus de la tête.
  orbPos() {
    return { x: this.x, y: this.y - 24 };
  }

  setArt(state) {
    this.art.state = state;
    this.art.t = 0;
  }

  updateArt(dt) {
    const g = this.g;
    const a = this.art;
    if (a.state === 'idle') return;
    a.t += dt;
    const o = this.orbPos();
    if (a.lx !== undefined) g.fx.retarget(a.lx, a.ly, o.x, o.y);
    a.lx = o.x;
    a.ly = o.y;
    if (a.state === 'charge') {
      // Les étincelles convergent en spirale vers la gemme
      const n = Math.random() < 0.5 ? 2 : 1;
      for (let i = 0; i < n; i++) g.fx.spiral(o.x, o.y, 16 + Math.random() * 10, Math.random() * Math.PI * 2, 0.3, rampFor('#d97757'));
      if (a.t >= ART_CHARGE) this.castArt();
    } else if (a.state === 'cast') {
      if (a.t >= ART_CAST) this.setArt('recover');
    } else if (a.state === 'recover') {
      if (a.t >= ART_RECOVER) { this.setArt('idle'); a.lx = undefined; }
    }
  }

  castArt() {
    const g = this.g;
    const o = this.orbPos();
    this.setArt('cast');
    this.nova(18, 1.1, true);
    g.clearEnemyBullets();
    g.shockwave(this.x, this.y, 60, 12 + g.floorNum * 4);
    // Explosion : les étincelles repartent vers l'extérieur
    g.fx.burst(o.x, o.y, 28, '#d97757', 110, 0.45);
    g.fx.burst(this.x, this.y - 4, 16, '#ffd8c4', 70, 0.35);
    g.shake = Math.max(g.shake, 6);
    g.flash = 0.12;
    Sound.play('special');
  }

  // Pose de l'Artefact (étirement vers le haut, écrasement à l'impact)
  // et intensité du liseré de lumière. Le temps est quantifié à 10 i/s.
  artPose() {
    const a = this.art;
    const t = poseT(a.t);
    const ease = (k) => 1 - (1 - k) * (1 - k);
    if (a.state === 'charge') {
      const k = ease(Math.min(1, t / ART_CHARGE));
      return { sx: 1 - 0.08 * k, sy: 1 + 0.12 * k, rim: 0.35 + 0.65 * k, oy: -k };
    }
    if (a.state === 'cast') return { sx: 1.2, sy: 0.84, rim: 1, oy: 0 };
    if (a.state === 'recover') {
      const k = 1 - ease(Math.min(1, t / ART_RECOVER));
      return { sx: 1 + 0.1 * k, sy: 1 - 0.08 * k, rim: k * 0.9, oy: 0 };
    }
    return null;
  }

  // Lumière la plus proche (torche, brasero) pour un léger liseré.
  nearestLight() {
    const g = this.g;
    let best = null;
    let bd = 90 * 90;
    const test = (lx, ly, color) => {
      const d = (lx - this.x) * (lx - this.x) + (ly - this.y) * (ly - this.y);
      if (d < bd) { bd = d; best = { x: lx, y: ly, color }; }
    };
    for (const tc of g.room.torches || []) test(tc.x, tc.y, TORCH_COLORS[tc.kind][1]);
    if (g.hub) for (const pr of g.hubProps) if (pr.fire) test(pr.x, pr.y - 8, '#ffe080');
    return best;
  }

  // Aide à passer les portes : on glisse vers le centre de l'ouverture.
  nudgeToDoors(dt, mv, hit) {
    const g = this.g;
    const push = 70 * dt;
    if (hit.y && mv.y < -0.3 && this.y < 32 && Math.abs(this.x - 120) < 10 && g.isDoorOpen('up')) this.x += clamp(120 - this.x, -push, push);
    if (hit.y && mv.y > 0.3 && this.y > 112 && Math.abs(this.x - 120) < 10 && g.isDoorOpen('down')) this.x += clamp(120 - this.x, -push, push);
    if (hit.x && mv.x < -0.3 && this.x < 32 && Math.abs(this.y - 72) < 10 && g.isDoorOpen('left')) this.y += clamp(72 - this.y, -push, push);
    if (hit.x && mv.x > 0.3 && this.x > 208 && Math.abs(this.y - 72) < 10 && g.isDoorOpen('right')) this.y += clamp(72 - this.y, -push, push);
  }

  fire(dir, isEcho = false) {
    const g = this.g;
    const s = this.stats;
    const base = Math.atan2(dir.y, dir.x);
    const n = s.shots;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * s.spread;
      const vx = Math.cos(a) * s.shotSpeed + this.vx * 0.25;
      const vy = Math.sin(a) * s.shotSpeed + this.vy * 0.25;
      const ox = Math.cos(base) * 6;
      const oy = Math.sin(base) * 4;
      g.tears.push(new Tear(g, this.x + ox, this.y + oy, vx, vy, {
        dmg: s.dmg, life: s.range, size: s.shotSize, homing: s.homing, pierce: s.pierce,
      }));
    }
    if (!isEcho && s.echo > 0 && Math.random() < s.echo) this.echoQueue.push({ t: 0.08, dir });
    this.fireAnim = 0.14;
    this.fireDir = { x: Math.cos(base), y: Math.sin(base) };
    g.particles.push({ type: 'flash', x: this.x + Math.cos(base) * 8, y: this.y - 5 + Math.sin(base) * 5, life: 0.07, max: 0.07 });
    Sound.play('shoot');
  }

  nova(n, lifeMult = 1, big = false) {
    const g = this.g;
    const s = this.stats;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      g.tears.push(new Tear(g, this.x, this.y, Math.cos(a) * 200, Math.sin(a) * 200, {
        dmg: s.dmg * (big ? 1.5 : 0.8), life: s.range * lifeMult, size: big ? 2 : 1, pierce: big,
      }));
    }
  }

  spriteName() {
    const p = this.prefix;
    if (this.hurtAnim > 0) return `${p}_hurt`;
    if (this.art.state === 'charge' || this.art.state === 'cast') return `${p}_down_shoot_0`;
    const moving = Math.hypot(this.vx, this.vy) > 10;
    const f = moving ? Math.floor(this.walkT * 10) % 2 : 0;
    if (this.face === 'up') return `${p}_up_${f}`;
    if (this.fireAnim > 0) return `${p}_${this.face}_shoot_${f}`;
    if (this.blinkT < 0) return `${p}_${this.face}_blink_${f}`;
    return `${p}_${this.face}_${f}`;
  }

  draw(ctx) {
    for (const gh of this.ghosts) {
      drawSpr(ctx, gh.spr, gh.x - 10, gh.y - 15, { tint: '#ffb080', alpha: gh.t * 2 });
    }
    drawShadow(ctx, this.x, this.y + 3, 8, 2);
    // Clignote pendant l'invulnérabilité après un coup (pas pendant le dash)
    if (this.inv > 0 && this.dashT <= 0 && !this.dashIframe && this.hurtAnim <= 0 && Math.floor(this.inv * 16) % 2 === 0) return;
    if (this.dashT <= 0 && this.inv <= 0) this.dashIframe = false;
    const by = this.y + 5;
    if (this.holdT > 0) {
      // Brandit l'objet au-dessus de sa tête
      drawSprSquash(ctx, `${this.prefix}_down_0`, this.x, by, 0.94, 1.08);
      drawSprC(ctx, ITEMS[this.holdItem].icon, this.x, this.y - 25 + Math.sin(this.animT * 8));
      return;
    }
    const speed = Math.hypot(this.vx, this.vy);
    // Les paramètres de pose évoluent en continu, mais sont échantillonnés à
    // ~10 i/s puis calés sur la grille : ça se lit comme un vrai sprite animé.
    const at = poseT(this.animT);
    let sx = 1;
    let sy = 1;
    let ox = 0;
    let oy = 0;
    const art = this.artPose();
    if (art) {
      sx = art.sx;
      sy = art.sy;
      oy = art.oy;
    } else if (this.dashT > 0) {
      // Étirement dans le sens du dash
      const ax = Math.abs(this.dashDir.x);
      sx = 1 + 0.25 * ax - 0.12 * (1 - ax);
      sy = 1 + 0.25 * (1 - ax) - 0.12 * ax;
    } else if (this.fireAnim > 0) {
      // Recul au tir (2 paliers)
      const k = Math.ceil((this.fireAnim / 0.14) * 2) / 2;
      sx = 1 + 0.1 * k;
      sy = 1 - 0.08 * k;
      ox = -Math.round(this.fireDir.x * k * 1.5);
      oy = -Math.round(this.fireDir.y * k * 1.5);
    } else if (speed > 10) {
      // Petits rebonds de marche
      const w = Math.abs(Math.sin(poseT(this.walkT) * 15));
      sy = 1 + 0.06 * w;
      sx = 1 - 0.04 * w;
      oy = -Math.round(w);
    } else {
      // Respiration (2 temps)
      const b = Math.sin(at * 3) > 0 ? 1 : -1;
      sy = 1 + 0.03 * b;
      sx = 1 - 0.02 * b;
    }
    if (this.hurtAnim > 0) {
      const k = Math.ceil((this.hurtAnim / 0.5) * 3) / 3;
      sx = 1 + 0.2 * k;
      sy = 1 - 0.15 * k;
      ox = (Math.floor(this.animT * 20) % 2 ? 1 : -1) * Math.round(k * 1.5);
    }
    // Liseré de lumière : la gemme de l'Artefact (au-dessus), sinon la torche
    // la plus proche, très discrètement.
    let rim = null;
    if (art && art.rim > 0) {
      rim = { dir: 6, a: art.rim, color: '#ffd8c4' };
    } else {
      const L = this.nearestLight();
      if (L) rim = { dir: rimDir(L.x - this.x, L.y - this.y + 6), a: 0.34, color: L.color };
    }
    drawSprSquash(ctx, this.spriteName(), this.x + ox, by + oy, sx, sy, { flash: this.hurtAnim > 0.38, rim });
    if (art) this.drawOrb(ctx, art);
    if (this.shieldUp) {
      ctx.save();
      ctx.globalAlpha = Math.sin(poseT(this.animT) * 5) > 0 ? 0.45 : 0.3;
      pixelCircle(ctx, this.x, this.y - 4, 11, '#5fcde4', 1);
      ctx.restore();
    }
  }

  // La gemme de l'Artefact : scintille pendant la charge, éclate au lancer.
  drawOrb(ctx, art) {
    const o = this.orbPos();
    const st = this.art.state;
    const fl = Math.floor(this.art.t * 20) % 2;
    if (st === 'charge') {
      const r = 1.5 + art.rim * 2;
      drawGlow(ctx, o.x, o.y, 6 + art.rim * 8, '#d97757', 0.35 + art.rim * 0.3);
      fillEllipseHD(ctx, o.x, o.y, r + 1, r + 1, '#170b0d');
      fillEllipseHD(ctx, o.x, o.y, r, r, fl ? '#e8906c' : '#d97757');
      fillEllipseHD(ctx, o.x - 0.5, o.y - 0.5, r * 0.5, r * 0.5, fl ? '#ffffff' : '#ffd8c4');
    } else if (st === 'cast') {
      drawGlow(ctx, o.x, o.y, 22, '#ffd8c4', 0.8);
      fillEllipseHD(ctx, o.x, o.y, 5, 5, '#ffffff');
    } else if (st === 'recover' && art.rim > 0.3) {
      drawGlow(ctx, o.x, o.y, 10 * art.rim, '#d97757', art.rim * 0.4);
    }
  }
}
