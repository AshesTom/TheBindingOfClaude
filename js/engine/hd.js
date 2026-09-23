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
  quantizeCanvas(c);
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

function paintClaude(name, k, dir, frame, face, variant = 'sonnet') {
  if (face === true) face = 'blink';
  if (!face) face = 'normal';
  const blink = face === 'blink';
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
        if (face === 'hurt') {
          const sg = cx === eyes[0] ? 1 : -1;
          LN(x, s(cx - 2 * sg), s(oy + 8), s(cx + 2 * sg), s(oy + 11), '#1a0e10', Math.max(1, s(2)));
          LN(x, s(cx + 2 * sg), s(oy + 11), s(cx - 2 * sg), s(oy + 14), '#1a0e10', Math.max(1, s(2)));
        } else if (blink) {
          RR(x, s(cx - 2), s(oy + 12), s(5), s(2), s(1), '#1a0e10');
        } else {
          RR(x, s(cx - 2), s(oy + 6), s(5), s(10), s(2), '#1a0e10');
          R(x, s(cx - 1), s(oy + 7), s(2), s(3), '#ffffff');
          R(x, s(cx + 1), s(oy + 13), Math.max(1, s(1)), Math.max(1, s(1)), '#ffffff');
          if (face === 'shoot') {
            // Regard concentré : paupière qui tombe en biais
            R(x, s(cx - 3), s(oy + 5), s(7), s(4), V.body);
            LN(x, s(cx - 3), s(oy + 8), s(cx + 3), s(oy + 7), '#1a0e10', Math.max(1, s(1)));
          }
        }
      }
      const mx = (eyes[0] + eyes[1]) / 2;
      if (face === 'shoot') E(x, s(mx), s(oy + 17), s(2), s(2), '#5a1a14');
      if (face === 'hurt') { E(x, s(mx), s(oy + 18), s(3), s(2), '#5a1a14'); R(x, s(mx - 2), s(oy + 17), s(4), Math.max(1, s(1)), '#ffffff'); }
      E(x, s(eyes[0] - 5), s(oy + 17), s(2), s(1), '#f5907c');
      E(x, s(eyes[1] + 5), s(oy + 17), s(2), s(1), '#f5907c');
    },
  });
}

// ---------------------------------------------------------------------------
// Humanoïdes chibi (Sam, Prompt injecteur)

function paintSam(name, k, angry) {
  const s = (v) => Math.round(v * k);
  const t = (v) => Math.max(1, s(v));
  const suit = '#26386a';
  paint(name, s(26), s(40), (x) => {
    RR(x, s(8), s(31), s(4), s(8), t(1), '#1e2c54');
    RR(x, s(14), s(31), s(4), s(8), t(1), '#1e2c54');
    R(x, s(7), s(38), s(6), s(2), '#141418');
    R(x, s(13), s(38), s(6), s(2), '#141418');
    RR(x, s(1), s(22), s(5), s(10), s(2), suit);
    RR(x, s(20), s(22), s(5), s(10), s(2), suit);
    E(x, s(3), s(32), s(2), s(2), '#f2c0a0');
    E(x, s(22), s(32), s(2), s(2), '#f2c0a0');
    RR(x, s(5), s(20), s(16), s(13), s(4), suit);
    E(x, s(3), s(13), s(2), s(3), '#e8b494');
    E(x, s(23), s(13), s(2), s(3), '#e8b494');
    E(x, s(13), s(12), s(10), s(11), '#f2c0a0');
    E(x, s(13), s(5), s(10), s(5), '#6a5444');
    R(x, s(4), s(4), s(18), s(4), '#6a5444');
    E(x, s(6), s(7), s(3), s(3), '#6a5444');
  }, {
    detail: (x) => {
      // Chemise blanche, cravate à pois, revers
      for (let j = 0; j < 7; j++) R(x, s(13) - s(3) + Math.round(j * k * 0.4), s(20 + j), Math.max(1, s(6) - Math.round(j * k * 0.8)), t(1), '#eef0f6');
      R(x, s(12), s(21), t(2), s(10), '#161a2a');
      for (const [a, b2] of [[12, 23], [13, 26], [12, 29]]) R(x, s(a), s(b2), t(1), t(1), '#ffffff');
      LN(x, s(8), s(20), s(11), s(27), '#1a2850', t(1));
      LN(x, s(18), s(20), s(15), s(27), '#1a2850', t(1));
      for (const cx of [9, 17]) {
        RR(x, s(cx - 1), s(12), s(3), s(4), t(1), '#1a0e10');
        R(x, s(cx - 1), s(12), t(1), t(1), '#6a9ac8');
      }
      if (angry) {
        LN(x, s(6), s(9), s(11), s(11), '#3a2418', t(1));
        LN(x, s(20), s(9), s(15), s(11), '#3a2418', t(1));
        R(x, s(11), s(18), s(4), t(1), '#8a3a3a');
      } else {
        R(x, s(11), s(18), s(4), t(1), '#b06a5a');
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
  if (name.includes('angry')) {
    // Sourcils froncés par-dessus la photo
    const cx = c.width / 2;
    const ey = Math.round(th * 0.56);
    LN(x, cx - 10 * k, ey - 3 * k, cx - 3 * k, ey, '#2a1a10', Math.max(2, 2 * k));
    LN(x, cx + 10 * k, ey - 3 * k, cx + 3 * k, ey, '#2a1a10', Math.max(2, 2 * k));
  }
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

// Obstacles par étage (deux variantes chacun), jarres, pics et décor au sol.
function paintRocks() {
  // Sous-sol : rochers
  paint('rock_1_a', 28, 26, (x) => {
    E(x, 14, 15, 13, 10, '#7a6656');
    E(x, 10, 10, 8, 7, '#8a7462');
  }, { detail: (x) => { LN(x, 15, 9, 18, 15, '#4e3e32'); LN(x, 18, 15, 16, 21, '#4e3e32'); E(x, 8, 7, 2, 1, '#c8b4a0'); } });
  paint('rock_1_b', 28, 24, (x) => {
    E(x, 9, 15, 8, 8, '#6e5a4c');
    E(x, 20, 16, 7, 7, '#7e6a5a');
    E(x, 14, 8, 7, 6, '#8a7462');
  }, { detail: (x) => { E(x, 12, 6, 2, 1, '#c8b4a0'); R(x, 18, 16, 3, 1, '#4e3e32'); } });
  // Catacombes : tas de crânes, pierre tombale
  paint('rock_2_a', 28, 24, (x) => {
    E(x, 14, 18, 13, 6, '#b8b0a0');
    for (const [cx, cy] of [[7, 14], [14, 12], [21, 14], [10, 7], [18, 7], [14, 3]]) E(x, cx, cy, 4, 4, '#e0d8c8');
  }, {
    detail: (x) => {
      for (const [cx, cy] of [[7, 14], [14, 12], [21, 14], [10, 7], [18, 7], [14, 3]]) {
        R(x, cx - 2, cy, 2, 2, '#1a0e10');
        R(x, cx + 1, cy, 2, 2, '#1a0e10');
      }
    },
  });
  paint('rock_2_b', 22, 28, (x) => {
    R(x, 0, 24, 22, 4, '#4a4e54');
    RR(x, 2, 0, 18, 26, 8, '#8a9098');
  }, { detail: (x) => { R(x, 10, 6, 2, 10, '#4a4e54'); R(x, 6, 9, 10, 2, '#4a4e54'); E(x, 6, 3, 2, 1, '#c8ccd4'); } });
  // Élysée : colonne brisée, buste
  paint('rock_3_a', 22, 30, (x) => {
    R(x, 0, 24, 22, 6, '#c8c0a8');
    R(x, 3, 4, 16, 21, '#e0dcc8');
    R(x, 1, 0, 20, 5, '#d0c8b0');
  }, {
    detail: (x) => {
      for (const cx of [6, 10, 14]) R(x, cx, 6, 1, 18, '#b0a890');
      R(x, 1, 5, 20, 1, '#c8a860');
      LN(x, 1, 0, 8, 3, '#8a8470');
      LN(x, 8, 3, 13, 0, '#8a8470');
    },
  });
  paint('rock_3_b', 24, 22, (x) => {
    R(x, 0, 16, 24, 6, '#c8c0a8');
    E(x, 12, 9, 8, 9, '#e0dcc8');
  }, { detail: (x) => { R(x, 8, 8, 2, 2, '#8a8470'); R(x, 14, 8, 2, 2, '#8a8470'); R(x, 10, 13, 4, 1, '#8a8470'); R(x, 0, 17, 24, 1, '#c8a860'); } });
  // Asphodèle : basalte fissuré de lave, pic d'obsidienne
  paint('rock_4_a', 28, 24, (x) => {
    RR(x, 0, 4, 28, 20, 5, '#3e3434');
    RR(x, 4, 0, 18, 12, 4, '#4a3e3c');
  }, { detail: (x) => { LN(x, 6, 8, 12, 14, '#ff7a20', 2); LN(x, 12, 14, 20, 12, '#ffb040'); LN(x, 20, 12, 23, 19, '#ff7a20'); } });
  paint('rock_4_b', 20, 28, (x) => {
    for (let j = 0; j < 28; j++) R(x, 10 - Math.round(j * 0.35), j, Math.max(2, Math.round(j * 0.7)), 1, '#2a2230');
  }, { detail: (x) => { R(x, 9, 6, 1, 12, '#6a5a80'); R(x, 4, 25, 12, 1, '#ff6a20'); } });
  // QG : colonne de marbre
  paint('rock_5_a', 22, 34, (x) => {
    R(x, 0, 28, 22, 6, '#6a3a40');
    R(x, 3, 5, 16, 24, '#8a4a50');
    R(x, 0, 0, 22, 6, '#6a3a40');
  }, {
    detail: (x) => {
      for (const cx of [6, 10, 14]) R(x, cx, 7, 1, 20, '#5a2a30');
      R(x, 0, 5, 22, 1, '#c8a060');
      R(x, 0, 28, 22, 1, '#c8a060');
    },
  });
  SPR.rock_5_b = SPR.rock_5_a;
  // Jarres (façon Hadès), 2 états
  for (let hp = 1; hp <= 2; hp++) {
    paint('urn_' + hp, 18, 22, (x) => {
      E(x, 9, 13, 8, 8, '#b86a3a');
      R(x, 5, 2, 8, 5, '#a85a30');
      R(x, 3, 1, 12, 3, '#c87a44');
    }, {
      detail: (x) => {
        R(x, 2, 12, 14, 2, '#3a2418');
        for (let i = 0; i < 4; i++) R(x, 3 + i * 4, 15, 2, 2, '#f0c060');
        if (hp === 1) { LN(x, 6, 7, 9, 13, '#2a1810'); LN(x, 9, 13, 7, 19, '#2a1810'); LN(x, 13, 9, 11, 15, '#2a1810'); }
      },
    });
  }
  // Pics au sol
  paint('spikes', 30, 26, (x) => {
    R(x, 0, 20, 30, 6, '#3a3238');
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 2; j++) {
        const cx = 5 + i * 10 + j * 5 - 2;
        const cy = 10 + j * 8;
        for (let k = 0; k < 10; k++) R(x, cx - Math.floor(k / 3), cy - 8 + k, Math.max(1, Math.floor(k / 3) * 2 + 1), 1, '#b8b8c8');
      }
    }
  }, { detail: (x) => { R(x, 0, 20, 30, 1, '#5a5058'); } });
  // Décor au sol (non bloquant, sans contour épais)
  const decal = (name, w, h, fn) => paint(name, w, h, fn, { outline: false, shade: false });
  decal('d_pebbles', 16, 8, (x) => { E(x, 3, 5, 2, 1, '#6e5a4a'); E(x, 9, 3, 1, 1, '#7a6656'); E(x, 13, 6, 2, 1, '#5e4a3c'); });
  decal('d_blood', 20, 12, (x) => { E(x, 10, 6, 8, 4, '#5a1414'); E(x, 4, 9, 2, 1, '#5a1414'); E(x, 17, 3, 2, 1, '#5a1414'); E(x, 9, 5, 5, 2, '#6e1a1a'); });
  decal('d_bone', 16, 8, (x) => { R(x, 3, 3, 10, 2, '#d8d0c0'); E(x, 2, 2, 2, 1, '#d8d0c0'); E(x, 2, 5, 2, 1, '#d8d0c0'); E(x, 14, 2, 2, 1, '#d8d0c0'); E(x, 14, 5, 2, 1, '#d8d0c0'); });
  decal('d_crack', 20, 12, (x) => { LN(x, 0, 6, 6, 4, '#0000003a'); LN(x, 6, 4, 11, 8, '#00000040'); LN(x, 11, 8, 19, 5, '#0000003a'); LN(x, 11, 8, 13, 12, '#00000030'); });
  decal('d_puddle', 22, 10, (x) => { E(x, 11, 5, 10, 4, '#2a3a44'); E(x, 8, 4, 3, 1, '#4a6070'); });
  decal('d_skull', 12, 10, (x) => { E(x, 6, 4, 5, 4, '#d8d0c0'); R(x, 4, 7, 5, 3, '#d8d0c0'); R(x, 3, 4, 2, 2, '#1a0e10'); R(x, 7, 4, 2, 2, '#1a0e10'); });
  decal('d_candle', 8, 12, (x) => { R(x, 2, 4, 4, 8, '#e8e0c8'); R(x, 3, 3, 1, 1, '#2a2020'); });
  decal('d_moss', 20, 10, (x) => { E(x, 10, 5, 9, 4, '#2e4a2a'); E(x, 6, 4, 3, 2, '#3e6034'); E(x, 14, 6, 2, 1, '#3e6034'); });
  decal('d_petals', 18, 10, (x) => { for (const [a, b] of [[3, 3], [8, 6], [13, 2], [15, 7], [5, 8]]) { E(x, a, b, 1, 1, '#f0a0c0'); R(x, a, b, 1, 1, '#ffd0e0'); } });
  decal('d_coinspill', 16, 8, (x) => { for (const [a, b] of [[3, 4], [7, 3], [11, 5], [6, 6]]) E(x, a, b, 2, 1, '#e0b030'); });
  decal('d_ember', 18, 10, (x) => { LN(x, 1, 5, 7, 3, '#8a2a10'); LN(x, 7, 3, 12, 7, '#c04a10'); LN(x, 12, 7, 17, 4, '#8a2a10'); R(x, 7, 3, 1, 1, '#ffa040'); });
  // Applique murale (torche)
  paint('sconce', 8, 10, (x) => { R(x, 2, 3, 4, 7, '#4a3a30'); R(x, 0, 2, 8, 2, '#6a5040'); }, { shade: false });
}

// ---------------------------------------------------------------------------
// QG : mobilier et personnages

function paintHubProps() {
  // Escalier de la descente
  paint('stairs', 44, 30, (x) => {
    RR(x, 0, 0, 44, 30, 4, '#3a2226');
  }, {
    detail: (x) => {
      for (let i = 0; i < 5; i++) {
        const inset = i * 3;
        R(x, 4 + inset, 4 + i * 5, 36 - inset * 2, 5, tone('#6a4448', -i * 0.08));
        R(x, 4 + inset, 4 + i * 5, 36 - inset * 2, 1, tone('#8a6468', -i * 0.08));
      }
      R(x, 17, 26, 10, 4, '#050206');
    },
  });
  // Miroir des modèles
  paint('mirror', 26, 38, (x) => {
    R(x, 4, 32, 18, 6, '#6a4a2a');
    E(x, 13, 16, 12, 16, '#c8a060');
  }, {
    detail: (x) => {
      E(x, 13, 16, 9, 13, '#3a4a6a');
      E(x, 13, 16, 7, 11, '#4a6088');
      LN(x, 8, 8, 12, 4, '#a8c0e0', 2);
      R(x, 12, 0, 2, 3, '#e04060');
    },
  });
  // Table de cartes
  paint('maptable', 34, 22, (x) => {
    R(x, 3, 12, 3, 10, '#4a2e1c');
    R(x, 28, 12, 3, 10, '#4a2e1c');
    R(x, 0, 6, 34, 8, '#6a4228');
    R(x, 3, 0, 28, 9, '#e8d8b0');
  }, {
    detail: (x) => {
      LN(x, 6, 6, 13, 2, '#a8281c');
      LN(x, 13, 2, 19, 6, '#a8281c');
      LN(x, 13, 2, 26, 2, '#3a70c0');
      E(x, 26, 2, 1, 1, '#e8404a');
    },
  });
  paint('dummy', 20, 30, (x) => {
    R(x, 9, 20, 2, 10, '#6a4a30');
    R(x, 3, 28, 14, 2, '#5a3a24');
    E(x, 10, 12, 8, 9, '#c8a878');
    R(x, 0, 11, 20, 3, '#b89868');
  }, { detail: (x) => { E(x, 10, 12, 5, 5, '#e84848'); E(x, 10, 12, 3, 3, '#f0e0c0'); E(x, 10, 12, 1, 1, '#e84848'); } });
  // Comptoir du Passeur
  paint('counter', 60, 20, (x) => {
    R(x, 0, 6, 60, 14, '#5a3422');
    R(x, 0, 0, 60, 7, '#8a5a38');
  }, { detail: (x) => { R(x, 0, 1, 60, 1, '#c8a060'); for (let i = 4; i < 60; i += 12) R(x, i, 9, 8, 8, '#4a2a1a'); } });
  paint('chest', 22, 18, (x) => {
    R(x, 0, 6, 22, 12, '#7a4a24');
    RR(x, 0, 0, 22, 8, 3, '#8a5a2c');
  }, { detail: (x) => { R(x, 0, 7, 22, 2, '#c8a040'); R(x, 9, 6, 4, 5, '#f0c040'); R(x, 10, 8, 2, 2, '#1a0e10'); } });
  paint('coinpile', 18, 12, (x) => {
    E(x, 9, 9, 9, 3, '#c89020');
    E(x, 9, 6, 6, 3, '#e0b030');
    E(x, 9, 3, 3, 2, '#f0c848');
  }, { detail: (x) => { R(x, 6, 3, 2, 1, '#fff0a0'); R(x, 12, 7, 2, 1, '#fff0a0'); } });
  paint('bookcase', 30, 36, (x) => {
    R(x, 0, 0, 30, 36, '#4a2c1c');
  }, {
    detail: (x) => {
      const cols = ['#a83a2a', '#3a5a9a', '#4a8a3a', '#c89a3a', '#7a3a8a', '#2a6a7a'];
      for (let row = 0; row < 3; row++) {
        R(x, 2, 2 + row * 11, 26, 9, '#1e120c');
        for (let i = 0; i < 7; i++) {
          const h = 6 + ((i * 7 + row * 3) % 3);
          R(x, 3 + i * 3.6, 11 + row * 11 - h, 3, h, cols[(i + row * 2) % cols.length]);
        }
        R(x, 0, 11 + row * 11, 30, 2, '#6a4430');
      }
    },
  });
  paint('candelabra', 12, 24, (x) => {
    R(x, 5, 8, 2, 14, '#c8a040');
    R(x, 2, 22, 8, 2, '#a88030');
    R(x, 1, 7, 10, 2, '#c8a040');
    for (const cx of [1, 5, 9]) R(x, cx, 3, 2, 4, '#f0e8d0');
  }, { shade: false });
  paint('plinth', 26, 14, (x) => {
    R(x, 0, 4, 26, 10, '#6a4a50');
    R(x, 2, 0, 22, 5, '#8a6a70');
  }, { detail: (x) => { R(x, 2, 0, 22, 1, '#c8a060'); R(x, 0, 4, 26, 1, '#c8a060'); } });

  // Brasero (le feu est animé à l'exécution)
  paint('brazier', 20, 20, (x) => {
    R(x, 8, 10, 4, 8, '#4a3a30');
    R(x, 3, 17, 14, 3, '#3a2a22');
    E(x, 10, 6, 9, 5, '#8a6a40');
  }, { detail: (x) => { E(x, 10, 4, 7, 2, '#2a1810'); R(x, 2, 7, 16, 1, '#c8a060'); } });
  // Bassin (le Styx en miniature)
  paint('pool', 50, 26, (x) => E(x, 25, 13, 25, 13, '#8a8078'), {
    detail: (x) => {
      E(x, 25, 13, 21, 10, '#3a1a30');
      E(x, 25, 13, 18, 8, '#5a2440');
    },
  });
}

// Personnages du QG (k = 1 en jeu, 2 pour le portrait des dialogues).
function paintNPCs() {
  for (const k of [1, 2]) {
    const s = (v) => Math.round(v * k);
    const t = (v) => Math.max(1, s(v));
    const suf = k === 2 ? 'XL' : '';
    // Le Passeur (marchand encapuchonné)
    paint('npc_passeur' + suf, s(24), s(38), (x) => {
      for (let j = 0; j < 22; j++) R(x, s(12 - 4 - j * 0.35), s(14 + j), s(8 + j * 0.7), t(1), '#3a2250');
      E(x, s(12), s(11), s(9), s(10), '#4a2c66');
      E(x, s(20), s(28), s(3), s(3), '#d8c8b0');
    }, {
      detail: (x) => {
        E(x, s(12), s(12), s(6), s(6), '#140a1c');
        E(x, s(9), s(12), t(1), t(1), '#ffd040');
        E(x, s(15), s(12), t(1), t(1), '#ffd040');
        E(x, s(20), s(30), s(2), s(2), '#f0c030');
        R(x, s(6), s(22), s(12), t(1), '#c8a060');
      },
    });
    // Le Vétéran (casque à plume)
    paint('npc_veteran' + suf, s(24), s(38), (x) => {
      RR(x, s(8), s(30), s(4), s(8), t(1), '#6a4a30');
      RR(x, s(13), s(30), s(4), s(8), t(1), '#6a4a30');
      RR(x, s(4), s(18), s(16), s(14), s(4), '#b88a3a');
      RR(x, s(0), s(19), s(5), s(10), s(2), '#e8b894');
      RR(x, s(19), s(19), s(5), s(10), s(2), '#e8b894');
      E(x, s(12), s(11), s(9), s(9), '#e8b894');
      E(x, s(12), s(6), s(10), s(6), '#c89a40');
      for (let i = 0; i < 8; i++) E(x, s(12 + (i - 4) * 1.2), s(0 + Math.abs(i - 4) * 0.4), t(2), t(3), '#d03030');
    }, {
      detail: (x) => {
        R(x, s(8), s(11), t(2), t(2), '#1a0e10');
        R(x, s(14), s(11), t(2), t(2), '#1a0e10');
        R(x, s(7), s(15), s(10), s(4), '#8a6a4a');
        R(x, s(6), s(22), s(12), t(1), '#8a6020');
        R(x, s(3), s(6), s(18), t(1), '#8a6020');
      },
    });
    // La Conteuse (robe étoilée)
    paint('npc_conteuse' + suf, s(24), s(40), (x) => {
      for (let j = 0; j < 20; j++) R(x, s(12 - 5 - j * 0.3), s(19 + j), s(10 + j * 0.6), t(1), '#2a2a5a');
      E(x, s(12), s(12), s(10), s(12), '#1a1024');
      E(x, s(12), s(12), s(7), s(8), '#e8dcf0');
    }, {
      detail: (x) => {
        R(x, s(9), s(12), t(2), t(1), '#3a2a50');
        R(x, s(14), s(12), t(2), t(1), '#3a2a50');
        R(x, s(11), s(16), t(2), t(1), '#b06a8a');
        for (const [a, b] of [[8, 26], [15, 30], [11, 34], [17, 24], [6, 33]]) R(x, s(a), s(b), t(1), t(1), '#f8e8a0');
        E(x, s(12), s(3), t(2), t(1), '#c8a0f0');
      },
    });
    // Le Veilleur (endormi, flotte avec son oreiller)
    paint('npc_veilleur' + suf, s(26), s(30), (x) => {
      RR(x, s(0), s(20), s(26), s(8), s(3), '#e8e8f0');
      RR(x, s(5), s(12), s(16), s(12), s(4), '#6a8ac8');
      E(x, s(13), s(9), s(8), s(8), '#f0d0b0');
      E(x, s(13), s(4), s(8), s(4), '#d8d8e8');
    }, {
      detail: (x) => {
        R(x, s(9), s(10), s(3), t(1), '#3a2418');
        R(x, s(15), s(10), s(3), t(1), '#3a2418');
        E(x, s(13), s(14), t(1), t(1), '#b06a5a');
      },
    });
    // Maître Hibou (cartographe à monocle)
    paint('npc_hibou' + suf, s(22), s(26), (x) => {
      E(x, s(11), s(15), s(10), s(11), '#8a6a48');
      E(x, s(4), s(3), s(3), s(4), '#8a6a48');
      E(x, s(18), s(3), s(3), s(4), '#8a6a48');
      E(x, s(11), s(18), s(6), s(7), '#d8c098');
    }, {
      detail: (x) => {
        E(x, s(7), s(10), s(3), s(3), '#f8f0d0');
        E(x, s(15), s(10), s(3), s(3), '#f8f0d0');
        E(x, s(7), s(10), t(1), t(1), '#1a0e10');
        E(x, s(15), s(10), t(1), t(1), '#1a0e10');
        E(x, s(15), s(10), s(4), s(4), '#c8a060');
        E(x, s(15), s(10), s(3), s(3), '#f8f0d0');
        E(x, s(15), s(10), t(1), t(1), '#1a0e10');
        R(x, s(10), s(13), s(2), s(2), '#e0a030');
      },
    });
    // Le chat
    paint('npc_chat' + suf, s(20), s(16), (x) => {
      E(x, s(10), s(11), s(8), s(5), '#2a2430');
      E(x, s(5), s(6), s(5), s(5), '#2a2430');
      R(x, s(1), s(0), s(3), s(3), '#2a2430');
      R(x, s(6), s(0), s(3), s(3), '#2a2430');
      R(x, s(17), s(4), s(2), s(8), '#2a2430');
    }, {
      detail: (x) => {
        R(x, s(3), s(5), t(1), t(2), '#f0d040');
        R(x, s(7), s(5), t(1), t(2), '#f0d040');
        R(x, s(5), s(8), t(1), t(1), '#f090a0');
      },
    });
  }
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
    normal: ['#8a7058', '#7a8088', '#c8a860', '#8a5a44', '#c8a060'][themeId - 1],
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
    const wood = ['#7a4a2c', '#4a4e56', '#6a5a3a', '#3a2a26', '#6a2a2a'][themeId - 1];
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
  quantizeCanvas(c);
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
  quantizeCanvas(c, true);
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
      for (const f of [0, 1]) {
        paintClaude(`${v}_${dir}_${f}`, 1, dir, f, 'normal', v);
        if (dir !== 'up') {
          paintClaude(`${v}_${dir}_shoot_${f}`, 1, dir, f, 'shoot', v);
          paintClaude(`${v}_${dir}_blink_${f}`, 1, dir, f, 'blink', v);
        }
      }
      paintClaude(`${v}XL_${dir}_0`, 2, dir, 0, false, v);
    }
    paintClaude(`${v}_hurt`, 1, 'down', 0, 'hurt', v);
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
  paintNPCs();
  paintPickups();
  paintRocks();
  paintBosses();
}

buildHD();
