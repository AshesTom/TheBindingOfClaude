// Palette maîtresse du jeu : tout ce qui est peint (sprites, sols, décors) y est
// ramené, pour un rendu cohérent de sprite 16 bits.
// Base : DawnBringer 32, complétée par la rampe orange de Claude et quelques tons.

const MASTER_PALETTE = [
  // DawnBringer 32
  '#000000', '#222034', '#45283c', '#663931', '#8f563b', '#df7126', '#d9a066', '#eec39a',
  '#fbf236', '#99e550', '#6abe30', '#37946e', '#4b692f', '#524b24', '#323c39', '#3f3f74',
  '#306082', '#5b6ee1', '#639bff', '#5fcde4', '#cbdbfc', '#ffffff', '#9badb7', '#847e87',
  '#696a6a', '#595652', '#76428a', '#ac3232', '#d95763', '#d77bba', '#8f974a', '#8a6f30',
  // Claude (du plus sombre au plus clair)
  '#4a1e16', '#6e3226', '#a8513a', '#c8603e', '#d97757', '#e8906c', '#f4b094', '#ffd8c4',
  // Ombres, pierres et ors
  '#170b0d', '#1a1420', '#2a1e28', '#3a2a30', '#2e3a44', '#4a5058', '#6a7078',
  '#5a3a28', '#7a5a3a', '#c8a060', '#f0c040', '#1e3a36', '#3e6a5e', '#e0e8e4',
  '#26386a', '#141c3a', '#f2c0a0', '#c08a68',
];

const PAL_RGB = MASTER_PALETTE.map((h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
});

const nearestCache = new Map();

// Couleur de la palette la plus proche (distance "redmean", perceptuelle).
function nearestPal(r, g, b) {
  const key = (r << 16) | (g << 8) | b;
  let v = nearestCache.get(key);
  if (v !== undefined) return v;
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < PAL_RGB.length; i++) {
    const p = PAL_RGB[i];
    const rm = (r + p[0]) / 2;
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  nearestCache.set(key, best);
  return best;
}

// Ramène un canvas entier à la palette. Par défaut l'alpha devient binaire
// (net), sauf si keepAlpha (panneaux translucides).
function quantizeCanvas(c, keepAlpha = false) {
  const x = c.getContext('2d');
  const id = x.getImageData(0, 0, c.width, c.height);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) { d[i + 3] = 0; continue; }
    if (!keepAlpha) d[i + 3] = 255;
    const p = PAL_RGB[nearestPal(d[i], d[i + 1], d[i + 2])];
    d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2];
  }
  x.putImageData(id, 0, 0);
  return c;
}

function palHex(hex) {
  const n = parseInt(hex.slice(1), 16);
  return MASTER_PALETTE[nearestPal((n >> 16) & 255, (n >> 8) & 255, n & 255)];
}

// Rampes de particules : blanc -> couleur -> sombre, dans la palette.
const RAMPS = [];
const rampIndex = new Map();
function rampFor(color) {
  let i = rampIndex.get(color);
  if (i !== undefined) return i;
  const base = palHex(color);
  RAMPS.push(['#ffffff', palHex(tone(base, 0.2)), base, palHex(tone(base, -0.18)), palHex(tone(base, -0.35))]);
  i = RAMPS.length - 1;
  rampIndex.set(color, i);
  return i;
}

// Disque tramé (halo sans dégradé) : densité décroissante + tramage de Bayer,
// chaque pixel est soit plein (couleur de la palette), soit vide.
const ditherDiscCache = new Map();
function ditherDisc(r, color) {
  const key = r + color;
  let c = ditherDiscCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = r * 2 + 1;
  const x = c.getContext('2d');
  const id = x.createImageData(c.width, c.height);
  const n = parseInt(palHex(color).slice(1), 16);
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j) / r;
      if (d >= 1) continue;
      // Densité décroissante, rendue par tramage ordonné (16 niveaux)
      const dens = Math.pow(1 - d, 1.6) * 0.9;
      if ((BAYER[(j & 3) * 4 + (i & 3)] + 0.5) / 16 >= dens) continue;
      const o = ((j + r) * c.width + (i + r)) * 4;
      id.data[o] = (n >> 16) & 255;
      id.data[o + 1] = (n >> 8) & 255;
      id.data[o + 2] = n & 255;
      id.data[o + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  ditherDiscCache.set(key, c);
  return c;
}

// Halo tramé additif, en pixels HD (remplace les dégradés radiaux).
function drawGlow(ctx, x, y, r, color, alpha = 0.3) {
  const R2 = Math.max(2, Math.round(r * 2));
  const c = ditherDisc(R2, color);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= alpha;
  ctx.drawImage(c, (Math.round(x * 2) - R2) / 2, (Math.round(y * 2) - R2) / 2, c.width / 2, c.height / 2);
  ctx.restore();
}

// Tampon de lumière : disque noir à paliers d'opacité quantifiés (4 niveaux,
// tramés), utilisé en "destination-out" pour percer la pénombre.
const lightStampCache = new Map();
function lightStamp(r, a) {
  r = Math.max(2, Math.round(r));
  const qa = Math.round(a * 8) / 8;
  const key = r * 16 + qa * 8;
  let c = lightStampCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = r * 2 + 1;
  const x = c.getContext('2d');
  const id = x.createImageData(c.width, c.height);
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j) / r;
      if (d >= 1) continue;
      const v = (1 - d) * 4 + BAYER[(j & 3) * 4 + (i & 3)] / 16 - 0.5;
      const lvl = Math.max(0, Math.min(4, Math.round(v))) / 4;
      id.data[((j + r) * c.width + (i + r)) * 4 + 3] = Math.round(lvl * qa * 255);
    }
  }
  x.putImageData(id, 0, 0);
  lightStampCache.set(key, c);
  return c;
}

// Cercle et ellipse "pixel perfect" en contour (remplacent ctx.arc / ellipse).
function pixelEllipse(ctx, cx, cy, rx, ry, color, px = 1) {
  cx = Math.round(cx / px) * px;
  cy = Math.round(cy / px) * px;
  rx = Math.max(1, Math.round(rx / px));
  ry = Math.max(1, Math.round(ry / px));
  ctx.fillStyle = color;
  // Parcourt le quart d'ellipse par x puis par y pour un trait continu.
  for (let i = 0; i <= rx; i++) {
    const j = Math.round(ry * Math.sqrt(1 - (i * i) / (rx * rx)));
    ctx.fillRect(cx + i * px, cy + j * px, px, px); ctx.fillRect(cx - i * px, cy + j * px, px, px);
    ctx.fillRect(cx + i * px, cy - j * px, px, px); ctx.fillRect(cx - i * px, cy - j * px, px, px);
  }
  for (let j = 0; j <= ry; j++) {
    const i = Math.round(rx * Math.sqrt(1 - (j * j) / (ry * ry)));
    ctx.fillRect(cx + i * px, cy + j * px, px, px); ctx.fillRect(cx - i * px, cy + j * px, px, px);
    ctx.fillRect(cx + i * px, cy - j * px, px, px); ctx.fillRect(cx - i * px, cy - j * px, px, px);
  }
}

function pixelCircle(ctx, cx, cy, r, color, px = 1) {
  pixelEllipse(ctx, cx, cy, r, r, color, px);
}

// Temps quantifié : les poses bougent à ~10 images/s, comme un vrai sprite
// animé, même si la boucle tourne à 60 Hz.
const POSE_FPS = 10;
function poseT(t) {
  return Math.floor(t * POSE_FPS) / POSE_FPS;
}

// Liseré de lumière (rim light) : pixels intérieurs collés au contour, du côté
// de la source. 8 directions, calculées une fois par sprite.
const RIM_OUTLINE = [0x17, 0x0b, 0x0d];
function rimCanvas(s, dirIdx) {
  s.rims = s.rims || [];
  if (s.rims[dirIdx]) return s.rims[dirIdx];
  const src = s.img;
  const w = src.width;
  const h = src.height;
  const sd = src.getContext('2d').getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  const id = x.createImageData(w, h);
  const a = (dirIdx / 8) * Math.PI * 2;
  const dx = Math.round(Math.cos(a));
  const dy = Math.round(Math.sin(a));
  const isOutline = (o) => sd[o + 3] > 0 && Math.abs(sd[o] - RIM_OUTLINE[0]) + Math.abs(sd[o + 1] - RIM_OUTLINE[1]) + Math.abs(sd[o + 2] - RIM_OUTLINE[2]) < 24;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      if (!sd[o + 3] || isOutline(o)) continue;
      // Voisin vers la lumière (1 px logique = 2 px HD)
      let edge = false;
      for (let k = 1; k <= 2 && !edge; k++) {
        const ni = i + dx * k;
        const nj = j + dy * k;
        if (ni < 0 || nj < 0 || ni >= w || nj >= h) { edge = true; break; }
        const no = (nj * w + ni) * 4;
        if (!sd[no + 3] || isOutline(no)) edge = true;
      }
      if (edge) id.data[o] = id.data[o + 1] = id.data[o + 2] = id.data[o + 3] = 255;
    }
  }
  x.putImageData(id, 0, 0);
  s.rims[dirIdx] = c;
  return c;
}

// Teinte un liseré (blanc) dans une couleur de la palette.
function rimTinted(s, dirIdx, color) {
  s.rimTints = s.rimTints || {};
  const key = dirIdx + color;
  if (s.rimTints[key]) return s.rimTints[key];
  const base = rimCanvas(s, dirIdx);
  const c = document.createElement('canvas');
  c.width = base.width;
  c.height = base.height;
  const x = c.getContext('2d');
  x.drawImage(base, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = palHex(color);
  x.fillRect(0, 0, c.width, c.height);
  s.rimTints[key] = c;
  return c;
}

function rimDir(dx, dy) {
  return ((Math.round((Math.atan2(dy, dx) / (Math.PI * 2)) * 8) % 8) + 8) % 8;
}
