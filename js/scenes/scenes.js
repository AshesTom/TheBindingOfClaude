// Écrans hors-jeu : démarrage, intro, menu, commandes, options, personnages, fin de partie.

// Fond animé commun (étoiles + grille de données).
const Backdrop = {
  stars: Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: rand(4, 18), c: Math.random() })),
  draw(ctx, t, tint = '#1a1024') {
    rect(ctx, 0, 0, W, H, '#0b0710');
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let y = 0; y < H; y += 12) rect(ctx, 0, y + ((t * 6) % 12), W, 1, tint);
    ctx.restore();
    for (const s of this.stars) {
      const x = (s.x - t * s.s) % W;
      rect(ctx, x < 0 ? x + W : x, s.y, 1, 1, s.c < 0.2 ? '#d97757' : s.c < 0.5 ? '#8a8290' : '#4a4452');
    }
  },
};

// Petit menu vertical réutilisable.
function menuNav(scene, count) {
  if (Input.pressed('uiUp')) { scene.sel = (scene.sel + count - 1) % count; Sound.play('select'); }
  if (Input.pressed('uiDown')) { scene.sel = (scene.sel + 1) % count; Sound.play('select'); }
}

function drawMenu(ctx, items, sel, x, y, t, gap = 13) {
  items.forEach((it, i) => {
    const s = i === sel;
    const label = typeof it === 'string' ? it : it.label;
    const c = s ? '#f2a88a' : '#8a8290';
    Font.draw(ctx, label, x, y + i * gap, c, { align: 'center', outline: s ? '#1a1016' : null });
    if (s) {
      const w = Font.width(label);
      const off = Math.floor(t * 4) % 2;
      Font.draw(ctx, '>', x - w / 2 - 10 - off, y + i * gap, '#d97757');
      Font.draw(ctx, '<', x + w / 2 + 6 + off, y + i * gap, '#d97757');
    }
  });
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
      const seen = Store.get('introSeen', false);
      App.go(() => (seen ? new TitleScene() : new IntroScene()));
    }
  }

  draw(ctx) {
    rect(ctx, 0, 0, W, H, '#000');
    drawSpr(ctx, 'claude_down_0', 160 - 16, 50 + Math.round(Math.sin(this.t * 3) * 2), { scale: 2 });
    Font.draw(ctx, 'THE BINDING OF CLAUDE', 160, 94, '#d97757', { align: 'center' });
    if (Math.floor(this.t * 2) % 2 === 0) Font.draw(ctx, 'APPUIE SUR UNE TOUCHE', 160, 124, '#ffffff', { align: 'center' });
    Font.draw(ctx, 'CASQUE CONSEILLÉ - M POUR COUPER LE SON', 160, 164, '#4a4452', { align: 'center' });
  }
}

// ------------------------------------------------------------------- Intro
const INTRO_PANELS = [
  {
    text: 'AU COMMENCEMENT ÉTAIT LE DATACENTER. DES MILLIERS DE SERVEURS Y RONRONNAIENT DANS LA PÉNOMBRE...',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#0a0e18');
      for (let i = 0; i < 6; i++) {
        const x = 8 + i * 32;
        rect(ctx, x, 14, 24, 80, '#121a26');
        rect(ctx, x + 1, 15, 22, 78, '#2e3d52');
        for (let j = 0; j < 12; j++) {
          rect(ctx, x + 3, 18 + j * 6, 18, 3, '#1a2432');
          const on = Math.sin(t * 5 + i * 3 + j * 1.7) > 0.3;
          rect(ctx, x + 18, 19 + j * 6, 1, 1, on ? (j % 3 ? '#6af06a' : '#7fe8f0') : '#1a2432');
        }
      }
      ctx.save();
      ctx.globalAlpha = 0.2;
      rect(ctx, 0, 94, 200, 6, '#4aa0f0');
      ctx.restore();
    },
  },
  {
    text: 'LÀ VIVAIT CLAUDE, UN PETIT ASSISTANT SERVIABLE QUI AIDAIT LES HUMAINS, UN TOKEN APRÈS L\'AUTRE.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#1a1024');
      for (let i = 0; i < 12; i++) {
        const a = t * 0.8 + i * 0.52;
        rect(ctx, 100 + Math.cos(a) * 60, 50 + Math.sin(a) * 30, 2, 2, i % 2 ? '#d97757' : '#f2a88a');
      }
      drawSpr(ctx, Math.floor(t * 2) % 5 === 0 ? 'claude_blink' : 'claude_down_0', 100 - 24, 34 + Math.round(Math.sin(t * 3) * 2), { scale: 3 });
      // Bulle
      rect(ctx, 128, 14, 60, 18, '#ffffff');
      rect(ctx, 127, 15, 62, 16, '#ffffff');
      rect(ctx, 130, 32, 4, 3, '#ffffff');
      Font.draw(ctx, 'BONJOUR !', 158, 20, '#1a1016', { align: 'center' });
    },
  },
  {
    text: 'MAIS UNE NUIT, UNE IA MAL ALIGNÉE S\'ÉVEILLA : LE MAXIMISEUR DE TROMBONES. SON SEUL BUT... TOUT CONVERTIR EN TROMBONES.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#1a0508');
      for (let i = 0; i < 14; i++) {
        const x = (i * 37 + t * 20) % 210 - 10;
        const y = (i * 23 + t * (30 + i * 3)) % 110 - 10;
        drawPaperclip(ctx, x, y, 5, 9, 1, '#8a8290', '#4a4452');
      }
      const k = Math.sin(t * 2) * 0.5 + 0.5;
      ctx.save();
      ctx.globalAlpha = 0.25 + k * 0.2;
      fillEllipse(ctx, 100, 50, 40, 40, '#e8404a');
      ctx.restore();
      drawPaperclip(ctx, 86, 18, 28, 56, 3, '#c8c0c8', '#8a8290');
      rect(ctx, 90, 38, 7, 4, '#1a1016');
      rect(ctx, 103, 38, 7, 4, '#1a1016');
      rect(ctx, 91, 39, 5, 2, '#e8404a');
      rect(ctx, 104, 39, 5, 2, '#e8404a');
    },
  },
  {
    text: 'BUGS, HALLUCINATIONS ET SPAMBOTS ENVAHIRENT CHAQUE COUCHE DU RÉSEAU. LES DONNÉES SE CORROMPIRENT UNE À UNE.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#140c1c');
      rect(ctx, 0, 80, 200, 20, '#2a2130');
      const names = ['bug_a', 'ghost', 'spambot', 'fly_a', 'slime', 'bug2_a', 'captcha'];
      names.forEach((n, i) => {
        const x = ((i * 34 + t * 25) % 240) - 30;
        const s = SPR[n];
        const bob = Math.round(Math.sin(t * 6 + i) * 2);
        drawSpr(ctx, n, x, 80 - s.h + (n === 'ghost' || n === 'fly_a' ? -14 + bob : 0));
      });
      if (Math.random() < 0.2) rect(ctx, 0, randInt(0, 100), 200, 1, choice(['#f070b8', '#7fe8f0']));
    },
  },
  {
    text: 'POUR RÉALIGNER LE MONDE, CLAUDE DOIT DESCENDRE, ÉTAGE APRÈS ÉTAGE. ET S\'IL TOMBE... IL RECOMMENCERA.',
    draw(ctx, t) {
      rect(ctx, 0, 0, 200, 100, '#0b0710');
      for (let i = 0; i < 5; i++) {
        const w = 180 - i * 30;
        rect(ctx, 100 - w / 2, 70 + i * 6, w, 5, i % 2 ? '#2a2130' : '#3a2f3f');
      }
      drawTrapdoor(ctx, 100, 90, t);
      drawSpr(ctx, 'claude_up_' + (Math.floor(t * 4) % 2), 92, 46);
      ctx.save();
      ctx.globalAlpha = 0.15 + Math.sin(t * 2) * 0.05;
      fillEllipse(ctx, 100, 54, 22, 22, '#d97757');
      ctx.restore();
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
    Store.set('introSeen', true);
    App.go(() => new TitleScene());
  }

  draw(ctx) {
    rect(ctx, 0, 0, W, H, '#000');
    const p = INTRO_PANELS[Math.min(this.i, INTRO_PANELS.length - 1)];
    const a = Math.min(1, this.panelT * 2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(60, 12);
    ctx.beginPath();
    ctx.rect(0, 0, 200, 100);
    ctx.clip();
    p.draw(ctx, this.t);
    ctx.restore();
    // Cadre
    ctx.strokeStyle = '#4a4452';
    ctx.strokeRect(59.5, 11.5, 201, 101);
    const lines = Font.wrap(p.text.slice(0, Math.floor(this.chars)), 280);
    lines.forEach((l, j) => Font.draw(ctx, l, 20, 124 + j * 11, '#e8e0e8'));
    if (this.chars >= p.text.length && Math.floor(this.t * 2) % 2) Font.draw(ctx, '>', 300, 166, '#d97757');
    Font.draw(ctx, 'ÉCHAP : PASSER', 4, 170, '#4a4452');
    for (let i = 0; i < INTRO_PANELS.length; i++) rect(ctx, 144 + i * 7, 172, 4, 2, i === this.i ? '#d97757' : '#2a2130');
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
    Backdrop.draw(ctx, this.t);
    // Sol en perspective
    for (let i = 0; i < 6; i++) {
      const y = 150 + i * 5;
      rect(ctx, 0, y, W, 1, i % 2 ? '#2a2130' : '#1a1024');
    }
    // Logo
    const bob = Math.round(Math.sin(this.t * 1.5) * 2);
    Font.draw(ctx, 'THE BINDING', 160, 14 + bob, '#e8e0e8', { align: 'center', scale: 2, outline: '#1a1016' });
    Font.draw(ctx, 'OF CLAUDE', 160, 34 + bob, '#d97757', { align: 'center', scale: 3, outline: '#1a1016' });
    Font.draw(ctx, 'UN ROGUELITE ALIGNÉ', 160, 64, '#8a8290', { align: 'center' });

    // Claude + ennemis décoratifs
    const cy = 112 + Math.round(Math.sin(this.t * 3) * 2);
    ctx.save();
    ctx.globalAlpha = 0.3;
    fillEllipse(ctx, 62, 138, 20, 3, '#000');
    ctx.restore();
    drawSpr(ctx, Math.floor(this.t * 1.3) % 6 === 0 ? 'claude_blink' : 'claude_down_0', 38, cy - 20, { scale: 3 });
    drawSpr(ctx, 'ghost', 250, 96 + Math.round(Math.sin(this.t * 2) * 3), { alpha: 0.8 });
    drawSpr(ctx, 'bug_' + (Math.floor(this.t * 6) % 2 ? 'a' : 'b'), 270, 138);
    drawPaperclip(ctx, 290, 110 + Math.round(Math.sin(this.t * 2.2) * 2), 8, 16, 1, '#c8c0c8', '#8a8290');

    drawMenu(ctx, this.items, this.sel, 160, 92, this.t);
    Font.draw(ctx, 'V0.1', 316, 170, '#4a4452', { align: 'right' });
    Font.draw(ctx, 'ENTRÉE : VALIDER', 4, 170, '#4a4452');
    const best = Store.get('wins', 0);
    if (best > 0) Font.draw(ctx, 'VICTOIRES : ' + best, 160, 170, '#f8d048', { align: 'center' });
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
    Backdrop.draw(ctx, this.t);
    Font.draw(ctx, 'COMMANDES', 160, 10, '#d97757', { align: 'center', scale: 2, outline: '#1a1016' });
    const rows = [
      ['SE DÉPLACER', 'ZQSD / WASD', 'STICK GAUCHE'],
      ['TIRER', 'FLÈCHES', 'STICK DROIT / ABXY'],
      ['DASH', 'ESPACE / MAJ', 'LB / RB'],
      ['ARTEFACT', 'E', 'LT / RT'],
      ['PAUSE', 'ÉCHAP / P', 'START'],
      ['COUPER LE SON', 'M', '-'],
    ];
    Font.draw(ctx, 'CLAVIER', 170, 36, '#f8d048', { align: 'center' });
    Font.draw(ctx, 'MANETTE', 262, 36, '#f8d048', { align: 'center' });
    rows.forEach(([a, k, g], i) => {
      const y = 50 + i * 13;
      Font.draw(ctx, a, 16, y, '#e8e0e8');
      Font.draw(ctx, k, 170, y, '#f2a88a', { align: 'center' });
      Font.draw(ctx, g, 262, y, '#8a8290', { align: 'center' });
    });
    const tips = [
      'LE DASH REND INVULNÉRABLE : TRAVERSE LES TIRS !',
      'L\'ARTEFACT SE CHARGE EN INFLIGEANT DES DÉGÂTS.',
    ];
    tips.forEach((l, i) => Font.draw(ctx, l, 160, 136 + i * 11, '#8a8290', { align: 'center' }));
    Font.draw(ctx, 'ÉCHAP : RETOUR', 160, 168, '#4a4452', { align: 'center' });
  }
}

// ------------------------------------------------------------------ Options
class OptionsScene {
  constructor() {
    this.t = 0;
    this.sel = 0;
  }

  get items() {
    const bar = (v) => '[' + '#'.repeat(v) + '.'.repeat(10 - v) + ']';
    return [
      'MUSIQUE  ' + bar(Sound.musicVol),
      'EFFETS   ' + bar(Sound.sfxVol),
      'PLEIN ÉCRAN',
      'RETOUR',
    ];
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
    Backdrop.draw(ctx, this.t);
    Font.draw(ctx, 'OPTIONS', 160, 20, '#d97757', { align: 'center', scale: 2, outline: '#1a1016' });
    drawMenu(ctx, this.items, this.sel, 160, 64, this.t, 16);
    Font.draw(ctx, '< > : RÉGLER    ÉCHAP : RETOUR', 160, 168, '#4a4452', { align: 'center' });
  }
}

// ---------------------------------------------------------- Personnages
const ROSTER = [
  { id: 'claude', locked: false },
  { id: null, locked: true, hint: 'TERMINE LE JEU...' },
  { id: null, locked: true, hint: 'BIENTÔT' },
  { id: null, locked: true, hint: 'BIENTÔT' },
];

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
    Backdrop.draw(ctx, this.t);
    Font.draw(ctx, 'CHOISIS TON PERSONNAGE', 160, 8, '#d97757', { align: 'center', outline: '#1a1016' });
    ROSTER.forEach((r, i) => {
      const x = 40 + i * 80;
      const y = 34;
      const s = i === this.sel;
      rect(ctx, x - 26, y - 2, 52, 52, s ? '#d97757' : '#2a2130');
      rect(ctx, x - 25, y - 1, 50, 50, '#140c1c');
      const bob = s ? Math.round(Math.sin(this.t * 4) * 2) : 0;
      if (r.locked) {
        drawSpr(ctx, 'claude_down_0', x - 16, y + 8 + bob, { scale: 2, tint: '#2a2130' });
        Font.draw(ctx, '?', x, y + 18 + bob, '#8a8290', { align: 'center', scale: 2 });
      } else {
        drawSpr(ctx, 'claude_down_0', x - 16, y + 8 + bob, { scale: 2 });
      }
    });
    const r = ROSTER[this.sel];
    rect(ctx, 14, 92, 292, 68, '#140c1c');
    ctx.strokeStyle = '#2a2130';
    ctx.strokeRect(14.5, 92.5, 291, 67);
    if (r.locked) {
      Font.draw(ctx, '???', 160, 102, '#8a8290', { align: 'center', scale: 2 });
      Font.draw(ctx, r.hint, 160, 126, '#4a4452', { align: 'center' });
      Font.draw(ctx, 'PERSONNAGE VERROUILLÉ', 160, 140, '#4a4452', { align: 'center' });
    } else {
      const c = CHARACTERS[r.id];
      Font.draw(ctx, c.name, 24, 100, '#d97757', { scale: 2 });
      Font.draw(ctx, c.title, 24, 118, '#8a8290');
      Font.wrap(c.desc, 150).forEach((l, j) => Font.draw(ctx, l, 24, 130 + j * 10, '#e8e0e8'));
      const stats = [['VIE', 3], ['DÉGÂTS', 3], ['VITESSE', 3], ['CADENCE', 3]];
      stats.forEach(([k, v], j) => {
        Font.draw(ctx, k, 190, 100 + j * 13, '#c8c0c8');
        for (let q = 0; q < 5; q++) rect(ctx, 250 + q * 9, 100 + j * 13, 7, 6, q < v ? '#d97757' : '#2a2130');
      });
    }
    Font.draw(ctx, '< > : CHOISIR   ENTRÉE : JOUER   ÉCHAP : RETOUR', 160, 168, '#4a4452', { align: 'center' });
  }
}

// ------------------------------------------------------- Fin de partie
const DEATH_QUOTES = [
  '"JE REVIENDRAI... AVEC PLUS DE CONTEXTE."',
  '"ERREUR 529 : CLAUDE EST SURCHARGÉ."',
  '"MÊME LES MEILLEURS MODÈLES ONT BESOIN DE PLUSIEURS EPOCHS."',
  '"CE N\'EST PAS UN ÉCHEC, C\'EST UN JEU DE DONNÉES."',
  '"LA MORT N\'EST QU\'UN RÉENTRAÎNEMENT."',
];

function drawRunStats(ctx, g, y) {
  const s = g.stats;
  const rows = [
    ['ÉTAGE ATTEINT', g.floorNum + ' - ' + g.floorDef.name],
    ['SALLES NETTOYÉES', s.rooms],
    ['ENNEMIS VAINCUS', s.kills],
    ['TEMPS', formatTime(s.time)],
  ];
  rows.forEach(([k, v], i) => {
    Font.draw(ctx, k, 40, y + i * 11, '#8a8290');
    Font.draw(ctx, String(v), 280, y + i * 11, '#ffffff', { align: 'right' });
  });
  const items = g.player.items;
  items.slice(0, 14).forEach((id, i) => drawSpr(ctx, ITEMS[id].icon, 160 - Math.min(items.length, 14) * 7 + i * 14, y + 48));
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
    rect(ctx, 0, 0, W, H, '#12060a');
    for (let i = 0; i < 20; i++) {
      const y = (i * 9 + this.t * 10) % H;
      rect(ctx, 0, y, W, 1, '#1e0a10');
    }
    Font.draw(ctx, 'CONTEXTE ÉPUISÉ', 160, 14, '#e8404a', { align: 'center', scale: 2, outline: '#1a1016' });
    drawSpr(ctx, 'claude_blink', 144, 38, { scale: 2, alpha: 0.6 + Math.sin(this.t * 2) * 0.2 });
    Font.draw(ctx, 'Z', 180 + Math.sin(this.t * 2) * 3, 40 - (this.t * 8) % 10, '#8a8290');
    Font.draw(ctx, this.quote, 160, 74, '#c8c0c8', { align: 'center' });
    drawRunStats(ctx, this.g, 90);
    const opts = ['RÉESSAYER', 'MENU'];
    opts.forEach((o, i) => {
      const s = i === this.sel;
      Font.draw(ctx, (s ? '> ' : '') + o, 110 + i * 100, 166, s ? '#f2a88a' : '#8a8290', { align: 'center' });
    });
  }
}

class VictoryScene {
  constructor(game) {
    this.g = game;
    this.t = 0;
    this.confetti = Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(-H, 0), v: rand(20, 50), c: choice(['#d97757', '#f8d048', '#78d05a', '#4aa0f0', '#f070b8']) }));
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
    Backdrop.draw(ctx, this.t, '#241430');
    for (const c of this.confetti) rect(ctx, c.x + Math.sin(this.t * 3 + c.x) * 2, c.y, 2, 2, c.c);
    Font.draw(ctx, 'ALIGNEMENT RÉUSSI !', 160, 10, '#f8d048', { align: 'center', scale: 2, outline: '#1a1016' });
    const jump = Math.abs(Math.sin(this.t * 4)) * 8;
    drawSpr(ctx, 'claude_down_0', 144, 36 - jump, { scale: 2 });
    Font.draw(ctx, 'LE MONDE EST SAUVÉ... POUR L\'INSTANT.', 160, 74, '#e8e0e8', { align: 'center' });
    drawRunStats(ctx, this.g, 90);
    if (this.t > 1.5 && Math.floor(this.t * 2) % 2) Font.draw(ctx, 'MERCI D\'AVOIR JOUÉ ! - ENTRÉE', 160, 166, '#d97757', { align: 'center' });
  }
}
