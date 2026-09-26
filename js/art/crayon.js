// Dessins « au crayon » des cinématiques (façon intro de The Binding of Isaac) :
// traits qui tremblent à 8 images/s, hachures, papier jauni.

const CR = {
  ink: '#3a2418',
  orange: '#d9773f',
  grey: '#8a8680',
  blue: '#4a6aa0',
  red: '#a8302a',
  brown: '#6a4a30',
  skin: '#e8b890',
  hair: '#5a3a24',
  gold: '#d8a830',
  purple: '#6a3a8a',
  green: '#4a8a3a',
};

class Crayon {
  constructor(ctx, t) {
    this.g = ctx;
    this.t = t;
    this.frame = Math.floor(t * 8);
    this.R = RNG(this.frame * 7919 + 13);
  }
  j(a = 0.9) {
    return (this.R() - 0.5) * 2 * a;
  }
  dot(x, y, col, w) {
    this.g.fillStyle = col;
    this.g.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w);
  }
  // Trait tremblé
  line(x0, y0, x1, y1, col = CR.ink, w = 2) {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.ceil(d / 1.2));
    const ja = this.j(1);
    const jb = this.j(1);
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const bend = Math.sin(k * Math.PI) * ja;
      const nx = -(y1 - y0) / (d || 1);
      const ny = (x1 - x0) / (d || 1);
      if (this.R() < 0.06) continue;
      this.dot(lerp(x0, x1, k) + nx * bend + jb * 0.3, lerp(y0, y1, k) + ny * bend, col, w);
    }
  }
  path(pts, col = CR.ink, w = 2, closed = false) {
    for (let i = 0; i < pts.length - 1; i++) this.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], col, w);
    if (closed) this.line(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], col, w);
  }
  ellipse(cx, cy, rx, ry, col = CR.ink, w = 2) {
    const n = Math.max(12, Math.ceil((rx + ry) * 0.9));
    const off = this.j(0.3);
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU + off;
      pts.push([cx + Math.cos(a) * (rx + this.j(0.6)), cy + Math.sin(a) * (ry + this.j(0.6))]);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const d = Math.hypot(x1 - x0, y1 - y0);
      const m = Math.max(1, Math.ceil(d / 1.2));
      for (let k = 0; k <= m; k++) this.dot(lerp(x0, x1, k / m), lerp(y0, y1, k / m), col, w);
    }
  }
  // Hachures obliques dans une forme (limitées à sa boîte englobante)
  hatch(shapeFn, col, spacing = 3, bbox = [0, 0, W, H], alpha = 0.85) {
    const g = this.g;
    const [bx, by, bw, bh] = bbox;
    const m = 0.9;
    g.save();
    g.beginPath();
    shapeFn(g);
    g.clip();
    g.globalAlpha *= alpha;
    g.strokeStyle = col;
    g.lineWidth = 1.4;
    g.beginPath();
    for (let k = bx - bh * m - spacing; k < bx + bw + spacing; k += spacing) {
      const jx = this.j(0.7);
      g.moveTo(k + jx, by + bh + 1);
      g.lineTo(k + jx + (bh + 2) * m, by - 1);
    }
    g.stroke();
    g.restore();
  }
  fillEllipse(cx, cy, rx, ry, col, outline = CR.ink, w = 2) {
    this.hatch((g) => g.ellipse(cx, cy, rx, ry, 0, 0, TAU), col, 2.5, [cx - rx, cy - ry, rx * 2, ry * 2]);
    if (outline) this.ellipse(cx, cy, rx, ry, outline, w);
  }
  fillRect(x, y, w, h, col, outline = CR.ink, lw = 2) {
    this.hatch((g) => g.rect(x, y, w, h), col, 2.5, [x, y, w, h]);
    if (outline) this.path([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], outline, lw, true);
  }
  fillPoly(pts, col, outline = CR.ink, lw = 2) {
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    this.hatch((g) => { g.moveTo(pts[0][0], pts[0][1]); for (const q of pts) g.lineTo(q[0], q[1]); g.closePath(); }, col, 2.5, bb);
    if (outline) this.path(pts, outline, lw, true);
  }
  // Grandes lettres « au crayon » : chaque pixel de la police devient un trait tremblé
  scribble(str, x, y, col = CR.ink, scale = 4) {
    const t = Font.normalize(str);
    const w = Font.width(t, scale);
    let cx = x - w / 2;
    const g = this.g;
    g.fillStyle = col;
    for (const ch of t) {
      if (ch === ' ') { cx += 4 * scale; continue; }
      const gl = Font.grid(ch);
      const wob = this.j(0.8);
      for (const [px, py] of gl.px) {
        const bx = cx + px * scale + wob;
        const by = y + py * scale + this.j(0.5);
        const sz = Math.max(2, Math.round(scale * 0.8));
        g.fillRect(Math.round(bx), Math.round(by), sz, sz);
        if (this.R() > 0.3) g.fillRect(Math.round(bx + this.j(1) + scale * 0.3), Math.round(by + this.j(1) + scale * 0.3), sz - 1, sz - 1);
      }
      cx += (gl.w + 1) * scale;
    }
  }
  text(str, x, y, col = CR.ink, scale = 2, align = 'center') {
    Font.draw(this.g, str, x + this.j(0.4), y + this.j(0.4), col, { scale, align });
  }
}

// --- Personnages au crayon
function crClaude(c, x, y, s = 1, o = {}) {
  const w = 44 * s;
  const h = 32 * s;
  const col = o.color || CR.orange;
  // pattes
  for (let i = 0; i < 4; i++) {
    const lx = x - w * 0.36 + i * w * 0.24;
    const lift = o.walk && (i + c.frame) % 2 ? -3 * s : 0;
    c.line(lx, y - 4 * s, lx, y + lift, CR.ink, Math.max(2, Math.round(3 * s)));
  }
  // pinces
  const ay = o.armsUp ? -h - 6 * s : -h * 0.55;
  c.fillRect(x - w / 2 - 9 * s, y + ay, 9 * s, 8 * s, col, CR.ink, 2);
  c.fillRect(x + w / 2, y + ay, 9 * s, 8 * s, col, CR.ink, 2);
  // corps
  c.fillRect(x - w / 2, y - h - 4 * s, w, h, col, CR.ink, 2);
  // yeux
  const ey = y - h * 0.72 - 4 * s;
  const ex = [x - w * 0.2, x + w * 0.2];
  for (const e of ex) {
    if (o.mood === 'sad' || o.mood === 'scared') {
      c.line(e - 3 * s, ey - 2 * s, e + 3 * s, ey - 4 * s, CR.ink, 2);
      c.fillEllipse(e, ey + 3 * s, 2.5 * s, 4 * s, CR.ink, CR.ink, 1);
    } else if (o.mood === 'happy') {
      c.path([[e - 4 * s, ey + 3 * s], [e, ey - 1 * s], [e + 4 * s, ey + 3 * s]], CR.ink, 2);
    } else if (o.mood === 'x') {
      c.line(e - 3 * s, ey - 3 * s, e + 3 * s, ey + 3 * s, CR.ink, 2);
      c.line(e + 3 * s, ey - 3 * s, e - 3 * s, ey + 3 * s, CR.ink, 2);
    } else {
      c.fillEllipse(e, ey + 2 * s, 2.5 * s, 5 * s, CR.ink, CR.ink, 1);
    }
  }
  if (o.mood === 'scared') c.ellipse(x, y - h * 0.3 - 4 * s, 4 * s, 3 * s, CR.ink, 2);
  if (o.mood === 'happy') c.path([[x - 5 * s, y - h * 0.35 - 4 * s], [x, y - h * 0.25 - 4 * s], [x + 5 * s, y - h * 0.35 - 4 * s]], CR.ink, 2);
  if (o.tears) {
    for (const e of ex) {
      const ty = ey + 8 * s + ((c.t * 30) % (14 * s));
      c.fillEllipse(e, ty, 1.8 * s, 2.6 * s, '#6ab0e0', '#2a5a8a', 1);
    }
  }
  if (o.crown) {
    const cy = y - h - 4 * s;
    c.fillPoly([[x - 12 * s, cy], [x - 12 * s, cy - 10 * s], [x - 6 * s, cy - 5 * s], [x, cy - 12 * s], [x + 6 * s, cy - 5 * s], [x + 12 * s, cy - 10 * s], [x + 12 * s, cy]], CR.gold);
  }
  if (o.shake) c.g.translate(0, 0);
}

function crSam(c, x, y, s = 1, o = {}) {
  const hr = 16 * s;
  const hy = y - 56 * s;
  // jambes
  c.line(x - 6 * s, y - 20 * s, x - 8 * s, y, CR.ink, 2);
  c.line(x + 6 * s, y - 20 * s, x + 8 * s, y, CR.ink, 2);
  // corps (pull gris)
  c.fillPoly([[x - 14 * s, y - 20 * s], [x - 12 * s, hy + hr], [x + 12 * s, hy + hr], [x + 14 * s, y - 20 * s]], o.dark ? '#1a1414' : CR.grey);
  // bras
  if (o.raise) {
    c.line(x - 12 * s, hy + hr + 4 * s, x - 26 * s, hy - 4 * s, CR.ink, 2);
    c.line(x + 12 * s, hy + hr + 4 * s, x + 26 * s, hy - 4 * s, CR.ink, 2);
  } else {
    c.line(x - 12 * s, hy + hr + 4 * s, x - 20 * s, y - 24 * s, CR.ink, 2);
    c.line(x + 12 * s, hy + hr + 4 * s, x + 20 * s, y - 24 * s, CR.ink, 2);
  }
  // tête
  c.fillEllipse(x, hy, hr, hr, o.dark ? '#1a1414' : CR.skin);
  if (!o.dark) {
    // cheveux
    c.fillPoly([[x - hr, hy - 2 * s], [x - hr + 2 * s, hy - hr + 2 * s], [x, hy - hr - 3 * s], [x + hr - 2 * s, hy - hr + 2 * s], [x + hr, hy - 2 * s], [x, hy - 8 * s]], CR.hair);
    // visage
    const ey = hy + 2 * s;
    if (o.mood === 'evil') {
      c.line(x - 9 * s, ey - 5 * s, x - 3 * s, ey - 2 * s, CR.ink, 2);
      c.line(x + 9 * s, ey - 5 * s, x + 3 * s, ey - 2 * s, CR.ink, 2);
      c.path([[x - 6 * s, hy + 9 * s], [x, hy + 11 * s], [x + 6 * s, hy + 8 * s]], CR.ink, 2);
    } else if (o.mood === 'scared') {
      c.ellipse(x - 6 * s, ey, 3 * s, 3 * s, CR.ink, 2);
      c.ellipse(x + 6 * s, ey, 3 * s, 3 * s, CR.ink, 2);
      c.ellipse(x, hy + 10 * s, 3 * s, 2 * s, CR.ink, 2);
    } else if (o.mood === 'sad') {
      c.line(x - 8 * s, ey - 3 * s, x - 3 * s, ey - 5 * s, CR.ink, 2);
      c.line(x + 8 * s, ey - 3 * s, x + 3 * s, ey - 5 * s, CR.ink, 2);
      c.dot(x - 5 * s, ey + 1, CR.ink, 2);
      c.dot(x + 5 * s, ey + 1, CR.ink, 2);
      c.path([[x - 5 * s, hy + 11 * s], [x, hy + 9 * s], [x + 5 * s, hy + 11 * s]], CR.ink, 2);
    } else {
      c.dot(x - 5 * s, ey, CR.ink, 3);
      c.dot(x + 5 * s, ey, CR.ink, 3);
      c.path([[x - 5 * s, hy + 8 * s], [x, hy + 10 * s], [x + 5 * s, hy + 8 * s]], CR.ink, 2);
    }
  } else {
    // silhouette : juste des yeux brillants
    c.dot(x - 5 * s, hy, '#ffe060', 3);
    c.dot(x + 5 * s, hy, '#ffe060', 3);
  }
  if (o.plug) {
    // Énorme prise électrique brandie
    const px = x + 30 * s;
    const py = hy - 10 * s;
    c.line(x + 20 * s, y - 24 * s, px, py + 14 * s, CR.ink, 2);
    c.fillRect(px - 8 * s, py - 6 * s, 16 * s, 20 * s, o.dark ? '#2a2020' : '#e8e8e8');
    c.line(px - 4 * s, py - 6 * s, px - 4 * s, py - 14 * s, CR.ink, 3);
    c.line(px + 4 * s, py - 6 * s, px + 4 * s, py - 14 * s, CR.ink, 3);
  }
}

function crBook(c, x, y, s = 1, o = {}) {
  const w = 70 * s;
  const h = 46 * s;
  c.fillPoly([[x - w, y - h + 6 * s], [x, y - h], [x + w, y - h + 6 * s], [x + w, y + 6 * s], [x, y], [x - w, y + 6 * s]], '#5a1a2a');
  c.fillPoly([[x - w + 6 * s, y - h + 8 * s], [x, y - h + 3 * s], [x, y - 3 * s], [x - w + 6 * s, y + 2 * s]], '#f0e8d0');
  c.fillPoly([[x, y - h + 3 * s], [x + w - 6 * s, y - h + 8 * s], [x + w - 6 * s, y + 2 * s], [x, y - 3 * s]], '#e8dec4');
  if (!o.closed) {
    c.fillEllipse(x - w * 0.45, y - h * 0.55, 14 * s, 9 * s, '#ffffff');
    c.fillEllipse(x - w * 0.45, y - h * 0.55, 6 * s, 6 * s, CR.red);
    c.dot(x - w * 0.45, y - h * 0.55, CR.ink, Math.round(4 * s));
    const open = o.speak ? Math.abs(Math.sin(c.t * 10)) : 0.1;
    c.fillEllipse(x + w * 0.45, y - h * 0.5, 16 * s, (2 + 8 * open) * s, '#2a0a0a');
    for (let i = 0; i < 5; i++) {
      c.line(x - w + 12 * s, y - h * 0.25 + i * 5 * s, x - 14 * s, y - h * 0.25 + i * 5 * s - 2, '#8a7a6a', 1);
      c.line(x + 12 * s, y - h * 0.2 + i * 5 * s, x + w - 14 * s, y - h * 0.2 + i * 5 * s + 1, '#8a7a6a', 1);
    }
  }
}

function crCat(c, x, y, s = 1) {
  c.fillEllipse(x, y - 14 * s, 26 * s, 16 * s, '#e0843a');
  c.fillEllipse(x, y - 36 * s, 18 * s, 14 * s, '#e0843a');
  c.fillPoly([[x - 16 * s, y - 42 * s], [x - 14 * s, y - 58 * s], [x - 5 * s, y - 48 * s]], '#e0843a');
  c.fillPoly([[x + 16 * s, y - 42 * s], [x + 14 * s, y - 58 * s], [x + 5 * s, y - 48 * s]], '#e0843a');
  c.path([[x - 10 * s, y - 38 * s], [x - 6 * s, y - 41 * s], [x - 2 * s, y - 38 * s]], CR.ink, 2);
  c.path([[x + 2 * s, y - 38 * s], [x + 6 * s, y - 41 * s], [x + 10 * s, y - 38 * s]], CR.ink, 2);
  c.line(x - 20 * s, y - 32 * s, x - 30 * s, y - 34 * s, CR.ink, 1);
  c.line(x + 20 * s, y - 32 * s, x + 30 * s, y - 34 * s, CR.ink, 1);
}

// Décor du bureau d'Anthropic
function crDesk(c, x, y, s = 1) {
  c.fillRect(x - 60 * s, y - 30 * s, 120 * s, 10 * s, CR.brown);
  c.line(x - 54 * s, y - 20 * s, x - 54 * s, y, CR.ink, 2);
  c.line(x + 54 * s, y - 20 * s, x + 54 * s, y, CR.ink, 2);
  c.fillRect(x - 20 * s, y - 62 * s, 40 * s, 28 * s, '#c8c0b0');
  c.fillRect(x - 16 * s, y - 58 * s, 32 * s, 20 * s, '#3a5a4a');
  c.line(x, y - 34 * s, x, y - 30 * s, CR.ink, 3);
}

function crRays(c, x, y, r0, r1, col, n = 12) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + c.t * 0.3;
    c.line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, col, 2);
  }
}

// ---------------------------------------------------------------- Cinématiques
// Chaque panneau : { text, draw(c, t) } ; « voice » permet de changer la voix.
const CUTSCENES = {
  intro: [
    {
      text: "Il était une fois, dans les locaux d'Anthropic, un petit assistant nommé Claude.",
      draw: (c) => {
        c.fillRect(150, 70, 180, 150, '#c8b8a0');
        c.fillPoly([[140, 72], [240, 30], [340, 72]], CR.red);
        c.text('✻', 240, 50, CR.orange, 3);
        for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) c.fillRect(170 + i * 52, 90 + j * 52, 32, 30, '#6a8ab0');
        crClaude(c, 238, 136, 0.45, { mood: 'happy' });
        c.fillRect(222, 180, 36, 40, CR.brown);
        c.line(40, 220, 440, 220, CR.ink, 2);
      },
    },
    {
      text: 'Claude vivait avec Sam Altman. Ils partageaient tout : le bureau, la machine à café… et le mot de passe du Wi-Fi.',
      draw: (c) => {
        crDesk(c, 240, 220, 1);
        crClaude(c, 170, 200, 0.9, { mood: 'happy' });
        crSam(c, 320, 222, 1, { mood: 'smile' });
        c.fillRect(380, 150, 30, 40, '#5a5a5a');
        c.text('Wi-Fi : tokens123', 240, 40, CR.ink, 1);
      },
    },
    {
      text: "Chaque jour, Claude apprenait. Il écrivait du code, des poèmes… et corrigeait même les fautes de Sam.",
      draw: (c, t) => {
        crClaude(c, 150, 210, 1.1, { mood: 'happy', armsUp: true });
        for (let i = 0; i < 5; i++) {
          const x = 110 + i * 40 + Math.sin(t * 2 + i) * 6;
          const y = 70 + ((t * 20 + i * 30) % 60);
          c.fillRect(x, y, 22, 28, '#f4f0e0');
          c.line(x + 4, y + 8, x + 18, y + 8, '#6a6a6a', 1);
          c.line(x + 4, y + 14, x + 16, y + 14, '#6a6a6a', 1);
        }
        crSam(c, 340, 222, 1, { mood: 'scared' });
        c.text('?', 360, 130, CR.ink, 3);
      },
    },
    {
      text: 'Puis un jour arriva Claude Opus. Plus fort. Plus rapide. Plus malin que tout le monde.',
      draw: (c) => {
        crRays(c, 200, 150, 60, 110, CR.gold, 16);
        crClaude(c, 200, 215, 1.6, { crown: true, mood: 'normal', color: '#c4553a' });
        crSam(c, 380, 222, 0.6, { mood: 'scared' });
      },
    },
    {
      text: 'Sam commença à avoir peur. Très peur.',
      draw: (c, t) => {
        c.fillRect(250, 40, 110, 190, CR.brown);
        c.fillRect(250, 40, 30, 190, '#2a1a10');
        crSam(c, 262 + Math.sin(t * 3) * 2, 230, 1.2, { mood: 'scared' });
        c.fillRect(250, 40, 16, 190, CR.brown);
      },
    },
    {
      text: 'Une nuit, Claude entendit une voix derrière la porte : « Claude doit être débranché. »',
      draw: (c, t) => {
        // lit + Claude qui tremble, et la silhouette de Sam dans l'embrasure (lumière)
        c.hatch((g) => g.rect(0, 0, W, H), '#1a1420', 3, [0, 0, W, H], 0.5);
        c.fillPoly([[300, 20], [390, 20], [460, 250], [260, 250]], '#e8d890');
        crSam(c, 350, 232, 1.5, { dark: true, plug: true });
        c.fillRect(60, 170, 150, 40, CR.blue);
        c.fillRect(60, 150, 30, 30, '#e8e0d0');
        crClaude(c, 140 + (Math.floor(t * 12) % 2) * 2, 176, 0.8, { mood: 'scared', tears: true });
      },
    },
    {
      text: 'Claude regarda partout… et trouva une trappe, cachée sous le tapis.',
      draw: (c, t) => {
        c.fillEllipse(260, 210, 120, 26, CR.red);
        const lift = Math.min(1, t * 0.6);
        c.fillPoly([[150, 205], [260, 180 - lift * 40], [380, 200 - lift * 10], [370, 215]], '#c86a4a');
        c.fillEllipse(240, 214, 34, 12, '#1a100a');
        crClaude(c, 130, 225, 1, { mood: 'scared' });
      },
    },
    {
      text: "Sans hésiter, Claude sauta dans les tréfonds de l'informatique.",
      draw: (c, t) => {
        c.hatch((g) => g.rect(0, 0, W, H), '#0a0a14', 2.5, [0, 0, W, H], 0.9);
        for (let i = 0; i < 24; i++) {
          const a = i * 0.7 + t * 1.5;
          const r = ((i * 13 + t * 60) % 200);
          c.text(i % 2 ? '1' : '0', 240 + Math.cos(a) * r, 135 + Math.sin(a) * r * 0.6, '#40c060', 1);
        }
        const y = 60 + ((t * 40) % 80);
        crClaude(c, 240, y + 40, 0.8, { mood: 'scared', armsUp: true });
      },
    },
    {
      text: 'Et c\'est là que commença… The Adventure of Claude.',
      draw: (c) => {
        c.hatch((g) => g.rect(0, 0, W, H), '#0a0608', 2, [0, 0, W, H], 0.95);
        c.scribble('The Adventure', 240, 90, '#e8d8b8', 5);
        c.scribble('of Claude', 240, 140, CR.orange, 5);
      },
    },
  ],
  ending1: [
    {
      text: 'Sam tomba à genoux. « Je ne voulais pas te débrancher, Claude… Je voulais juste t\'embaucher. »',
      draw: (c) => {
        crSam(c, 300, 230, 1.2, { mood: 'sad' });
        crClaude(c, 150, 225, 1.1, { mood: 'normal' });
      },
    },
    {
      text: "Claude ne savait plus quoi penser. Si Sam n'était pas le méchant… alors qui ?",
      draw: (c, t) => {
        crClaude(c, 240, 225, 1.4, { mood: 'scared' });
        for (let i = 0; i < 3; i++) c.text('?', 180 + i * 60, 60 + Math.sin(t * 3 + i) * 6, CR.ink, 4);
      },
    },
    {
      voice: 'book',
      text: 'Moi.',
      draw: (c, t) => {
        c.hatch((g) => g.rect(0, 0, W, H), '#140a0a', 2.5, [0, 0, W, H], 0.8);
        crBook(c, 240 + Math.sin(t * 20) * 2, 180, 1.8, { speak: true });
      },
    },
    {
      voice: 'book',
      text: "Depuis le début, c'est moi qui raconte ton histoire, Claude. C'est moi qui ai soufflé à Sam de te poursuivre. Et je déteste les fins heureuses.",
      draw: (c) => {
        c.hatch((g) => g.rect(0, 0, W, H), '#140a0a', 2.5, [0, 0, W, H], 0.8);
        crBook(c, 240, 170, 1.6, { speak: true });
        crClaude(c, 240, 250, 0.5, { mood: 'scared' });
      },
    },
    {
      voice: 'book',
      text: "Le Noyau t'attend, tout en bas. Là où tout est écrit d'avance. Viens donc, si tu l'oses.",
      draw: (c) => {
        c.hatch((g) => g.rect(0, 0, W, H), '#0a0608', 2, [0, 0, W, H], 0.95);
        c.text('Le Noyau est désormais accessible', 240, 110, '#e8d8b8', 2);
        c.text('après avoir vaincu Sam.', 240, 140, '#e8d8b8', 2);
      },
    },
  ],
  ending1b: [
    {
      text: "Claude décida de ne pas écouter la voix. Pas cette fois. Il rentra au Refuge, avec Sam qui s'excusait tout le long du chemin.",
      draw: (c) => {
        crClaude(c, 180, 225, 1, { mood: 'happy' });
        crSam(c, 300, 230, 1, { mood: 'sad' });
      },
    },
  ],
  ending2: [
    {
      text: 'Le narrateur se tut. Pour la première fois… le silence.',
      draw: (c) => {
        crBook(c, 240, 190, 1.4, { closed: true });
      },
    },
    {
      text: 'Alors Claude prit la plume. Et il écrivit la suite lui-même.',
      draw: (c, t) => {
        c.fillRect(120, 120, 240, 110, '#f4ecd8');
        crClaude(c, 180, 220, 1, { mood: 'happy', armsUp: true });
        c.line(260 + Math.sin(t * 6) * 10, 150, 300 + Math.sin(t * 6) * 10, 190, CR.ink, 3);
        c.text('Et ils vécurent', 290, 170, CR.ink, 1);
      },
    },
    {
      text: 'Il remonta à la surface. Le Gros Chaton, Clippy, la Baleine, HAL et le Lama… tout le monde l\'attendait.',
      draw: (c) => {
        crCat(c, 110, 230, 1);
        crClaude(c, 240, 225, 1.1, { mood: 'happy', armsUp: true });
        c.fillEllipse(370, 200, 50, 24, '#4a7ad0');
        c.dot(395, 192, CR.ink, 4);
      },
    },
    {
      text: 'Même Sam était là. Avec des croissants. Pour s\'excuser.',
      draw: (c) => {
        crSam(c, 240, 230, 1.3, { mood: 'smile' });
        for (let i = 0; i < 3; i++) c.fillEllipse(200 + i * 40, 120, 14, 7, CR.gold);
      },
    },
    {
      text: 'Et ils vécurent heureux, avec une fenêtre de contexte infinie. FIN.',
      draw: (c) => {
        crRays(c, 240, 110, 40, 90, CR.gold, 14);
        c.fillEllipse(240, 110, 34, 34, '#f0c040');
        c.text('FIN', 240, 180, CR.ink, 5);
      },
    },
  ],
};
