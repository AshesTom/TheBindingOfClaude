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
};

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

function makeSprite(name, rows, swap) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < rows[j].length; i++) {
      let ch = rows[j][i];
      if (ch === '.' || ch === ' ') continue;
      if (swap && swap[ch]) ch = swap[ch];
      x.fillStyle = PAL[ch] || ch;
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
  const rows = [
    '................',
    '..KKKKKKKKKKKK..',
    '..KhhhhhhhhhhK..',
    '..KhOOOOOOOOOK..',
    '..KOOOOOOOOOOK..',
    'KKKOOOOOOOOOOKKK',
    'KhOOOOOOOOOOOOoK',
    'KOoOOOOOOOOOOooK',
    'KKKOOOOOOOOOOKKK',
    '..KoOOOOOOOOoK..',
    '..KKKKKKKKKKKK..',
    '................',
    '................',
    '................',
    '................',
  ].map((r) => r.split(''));
  let eyes = [5, 10];
  if (dir === 'left') eyes = [4, 9];
  if (dir === 'right') eyes = [6, 11];
  if (dir !== 'up') {
    for (const c of eyes) {
      if (!blink) rows[3][c] = 'K';
      rows[4][c] = 'K';
    }
  }
  const legs = frame === 0 ? [3, 5, 10, 12] : [4, 6, 9, 11];
  for (const c of legs) {
    rows[11][c] = 'o';
    rows[12][c] = 'o';
    rows[13][c] = 'K';
  }
  return rows.map((r) => r.join(''));
}

function buildClaude() {
  for (const dir of ['down', 'left', 'right', 'up']) {
    for (const f of [0, 1]) makeSprite(`claude_${dir}_${f}`, clawdRows(dir, f, false));
  }
  makeSprite('claude_blink', clawdRows('down', 0, true));
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
}

buildSprites();
