// Pixel art : palette + sprites décrits en texte, convertis en canvas au chargement.

const PAL = {
  K: '#1a1016', // contour
  O: '#d97757', // orange Claude
  o: '#a8513a',
  h: '#f2a88a',
  W: '#ffffff',
  w: '#c8c0c8',
  g: '#8a8290',
  G: '#4a4452',
  R: '#e8404a',
  r: '#8c2030',
  P: '#a86ae8',
  p: '#5c3090',
  B: '#4aa0f0',
  b: '#2a5098',
  C: '#7fe8f0',
  L: '#78d05a',
  l: '#3a7a3a',
  Y: '#f8d048',
  y: '#b88a20',
  N: '#8a5a34',
  n: '#4a3020',
  S: '#f4e8d0',
  M: '#f070b8',
  m: '#902868',
  H: '#ffd8c4', // reflet Claude
  d: '#6e3226', // ombre profonde Claude
  F: '#f2c8a0', // peau
  f: '#c08a68',
  n2: '#5a3a28',
};

// ---------------------------------------------------------------------------
// Rampes de couleurs "16 bits" : éclaircir vers le jaune, assombrir vers le violet.

function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) => Math.round(clamp((v + m) * 255, 0, 255)).toString(16).padStart(2, '0');
  return '#' + to(r) + to(g) + to(b);
}

function moveHue(h, target, deg) {
  let d = ((target - h + 540) % 360) - 180;
  return h + Math.sign(d) * Math.min(Math.abs(d), deg);
}

const toneCache = {};
// amt > 0 : plus clair ; amt < 0 : plus sombre.
function tone(hex, amt) {
  const key = hex + amt;
  if (toneCache[key]) return toneCache[key];
  let [h, s, l] = hexToHsl(hex);
  if (amt > 0) {
    h = moveHue(h, 55, 40 * amt);
    l = Math.min(0.96, l + amt);
  } else {
    h = moveHue(h, 255, -60 * amt);
    l = Math.max(0.03, l + amt);
    s = Math.min(1, s * 1.08);
  }
  toneCache[key] = hslToHex(h, s, l);
  return toneCache[key];
}

const SPR = {};

function silhouette(src, color) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

const NO_SHADE = new Set(['K', 'W', '.', ' ']);

function makeSprite(name, rows, swap, opts = {}) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const grid = rows.map((r) => {
    const out = [];
    for (let i = 0; i < w; i++) {
      let ch = r[i] || '.';
      if (swap && swap[ch]) ch = swap[ch];
      out.push(ch);
    }
    return out;
  });
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  const edge = (i, j) => {
    if (i < 0 || j < 0 || i >= w || j >= h) return true;
    const ch = grid[j][i];
    return ch === '.' || ch === ' ' || ch === 'K';
  };
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const ch = grid[j][i];
      if (ch === '.' || ch === ' ') continue;
      let col = PAL[ch] || ch;
      if (opts.shade !== false && !NO_SHADE.has(ch)) {
        const up = edge(i, j - 1);
        const down = edge(i, j + 1);
        const left = edge(i - 1, j);
        const right = edge(i + 1, j);
        const score = (up ? 2 : 0) + (left ? 1 : 0) - (down ? 2 : 0) - (right ? 1 : 0);
        if (up && left) col = tone(col, 0.2);
        else if (score >= 2) col = tone(col, 0.12);
        else if (score >= 1) col = tone(col, 0.06);
        else if (score <= -2) col = tone(col, -0.16);
        else if (score <= -1) col = tone(col, -0.08);
      }
      x.fillStyle = col;
      x.fillRect(i, j, 1, 1);
    }
  }
  SPR[name] = { img: c, white: silhouette(c, '#ffffff'), w, h };
  return SPR[name];
}

// Dessine un sprite. o : { flash, flip, alpha, scale, tint }
function drawSpr(ctx, name, x, y, o = {}) {
  const s = SPR[name];
  if (!s) return;
  let img = s.img;
  if (o.flash) img = s.white;
  else if (o.tint) {
    s.tints = s.tints || {};
    if (!s.tints[o.tint]) s.tints[o.tint] = silhouette(s.img, o.tint);
    img = s.tints[o.tint];
  }
  const sc = o.scale || 1;
  const needSave = o.alpha !== undefined || o.flip;
  if (needSave) ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.flip) {
    ctx.translate(Math.round(x) + s.w * sc, Math.round(y));
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, s.w * sc, s.h * sc);
  } else {
    ctx.drawImage(img, Math.round(x), Math.round(y), s.w * sc, s.h * sc);
  }
  if (needSave) ctx.restore();
}

// Dessine un sprite ancré en bas au centre, avec écrasement / étirement (sx, sy).
function drawSprSquash(ctx, name, cx, by, sx = 1, sy = 1, o = {}) {
  const s = SPR[name];
  if (!s) return;
  let img = s.img;
  if (o.flash) img = s.white;
  else if (o.tint) {
    s.tints = s.tints || {};
    if (!s.tints[o.tint]) s.tints[o.tint] = silhouette(s.img, o.tint);
    img = s.tints[o.tint];
  }
  // Tout est calé sur la grille HD (1 px réel) : dimensions et position entières,
  // pour qu'aucun pixel ne tombe entre deux.
  const wh = Math.max(1, Math.round(s.w * sx * 2));
  const hh = Math.max(1, Math.round(s.h * sy * 2));
  const px = Math.round(cx * 2);
  const py = Math.round(by * 2);
  const left = -(wh >> 1);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(px / 2, py / 2);
  if (o.flip) ctx.scale(-1, 1);
  ctx.drawImage(img, left / 2, -hh / 2, wh / 2, hh / 2);
  if (o.rim && o.rim.a > 0 && !o.flash) {
    // Liseré de lumière : paliers d'intensité quantifiés (pas de fondu continu)
    let d = o.rim.dir;
    if (o.flip) d = (12 - d) % 8;
    ctx.globalAlpha *= Math.min(1, Math.ceil(o.rim.a * 3) / 3);
    ctx.drawImage(rimTinted(s, d, o.rim.color || '#ffffff'), left / 2, -hh / 2, wh / 2, hh / 2);
  }
  ctx.restore();
}

// Dessine un sprite centré sur (cx, cy).
function drawSprC(ctx, name, cx, cy, o = {}) {
  const s = SPR[name];
  if (!s) return;
  const sc = o.scale || 1;
  drawSpr(ctx, name, cx - Math.floor((s.w * sc) / 2), cy - Math.floor((s.h * sc) / 2), o);
}

// ---------------------------------------------------------------------------
// Claude (inspiré de la mascotte pixel de Claude Code)

function clawdRows(dir, frame, blink) {
  const body = [
    'HHhhhhhhhhhhhh',
    'Hhhhhhhhhhhhhh',
    'hhOOOOOOOOOOOo',
    'hOOOOOOOOOOOOo',
    'hOOOOOOOOOOOOo',
    'OOOOOOOOOOOOoo',
    'OOOOOOOOOOOOoo',
    'oOOOOOOOOOOooo',
    'oooooooooooood',
  ];
  const sides = {
    4: ['KKK', 'KKK'],
    5: ['KHO', 'ooK'],
    6: ['KhO', 'odK'],
    7: ['KKK', 'KKK'],
  };
  const rows = [' '.repeat(20), '...KKKKKKKKKKKKKK...'];
  body.forEach((b, i) => {
    const [l, r] = sides[i] || ['..K', 'K..'];
    rows.push(l + b + r);
  });
  rows.push('...KKKKKKKKKKKKKK...');
  for (let i = 0; i < 4; i++) rows.push(' '.repeat(20));
  const g = rows.map((r) => r.split(''));
  let eyes = [6, 12];
  if (dir === 'left') eyes = [5, 11];
  if (dir === 'right') eyes = [7, 13];
  if (dir !== 'up') {
    for (const c of eyes) {
      if (!blink) {
        g[4][c] = 'W'; g[4][c + 1] = 'K';
        g[5][c] = 'K'; g[5][c + 1] = 'K';
      }
      g[6][c] = 'K'; g[6][c + 1] = 'K';
    }
  } else {
    // Dos : petite couture plus sombre
    for (let c = 7; c < 13; c++) g[9][c] = 'o';
  }
  const legs = [[4, 5], [7, 8], [11, 12], [14, 15]];
  legs.forEach((lg, i) => {
    const short = frame === 1 && i % 2 === 1;
    const cols = short ? ['o', 'd'] : ['o', 'o', 'd'];
    cols.forEach((col, k) => {
      for (const c of lg) g[12 + k][c] = c === lg[1] ? (col === 'o' ? 'o' : 'd') : (col === 'o' ? 'O' : 'o');
    });
  });
  return g.map((r) => r.join(''));
}

function buildClaude() {
  for (const dir of ['down', 'left', 'right', 'up']) {
    for (const f of [0, 1]) makeSprite(`claude_${dir}_${f}`, clawdRows(dir, f, false), null, { shade: false });
  }
  makeSprite('claude_blink', clawdRows('down', 0, true), null, { shade: false });
}

// Lueur (pour les tirs et les lumières) : disque tramé.
function makeGlow(name, r, color) {
  const c = document.createElement('canvas');
  c.width = c.height = r * 2 + 1;
  const x = c.getContext('2d');
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  x.fillStyle = color;
  for (let j = -r; j <= r; j++) {
    for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j) / r;
      if (d > 1) continue;
      const level = (1 - d) * 16;
      if (level > bayer[((j + 64) % 4) * 4 + ((i + 64) % 4)]) x.fillRect(i + r, j + r, 1, 1);
    }
  }
  SPR[name] = { img: c, white: c, w: c.width, h: c.height };
}

// ---------------------------------------------------------------------------
// Ennemis

const SPRITE_DEFS = {
  bug_a: [
    '..K......K..',
    '...K....K...',
    '..KKKKKKKK..',
    '.KLLLLLLLLK.',
    'KKLWKLLWKLKK',
    '.KLLLLLLLLK.',
    'KKllllllllKK',
    '.KllLllLllK.',
    'K.KKKKKKKK.K',
    '.K..K..K..K.',
  ],
  bug_b: [
    '...K....K...',
    '...K....K...',
    '..KKKKKKKK..',
    '.KLLLLLLLLK.',
    'KKLWKLLWKLKK',
    '.KLLLLLLLLK.',
    'KKllllllllKK',
    '.KllLllLllK.',
    '.KKKKKKKKKK.',
    'K..K....K..K',
  ],
  fly_a: [
    'ww....ww',
    'wwwKKwww',
    '.wKRRKw.',
    '..KRRK..',
    '..KRRK..',
    '...KK...',
  ],
  fly_b: [
    '........',
    '...KK...',
    'wwKRRKww',
    'wwKRRKww',
    '..KRRK..',
    '...KK...',
  ],
  ghost: [
    '....KKKKKK....',
    '..KKPPPPPPKK..',
    '.KPPPPPPPPPPK.',
    '.KPPWWPPWWPPK.',
    'KPPPWKPPWKPPPK',
    'KPPPPPPPPPPPPK',
    'KPPPPPKKPPPPPK',
    'KPPPPKppKPPPPK',
    'KPPPPPPPPPPPPK',
    'KPPPPPPPPPPPPK',
    'KPpPPpPPPpPPpK',
    'KpKpKpKKpKpKpK',
    '.K.K.K..K.K.K.',
  ],
  spambot: [
    '.....KK.....',
    '.....YK.....',
    '...KKKKKK...',
    '..KggggggK..',
    '.KgBBBBBBgK.',
    '.KgBKBBKBgK.',
    '.KgBBBBBBgK.',
    '..KggggggK..',
    '.KKGGGGGGKK.',
    'KgKGRRRRGKgK',
    'KgKGGGGGGKgK',
    '.K.KGGGGK.K.',
    '...KK..KK...',
    '...KK..KK...',
  ],
  captcha: [
    'KKKKKKKKKKKKKK',
    'KwwwwwwwwwwwwK',
    'KwKKKKwwwwwwwK',
    'KwKWWKwggggwwK',
    'KwKWWKwwwwwwwK',
    'KwKKKKwggggwwK',
    'KwwwwwwwwwwwwK',
    'KwwwwwwwBBBwwK',
    'KwwwwwwwBwBwwK',
    'KwwwwwwwBBBwwK',
    'KwwwwwwwwwwwwK',
    'KKKKKKKKKKKKKK',
    '.KGGK....KGGK.',
    '.KKKK....KKKK.',
  ],
  slime: [
    '....KKKK....',
    '..KKLLLLKK..',
    '.KLLWLLLLLK.',
    '.KLWLLLLLLK.',
    'KLLLKLLKLLLK',
    'KLLLKLLKLLLK',
    'KLLLLLLLLLLK',
    'KlLLLLLLLLlK',
    '.KllllllllK.',
    '..KKKKKKKK..',
  ],
  slime_s: [
    '..KKKK..',
    '.KLWLLK.',
    'KLKLLKLK',
    'KLLLLLLK',
    'KlLLLLlK',
    '.KKKKKK.',
  ],

  // Sam Altman (caricature)
  sam: [
    '...KKKKKK...',
    '..KnnnnnnK..',
    '.KnnnnnnnnK.',
    '.KnFFnnFFnK.',
    '.KFFFFFFFFK.',
    '.KFKFFFFKFK.',
    '.KFFFFFFFFK.',
    '.KFFFffFFFK.',
    '..KFFFFFFK..',
    '...KFFFFK...',
    '.KKGGGGGGKK.',
    'KGGGGGGGGGGK',
    'KGGGgGGgGGGK',
    'KGKGGGGGGKGK',
    'KFKGGGGGGKFK',
    '..KGGGGGGK..',
    '..KbbbbbbK..',
    '..KbbKKbbK..',
    '..KbbK.KbbK.',
    '..KKKK.KKKK.',
  ],

  // Projectiles
  tear: [
    '...h...',
    '.h.O.h.',
    '..OWO..',
    'hOWWWOh',
    '..OWO..',
    '.h.O.h.',
    '...h...',
  ],
  tear_big: [
    '....h....',
    '.h..O..h.',
    '..hOOOh..',
    '..OOWOO..',
    'hOOWWWOOh',
    '..OOWOO..',
    '..hOOOh..',
    '.h..O..h.',
    '....h....',
  ],
  eb: [
    '.KKKK.',
    'KRRRRK',
    'KRWRRK',
    'KRRRRK',
    'KrRRrK',
    '.KKKK.',
  ],

  // HUD & ramassables
  heart_full: [
    '.KK.KK.',
    'KRRKRRK',
    'KRWRRRK',
    'KRRRRRK',
    '.KRRRK.',
    '..KRK..',
    '...K...',
  ],
  heart_half: [
    '.KK.KK.',
    'KRRKGGK',
    'KRWRGGK',
    'KRRRGGK',
    '.KRRGK.',
    '..KRK..',
    '...K...',
  ],
  heart_empty: [
    '.KK.KK.',
    'KGGKGGK',
    'KGGGGGK',
    'KGGGGGK',
    '.KGGGK.',
    '..KGK..',
    '...K...',
  ],
  heart_shield: [
    '.KK.KK.',
    'KCCKCCK',
    'KCWCCCK',
    'KCCCCCK',
    '.KCCCK.',
    '..KCK..',
    '...K...',
  ],
  coin: [
    '..KKK..',
    '.KYYYK.',
    'KYWYYyK',
    'KYYYYyK',
    'KYYYyyK',
    '.KyyyK.',
    '..KKK..',
  ],
  key: [
    '..KKK..',
    '.KYYYK.',
    '.KYKYK.',
    '.KYYYK.',
    '..KYK..',
    '..KYYK.',
    '..KYK..',
    '..KYYK.',
    '..KKK..',
  ],
  pedestal: [
    '.KKKKKKKKKKKKKK.',
    'KwwwwwwwwwwwwwwK',
    'KggggggggggggggK',
    '.KgGGGGGGGGGGgK.',
    '.KgGGGGGGGGGGgK.',
    '.KgGGGGGGGGGGgK.',
    'KwwwwwwwwwwwwwwK',
    'KggggggggggggggK',
    '.KKKKKKKKKKKKKK.',
  ],

  // Icônes d'objets (12x12)
  it_gpu: [
    '..K.K.K.K...',
    '.KKKKKKKKKK.',
    'KKGGGGGGGGKK',
    '.KGLLLLLLGK.',
    'KKGLKKKKLGKK',
    '.KGLKLLKLGK.',
    'KKGLKLLKLGKK',
    '.KGLKKKKLGK.',
    'KKGLLLLLLGKK',
    '.KGGGGGGGGK.',
    '.KKKKKKKKKK.',
    '..K.K.K.K...',
  ],
  it_context: [
    'KKKKKKKKKKKK',
    'KBBBBBBBRYLK',
    'KKKKKKKKKKKK',
    'KWWWWWWWWWWK',
    'KWgggggWWWWK',
    'KWWWWWWWWWWK',
    'KWggggggggWK',
    'KWWWWWWWWWWK',
    'KWgggWWWWWWK',
    'KWWWWWWWWWWK',
    'KWWWWWWWWWWK',
    'KKKKKKKKKKKK',
  ],
  it_temperature: [
    '....KKK.....',
    '...KWWWK....',
    '...KWRWK.KK.',
    '...KWRWK....',
    '...KWRWK.KK.',
    '...KWRWK....',
    '...KWRWK.KK.',
    '..KWRRRWK...',
    '.KWRRRRRWK..',
    '.KWRRRRRWK..',
    '..KWRRRWK...',
    '...KKKKK....',
  ],
  it_attention: [
    '............',
    '....KKKK....',
    '..KKWWWWKK..',
    '.KWWWBBWWWK.',
    'KWWWBBBBWWWK',
    'KWWBBKKBBWWK',
    'KWWBBKKBBWWK',
    'KWWWBBBBWWWK',
    '.KWWWBBWWWK.',
    '..KKWWWWKK..',
    '....KKKK....',
    '............',
  ],
  it_finetune: [
    '..........KK',
    '.........KwK',
    '....KK..KwK.',
    '...KwwKKwK..',
    '...KwgwwK...',
    '....KwwK....',
    '...KwwK.....',
    '..KwwK......',
    '.KwwK.......',
    'KwwK........',
    'KwK.........',
    '.K..........',
  ],
  it_rlhf: [
    '............',
    '.KKK...KKK..',
    'KRRRK.KRRRK.',
    'KRWRRKRRRRK.',
    'KRRRRRRRRRK.',
    'KRRRRRRRRRK.',
    '.KRRRRRRRK..',
    '..KRRRRRK...',
    '...KRRRK....',
    '....KRK.....',
    '.....K......',
    '............',
  ],
  it_moe: [
    '............',
    '.KKKK..KKKK.',
    '.KOOK..KBBK.',
    '.KOOK..KBBK.',
    '.KKKK..KKKK.',
    '.....KK.....',
    '.....KK.....',
    '.KKKK..KKKK.',
    '.KLLK..KPPK.',
    '.KLLK..KPPK.',
    '.KKKK..KKKK.',
    '............',
  ],
  it_transformer: [
    '......KKKK..',
    '.....KYYYK..',
    '....KYYYK...',
    '...KYYYK....',
    '..KYYYYKKK..',
    '.KYYYYYYYK..',
    '.KKKKYYYK...',
    '....KYYK....',
    '...KYYK.....',
    '..KYYK......',
    '..KYK.......',
    '..KK........',
  ],
  it_dropout: [
    '............',
    '.CC.CC..CC..',
    '.CC.CC..CC..',
    '............',
    '.CC....CC.CC',
    '.CC....CC.CC',
    '............',
    '....CC.CC...',
    '....CC.CC...',
    '............',
    '.CC.CC....CC',
    '.CC.CC....CC',
  ],
  it_cot: [
    '............',
    '..KKKKKKKK..',
    '.KWWWWWWWWK.',
    'KWWWWWWWWWWK',
    'KWWKWWKWWKWK',
    'KWWWWWWWWWWK',
    '.KWWWWWWWWK.',
    '..KKKKKKKK..',
    '..KK........',
    '.KWK........',
    '.KK.........',
    '............',
  ],
  it_subagent: [
    '............',
    '............',
    '..KKKKKKKK..',
    '..KOOOOOOK..',
    '..KOKOOKOK..',
    'KKKOKOOKOKKK',
    'KOOOOOOOOOOK',
    'KKKOOOOOOKKK',
    '..KKKKKKKK..',
    '...o.o.o.o..',
    '...o.o.o.o..',
    '............',
  ],
  it_constitution: [
    '.KKKKKKKKK..',
    'KSSSSSSSSSK.',
    '.KSnnnnnSK..',
    '.KSSSSSSSK..',
    '.KSnnnnSSK..',
    '.KSSSSSSSK..',
    '.KSnnnnnSK..',
    '.KSSSSSSSK..',
    '.KSnnnSSSK..',
    '.KSSSSSSSK..',
    'KSSSSSSSSSK.',
    '.KKKKKKKKK..',
  ],
  it_cache: [
    'KKKKKKKKKK..',
    'KBBwwwwwBBK.',
    'KBBwwwKwBBBK',
    'KBBwwwKwBBBK',
    'KBBwwwwwBBBK',
    'KBBBBBBBBBBK',
    'KBWWWWWWWWBK',
    'KBWggggggWBK',
    'KBWWWWWWWWBK',
    'KBWggggggWBK',
    'KBWWWWWWWWBK',
    'KKKKKKKKKKKK',
  ],
  it_quant: [
    '............',
    '..........KK',
    '..........LL',
    '.......KK.LL',
    '.......LL.LL',
    '....KK.LL.LL',
    '....LL.LL.LL',
    '.KK.LL.LL.LL',
    '.LL.LL.LL.LL',
    '.LL.LL.LL.LL',
    '.LL.LL.LL.LL',
    '............',
  ],
  it_gradient: [
    'KK..........',
    'KBK.........',
    'KBBK........',
    'KBBBK.......',
    '.KBBBK......',
    '..KBBBK.....',
    '...KBBBK..K.',
    '....KBBBKKBK',
    '.....KBBBBBK',
    '......KBBBBK',
    '.....KBBBBBK',
    '.....KKKKKKK',
  ],
  it_mcp: [
    '...K..K.....',
    '...K..K.....',
    '..KKKKKK....',
    '..KwwwwK....',
    '..KwwwwK....',
    '..KwwwwK....',
    '...KwwK.....',
    '....KK......',
    '....KK......',
    '....KKKKK...',
    '........K...',
    '........KKK.',
  ],
  it_coffee: [
    '...w..w.....',
    '....w..w....',
    '...w..w.....',
    '............',
    '.KKKKKKKK...',
    '.KSSSSSSKKK.',
    '.KnnnnnnK.K.',
    '.KSnnnnSK.K.',
    '.KSSSSSSKKK.',
    '.KSSSSSSK...',
    '..KKKKKK....',
    '............',
  ],
  it_embed: [
    '............',
    '.K...K...K..',
    'KMK.KPK.KBK.',
    '.K...K...K..',
    '..K.K.K.K...',
    '...K...K....',
    '..K.K.K.K...',
    '.K...K...K..',
    'KBK.KMK.KPK.',
    '.K...K...K..',
    '............',
    '............',
  ],
};

function buildSprites() {
  buildClaude();
  for (const [name, rows] of Object.entries(SPRITE_DEFS)) makeSprite(name, rows);
  // Variantes de couleurs
  makeSprite('bug2_a', SPRITE_DEFS.bug_a, { L: 'R', l: 'r' });
  makeSprite('bug2_b', SPRITE_DEFS.bug_b, { L: 'R', l: 'r' });
  makeSprite('bug3_a', SPRITE_DEFS.bug_a, { L: 'M', l: 'm' });
  makeSprite('bug3_b', SPRITE_DEFS.bug_b, { L: 'M', l: 'm' });
  makeSprite('slime2', SPRITE_DEFS.slime, { L: 'C', l: 'b' });
  makeSprite('slime2_s', SPRITE_DEFS.slime_s, { L: 'C', l: 'b' });
  makeSprite('spambot_fire', SPRITE_DEFS.spambot, { B: 'R', Y: 'R' });
  makeSprite('vendor', SPRITE_DEFS.spambot, { B: 'L', R: 'Y', g: 'w' });
  makeSprite('captcha_fire', SPRITE_DEFS.captcha, { W: 'L', B: 'R' });
  makeSprite('eb_purple', SPRITE_DEFS.eb, { R: 'P', r: 'p', W: 'M' });
  makeSprite('eb_clip', SPRITE_DEFS.eb, { R: 'w', r: 'g' });
  makeSprite('eb_blue', SPRITE_DEFS.eb, { R: 'B', r: 'b', W: 'C' });
  makeSprite('tear_blue', SPRITE_DEFS.tear, { O: 'B', h: 'C' });
  makeSprite('eb_gold', SPRITE_DEFS.eb, { R: 'Y', r: 'y' });
  makeGlow('glow_orange', 7, '#ff9a60');
  makeGlow('glow_red', 6, '#ff4050');
  makeGlow('glow_purple', 6, '#c070ff');
  makeGlow('glow_blue', 6, '#60c0ff');
  makeGlow('glow_gold', 6, '#ffd040');
  makeGlow('glow_white', 6, '#ffffff');
  makeGlow('glow_big', 14, '#ff9a60');
}

buildSprites();
