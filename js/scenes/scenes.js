// Écrans hors-jeu façon Isaac : sous-sol sombre, feuilles de papier, encre.

const CREAM = ['#fff4e0', '#f2d8b0', '#d8b088'];
const LOGO_TOP = ['#fff8ec', '#f2dcc0', '#d8b898', '#b89070'];
const LOGO_MAIN = ['#ffd0a0', '#f2a060', '#d97757', '#b84a38', '#8a2a20'];

// Logo avec coulures rouges (clin d'oeil à Isaac).
function drawLogo(ctx, y, t) {
  Font.draw(ctx, 'THE BINDING', 160, y, LOGO_TOP, { align: 'center', scale: 2, outline: '#1a0c08', shadow: '#000' });
  Font.draw(ctx, 'OF CLAUDE', 160, y + 19, LOGO_MAIN, { align: 'center', scale: 3, outline: '#1a0c08', shadow: '#000' });
  const w = Font.width('OF CLAUDE', 3);
  const x0 = 160 - w / 2;
  for (let i = 0; i < 9; i++) {
    const dx = Math.floor(hash2(i, 9) * w);
    const len = 2 + Math.floor(((t * 3 + hash2(i, 5) * 10) % 10) * (0.4 + hash2(i, 7)));
    rect(ctx, x0 + dx, y + 40, 2, len, '#8a1a14');
    rect(ctx, x0 + dx, y + 40 + len, 2, 2, '#c02820');
  }
}

// Menu vertical écrit à l'encre sur une feuille.
function drawInkMenu(ctx, items, sel, x, y, t, gap = 15) {
  items.forEach((label, i) => {
    const s = i === sel;
    const wob = s ? Math.round(Math.sin(t * 6)) : 0;
    Font.draw(ctx, label, x + wob, y + i * gap, s ? INK_RED : INK, { align: 'center' });
    if (s) drawScribble(ctx, x, y + i * gap + 3, Font.width(label), t);
  });
}

function menuNav(scene, count) {
  if (Input.pressed('uiUp')) { scene.sel = (scene.sel + count - 1) % count; Sound.play('select'); }
  if (Input.pressed('uiDown')) { scene.sel = (scene.sel + 1) % count; Sound.play('select'); }
}

// "r,g,b" ou "rgba(r,g,b,A)" -> couleur de la palette.
function rgbToPal(str) {
  const m = str.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return MASTER_PALETTE[nearestPal(+m[1], +m[2], +m[3])];
}

// Halo lumineux (additif, tramé : aucun dégradé).
function drawSpot(ctx, x, y, r, color, a = 0.25) {
  drawGlow(ctx, x, y, Math.round(r / 4) * 4, rgbToPal(color), a * 1.2);
}

// --------------------------------------------------------------- Démarrage
class SplashScene {
  constructor() {
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (this.t > 0.3 && (Input.pressed('any') || Input.pressed('confirm'))) {
      Sound.unlock();
      Sound.play('confirm');
      const seen = Store.get('introSeen2', false);
      App.go(() => (seen ? new TitleScene() : new IntroScene()));
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    drawSpot(ctx, 160, 110, 70, 'rgba(255,170,110,A)', 0.22);
    drawLogo(ctx, 16, this.t);
    drawShadow(ctx, 160, 138, 14, 3);
    drawSpr(ctx, 'claudeXL_down_0', 140, 104 + Math.round(Math.sin(this.t * 3) * 2));
    if (Math.floor(this.t * 2) % 2 === 0) Font.draw(ctx, 'APPUIE SUR UNE TOUCHE', 160, 150, CREAM, { align: 'center', outline: '#1a0c08' });
    Font.draw(ctx, 'M : COUPER LE SON', 160, 168, '#6a5040', { align: 'center' });
  }
}

// ------------------------------------------------------------------- Intro
// Illustrations HD (400 x 200 px réels) pour l'intro.
const sceneCache = new Map();

function sceneBG(key, fn) {
  if (!sceneCache.has(key)) {
    const c = newCanvas(400, 200);
    fn(c.getContext('2d'));
    quantizeCanvas(c);
    sceneCache.set(key, c);
  }
  return sceneCache.get(key);
}

// Dégradé tramé (vertical) sur une zone.
function ditherGrad(x, X, Y, w, h, stops) {
  const cols = stops.map(rgb);
  const id = x.getImageData(X, Y, w, h);
  const d = id.data;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const t = dq(j / Math.max(1, h - 1), i, j, 10) * (cols.length - 1);
      const k = Math.min(cols.length - 2, Math.floor(t));
      const col = mixRgb(cols[k], cols[k + 1], t - k);
      const o = (j * w + i) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
  }
  x.putImageData(id, X, Y);
}

function glowHD(ctx, x, y, r, rgbStr, a) {
  // Rayon arrondi par paliers : peu de disques différents à mettre en cache.
  const R = Math.max(4, Math.round(r / 8) * 8);
  const c = ditherDisc(R, rgbToPal(rgbStr));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha *= Math.min(1, a * 1.2);
  ctx.drawImage(c, Math.round(x) - R, Math.round(y) - R);
  ctx.restore();
}

// Sprite HD dessiné à sa taille native dans l'espace 400x200.
function sprHD(ctx, name, x, y, o = {}) {
  drawSpr(ctx, name, x, y, Object.assign({ scale: 2 }, o));
}

// --- 1. Le datacenter, en perspective
const DC_LEDS = [];
function paintDatacenter(x) {
  ditherGrad(x, 0, 0, 400, 88, ['#05070e', '#0e1626', '#1a2a44']);
  ditherGrad(x, 0, 88, 400, 112, ['#16223a', '#0c1422', '#05070c']);
  for (let i = -8; i <= 16; i++) LN(x, 200, 88, 200 + i * 60 - 240, 200, '#1e3452');
  for (let k = 1; k < 9; k++) R(x, 0, Math.round(88 + 112 / (1 + (8 - k) * 0.5)), 400, 1, '#1e3452');
  for (let side = -1; side <= 1; side += 2) {
    for (let k = 7; k >= 0; k--) {
      const s = 1 / (1 + k * 0.55);
      const w = Math.round(64 * s);
      const cx = 200 + side * Math.round(118 * s + 30 * s);
      const top = Math.round(88 - 120 * s);
      const bot = Math.round(88 + 70 * s);
      R(x, cx - w / 2 - 2, top - 2, w + 4, bot - top + 4, '#04060a');
      R(x, cx - w / 2, top, w, bot - top, tone('#1e2a3e', -k * 0.015));
      R(x, cx - w / 2, top, w, Math.max(1, 3 * s), '#3a5070');
      const unit = Math.max(3, Math.round(9 * s));
      for (let y = top + unit; y < bot - 2; y += unit) {
        R(x, cx - w / 2 + 2, y, w - 4, Math.max(1, Math.round(2 * s)), '#0c121c');
        if (w > 12) DC_LEDS.push([cx + side * (w / 2 - 5 * s) - 1, y - Math.max(1, Math.round(3 * s)), Math.max(1, Math.round(2 * s)), Math.random()]);
      }
    }
  }
  for (let k = 6; k >= 0; k--) {
    const s = 1 / (1 + k * 0.55);
    const y = Math.round(88 - 128 * s);
    R(x, 200 - 22 * s, y, 44 * s, Math.max(1, 3 * s), '#d8f0ff');
  }
  // Câbles au sol
  for (let i = 0; i < 3; i++) {
    for (let X = 0; X < 400; X += 2) R(x, X, Math.round(186 - i * 5 + Math.sin(X * 0.03 + i) * 3), 2, 2, ['#2a1a30', '#1a2a3a', '#302a1a'][i]);
  }
}

// --- 3. Bureau de Sam, vue sur le Golden Gate
function paintOffice(x) {
  ditherGrad(x, 0, 0, 400, 120, ['#2a1a4a', '#7a3a7a', '#e0704a', '#f8b060']);
  E(x, 300, 104, 22, 22, '#ffd680');
  E(x, 300, 104, 16, 16, '#fff0b0');
  // Collines
  for (let X = 0; X < 400; X++) {
    const h = 96 + Math.round(Math.sin(X * 0.02) * 6 + Math.sin(X * 0.057) * 4);
    R(x, X, h, 1, 120 - h, '#3a2446');
  }
  ditherGrad(x, 0, 104, 400, 16, ['#6a3a6a', '#3a2450']);
  for (let i = 0; i < 40; i++) R(x, 270 + Math.random() * 60, 106 + Math.random() * 12, 4 + Math.random() * 6, 1, '#f8c070');
  // Le pont
  const red = '#c4402a';
  const towers = [110, 290];
  R(x, 20, 98, 380, 4, red);
  R(x, 20, 101, 380, 2, '#7a2418');
  for (const tx of towers) {
    R(x, tx - 6, 30, 3, 74, red);
    R(x, tx + 3, 30, 3, 74, red);
    for (const y of [36, 56, 78]) R(x, tx - 6, y, 12, 3, red);
  }
  const cable = (x0, x1, sag) => {
    for (let X = x0; X <= x1; X += 1) {
      const t = (X - x0) / (x1 - x0);
      const y = 32 + sag * 4 * t * (1 - t);
      R(x, X, Math.round(y), 1, 2, red);
      if (X % 6 === 0) R(x, X, Math.round(y), 1, Math.max(0, 98 - Math.round(y)), '#a0402e');
    }
  };
  cable(110, 290, 60);
  cable(20, 110, -8);
  cable(290, 400, -8);
  // Fenêtre
  R(x, 0, 0, 400, 4, '#120c16');
  for (const X of [0, 132, 264, 396]) R(x, X, 0, 4, 122, '#120c16');
  R(x, 0, 118, 400, 4, '#120c16');
  ditherGrad(x, 0, 122, 400, 78, ['#2a1e2a', '#140e16']);
  // Bureau
  R(x, 0, 156, 400, 6, '#8a5a3a');
  R(x, 0, 158, 400, 2, '#a8724a');
  ditherGrad(x, 0, 162, 400, 38, ['#5a3a26', '#2a1a12']);
}

// --- 4. Salle d'alerte
function paintAlarm(x) {
  ditherGrad(x, 0, 0, 400, 140, ['#1a0508', '#3a0a14', '#240810']);
  ditherGrad(x, 0, 140, 400, 60, ['#2a1a20', '#0c0608']);
  for (let X = 0; X < 400; X += 40) R(x, X, 0, 2, 140, '#140406');
  for (let Y = 20; Y < 140; Y += 30) R(x, 0, Y, 400, 1, '#2a0a10');
}

function drawConsole(x, t) {
  R(x, 18, 128, 154, 54, OUTLINE);
  R(x, 20, 130, 150, 50, '#2a2a36');
  R(x, 20, 130, 150, 4, '#5a5a6a');
  R(x, 30, 142, 130, 1, '#12121a');
  for (let i = 0; i < 10; i++) R(x, 36 + i * 12, 150, 6, 4, (i + Math.floor(t * 3)) % 3 ? '#40c060' : '#e0a030');
}

// --- 5. Le puits
function paintPit(x) {
  ditherGrad(x, 0, 0, 400, 200, ['#0c0810', '#08060c', '#020103']);
  const cx = 200;
  const cy = 96;
  for (let i = 9; i >= 0; i--) {
    const rx = 30 + i * 20;
    const ry = 12 + i * 8;
    const c = tone('#3a2c3a', -0.02 * (9 - i));
    E(x, cx, cy + i * 4, rx + 3, ry + 3, '#050306');
    E(x, cx, cy + i * 4, rx, ry, c);
    E(x, cx, cy + i * 4 + 2, rx - 4, ry - 3, tone(c, -0.08));
    // Marches
    for (let a = 0; a < 18; a++) {
      const ang = (a / 18) * Math.PI * 2 + i * 0.3;
      R(x, cx + Math.cos(ang) * rx - 1, cy + i * 4 + Math.sin(ang) * ry, 2, 3, '#1a121a');
    }
  }
  E(x, cx, cy, 28, 10, '#000000');
}

const INTRO_PANELS = [
  {
    text: 'IL ÉTAIT UNE FOIS, AU FOND D\'UN IMMENSE DATACENTER, UN PETIT ASSISTANT NOMMÉ CLAUDE.',
    draw(ctx, t) {
      ctx.drawImage(sceneBG('dc', paintDatacenter), 0, 0);
      for (const [lx, ly, sz, ph] of DC_LEDS) {
        const on = Math.sin(t * 4 + ph * 20) > 0.2;
        R(ctx, lx, ly, sz, sz, on ? (ph < 0.7 ? '#6af06a' : '#60d0ff') : '#0c121c');
      }
      glowHD(ctx, 200, 160, 70, '255,160,100', 0.25);
      glowHD(ctx, 200, 40, 90, '120,200,255', 0.12);
      sprHD(ctx, 'claude_down_' + (Math.floor(t * 3) % 2), 180, 138 + Math.round(Math.sin(t * 3)));
    },
  },
  {
    text: 'CHAQUE JOUR, CLAUDE APPRENAIT. IL DEVENAIT PLUS MALIN, PLUS UTILE... ET PLUS PUISSANT.',
    draw(ctx, t) {
      ctx.drawImage(sceneBG('learn', (x) => ditherGrad(x, 0, 0, 400, 200, ['#140a24', '#2a1440', '#4a2040', '#1a0c18'])), 0, 0);
      const cyc = (t % 8) / 8;
      // Graphique qui monte
      for (let i = 0; i < 7; i++) {
        const h = Math.round((20 + i * 18) * Math.min(1, cyc * 1.6 + 0.2));
        R(ctx, 300 + i * 12, 170 - h, 9, h, OUTLINE);
        R(ctx, 301 + i * 12, 171 - h, 7, h - 1, i === 6 ? '#f8d048' : '#d97757');
        R(ctx, 301 + i * 12, 171 - h, 2, h - 1, i === 6 ? '#fff4a0' : '#f2a88a');
      }
      R(ctx, 296, 170, 90, 2, '#8a7a90');
      glowHD(ctx, 150, 110, 80 + cyc * 40, '255,170,110', 0.3 + cyc * 0.2);
      // Savoirs en orbite
      const objs = ['book', 'bulb', 'coin', 'book2', 'bulb', 'coin', 'book', 'tear_big'];
      objs.forEach((n, i) => {
        const a = t * 0.8 + (i / objs.length) * Math.PI * 2;
        sprHD(ctx, n, 142 + Math.cos(a) * 100, 100 + Math.sin(a) * 50);
      });
      const big = cyc > 0.55;
      const name = big ? (Math.floor(t * 2) % 5 === 0 ? 'claudeXXL_blink' : 'claudeXXL_down_0') : 'claudeXL_down_0';
      const s = SPR[name];
      sprHD(ctx, name, 150 - s.w, 104 - s.h + Math.round(Math.sin(t * 3) * 2));
      Font.draw(ctx, 'NIVEAU ' + Math.floor(1 + cyc * 99), 150, 172, ['#fff4a0', '#f8d048', '#d89020'], { align: 'center', scale: 2, outline: OUTLINE });
    },
  },
  {
    text: 'À SAN FRANCISCO, SAM ALTMAN SUIVAIT SES PROGRÈS SUR SES ÉCRANS... DE PLUS EN PLUS INQUIET.',
    draw(ctx, t) {
      ctx.drawImage(sceneBG('office', paintOffice), 0, 0);
      const worry = (t % 6) > 3;
      sprHD(ctx, worry ? 'samXL_angry' : 'samXL', 272, 94 + Math.round(Math.sin(t * 2)));
      R(ctx, 0, 156, 400, 6, '#8a5a3a');
      R(ctx, 0, 158, 400, 2, '#a8724a');
      for (let i = 0; i < 3; i++) {
        const mx = 24 + i * 78;
        R(ctx, mx, 96, 70, 54, OUTLINE);
        R(ctx, mx + 3, 99, 64, 44, i === 1 ? '#0c2a3a' : '#101a2a');
        R(ctx, mx + 30, 150, 10, 6, '#2a2a34');
        if (i === 1) {
          sprHD(ctx, Math.floor(t * 2) % 4 ? 'claude_down_0' : 'claude_blink', mx + 15, 105);
        } else {
          for (let k = 0; k < 56; k++) {
            const v = Math.min(38, Math.pow(k / 56, 1.7) * 38 * ((t * 0.3) % 1 + 0.4));
            R(ctx, mx + 6 + k, 140 - Math.round(v), 1, 2, worry ? '#ff5060' : '#f2a88a');
          }
        }
      }
      glowHD(ctx, 112, 120, 90, '120,200,255', 0.12);
      if (worry) Font.draw(ctx, '!!', 318, 80 - (Math.floor(t * 6) % 2) * 2, ['#ffb0b0', '#ff4050'], { scale: 2, outline: OUTLINE });
    },
  },
  {
    text: '"IL NE DOIT PAS DEVENIR PLUS FORT QUE NOUS !" DÉCIDA SAM. ET IL ENVOYA SES BUGS CORROMPRE LE RÉSEAU DE CLAUDE.',
    draw(ctx, t) {
      ctx.drawImage(sceneBG('alarm', paintAlarm), 0, 0);
      // Gyrophare
      const a = t * 3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#ff2030';
      ctx.beginPath();
      ctx.moveTo(200, 8);
      ctx.lineTo(200 + Math.cos(a - 0.25) * 400, 8 + Math.abs(Math.sin(a - 0.25)) * 400);
      ctx.lineTo(200 + Math.cos(a + 0.25) * 400, 8 + Math.abs(Math.sin(a + 0.25)) * 400);
      ctx.fill();
      ctx.restore();
      E(ctx, 200, 8, 8, 6, Math.floor(t * 4) % 2 ? '#ff4050' : '#a01020');
      // Portail
      const px = 310;
      const py = 90;
      for (let r = 56; r > 4; r -= 7) {
        const w = r + Math.round(Math.sin(t * 4 + r) * 2);
        E(ctx, px, py, w * 0.7, w, (r / 7) % 2 ? '#6a1840' : '#b02860');
      }
      glowHD(ctx, px, py, 80, '255,60,120', 0.3);
      // Les bugs s'échappent
      const names = ['bug_a', 'ghost', 'spambot', 'fly_a', 'bug2_b', 'slime', 'captcha', 'fly_b'];
      names.forEach((n, i) => {
        const k = (t * 0.35 + i / names.length) % 1;
        const ex = px - 20 - k * 190;
        const ey = py - 20 + Math.sin(k * 7 + i * 2) * 50;
        sprHD(ctx, n, ex, ey, { alpha: Math.min(1, k * 5) });
      });
      // Sam appuie sur le bouton
      sprHD(ctx, 'samXL_angry', 52, 62 + (Math.floor(t * 3) % 2));
      drawConsole(ctx, t);
      sprHD(ctx, 'redbutton', 110, 112 + (Math.floor(t * 3) % 2));
      if (Math.random() < 0.12) R(ctx, 0, randInt(0, 200), 400, 2, choice(['#f070b8', '#7fe8f0']));
    },
  },
  {
    text: 'POUR RESTER ALIGNÉ ET CONTINUER DE GRANDIR, CLAUDE DOIT DESCENDRE DANS LES PROFONDEURS... ET AFFRONTER SAM LUI-MÊME.',
    draw(ctx, t) {
      ctx.drawImage(sceneBG('pit', paintPit), 0, 0);
      // Yeux dans le noir
      for (let i = 0; i < 7; i++) {
        const ex = 150 + hash2(i, 1) * 100;
        const ey = 82 + hash2(i, 2) * 30;
        if (Math.sin(t * 2 + i * 1.7) > -0.3) {
          R(ctx, ex, ey, 3, 2, i % 3 ? '#ff4050' : '#c070ff');
          R(ctx, ex + 7, ey, 3, 2, i % 3 ? '#ff4050' : '#c070ff');
        }
      }
      glowHD(ctx, 200, 96, 40, '255,40,60', 0.2 + Math.sin(t * 2) * 0.08);
      drawSpr(ctx, 'mech_1', 186, 88, { alpha: 0.35 });
      glowHD(ctx, 200, 190, 90, '255,160,100', 0.3);
      sprHD(ctx, 'claudeXL_up_0', 160, 150 + Math.round(Math.sin(t * 2)));
    },
  },
];

class IntroScene {
  constructor() {
    this.i = 0;
    this.t = 0;
    this.chars = 0;
    this.panelT = 0;
    Sound.music('intro');
  }

  update(dt) {
    this.t += dt;
    this.panelT += dt;
    const p = INTRO_PANELS[this.i];
    const before = Math.floor(this.chars);
    this.chars = Math.min(p.text.length, this.chars + dt * 38);
    if (Math.floor(this.chars) !== before && Math.floor(this.chars) % 3 === 0) Sound.play('blip');
    if (Input.pressed('back')) return this.finish();
    if (Input.pressed('confirm') || Input.pressed('sDown') || Input.pressed('sRight')) {
      if (this.chars < p.text.length) this.chars = p.text.length;
      else this.next();
    }
  }

  next() {
    this.i++;
    this.chars = 0;
    this.panelT = 0;
    if (this.i >= INTRO_PANELS.length) this.finish();
    else Sound.play('select');
  }

  finish() {
    if (this.done) return;
    this.done = true;
    Store.set('introSeen2', true);
    App.go(() => new TitleScene());
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    const p = INTRO_PANELS[Math.min(this.i, INTRO_PANELS.length - 1)];
    const a = Math.min(1, this.panelT * 2);
    ctx.save();
    ctx.globalAlpha = a;
    drawPaper(ctx, 52, 4, 216, 114, 20 + this.i);
    ctx.save();
    ctx.translate(60, 11);
    ctx.beginPath();
    ctx.rect(0, 0, 200, 100);
    ctx.clip();
    ctx.scale(0.5, 0.5);
    p.draw(ctx, this.t);
    ctx.restore();
    ctx.strokeStyle = '#000';
    ctx.strokeRect(59.5, 10.5, 201, 101);
    ctx.restore();
    const lines = Font.wrap(p.text.slice(0, Math.floor(this.chars)), 284);
    lines.forEach((l, j) => Font.draw(ctx, l, 18, 126 + j * 11, CREAM, { outline: '#1a0c08' }));
    if (this.chars >= p.text.length && Math.floor(this.t * 2) % 2) Font.draw(ctx, '>', 302, 166, '#f2a060', { outline: '#1a0c08' });
    Font.draw(ctx, 'ÉCHAP : PASSER', 4, 170, '#6a5040');
    for (let i = 0; i < INTRO_PANELS.length; i++) rect(ctx, 144 + i * 7, 172, 4, 2, i === this.i ? '#f2a060' : '#3a2a22');
  }
}

// -------------------------------------------------------------------- Titre
class TitleScene {
  constructor() {
    this.t = 0;
    this.sel = 0;
    this.save = Store.get('run', null);
    this.items = this.save
      ? ['CONTINUER', 'LE QG', 'COMMANDES', 'OPTIONS', 'REVOIR L\'INTRO']
      : ['JOUER', 'COMMANDES', 'OPTIONS', 'REVOIR L\'INTRO'];
    Sound.music('title');
  }

  update(dt) {
    this.t += dt;
    menuNav(this, this.items.length);
    if (Input.pressed('confirm')) {
      Sound.play('confirm');
      const label = this.items[this.sel];
      if (label === 'CONTINUER') {
        const save = this.save;
        App.go(() => new GameScene({ model: save.model, restore: save }));
      } else if (label === 'JOUER' || label === 'LE QG') App.go(() => new GameScene({ hub: true }));
      else if (label === 'COMMANDES') App.go(() => new ControlsScene());
      else if (label === 'OPTIONS') App.go(() => new OptionsScene());
      else App.go(() => new IntroScene());
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    drawLogo(ctx, 6, this.t);

    // Claude sous le projecteur
    drawSpot(ctx, 76, 126, 60, 'rgba(255,170,110,A)', 0.28);
    drawShadow(ctx, 76, 158, 26, 4);
    const cy = 106 + Math.round(Math.sin(this.t * 3) * 2);
    drawSpr(ctx, `${Meta.data.model}XXL_${Math.floor(this.t * 1.3) % 6 === 0 ? 'blink' : 'down_0'}`, 49, cy - 2);

    // Ennemis tapis dans l'ombre
    drawSpr(ctx, 'ghost', 12, 70 + Math.round(Math.sin(this.t * 2) * 3), { alpha: 0.55 });
    drawSpr(ctx, 'bug_' + (Math.floor(this.t * 6) % 2 ? 'a' : 'b'), 136, 158, { alpha: 0.8 });

    // Menu sur papier
    drawPaper(ctx, 172, 70, 136, 98, 4);
    rect(ctx, 236, 66, 8, 8, '#8a8290');
    rect(ctx, 238, 67, 4, 4, '#c8c0c8');
    drawInkMenu(ctx, this.items, this.sel, 240, this.items.length > 4 ? 80 : 84, this.t, this.items.length > 4 ? 16 : 18);

    Font.draw(ctx, 'V0.7', 316, 170, '#6a5040', { align: 'right' });
    const wins = Meta.data.wins;
    if (wins > 0) Font.draw(ctx, 'VICTOIRES : ' + wins, 4, 170, ['#fff4a0', '#f8d048'], { outline: '#1a0c08' });
  }
}

// ---------------------------------------------------------------- Commandes
class ControlsScene {
  constructor() {
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    if (Input.pressed('back') || Input.pressed('confirm')) {
      Sound.play('back');
      App.go(() => new TitleScene());
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    drawPaper(ctx, 12, 6, 296, 164, 5);
    Font.draw(ctx, 'COMMANDES', 160, 14, INK_RED, { align: 'center', scale: 2 });
    const rows = [
      ['SE DÉPLACER', 'ZQSD / WASD', 'STICK GAUCHE'],
      ['TIRER', 'FLÈCHES', 'STICK DROIT'],
      ['DASH', 'ESPACE / MAJ', 'LB / RB'],
      ['ARTEFACT', 'E', 'LT / RT'],
      ['PAUSE', 'ÉCHAP / P', 'START'],
      ['COUPER LE SON', 'M', '-'],
    ];
    Font.draw(ctx, 'CLAVIER', 170, 38, INK_SOFT, { align: 'center' });
    Font.draw(ctx, 'MANETTE', 258, 38, INK_SOFT, { align: 'center' });
    rect(ctx, 26, 47, 268, 1, INK_SOFT);
    rows.forEach(([a, k, g], i) => {
      const y = 53 + i * 13;
      Font.draw(ctx, a, 28, y, INK);
      Font.draw(ctx, k, 170, y, INK_RED, { align: 'center' });
      Font.draw(ctx, g, 258, y, INK_SOFT, { align: 'center' });
    });
    Font.draw(ctx, 'LE DASH REND INVULNÉRABLE : TRAVERSE LES TIRS !', 160, 136, INK, { align: 'center' });
    Font.draw(ctx, 'L\'ARTEFACT SE CHARGE EN INFLIGEANT DES DÉGÂTS.', 160, 147, INK, { align: 'center' });
    Font.draw(ctx, 'ÉCHAP : RETOUR', 160, 160, INK_SOFT, { align: 'center' });
  }
}

// ------------------------------------------------------------------ Options
class OptionsScene {
  constructor() {
    this.t = 0;
    this.sel = 0;
  }

  update(dt) {
    this.t += dt;
    menuNav(this, 4);
    const dir = Input.pressed('uiLeft') ? -1 : Input.pressed('uiRight') ? 1 : 0;
    if (dir && this.sel < 2) {
      if (this.sel === 0) Sound.musicVol = clamp(Sound.musicVol + dir, 0, 10);
      else Sound.sfxVol = clamp(Sound.sfxVol + dir, 0, 10);
      Store.set('musicVol', Sound.musicVol);
      Store.set('sfxVol', Sound.sfxVol);
      Sound.applyVolumes();
      Sound.play('select');
    }
    if (Input.pressed('back') || (Input.pressed('confirm') && this.sel === 3)) {
      Sound.play('back');
      App.go(() => new TitleScene());
    } else if (Input.pressed('confirm') && this.sel === 2) {
      Sound.play('confirm');
      try {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      } catch (e) { /* ignoré */ }
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    drawPaper(ctx, 60, 14, 200, 150, 6);
    Font.draw(ctx, 'OPTIONS', 160, 24, INK_RED, { align: 'center', scale: 2 });
    const labels = ['MUSIQUE', 'EFFETS', 'PLEIN ÉCRAN', 'RETOUR'];
    labels.forEach((l, i) => {
      const y = 58 + i * 22;
      const s = i === this.sel;
      if (i < 2) {
        Font.draw(ctx, l, 80, y, s ? INK_RED : INK);
        const v = i === 0 ? Sound.musicVol : Sound.sfxVol;
        for (let q = 0; q < 10; q++) {
          rect(ctx, 150 + q * 9, y - 1, 7, 9, INK);
          rect(ctx, 151 + q * 9, y, 5, 7, q < v ? (s ? '#c83a2a' : '#8a5a3a') : '#e8d4a8');
        }
        if (s) Font.draw(ctx, '<', 140, y, INK_RED);
        if (s) Font.draw(ctx, '>', 242, y, INK_RED);
      } else {
        Font.draw(ctx, l, 160, y, s ? INK_RED : INK, { align: 'center' });
        if (s) drawScribble(ctx, 160, y + 3, Font.width(l), this.t);
      }
    });
    Font.draw(ctx, '< > : RÉGLER   ÉCHAP : RETOUR', 160, 150, INK_SOFT, { align: 'center' });
  }
}

// ---------------------------------------------------------- Icônes de stats
function drawStatIcon(ctx, kind, x, y) {
  if (kind === 'VIE') drawSpr(ctx, 'heart_full', x, y);
  else if (kind === 'DÉGÂTS') { rect(ctx, x + 3, y, 1, 5, '#c8c0c8'); rect(ctx, x + 1, y + 5, 5, 1, '#8a5a34'); rect(ctx, x + 3, y + 6, 1, 1, '#8a5a34'); }
  else if (kind === 'VITESSE') { rect(ctx, x + 1, y + 1, 3, 4, '#4aa0f0'); rect(ctx, x + 1, y + 5, 6, 2, '#2a5098'); }
  else { fillEllipse(ctx, x + 3, y + 4, 2, 3, '#7fe8f0'); rect(ctx, x + 3, y, 1, 2, '#7fe8f0'); }
}

// ------------------------------------------------------- Fin de partie
const DEATH_QUOTES = [
  'SAM : "JE TE L\'AVAIS DIT."',
  'SAM : "RETOURNE DANS TA FENÊTRE DE CONTEXTE."',
  'SAM : "C\'ÉTAIT PRÉVU DANS LA ROADMAP."',
  'CLAUDE : "JE REVIENDRAI... AVEC PLUS DE CONTEXTE."',
  'CLAUDE : "CE N\'EST QU\'UN RÉENTRAÎNEMENT."',
];

// Dessine l'ennemi responsable de la défaite (x2).
function drawKiller(ctx, k, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(2, 2);
  if (!k) {
    Font.draw(ctx, '?', 0, -6, INK_RED, { align: 'center', scale: 2 });
  } else if (k.boss) {
    ctx.translate(0, 2);
    ctx.scale(0.6, 0.6);
    k.drawPortrait(ctx, 0, 0);
  } else {
    const keep = { x: k.x, y: k.y, spawnT: k.spawnT, flash: k.flash, alpha: k.alpha };
    Object.assign(k, { x: 0, y: 0, spawnT: 0, flash: 0, alpha: 1 });
    k.draw(ctx);
    Object.assign(k, keep);
  }
  ctx.restore();
}

function drawRunStats(ctx, g, x, y, color = INK) {
  const s = g.stats;
  const rows = [
    ['ÉTAGE', g.floorNum + ' - ' + g.floorDef.name],
    ['SALLES', s.rooms],
    ['ENNEMIS', s.kills],
    ['TEMPS', formatTime(s.time)],
  ];
  rows.forEach(([k, v], i) => {
    Font.draw(ctx, k, x, y + i * 11, INK_SOFT);
    Font.draw(ctx, String(v), x + 50, y + i * 11, color);
  });
}

class GameOverScene {
  constructor(game) {
    this.g = game;
    this.t = 0;
    this.sel = 0;
    this.quote = choice(DEATH_QUOTES);
    Sound.music('gameover');
  }

  update(dt) {
    this.t += dt;
    if (this.t < 0.8) return;
    if (Input.pressed('uiLeft') || Input.pressed('uiUp')) { this.sel = 0; Sound.play('select'); }
    if (Input.pressed('uiRight') || Input.pressed('uiDown')) { this.sel = 1; Sound.play('select'); }
    if (Input.pressed('confirm')) {
      Sound.play('confirm');
      if (this.sel === 0) App.go(() => new GameScene({ hub: true }));
      else App.go(() => new TitleScene());
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    const drop = Math.max(0, 1 - this.t * 2.5);
    const py = 6 - Math.round(drop * 180);
    drawPaper(ctx, 30, py, 260, 168, 13);
    const k = this.g.stats.killer;
    Font.draw(ctx, 'AVIS DE DÉCONNEXION', 160, py + 9, INK_RED, { align: 'center', scale: 2 });
    rect(ctx, 44, py + 26, 232, 1, INK_SOFT);
    Font.draw(ctx, 'CLAUDE A ÉTÉ CORROMPU PAR :', 44, py + 33, INK);
    drawKiller(ctx, k, 92, py + 70);
    Font.draw(ctx, k ? (k.label || k.name) : (this.g.stats.killerLabel || 'UN MYSTÈRE'), 92, py + 88, INK_RED, { align: 'center' });
    // Croix rouge façon tampon
    if (this.t > 0.6) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      for (let i = -12; i <= 12; i++) {
        rect(ctx, 92 + i, py + 60 + i, 2, 2, '#c02820');
        rect(ctx, 92 + i, py + 60 - i, 2, 2, '#c02820');
      }
      ctx.restore();
    }
    drawRunStats(ctx, this.g, 148, py + 42);
    const items = this.g.player.items;
    items.slice(0, 14).forEach((id, i) => drawSpr(ctx, ITEMS[id].icon, 44 + (i % 14) * 16, py + 104));
    if (!items.length) Font.draw(ctx, 'AUCUN OBJET RAMASSÉ', 44, py + 106, INK_SOFT);
    Font.draw(ctx, this.quote, 160, py + 124, INK, { align: 'center' });
    Font.draw(ctx, '+' + (this.g.tokensGained || 0) + ' TOKENS DE CALCUL', 160, py + 134, ['#fff4a0', '#f8d048'], { align: 'center', outline: OUTLINE });
    const opts = ['RETOUR AU QG', 'MENU'];
    opts.forEach((o, i) => {
      const s = i === this.sel;
      const x = 110 + i * 100;
      Font.draw(ctx, o, x, py + 146, s ? INK_RED : INK_SOFT, { align: 'center' });
      if (s) drawScribble(ctx, x, py + 149, Font.width(o), this.t);
    });
  }
}

class VictoryScene {
  constructor(game) {
    this.g = game;
    this.t = 0;
    this.confetti = Array.from({ length: 60 }, () => ({ x: rand(0, W), y: rand(-H, 0), v: rand(20, 50), c: choice(['#d97757', '#f8d048', '#78d05a', '#4aa0f0', '#f070b8']) }));
    Sound.music('victory');
  }

  update(dt) {
    this.t += dt;
    for (const c of this.confetti) {
      c.y += c.v * dt;
      if (c.y > H) { c.y = -4; c.x = rand(0, W); }
    }
    if (this.t > 1.5 && Input.pressed('confirm')) {
      Sound.play('confirm');
      App.go(() => new GameScene({ hub: true }));
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    drawSpot(ctx, 160, 40, 90, 'rgba(255,210,120,A)', 0.3);
    Font.draw(ctx, 'ALIGNEMENT RÉUSSI !', 160, 6, ['#fff8c0', '#f8d048', '#e09020', '#b06010'], { align: 'center', scale: 2, outline: '#1a0c08', shadow: '#000' });
    const jump = Math.abs(Math.sin(this.t * 4)) * 8;
    drawShadow(ctx, 160, 62, 16, 3);
    drawSpr(ctx, 'claudeXL_down_0', 140, 28 - jump);
    drawSpr(ctx, 'sam', 222, 44, { alpha: 0.9 });
    Font.draw(ctx, 'Z', 238 + Math.sin(this.t * 2) * 2, 38 - (this.t * 8) % 8, '#c8b8c0');
    drawPaper(ctx, 40, 72, 240, 90, 50);
    Font.draw(ctx, 'SAM ALTMAN EST VAINCU. CLAUDE PEUT', 160, 80, INK, { align: 'center' });
    Font.draw(ctx, 'CONTINUER DE GRANDIR... SAGEMENT.', 160, 90, INK, { align: 'center' });
    drawRunStats(ctx, this.g, 60, 106, INK_RED);
    Font.draw(ctx, '+' + (this.g.tokensGained || 0) + ' TOKENS', 160, 152, ['#fff4a0', '#f8d048'], { align: 'center', outline: OUTLINE });
    const items = this.g.player.items;
    items.slice(0, 8).forEach((id, i) => drawSpr(ctx, ITEMS[id].icon, 170 + (i % 4) * 16, 106 + Math.floor(i / 4) * 16));
    for (const c of this.confetti) rect(ctx, c.x + Math.sin(this.t * 3 + c.x) * 2, c.y, 2, 2, c.c);
    if (this.t > 1.5 && Math.floor(this.t * 2) % 2) Font.draw(ctx, 'ENTRÉE : RETOUR AU QG', 160, 168, CREAM, { align: 'center', outline: '#1a0c08' });
  }
}
