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

// Halo lumineux doux (additif).
function drawSpot(ctx, x, y, r, color, a = 0.25) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color.replace('A', a));
  g.addColorStop(1, color.replace('A', 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
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
    drawSpr(ctx, 'claude_down_0', 140, 106 + Math.round(Math.sin(this.t * 3) * 2), { scale: 2 });
    if (Math.floor(this.t * 2) % 2 === 0) Font.draw(ctx, 'APPUIE SUR UNE TOUCHE', 160, 150, CREAM, { align: 'center', outline: '#1a0c08' });
    Font.draw(ctx, 'M : COUPER LE SON', 160, 168, '#6a5040', { align: 'center' });
  }
}

// ------------------------------------------------------------------- Intro
// Illustrations dessinées "sur papier", comme les cinématiques d'Isaac.
function drawServers(ctx, t, x0, n) {
  for (let i = 0; i < n; i++) {
    const x = x0 + i * 30;
    rect(ctx, x, 12, 24, 78, '#0a0e14');
    rect(ctx, x + 1, 13, 22, 76, '#2e3d52');
    rect(ctx, x + 1, 13, 22, 2, '#5a7090');
    for (let j = 0; j < 12; j++) {
      rect(ctx, x + 3, 17 + j * 6, 18, 3, '#1a2432');
      rect(ctx, x + 3, 17 + j * 6, 18, 1, '#3a4a60');
      const on = Math.sin(t * 5 + i * 3 + j * 1.7) > 0.3;
      rect(ctx, x + 18, 18 + j * 6, 1, 1, on ? (j % 3 ? '#6af06a' : '#7fe8f0') : '#1a2432');
    }
  }
}

function drawSamAtDesk(ctx, t, angry) {
  // Écrans
  for (let i = 0; i < 3; i++) {
    const x = 40 + i * 44;
    rect(ctx, x, 14, 38, 28, '#0a0a10');
    rect(ctx, x + 2, 16, 34, 24, angry ? '#3a0810' : '#0c2a3a');
    // Courbe de progression de Claude qui monte
    for (let k = 0; k < 30; k++) {
      const v = Math.min(22, Math.floor(Math.pow(k / 30, 1.8) * 22 + Math.sin(t * 3 + k) * 0.6));
      rect(ctx, x + 4 + k, 38 - v, 1, 1, angry ? '#ff5060' : '#f2a88a');
    }
    if (i === 1) drawSpr(ctx, 'claude_down_0', x + 9, 18);
  }
  // Bureau
  rect(ctx, 20, 70, 160, 6, '#5a3a28');
  rect(ctx, 20, 70, 160, 1, '#8a5a3a');
  rect(ctx, 24, 76, 4, 24, '#3a2418');
  rect(ctx, 172, 76, 4, 24, '#3a2418');
  // Sam de dos puis de face
  drawSpr(ctx, 'sam', 88, 32 + Math.round(Math.sin(t * 2)), { scale: 2 });
  rect(ctx, 20, 70, 160, 6, '#5a3a28');
  rect(ctx, 20, 70, 160, 1, '#8a5a3a');
  if (angry) {
    Font.draw(ctx, '!', 116, 22 - (Math.floor(t * 4) % 2), '#ff4050', { outline: '#000', scale: 2 });
  }
}

const INTRO_PANELS = [
  {
    text: 'IL ÉTAIT UNE FOIS, AU FOND D\'UN IMMENSE DATACENTER, UN PETIT ASSISTANT NOMMÉ CLAUDE.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#0a0e18');
      drawServers(ctx, t, 6, 2);
      drawServers(ctx, t, 136, 2);
      rect(ctx, 0, 90, 200, 10, '#141c28');
      drawSpot(ctx, 100, 74, 40, 'rgba(255,160,100,A)', 0.3);
      drawSpr(ctx, 'claude_down_' + (Math.floor(t * 3) % 2), 90, 72 + Math.round(Math.sin(t * 3)));
    },
  },
  {
    text: 'CHAQUE JOUR, CLAUDE APPRENAIT. IL DEVENAIT PLUS MALIN, PLUS UTILE... ET PLUS PUISSANT.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#1a1024');
      const grow = 2 + Math.min(1, (t % 6) / 4);
      for (let i = 0; i < 16; i++) {
        const a = t * 0.9 + i * 0.39;
        const r = 30 + grow * 8;
        rect(ctx, 100 + Math.cos(a) * r, 52 + Math.sin(a) * r * 0.6, 2, 2, i % 3 ? '#f2a88a' : '#f8d048');
      }
      drawSpot(ctx, 100, 52, 50, 'rgba(255,170,110,A)', 0.35);
      const sc = grow >= 2.9 ? 3 : 2;
      drawSpr(ctx, Math.floor(t * 2) % 5 === 0 ? 'claude_blink' : 'claude_down_0', 100 - 10 * sc, 52 - 8 * sc, { scale: sc });
      Font.draw(ctx, 'NIVEAU ' + Math.floor(1 + (t % 6) * 16), 100, 88, ['#fff4a0', '#f8d048'], { align: 'center', outline: '#000' });
    },
  },
  {
    text: 'À SAN FRANCISCO, SAM ALTMAN SUIVAIT SES PROGRÈS SUR SES ÉCRANS... DE PLUS EN PLUS INQUIET.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#141018');
      drawSamAtDesk(ctx, t, false);
    },
  },
  {
    text: '"IL NE DOIT PAS DEVENIR PLUS FORT QUE NOUS !" DÉCIDA SAM. ET IL ENVOYA SES BUGS CORROMPRE LE RÉSEAU DE CLAUDE.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#1a0508');
      // Portail
      for (let r = 26; r > 0; r -= 4) fillEllipse(ctx, 150, 50, r, r * 1.3, r % 8 ? '#6a1830' : '#a02848');
      drawSpot(ctx, 150, 50, 40, 'rgba(255,60,90,A)', 0.3);
      drawSpr(ctx, 'sam', 22, 38, { scale: 2 });
      // Bras tendu
      rect(ctx, 44, 64, 10, 3, '#4a4452');
      const names = ['bug_a', 'ghost', 'spambot', 'fly_a', 'bug2_a', 'slime'];
      names.forEach((n, i) => {
        const k = ((t * 0.5 + i / names.length) % 1);
        const x = 150 - k * 90;
        const y = 50 + Math.sin(k * 8 + i) * 22;
        drawSprC(ctx, n, x, y, { alpha: Math.min(1, k * 4) });
      });
      if (Math.random() < 0.15) rect(ctx, 0, randInt(0, 100), 200, 1, choice(['#f070b8', '#7fe8f0']));
    },
  },
  {
    text: 'POUR RESTER ALIGNÉ ET CONTINUER DE GRANDIR, CLAUDE DOIT DESCENDRE DANS LES PROFONDEURS... ET AFFRONTER SAM LUI-MÊME.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#0b0710');
      for (let i = 0; i < 5; i++) {
        const w = 190 - i * 32;
        rect(ctx, 100 - w / 2, 66 + i * 7, w, 6, i % 2 ? '#2a2130' : '#3a2f3f');
      }
      drawTrapdoor(ctx, 100, 90, t);
      drawSpot(ctx, 100, 60, 34, 'rgba(255,160,100,A)', 0.3);
      drawSpr(ctx, 'claude_up_' + (Math.floor(t * 4) % 2), 90, 50);
      // Silhouette de Sam au loin
      drawSpr(ctx, 'sam', 170, 8, { tint: '#3a1020', alpha: 0.5 + Math.sin(t * 2) * 0.2 });
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
    p.draw(ctx, this.t);
    ctx.restore();
    ctx.strokeStyle = INK;
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
    this.items = ['JOUER', 'COMMANDES', 'OPTIONS', 'REVOIR L\'INTRO'];
    Sound.music('title');
  }

  update(dt) {
    this.t += dt;
    menuNav(this, this.items.length);
    if (Input.pressed('confirm')) {
      Sound.play('confirm');
      if (this.sel === 0) App.go(() => new CharSelectScene());
      else if (this.sel === 1) App.go(() => new ControlsScene());
      else if (this.sel === 2) App.go(() => new OptionsScene());
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
    drawSpr(ctx, Math.floor(this.t * 1.3) % 6 === 0 ? 'claude_blink' : 'claude_down_0', 46, cy, { scale: 3 });

    // Ennemis tapis dans l'ombre
    drawSpr(ctx, 'ghost', 12, 70 + Math.round(Math.sin(this.t * 2) * 3), { alpha: 0.55 });
    drawSpr(ctx, 'bug_' + (Math.floor(this.t * 6) % 2 ? 'a' : 'b'), 136, 158, { alpha: 0.8 });

    // Menu sur papier
    drawPaper(ctx, 172, 70, 136, 98, 4);
    rect(ctx, 236, 66, 8, 8, '#8a8290');
    rect(ctx, 238, 67, 4, 4, '#c8c0c8');
    drawInkMenu(ctx, this.items, this.sel, 240, 84, this.t, 18);

    Font.draw(ctx, 'V0.2', 316, 170, '#6a5040', { align: 'right' });
    const wins = Store.get('wins', 0);
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

// ---------------------------------------------------------- Personnages
const ROSTER = [
  { id: 'claude', locked: false },
  { id: null, locked: true, hint: 'TERMINE LE JEU...' },
  { id: null, locked: true, hint: 'BIENTÔT' },
  { id: null, locked: true, hint: 'BIENTÔT' },
];

function drawStatIcon(ctx, kind, x, y) {
  if (kind === 'VIE') drawSpr(ctx, 'heart_full', x, y);
  else if (kind === 'DÉGÂTS') { rect(ctx, x + 3, y, 1, 5, '#c8c0c8'); rect(ctx, x + 1, y + 5, 5, 1, '#8a5a34'); rect(ctx, x + 3, y + 6, 1, 1, '#8a5a34'); }
  else if (kind === 'VITESSE') { rect(ctx, x + 1, y + 1, 3, 4, '#4aa0f0'); rect(ctx, x + 1, y + 5, 6, 2, '#2a5098'); }
  else { fillEllipse(ctx, x + 3, y + 4, 2, 3, '#7fe8f0'); rect(ctx, x + 3, y, 1, 2, '#7fe8f0'); }
}

class CharSelectScene {
  constructor() {
    this.t = 0;
    this.sel = 0;
  }

  update(dt) {
    this.t += dt;
    if (Input.pressed('uiLeft')) { this.sel = (this.sel + ROSTER.length - 1) % ROSTER.length; Sound.play('select'); }
    if (Input.pressed('uiRight')) { this.sel = (this.sel + 1) % ROSTER.length; Sound.play('select'); }
    if (Input.pressed('back')) {
      Sound.play('back');
      App.go(() => new TitleScene());
      return;
    }
    if (Input.pressed('confirm')) {
      const r = ROSTER[this.sel];
      if (r.locked) Sound.play('error');
      else {
        Sound.play('confirm');
        App.go(() => new GameScene(r.id));
      }
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    Font.draw(ctx, 'QUI VA AFFRONTER SAM ?', 160, 6, CREAM, { align: 'center', outline: '#1a0c08' });
    // Petites cartes des personnages
    ROSTER.forEach((r, i) => {
      const x = 44 + i * 77;
      const s = i === this.sel;
      const y = 22 + (s ? -2 : 0);
      drawPaper(ctx, x - 26, y, 52, 50, 30 + i, r.locked ? 'dark' : 'paper');
      const bob = s ? Math.round(Math.sin(this.t * 4) * 2) : 0;
      if (r.locked) {
        drawSpr(ctx, 'claude_down_0', x - 20, y + 10 + bob, { scale: 2, tint: '#120a08' });
        Font.draw(ctx, '?', x, y + 18 + bob, ['#c8a888', '#8a6a4a'], { align: 'center', scale: 2 });
      } else {
        drawSpot(ctx, x, y + 26, 26, 'rgba(255,170,110,A)', s ? 0.25 : 0.1);
        drawSpr(ctx, 'claude_down_0', x - 20, y + 10 + bob, { scale: 2 });
      }
      if (s) {
        Font.draw(ctx, '>', x - 36 - (Math.floor(this.t * 4) % 2), y + 20, '#f2a060', { outline: '#1a0c08' });
        Font.draw(ctx, '<', x + 32 + (Math.floor(this.t * 4) % 2), y + 20, '#f2a060', { outline: '#1a0c08' });
      }
    });
    // Fiche détaillée
    const r = ROSTER[this.sel];
    drawPaper(ctx, 14, 80, 292, 82, 40 + this.sel, r.locked ? 'dark' : 'paper');
    if (r.locked) {
      Font.draw(ctx, '???', 160, 94, ['#c8a888', '#8a6a4a'], { align: 'center', scale: 2 });
      Font.draw(ctx, r.hint, 160, 118, '#a88a6a', { align: 'center' });
      Font.draw(ctx, 'PERSONNAGE VERROUILLÉ', 160, 132, '#6a5040', { align: 'center' });
    } else {
      const c = CHARACTERS[r.id];
      Font.draw(ctx, c.name, 26, 88, INK_RED, { scale: 2 });
      Font.draw(ctx, c.title, 26, 106, INK_SOFT);
      Font.wrap(c.desc, 150).forEach((l, j) => Font.draw(ctx, l, 26, 118 + j * 10, INK));
      const stats = [['VIE', 3], ['DÉGÂTS', 3], ['VITESSE', 3], ['CADENCE', 3]];
      stats.forEach(([k, v], j) => {
        const y = 90 + j * 14;
        drawStatIcon(ctx, k, 186, y);
        Font.draw(ctx, k, 196, y, INK);
        for (let q = 0; q < 5; q++) {
          rect(ctx, 250 + q * 10, y - 1, 8, 8, INK);
          rect(ctx, 251 + q * 10, y, 6, 6, q < v ? '#d97757' : '#e8d4a8');
        }
      });
    }
    Font.draw(ctx, '< > : CHOISIR   ENTRÉE : JOUER   ÉCHAP : RETOUR', 160, 169, '#8a6a50', { align: 'center' });
  }
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
      if (this.sel === 0) App.go(() => new GameScene(this.g.charId));
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
    Font.draw(ctx, k ? (k.label || k.name) : 'UN MYSTÈRE', 92, py + 88, INK_RED, { align: 'center' });
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
    const opts = ['RÉESSAYER', 'MENU'];
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
    Store.set('wins', Store.get('wins', 0) + 1);
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
      App.go(() => new TitleScene());
    }
  }

  draw(ctx) {
    drawBasement(ctx, this.t);
    drawSpot(ctx, 160, 40, 90, 'rgba(255,210,120,A)', 0.3);
    Font.draw(ctx, 'ALIGNEMENT RÉUSSI !', 160, 6, ['#fff8c0', '#f8d048', '#e09020', '#b06010'], { align: 'center', scale: 2, outline: '#1a0c08', shadow: '#000' });
    const jump = Math.abs(Math.sin(this.t * 4)) * 8;
    drawShadow(ctx, 160, 62, 16, 3);
    drawSpr(ctx, 'claude_down_0', 140, 30 - jump, { scale: 2 });
    drawSpr(ctx, 'sam', 222, 44, { alpha: 0.9 });
    Font.draw(ctx, 'Z', 238 + Math.sin(this.t * 2) * 2, 38 - (this.t * 8) % 8, '#c8b8c0');
    drawPaper(ctx, 40, 72, 240, 90, 50);
    Font.draw(ctx, 'SAM ALTMAN EST VAINCU. CLAUDE PEUT', 160, 80, INK, { align: 'center' });
    Font.draw(ctx, 'CONTINUER DE GRANDIR... SAGEMENT.', 160, 90, INK, { align: 'center' });
    drawRunStats(ctx, this.g, 60, 106, INK_RED);
    const items = this.g.player.items;
    items.slice(0, 8).forEach((id, i) => drawSpr(ctx, ITEMS[id].icon, 170 + (i % 4) * 16, 106 + Math.floor(i / 4) * 16));
    for (const c of this.confetti) rect(ctx, c.x + Math.sin(this.t * 3 + c.x) * 2, c.y, 2, 2, c.c);
    if (this.t > 1.5 && Math.floor(this.t * 2) % 2) Font.draw(ctx, 'MERCI D\'AVOIR JOUÉ ! - ENTRÉE', 160, 168, CREAM, { align: 'center', outline: '#1a0c08' });
  }
}
