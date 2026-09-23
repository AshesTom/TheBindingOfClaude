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
// Claude (k = facteur de détail : 1 en jeu, 2 pour les illustrations)

function paintClaude(name, k, dir, frame, blink) {
  const s = (v) => v * k;
  const eyes = dir === 'left' ? [10, 22] : dir === 'right' ? [14, 26] : [12, 24];
  paint(name, s(36), s(30), (x) => {
    [7, 13, 19, 25].forEach((lx, i) => {
      const lift = frame === 1 && i % 2 === 1 ? 2 : 0;
      RR(x, s(lx), s(20), s(4), s(10 - lift), s(1), '#b8583a');
    });
    RR(x, 0, s(9), s(7), s(8), s(2), '#d26c4c');
    RR(x, s(29), s(9), s(7), s(8), s(2), '#d26c4c');
    RR(x, s(4), 0, s(28), s(23), s(5), '#e07b58');
  }, {
    detail: (x) => {
      if (dir === 'up') {
        R(x, s(10), s(3), s(16), s(1), '#c86848');
        return;
      }
      for (const cx of eyes) {
        if (blink) {
          R(x, s(cx - 2), s(12), s(5), s(2), '#1a0e10');
        } else {
          RR(x, s(cx - 2), s(7), s(5), s(8), s(2), '#1a0e10');
          R(x, s(cx - 1), s(8), s(2), s(2), '#ffffff');
          R(x, s(cx + 1), s(12), Math.max(1, s(1) / 2 + 0.5), Math.max(1, s(1) / 2 + 0.5), '#ffffff');
        }
      }
      E(x, s(eyes[0] - 4), s(17), s(2), s(1), '#f0907a');
      E(x, s(eyes[1] + 4), s(17), s(2), s(1), '#f0907a');
      R(x, s(4 + 6), s(2), s(14), Math.max(1, s(1)), '#f6ae90');
    },
  });
}

// ---------------------------------------------------------------------------
// Sam (chibi à la Isaac)

function paintSam(name, k, angry) {
  const s = (v) => v * k;
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
        R(x, s(10), s(19), s(1), s(1), '#8a3a3a');
        R(x, s(15), s(19), s(1), s(1), '#8a3a3a');
      } else {
        R(x, s(7), s(9), s(4), Math.max(1, s(1)), '#4a3020');
        R(x, s(15), s(9), s(4), Math.max(1, s(1)), '#4a3020');
        R(x, s(11), s(18), s(4), Math.max(1, s(1)), '#b06a5a');
      }
      E(x, s(6), s(16), s(1), s(1), '#f0a090');
      E(x, s(20), s(16), s(1), s(1), '#f0a090');
    },
  });
}

// ---------------------------------------------------------------------------
// Ennemis

function paintBug(name, frame, body, dark) {
  paint(name, 30, 22, (x) => {
    for (let i = 0; i < 3; i++) {
      const up = (frame + i) % 2 ? -2 : 1;
      const y = 8 + i * 5;
      LN(x, 8, y, 2, y + up - 1, '#2a2226', 2);
      LN(x, 2, y + up - 1, 1, y + up + 3, '#2a2226', 2);
      LN(x, 22, y, 28, y + up - 1, '#2a2226', 2);
      LN(x, 28, y + up - 1, 29, y + up + 3, '#2a2226', 2);
    }
    LN(x, 11, 5, 8, 0, '#2a2226', 1);
    LN(x, 19, 5, 22, 0, '#2a2226', 1);
    E(x, 15, 11, 10, 8, body);
    E(x, 15, 17, 7, 4, dark);
  }, {
    detail: (x) => {
      R(x, 15, 4, 1, 9, dark);
      E(x, 11, 7, 2, 1, tone(body, 0.2));
      E(x, 19, 9, 1, 1, tone(body, 0.15));
      for (const cx of [11, 19]) {
        E(x, cx, 16, 3, 3, '#ffffff');
        R(x, cx - 1 + (cx < 15 ? 1 : 0), 17, 2, 2, '#1a0e10');
      }
      LN(x, 8, 12, 13, 14, '#1a0e10', 1);
      LN(x, 22, 12, 17, 14, '#1a0e10', 1);
      R(x, 13, 20, 1, 2, '#e8e0d0');
      R(x, 17, 20, 1, 2, '#e8e0d0');
    },
  });
}

function paintFly(name, frame) {
  paint(name, 22, 18, (x) => {
    if (frame === 0) {
      E(x, 5, 5, 5, 4, '#dce8f0');
      E(x, 17, 5, 5, 4, '#dce8f0');
    } else {
      E(x, 4, 10, 5, 3, '#dce8f0');
      E(x, 18, 10, 5, 3, '#dce8f0');
    }
    E(x, 11, 11, 6, 6, '#3a2430');
  }, {
    detail: (x) => {
      R(x, 6, 12, 10, 1, '#f8a040');
      for (const cx of [8, 14]) {
        E(x, cx, 10, 2, 2, '#e83040');
        R(x, cx - 1, 9, 1, 1, '#ffffff');
      }
    },
  });
}

function paintSlime(name, small, col) {
  const k = small ? 0.62 : 1;
  const s = (v) => Math.round(v * k);
  paint(name, s(26), s(20), (x) => {
    E(x, s(13), s(13), s(12), s(6), col);
    E(x, s(13), s(9), s(9), s(8), col);
    E(x, s(5), s(17), s(2), s(2), col);
    E(x, s(20), s(18), s(2), s(1), col);
  }, {
    detail: (x) => {
      E(x, s(9), s(5), Math.max(1, s(3)), Math.max(1, s(2)), '#ffffff');
      for (const cx of [10, 17]) {
        RR(x, s(cx - 1), s(9), Math.max(2, s(3)), Math.max(2, s(4)), 1, '#1a0e10');
        R(x, s(cx - 1), s(9), 1, 1, '#ffffff');
      }
      R(x, s(12), s(15), Math.max(2, s(4)), 1, '#1a0e10');
    },
  });
}

function paintSpambot(name, screen, bulb, bodyCol = '#9aa2b4') {
  paint(name, 24, 28, (x) => {
    R(x, 11, 1, 2, 5, '#4a4452');
    E(x, 12, 2, 2, 2, bulb);
    RR(x, 6, 25, 4, 3, 1, '#3a3a48');
    RR(x, 14, 25, 4, 3, 1, '#3a3a48');
    RR(x, 5, 17, 14, 9, 3, tone(bodyCol, -0.12));
    RR(x, 2, 5, 20, 14, 6, bodyCol);
  }, {
    detail: (x) => {
      RR(x, 5, 8, 14, 8, 2, screen);
      R(x, 7, 10, 3, 2, '#ffffff');
      R(x, 14, 10, 3, 2, '#ffffff');
      R(x, 8, 13, 8, 1, tone(screen, 0.3));
      R(x, 8, 19, 8, 5, '#f0f0f0');
      LN(x, 8, 19, 11, 22, '#8a8290');
      LN(x, 15, 19, 12, 22, '#8a8290');
    },
  });
}

function paintCaptcha(name, fire) {
  paint(name, 28, 28, (x) => {
    RR(x, 4, 22, 5, 6, 1, '#3a3a48');
    RR(x, 19, 22, 5, 6, 1, '#3a3a48');
    RR(x, 1, 1, 26, 23, 3, '#e4e4ee');
  }, {
    detail: (x) => {
      R(x, 4, 5, 9, 9, '#8a8a9a');
      R(x, 5, 6, 7, 7, '#ffffff');
      if (fire) {
        LN(x, 6, 9, 8, 11, '#30a040', 2);
        LN(x, 8, 11, 12, 5, '#30a040', 2);
      }
      R(x, 15, 6, 9, 2, '#a8a8b8');
      R(x, 15, 10, 6, 2, '#a8a8b8');
      E(x, 20, 18, 3, 3, fire ? '#e84040' : '#3a80e0');
      E(x, 20, 18, 1, 1, '#ffffff');
      R(x, 4, 17, 10, 1, '#c8c8d8');
    },
  });
}

function paintGhost(name, frame, col) {
  paint(name, 26, 28, (x) => {
    E(x, 13, 11, 11, 11, col);
    R(x, 2, 11, 23, 12, col);
    for (let i = 0; i < 4; i++) {
      const cx = 5 + i * 6 - (frame ? 1 : 0);
      E(x, cx, 23 + ((i + frame) % 2 ? 2 : 0), 3, 3, col);
    }
  }, {
    detail: (x) => {
      E(x, 9, 11, 3, 4, '#1a0e10');
      E(x, 17, 11, 3, 4, '#1a0e10');
      R(x, 9, 11, 1, 1, '#ffffff');
      R(x, 17, 11, 1, 1, '#ffffff');
      E(x, 13, 18, 2, 3, '#1a0e10');
      E(x, 8, 5, 2, 1, '#ffffff');
    },
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
  for (const rage of [0, 1]) {
    const body = rage ? '#b83848' : '#4a9a3a';
    for (const f of [0, 1]) {
      paint(`bb_${rage}_${f}`, 60, 48, (x) => {
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
    normal: ['#7a6a60', '#8a7a8a', '#9a6ac0'][themeId - 1],
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
    const wood = ['#7a4a2c', '#4a5a74', '#5a3a80'][themeId - 1];
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
  for (const dir of ['down', 'left', 'right', 'up']) {
    for (const f of [0, 1]) {
      paintClaude(`claude_${dir}_${f}`, 1, dir, f, false);
      paintClaude(`claudeXL_${dir}_${f}`, 2, dir, f, false);
    }
  }
  paintClaude('claude_blink', 1, 'down', 0, true);
  for (const dir of ['down', 'right', 'up']) paintClaude(`claudeXXL_${dir}_0`, 3, dir, 0, false);
  paintClaude('claudeXXL_blink', 3, 'down', 0, true);
  // Accessoires des illustrations
  paint('book', 16, 12, (x) => {
    R(x, 0, 0, 16, 12, '#c83a3a');
    R(x, 2, 9, 14, 3, '#f0e8d8');
  }, { detail: (x) => { R(x, 2, 2, 2, 7, '#f8d048'); } });
  paint('book2', 16, 12, (x) => {
    R(x, 0, 0, 16, 12, '#3a7ad0');
    R(x, 2, 9, 14, 3, '#f0e8d8');
  }, { detail: (x) => { R(x, 2, 2, 2, 7, '#f0f0f0'); } });
  paint('bulb', 12, 16, (x) => {
    E(x, 6, 6, 6, 6, '#fff08a');
    R(x, 3, 11, 6, 5, '#9a9aa8');
  }, { detail: (x) => { R(x, 3, 3, 2, 2, '#ffffff'); R(x, 3, 13, 6, 1, '#6a6a78'); } });
  paint('redbutton', 34, 20, (x) => {
    R(x, 0, 12, 34, 8, '#3a3a44');
    E(x, 17, 10, 14, 7, '#e02830');
  }, { detail: (x) => { E(x, 12, 7, 4, 2, '#ff9090'); } });
  paintClaude('claudeXL_blink', 2, 'down', 0, true);
  paintSam('sam', 1, false);
  paintSam('samXL', 2, false);
  paintSam('samXL_angry', 2, true);
  const bugCols = [['bug', '#5aa844', '#2e5a28'], ['bug2', '#d04848', '#6a2030'], ['bug3', '#d860b0', '#6a2860']];
  for (const [n, b, d] of bugCols) {
    paintBug(n + '_a', 0, b, d);
    paintBug(n + '_b', 1, b, d);
  }
  paintFly('fly_a', 0);
  paintFly('fly_b', 1);
  paintSlime('slime', false, '#6ac04a');
  paintSlime('slime_s', true, '#6ac04a');
  paintSlime('slime2', false, '#58c0e0');
  paintSlime('slime2_s', true, '#58c0e0');
  paintSpambot('spambot', '#203048', '#f8d048');
  paintSpambot('spambot_fire', '#502028', '#ff4050');
  paintSpambot('vendor', '#1a4020', '#78d05a', '#c0c8a0');
  paintCaptcha('captcha', false);
  paintCaptcha('captcha_fire', true);
  paintGhost('ghost', 0, '#c8aef0');
  paintGhost('ghost_b', 1, '#c8aef0');
  paintPickups();
  paintRocks();
  paintBosses();
}

buildHD();
