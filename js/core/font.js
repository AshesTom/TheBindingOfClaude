// Police bitmap « griffonnée » (majuscules, minuscules, accents), rendue en cache par couleur.
// Hauteur des capitales : 7 px, jambages : 2 px. Les accents sont composés automatiquement.

const GLYPHS = {
  A: '.##..|#..#.|#..#.|####.|#..#.|#..#.|#..#.',
  B: '###..|#..#.|#..#.|###..|#..#.|#..#.|###..',
  C: '.###|#...|#...|#...|#...|#...|.###',
  D: '###..|#..#.|#..#.|#..#.|#..#.|#..#.|###..',
  E: '####|#...|#...|###.|#...|#...|####',
  F: '####|#...|#...|###.|#...|#...|#...',
  G: '.###.|#....|#....|#.##.|#..#.|#..#.|.###.',
  H: '#..#|#..#|#..#|####|#..#|#..#|#..#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..##|...#|...#|...#|...#|#..#|.##.',
  K: '#..#|#..#|#.#.|##..|#.#.|#..#|#..#',
  L: '#...|#...|#...|#...|#...|#...|####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#..#|##.#|##.#|#.##|#.##|#..#|#..#',
  O: '.##.|#..#|#..#|#..#|#..#|#..#|.##.',
  P: '###.|#..#|#..#|###.|#...|#...|#...',
  Q: '.##.|#..#|#..#|#..#|#..#|#.#.|.#.#',
  R: '###.|#..#|#..#|###.|#.#.|#..#|#..#',
  S: '.###|#...|#...|.##.|...#|...#|###.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#..#|#..#|#..#|#..#|#..#|#..#|.##.',
  V: '#...#|#...#|#...#|.#.#.|.#.#.|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '####|...#|..#.|.#..|#...|#...|####',
  a: '....|....|.##.|...#|.###|#..#|.###',
  b: '#...|#...|###.|#..#|#..#|#..#|###.',
  c: '...|...|.##|#..|#..|#..|.##',
  d: '...#|...#|.###|#..#|#..#|#..#|.###',
  e: '....|....|.##.|#..#|####|#...|.###',
  f: '.##|#..|#..|##.|#..|#..|#..',
  g: '....|....|.###|#..#|#..#|#..#|.###|...#|.##.',
  h: '#...|#...|###.|#..#|#..#|#..#|#..#',
  i: '#|.|#|#|#|#|#',
  j: '.#|..|.#|.#|.#|.#|.#|.#|#.',
  k: '#...|#...|#..#|#.#.|##..|#.#.|#..#',
  l: '#.|#.|#.|#.|#.|#.|.#',
  m: '.....|.....|####.|#.#.#|#.#.#|#.#.#|#.#.#',
  n: '....|....|###.|#..#|#..#|#..#|#..#',
  o: '....|....|.##.|#..#|#..#|#..#|.##.',
  p: '....|....|###.|#..#|#..#|#..#|###.|#...|#...',
  q: '....|....|.###|#..#|#..#|#..#|.###|...#|...#',
  r: '...|...|#.#|##.|#..|#..|#..',
  s: '...|...|.##|#..|.#.|..#|##.',
  t: '#..|#..|##.|#..|#..|#..|.##',
  u: '....|....|#..#|#..#|#..#|#..#|.###',
  v: '...|...|#.#|#.#|#.#|#.#|.#.',
  w: '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.',
  x: '...|...|#.#|#.#|.#.|#.#|#.#',
  y: '....|....|#..#|#..#|#..#|#..#|.###|...#|.##.',
  z: '...|...|###|..#|.#.|#..|###',
  0: '.##.|#..#|#.##|##.#|#..#|#..#|.##.',
  1: '.#.|##.|.#.|.#.|.#.|.#.|###',
  2: '.##.|#..#|...#|..#.|.#..|#...|####',
  3: '###.|...#|...#|.##.|...#|...#|###.',
  4: '..#.|.##.|#.#.|#.#.|####|..#.|..#.',
  5: '####|#...|###.|...#|...#|#..#|.##.',
  6: '.##.|#...|#...|###.|#..#|#..#|.##.',
  7: '####|...#|..#.|..#.|.#..|.#..|.#..',
  8: '.##.|#..#|#..#|.##.|#..#|#..#|.##.',
  9: '.##.|#..#|#..#|.###|...#|...#|.##.',
  '.': '.|.|.|.|.|.|#',
  ',': '.|.|.|.|.|.|#|#',
  '!': '#|#|#|#|#|.|#',
  '?': '.##.|#..#|...#|..#.|.#..|....|.#..',
  ':': '.|.|#|.|.|.|#',
  ';': '.|.|#|.|.|.|#|#',
  "'": '#|#|.|.|.|.|.',
  '"': '#.#|#.#|...|...|...|...|...',
  '-': '...|...|...|###|...|...|...',
  '+': '...|...|.#.|###|.#.|...|...',
  '=': '...|...|###|...|###|...|...',
  '/': '..#|..#|.#.|.#.|.#.|#..|#..',
  '(': '.#|#.|#.|#.|#.|#.|.#',
  ')': '#.|.#|.#|.#|.#|.#|#.',
  '<': '...|..#|.#.|#..|.#.|..#|...',
  '>': '...|#..|.#.|..#|.#.|#..|...',
  '%': '#..#|...#|..#.|.#..|#...|#..#|....',
  '*': '.....|#.#.#|.###.|#####|.###.|#.#.#|.....',
  '[': '##|#.|#.|#.|#.|#.|##',
  '{': '.##|.#.|.#.|#..|.#.|.#.|.##',
  '}': '##.|.#.|.#.|..#|.#.|.#.|##.',
  ']': '##|.#|.#|.#|.#|.#|##',
  '_': '....|....|....|....|....|....|####',
  '#': '.#.#.|#####|.#.#.|.#.#.|#####|.#.#.|.....',
  '$': '.#..|.###|#...|.##.|...#|###.|.#..',
  '&': '.#..|#.#.|#.#.|.#..|#.##|#..#|.##.',
  '@': '.###.|#...#|#.###|#.#.#|#.##.|#....|.###.',
  '«': '.....|.....|..#.#|.#.#.|#.#..|.#.#.|..#.#',
  '»': '.....|.....|#.#..|.#.#.|..#.#|.#.#.|#.#..',
  '°': '.#.|#.#|.#.|...|...|...|...',
  '×': '...|...|#.#|.#.|#.#|...|...',
  '♥': '.....|##.##|#####|#####|.###.|..#..|.....',
  '✻': '..#..|#.#.#|.###.|##.##|.###.|#.#.#|..#..',
  '…': '.....|.....|.....|.....|.....|.....|#.#.#',
  '^': '.#.|#.#|...|...|...|...|...',
  '~': '....|....|.#.#|#.#.|....|....|....',
  '|': '#|#|#|#|#|#|#',
};

// Accents : lettre de base + marque au-dessus ([x, y] relatifs, y négatif = au-dessus du glyphe).
const ACCENTS = {
  acute: [[2, 0], [1, 1]],
  grave: [[1, 0], [2, 1]],
  circ: [[1, 0], [0, 1], [2, 1]],
  trema: [[0, 1], [2, 1]],
};
const ACCENTED = {
  'é': ['e', 'acute'], 'è': ['e', 'grave'], 'ê': ['e', 'circ'], 'ë': ['e', 'trema'],
  'à': ['a', 'grave'], 'â': ['a', 'circ'], 'ä': ['a', 'trema'],
  'ù': ['u', 'grave'], 'û': ['u', 'circ'], 'ü': ['u', 'trema'],
  'ô': ['o', 'circ'], 'ö': ['o', 'trema'], 'î': ['i', 'circ'], 'ï': ['i', 'trema'],
  'É': ['E', 'acute'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'À': ['A', 'grave'],
  'Â': ['A', 'circ'], 'Ô': ['O', 'circ'], 'Î': ['I', 'circ'], 'Û': ['U', 'circ'], 'Ù': ['U', 'grave'],
};
const ALIASES = { '’': "'", '‘': "'", '“': '"', '”': '"', '—': '-', '–': '-', 'œ': 'oe', 'Œ': 'OE', ' ': ' ' };

const Font = {
  LINE: 12,
  TOP: 3, // lignes réservées au-dessus des capitales pour les accents
  cache: new Map(),
  grids: new Map(),

  grid(ch) {
    if (this.grids.has(ch)) return this.grids.get(ch);
    let g = null;
    if (ch === 'ç' || ch === 'Ç') {
      const base = this.grid(ch === 'ç' ? 'c' : 'C');
      g = { w: base.w, px: base.px.slice() };
      g.px.push([1, 7], [2, 8], [1, 8]);
    } else if (ACCENTED[ch]) {
      const [b, acc] = ACCENTED[ch];
      let base = this.grid(b);
      if (b === 'i') base = { w: 3, px: base.px.filter((p) => p[1] > 0).map(([x, y]) => [x + 1, y]) };
      g = { w: base.w, px: base.px.slice() };
      const upper = b === b.toUpperCase();
      const lift = upper ? -3 : -1;
      const off = Math.max(0, Math.floor((base.w - 3) / 2));
      for (const [x, y] of ACCENTS[acc]) g.px.push([Math.min(base.w - 1, x + off), y + lift]);
    } else if (GLYPHS[ch] !== undefined) {
      const rows = GLYPHS[ch].split('|');
      g = { w: rows[0].length, px: [] };
      rows.forEach((r, y) => {
        for (let x = 0; x < r.length; x++) if (r[x] === '#') g.px.push([x, y]);
      });
    } else if (GLYPHS[ch.toUpperCase()] !== undefined) {
      g = this.grid(ch.toUpperCase());
    } else {
      g = this.grid('?');
    }
    this.grids.set(ch, g);
    return g;
  },

  glyph(ch, color) {
    const key = ch + color;
    let c = this.cache.get(key);
    if (c) return c;
    const g = this.grid(ch);
    c = document.createElement('canvas');
    c.width = g.w;
    c.height = 9 + this.TOP;
    const x = c.getContext('2d');
    x.fillStyle = color;
    for (const [px, py] of g.px) x.fillRect(px, py + this.TOP, 1, 1);
    this.cache.set(key, c);
    return c;
  },

  normalize(text) {
    let s = String(text);
    for (const k in ALIASES) if (s.includes(k)) s = s.split(k).join(ALIASES[k]);
    return s;
  },

  charW(ch) {
    if (ch === ' ') return 3;
    return this.grid(ch).w;
  },

  width(text, scale = 1) {
    const s = this.normalize(text);
    let w = 0;
    for (const ch of s) w += this.charW(ch) + 1;
    return Math.max(0, w - 1) * scale;
  },

  // Dessine le texte. y = haut des capitales.
  draw(ctx, text, x, y, color = '#fff', o = {}) {
    const scale = o.scale || 1;
    const s = this.normalize(text);
    let cx = x;
    const w = this.width(s, scale);
    if (o.align === 'center') cx = x - Math.floor(w / 2);
    else if (o.align === 'right') cx = x - w;
    cx = Math.round(cx);
    y = Math.round(y);
    if (o.shadow) this.drawRaw(ctx, s, cx + scale, y + scale, o.shadow, scale);
    if (o.outline) {
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) {
        this.drawRaw(ctx, s, cx + dx * scale, y + dy * scale, o.outline, scale);
      }
    }
    this.drawRaw(ctx, s, cx, y, color, scale);
    return w;
  },

  drawRaw(ctx, s, x, y, color, scale) {
    let cx = x;
    for (const ch of s) {
      if (ch === ' ') { cx += 4 * scale; continue; }
      const g = this.glyph(ch, color);
      ctx.drawImage(g, cx, y - this.TOP * scale, g.width * scale, g.height * scale);
      cx += (g.width + 1) * scale;
    }
  },

  // Découpe en lignes pour une largeur max.
  wrap(text, maxW, scale = 1) {
    const out = [];
    for (const para of this.normalize(text).split('\n')) {
      const words = para.split(' ');
      let line = '';
      for (const wd of words) {
        const t = line ? line + ' ' + wd : wd;
        if (this.width(t, scale) > maxW && line) {
          out.push(line);
          line = wd;
        } else line = t;
      }
      out.push(line);
    }
    return out;
  },

  drawWrapped(ctx, text, x, y, maxW, color, o = {}) {
    const lines = this.wrap(text, maxW, o.scale || 1);
    const lh = (o.lh || this.LINE) * (o.scale || 1);
    lines.forEach((l, i) => this.draw(ctx, l, x, y + i * lh, color, o));
    return lines.length * lh;
  },
};
