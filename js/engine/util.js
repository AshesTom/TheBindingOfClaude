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

// Ombre au sol sous une entité.
function drawShadow(ctx, x, y, rx, ry = 2) {
  ctx.save();
  ctx.globalAlpha = 0.35;
  fillEllipse(ctx, x, y, rx, ry, '#000');
  ctx.restore();
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
