// Outils de pixel art procédural : peinture de sprites, ombrage automatique façon
// Rebirth (volume doux + contour sombre épais), cache et dessin ancré.

const OUTLINE = '#1a0d0d';

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  c.getContext('2d', { willReadFrequently: true });
  return c;
}

// Pinceau pixel : toutes les coordonnées sont arrondies, aucun anticrénelage.
class Pix {
  constructor(g) {
    this.g = g;
  }
  rect(x, y, w, h, c) {
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  px(x, y, c) {
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // Ellipse pleine, centre flottant (cx = 5.5 donne une ellipse de largeur paire).
  ell(cx, cy, rx, ry, c) {
    this.g.fillStyle = c;
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      const dy = (y + 0.5 - cy) / ry;
      if (Math.abs(dy) > 1) continue;
      const hw = rx * Math.sqrt(1 - dy * dy);
      const xa = Math.round(cx - hw);
      const xb = Math.round(cx + hw);
      if (xb > xa) this.g.fillRect(xa, y, xb - xa, 1);
    }
  }
  circ(cx, cy, r, c) {
    this.ell(cx, cy, r, r, c);
  }
  // Rectangle aux coins arrondis.
  rr(x, y, w, h, r, c) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    r = Math.min(Math.round(r), Math.floor(w / 2), Math.floor(h / 2));
    this.g.fillStyle = c;
    for (let j = 0; j < h; j++) {
      let inset = 0;
      if (j < r) inset = r - Math.round(Math.sqrt(r * r - (r - j - 0.5) * (r - j - 0.5)));
      else if (j >= h - r) {
        const k = j - (h - r);
        inset = r - Math.round(Math.sqrt(r * r - (k + 0.5) * (k + 0.5)));
      }
      this.g.fillRect(x + inset, y + j, w - inset * 2, 1);
    }
  }
  line(x0, y0, x1, y1, c, th = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.g.fillStyle = c;
    const o = Math.floor(th / 2);
    for (;;) {
      this.g.fillRect(x0 - o, y0 - o, th, th);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // Polygone plein (règle pair-impair, balayage ligne à ligne).
  poly(pts, c) {
    this.g.fillStyle = c;
    let ymin = Infinity;
    let ymax = -Infinity;
    for (const p of pts) { ymin = Math.min(ymin, p[1]); ymax = Math.max(ymax, p[1]); }
    for (let y = Math.floor(ymin); y <= Math.ceil(ymax); y++) {
      const yc = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) {
          xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const xa = Math.round(xs[i]);
        const xb = Math.round(xs[i + 1]);
        if (xb > xa) this.g.fillRect(xa, y, xb - xa, 1);
      }
    }
  }
  // Anneau (cercle creux).
  ring(cx, cy, r, c, th = 1) {
    this.g.fillStyle = c;
    for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) {
      for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d > r - th) this.g.fillRect(x, y, 1, 1);
      }
    }
  }
  // Tramage : remplit un pixel sur deux (motif en damier) dans le rectangle.
  dither(x, y, w, h, c, phase = 0) {
    this.g.fillStyle = c;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) if (((x + i + y + j + phase) & 1) === 0) this.g.fillRect(x + i, y + j, 1, 1);
    }
  }
}

// Ombrage de volume : reflet chaud en haut/gauche, ombre en bas/droite, d'après la silhouette.
function shadePass(c, o = {}) {
  const hi = o.hi !== undefined ? o.hi : 0.22;
  const lo = o.lo !== undefined ? o.lo : 0.3;
  const g = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  // Hauteur de chaque colonne de silhouette pour un dégradé vertical doux.
  const top = new Int16Array(w).fill(-1);
  const bot = new Int16Array(w).fill(-1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (A(x, y) > 100) {
        if (top[x] < 0) top[x] = y;
        bot[x] = y;
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] < 100) continue;
      let f = 0;
      const up = A(x, y - 1) < 100;
      const left = A(x - 1, y) < 100;
      const down = A(x, y + 1) < 100;
      const right = A(x + 1, y) < 100;
      if (up) f += hi;
      else if (A(x, y - 2) < 100) f += hi * 0.45;
      if (left) f += hi * 0.5;
      if (down) f -= lo;
      else if (A(x, y + 2) < 100) f -= lo * 0.55;
      if (right) f -= lo * 0.5;
      if (top[x] >= 0 && bot[x] > top[x]) {
        const t = (y - top[x]) / (bot[x] - top[x]);
        f += (0.5 - t) * (o.grad !== undefined ? o.grad : 0.18);
      }
      f = clamp(f, -0.6, 0.6);
      const r = src[i];
      const gg = src[i + 1];
      const b = src[i + 2];
      if (f > 0) {
        d[i] = r + (255 - r) * f;
        d[i + 1] = gg + (244 - gg) * f;
        d[i + 2] = b + (224 - b) * f * 0.85;
      } else {
        d[i] = r + (20 - r) * -f;
        d[i + 1] = gg + (10 - gg) * -f;
        d[i + 2] = b + (14 - b) * -f;
      }
    }
  }
  g.putImageData(img, 0, 0);
}

// Contour sombre de 1 px autour de la silhouette ; agrandit la toile de 1 px par côté.
function outlinePass(c, col = OUTLINE) {
  const w = c.width;
  const h = c.height;
  const out = mkCanvas(w + 2, h + 2);
  const og = out.getContext('2d');
  const src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[(y * w + x) * 4 + 3]);
  og.fillStyle = col;
  for (let y = -1; y <= h; y++) {
    for (let x = -1; x <= w; x++) {
      if (A(x, y) > 100) continue;
      if (A(x - 1, y) > 100 || A(x + 1, y) > 100 || A(x, y - 1) > 100 || A(x, y + 1) > 100) {
        og.fillRect(x + 1, y + 1, 1, 1);
      }
    }
  }
  og.drawImage(c, 1, 1);
  return out;
}

// Peint un sprite : fn(p) pour les volumes (ombrés), opts.detail(p) pour les détails
// posés après l'ombrage (yeux, reflets), puis contour.
function paint(w, h, fn, opts = {}) {
  let c = mkCanvas(w, h);
  const p = new Pix(c.getContext('2d'));
  fn(p);
  if (opts.shade !== false) shadePass(c, opts.shade || {});
  if (opts.detail) opts.detail(p);
  if (opts.outline !== false) c = outlinePass(c, opts.outline || OUTLINE);
  return c;
}

// --- Cache paresseux de sprites nommés
const SPR = {};
const SPR_DEF = {};
function defSpr(name, builder) {
  SPR_DEF[name] = builder;
}
function spr(name) {
  let c = SPR[name];
  if (c) return c;
  const b = SPR_DEF[name];
  if (!b) {
    console.warn('sprite inconnu', name);
    SPR[name] = mkCanvas(4, 4);
    return SPR[name];
  }
  c = b();
  SPR[name] = c;
  return c;
}

// Dessin ancré : ax/ay = fraction de la toile (0.5, 1 = pieds au centre-bas).
function drawAt(ctx, c, x, y, o = {}) {
  if (typeof c === 'string') c = spr(c);
  const sx = o.sx || 1;
  const sy = o.sy || 1;
  const ax = o.ax !== undefined ? o.ax : 0.5;
  const ay = o.ay !== undefined ? o.ay : 1;
  const w = c.width * sx;
  const h = c.height * sy;
  const dx = Math.round(x - w * ax);
  const dy = Math.round(y - h * ay);
  const needSave = o.flip || o.alpha !== undefined || o.rot;
  if (needSave) {
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  }
  if (o.rot) {
    ctx.translate(Math.round(x), Math.round(y));
    ctx.rotate(o.rot);
    ctx.drawImage(c, -Math.round(w * ax), -Math.round(h * ay), w, h);
  } else if (o.flip) {
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(c, 0, 0, w, h);
  } else {
    ctx.drawImage(c, dx, dy, Math.round(w), Math.round(h));
  }
  if (needSave) ctx.restore();
  if (o.tint) {
    const t = tinted(c, o.tint);
    ctx.save();
    ctx.globalAlpha *= o.tintA !== undefined ? o.tintA : 0.7;
    if (o.flip) {
      ctx.translate(dx + w, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(t, 0, 0, w, h);
    } else ctx.drawImage(t, dx, dy, Math.round(w), Math.round(h));
    ctx.restore();
  }
}

// Silhouette colorée (flash de dégâts façon Isaac).
function tinted(c, color) {
  if (!c._tint) c._tint = {};
  if (c._tint[color]) return c._tint[color];
  const t = mkCanvas(c.width, c.height);
  const g = t.getContext('2d');
  g.drawImage(c, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, t.width, t.height);
  c._tint[color] = t;
  return t;
}

// Version tournée de 90° (portes), mise en cache.
function rotated(c, quarter) {
  if (!quarter) return c;
  if (!c._rot) c._rot = {};
  if (c._rot[quarter]) return c._rot[quarter];
  const odd = quarter % 2 === 1;
  const r = mkCanvas(odd ? c.height : c.width, odd ? c.width : c.height);
  const g = r.getContext('2d');
  g.translate(r.width / 2, r.height / 2);
  g.rotate((quarter * Math.PI) / 2);
  g.drawImage(c, -c.width / 2, -c.height / 2);
  c._rot[quarter] = r;
  return r;
}

// Ombre portée au sol (ellipse sombre semi-transparente).
const _shadowCache = {};
function drawShadow(ctx, x, y, rx, ry = null, a = 0.35) {
  rx = Math.max(2, Math.round(rx));
  ry = ry === null ? Math.max(1, Math.round(rx * 0.4)) : Math.max(1, Math.round(ry));
  const key = rx + ':' + ry;
  let c = _shadowCache[key];
  if (!c) {
    c = mkCanvas(rx * 2 + 1, ry * 2 + 1);
    new Pix(c.getContext('2d')).ell(rx + 0.5, ry + 0.5, rx, ry, '#000');
    _shadowCache[key] = c;
  }
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.drawImage(c, Math.round(x - rx - 0.5), Math.round(y - ry - 0.5));
  ctx.restore();
}

// --- Panneau « papier » façon menus de Rebirth (bords irréguliers, encre brune).
const PAPER = '#d8c49c';
const INK = '#3a2418';
const INK2 = '#6b4a32';
function paperPanel(w, h, seed = 1, tone = PAPER) {
  const key = 'paper_' + w + 'x' + h + '_' + seed + tone;
  if (SPR[key]) return SPR[key];
  const c = mkCanvas(w, h);
  const g = c.getContext('2d');
  const R = RNG(seed * 7919 + w * 31 + h);
  // Bord déchiré : décalage par ligne/colonne.
  const edge = (i) => Math.floor(vnoise(i * 0.35, seed, 3) * 3);
  const base = rgb(tone);
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const inside = x >= edge(y) && x < w - edge(y + 99) && y >= edge(x + 7) && y < h - edge(x + 51);
      if (!inside) continue;
      const n = fbm(x * 0.08, y * 0.08, seed, 3);
      const fine = hash2(x, y, seed);
      let k = 0.86 + n * 0.22 + (fine - 0.5) * 0.06;
      // bords plus sombres (papier vieilli)
      const ed = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (ed < 6) k -= (6 - ed) * 0.025;
      const i = (y * w + x) * 4;
      img.data[i] = base[0] * k;
      img.data[i + 1] = base[1] * k;
      img.data[i + 2] = base[2] * k;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  // Taches et fibres
  const p = new Pix(g);
  for (let i = 0; i < (w * h) / 900; i++) {
    const x = R.int(4, w - 5);
    const y = R.int(4, h - 5);
    g.globalAlpha = 0.12;
    p.ell(x, y, R.range(2, 6), R.range(1, 4), '#7a5a38');
  }
  g.globalAlpha = 1;
  const out = outlinePass(c, INK);
  SPR[key] = out;
  return out;
}

// Barre de progression / jauge simple aux bords nets.
function bar(ctx, x, y, w, h, t, fg, bg = '#1a0d0d', border = '#000') {
  ctx.fillStyle = border;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, Math.round(w * clamp(t, 0, 1)), h);
}
