// Familiers : objets (Sous-Agent, Cache KV) et alliés recrutés au Refuge.

class Familiar {
  constructor(kind, x, y, lvl = 1) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.lvl = lvl;
    this.t = Math.random() * 5;
    this.cd = rand(0.5, 1.5);
    this.r = 6;
    this.h = 10;
    this.z = 0;
    this.dead = false;
    this.blocks = kind === 'orbital' || kind === 'ally_clippy';
    this.idx = G && G.fams ? G.fams.filter((f) => f.follows).length : 0;
    this.follows = ['buddy', 'ally_lama', 'ally_whale', 'ally_hal'].includes(kind);
    this.ang = Math.random() * TAU;
    this.state = 'idle';
    this.target = null;
    this.flip = false;
  }

  get mult() {
    return [1, 1, 1.5, 2.1][this.lvl] || 1;
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.state = 'idle';
    this.z = 0;
  }

  followPlayer(dt, slot) {
    const p = G.player;
    let tr = p.trail[Math.min(p.trail.length - 1, 10 + slot * 9)] || [p.x, p.y];
    // Toujours un peu en retrait de Claude, jamais dessus
    const minD = 16 + slot * 12;
    const d = dist(tr[0], tr[1], p.x, p.y);
    if (d < minD) {
      const side = slot % 2 ? 1 : -1;
      const a = (d > 1 ? Math.atan2(tr[1] - p.y, tr[0] - p.x) : Math.PI / 2 + side * 0.9);
      tr = [p.x + Math.cos(a) * minD, p.y + Math.sin(a) * minD * 0.7];
    }
    const k = 1 - Math.exp(-dt * 8);
    const ox = this.x;
    this.x = lerp(this.x, tr[0], k);
    this.y = lerp(this.y, tr[1], k);
    if (Math.abs(this.x - ox) > 0.05) this.flip = this.x < ox;
  }

  update(dt) {
    this.t += dt;
    this.cd -= dt;
    const p = G.player;
    if (!p) return;
    const slot = G.fams.filter((f) => f.follows).indexOf(this);
    const combat = G.enemies.some((e) => !e.dead && e.spawning <= 0);
    switch (this.kind) {
      case 'buddy':
      case 'ally_lama': {
        this.followPlayer(dt, slot);
        if (p.shootDirNow && this.cd <= 0) {
          const d = DIRS[p.shootDirNow];
          const sp = 170;
          const dmg = this.kind === 'buddy' ? 3.5 : 3 * this.mult;
          G.tears.push(new Tear(this.x, this.y - 2, d.dx * sp, d.dy * sp, { dmg, range: 140, z: 7, color: this.kind === 'buddy' ? 'tearO' : 'tearB' }));
          this.cd = this.kind === 'buddy' ? 0.7 : 1.1 / (0.8 + this.lvl * 0.2);
        }
        break;
      }
      case 'orbital':
      case 'ally_clippy': {
        const rad = this.kind === 'orbital' ? 22 : 30;
        this.ang += dt * (this.kind === 'orbital' ? 2.6 : -1.8);
        this.x = p.x + Math.cos(this.ang) * rad;
        this.y = p.y - 4 + Math.sin(this.ang) * rad * 0.8;
        for (const e of G.enemies) {
          if (e.dead || e.spawning > 0) continue;
          if (dist(this.x, this.y, e.x, e.y - e.h * 0.4) < e.r + this.r && this.cd <= 0) {
            e.hit(this.kind === 'orbital' ? 3 : 4 * this.mult, {});
            this.cd = 0.25;
          }
        }
        if (this.kind === 'ally_clippy' && combat && this.cd <= -1.6 / this.mult) {
          const e = G.nearestEnemy(this.x, this.y, 400);
          if (e) {
            const a = angTo(this.x, this.y, e.x, e.y - 6);
            G.tears.push(new Tear(this.x, this.y, Math.cos(a) * 180, Math.sin(a) * 180, { dmg: 4 * this.mult, range: 220, z: 8, color: 'tearB', flags: { pierce: true } }));
            this.cd = 0;
          }
        }
        break;
      }
      case 'ally_chaton': {
        if (this.state === 'leap') {
          this.lt += dt;
          const k = clamp(this.lt / 0.45, 0, 1);
          this.x = lerp(this.lx0, this.lx1, k);
          this.y = lerp(this.ly0, this.ly1, k);
          this.z = Math.sin(k * Math.PI) * 18;
          if (k >= 1) {
            this.state = 'idle';
            this.z = 0;
            this.cd = 0.5;
            Sound.play('hit');
            for (const e of G.enemies) {
              if (!e.dead && e.spawning <= 0 && dist(this.x, this.y, e.x, e.y) < e.r + 14) e.hit(9 * this.mult, {});
            }
            Particles.puff(this.x, this.y, '#c8b8a0', 4);
          }
          break;
        }
        const e = combat ? G.nearestEnemy(this.x, this.y, 500) : null;
        if (e && !e.flying) {
          const d = dist(this.x, this.y, e.x, e.y);
          if (d < 70 && this.cd <= 0) {
            this.state = 'leap';
            this.lt = 0;
            this.lx0 = this.x; this.ly0 = this.y;
            this.lx1 = e.x; this.ly1 = e.y;
            this.flip = e.x < this.x;
            if (Math.random() < 0.3) Sound.play('meow');
          } else {
            const n = norm(e.x - this.x, e.y - this.y);
            G.room.move(this, n.x * 75 * dt, n.y * 75 * dt);
            this.flip = n.x < 0;
          }
        } else if (e && e.flying && this.cd <= 0 && dist(this.x, this.y, e.x, e.y) < 60) {
          this.state = 'leap';
          this.lt = 0;
          this.lx0 = this.x; this.ly0 = this.y;
          this.lx1 = e.x; this.ly1 = e.y;
        } else {
          const d = dist(this.x, this.y, p.x, p.y);
          if (d > 34) {
            const n = norm(p.x - this.x, p.y - this.y);
            G.room.move(this, n.x * 70 * dt, n.y * 70 * dt);
            this.flip = n.x < 0;
          }
        }
        break;
      }
      case 'ally_whale': {
        this.followPlayer(dt, slot);
        if (combat && this.cd <= 0) {
          const e = G.nearestEnemy(this.x, this.y, 260);
          if (e) {
            const a = angTo(this.x, this.y, e.x, e.y - 6);
            for (const da of [-0.25, 0, 0.25]) {
              G.tears.push(new Tear(this.x, this.y, Math.cos(a + da) * 150, Math.sin(a + da) * 150, { dmg: 2.2 * this.mult, range: 160, z: 6, color: 'tearB' }));
            }
            this.cd = 2.2 / this.mult;
            Sound.play('splat');
          }
        }
        break;
      }
      case 'ally_hal': {
        this.followPlayer(dt, slot);
        this.z = 14 + Math.sin(this.t * 2) * 2;
        if (combat && this.cd <= 0) {
          const e = G.nearestEnemy(this.x, this.y, 400);
          if (e) {
            G.misc.push(new Laser(this.x, this.y - this.z, angTo(this.x, this.y - this.z, e.x, e.y - e.h * 0.4), { friendly: true, dmg: 2.5 * this.mult, warn: 0.35, life: 0.45, w: 3, len: 300, color: '#ff3030' }));
            Sound.play('laser');
            this.cd = 3.6 - this.lvl * 0.5;
          }
        }
        break;
      }
      default:
        break;
    }
  }

  onRoomClear() {
    if (this.kind === 'ally_whale' && Math.random() < 0.2 + this.lvl * 0.1) {
      G.pickups.push(Pickup.pop('coin', this.x, this.y));
      Particles.text(this.x, this.y - 16, 'Low cost !', '#a0e0ff');
    }
  }

  draw(ctx) {
    const f = Math.floor(this.t * 4) % 2;
    let s = null;
    let yo = 0;
    switch (this.kind) {
      case 'buddy': s = 'buddy_' + f; break;
      case 'orbital': s = 'orbital'; yo = -6; break;
      case 'ally_lama': s = 'lamaMini_' + f; break;
      case 'ally_clippy': s = 'clippyMini_' + f; yo = -4; break;
      case 'ally_chaton': s = 'chatonMini_' + (this.state === 'leap' ? 1 : f); break;
      case 'ally_whale': s = 'whaleMini_' + f; yo = -6 + Math.sin(this.t * 3) * 2; break;
      case 'ally_hal': s = 'halMini_' + f; break;
      default: return;
    }
    drawShadow(ctx, this.x, this.y, 5, 2, 0.3);
    drawAt(ctx, s, this.x, this.y + 1 + yo - this.z, { flip: this.flip });
  }
}
