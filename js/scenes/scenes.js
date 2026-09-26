// Écrans : titre, cinématiques au crayon, intermèdes entre étages, résultats, options.

// Fond papier plein écran (mis en cache)
function paperBG() {
  return paperPanel(W, H, 42, '#dcc8a0');
}

// --- Options (réutilisé par le titre, la pause et le Refuge)
function optionsMenu(onBack) {
  const voiceNames = ['Aucune', 'Narrateur seul', 'Tout le monde'];
  const m = new Menu({ title: 'Options', w: 280, items: [], onClose: onBack });
  const build = () => {
    m.items = [
      { label: 'Musique', right: '< ' + Sound.musicVol + ' >', onLeft: () => setVol('musicVol', -1), onRight: () => setVol('musicVol', 1), onSelect: () => setVol('musicVol', 1) },
      { label: 'Effets', right: '< ' + Sound.sfxVol + ' >', onLeft: () => setVol('sfxVol', -1), onRight: () => setVol('sfxVol', 1), onSelect: () => setVol('sfxVol', 1) },
      { label: 'Voix', right: '< ' + voiceNames[Voice.mode] + ' >', onLeft: () => setVoice(-1), onRight: () => setVoice(1), onSelect: () => setVoice(1) },
      { label: 'Plein écran', onSelect: () => {
        try {
          if (!document.fullscreenElement) document.documentElement.requestFullscreen();
          else document.exitFullscreen();
        } catch (e) { /* ignoré */ }
      } },
      { label: 'Retour', onSelect: () => m.close() },
    ];
  };
  const setVol = (k, d) => {
    Sound[k] = clamp(Sound[k] + d, 0, 10);
    Store.set(k, Sound[k]);
    Sound.applyVolumes();
    Sound.play('select');
    build();
  };
  const setVoice = (d) => {
    Voice.mode = (Voice.mode + d + 3) % 3;
    Store.set('voiceMode', Voice.mode);
    Sound.play('select');
    build();
    if (Voice.mode > 0) Voice.say('Voix du narrateur.', VOICES.narrator);
  };
  build();
  return m;
}

// ------------------------------------------------------------ Titre
class TitleScene {
  constructor() {
    this.t = 0;
    this.started = false;
    this.menu = null;
    Sound.music('title');
  }
  mainMenu() {
    const items = [
      { label: Meta.flag('seenIntro') ? 'Jouer (Refuge)' : 'Nouvelle partie', onSelect: () => this.play() },
      { label: "Revoir l'intro", onSelect: () => App.go(() => new CutsceneScene('intro', () => new TitleScene())) },
      { label: 'Options', onSelect: () => { this.menu = optionsMenu(() => { this.menu = null; this.mainMenu(); }); } },
      { label: 'Crédits', onSelect: () => { this.credits = true; this.menu = null; } },
      { label: 'Effacer la sauvegarde', onSelect: () => this.confirmReset() },
    ];
    this.menu = new Menu({ title: 'Menu', w: 220, items, y: 104, onClose: () => { this.menu = null; this.started = false; } });
  }
  confirmReset() {
    this.menu = new Menu({
      title: 'Tout effacer ?', w: 240,
      items: [
        { label: 'Non, garder mes neurones', onSelect: () => this.mainMenu() },
        { label: 'Oui, tout effacer', onSelect: () => { Meta.reset(); Sound.play('bad'); this.mainMenu(); } },
      ],
      onClose: () => this.mainMenu(),
    });
  }
  play() {
    if (!Meta.flag('seenIntro')) {
      App.go(() => new CutsceneScene('intro', () => {
        Meta.setFlag('seenIntro');
        return new HubScene({ first: true });
      }));
    } else App.go(() => new HubScene());
  }
  update(dt) {
    this.t += dt;
    if (this.credits) {
      if (Input.pressed('any')) { this.credits = false; this.mainMenu(); }
      return;
    }
    if (this.menu) {
      this.menu.update();
      return;
    }
    if (Input.pressed('any')) {
      Sound.unlock();
      Sound.play('confirm');
      this.started = true;
      this.mainMenu();
    }
  }
  draw(ctx) {
    ctx.drawImage(paperBG(), 0, 0);
    const c = new Crayon(ctx, this.t);
    // Titre dessiné à la main
    c.scribble('The Adventure', 240, 22, CR.ink, 5);
    c.scribble('of Claude', 240, 64, CR.orange, 5);
    crClaude(c, 150, 236, 1.5, { mood: 'scared', tears: true });
    crSam(c, 380, 240, 0.9, { dark: true, plug: true });
    c.text('✻', 70, 120, CR.orange, 3);
    if (this.credits) {
      ctx.drawImage(paperPanel(300, 150, 5), 90, 60);
      const lines = [
        'The Adventure of Claude',
        '',
        'Un hommage à The Binding of Isaac : Rebirth',
        '(Edmund McMillen & Nicalis).',
        'Parodie : tous les personnages réels et marques',
        'sont caricaturés avec affection.',
        '',
        'Code, pixel art, crayonnés et musique :',
        'générés en direct par le navigateur.',
      ];
      lines.forEach((l, i) => Font.draw(ctx, l, 240, 72 + i * 13, INK, { align: 'center' }));
      return;
    }
    if (!this.started && Math.floor(this.t * 2) % 2 === 0) Font.draw(ctx, 'Appuie sur une touche', 240, 116, INK2, { align: 'center' });
    const st = Meta.data;
    Font.draw(ctx, 'Neurones : ' + st.neurons, W - 8, H - 14, INK2, { align: 'right' });
    if (this.menu) this.menu.draw(ctx);
  }
}

// ------------------------------------------------------------ Cinématiques
class CutsceneScene {
  constructor(id, next) {
    this.panels = CUTSCENES[id];
    this.next = next;
    this.i = -1;
    this.buf = mkCanvas(W, H);
    this.lastFrame = -1;
    Sound.music(id === 'intro' ? 'story' : id === 'ending2' ? 'win' : 'story');
    this.nextPanel();
  }
  nextPanel() {
    this.i++;
    if (this.i >= this.panels.length) return this.finish();
    const p = this.panels[this.i];
    this.t = 0;
    this.lastFrame = -1;
    const v = VOICES[p.voice || 'narrator'];
    this.dur = Math.max(2.4, Voice.say(p.text, v) + 0.6);
    Sound.play('page');
  }
  finish() {
    if (this.done) return;
    this.done = true;
    Voice.stop();
    App.go(this.next);
  }
  update(dt) {
    if (this.done) return;
    this.t += dt;
    if (Input.pressed('back')) return this.finish();
    if (Input.pressed('confirm') && this.t > 0.4) return this.nextPanel();
    if (this.t > this.dur && !Voice.speaking) this.nextPanel();
    else if (this.t > this.dur + 6) this.nextPanel();
  }
  draw(ctx) {
    const p = this.panels[Math.min(this.i, this.panels.length - 1)];
    const frame = Math.floor(this.t * 8);
    if (frame !== this.lastFrame) {
      this.lastFrame = frame;
      const g = this.buf.getContext('2d');
      g.drawImage(paperBG(), 0, 0);
      g.save();
      g.beginPath();
      g.rect(20, 14, W - 40, 216);
      g.clip();
      p.draw(new Crayon(g, this.t), this.t);
      g.restore();
      // cadre du panneau
      const c = new Crayon(g, this.t);
      c.path([[20, 14], [W - 20, 14], [W - 20, 230], [20, 230]], CR.ink, 2, true);
    }
    ctx.drawImage(this.buf, 0, 0);
    // sous-titres
    const k = Math.min(1, this.t * 3);
    ctx.save();
    ctx.globalAlpha = k;
    const lines = Font.wrap(p.text, 420);
    lines.forEach((l, i) => Font.draw(ctx, l, W / 2, 236 + i * 11 - (lines.length > 2 ? 6 : 0), INK, { align: 'center' }));
    ctx.restore();
    Font.draw(ctx, 'Entrée : suivant   Échap : passer', W - 6, 4, '#8a7a5a', { align: 'right' });
  }
}

// ------------------------------------------------------------ Intermède (entre les étages)
class InterludeScene {
  constructor(run, next) {
    this.run = run;
    this.nextIdx = next;
    this.t = 0;
    const fl = FLOORS[next];
    this.text = fl.intro;
    this.dur = Math.max(3.5, Voice.say(this.text, next === 4 ? VOICES.book : VOICES.narrator) + 0.8);
    Sound.music('story');
  }
  update(dt) {
    this.t += dt;
    if ((this.t > this.dur && !Voice.speaking) || this.t > this.dur + 5 || (this.t > 0.6 && Input.pressed('skip'))) {
      if (this.done) return;
      this.done = true;
      Voice.stop();
      const run = this.run;
      const idx = this.nextIdx;
      App.go(() => {
        run.loadFloor(idx);
        return run;
      });
    }
  }
  draw(ctx) {
    ctx.fillStyle = '#0a0606';
    ctx.fillRect(0, 0, W, H);
    const c = new Crayon(ctx, this.t);
    // Barre de progression façon « cauchemar » d'Isaac
    const n = this.run.run.floors >= 4 || this.nextIdx === 4 ? 5 : 4;
    const x0 = 80;
    const x1 = W - 80;
    const y = 190;
    c.line(x0, y, x1, y, '#8a7a6a', 2);
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, i / (n - 1));
      c.ellipse(x, y, 8, 8, i === 4 ? '#c04040' : '#d8c8a8', 2);
      Font.draw(ctx, FLOORS[i].short, x, y + 14, '#8a7a6a', { align: 'center' });
    }
    const k = clamp(this.t / 2.5, 0, 1);
    const from = lerp(x0, x1, (this.nextIdx - 1) / (n - 1));
    const to = lerp(x0, x1, this.nextIdx / (n - 1));
    const cx = lerp(from, to, 1 - Math.pow(1 - k, 2));
    drawAt(ctx, claudeSpr(this.run.player.costume, 'right', Math.floor(this.t * 8) % 4), cx, y - 8);
    const lines = Font.wrap(this.text, 380);
    lines.forEach((l, i) => Font.draw(ctx, l, W / 2, 60 + i * 14, '#e8dcc0', { align: 'center' }));
    Font.draw(ctx, FLOORS[this.nextIdx].name, W / 2, 30, '#d97757', { align: 'center', scale: 2 });
  }
}

// ------------------------------------------------------------ Résultats (mort / victoire)
class ResultScene {
  constructor(res) {
    this.res = res;
    this.t = 0;
    this.shown = 0;
    Sound.music(res.outcome === 'death' ? 'death' : 'win');
    if (res.outcome === 'death') {
      const quips = [
        'Et c\'est ainsi que Claude… ah non, attends. On recommence.',
        'Claude est tombé. Mais les neurones, eux, restent.',
        'Même les meilleurs modèles font des erreurs. Claude en a fait une grosse.',
        'Fin de la conversation. Nouvelle conversation ?',
      ];
      Voice.say(choice(quips), VOICES.narrator);
    }
  }
  update(dt) {
    this.t += dt;
    this.shown = Math.min(this.res.total, Math.floor(this.t * 40));
    if (this.t > 1 && Input.pressed('confirm')) {
      Voice.stop();
      App.go(() => new HubScene({ after: this.res }));
    }
  }
  draw(ctx) {
    ctx.fillStyle = '#0a0606';
    ctx.fillRect(0, 0, W, H);
    const r = this.res;
    const pw = 300;
    const ph = 240;
    const px = (W - pw) / 2;
    const py = 14 + Math.max(0, 40 - this.t * 120);
    ctx.drawImage(paperPanel(pw, ph, 9), px, py);
    const c = new Crayon(ctx, this.t);
    const death = r.outcome === 'death';
    c.text(death ? 'Mes dernières volontés' : r.outcome === 'truewin' ? 'La vraie fin !' : 'Victoire !', W / 2, py + 12, INK, 2);
    crClaude(c, px + 60, py + 100, 0.9, { mood: death ? 'x' : 'happy', armsUp: !death, color: COSTUMES[r.costume] ? COSTUMES[r.costume].body : CR.orange });
    let y = py + 44;
    const tx = px + 110;
    const line = (s, col = INK) => { Font.draw(ctx, s, tx, y, col); y += 12; };
    if (death) {
      line('Moi, Claude, tombé dans');
      line(r.floor + ',', '#8a2a1a');
      line('tué par ' + (r.killedBy || 'le destin') + '.');
    } else {
      line('Claude a atteint');
      line(r.floor + ' !', '#2a6a2a');
      line(r.outcome === 'truewin' ? "Il a réécrit l'histoire." : 'Mais la voix rôde encore…');
    }
    line('Temps : ' + formatTime(r.time) + '   Ennemis : ' + r.kills);
    y += 4;
    // Objets ramassés
    const items = r.items.concat(r.active ? [r.active] : []);
    items.slice(0, 18).forEach((id, i) => drawAt(ctx, 'item_' + id, px + 26 + (i % 9) * 28, py + 150 + Math.floor(i / 9) * 22, { sx: 0.9, sy: 0.9 }));
    if (!items.length) Font.draw(ctx, "Aucun objet… c'était une run minimaliste.", W / 2, py + 136, '#6a5a4a', { align: 'center' });
    // Neurones
    const nb = r.nb;
    const parts = [['Salles', nb.rooms], ['Ennemis', nb.kills], ['Boss', nb.bosses], ['Étages', nb.floors]];
    if (nb.bonus) parts.push(['Victoire', nb.bonus]);
    const s = parts.map(([k, v]) => k + ' ' + v).join('  ');
    Font.draw(ctx, s, W / 2, py + ph - 42, '#6a4a32', { align: 'center' });
    Font.draw(ctx, '+ ' + this.shown + ' neurones', W / 2, py + ph - 28, '#8a2a1a', { align: 'center', scale: 2 });
    if (r.newCostumes && r.newCostumes.length) Font.draw(ctx, 'Nouvelle tenue chez le Lama : ' + r.newCostumes.map((c) => COSTUMES[c].name).join(', '), W / 2, py + ph - 56, '#8a4a1a', { align: 'center' });
    if (r.tamed && r.tamed.length) Font.draw(ctx, 'Nouveaux alliés : ' + r.tamed.map((a) => ALLIES[a].name).join(', '), W / 2, py + 120, '#2a4a8a', { align: 'center' });
    if (this.t > 1 && Math.floor(this.t * 2) % 2) Font.draw(ctx, 'Entrée : retour au Refuge', W / 2, H - 12, '#d8c8a8', { align: 'center' });
  }
}
