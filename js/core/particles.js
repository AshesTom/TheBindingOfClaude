// Particules : gouttes (qui retombent et tachent le sol), fumées, étincelles, ondes.

const Particles = {
  list: [],
  decalTarget: null, // fonction (x, y, color, size) appelée quand une goutte touche le sol

  clear() {
    this.list.length = 0;
  },

  add(p) {
    if (this.list.length > 500) this.list.shift();
    p.t = 0;
    p.z = p.z || 0;
    p.vz = p.vz || 0;
    p.vx = p.vx || 0;
    p.vy = p.vy || 0;
    p.size = p.size || 1;
    p.life = p.life || 0.6;
    this.list.push(p);
    return p;
  },

  // Gerbe de gouttes (sang, huile, étincelles orange de Claude…)
  burst(x, y, color, n = 8, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = rand(o.min || 20, o.max || 90);
      this.add({
        kind: 'drop', x, y, z: o.z !== undefined ? o.z : rand(4, 12),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(40, 110),
        color: Array.isArray(color) ? choice(color) : color, size: choice(o.sizes || [1, 1, 2]),
        life: 2, decal: o.decal !== false,
      });
    }
  },

  puff(x, y, color = '#a89a8a', n = 5, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = rand(5, o.spread || 30);
      this.add({
        kind: 'puff', x: x + Math.cos(a) * 3, y: y + Math.sin(a) * 2, z: rand(0, 6),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rand(4, 18),
        color, size: rand(o.smin || 2, o.smax || 5), life: rand(0.4, o.life || 0.8),
      });
    }
  },

  sparks(x, y, color, n = 6, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = o.angle !== undefined ? o.angle + rand(-0.6, 0.6) : Math.random() * TAU;
      const sp = rand(30, o.speed || 110);
      this.add({
        kind: 'spark', x, y, z: o.z || 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        vz: rand(-10, 30), color: Array.isArray(color) ? choice(color) : color, size: 1, life: rand(0.2, o.life || 0.45),
      });
    }
  },

  ring(x, y, color, r = 30, life = 0.35) {
    this.add({ kind: 'ring', x, y, color, size: r, life });
  },

  text(x, y, str, color = '#fff') {
    this.add({ kind: 'text', x, y, z: 10, vz: 18, str, color, life: 0.9 });
  },

  update(dt) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.t += dt;
      if (p.kind === 'drop') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vz -= 320 * dt;
        p.z += p.vz * dt;
        if (p.z <= 0) {
          if (p.decal && this.decalTarget) this.decalTarget(p.x, p.y, p.color, p.size);
          L.splice(i, 1);
          continue;
        }
      } else if (p.kind === 'puff') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
      } else if (p.kind === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vx *= 0.9;
        p.vy *= 0.9;
      } else if (p.kind === 'text') {
        p.z += p.vz * dt;
        p.vz *= 0.95;
      }
      if (p.t >= p.life) L.splice(i, 1);
    }
  },

  draw(ctx) {
    for (const p of this.list) {
      const k = p.t / p.life;
      if (p.kind === 'drop') {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y - p.z), p.size, p.size);
      } else if (p.kind === 'puff') {
        ctx.save();
        ctx.globalAlpha = (1 - k) * 0.7;
        const r = p.size * (0.6 + k * 0.8);
        drawBlob(ctx, p.x, p.y - p.z, r, p.color);
        ctx.restore();
      } else if (p.kind === 'spark') {
        ctx.fillStyle = k < 0.3 ? '#fff6e0' : p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y - p.z), 1, 1);
      } else if (p.kind === 'ring') {
        ctx.save();
        ctx.globalAlpha = 1 - k;
        drawRing(ctx, p.x, p.y, p.size * (0.3 + k * 0.9), p.color);
        ctx.restore();
      } else if (p.kind === 'text') {
        ctx.save();
        ctx.globalAlpha = 1 - k * k;
        Font.draw(ctx, p.str, p.x, p.y - p.z, p.color, { align: 'center', outline: '#000' });
        ctx.restore();
      }
    }
  },
};

const _blobCache = {};
function drawBlob(ctx, x, y, r, color) {
  r = Math.max(1, Math.round(r));
  const key = r + color;
  let c = _blobCache[key];
  if (!c) {
    c = mkCanvas(r * 2 + 1, r * 2 + 1);
    new Pix(c.getContext('2d')).circ(r + 0.5, r + 0.5, r, color);
    _blobCache[key] = c;
  }
  ctx.drawImage(c, Math.round(x - r), Math.round(y - r));
}

const _ringCache = {};
function drawRing(ctx, x, y, r, color) {
  r = Math.max(2, Math.round(r));
  const key = r + color;
  let c = _ringCache[key];
  if (!c) {
    c = mkCanvas(r * 2 + 3, r * 2 + 3);
    const p = new Pix(c.getContext('2d'));
    p.ring(r + 1.5, r + 1.5, r, color, 2);
    _ringCache[key] = c;
  }
  ctx.drawImage(c, Math.round(x - r - 1), Math.round(y - r - 1));
}
