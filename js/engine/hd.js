// Sprites "HD pixelisés" façon The Binding of Isaac : peints à 2x la résolution
// logique, avec contour noir épais et ombrage doux automatique.

const HD = 2;
const OUTLINE = '#170b0d';
const NOSHADE = new Set(['#ffffff', '#170b0d', '#1a0e10', '#000000', '#050206']);

function newCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// --- Primitives (coordonnées HD entières)
function R(x, X, Y, w, h, c) {
  x.fillStyle = c;
  x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h));
}

function E(x, cx, cy, rx, ry, c) {
  fillEllipse(x, cx, cy, Math.round(rx), Math.max(1, Math.round(ry)), c);
}

function RR(x, X, Y, w, h, r, c) {
  X = Math.round(X); Y = Math.round(Y); w = Math.round(w); h = Math.round(h); r = Math.round(r);
  if (r <= 0) return R(x, X, Y, w, h, c);
  R(x, X + r, Y, w - 2 * r, h, c);
  R(x, X, Y + r, w, h - 2 * r, c);
  for (const [cx, cy] of [[X + r, Y + r], [X + w - 1 - r, Y + r], [X + r, Y + h - 1 - r], [X + w - 1 - r, Y + h - 1 - r]]) {
    fillEllipse(x, cx, cy, r, r, c);
  }
}

function LN(x, x0, y0, x1, y1, c, th = 1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  x.fillStyle = c;
  for (;;) {
    x.fillRect(x0 - Math.floor(th / 2), y0 - Math.floor(th / 2), th, th);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

function hexAt(d, i) {
  return '#' + ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1);
}

// Ombrage : reflet en haut à gauche, ombre en bas à droite, selon la silhouette.
function shadePass(c, skip = NOSHADE) {
  const x = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  const id = x.getImageData(0, 0, w, h);
  const d = id.data;
  const src = new Uint8ClampedArray(d);
  const A = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : src[(j * w + i) * 4 + 3]);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const k = (j * w + i) * 4;
      if (!src[k + 3]) continue;
      const hex = hexAt(src, k);
      if (skip.has(hex)) continue;
      let t = 0;
      if (!A(i + 1, j + 2) || !A(i + 2, j + 1) || !A(i, j + 2)) t = -0.2;
      else if (!A(i + 2, j + 4) || !A(i + 3, j + 3) || !A(i + 1, j + 4)) t = -0.1;
      else if (!A(i - 1, j - 2) || !A(i - 2, j - 1)) t = 0.14;
      else if (!A(i - 2, j - 3) || !A(i - 3, j - 2)) t = 0.07;
      // Volume : bandes douces qui suivent la forme (bas plus sombre, haut plus clair).
      let db = 0;
      while (db < 7 && A(i, j + db + 1)) db++;
      let du = 0;
      while (du < 7 && A(i, j - du - 1)) du++;
      if (t === 0 && db < 6 && db < du) t = -0.08;
      else if (t === 0 && du < 4 && du < db) t = 0.05;
      if (!t) continue;
      const n = rgb(tone(hex, t));
      d[k] = n[0]; d[k + 1] = n[1]; d[k + 2] = n[2];
    }
  }
  x.putImageData(id, 0, 0);
}

// Contour épais (2 px HD) autour de la silhouette.
function outlinePass(c, color = OUTLINE) {
  const x = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  const id = x.getImageData(0, 0, w, h);
  const d = id.data;
  const a = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  const col = rgb(color);
  const offs = [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (a[j * w + i]) continue;
      let hit = false;
      for (const [ox, oy] of offs) {
        const ii = i + ox;
        const jj = j + oy;
        if (ii >= 0 && jj >= 0 && ii < w && jj < h && a[jj * w + ii]) { hit = true; break; }
      }
      if (hit) {
        const k = (j * w + i) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
  }
  x.putImageData(id, 0, 0);
}

function registerHD(name, c) {
  SPR[name] = { img: c, white: silhouette(c, '#ffffff'), w: c.width / HD, h: c.height / HD, res: HD };
  return SPR[name];
}

// Peint un sprite : base aplatie -> ombrage -> détails -> contour.
function paint(name, w, h, base, o = {}) {
  const m = o.outline === false ? 0 : 2;
  const c = newCanvas(w + m * 2, h + m * 2);
  const x = c.getContext('2d');
  x.translate(m, m);
  base(x);
  if (o.shade !== false) shadePass(c);
  if (o.detail) o.detail(x);
  if (m) outlinePass(c, o.outlineColor || OUTLINE);
  return registerHD(name, c);
}

// Scale2x (EPX) : agrandit un ancien sprite en adoucissant les diagonales.
function scale2x(src) {
  const w = src.width;
  const h = src.height;
  const sx = src.getContext('2d').getImageData(0, 0, w, h);
  const S = new Uint32Array(sx.data.buffer);
  const out = newCanvas(w * 2, h * 2);
  const ox = out.getContext('2d');
  const od = ox.createImageData(w * 2, h * 2);
  const O = new Uint32Array(od.data.buffer);
  const at = (i, j) => S[clamp(j, 0, h - 1) * w + clamp(i, 0, w - 1)];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const P = at(i, j);
      const A = at(i, j - 1);
      const B = at(i + 1, j);
      const C = at(i - 1, j);
      const D = at(i, j + 1);
      const e0 = C === A && C !== D && A !== B ? A : P;
      const e1 = A === B && A !== C && B !== D ? B : P;
      const e2 = D === C && D !== B && C !== A ? C : P;
      const e3 = B === D && B !== A && D !== C ? D : P;
      const o = (j * 2) * w * 2 + i * 2;
      O[o] = e0; O[o + 1] = e1; O[o + w * 2] = e2; O[o + w * 2 + 1] = e3;
    }
  }
  ox.putImageData(od, 0, 0);
  return out;
}

// ---------------------------------------------------------------------------
// Claude, en trois modèles (k = facteur de détail : 1 en jeu, 2-3 pour les menus)

const CLAUDE_VARIANTS = {
  haiku: { body: '#f4a07c', arm: '#e88c68', leg: '#c86c4a' },
  sonnet: { body: '#e07b58', arm: '#d26c4c', leg: '#b8583a' },
  opus: { body: '#d0603c', arm: '#c05434', leg: '#963e26' },
};

function paintClaude(name, k, dir, frame, blink, variant = 'sonnet') {
  const s = (v) => Math.round(v * k);
  const V = CLAUDE_VARIANTS[variant];
  const oy = 6;
  const eyes = dir === 'left' ? [10, 22] : dir === 'right' ? [14, 26] : [12, 24];
  paint(name, s(36), s(36), (x) => {
    [7, 13, 19, 25].forEach((lx, i) => {
      const lift = frame === 1 && i % 2 === 1 ? 2 : 0;
      RR(x, s(lx), s(oy + 18), s(4), s(12 - lift), s(1), V.leg);
    });
    if (variant === 'opus') RR(x, s(2), s(oy + 3), s(32), s(17), s(4), '#6a2a8a');
    RR(x, 0, s(oy + 9), s(7), s(8), s(3), V.arm);
    RR(x, s(29), s(oy + 9), s(7), s(8), s(3), V.arm);
    RR(x, s(4), s(oy), s(28), s(23), s(7), V.body);
    if (dir === 'up' && variant === 'opus') {
      RR(x, s(7), s(oy + 3), s(22), s(21), s(4), '#7a3098');
      R(x, s(7), s(oy + 3), s(22), s(2), '#f0c030');
    }
    // Accessoires
    if (variant === 'haiku') {
      R(x, s(17), s(1), s(2), s(6), '#3a7a30');
      E(x, s(13), s(2), s(4), s(2), '#70c048');
      E(x, s(23), s(3), s(4), s(2), '#88d058');
    } else if (variant === 'sonnet') {
      LN(x, s(23), s(oy + 1), s(29), s(0), '#f2f0f4', Math.max(2, s(3)));
      LN(x, s(28), s(0), s(30), s(0), '#3a3a50', Math.max(1, s(2)));
    } else {
      R(x, s(10), s(3), s(16), s(4), '#f0c030');
      for (const px of [10, 16, 22]) {
        for (let r = 0; r < 3; r++) R(x, s(px + r), s(3 - (3 - Math.abs(1 - r)) + 0), s(1), s(3 - Math.abs(1 - r)), '#f0c030');
      }
    }
  }, {
    detail: (x) => {
      if (variant === 'opus') {
        R(x, s(17), s(4), s(2), s(2), '#e02848');
        R(x, s(12), s(4), s(1), s(1), '#50c0f0');
        R(x, s(23), s(4), s(1), s(1), '#50c0f0');
      }
      if (dir === 'up') return;
      for (const cx of eyes) {
        if (blink) {
          RR(x, s(cx - 2), s(oy + 12), s(5), s(2), s(1), '#1a0e10');
        } else {
          RR(x, s(cx - 2), s(oy + 6), s(5), s(10), s(2), '#1a0e10');
          R(x, s(cx - 1), s(oy + 7), s(2), s(3), '#ffffff');
          R(x, s(cx + 1), s(oy + 13), Math.max(1, s(1)), Math.max(1, s(1)), '#ffffff');
        }
      }
      E(x, s(eyes[0] - 5), s(oy + 17), s(2), s(1), '#f5907c');
      E(x, s(eyes[1] + 5), s(oy + 17), s(2), s(1), '#f5907c');
    },
  });
}

// ---------------------------------------------------------------------------
// Humanoïdes chibi (Sam, Prompt injecteur)

function paintSam(name, k, angry) {
  const s = (v) => Math.round(v * k);
  paint(name, s(26), s(40), (x) => {
    RR(x, s(8), s(31), s(4), s(8), s(1), '#3a5a8a');
    RR(x, s(14), s(31), s(4), s(8), s(1), '#3a5a8a');
    R(x, s(7), s(38), s(6), s(2), '#2a2a30');
    R(x, s(13), s(38), s(6), s(2), '#2a2a30');
    RR(x, s(1), s(22), s(5), s(10), s(2), '#6a6e7c');
    RR(x, s(20), s(22), s(5), s(10), s(2), '#6a6e7c');
    E(x, s(3), s(32), s(2), s(2), '#f2c8a4');
    E(x, s(22), s(32), s(2), s(2), '#f2c8a4');
    RR(x, s(5), s(20), s(16), s(13), s(4), '#6a6e7c');
    E(x, s(3), s(13), s(2), s(3), '#e8b894');
    E(x, s(23), s(13), s(2), s(3), '#e8b894');
    E(x, s(13), s(12), s(10), s(11), '#f2c8a4');
    E(x, s(13), s(5), s(10), s(5), '#6a4630');
    R(x, s(4), s(4), s(18), s(4), '#6a4630');
    E(x, s(6), s(7), s(3), s(3), '#6a4630');
  }, {
    detail: (x) => {
      R(x, s(10), s(20), s(6), s(2), '#e8e8f0');
      for (const cx of [9, 17]) {
        RR(x, s(cx - 1), s(12), s(3), s(4), s(1), '#1a0e10');
        R(x, s(cx - 1), s(12), Math.max(1, s(1)), Math.max(1, s(1)), '#ffffff');
      }
      if (angry) {
        LN(x, s(6), s(9), s(11), s(11), '#3a2418', Math.max(1, s(1)));
        LN(x, s(20), s(9), s(15), s(11), '#3a2418', Math.max(1, s(1)));
        R(x, s(11), s(18), s(4), Math.max(1, s(1)), '#8a3a3a');
      } else {
        R(x, s(7), s(9), s(4), Math.max(1, s(1)), '#4a3020');
        R(x, s(15), s(9), s(4), Math.max(1, s(1)), '#4a3020');
        R(x, s(11), s(18), s(4), Math.max(1, s(1)), '#b06a5a');
      }
    },
  });
  // Si une photo pixelisée de Sam est disponible, elle remplace la tête dessinée.
  if (typeof SAM_FACE !== 'undefined') applySamFace(name, k);
}

// Colle la tête issue de la photo pixelisée (voir tools/pixelize-face.js).
function applySamFace(name, k) {
  const spr = SPR[name];
  const c = spr.img;
  const x = c.getContext('2d');
  const F = k >= 2 || typeof SAM_FACE_S === 'undefined' ? SAM_FACE : SAM_FACE_S;
  const fw = F.w;
  const fh = F.h;
  const face = newCanvas(fw, fh);
  const fx = face.getContext('2d');
  for (let j = 0; j < fh; j++) {
    for (let i = 0; i < fw; i++) {
      const idx = F.data.charCodeAt(j * fw + i) - 48;
      if (idx < 0) continue;
      fx.fillStyle = F.palette[idx];
      fx.fillRect(i, j, 1, 1);
    }
  }
  const tw = Math.round(24 * k);
  const th = Math.round((tw * fh) / fw);
  const tmp = newCanvas(tw + 4, th + 4);
  const tx = tmp.getContext('2d');
  tx.imageSmoothingEnabled = false;
  tx.drawImage(face, 2, 2, tw, th);
  outlinePass(tmp);
  x.clearRect(0, 0, c.width, Math.round(24 * k) + 2);
  x.drawImage(tmp, Math.round((c.width - tmp.width) / 2), 0);
  registerHD(name, c);
}

function paintInjector(name, frame) {
  paint(name, 22, 30, (x) => {
    const step = frame ? 1 : -1;
    RR(x, 6 + step, 22, 4, 8, 1, '#3a3446');
    RR(x, 12 - step, 22, 4, 8, 1, '#3a3446');
    RR(x, 0, 14, 5, 9, 2, '#7a9a7c');
    RR(x, 17, 12, 5, 9, 2, '#7a9a7c');
    RR(x, 4, 14, 14, 11, 3, '#4a4a5c');
    E(x, 11, 8, 9, 8, '#8aa88a');
  }, {
    detail: (x) => {
      E(x, 7, 7, 2, 3, '#0a0608');
      E(x, 15, 7, 2, 3, '#0a0608');
      R(x, 7, 10, 1, 4, '#30c060');
      R(x, 15, 10, 1, 6, '#30c060');
      E(x, 11, 13, 3, 2, '#0a0608');
      R(x, 9, 12, 1, 1, '#e8e0d0');
      R(x, 12, 12, 1, 1, '#e8e0d0');
      R(x, 6, 18, 3, 1, '#30c060');
      R(x, 12, 20, 4, 1, '#30c060');
      LN(x, 5, 16, 9, 22, '#2e2e3a');
    },
  });
}

// ---------------------------------------------------------------------------
// Ennemis

function paintBug(name, frame, body, dark) {
  paint(name, 32, 24, (x) => {
    for (let i = 0; i < 3; i++) {
      const up = (frame + i) % 2 ? -2 : 1;
      const y = 7 + i * 5;
      LN(x, 9, y, 3, y + up - 1, '#241c22', 2);
      LN(x, 3, y + up - 1, 1, y + up + 4, '#241c22', 2);
      LN(x, 23, y, 29, y + up - 1, '#241c22', 2);
      LN(x, 29, y + up - 1, 31, y + up + 4, '#241c22', 2);
    }
    LN(x, 12, 4, 9, 0, '#241c22', 1);
    LN(x, 20, 4, 23, 0, '#241c22', 1);
    E(x, 16, 10, 11, 8, body);
    E(x, 16, 17, 8, 5, dark);
    // Crocs
    for (const fx of [12, 19]) {
      R(x, fx, 21, 2, 2, '#f0e8d8');
      R(x, fx + (fx < 16 ? 1 : 0), 23, 1, 1, '#f0e8d8');
    }
  }, {
    detail: (x) => {
      R(x, 16, 3, 1, 9, tone(dark, -0.2));
      E(x, 11, 5, 4, 2, tone(body, 0.25));
      R(x, 20, 6, 2, 2, '#f070b8');
      R(x, 22, 9, 1, 1, '#7fe8f0');
      R(x, 9, 9, 2, 1, '#f8d048');
      for (const cx of [12, 20]) {
        E(x, cx, 16, 3, 3, '#ffffff');
        R(x, cx - 1 + (cx < 16 ? 1 : 0), 17, 2, 2, '#c01830');
      }
      LN(x, 9, 12, 14, 14, '#0a0608', 1);
      LN(x, 23, 12, 18, 14, '#0a0608', 1);
    },
  });
}

function paintFly(name, frame) {
  paint(name, 24, 20, (x) => {
    const wing = '#d8e8f4';
    if (frame === 0) {
      E(x, 5, 5, 5, 4, wing);
      E(x, 19, 5, 5, 4, wing);
    } else {
      E(x, 4, 10, 5, 3, wing);
      E(x, 20, 10, 5, 3, wing);
    }
    E(x, 12, 12, 7, 7, '#3a2232');
  }, {
    detail: (x) => {
      if (frame === 0) { LN(x, 3, 4, 7, 7, '#a8b8c8'); LN(x, 21, 4, 17, 7, '#a8b8c8'); }
      R(x, 7, 14, 10, 1, '#f8a040');
      R(x, 8, 17, 8, 1, '#f8a040');
      for (const cx of [9, 15]) {
        E(x, cx, 10, 3, 3, '#e02838');
        R(x, cx - 1, 9, 1, 1, '#ffffff');
      }
      R(x, 11, 16, 1, 2, '#f0e8d8');
      R(x, 13, 16, 1, 2, '#f0e8d8');
    },
  });
}

function paintSlime(name, small, col, frame = 0) {
  const k = small ? 0.62 : 1;
  const s = (v) => Math.round(v * k);
  const sq = frame ? 1 : 0;
  paint(name, s(28), s(22), (x) => {
    E(x, s(14), s(15), s(13 + sq), s(6 - sq), col);
    E(x, s(14), s(10 + sq), s(10 - sq), s(8 - sq), col);
    E(x, s(5), s(19), s(2), s(2), col);
    E(x, s(22), s(20), s(2), s(1), col);
  }, {
    detail: (x) => {
      E(x, s(9), s(6 + sq), Math.max(1, s(3)), Math.max(1, s(2)), '#ffffff');
      E(x, s(20), s(15), Math.max(1, s(2)), Math.max(1, s(2)), tone(col, 0.2));
      E(x, s(7), s(15), Math.max(1, s(1)), Math.max(1, s(1)), tone(col, 0.2));
      for (const cx of [11, 18]) {
        RR(x, s(cx - 1), s(9 + sq), Math.max(2, s(3)), Math.max(2, s(5)), 1, '#1a0e10');
        R(x, s(cx - 1), s(9 + sq), 1, 1, '#ffffff');
      }
      E(x, s(14), s(16), Math.max(1, s(3)), Math.max(1, s(2)), '#1a0e10');
      R(x, s(14), s(17), Math.max(1, s(2)), 1, '#e05070');
    },
  });
}

function paintSpambot(name, eye, bulb, bodyCol = '#9aa2b4') {
  paint(name, 26, 30, (x) => {
    R(x, 12, 1, 2, 5, '#4a4452');
    E(x, 13, 2, 2, 2, bulb);
    RR(x, 7, 27, 4, 3, 1, '#3a3a48');
    RR(x, 15, 27, 4, 3, 1, '#3a3a48');
    RR(x, 0, 18, 5, 6, 2, tone(bodyCol, -0.1));
    RR(x, 21, 18, 5, 6, 2, tone(bodyCol, -0.1));
    RR(x, 5, 17, 16, 11, 3, tone(bodyCol, -0.12));
    RR(x, 3, 5, 20, 14, 7, bodyCol);
  }, {
    detail: (x) => {
      RR(x, 5, 9, 16, 6, 3, '#141820');
      E(x, 13, 12, 3, 2, eye);
      R(x, 12, 11, 1, 1, '#ffffff');
      R(x, 8, 19, 10, 7, '#f4f4f4');
      LN(x, 8, 19, 13, 23, '#8a8290');
      LN(x, 17, 19, 13, 23, '#8a8290');
      R(x, 0, 20, 2, 2, '#1a1a22');
      R(x, 24, 20, 2, 2, '#1a1a22');
    },
  });
}

function paintCaptcha(name, fire) {
  paint(name, 30, 30, (x) => {
    RR(x, 4, 24, 5, 6, 1, '#3a3a48');
    RR(x, 21, 24, 5, 6, 1, '#3a3a48');
    RR(x, 1, 1, 28, 25, 4, '#e6e6f0');
  }, {
    detail: (x) => {
      const cols = ['#78b8e8', '#88c070', '#e8c060', '#a0a0b0', '#e87860', '#78b8e8', '#88c070', '#a0a0b0', '#e8c060'];
      for (let i = 0; i < 9; i++) R(x, 5 + (i % 3) * 6, 4 + Math.floor(i / 3) * 5, 5, 4, cols[i]);
      R(x, 22, 5, 5, 5, '#8a8a9a');
      R(x, 23, 6, 3, 3, '#ffffff');
      if (fire) {
        RR(x, 5, 19, 20, 5, 2, '#1a0e10');
        for (let i = 0; i < 5; i++) R(x, 6 + i * 4, 19, 2, 2, '#ffffff');
        R(x, 23, 6, 3, 3, '#30a040');
      } else {
        R(x, 7, 20, 16, 2, '#a8a8b8');
      }
      E(x, 24, 15, 2, 2, fire ? '#ff3040' : '#3a80e0');
    },
  });
}

function paintGhost(name, frame, col) {
  paint(name, 28, 30, (x) => {
    E(x, 14, 11, 12, 11, col);
    R(x, 2, 11, 25, 12, col);
    for (let i = 0; i < 5; i++) {
      const cx = 3 + i * 5.5 - (frame ? 1 : 0);
      E(x, cx, 23 + ((i + frame) % 2 ? 3 : 0), 3, 3, col);
    }
  }, {
    detail: (x) => {
      for (const cx of [9, 19]) {
        E(x, cx, 11, 4, 4, '#1a0e10');
        E(x, cx, 11, 2, 2, tone(col, -0.3));
        R(x, cx, 11, 1, 1, '#ffffff');
      }
      E(x, 14, 19, 3, 3, '#1a0e10');
      E(x, 8, 5, 3, 1, '#ffffff');
    },
  });
}

// ---------------------------------------------------------------------------
// Mobilier du QG

function paintHubProps() {
  paint('terminal', 30, 34, (x) => {
    R(x, 3, 22, 24, 12, '#3a3a46');
    RR(x, 0, 0, 30, 24, 3, '#4a4a58');
  }, {
    detail: (x) => {
      R(x, 3, 3, 24, 16, '#141c14');
      for (let i = 0; i < 5; i++) R(x, 5, 5 + i * 3, 8 + ((i * 7) % 12), 1, i === 0 ? '#f8d048' : '#60e070');
      R(x, 6, 25, 18, 3, '#20202a');
      for (let i = 0; i < 6; i++) R(x, 7 + i * 3, 26, 2, 1, '#8a8a9a');
    },
  });
  paint('modelpod', 30, 42, (x) => {
    RR(x, 0, 32, 30, 10, 3, '#4a4a58');
    RR(x, 3, 0, 24, 34, 10, '#9ad0e8');
  }, {
    detail: (x) => {
      R(x, 6, 5, 2, 20, '#e0f8ff');
      R(x, 3, 34, 24, 2, '#f0a060');
      for (let i = 0; i < 4; i++) R(x, 6 + i * 6, 38, 3, 2, i % 2 ? '#60e0ff' : '#f8d048');
    },
  });
  paint('pathmap', 34, 24, (x) => {
    R(x, 4, 14, 3, 10, '#5a3a24');
    R(x, 27, 14, 3, 10, '#5a3a24');
    R(x, 0, 6, 34, 10, '#7a5030');
    R(x, 3, 0, 28, 10, '#e8d8b0');
  }, {
    detail: (x) => {
      LN(x, 7, 7, 14, 3, '#a8281c', 1);
      LN(x, 14, 3, 20, 7, '#a8281c', 1);
      LN(x, 14, 3, 26, 2, '#3a70c0', 1);
      R(x, 25, 1, 3, 3, '#e8404a');
    },
  });
  paint('dummy', 20, 30, (x) => {
    R(x, 9, 20, 2, 10, '#6a4a30');
    R(x, 3, 28, 14, 2, '#5a3a24');
    E(x, 10, 12, 8, 9, '#c8a878');
    R(x, 0, 11, 20, 3, '#b89868');
  }, {
    detail: (x) => {
      E(x, 10, 12, 5, 5, '#e84848');
      E(x, 10, 12, 3, 3, '#f0e0c0');
      E(x, 10, 12, 1, 1, '#e84848');
      LN(x, 4, 6, 7, 9, '#8a6a48');
    },
  });
  paint('rock_4', 28, 24, (x) => {
    R(x, 0, 16, 28, 8, '#6a3a24');
    R(x, 2, 8, 24, 8, '#3a5a8a');
    R(x, 5, 0, 18, 8, '#7a2a2a');
  }, {
    detail: (x) => {
      R(x, 0, 18, 28, 1, '#e8d8b0');
      R(x, 2, 10, 24, 1, '#e8d8b0');
      R(x, 5, 2, 18, 1, '#e8d8b0');
      R(x, 12, 3, 2, 4, '#f0c030');
    },
  });
  paint('rock_5', 26, 26, (x) => RR(x, 0, 4, 26, 22, 3, '#6a4030'), {
    detail: (x) => { R(x, 3, 8, 20, 2, '#8a5a40'); R(x, 3, 16, 20, 2, '#8a5a40'); },
  });
}

// ---------------------------------------------------------------------------
// Ramassables, projectiles, décor

function heartShape(x, col) {
  E(x, 4, 4, 4, 4, col);
  E(x, 10, 4, 4, 4, col);
  for (let j = 0; j < 7; j++) R(x, 1 + j, 5 + j, 13 - j * 2, 1, col);
}

function paintPickups() {
  paint('heart_full', 14, 12, (x) => heartShape(x, '#e02838'), {
    detail: (x) => { R(x, 3, 2, 2, 2, '#ffffff'); R(x, 2, 4, 1, 1, '#ffffff'); },
  });
  paint('heart_half', 14, 12, (x) => heartShape(x, '#e02838'), {
    detail: (x) => {
      x.globalCompositeOperation = 'source-atop';
      R(x, 7, 0, 8, 13, '#3a2c34');
      x.globalCompositeOperation = 'source-over';
      R(x, 3, 2, 2, 2, '#ffffff');
    },
  });
  paint('heart_empty', 14, 12, (x) => heartShape(x, '#3a2c34'));
  paint('heart_shield', 14, 12, (x) => heartShape(x, '#60c8e8'), {
    detail: (x) => { R(x, 3, 2, 2, 2, '#ffffff'); },
  });
  paint('coin', 12, 12, (x) => E(x, 6, 6, 6, 6, '#f0b828'), {
    detail: (x) => {
      E(x, 6, 6, 3, 3, '#c88a10');
      R(x, 6, 3, 1, 7, '#fff0a0');
      R(x, 3, 6, 7, 1, '#fff0a0');
      R(x, 2, 2, 2, 2, '#ffffff');
    },
  });
  paint('key', 10, 18, (x) => {
    E(x, 5, 4, 5, 4, '#f0b828');
    R(x, 4, 7, 3, 10, '#f0b828');
    R(x, 7, 12, 3, 2, '#f0b828');
    R(x, 7, 15, 2, 2, '#f0b828');
  }, { detail: (x) => { E(x, 5, 4, 1, 1, '#1a0e10'); R(x, 2, 2, 2, 1, '#ffffff'); } });
  paint('pedestal', 30, 16, (x) => {
    R(x, 0, 12, 30, 4, '#5a4c56');
    R(x, 3, 3, 24, 10, '#7a6c78');
    R(x, 1, 0, 28, 4, '#a898a8');
  }, { detail: (x) => { R(x, 3, 1, 24, 1, '#d8c8d8'); R(x, 6, 6, 18, 1, '#5a4c56'); } });
  paint('trapdoor', 40, 26, (x) => {
    E(x, 20, 13, 19, 12, '#3a2c3a');
  }, {
    detail: (x) => {
      E(x, 20, 14, 15, 9, '#050206');
      for (let i = 0; i < 3; i++) R(x, 14, 9 + i * 5, 12, 2, '#5a4030');
      R(x, 13, 7, 2, 16, '#6a4a36');
      R(x, 25, 7, 2, 16, '#6a4a36');
    },
  });
  // Tirs de Claude : petites étincelles de tokens
  const spark = (name, sz, core, mid, rim) => {
    paint(name, sz, sz, (x) => {
      const c = sz / 2;
      E(x, c, c, c * 0.55, c * 0.55, mid);
      R(x, c - 1, 0, 2, sz, mid);
      R(x, 0, c - 1, sz, 2, mid);
    }, {
      shade: false,
      outlineColor: rim,
      detail: (x) => {
        const c = sz / 2;
        E(x, c, c, c * 0.3, c * 0.3, core);
        R(x, c - 1, c - 3, 1, 2, '#ffffff');
      },
    });
  };
  spark('tear', 10, '#fff4e0', '#f09060', '#8a3020');
  spark('tear_big', 14, '#fff4e0', '#f09060', '#8a3020');
  spark('tear_blue', 10, '#e0f8ff', '#60b8f0', '#1a4a8a');
  const orb = (name, col) => paint(name, 10, 10, (x) => E(x, 5, 5, 5, 5, col), {
    detail: (x) => { R(x, 3, 2, 2, 2, '#ffffff'); },
  });
  orb('eb', '#e83848');
  orb('eb_purple', '#b070f0');
  orb('eb_gold', '#f8c838');
  orb('eb_blue', '#50b0f8');
  orb('eb_clip', '#c8c8d8');
}

// Rochers par thème.
function paintRocks() {
  paint('rock_1', 28, 26, (x) => {
    E(x, 14, 15, 13, 10, '#6e6272');
    E(x, 10, 10, 8, 7, '#7e7282');
  }, {
    detail: (x) => {
      LN(x, 15, 9, 18, 15, '#4a3e50');
      LN(x, 18, 15, 16, 20, '#4a3e50');
      E(x, 8, 7, 2, 1, '#c8bcd0');
    },
  });
  paint('rock_2', 26, 26, (x) => RR(x, 0, 0, 26, 26, 3, '#3e4e66'), {
    detail: (x) => {
      R(x, 2, 2, 22, 2, '#7c96b8');
      for (let i = 0; i < 4; i++) {
        R(x, 4, 7 + i * 4, 16, 2, '#1a2230');
        R(x, 21, 7 + i * 4, 2, 2, i === 2 ? '#f04040' : '#6af06a');
      }
    },
  });
  paint('rock_3', 26, 28, (x) => {
    const shard = (cx, h, w, col) => {
      for (let yy = 0; yy < h; yy++) {
        const half = Math.max(1, Math.round((yy < h * 0.35 ? yy / (h * 0.35) : (h - yy) / (h * 0.65) * 0.8 + 0.2) * w));
        R(x, cx - half, 28 - h + yy, half * 2, 1, col);
      }
    };
    shard(7, 18, 5, '#7a3ab0');
    shard(19, 20, 5, '#8a4ac0');
    shard(13, 27, 7, '#9a5ad0');
  }, {
    detail: (x) => {
      R(x, 12, 5, 2, 8, '#f0d0ff');
      R(x, 18, 12, 1, 5, '#e0b0ff');
    },
  });
  // Fichier corrompu destructible (3 états)
  for (let hp = 1; hp <= 3; hp++) {
    paint('file_' + hp, 22, 26, (x) => {
      R(x, 0, 0, 16, 26, '#f0e8f0');
      R(x, 16, 6, 6, 20, '#f0e8f0');
      for (let i = 0; i < 6; i++) R(x, 16 + i, i, 1, 6 - i, '#c8c0d0');
    }, {
      detail: (x) => {
        for (let i = 0; i < 6; i++) R(x, 3, 8 + i * 3, i % 2 ? 10 : 15, 1, '#9a92a8');
        if (hp <= 2) { R(x, 0, 10, 22, 2, '#f070b8'); R(x, 4, 18, 18, 1, '#7fe8f0'); }
        if (hp <= 1) { R(x, 0, 14, 12, 3, '#78d05a'); LN(x, 11, 0, 8, 26, '#1a0e10', 2); }
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Boss

function paintBosses() {
  for (const [pre, calm, angry] of [['bb', '#4a9a3a', '#b83848'], ['bq', '#8a48c8', '#d04890']]) for (const rage of [0, 1]) {
    const body = rage ? angry : calm;
    for (const f of [0, 1]) {
      paint(`${pre}_${rage}_${f}`, 60, 48, (x) => {
        for (let i = 0; i < 3; i++) {
          const up = (f + i) % 2 ? -3 : 2;
          const y = 14 + i * 8;
          LN(x, 16, y, 4, y + up - 2, '#221c22', 3);
          LN(x, 4, y + up - 2, 2, y + up + 6, '#221c22', 3);
          LN(x, 44, y, 56, y + up - 2, '#221c22', 3);
          LN(x, 56, y + up - 2, 58, y + up + 6, '#221c22', 3);
        }
        LN(x, 24, 8, 18, 0, '#221c22', 2);
        LN(x, 36, 8, 42, 0, '#221c22', 2);
        E(x, 30, 20, 20, 15, body);
        E(x, 30, 36, 13, 8, '#2a2a36');
        R(x, 20, 41, 5, 7, '#e8e0d0');
        R(x, 35, 41, 5, 7, '#e8e0d0');
      }, {
        detail: (x) => {
          R(x, 29, 6, 2, 22, tone(body, -0.25));
          E(x, 21, 13, 5, 3, tone(body, 0.22));
          R(x, 18, 22, 5, 3, '#f070b8');
          R(x, 38, 14, 6, 3, '#7fe8f0');
          R(x, 36, 26, 3, 3, '#f8d048');
          for (const cx of [24, 36]) {
            E(x, cx, 35, 4, 3, '#e83040');
            R(x, cx - 2, 34, 2, 2, '#ffffff');
          }
          E(x, 18, 1, 2, 2, '#f8d048');
          E(x, 42, 1, 2, 2, '#f8d048');
        },
      });
    }
  }
  for (const rage of [0, 1]) {
    const main = rage ? '#c050a0' : '#8a50d8';
    for (const f of [0, 1]) {
      paint(`bh_${rage}_${f}`, 64, 64, (x) => {
        for (let i = 0; i < 5; i++) {
          const tx = 12 + i * 10;
          for (let j = 0; j < 8; j++) {
            const wob = Math.round(Math.sin(f * 1.6 + i + j * 0.7) * 3);
            E(x, tx + wob, 40 + j * 3, 3, 2, tone(main, j % 2 ? -0.1 : 0));
          }
        }
        E(x, 16, 20, 13, 11, main);
        E(x, 48, 20, 13, 11, main);
        E(x, 32, 26, 27, 19, main);
      }, {
        detail: (x) => {
          E(x, 32, 27, 14, 10, '#ffffff');
          LN(x, 20, 26, 25, 24, '#e04060');
          LN(x, 44, 30, 39, 29, '#e04060');
          E(x, 22, 13, 4, 2, tone(main, 0.3));
        },
      });
    }
  }
  for (const rage of [0, 1]) {
    paint(`mech_${rage}`, 92, 40, (x) => {
      RR(x, 0, 10, 16, 16, 4, '#3e465a');
      RR(x, 76, 10, 16, 16, 4, '#3e465a');
      R(x, 0, 16, 4, 6, '#1a1a22');
      R(x, 88, 16, 4, 6, '#1a1a22');
      E(x, 46, 22, 36, 16, '#4a5470');
      E(x, 42, 16, 26, 7, '#6a7894');
    }, {
      detail: (x) => {
        R(x, 20, 12, 12, 2, '#c8d4e8');
        R(x, 16, 30, 60, 2, '#262a38');
        E(x, 46, 26, 4, 3, rage ? '#ff4050' : '#60e0ff');
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Portes façon Isaac (orientées "haut", pivotées au dessin)

const doorCache = new Map();

function doorCanvas(themeId, kind, state) {
  const key = themeId + kind + state;
  if (doorCache.has(key)) return doorCache.get(key);
  const c = newCanvas(64, 48);
  const s = (v) => Math.round(v * 4 / 3);
  const x = c.getContext('2d');
  const frames = {
    normal: ['#7a6a60', '#8a7a8a', '#9a6ac0', '#8a6a44', '#a8704a'][themeId - 1],
    boss: '#8a2434',
    treasure: '#d8a830',
    shop: '#4a9a50',
  };
  const fr = frames[kind];
  const frD = tone(fr, -0.22);
  const frL = tone(fr, 0.16);
  // Cadre en arche
  E(x, s(24), s(12), s(24), s(12), OUTLINE);
  R(x, s(0), s(12), s(48), s(24), OUTLINE);
  E(x, s(24), s(12), s(22), s(10), fr);
  R(x, s(2), s(12), s(44), s(22), fr);
  // Pierres du cadre
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (i / 5) * Math.PI;
    LN(x, s(24 + Math.cos(a) * 12), s(13 + Math.sin(a) * 7), s(24 + Math.cos(a) * 22), s(13 + Math.sin(a) * 10), frD);
  }
  for (const y of [18, 25]) { R(x, s(2), s(y), s(9), s(1), frD); R(x, s(37), s(y), s(9), s(1), frD); }
  R(x, s(3), s(13), s(8), s(1), frL);
  R(x, s(37), s(13), s(8), s(1), frL);
  E(x, s(24), s(4), s(5), s(4), frL);
  E(x, s(24), s(5), s(4), s(3), fr);
  // Ouverture
  const op = (col) => {
    E(x, s(24), s(15), s(12), s(7), col);
    R(x, s(12), s(15), s(24), s(21), col);
  };
  op(OUTLINE);
  x.save();
  x.beginPath();
  x.rect(0, 0, 64, 48);
  x.clip();
  if (state === 'open') {
    const inner = newCanvas(64, 48);
    const ix = inner.getContext('2d');
    ix.fillStyle = '#050206';
    E(ix, s(24), s(16), s(11), s(6), '#050206');
    R(ix, s(13), s(16), s(22), s(20), '#050206');
    const glow = kind === 'treasure' ? '#8a6a20' : kind === 'boss' ? '#5a0c18' : kind === 'shop' ? '#2a5a2a' : '#3a3040';
    ix.globalCompositeOperation = 'source-atop';
    ix.fillStyle = glow;
    for (let j = s(20); j < 48; j++) {
      for (let i = s(13); i < s(35); i++) if (bayer(i, j) < (j - s(20)) / s(20)) ix.fillRect(i, j, 1, 1);
    }
    x.drawImage(inner, 0, 0);
  } else {
    const wood = ['#7a4a2c', '#4a5a74', '#5a3a80', '#6a3a22', '#7a4a2c'][themeId - 1];
    E(x, s(24), s(16), s(11), s(6), wood);
    R(x, s(13), s(16), s(22), s(20), wood);
    for (let i = 15; i < 35; i += 4) R(x, s(i), s(12), 1, s(24), tone(wood, -0.18));
    R(x, s(23), s(10), s(2), s(26), '#1a0e10');
    for (const y of [19, 30]) {
      R(x, s(13), s(y), s(22), s(2), '#2a2226');
      for (const rx of [15, 21, 27, 33]) R(x, s(rx), s(y), s(1), s(1), '#d8c8b0');
    }
    if (kind === 'boss') {
      E(x, s(24), s(24), s(4), s(3), '#ff3040');
    }
  }
  x.restore();
  if (state === 'locked') {
    LN(x, s(21), s(18), s(21), s(22), '#8a6a10', s(2));
    LN(x, s(27), s(18), s(27), s(22), '#8a6a10', s(2));
    R(x, s(21), s(17), s(7), s(2), '#8a6a10');
    RR(x, s(18), s(22), s(12), s(9), s(2), OUTLINE);
    RR(x, s(19), s(23), s(10), s(7), s(2), '#f0c030');
    R(x, s(20), s(24), s(8), s(1), '#fff0a0');
    R(x, s(23), s(25), s(2), s(3), '#1a0e10');
  }
  if (kind === 'boss') {
    // Crâne et cornes
    E(x, s(24), s(5), s(6), s(5), OUTLINE);
    E(x, s(24), s(5), s(5), s(4), '#ece2d0');
    R(x, s(21), s(4), s(2), s(2), '#1a0e10');
    R(x, s(25), s(4), s(2), s(2), '#1a0e10');
    R(x, s(22), s(8), s(4), s(2), '#ece2d0');
    for (const sg of [-1, 1]) {
      for (let i = 0; i < 8; i++) R(x, s(24 + sg * (14 + i) - (sg < 0 ? 2 : 0)), s(10 - i), s(3), s(3), i > 5 ? '#f0e8d8' : '#c8b8a0');
    }
  }
  if (kind === 'treasure') {
    E(x, s(24), s(5), s(3), s(3), OUTLINE);
    E(x, s(24), s(5), s(2), s(2), '#50d0f8');
  }
  if (kind === 'shop') {
    E(x, s(24), s(5), s(3), s(3), OUTLINE);
    E(x, s(24), s(5), s(2), s(2), '#f8d048');
  }
  doorCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------------------
// Panneaux sombres (remplacent le papier)

const panelCache = new Map();

function panelCanvas(w, h, tint = 'dark') {
  const key = w + 'x' + h + tint;
  if (panelCache.has(key)) return panelCache.get(key);
  const W2 = w * HD;
  const H2 = h * HD;
  const c = newCanvas(W2, H2);
  const x = c.getContext('2d');
  const bg = tint === 'red' ? '#240c10' : tint === 'light' ? '#2a1c24' : '#170e14';
  const edge = tint === 'red' ? '#8a2a30' : '#5a3a48';
  x.globalAlpha = 0.94;
  RR(x, 0, 0, W2, H2, 6, OUTLINE);
  RR(x, 2, 2, W2 - 4, H2 - 4, 5, edge);
  RR(x, 4, 4, W2 - 8, H2 - 8, 4, bg);
  x.globalAlpha = 1;
  // Dégradé tramé vers le haut
  for (let j = 4; j < Math.min(40, H2 - 4); j++) {
    for (let i = 6; i < W2 - 6; i++) {
      if (bayer(i, j) < (1 - (j - 4) / 36) * 0.35) R(x, i, j, 1, 1, tone(bg, 0.06));
    }
  }
  R(x, 8, 4, W2 - 16, 1, tone(edge, 0.25));
  // Coins ornés
  for (const [cx, cy] of [[6, 6], [W2 - 7, 6], [6, H2 - 7], [W2 - 7, H2 - 7]]) {
    R(x, cx - 1, cy - 3, 2, 6, '#c8a070');
    R(x, cx - 3, cy - 1, 6, 2, '#c8a070');
    R(x, cx - 1, cy - 1, 2, 2, '#fff0c0');
  }
  panelCache.set(key, c);
  return c;
}

function drawPanel(ctx, x, y, w, h, tint) {
  ctx.drawImage(panelCanvas(Math.round(w), Math.round(h), tint), Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

// ---------------------------------------------------------------------------

function buildHD() {
  // 1. Tous les anciens sprites passent en Scale2x.
  for (const [name, s] of Object.entries(SPR)) {
    if (s.res || name.startsWith('glow')) continue;
    registerHD(name, scale2x(s.img));
  }
  // 2. Personnages repeints.
  for (const v of ['haiku', 'sonnet', 'opus']) {
    for (const dir of ['down', 'left', 'right', 'up']) {
      for (const f of [0, 1]) paintClaude(`${v}_${dir}_${f}`, 1, dir, f, false, v);
      paintClaude(`${v}XL_${dir}_0`, 2, dir, 0, false, v);
    }
    paintClaude(`${v}_blink`, 1, 'down', 0, true, v);
    paintClaude(`${v}XL_blink`, 2, 'down', 0, true, v);
    paintClaude(`${v}XXL_down_0`, 3, 'down', 0, false, v);
    paintClaude(`${v}XXL_blink`, 3, 'down', 0, true, v);
  }
  // Alias "claude_*" : le modèle classique (Sonnet).
  for (const [n, spr] of Object.entries(SPR)) {
    if (n.startsWith('sonnet')) SPR['claude' + n.slice(6)] = spr;
  }
  paintClaude('claudeXL_down_1', 2, 'down', 1, false, 'sonnet');
  paintClaude('claudeXL_up_1', 2, 'up', 1, false, 'sonnet');
  paintClaude('claudeXXL_right_0', 3, 'right', 0, false, 'sonnet');
  paintClaude('claudeXXL_up_0', 3, 'up', 0, false, 'sonnet');
  paintSam('sam', 1, false);
  paintSam('samXL', 2, false);
  paintSam('samXL_angry', 2, true);
  const bugCols = [['bug', '#5aa844', '#2e5a28'], ['bug2', '#d04848', '#6a2030'], ['bug3', '#d860b0', '#6a2860']];
  for (const [n, b2, d] of bugCols) {
    paintBug(n + '_a', 0, b2, d);
    paintBug(n + '_b', 1, b2, d);
  }
  paintFly('fly_a', 0);
  paintFly('fly_b', 1);
  paintSlime('slime', false, '#6ac04a');
  paintSlime('slime_s', true, '#6ac04a');
  paintSlime('slime2', false, '#58c0e0');
  paintSlime('slime2_s', true, '#58c0e0');
  paintSpambot('spambot', '#e04050', '#f8d048');
  paintSpambot('spambot_fire', '#ff9040', '#ff4050');
  paintSpambot('vendor', '#60e070', '#78d05a', '#c0c8a0');
  paintCaptcha('captcha', false);
  paintCaptcha('captcha_fire', true);
  paintGhost('ghost', 0, '#c8aef0');
  paintGhost('ghost_b', 1, '#c8aef0');
  paintInjector('injector_a', 0);
  paintInjector('injector_b', 1);
  paintHubProps();
  paintPickups();
  paintRocks();
  paintBosses();
}

buildHD();
