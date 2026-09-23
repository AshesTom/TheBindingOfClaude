// Claude, le héros.

const CHARACTERS = {
  claude: {
    name: 'CLAUDE',
    title: 'L\'ASSISTANT SERVIABLE',
    desc: 'TIRE DES TOKENS. ESQUIVE AVEC UN DASH. DÉCLENCHE UNE ONDE D\'ARTEFACT.',
    hp: 6,
  },
};

class Player {
  constructor(g, charId = 'claude') {
    this.g = g;
    this.char = CHARACTERS[charId];
    this.x = 120;
    this.y = 72;
    this.vx = 0;
    this.vy = 0;
    this.hw = 5;
    this.hh = 4;
    this.maxHp = this.char.hp;
    this.hp = this.maxHp;
    this.coins = 0;
    this.keys = 1;
    this.items = [];
    this.boons = [];
    this.special = 0; // 0..100
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
    this.echoQueue = [];
    this.scale = 1;
    this.recompute();
  }

  recompute() {
    const s = {
      damage: 3.5, damageAdd: 0, damageMult: 1, fireDelay: 0.4, shotSpeed: 190, range: 0.55,
      speed: 84, shots: 1, spread: 0.18, homing: false, pierce: false, shotSize: 1,
      dodge: 0, shield: false, luck: 0, dashCd: 0.7, dashTime: 0.16, dashSpeed: 290, iframes: 0,
      specialRate: 1, crit: 0, vamp: 0, echo: 0, dashNova: false,
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
      this.vx = lerp(this.vx, mv.x * s.speed, k);
      this.vy = lerp(this.vy, mv.y * s.speed, k);
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
    if (Input.pressed('special')) {
      if (this.special >= 100) {
        this.special = 0;
        this.nova(18, 1.1, true);
        g.clearEnemyBullets();
        g.shockwave(this.x, this.y, 60, 12 + g.floorNum * 4);
        g.shake = Math.max(g.shake, 6);
        g.flash = 0.25;
        Sound.play('special');
      } else {
        g.floatText(this.x, this.y - 22, 'PAS CHARGÉ', '#8a8290');
      }
    }

    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].t -= dt;
      if (this.ghosts[i].t <= 0) this.ghosts.splice(i, 1);
    }
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
    if (this.face === 'down' && this.blinkT < 0) return 'claude_blink';
    const moving = Math.hypot(this.vx, this.vy) > 10;
    const f = moving ? Math.floor(this.walkT * 10) % 2 : 0;
    return `claude_${this.face}_${f}`;
  }

  draw(ctx) {
    for (const gh of this.ghosts) {
      drawSpr(ctx, gh.spr, gh.x - 10, gh.y - 12, { tint: '#ffb080', alpha: gh.t * 2 });
    }
    drawShadow(ctx, this.x, this.y + 3, 8, 2);
    // Clignote pendant l'invulnérabilité après un coup (pas pendant le dash)
    if (this.inv > 0 && this.dashT <= 0 && !this.dashIframe && Math.floor(this.inv * 16) % 2 === 0) return;
    if (this.dashT <= 0 && this.inv <= 0) this.dashIframe = false;
    const bob = this.holdT > 0 ? 0 : (Math.hypot(this.vx, this.vy) > 10 ? 0 : Math.round(Math.sin(this.animT * 3) * 0.6));
    if (this.holdT > 0) {
      drawSpr(ctx, 'claude_down_0', this.x - 10, this.y - 12);
      drawSprC(ctx, ITEMS[this.holdItem].icon, this.x, this.y - 20);
    } else {
      drawSpr(ctx, this.spriteName(), this.x - 10, this.y - 12 + bob);
    }
    if (this.shieldUp) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(this.animT * 5) * 0.1;
      ctx.strokeStyle = '#7fe8f0';
      ctx.beginPath();
      ctx.arc(Math.round(this.x) + 0.5, Math.round(this.y - 4) + 0.5, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
