// Constantes et petites fonctions utilitaires partagées par tout le jeu.

const W = 320;
const H = 180;
const TILE = 16;
const ROOM_W = 15; // en tuiles, murs compris
const ROOM_H = 9;
const RX = 40; // position de la salle à l'écran
const RY = 34;
const ROOM_PX_W = ROOM_W * TILE; // 240
const ROOM_PX_H = ROOM_H * TILE; // 144

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function norm(x, y) {
  const l = Math.hypot(x, y);
  return l > 0 ? { x: x / l, y: y / l } : { x: 0, y: 0 };
}

// Rectangle aligné sur la grille de pixels.
function rect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// Ellipse pleine "pixel perfect" (aucun anticrénelage).
function fillEllipse(ctx, cx, cy, rx, ry, color) {
  ctx.fillStyle = color;
  cx = Math.round(cx);
  cy = Math.round(cy);
  ry = Math.max(1, Math.round(ry));
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

// Ellipse dessinée à la résolution HD (2x) : contours plus fins.
function fillEllipseHD(ctx, cx, cy, rx, ry, color) {
  ctx.save();
  ctx.scale(0.5, 0.5);
  fillEllipse(ctx, cx * 2, cy * 2, Math.max(1, Math.round(rx * 2)), Math.max(1, Math.round(ry * 2)), color);
  ctx.restore();
}

// Ombre au sol sous une entité.
function drawShadow(ctx, x, y, rx, ry = 2) {
  ctx.save();
  ctx.globalAlpha *= 0.35;
  fillEllipseHD(ctx, x, y, rx, ry, '#000');
  ctx.restore();
}

// --- Couleurs et tramage (Bayer 4x4)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

// Bruit déterministe par pixel.
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Quantifie une valeur 0..1 en paliers tramés (look 16 bits).
function dq(v, x, y, steps = 4) {
  return clamp(Math.floor(v * steps + bayer(x, y)) / steps, 0, 1);
}

// Sauvegarde locale tolérante aux erreurs (navigation privée, etc.).
const Store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('tboc_' + k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('tboc_' + k, JSON.stringify(v));
    } catch (e) { /* ignoré */ }
  },
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}
