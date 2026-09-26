// Entités de base : larmes de Claude, tirs ennemis, bombes, ramassables, piédestaux, trappe…

let G = null; // scène de jeu courante (run ou Refuge)

// ------------------------------------------------------------------ Larmes
class Tear {
  constructor(x, y, vx, vy, o) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.z = o.z !== undefined ? o.z : 10;
    this.z0 = this.z;
    this.dmg = o.dmg;
    this.range = o.range;
    this.traveled = 0;
    this.f = o.flags || {};
    this.color = o.color || (this.f.spectral ? 'tearB' : this.f.slow ? 'tearP' : this.f.explosive ? 'tearR' : 'tear');
    this.size = clamp((this.dmg < 3 ? 1 : this.dmg < 6 ? 2 : this.dmg < 11 ? 3 : 4) + (this.f.big ? 1 : 0), 1, 4);
    this.r = 2 + this.size;
    this.t = 0;
    this.hit = new Set();
    this.dead = false;
    this.friendly = true;
    this.wig = Math.random() * TAU;
    this.knock = o.knock !== undefined ? o.knock : 1;
  }

  update(dt) {
    this.t += dt;
    const sp = Math.hypot(this.vx, this.vy);
    if (this.f.homing) {
      const e = G.nearestEnemy(this.x, this.y, 110);
      if (e) {
        const a = angTo(this.x, this.y, e.x, e.y - 4);
        const cur = Math.atan2(this.vy, this.vx);
        let da = a - cur;
        while (da > Math.PI) da -= TAU;
        while (da < -Math.PI) da += TAU;
        const na = cur + clamp(da, -5 * dt, 5 * dt);
        this.vx = Math.cos(na) * sp;
        this.vy = Math.sin(na) * sp;
      }
    }
    let mx = this.vx * dt;
    let my = this.vy * dt;
    if (this.f.wiggle) {
      const px = -this.vy / sp;
      const py = this.vx / sp;
      const w = Math.cos(this.t * 18 + this.wig) * 2.2;
      mx += px * w;
      my += py * w;
    }
    this.x += mx;
    this.y += my;
    this.traveled += sp * dt;
    const k = this.traveled / this.range;
    if (k > 0.72) this.z = this.z0 * Math.max(0, 1 - (k - 0.72) / 0.28);
    if (k >= 1 || this.z <= 0.3) return this.splash();
    // murs
    if (this.x < FX + 2 || this.x > FX2 - 2 || this.y < FY + 2 || this.y > FY2 - 2) {
      if (this.f.bounce && !this.bounced) {
        this.bounced = true;
        if (this.x < FX + 2 || this.x > FX2 - 2) this.vx *= -1;
        else this.vy *= -1;
        this.x = clamp(this.x, FX + 3, FX2 - 3);
        this.y = clamp(this.y, FY + 3, FY2 - 3);
      } else return this.splash();
    }
    // obstacles
    if (!this.f.spectral && G.room) {
      const gx = toGX(this.x);
      const gy = toGY(this.y);
      const c = G.room.cell(gx, gy);
      if (c && c.t !== 'spikes' && c.t !== 'ember') {
        if (G.room.hitCell(gx, gy, this.dmg)) {
          if (this.f.bounce && !this.bounced) {
            this.bounced = true;
            this.vx *= -1;
            this.vy *= -1;
          } else return this.splash();
        }
      }
    }
    // ennemis
    for (const e of G.enemies) {
      if (e.dead || e.spawning > 0 || this.hit.has(e) || e.untargetable) continue;
      if (Math.abs(e.x - this.x) > e.r + this.r + 8) continue;
      if (dist(this.x, this.y - this.z * 0.3, e.x, e.y - e.h * 0.4) < e.r + this.r) {
        const ok = e.hit(this.dmg, this);
        if (ok === 'block') return this.splash();
        this.hit.add(e);
        if (ok && this.knock) e.push(this.vx / sp, this.vy / sp, 26 * this.knock);
        if (this.f.slow && ok) e.slowT = 2.5;
        if (this.f.explosive) {
          explode(this.x, this.y, { radius: 28, dmg: this.dmg * 1.5, hurtPlayer: false, small: true });
          this.dead = true;
          return;
        }
        if (!this.f.pierce) return this.splash(true);
      }
    }
  }

  splash(hitEnemy) {
    if (this.dead) return;
    this.dead = true;
    if (this.f.explosive && !hitEnemy) explode(this.x, this.y, { radius: 28, dmg: this.dmg * 1.5, hurtPlayer: false, small: true });
    const col = this.color === 'tearB' ? ['#b8d4ff', '#ffffff'] : this.color === 'tearP' ? ['#a8e060', '#e0ffc0'] : this.color === 'tearR' ? ['#ff5a6a', '#ffd0a0'] : ['#ff9a5a', '#ffd0a0', '#fff0d0'];
    Particles.sparks(this.x, this.y - this.z, col, 5, { speed: 60, z: this.z });
    if (G.room) G.room.decal(this.x, this.y, col[0], 1, 0.35);
    if (Math.random() < 0.5) Sound.play('splat');
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y, this.r * 0.8, this.r * 0.35, 0.3);
    const pose = Math.floor(this.t * 12) % 2;
    drawAt(ctx, `${this.color}${this.size}_${pose}`, this.x, this.y - this.z, { ay: 0.5 });
  }
}

// ------------------------------------------------------------ Tirs ennemis
class Bullet {
  constructor(x, y, vx, vy, o = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.style = o.style || 'red';
    this.size = o.size || 3;
    this.r = this.size - 0.5;
    this.z = o.z !== undefined ? o.z : 6;
    this.vz = o.vz || 0;
    this.grav = o.grav || 0;
    this.life = o.life || 4;
    this.t = 0;
    this.accel = o.accel || 0;
    this.curve = o.curve || 0;
    this.dmg = o.dmg || 1;
    this.through = !!o.through;
    this.letter = o.letter || null;
    this.src = o.src || 'un tir';
    this.dead = false;
    this.delay = o.delay || 0;
  }

  update(dt) {
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    const tf = G.timeScaleEnemies !== undefined ? G.timeScaleEnemies : 1;
    dt *= tf;
    this.t += dt;
    if (this.curve) {
      const a = Math.atan2(this.vy, this.vx) + this.curve * dt;
      const sp = Math.hypot(this.vx, this.vy);
      this.vx = Math.cos(a) * sp;
      this.vy = Math.sin(a) * sp;
    }
    if (this.accel) {
      const sp = Math.hypot(this.vx, this.vy);
      const ns = Math.max(10, sp + this.accel * dt);
      this.vx *= ns / sp;
      this.vy *= ns / sp;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.grav) {
      this.vz -= this.grav * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) return this.pop();
    }
    if (this.t > this.life) return this.pop();
    if (this.x < FX - 4 || this.x > FX2 + 4 || this.y < FY - 4 || this.y > FY2 + 4) return this.pop();
    if (!this.through && G.room && this.z < 14) {
      const c = G.room.cell(toGX(this.x), toGY(this.y));
      if (c && c.t !== 'spikes' && c.t !== 'ember' && c.t !== 'wall') return this.pop();
    }
    // Familiers-boucliers
    for (const f of G.fams) {
      if (f.blocks && dist(f.x, f.y - 6, this.x, this.y - this.z) < f.r + this.r) {
        f.onBlock && f.onBlock();
        return this.pop();
      }
    }
    const p = G.player;
    if (p && !p.dead && this.z < 16 && dist(p.x, p.y - 7, this.x, this.y - this.z * 0.5) < this.r + p.hitR) {
      p.hurt(this.dmg, this.src);
      this.pop();
    }
  }

  pop() {
    if (this.dead) return;
    this.dead = true;
    const c = BULLET_STYLES[this.style] ? BULLET_STYLES[this.style][0] : '#d02020';
    Particles.sparks(this.x, this.y - this.z, [c, shade(c, 0.4)], 4, { speed: 40, z: this.z });
    if (G.room && this.style === 'red') G.room.decal(this.x, this.y, '#6a1010', 2, 0.5);
  }

  draw(ctx) {
    if (this.delay > 0) return;
    drawShadow(ctx, this.x, this.y, this.r * 0.9, this.r * 0.4, 0.28);
    if (this.letter) drawAt(ctx, 'letter_' + this.letter, this.x, this.y - this.z, { ay: 0.5 });
    else drawAt(ctx, `bullet_${this.style}_${this.size <= 2 ? 2 : this.size <= 3 ? 3 : this.size <= 4 ? 4 : 6}`, this.x, this.y - this.z, { ay: 0.5 });
  }
}

// Gerbe de tirs en cercle / en éventail
function ring(x, y, n, speed, o = {}, a0 = 0) {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU;
    G.bullets.push(new Bullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, o));
  }
  Sound.play('ebullet');
}
function fan(x, y, ang, n, spread, speed, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = ang + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread);
    G.bullets.push(new Bullet(x, y, Math.cos(a) * speed, Math.sin(a) * speed, o));
  }
  Sound.play('ebullet');
}
function aimAt(x, y, speed, o = {}, spread = 0, n = 1) {
  const p = G.player;
  fan(x, y, angTo(x, y, p.x, p.y - 6), n, spread, speed, o);
}

// ----------------------------------------------------------------- Bombes
class Bomb {
  constructor(x, y, o = {}) {
    this.x = x;
    this.y = y;
    this.t = 0;
    this.fuse = o.fuse || 1.6;
    this.dead = false;
    this.big = !!o.big;
    this.safe = !!o.safe;
    this.r = 6;
  }
  update(dt) {
    this.t += dt;
    if (Math.floor(this.t * 8) !== Math.floor((this.t - dt) * 8)) Sound.play('fuse');
    if (this.t >= this.fuse) {
      this.dead = true;
      explode(this.x, this.y, { radius: this.big ? 60 : 40, dmg: this.big ? 110 : 60, hurtPlayer: !this.safe });
    }
  }
  draw(ctx) {
    const k = this.t / this.fuse;
    const pulse = 1 + Math.sin(this.t * (8 + k * 30)) * 0.08 * (0.5 + k);
    const sc = (this.big ? 1.6 : 1) * pulse;
    drawShadow(ctx, this.x, this.y, 6 * sc, 2.5 * sc);
    drawAt(ctx, 'bomb', this.x, this.y + 1, { sx: sc, sy: sc, tint: k > 0.6 && Math.floor(this.t * 16) % 2 ? '#ff4020' : null, tintA: 0.5 });
    Particles.sparks(this.x + 3 * sc, this.y - 15 * sc, ['#ffd040', '#ff8020'], 1, { speed: 20, z: 0, life: 0.2 });
  }
}

function explode(x, y, o = {}) {
  const radius = o.radius || 40;
  const dmg = o.dmg || 60;
  Sound.play('explode');
  G.shake(o.small ? 3 : 7);
  if (!o.small) G.flashT = 0.08;
  Particles.ring(x, y, '#fff0c0', radius, 0.3);
  Particles.puff(x, y, '#5a4a40', o.small ? 5 : 12, { spread: radius, smin: 3, smax: 8, life: 1 });
  Particles.sparks(x, y, ['#ffd040', '#ff8020', '#fff6c0'], o.small ? 8 : 20, { speed: 160, z: 4 });
  if (G.room) {
    G.room.decal(x, y + 2, '#0a0806', Math.round(radius * 0.45), 0.35);
    if (!o.small) G.room.blast(x, y, radius);
  }
  for (const e of G.enemies) {
    if (e.dead || e.spawning > 0) continue;
    if (dist(x, y, e.x, e.y) < radius + e.r) {
      e.hit(dmg, { explosion: true });
      const d = norm(e.x - x, e.y - y);
      e.push(d.x, d.y, 40);
    }
  }
  const p = G.player;
  if (o.hurtPlayer !== false && p && !p.dead && dist(x, y, p.x, p.y) < radius + 4) p.hurt(2, 'sa propre fork bomb');
  for (const k of G.pickups) {
    const d = dist(x, y, k.x, k.y);
    if (d < radius + 20 && d > 0.1) {
      const n = norm(k.x - x, k.y - y);
      k.vx += n.x * 120;
      k.vy += n.y * 120;
      k.vz = 60;
    }
  }
  for (const b of G.misc) if (b instanceof Bomb && b.t < b.fuse - 0.1 && dist(x, y, b.x, b.y) < radius) b.t = b.fuse - 0.1;
  if (G.onExplosion) G.onExplosion(x, y, radius);
}

// ------------------------------------------------------------- Ramassables
const PICKUP_SPR = {
  heart: 'heart', heartHalf: 'heartHalf', soul: 'soul', soulHalf: 'soulHalf',
  bomb: 'bomb', key: 'key', chest: 'chest', goldchest: 'goldchest',
};

class Pickup {
  constructor(type, x, y, o = {}) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.z = o.z !== undefined ? o.z : 0;
    this.vx = o.vx || 0;
    this.vy = o.vy || 0;
    this.vz = o.vz || 0;
    this.price = o.price || 0;
    this.r = 6;
    this.t = Math.random();
    this.dead = false;
    this.opened = false;
    this.delay = o.delay || 0.3;
  }

  static pop(type, x, y, o = {}) {
    const a = Math.random() * TAU;
    const sp = rand(30, 70);
    return new Pickup(type, x, y, Object.assign({ z: 2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rand(60, 100) }, o));
  }

  update(dt) {
    this.t += dt;
    this.delay -= dt;
    if (this.z > 0 || this.vz > 0) {
      this.vz -= 300 * dt;
      this.z += this.vz * dt;
      if (this.z <= 0) {
        this.z = 0;
        if (Math.abs(this.vz) > 40) this.vz = -this.vz * 0.4;
        else this.vz = 0;
      }
    }
    if (this.vx || this.vy) {
      G.room ? G.room.move(this, this.vx * dt, this.vy * dt) : null;
      this.vx *= 0.9;
      this.vy *= 0.9;
      if (Math.abs(this.vx) < 1) this.vx = 0;
      if (Math.abs(this.vy) < 1) this.vy = 0;
    }
    if (this.opened || this.price) {
      if (this.price && !this.opened) this.checkBuy();
      return;
    }
    const p = G.player;
    if (!p || p.dead || this.delay > 0) return;
    if (dist(p.x, p.y - 4, this.x, this.y - this.z) < this.r + 7) this.collect(p);
  }

  checkBuy() {
    const p = G.player;
    if (!p || this.delay > 0) return;
    if (dist(p.x, p.y - 4, this.x, this.y) < this.r + 7) {
      const price = p.priceOf(this.price);
      if (p.coins < price) return;
      if (this.collect(p, true)) {
        p.coins -= price;
        Sound.play('buy');
      }
    }
  }

  collect(p, bought) {
    const t = this.type;
    if (t === 'heart' || t === 'heartHalf') {
      if (p.hearts >= p.maxHearts) return false;
      p.heal(t === 'heart' ? 2 : 1);
      Sound.play('heart');
    } else if (t === 'soul' || t === 'soulHalf') {
      if (p.soul + p.maxHearts >= 24) return false;
      p.soul += t === 'soul' ? 2 : 1;
      Sound.play('soul');
    } else if (t === 'coin') {
      p.coins = Math.min(99, p.coins + 1);
      Sound.play('coin');
    } else if (t === 'bomb') {
      p.bombs = Math.min(99, p.bombs + 1);
      Sound.play('bombpick');
    } else if (t === 'key') {
      p.keys = Math.min(99, p.keys + 1);
      Sound.play('key');
    } else if (t === 'chest' || t === 'goldchest') {
      if (bought) return false;
      if (t === 'goldchest') {
        if (p.keys <= 0) return false;
        p.keys--;
      }
      this.opened = true;
      Sound.play('unlock');
      const n = t === 'goldchest' ? randInt(2, 4) : randInt(1, 3);
      if (t === 'goldchest' && Math.random() < 0.25) {
        G.addPedestal(rollItem('t', G.seen), this.x, this.y + 18);
      } else {
        for (let i = 0; i < n; i++) G.pickups.push(Pickup.pop(choice(['coin', 'coin', 'heart', 'bomb', 'key', 'soulHalf']), this.x, this.y));
      }
      return true;
    }
    Particles.sparks(this.x, this.y - 4, ['#ffffff', '#fff0c0'], 5, { speed: 40 });
    this.dead = true;
    return true;
  }

  draw(ctx, t) {
    const bob = this.price ? Math.sin(this.t * 3) * 1 : 0;
    drawShadow(ctx, this.x, this.y, 5, 2, 0.3);
    let s = PICKUP_SPR[this.type];
    if (this.type === 'coin') s = 'coin_' + (Math.floor(this.t * 8) % 4);
    if (this.opened) s = 'chestOpen';
    drawAt(ctx, s, this.x, this.y - this.z + 1 + bob);
    if (this.price && !this.opened) {
      const p = G.player;
      const pr = p ? p.priceOf(this.price) : this.price;
      Font.draw(ctx, String(pr), this.x - 2, this.y + 5, '#fff', { align: 'center', outline: '#000' });
      drawAt(ctx, 'coin_0', this.x + Font.width(String(pr)) / 2 + 3, this.y + 14, { sx: 0.6, sy: 0.6 });
    }
  }
}

// ------------------------------------------------------------- Piédestal
class Pedestal {
  constructor(item, x, y, o = {}) {
    this.item = item;
    this.x = x;
    this.y = y;
    this.price = o.price || 0;
    this.heartPrice = o.heartPrice || 0;
    this.charge = o.charge;
    this.t = Math.random() * 3;
    this.dead = false;
    this.cool = 0.6;
    this.r = 9;
    this.offer = !!o.offer;
  }
  update(dt) {
    this.t += dt;
    this.cool -= dt;
    const p = G.player;
    if (!this.item || !p || p.dead || this.cool > 0) return;
    const near = dist(p.x, p.y, this.x, this.y + 2) < 13;
    if (this.needLeave) {
      if (!near) this.needLeave = false;
      return;
    }
    if (near) {
      if (this.price) {
        const pr = p.priceOf(this.price);
        if (p.coins < pr) return;
        p.coins -= pr;
        Sound.play('buy');
      }
      if (this.heartPrice) {
        if (!p.payHearts(this.heartPrice)) return;
      }
      const it = this.item;
      const ch = this.charge;
      this.item = null;
      this.price = 0;
      this.heartPrice = 0;
      const old = p.pickItem(it, ch);
      if (old) {
        this.item = old.id;
        this.charge = old.charge;
        this.cool = 0.5;
        this.needLeave = true;
      }
    }
  }
  draw(ctx) {
    drawAt(ctx, this.offer ? 'pedestalOffer' : 'pedestal', this.x, this.y + 7);
    if (!this.item) return;
    const bob = Math.sin(this.t * 3) * 2;
    drawShadow(ctx, this.x, this.y - 3, 6, 2, 0.25);
    drawAt(ctx, 'item_' + this.item, this.x, this.y - 12 + bob);
    const p = G.player;
    if (this.price) {
      const pr = p ? p.priceOf(this.price) : this.price;
      Font.draw(ctx, String(pr), this.x - 3, this.y + 10, '#fff', { align: 'center', outline: '#000' });
      drawAt(ctx, 'coin_0', this.x + Font.width(String(pr)) / 2 + 3, this.y + 19, { sx: 0.6, sy: 0.6 });
    }
    if (this.heartPrice) {
      for (let i = 0; i < this.heartPrice; i++) drawAt(ctx, 'heart', this.x - (this.heartPrice - 1) * 6 + i * 12, this.y + 21, { sx: 0.8, sy: 0.8 });
    }
    if (p && dist(p.x, p.y, this.x, this.y) < 40) {
      const it = ITEMS[this.item];
      Font.draw(ctx, it.name, this.x, this.y - 34, '#fff4e0', { align: 'center', outline: '#1a0d0d' });
    }
  }
}

// ------------------------------------------------------------ Trappe, faisceau
class Trapdoor {
  constructor(x, y, o = {}) {
    this.x = x;
    this.y = y;
    this.t = 0;
    this.dead = false;
    this.beam = !!o.beam;
    this.arm = o.arm !== undefined ? o.arm : 1;
    this.onEnter = o.onEnter;
    this.flat = true;
  }
  update(dt) {
    this.t += dt;
    const p = G.player;
    if (!p || p.dead) return;
    const near = dist(p.x, p.y, this.x, this.y) < 12;
    if (!near) this.arm = Math.min(this.arm, 0);
    if (this.t > 0.8 && near && this.arm <= 0 && !G.leaving) this.onEnter();
  }
  draw(ctx) {
    if (this.beam) {
      const a = 0.5 + Math.sin(this.t * 3) * 0.2;
      drawAt(ctx, 'beam', this.x, this.y + 6, { alpha: a });
      Particles.sparks(this.x + rand(-12, 12), this.y, ['#fff6d0', '#ffe8a0'], 1, { speed: 10, z: rand(0, 40), life: 0.8 });
    } else {
      const k = Math.min(1, this.t * 3);
      drawAt(ctx, 'trapdoor', this.x, this.y + 13, { sx: k, sy: k });
    }
  }
}

// ------------------------------------------------------------- Rayon laser
class Laser {
  constructor(x, y, ang, o = {}) {
    this.x = x;
    this.y = y;
    this.ang = ang;
    this.len = o.len || 400;
    this.w = o.w || 4;
    this.warn = o.warn !== undefined ? o.warn : 0.5;
    this.life = o.life || 0.6;
    this.t = 0;
    this.friendly = !!o.friendly;
    this.dmg = o.dmg || 1;
    this.color = o.color || '#ff3030';
    this.spin = o.spin || 0;
    this.dead = false;
    this.hitSet = new Set();
    this.follow = o.follow || null;
    this.z = o.z || 10;
    this.src = o.src || 'un laser';
  }
  update(dt) {
    this.t += dt;
    if (this.follow) {
      this.x = this.follow.x;
      this.y = this.follow.y - (this.follow.h || 10) * 0.5;
    }
    if (this.t > this.warn) this.ang += this.spin * dt;
    if (this.t > this.warn + this.life) {
      this.dead = true;
      return;
    }
    if (this.t < this.warn) return;
    const dx = Math.cos(this.ang);
    const dy = Math.sin(this.ang);
    const hits = (px, py, r) => {
      const t = (px - this.x) * dx + (py - this.y) * dy;
      if (t < 0 || t > this.len) return false;
      const qx = this.x + dx * t;
      const qy = this.y + dy * t;
      return dist(px, py, qx, qy) < r + this.w / 2;
    };
    if (this.friendly) {
      for (const e of G.enemies) {
        if (e.dead || e.spawning > 0 || this.hitSet.has(e)) continue;
        if (hits(e.x, e.y - e.h * 0.4, e.r)) {
          e.hit(this.dmg, { laser: true });
          this.hitSet.add(e);
        }
      }
      if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) this.hitSet.clear();
    } else {
      const p = G.player;
      if (p && !p.dead && hits(p.x, p.y - 7, p.hitR)) p.hurt(this.dmg, this.src);
    }
  }
  draw(ctx) {
    const dx = Math.cos(this.ang);
    const dy = Math.sin(this.ang);
    ctx.save();
    ctx.lineCap = 'butt';
    if (this.t < this.warn) {
      ctx.globalAlpha = 0.35 + 0.3 * Math.sin(this.t * 40);
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(this.x) + 0.5, Math.round(this.y) + 0.5);
      ctx.lineTo(Math.round(this.x + dx * this.len) + 0.5, Math.round(this.y + dy * this.len) + 0.5);
      ctx.stroke();
    } else {
      const k = 1 - Math.max(0, (this.t - this.warn - this.life + 0.15) / 0.15);
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(1, Math.round(this.w * k));
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + dx * this.len, this.y + dy * this.len);
      ctx.stroke();
      ctx.strokeStyle = '#fff6f0';
      ctx.lineWidth = Math.max(1, Math.round(this.w * 0.4 * k));
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + dx * this.len, this.y + dy * this.len);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------------------------------------------------- PNJ (Refuge et caméos)
class Npc {
  constructor(x, y, o) {
    this.x = x;
    this.y = y;
    this.name = o.name;
    this.sprite = o.sprite; // fonction (t) -> nom de sprite, ou nom fixe
    this.onTalk = o.onTalk;
    this.t = Math.random() * 3;
    this.dead = false;
    this.solidR = o.solidR || 0;
    this.r = o.solidR || 8;
    this.shadow = o.shadow !== undefined ? o.shadow : 10;
    this.talkR = o.talkR || 26;
    this.label = o.label || 'Parler';
    this.hidden = false;
    this.flip = !!o.flip;
    this.yoff = o.yoff || 0;
  }
  update(dt) {
    this.t += dt;
  }
  near(p) {
    return !this.hidden && dist(p.x, p.y, this.x, this.y) < this.talkR;
  }
  draw(ctx) {
    if (this.hidden) return;
    if (this.shadow) drawShadow(ctx, this.x, this.y, this.shadow, this.shadow * 0.35);
    const s = typeof this.sprite === 'function' ? this.sprite(this.t) : this.sprite;
    drawAt(ctx, s, this.x, this.y + 1 + this.yoff, { flip: this.flip });
  }
  drawPrompt(ctx) {
    const s = typeof this.sprite === 'function' ? this.sprite(this.t) : this.sprite;
    const bob = Math.round(Math.sin(this.t * 5));
    const sh = spr(s).height;
    Font.draw(ctx, '[E] ' + this.label, this.x, this.y - sh - 8 + bob + this.yoff, '#fff4e0', { align: 'center', outline: '#1a0d0d' });
  }
}
