// Constantes, maths et petites fonctions partagées par tout le jeu.

const W = 480;
const H = 270;

// Salle façon Isaac : 13 x 7 cases de sol entourées de murs épais.
const TILE = 26;
const GW = 13;
const GH = 7;
const FX = 71; // coin haut-gauche du sol, à l'écran
const FY = 50;
const FW = GW * TILE; // 338
const FH = GH * TILE; // 182
const FX2 = FX + FW;
const FY2 = FY + FH;
const CX = FX + FW / 2;
const CY = FY + FH / 2;

const DIRS = {
  up: { dx: 0, dy: -1, x: CX, y: FY, cell: [6, 0], opp: 'down' },
  down: { dx: 0, dy: 1, x: CX, y: FY2, cell: [6, 6], opp: 'up' },
  left: { dx: -1, dy: 0, x: FX, y: CY, cell: [0, 3], opp: 'right' },
  right: { dx: 1, dy: 0, x: FX2, y: CY, cell: [12, 3], opp: 'left' },
};
const DIR_NAMES = ['up', 'down', 'left', 'right'];

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const chance = (p) => Math.random() < p;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const TAU = Math.PI * 2;

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

function weighted(list, wKey = 'w') {
  let t = 0;
  for (const e of list) t += e[wKey] || 1;
  let r = Math.random() * t;
  for (const e of list) {
    r -= e[wKey] || 1;
    if (r <= 0) return e;
  }
  return list[list.length - 1];
}

// Générateur pseudo-aléatoire déterministe (textures procédurales).
function RNG(seed) {
  let a = seed >>> 0;
  const f = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.range = (a2, b2) => a2 + f() * (b2 - a2);
  f.int = (a2, b2) => Math.floor(a2 + f() * (b2 - a2 + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  return f;
}

function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Bruit de valeur lissé (pour les textures de sol et de mur).
function vnoise(x, y, s = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s);
  const b = hash2(xi + 1, yi, s);
  const c = hash2(xi, yi + 1, s);
  const d = hash2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function fbm(x, y, s = 0, oct = 3) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i++) {
    v += vnoise(x * f, y * f, s + i * 17) * amp;
    f *= 2;
    amp *= 0.5;
  }
  return v / (1 - Math.pow(0.5, oct));
}

// --- Couleurs
function rgb(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex(r, g, b) {
  const c = (v) => clamp(Math.round(v), 0, 255);
  return '#' + ((1 << 24) | (c(r) << 16) | (c(g) << 8) | c(b)).toString(16).slice(1);
}

function mix(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return hex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}

// f > 0 éclaircit, f < 0 assombrit (vers un brun chaud plutôt que le noir, façon Rebirth).
function shade(c, f) {
  return f >= 0 ? mix(c, '#fff4e0', f) : mix(c, '#140a0c', -f);
}

// Sauvegarde locale tolérante aux erreurs (navigation privée, etc.).
const Store = {
  get(k, d) {
    try {
      const v = localStorage.getItem('taoc_' + k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem('taoc_' + k, JSON.stringify(v));
    } catch (e) { /* ignoré */ }
  },
  del(k) {
    try {
      localStorage.removeItem('taoc_' + k);
    } catch (e) { /* ignoré */ }
  },
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + (sec < 10 ? '0' : '') + sec;
}

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

// Conversions grille <-> écran
const cellX = (gx) => FX + gx * TILE + TILE / 2;
const cellY = (gy) => FY + gy * TILE + TILE / 2;
const toGX = (x) => Math.floor((x - FX) / TILE);
const toGY = (y) => Math.floor((y - FY) / TILE);
