// Police bitmap 5x7 (majuscules + accents français), rendue en cache.

const FONT_GLYPHS = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.###.|#...#|#....|#....|#....|#...#|.###.',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.###.|#...#|#....|#.###|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '###|.#.|.#.|.#.|.#.|.#.|###',
  J: '..###|...#.|...#.|...#.|#..#.|#..#.|.##..',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|#...#|##..#|#.#.#|#..##|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  0: '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  1: '.#.|##.|.#.|.#.|.#.|.#.|###',
  2: '.###.|#...#|....#|...#.|..#..|.#...|#####',
  3: '####.|....#|....#|.###.|....#|....#|####.',
  4: '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  5: '#####|#....|####.|....#|....#|#...#|.###.',
  6: '.###.|#....|#....|####.|#...#|#...#|.###.',
  7: '#####|....#|...#.|..#..|.#...|.#...|.#...',
  8: '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  9: '.###.|#...#|#...#|.####|....#|....#|.###.',
  '.': '.|.|.|.|.|.|#',
  ',': '..|..|..|..|..|.#|#.',
  '!': '#|#|#|#|#|.|#',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  ':': '.|.|#|.|.|#|.',
  ';': '..|..|.#|..|..|.#|#.',
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
  '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
  '*': '...|#.#|.#.|#.#|...|...|...',
  '[': '##|#.|#.|#.|#.|#.|##',
  ']': '##|.#|.#|.#|.#|.#|##',
  '_': '....|....|....|....|....|....|####',
  '#': '.#.#.|#####|.#.#.|.#.#.|#####|.#.#.|.....',
  '&': '.##..|#..#.|.##..|.#...|#.#.#|#..#.|.##.#',
};

const FONT_ACCENTS = {
  'É': ['E', 'acute'], 'È': ['E', 'grave'], 'Ê': ['E', 'circ'], 'Ë': ['E', 'trema'],
  'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ç': ['C', 'cedil'],
  'Ù': ['U', 'grave'], 'Û': ['U', 'circ'], 'Ü': ['U', 'trema'],
  'Ô': ['O', 'circ'], 'Î': ['I', 'circ'], 'Ï': ['I', 'trema'],
};

const FONT_ACCENT_PIX = {
  acute: [[3, -3], [2, -2]],
  grave: [[1, -3], [2, -2]],
  circ: [[2, -3], [1, -2], [3, -2]],
  trema: [[1, -2], [3, -2]],
  cedil: [[2, 7], [1, 8]],
};

const Font = {
  glyphs: {},
  cache: new Map(),

  init() {
    for (const [ch, s] of Object.entries(FONT_GLYPHS)) {
      const rows = s.split('|');
      const w = rows[0].length;
      const px = [];
      rows.forEach((r, y) => {
        for (let x = 0; x < r.length; x++) if (r[x] === '#') px.push(x, y);
      });
      this.glyphs[ch] = { w, px };
    }
    // Accents : on réutilise le pixel map du glyphe de base (I fait 3px de large).
    FONT_ACCENT_PIX.circI = [[1, -3], [0, -2], [2, -2]];
    FONT_ACCENT_PIX.tremaI = [[0, -2], [2, -2]];
  },

  info(ch) {
    const g = this.glyphs[ch];
    if (g) return { g };
    const a = FONT_ACCENTS[ch];
    if (a) {
      let key = a[1];
      if (a[0] === 'I') key = a[1] === 'circ' ? 'circI' : 'tremaI';
      return { g: this.glyphs[a[0]], acc: FONT_ACCENT_PIX[key] };
    }
    if (ch === 'Œ') return { g: this.glyphs.O };
    return { g: this.glyphs['?'] };
  },

  prep(text) {
    return String(text).toUpperCase().replace(/Œ/g, 'OE');
  },

  width(text, scale = 1) {
    text = this.prep(text);
    let w = 0;
    for (const ch of text) {
      if (ch === ' ') { w += 4; continue; }
      w += this.info(ch).g.w + 1;
    }
    return Math.max(0, w - 1) * scale;
  },

  // Rend un texte dans un canvas mis en cache.
  render(text, color, scale, outline) {
    const key = text + '|' + color + '|' + scale + '|' + (outline || '');
    let c = this.cache.get(key);
    if (c) return c;
    if (this.cache.size > 600) this.cache.clear();
    const pad = outline ? scale : 0;
    const top = 3 * scale;
    const w = this.width(text, scale) + pad * 2 + scale;
    const h = 12 * scale + pad * 2;
    c = document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = h;
    const x = c.getContext('2d');
    if (outline) {
      for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        this.raw(x, text, pad + ox * scale, pad + top + oy * scale, outline, scale);
      }
    }
    this.raw(x, text, pad, pad + top, color, scale);
    c.pad = pad;
    c.top = top;
    this.cache.set(key, c);
    return c;
  },

  // color peut être un tableau : dégradé vertical (style 16 bits).
  raw(ctx, text, x, y, color, scale) {
    const grad = Array.isArray(color);
    if (!grad) ctx.fillStyle = color;
    let cx = x;
    for (const ch of text) {
      if (ch === ' ') { cx += 4 * scale; continue; }
      const inf = this.info(ch);
      const g = inf.g;
      for (let i = 0; i < g.px.length; i += 2) {
        if (grad) ctx.fillStyle = color[Math.min(color.length - 1, Math.floor((g.px[i + 1] * color.length) / 7))];
        ctx.fillRect(cx + g.px[i] * scale, y + g.px[i + 1] * scale, scale, scale);
      }
      if (grad) ctx.fillStyle = color[0];
      if (inf.acc) for (const [ax, ay] of inf.acc) ctx.fillRect(cx + ax * scale, y + ay * scale, scale, scale);
      cx += (g.w + 1) * scale;
    }
  },

  // opt : { scale, align: 'left'|'center'|'right', outline: couleur, shadow: couleur, alpha }
  draw(ctx, text, x, y, color = '#fff', opt = {}) {
    text = this.prep(text);
    if (!text.length) return;
    const scale = opt.scale || 1;
    const tw = this.width(text, scale);
    if (opt.align === 'center') x -= Math.floor(tw / 2);
    else if (opt.align === 'right') x -= tw;
    x = Math.round(x);
    y = Math.round(y);
    if (opt.alpha !== undefined) {
      ctx.save();
      ctx.globalAlpha = opt.alpha;
    }
    if (opt.shadow) {
      const s = this.render(text, opt.shadow, scale, null);
      ctx.drawImage(s, x - s.pad + scale, y - s.pad - s.top + scale);
    }
    const c = this.render(text, color, scale, opt.outline);
    ctx.drawImage(c, x - c.pad, y - c.pad - c.top);
    if (opt.alpha !== undefined) ctx.restore();
  },

  // Découpe un texte en lignes qui tiennent dans maxW pixels.
  wrap(text, maxW, scale = 1) {
    const out = [];
    for (const para of String(text).split('\n')) {
      const words = para.split(' ');
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (this.width(test, scale) > maxW && line) {
          out.push(line);
          line = w;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  },
};

Font.init();
