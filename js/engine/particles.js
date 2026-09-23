// Système de particules à pool fixe : tout est préalloué (tableaux typés),
// rien n'est créé pendant la boucle de jeu. Chaque particule descend sa rampe
// de palette (blanc -> couleur -> sombre) au fil de sa vie, et se dessine calée
// sur la grille de pixels.

const FX_MAX = 768;
const FX_FREE = 0;
const FX_SPARK = 1; // étincelle libre, freinée
const FX_SPIRAL = 2; // tourne en spirale vers une cible (charge)
const FX_EMBER = 3; // braise qui monte

class FxPool {
  constructor(n = FX_MAX) {
    this.n = n;
    this.kind = new Uint8Array(n);
    this.ramp = new Uint8Array(n);
    this.size = new Uint8Array(n);
    this.x = new Float32Array(n);
    this.y = new Float32Array(n);
    this.vx = new Float32Array(n);
    this.vy = new Float32Array(n);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n);
    this.ang = new Float32Array(n); // spirale : angle
    this.rad = new Float32Array(n); // spirale : rayon
    this.tx = new Float32Array(n);
    this.ty = new Float32Array(n);
    this.cursor = 0;
    this.alive = 0;
  }

  clear() {
    this.kind.fill(FX_FREE);
    this.alive = 0;
  }

  // Trouve un emplacement libre (ou recycle le plus ancien).
  slot() {
    const n = this.n;
    for (let k = 0; k < n; k++) {
      const i = (this.cursor + k) % n;
      if (this.kind[i] === FX_FREE) {
        this.cursor = (i + 1) % n;
        this.alive++;
        return i;
      }
    }
    const i = this.cursor;
    this.cursor = (i + 1) % n;
    return i;
  }

  spark(x, y, vx, vy, life, ramp, size = 1) {
    const i = this.slot();
    this.kind[i] = FX_SPARK;
    this.x[i] = x; this.y[i] = y;
    this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = life; this.max[i] = life;
    this.ramp[i] = ramp; this.size[i] = size;
    return i;
  }

  // Étincelle qui tourne autour de (tx, ty) en se rapprochant.
  spiral(tx, ty, r, ang, life, ramp, size = 1) {
    const i = this.slot();
    this.kind[i] = FX_SPIRAL;
    this.tx[i] = tx; this.ty[i] = ty;
    this.rad[i] = r; this.ang[i] = ang;
    this.x[i] = tx + Math.cos(ang) * r;
    this.y[i] = ty + Math.sin(ang) * r;
    this.life[i] = life; this.max[i] = life;
    this.ramp[i] = ramp; this.size[i] = size;
    return i;
  }

  ember(x, y, life, ramp) {
    const i = this.slot();
    this.kind[i] = FX_EMBER;
    this.x[i] = x; this.y[i] = y;
    this.vx[i] = (Math.random() - 0.5) * 8; this.vy[i] = -12 - Math.random() * 14;
    this.life[i] = life; this.max[i] = life;
    this.ramp[i] = ramp; this.size[i] = 1;
    return i;
  }

  burst(x, y, n, color, speed = 60, life = 0.4) {
    const ramp = rampFor(color);
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.spark(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.5), ramp, Math.random() < 0.3 ? 2 : 1);
    }
  }

  // Couronne d'étincelles qui convergent (télégraphie une attaque / une charge).
  converge(tx, ty, n, color, r = 18, life = 0.4) {
    const ramp = rampFor(color);
    for (let k = 0; k < n; k++) {
      this.spiral(tx, ty, r * (0.7 + Math.random() * 0.5), Math.random() * Math.PI * 2, life * (0.7 + Math.random() * 0.3), ramp);
    }
  }

  // Déplace la cible des spirales vivantes (elles suivent le lanceur).
  retarget(ox, oy, nx, ny) {
    for (let i = 0; i < this.n; i++) {
      if (this.kind[i] === FX_SPIRAL && Math.abs(this.tx[i] - ox) < 0.01 && Math.abs(this.ty[i] - oy) < 0.01) {
        this.tx[i] = nx;
        this.ty[i] = ny;
      }
    }
  }

  update(dt) {
    const drag = Math.pow(0.05, dt);
    for (let i = 0; i < this.n; i++) {
      const k = this.kind[i];
      if (k === FX_FREE) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.kind[i] = FX_FREE;
        this.alive--;
        continue;
      }
      if (k === FX_SPARK) {
        this.x[i] += this.vx[i] * dt;
        this.y[i] += this.vy[i] * dt;
        this.vx[i] *= drag;
        this.vy[i] *= drag;
      } else if (k === FX_SPIRAL) {
        const f = this.life[i] / this.max[i];
        this.ang[i] += dt * (6 + (1 - f) * 10);
        const r = this.rad[i] * f;
        this.x[i] = this.tx[i] + Math.cos(this.ang[i]) * r;
        this.y[i] = this.ty[i] + Math.sin(this.ang[i]) * r * 0.8;
      } else if (k === FX_EMBER) {
        this.x[i] += this.vx[i] * dt + Math.sin(this.life[i] * 12) * 0.1;
        this.y[i] += this.vy[i] * dt;
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.n; i++) {
      const k = this.kind[i];
      if (k === FX_FREE) continue;
      const ramp = RAMPS[this.ramp[i]];
      // Âge -> index dans la rampe (blanc au début, sombre à la fin)
      const age = 1 - this.life[i] / this.max[i];
      const ci = Math.min(ramp.length - 1, (age * ramp.length) | 0);
      ctx.fillStyle = ramp[ci];
      const s = this.size[i];
      ctx.fillRect(Math.round(this.x[i]), Math.round(this.y[i]), s, s);
    }
  }
}
