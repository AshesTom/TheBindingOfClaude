// Ennemis communs : bugs, mouches à tokens, slimes surajustés, spambots, captchas, hallucinations.

class Enemy {
  constructor(g, x, y) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.r = 6;
    this.hw = 5;
    this.hh = 4;
    this.hp = this.maxHp = 10;
    this.flash = 0;
    this.spawnT = 0.6;
    this.dead = false;
    this.flying = false;
    this.kx = 0;
    this.ky = 0;
    this.kb = 1;
    this.t = Math.random() * 10;
    this.contact = 1;
    this.boss = false;
    this.invuln = false;
    this.alpha = 1;
  }

  setHp(h) {
    const m = (1 + (this.g.floorNum - 1) * 0.5) * (1 + (this.g.heat || 0) * 0.15);
    this.hp = this.maxHp = h * m;
  }

  update(dt) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.spawnT > 0) {
      this.spawnT -= dt;
      return;
    }
    if (this.kx || this.ky) {
      this.move(this.kx * dt, this.ky * dt);
      const f = Math.pow(0.002, dt);
      this.kx *= f;
      this.ky *= f;
      if (Math.abs(this.kx) < 2) this.kx = 0;
      if (Math.abs(this.ky) < 2) this.ky = 0;
    }
    const p = this.g.player;
    if (this.contact && !this.invuln && dist(this.x, this.y, p.x, p.y) < this.r + 4) this.g.hurtPlayer(this.contact, this);
    this.ai(dt);
  }

  ai() {}

  move(dx, dy) {
    return this.g.moveEntity(this, dx, dy, this.hw, this.hh, this.flying ? 'fly' : 'ground');
  }

  hurt(dmg, kx = 0, ky = 0) {
    if (this.dead || this.spawnT > 0 || this.invuln) return false;
    this.hp -= dmg;
    this.flash = 0.08;
    this.kx += kx * this.kb;
    this.ky += ky * this.kb;
    this.g.onEnemyHurt(this, dmg);
    if (this.hp <= 0) {
      this.dead = true;
      this.onDeath();
      this.g.onEnemyKilled(this);
    }
    return true;
  }

  onDeath() {}

  shootAt(speed, kind = 'eb', spread = 0, count = 1, o = {}) {
    const p = this.g.player;
    const base = Math.atan2(p.y - this.y, p.x - this.x);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      this.g.ebullets.push(new EBullet(this.g, this.x, this.y - 2, Math.cos(a) * speed, Math.sin(a) * speed, kind, Object.assign({ owner: this }, o)));
    }
    Sound.play('ebullet');
  }

  ring(n, speed, offset = 0, kind = 'eb', o = {}) {
    for (let i = 0; i < n; i++) {
      const a = offset + (i / n) * Math.PI * 2;
      this.g.ebullets.push(new EBullet(this.g, this.x, this.y - 2, Math.cos(a) * speed, Math.sin(a) * speed, kind, Object.assign({ owner: this }, o)));
    }
    Sound.play('ebullet');
  }

  // Dessin générique d'un sprite avec apparition "matérialisation".
  drawSprite(ctx, name, ox = 0, oy = 0, o = {}) {
    const s = SPR[name];
    if (this.spawnT > 0) {
      const k = 1 - this.spawnT / 0.6;
      ctx.save();
      ctx.globalAlpha = 0.3 + k * 0.7;
      fillEllipse(ctx, this.x, this.y + 2, 8 * (1 - k) + 2, 3 * (1 - k) + 1, '#a86ae8');
      ctx.restore();
      if (Math.floor(this.spawnT * 20) % 2) return;
    }
    drawSpr(ctx, name, this.x - Math.floor(s.w / 2) + ox, this.y - s.h + 4 + oy, {
      flash: this.flash > 0, alpha: this.alpha, flip: o.flip,
    });
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y + 3, this.r, 2);
    this.drawSelf(ctx);
  }

  drawSelf() {}
}

// Bug : fonce vers Claude en contournant les obstacles.
class Bug extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'UN BUG';
    this.setHp(9);
    this.speed = 32 + g.floorNum * 5;
    this.variant = g.floorNum === 1 ? 'bug' : g.floorNum === 2 ? 'bug2' : 'bug3';
  }

  ai(dt) {
    const d = this.g.pathDir(this);
    const wob = Math.sin(this.t * 7) * 0.35;
    const burst = Math.sin(this.t * 1.7) > 0.7 ? 1.8 : 1;
    this.move((d.x - d.y * wob) * this.speed * burst * dt, (d.y + d.x * wob) * this.speed * burst * dt);
  }

  drawSelf(ctx) {
    this.drawSprite(ctx, this.variant + (Math.floor(this.t * 8) % 2 ? '_a' : '_b'));
  }
}

// Mouche à tokens : volante, erratique.
class Fly extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'UNE MOUCHE À TOKENS';
    this.setHp(4);
    this.flying = true;
    this.r = 4;
    this.hw = 3;
    this.hh = 3;
    this.kb = 1.6;
    this.vx = 0;
    this.vy = 0;
    this.speed = 38 + g.floorNum * 4;
  }

  ai(dt) {
    const p = this.g.player;
    const d = norm(p.x - this.x, p.y - this.y);
    const jx = Math.sin(this.t * 5.3) * 0.9;
    const jy = Math.cos(this.t * 4.1) * 0.9;
    const k = Math.min(1, dt * 3);
    this.vx = lerp(this.vx, (d.x + jx) * this.speed, k);
    this.vy = lerp(this.vy, (d.y + jy) * this.speed, k);
    this.move(this.vx * dt, this.vy * dt);
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y + 6, 3, 1);
    this.drawSprite(ctx, Math.floor(this.t * 20) % 2 ? 'fly_a' : 'fly_b', 0, -2);
  }
}

// Slime "surajusté" : bondit, se divise en deux.
class Slime extends Enemy {
  constructor(g, x, y, small = false) {
    super(g, x, y);
    this.label = 'UN SLIME SURAJUSTÉ';
    this.small = small;
    this.setHp(small ? 5 : 14);
    this.r = small ? 4 : 6;
    this.hw = small ? 3 : 5;
    this.hh = small ? 3 : 4;
    this.state = 'wait';
    this.st = rand(0.5, 1.2);
    this.z = 0;
    this.dir = { x: 0, y: 0 };
    this.variant = g.floorNum >= 2 ? 'slime2' : 'slime';
    if (small) this.spawnT = 0.15;
  }

  ai(dt) {
    this.st -= dt;
    if (this.state === 'wait') {
      this.z = 0;
      if (this.st <= 0) {
        this.state = 'hop';
        this.st = 0.4;
        this.dir = this.g.pathDir(this);
      }
    } else {
      const sp = this.small ? 95 : 80;
      this.move(this.dir.x * sp * dt, this.dir.y * sp * dt);
      this.z = Math.sin((1 - this.st / 0.4) * Math.PI) * 8;
      if (this.st <= 0) {
        this.state = 'wait';
        this.st = rand(0.7, 1.3);
        if (!this.small && this.g.floorNum >= 3) this.ring(4, 60, Math.PI / 4);
      }
    }
  }

  onDeath() {
    if (!this.small) {
      for (const s of [-1, 1]) {
        const e = new Slime(this.g, this.x + s * 5, this.y, true);
        e.kx = s * 80;
        this.g.spawnQueue.push(e);
      }
    }
  }

  drawSelf(ctx) {
    const name = this.small ? this.variant + '_s' : this.variant;
    const squash = this.state === 'wait' && this.st < 0.2 ? 1 : 0;
    this.drawSprite(ctx, name, 0, -Math.round(this.z) + squash);
  }
}

// Spambot : garde ses distances et tire.
class Spambot extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'UN SPAMBOT';
    this.setHp(11);
    this.cd = rand(1, 2);
    this.speed = 30;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
  }

  ai(dt) {
    const p = this.g.player;
    const d = dist(this.x, this.y, p.x, p.y);
    const n = norm(p.x - this.x, p.y - this.y);
    let mx = 0;
    let my = 0;
    if (d < 55) { mx = -n.x; my = -n.y; }
    else if (d > 95) { const pd = this.g.pathDir(this); mx = pd.x; my = pd.y; }
    else { mx = -n.y * this.strafe; my = n.x * this.strafe; }
    const hit = this.move(mx * this.speed * dt, my * this.speed * dt);
    if (hit.x || hit.y) this.strafe *= -1;
    this.cd -= dt;
    if (this.cd <= 0) {
      this.cd = rand(1.6, 2.2);
      if (this.g.floorNum >= 3) this.shootAt(95, 'eb', 0.25, 3);
      else this.shootAt(90);
    }
  }

  drawSelf(ctx) {
    const firing = this.cd < 0.3;
    this.drawSprite(ctx, firing ? 'spambot_fire' : 'spambot', 0, Math.round(Math.sin(this.t * 6)));
  }
}

// Captcha : tourelle immobile, tire en croix.
class Captcha extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'UN CAPTCHA';
    this.setHp(16);
    this.kb = 0;
    this.r = 7;
    this.cd = rand(1, 2.4);
    this.diag = false;
  }

  ai(dt) {
    this.cd -= dt;
    if (this.cd <= 0) {
      this.cd = 2.3;
      const n = this.g.floorNum >= 3 ? 8 : 4;
      this.ring(n, 80, this.diag ? Math.PI / 4 : 0);
      this.diag = !this.diag;
    }
  }

  drawSelf(ctx) {
    this.drawSprite(ctx, this.cd < 0.35 ? 'captcha_fire' : 'captcha');
  }
}

// Hallucination : fantôme qui se téléporte et tire en anneau.
class Ghost extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'UNE HALLUCINATION';
    this.setHp(13);
    this.flying = true;
    this.r = 6;
    this.state = 'drift';
    this.st = rand(2, 3.5);
    this.kb = 0.5;
  }

  ai(dt) {
    const g = this.g;
    const p = g.player;
    this.st -= dt;
    if (this.state === 'drift') {
      const n = norm(p.x - this.x, p.y - this.y);
      const w = Math.sin(this.t * 2) * 0.8;
      this.move((n.x - n.y * w) * 24 * dt, (n.y + n.x * w) * 24 * dt);
      this.alpha = 0.85;
      if (this.st <= 0) { this.state = 'fadeout'; this.st = 0.4; this.invuln = true; }
    } else if (this.state === 'fadeout') {
      this.alpha = Math.max(0.05, this.st / 0.4);
      if (this.st <= 0) {
        const pos = g.randomFreeSpot(p.x, p.y, 45, 80);
        this.x = pos.x;
        this.y = pos.y;
        this.state = 'fadein';
        this.st = 0.4;
      }
    } else if (this.state === 'fadein') {
      this.alpha = 1 - this.st / 0.4;
      if (this.st <= 0) {
        this.invuln = false;
        this.state = 'drift';
        this.st = rand(2.2, 3.2);
        this.ring(g.floorNum >= 3 ? 8 : 6, 70, this.t, 'eb_purple', { ghost: true });
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha * 0.35;
    fillEllipse(ctx, this.x, this.y + 6, 5, 1, '#000');
    ctx.restore();
    this.drawSprite(ctx, Math.floor(this.t * 4) % 2 ? 'ghost' : 'ghost_b', 0, Math.round(Math.sin(this.t * 3) * 2) - 2);
  }
}

// Mini-trombone invoqué par le boss final.
class MiniClip extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'UN TROMBONE';
    this.setHp(3);
    this.flying = true;
    this.r = 4;
    this.hw = 3;
    this.hh = 3;
    this.kb = 1.5;
    this.vx = 0;
    this.vy = 0;
    this.spawnT = 0.3;
  }

  ai(dt) {
    const p = this.g.player;
    const d = norm(p.x - this.x, p.y - this.y);
    const k = Math.min(1, dt * 2);
    this.vx = lerp(this.vx, (d.x + Math.sin(this.t * 6) * 0.6) * 55, k);
    this.vy = lerp(this.vy, (d.y + Math.cos(this.t * 5) * 0.6) * 55, k);
    this.move(this.vx * dt, this.vy * dt);
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y + 6, 3, 1);
    if (this.spawnT > 0 && Math.floor(this.spawnT * 20) % 2) return;
    const c = this.flash > 0 ? '#fff' : '#c8c0c8';
    drawPaperclip(ctx, this.x - 3, this.y - 9 + Math.round(Math.sin(this.t * 8)), 6, 10, 1, c, '#8a8290');
  }
}

// Prompt injecteur : zombie qui s'énerve quand on le touche.
class Injector extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'UN PROMPT INJECTEUR';
    this.setHp(13);
    this.r = 6;
    this.rageT = 0;
  }

  hurt(dmg, kx, ky) {
    const ok = super.hurt(dmg, kx, ky);
    if (ok && !this.dead) this.rageT = 1.6;
    return ok;
  }

  ai(dt) {
    if (this.rageT > 0) this.rageT -= dt;
    const d = this.g.pathDir(this);
    const sp = this.rageT > 0 ? 62 : 26;
    this.move(d.x * sp * dt, d.y * sp * dt);
  }

  drawSelf(ctx) {
    const f = Math.floor(this.t * (this.rageT > 0 ? 10 : 4)) % 2;
    this.drawSprite(ctx, f ? 'injector_a' : 'injector_b', this.rageT > 0 ? Math.round(Math.sin(this.t * 40)) : 0);
  }
}

// Mannequin d'entraînement du QG : indestructible, affiche les dégâts.
class Dummy extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.label = 'LE MANNEQUIN';
    this.hp = this.maxHp = 1e9;
    this.kb = 0;
    this.contact = 0;
    this.spawnT = 0;
    this.r = 8;
    this.wob = 0;
  }

  hurt(dmg) {
    this.flash = 0.08;
    this.wob = 0.3;
    this.g.floatText(this.x + rand(-5, 5), this.y - 24, dmg.toFixed(1), '#ffffff');
    return true;
  }

  ai(dt) {
    if (this.wob > 0) this.wob -= dt;
  }

  drawSelf(ctx) {
    this.drawSprite(ctx, 'dummy', this.wob > 0 ? Math.round(Math.sin(this.t * 50)) : 0);
  }
}

const ENEMY_TYPES = {
  injector: Injector,
  bug: Bug,
  fly: Fly,
  slime: Slime,
  spambot: Spambot,
  captcha: Captcha,
  ghost: Ghost,
  miniclip: MiniClip,
};
