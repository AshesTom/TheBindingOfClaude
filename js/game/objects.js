// Projectiles, ramassables, piédestaux et familiers.

class Tear {
  constructor(g, x, y, vx, vy, o) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.dmg = o.dmg;
    this.life = o.life;
    this.size = o.size || 1;
    this.homing = !!o.homing;
    this.pierce = !!o.pierce;
    this.sprite = o.sprite || (this.size > 1 ? 'tear_big' : 'tear');
    this.r = this.size > 1 ? 4 : 3;
    this.hit = new Set();
    this.dead = false;
    this.speed = Math.hypot(vx, vy);
  }

  update(dt) {
    const g = this.g;
    this.life -= dt;
    if (this.life <= 0) return this.pop();
    if (this.homing) {
      let best = null;
      let bd = 110;
      for (const e of g.enemies) {
        if (e.dead || e.spawnT > 0 || e.invuln) continue;
        const d = dist(this.x, this.y, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      if (best) {
        const n = norm(best.x - this.x, best.y - this.y);
        const k = Math.min(1, dt * 7);
        this.vx = lerp(this.vx, n.x * this.speed, k);
        this.vy = lerp(this.vy, n.y * this.speed, k);
        const nn = norm(this.vx, this.vy);
        this.vx = nn.x * this.speed;
        this.vy = nn.y * this.speed;
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const tx = Math.floor(this.x / TILE);
    const ty = Math.floor(this.y / TILE);
    const t = g.tileAt(tx, ty);
    if (t === 1 || t === 2) return this.pop();
    if (t === 3) {
      g.damageTile(tx, ty);
      return this.pop();
    }
    for (const e of g.enemies) {
      if (e.dead || e.spawnT > 0 || this.hit.has(e)) continue;
      if (dist(this.x, this.y, e.x, e.y) < e.r + this.r) {
        g.hitEnemy(e, this);
        if (!this.pierce) return this.pop();
        this.hit.add(e);
      }
    }
  }

  pop() {
    this.dead = true;
    this.g.burst(this.x, this.y - 4, 4, this.sprite === 'tear_blue' ? '#7fe8f0' : '#f2a88a', 40, 0.25);
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y + 3, 2, 1);
    drawSprC(ctx, this.sprite, this.x, this.y - 4);
  }
}

class EBullet {
  constructor(g, x, y, vx, vy, kind = 'eb', o = {}) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.kind = kind;
    this.r = o.r || 3;
    this.life = o.life || 6;
    this.accel = o.accel || 0;
    this.curve = o.curve || 0;
    this.ghost = !!o.ghost;
    this.delay = o.delay || 0;
    this.dmg = o.dmg || 1;
    this.owner = o.owner || null;
    this.dead = false;
  }

  update(dt) {
    if (this.delay > 0) { this.delay -= dt; return; }
    const g = this.g;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }
    if (this.curve) {
      const a = this.curve * dt;
      const c = Math.cos(a);
      const s = Math.sin(a);
      const vx = this.vx * c - this.vy * s;
      this.vy = this.vx * s + this.vy * c;
      this.vx = vx;
    }
    if (this.accel) {
      const k = 1 + this.accel * dt;
      this.vx *= k;
      this.vy *= k;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const t = g.tileAt(Math.floor(this.x / TILE), Math.floor(this.y / TILE));
    if (t === 1 || (!this.ghost && (t === 2 || t === 3))) {
      this.dead = true;
      g.burst(this.x, this.y, 3, '#e8404a', 30, 0.2);
      return;
    }
    const p = g.player;
    if (dist(this.x, this.y, p.x, p.y - 2) < this.r + 4) {
      if (g.hurtPlayer(this.dmg, this)) this.dead = true;
      else if (p.dashT <= 0) this.dead = true;
    }
  }

  draw(ctx) {
    if (this.delay > 0) return;
    drawShadow(ctx, this.x, this.y + 4, 2, 1);
    drawSprC(ctx, this.kind, this.x, this.y - 2);
  }
}

class Pickup {
  constructor(g, type, x, y, vx = 0, vy = 0) {
    this.g = g;
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.z = 0;
    this.vz = vx || vy ? 70 : 0;
    this.t = 0;
    this.dead = false;
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    this.z += this.vz * dt;
    this.vz -= 320 * dt;
    if (this.z < 0) {
      this.z = 0;
      this.vz = Math.abs(this.vz) > 30 ? -this.vz * 0.4 : 0;
    }
    if (this.vx || this.vy) {
      g.moveEntity(this, this.vx * dt, this.vy * dt, 3, 3, 'ground');
      const f = Math.pow(0.05, dt);
      this.vx *= f;
      this.vy *= f;
      if (Math.abs(this.vx) < 1) this.vx = 0;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }
    const p = g.player;
    if (this.t > 0.35 && dist(this.x, this.y, p.x, p.y) < 10) this.collect(p);
  }

  collect(p) {
    const g = this.g;
    switch (this.type) {
      case 'coin':
        p.coins = Math.min(99, p.coins + 1);
        Sound.play('coin');
        g.floatText(this.x, this.y - 10, '+1', '#f8d048');
        break;
      case 'heart':
      case 'halfheart':
        if (p.hp >= p.maxHp) return;
        p.hp = Math.min(p.maxHp, p.hp + (this.type === 'heart' ? 2 : 1));
        Sound.play('heart');
        break;
      case 'key':
        p.keys = Math.min(99, p.keys + 1);
        Sound.play('key');
        break;
      default: break;
    }
    this.dead = true;
    g.burst(this.x, this.y, 6, '#ffffff', 40, 0.3);
  }

  draw(ctx) {
    const bob = this.z;
    drawShadow(ctx, this.x, this.y + 3, 3, 1);
    const name = { coin: 'coin', heart: 'heart_full', halfheart: 'heart_half', key: 'key' }[this.type];
    drawSprC(ctx, name, this.x, this.y - bob - 1);
  }
}

class Pedestal {
  constructor(g, x, y, kind, item, price = 0) {
    this.g = g;
    this.x = x;
    this.y = y;
    this.kind = kind; // 'item' | 'heart' | 'key'
    this.item = item;
    this.price = price;
    this.taken = false;
    this.t = Math.random() * 6;
  }

  update(dt) {
    if (this.taken) return;
    this.t += dt;
    const p = this.g.player;
    if (dist(this.x, this.y, p.x, p.y) < 11) this.g.tryTake(this);
  }

  draw(ctx) {
    if (this.kind === 'item') {
      drawSprC(ctx, 'pedestal', this.x, this.y + 4);
      if (!this.taken) {
        const bob = Math.round(Math.sin(this.t * 3) * 2);
        const glow = 0.25 + Math.sin(this.t * 4) * 0.1;
        ctx.save();
        ctx.globalAlpha = glow;
        fillEllipse(ctx, this.x, this.y - 8 + bob, 9, 9, '#f8d048');
        ctx.restore();
        drawSprC(ctx, ITEMS[this.item].icon, this.x, this.y - 8 + bob);
      }
    } else if (!this.taken) {
      drawShadow(ctx, this.x, this.y + 4, 4, 1);
      drawSprC(ctx, this.kind === 'heart' ? 'heart_full' : 'key', this.x, this.y);
    }
    if (!this.taken && this.price > 0) {
      const w = Font.width(String(this.price)) + 9;
      drawSpr(ctx, 'coin', this.x - Math.floor(w / 2), this.y + 11);
      Font.draw(ctx, String(this.price), this.x - Math.floor(w / 2) + 9, this.y + 11, '#fff', { outline: '#1a1016' });
    }
  }
}

// Mini-Claude qui suit le joueur et tire dans la même direction.
class SubAgent {
  constructor(g, index = 0) {
    this.g = g;
    this.index = index;
    this.x = g.player.x;
    this.y = g.player.y;
    this.cd = 0;
    this.t = 0;
  }

  reset() {
    this.x = this.g.player.x;
    this.y = this.g.player.y;
  }

  update(dt) {
    const p = this.g.player;
    this.t += dt;
    const side = this.index % 2 ? 1 : -1;
    const tx = p.x + side * 14;
    const ty = p.y + 8;
    const k = Math.min(1, dt * 5);
    this.x = lerp(this.x, tx, k);
    this.y = lerp(this.y, ty, k);
    this.cd -= dt;
    if (p.shooting && this.cd <= 0) {
      this.cd = 0.55;
      const sp = 170;
      this.g.tears.push(new Tear(this.g, this.x, this.y, p.aim.x * sp, p.aim.y * sp, {
        dmg: 2.5 + this.g.floorNum * 0.5, life: 0.55, sprite: 'tear_blue',
      }));
    }
  }

  draw(ctx) {
    const bob = Math.round(Math.sin(this.t * 6) * 1);
    drawShadow(ctx, this.x, this.y + 4, 4, 1);
    drawSprC(ctx, 'it_subagent', this.x, this.y - 3 + bob);
  }
}

// Orbital "MCP" : tourne autour du joueur, bloque les tirs et blesse au contact.
class Orbital {
  constructor(g, index = 0) {
    this.g = g;
    this.a = index * Math.PI;
    this.x = g.player.x;
    this.y = g.player.y;
    this.hitCd = new Map();
  }

  reset() {}

  update(dt) {
    const g = this.g;
    const p = g.player;
    this.a += dt * 3.2;
    this.x = p.x + Math.cos(this.a) * 20;
    this.y = p.y - 3 + Math.sin(this.a) * 20;
    for (const b of g.ebullets) {
      if (!b.dead && b.delay <= 0 && dist(this.x, this.y, b.x, b.y) < b.r + 5) {
        b.dead = true;
        g.burst(b.x, b.y, 4, '#c8c0c8', 40, 0.2);
      }
    }
    for (const e of g.enemies) {
      if (e.dead || e.spawnT > 0) continue;
      const cd = this.hitCd.get(e) || 0;
      if (cd > 0) { this.hitCd.set(e, cd - dt); continue; }
      if (dist(this.x, this.y, e.x, e.y) < e.r + 5) {
        e.hurt(3 + g.floorNum, 0, 0);
        this.hitCd.set(e, 0.3);
      }
    }
  }

  draw(ctx) {
    drawSprC(ctx, 'it_mcp', this.x, this.y);
  }
}
