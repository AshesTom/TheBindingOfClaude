// Gore façon Rebirth : grandes éclaboussures irrégulières qui restent au sol,
// morceaux de chair qui rebondissent, éclatement des larmes, fumée d'apparition.

// Formes d'éclaboussure (blanches, teintées au dessin)
function paintSplatShape(size, seed) {
  const R = RNG(seed * 31 + size);
  const n = size * 2 + 12;
  const c = mkCanvas(n, n);
  const p = new Pix(c.getContext('2d'));
  const cx = n / 2;
  const cy = n / 2;
  // flaque centrale faite de plusieurs blobs
  for (let i = 0; i < 5; i++) {
    const a = R() * TAU;
    const d = R() * size * 0.35;
    p.ell(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, size * R.range(0.35, 0.6), size * R.range(0.25, 0.42), '#ffffff');
  }
  // traînées et gouttes projetées
  for (let i = 0; i < 7 + size; i++) {
    const a = R() * TAU;
    const d = size * R.range(0.5, 1.05);
    const x = cx + Math.cos(a) * d;
    const y = cy + Math.sin(a) * d * 0.65;
    p.circ(x, y, R.range(0.6, 1.8), '#ffffff');
    if (R() < 0.5) p.line(cx + Math.cos(a) * size * 0.4, cy + Math.sin(a) * size * 0.28, x, y, '#ffffff');
  }
  return c;
}
const SPLATS = [];
for (let s = 0; s < 3; s++) for (let v = 0; v < 4; v++) SPLATS.push({ size: [5, 9, 14][s], seed: v + s * 10, c: null });

function splatSprite(sizeIdx, v) {
  const e = SPLATS[sizeIdx * 4 + (v % 4)];
  if (!e.c) e.c = paintSplatShape(e.size, e.seed);
  return e.c;
}

// Tache de sang persistante au sol (taille 0 : petite, 1 : moyenne, 2 : grande)
function bloodSplat(x, y, sizeIdx, color) {
  if (!G || !G.room) return;
  const c = tinted(splatSprite(sizeIdx, randInt(0, 3)), color);
  const g = G.room.dg;
  g.globalAlpha = 0.85;
  g.drawImage(c, Math.round(x - c.width / 2), Math.round(y - c.height / 2));
  // reflet plus sombre au centre
  g.globalAlpha = 0.35;
  const dk = tinted(splatSprite(Math.max(0, sizeIdx - 1), randInt(0, 3)), shade(color, -0.45));
  g.drawImage(dk, Math.round(x - dk.width / 2), Math.round(y - dk.height / 2));
  g.globalAlpha = 1;
}

// Morceaux de chair (gibs) : tombent, rebondissent et laissent une petite tache
function gibs(x, y, z, color, n = 5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const sp = rand(30, 110);
    Particles.add({
      kind: 'gib', x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7, vz: rand(60, 140),
      color: Math.random() < 0.3 ? '#e0c0a8' : color, size: randInt(2, 3), life: 3, bounces: 1,
    });
  }
}

// Mort d'un ennemi façon Isaac : jet de sang, morceaux, grande flaque
function goreDeath(x, y, h, color, big = false) {
  Particles.burst(x, y - h * 0.4, [color, shade(color, 0.25), shade(color, -0.2)], big ? 22 : 12, { max: big ? 130 : 95 });
  gibs(x, y, h * 0.4, shade(color, 0.1), big ? 9 : 4);
  bloodSplat(x, y, big ? 2 : 1, color);
  Particles.add({ kind: 'pop', x, y: y - h * 0.4, color, size: big ? 16 : 9, life: 0.22 });
}

// Fumée d'apparition (les ennemis surgissent dans un nuage, comme dans Rebirth)
function spawnPoof(x, y) {
  Particles.puff(x, y - 4, '#d8d0c8', 7, { spread: 26, smin: 3, smax: 7, life: 0.6 });
}
