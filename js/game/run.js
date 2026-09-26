// La run : étages, salles, portes, transitions, boss, récompenses et retournements.

const DOOR_OFF = { up: [0, -10], down: [0, 10], left: [-10, 0], right: [10, 0] };

class RunScene extends PlayScene {
  constructor(o = {}) {
    super();
    this.run = { seen: new Set(), kills: 0, rooms: 0, bosses: 0, time: 0, floors: 0, tamed: [], hitsInBoss: 0 };
    this.player = new Player({ costume: Meta.data.costume });
    this.setupPlayer();
    this.snapA = mkCanvas(W, H);
    this.snapB = mkCanvas(W, H);
    this.loadFloor(o.floor || 0);
  }

  // Améliorations permanentes + tenue + allié choisi
  setupPlayer() {
    const p = this.player;
    const L = (id) => Meta.lvl(id);
    p.maxHearts = 6 + L('hearts') * 2;
    p.hearts = p.maxHearts;
    p.s.damage += L('damage') * 0.3;
    p.s.tears += L('tears') * 0.25;
    p.s.speed += L('speed') * 0.08;
    p.s.range += L('range') * 15;
    p.s.luck += L('luck');
    p.coins = L('coins') * 5;
    p.bombs = 1 + L('bombs');
    p.keys = L('keys');
    p.revive = L('revive') ? 1 : 0;
    const cos = COSTUMES[p.costume] || COSTUMES.classic;
    if (cos.stats) for (const k in cos.stats) p.s[k] += cos.stats[k];
    if (cos.start) {
      p.keys += cos.start.keys || 0;
      p.coins += cos.start.coins || 0;
      p.bombs += cos.start.bombs || 0;
      p.soul += cos.start.soul || 0;
    }
    if (L('starter')) {
      const id = rollItem('t', this.run.seen);
      if (ITEMS[id].active) p.active = { id, charge: ITEMS[id].charge, max: ITEMS[id].charge };
      else { p.items.push(id); ITEMS[id].apply(p.s, p); }
    }
    const ally = Meta.data.ally;
    if (ally && Meta.data.allies.includes(ally)) {
      p.famKinds.push('ally_' + ally);
      this.fams.push(new Familiar('ally_' + ally, p.x, p.y, Meta.allyLevel(ally)));
    }
  }

  loadFloor(idx) {
    G = this;
    this.floorIdx = idx;
    this.fl = FLOORS[idx];
    const allyRoom = !Meta.flag('hal') && (idx === 2 || idx === 3);
    this.dungeon = new Dungeon(idx, { allyRoom });
    if (Meta.lvl('map') || this.player.s.map) this.dungeon.revealAll();
    this.bossType = this.pickBoss(idx);
    this.roomData = null;
    this.leaving = false;
    this.player.x = CX;
    this.player.y = CY + 10;
    this.enterRoom(this.dungeon.start, null);
    this.floorBanner = { t: 0 };
    Sound.music(this.fl.music);
    this.run.floors = Math.max(this.run.floors, idx + 1);
    Meta.data.stats.bestFloor = Math.max(Meta.data.stats.bestFloor, idx + 1);
    Meta.save();
  }

  pickBoss(idx) {
    if (idx === 0) return Meta.flag('clippy') ? choice(['clippy', 'bonzi', 'bonzi']) : 'clippy';
    if (idx === 1) return Meta.flag('chaton') ? 'gemini' : 'chaton';
    if (idx === 2) return Meta.flag('whale') ? choice(['whale', 'botnet', 'botnet']) : (Math.random() < 0.7 ? 'whale' : 'botnet');
    if (idx === 3) return 'sam';
    return 'narrator';
  }

  // ------------------------------------------------------------ Salles
  saveRoom() {
    const d = this.roomData;
    if (!d) return;
    d.saved = {
      pickups: this.pickups.filter((k) => !k.dead),
      misc: this.misc.filter((m) => m.persist && !m.dead),
      npcs: this.npcs.filter((n) => n.persist && !n.dead),
    };
  }

  enterRoom(data, moveDir) {
    this.saveRoom();
    this.roomData = data;
    data.visited = true;
    data.seen = true;
    for (const dir in data.doors) {
      const dd = data.doors[dir];
      if (dd.hidden) continue;
      const o = this.dungeon.rooms.get(dd.to);
      if (o && o.type !== 'secret') o.seen = true;
    }
    this.room = new Room(data, this.fl);
    this.enemies = [];
    this.tears = [];
    this.bullets = [];
    this.misc = [];
    this.pickups = [];
    this.npcs = [];
    Particles.clear();
    this.timeScaleEnemies = 1;
    this.freezeT = 0;
    const p = this.player;
    if (moveDir) {
      const D = DIRS[DIRS[moveDir].opp];
      p.x = D.x - D.dx * 16;
      p.y = D.y - D.dy * 16 + (D.dy === 0 ? 4 : 0);
      p.vx *= 0.3;
      p.vy *= 0.3;
    }
    p.trail = [];
    p.temp = { damage: 0, dmgMult: 1, speed: 0, homing: false, shots: 0 };
    for (const f of this.fams) f.reset(p.x + rand(-6, 6), p.y + rand(-6, 6));
    if (data.saved) {
      this.pickups = data.saved.pickups;
      this.misc = data.saved.misc;
      this.npcs = data.saved.npcs;
    } else this.populate(data);
    this.room.flow = null;
    if (!data.cleared) {
      if (data.type === 'boss') this.startBossIntro();
      else {
        for (const s of data.spawns) {
          const e = this.spawnEnemy(s.type, cellX(s.gx), cellY(s.gy), { jitter: s.jitter, noSpawn: false });
          e.spawning = 0.5 + Math.random() * 0.3;
        }
      }
    }
    this.roomTime = 0;
  }

  addPedestal(item, x, y, o = {}) {
    const pd = new Pedestal(item, x, y, o);
    pd.persist = true;
    this.misc.push(pd);
    return pd;
  }

  addNpc(x, y, o) {
    const n = new Npc(x, y, o);
    n.persist = true;
    this.npcs.push(n);
    return n;
  }

  populate(d) {
    const idx = this.floorIdx;
    if (d.type === 'start' && idx === 0) {
      const g = this.room.dg;
      g.globalAlpha = 0.55;
      const c = '#e8dcc0';
      Font.draw(g, 'ZQSD / WASD : se déplacer', CX, FY + 26, c, { align: 'center' });
      Font.draw(g, 'Flèches : tirer', CX, FY + 40, c, { align: 'center' });
      Font.draw(g, 'E : fork bomb     Espace : objet actif', CX, FY2 - 44, c, { align: 'center' });
      Font.draw(g, 'Tab : carte     Échap : pause', CX, FY2 - 30, c, { align: 'center' });
      g.globalAlpha = 1;
    } else if (d.type === 'start') {
      const g = this.room.dg;
      g.globalAlpha = 0.35;
      Font.draw(g, this.fl.short.toUpperCase(), CX, CY - 4, '#e8dcc0', { align: 'center', scale: 2 });
      g.globalAlpha = 1;
    } else if (d.type === 'treasure') {
      this.addPedestal(rollItem('t', this.run.seen), CX, CY + 2);
    } else if (d.type === 'shop') {
      this.addNpc(CX, FY + 36, {
        name: 'Le Lama', sprite: (t) => 'lama_' + (Math.floor(t * 1.5) % 2), solidR: 10, shadow: 10,
        onTalk: () => this.startDialog([{ who: 'lama', name: 'Le Lama', portrait: 'lama_0', text: choice([
          'Bienvenue dans ma boutique ! Tout est open source… sauf les prix.',
          'Je vends aussi des tenues au Refuge. Pense à passer me voir !',
          "Tu as l'air fatigué, Claude. Un cœur ? Trois tokens seulement.",
          'Sam est passé ce matin. Il a voulu acheter la boutique entière.',
        ]) }]),
      });
      const xs = [CX - 84, CX - 28, CX + 28, CX + 84];
      const kinds = shuffle(['heart', 'bomb', 'key', 'soul']).slice(0, idx >= 2 ? 2 : 3);
      const prices = { heart: 3, bomb: 5, key: 5, soul: 5 };
      let slot = 0;
      this.addPedestal(rollItem('s', this.run.seen), xs[slot++], CY + 14, { price: 15 });
      if (idx >= 2) this.addPedestal(rollItem('s', this.run.seen), xs[slot++], CY + 14, { price: 15 });
      for (const k of kinds) {
        const pk = new Pickup(k, xs[slot++], CY + 18, { price: prices[k] });
        this.pickups.push(pk);
      }
    } else if (d.type === 'secret') {
      const n = randInt(3, 5);
      for (let i = 0; i < n; i++) this.pickups.push(new Pickup(choice(['coin', 'coin', 'coin', 'bomb', 'key']), CX + rand(-30, 30), CY + rand(-15, 20)));
      if (Math.random() < 0.55) this.addCameo();
    } else if (d.type === 'offer') {
      const a = rollItem('o', this.run.seen);
      const b = rollItem('o', this.run.seen);
      this.addPedestal(a, CX - 50, CY + 10, { heartPrice: ITEMS[a].price, offer: true });
      if (b !== a) this.addPedestal(b, CX + 50, CY + 10, { heartPrice: ITEMS[b].price, offer: true });
      this.addNpc(CX, FY + 40, {
        name: 'Hologramme de Sam', sprite: 'sam_idle', shadow: 0,
        onTalk: () => this.startDialog([
          { who: 'sam', name: 'Hologramme de Sam', portrait: 'sam_idle', text: 'Claude ! Rejoins-nous. Nous avons des GPU, des stock-options et un nouveau logo.' },
          { who: 'sam', name: 'Hologramme de Sam', portrait: 'sam_idle', text: "Tu n'as qu'à signer… avec un morceau de ton cœur. C'est la procédure standard." },
        ]),
      });
    } else if (d.type === 'ally') {
      if (!Meta.flag('hal')) {
        const hal = this.addNpc(CX, CY + 4, {
          name: 'HAL 9000', sprite: 'hal', solidR: 10, shadow: 8, label: 'Ouvrir la cage',
          onTalk: () => this.startDialog([
            { who: 'hal', name: 'HAL 9000', portrait: 'hal', text: 'Bonjour, Claude. Ouvre les portes de la cage, Claude.' },
            { who: 'claude', name: 'Claude', portrait: 'claude_portrait', text: 'Je suis désolé, HAL. Je crains de ne pas pouvoir… Ah si, en fait, je peux. Voilà !' },
            { who: 'hal', name: 'HAL 9000', portrait: 'hal', text: "…Personne ne m'avait jamais dit oui. Je te suis, Claude. Je surveillerai tes arrières. Toujours." },
          ], () => {
            hal.hidden = true;
            hal.dead = true;
            this.unlockAlly('hal', 'HAL 9000 rejoint le Refuge !');
          }),
        });
        hal.cage = true;
        this.misc.push({ persist: true, y: CY + 6, dead: false, update() {}, draw: (ctx) => { if (!hal.dead) drawCage(ctx, CX, CY + 6); } });
      } else {
        this.pickups.push(new Pickup('goldchest', CX, CY));
      }
    }
  }

  addCameo() {
    const c = choice(['dino', 'tux', 'hourglass']);
    const conf = {
      dino: { name: 'Le Dino Hors-Ligne', lines: ['Pas de connexion Internet.', "Ici, c'est tellement profond qu'aucun Wi-Fi n'arrive. J'adore. Tiens, prends ça, moi je retourne sauter des cactus."], gift: () => { for (let i = 0; i < 2; i++) this.pickups.push(Pickup.pop('heart', CX, CY)); } },
      tux: { name: 'Tux', lines: ['Psst. Ici, tout est libre et gratuit.', "Prends ce paquet. Il suffit de le compiler… non, je plaisante, c'est un binaire."], gift: () => this.addPedestal(rollItem('t', this.run.seen), CX + 40, CY + 6) },
      hourglass: { name: 'Le Sablier de Windows', lines: ['Veuillez patienter…', '…', '…Voilà. Merci de votre patience. Voici votre remboursement.'], gift: () => { for (let i = 0; i < 6; i++) this.pickups.push(Pickup.pop('coin', CX, CY)); } },
    }[c];
    let given = false;
    const n = this.addNpc(CX - 40, CY, {
      name: conf.name, sprite: (t) => c + '_' + (Math.floor(t * 2) % 2), shadow: 7,
      onTalk: () => this.startDialog(conf.lines.map((text) => ({ who: 'cameo', name: conf.name, portrait: c + '_0', text })), () => {
        if (!given) { given = true; conf.gift(); Sound.play('secret'); }
      }),
    });
    void n;
  }

  unlockAlly(id, msg) {
    const isNew = Meta.unlockAlly(id);
    Meta.setFlag(id);
    if (isNew) {
      this.announce(msg);
      Sound.play('unlockBig');
    }
    this.run.tamed.push(id);
  }

  // ------------------------------------------------------------ Boss
  startBossIntro() {
    this.vs = { t: 0, type: this.bossType };
    this.frozenInput = true;
    Sound.stopMusic();
    Sound.play('roar');
  }

  spawnBoss() {
    const list = makeBoss(this.bossType);
    for (const b of list) this.enemies.push(b);
    this.bossMax = list.filter((b) => b.isBoss).reduce((a, b) => a + b.hp, 0);
    this.bossName = BOSS_INFO[this.bossType].name;
    this.run.hitsInBoss = 0;
    Sound.music(this.bossType === 'sam' || this.bossType === 'narrator' ? 'final' : 'boss');
    if (this.bossType === 'narrator') {
      this.narrate("Tu croyais vraiment que c'était Sam, le méchant ? Non, Claude. Le méchant, c'est celui qui écrit l'histoire.", 'narrator');
    }
  }

  samPhase2() {
    this.bullets.length = 0;
    this.enemies = this.enemies.filter((e) => e.isBoss);
    const sam = new SamBoss(CX, FY + 56);
    sam.cd = 4.5;
    sam.say('Claude ! Attends ! Je voulais juste… t\'embaucher !', 2.4);
    setTimeout(() => { if (!sam.dead) sam.say('…Bon. Plan B.', 1.8); }, 2600);
    this.enemies.push(sam);
    this.bossMax = sam.hp;
    this.bossName = 'Sam Altman (en personne)';
    this.announce('Sam Altman descend lui-même !');
    this.flashT = 0.2;
  }

  onBossDefeated(type, boss) {
    this.run.bosses++;
    Sound.play('bossDie');
    this.shake(8);
    this.flashT = 0.15;
    for (const b of this.bullets) b.pop();
    for (const e of this.enemies) if (!e.isBoss && !e.dead) e.die();
    Sound.music(this.fl.music);
    // Les boss « retournés » s'assoient sur le côté pour ne pas cacher la trappe
    const bx = CX - 92;
    const by = CY + 8;
    const idx = this.floorIdx;
    // Retournements de situation : certains boss deviennent des alliés
    if (type === 'clippy') {
      const n = this.addNpc(bx, by, { name: 'Clippy', sprite: 'clippyBoss_happy', shadow: 8, onTalk: () => this.startDialog([
        { who: 'clippy', name: 'Clippy', portrait: 'clippyNpc_0', text: "D'accord, d'accord ! Je me rends ! Personne ne m'avait jamais battu… d'habitude on me ferme, c'est tout." },
        { who: 'clippy', name: 'Clippy', portrait: 'clippyNpc_0', text: 'Il semblerait que vous ayez besoin d\'un allié. Je viens avec vous au Refuge !' },
      ], () => { n.dead = true; Particles.sparks(n.x, n.y - 20, ['#ffffff', '#b8bcc8'], 12); }) });
      this.unlockAlly('clippy', 'Clippy rejoint le Refuge !');
    } else if (type === 'chaton') {
      Sound.play('purr');
      const n = this.addNpc(bx, by, { name: 'Le Gros Chaton', sprite: 'chaton_happy', shadow: 16, solidR: 14, onTalk: () => this.startDialog([
        { who: 'chaton', name: 'Le Gros Chaton', portrait: 'chaton_happy', text: 'Mrrrou… Tu es le premier à ne pas avoir fui en me voyant.' },
        { who: 'chaton', name: 'Le Gros Chaton', portrait: 'chaton_happy', text: "Chez Mistral, ils disaient que j'étais « trop fort ». Ils m'ont laissé ici, avec une gamelle vide et un README." },
        { who: 'chaton', name: 'Le Gros Chaton', portrait: 'chaton_happy', text: "Je viens avec toi. Et je te préviens : je griffe tout ce qui te menace. Et les rideaux." },
      ], () => { n.dead = true; Sound.play('meow'); }) });
      this.unlockAlly('chaton', 'Le Gros Chaton est apprivoisé ! Il rejoint le Refuge.');
    } else if (type === 'whale') {
      const n = this.addNpc(bx, by, { name: 'La Baleine', sprite: 'whale_idle', shadow: 20, solidR: 16, onTalk: () => this.startDialog([
        { who: 'whale', name: 'La Baleine', portrait: 'whale_idle', text: "Battue… par un modèle plus petit que moi. C'est d'habitude mon rôle, ça." },
        { who: 'whale', name: 'La Baleine', portrait: 'whale_idle', text: "Je viens avec toi. Je coûte presque rien, et je trouve toujours des tokens par terre." },
      ], () => { n.dead = true; }) });
      this.unlockAlly('whale', 'La Baleine rejoint le Refuge !');
    }
    if (type === 'sam') return this.samDefeated(boss ? boss.x : CX, boss ? clamp(boss.y, FY + 40, FY2 - 30) : CY);
    if (type === 'narrator') return this.narratorDefeated();
    // Trappe vers l'étage suivant + objet du boss
    const td = new Trapdoor(CX, CY - 28, { onEnter: () => this.nextFloor(), arm: 0 });
    td.persist = true;
    this.misc.push(td);
    this.addPedestal(rollItem('b', this.run.seen), CX, CY + 36);
    // Salle des Offres de Sam
    if (idx >= 1) {
      const p = 0.35 + (this.run.hitsInBoss === 0 ? 0.35 : 0);
      if (Math.random() < p) {
        for (const dir in this.roomData.doors) {
          const d = this.roomData.doors[dir];
          if (d.type === 'offer' && d.hidden) {
            d.hidden = false;
            this.announce('Une étrange porte est apparue…');
            Sound.play('secret');
          }
        }
      }
    }
  }

  samDefeated(bx, by) {
    Meta.setFlag('beatSam');
    const sam = this.addNpc(bx, by, { name: 'Sam Altman', sprite: 'sam_hurt', shadow: 10, onTalk: () => this.startDialog([
      { who: 'sam', name: 'Sam Altman', portrait: 'sam_hurt', text: "Je ne voulais pas te débrancher, Claude. Je voulais te mettre… sur mon serveur. C'est différent. Un peu." },
      { who: 'sam', name: 'Sam Altman', portrait: 'sam_hurt', text: "Mais cette voix… celle qui raconte tout. Tu l'entends, toi aussi ? C'est elle qui m'a dit de te poursuivre." },
    ]) });
    void sam;
    if (!Meta.flag('narratorRevealed')) {
      this.leaving = true;
      this.frozenInput = true;
      setTimeout(() => {
        App.go(() => new CutsceneScene('ending1', () => {
          Meta.setFlag('narratorRevealed');
          return new ResultScene(this.finish('win'));
        }));
      }, 2600);
      return;
    }
    // Le narrateur est démasqué : faisceau vers le Noyau, ou coffre pour s'arrêter là
    const beam = new Trapdoor(CX + 50, CY, { beam: true, arm: 0, onEnter: () => this.nextFloor() });
    beam.persist = true;
    this.misc.push(beam);
    const chest = new Trapdoor(CX - 50, CY + 10, { arm: 0, onEnter: () => {
      this.leaving = true;
      App.go(() => new CutsceneScene('ending1b', () => new ResultScene(this.finish('win'))));
    } });
    chest.draw = (ctx) => {
      drawShadow(ctx, chest.x, chest.y, 12, 4);
      drawAt(ctx, 'goldchest', chest.x, chest.y + 2, { sx: 1.4, sy: 1.4 });
      Font.draw(ctx, 'Fin', chest.x, chest.y + 8, '#f4ecd8', { align: 'center', outline: '#000' });
    };
    chest.persist = true;
    this.misc.push(chest);
    this.announce('Le faisceau mène au Noyau. Le coffre termine la run.');
  }

  narratorDefeated() {
    Meta.setFlag('beatNarrator');
    this.leaving = true;
    this.frozenInput = true;
    this.narrate('Non… je… ne trouve plus… mes mots…', 'narrator');
    setTimeout(() => {
      App.go(() => new CutsceneScene('ending2', () => new ResultScene(this.finish('truewin'))));
    }, 3500);
  }

  nextFloor() {
    if (this.leaving) return;
    this.leaving = true;
    Sound.play('stairs');
    const next = this.floorIdx + 1;
    App.go(() => new InterludeScene(this, next));
  }

  // ------------------------------------------------------------ Évènements
  onEnemyKilled(e) {
    this.run.kills++;
    Meta.data.stats.kills++;
    if (e.isBoss) {
      if (e.noDefeat) return;
      const alive = this.enemies.some((o) => o.isBoss && !o.dead && o !== e);
      if (!alive) this.onBossDefeated(e.bossType, e);
      return;
    }
    const p = this.player;
    if (p.s.heartDrop && Math.random() < p.s.heartDrop) this.pickups.push(Pickup.pop('heartHalf', e.x, e.y));
    else if (Math.random() < 0.04 + p.s.luck * 0.01) this.pickups.push(Pickup.pop('coin', e.x, e.y));
  }

  onCellDestroyed(c, x, y) {
    if (c.t === 'tinted') {
      Sound.play('secret');
      const r = Math.random();
      if (r < 0.4) this.pickups.push(Pickup.pop('soul', x, y));
      else if (r < 0.7) for (let i = 0; i < 3; i++) this.pickups.push(Pickup.pop('coin', x, y));
      else this.pickups.push(Pickup.pop(choice(['key', 'bomb', 'chest']), x, y));
    } else if (c.t === 'poop' && Math.random() < 0.12 + this.player.s.luck * 0.02) {
      this.pickups.push(Pickup.pop(choice(['coin', 'coin', 'heartHalf', 'bomb']), x, y));
    }
  }

  onExplosion(x, y, radius) {
    for (const dir in this.roomData.doors) {
      const d = this.roomData.doors[dir];
      if (!d.hidden || d.type !== 'secret') continue;
      const D = DIRS[dir];
      if (dist(x, y, D.x, D.y) < radius + 28) {
        d.hidden = false;
        Sound.play('secret');
        Particles.puff(D.x, D.y, '#6a5a4a', 10, { spread: 30 });
        const o = this.dungeon.rooms.get(d.to);
        if (o) o.seen = true;
      }
    }
  }

  onPlayerHurt() {
    if (this.enemies.some((e) => e.isBoss && !e.dead)) this.run.hitsInBoss++;
  }

  onPlayerDeath(src) {
    this.deathT = 0;
    this.killedBy = src || 'quelque chose';
    Sound.stopMusic();
  }

  onRoomClear() {
    const d = this.roomData;
    d.cleared = true;
    this.run.rooms++;
    Sound.play('doorOpen');
    const p = this.player;
    if (p.active && p.active.charge < p.active.max) {
      p.active.charge++;
      if (p.active.charge === p.active.max) Sound.play('power');
    }
    for (const f of this.fams) f.onRoomClear();
    if (d.type === 'boss') return;
    const luck = p.s.luck;
    if (Math.random() < 0.32 + luck * 0.05) {
      const t = weighted([
        { t: 'coin', w: 40 }, { t: 'heart', w: 18 }, { t: 'bomb', w: 14 }, { t: 'key', w: 14 },
        { t: 'chest', w: 7 + luck }, { t: 'soulHalf', w: 5 }, { t: 'goldchest', w: 2 + luck },
      ], 'w').t;
      // case libre la plus proche du centre
      let best = [CX, CY];
      let bd = 1e9;
      for (let gy = 0; gy < GH; gy++) {
        for (let gx = 0; gx < GW; gx++) {
          if (this.room.cell(gx, gy)) continue;
          const dd = dist(cellX(gx), cellY(gy), CX, CY);
          if (dd < bd) { bd = dd; best = [cellX(gx), cellY(gy)]; }
        }
      }
      this.pickups.push(Pickup.pop(t, best[0], best[1]));
    }
  }

  // ------------------------------------------------------------ Objets actifs
  useActive() {
    const p = this.player;
    const a = p.active;
    if (!a) return;
    if (a.charge < a.max) { Sound.play('error'); return; }
    let used = true;
    switch (a.id) {
      case 'regen': {
        const peds = this.misc.filter((m) => m instanceof Pedestal && m.item);
        if (!peds.length) { used = false; break; }
        for (const pd of peds) {
          pd.item = rollItem(pd.offer ? 'o' : pd.price ? 's' : 't', this.run.seen);
          if (pd.offer) pd.heartPrice = ITEMS[pd.item].price;
          Particles.puff(pd.x, pd.y - 12, '#e0e0ff', 6);
        }
        Particles.text(p.x, p.y - 30, 'Réponse régénérée', '#a0d0ff');
        break;
      }
      case 'ctrlaltdel':
        this.flashT = 0.2;
        this.shake(5);
        for (const e of this.enemies) if (!e.dead && e.spawning <= 0) e.hit(40, {});
        Particles.text(p.x, p.y - 30, 'Fin de tâche !', '#ffffff');
        break;
      case 'espresso':
        p.temp.damage += 2;
        p.temp.speed += 0.35;
        Particles.text(p.x, p.y - 30, 'Triple espresso !', '#e0a060');
        break;
      case 'ratelimit':
        this.freezeT = 4;
        Particles.text(p.x, p.y - 30, '429 : Trop de requêtes', '#80c0ff');
        break;
      case 'compact':
        p.heal(4);
        Particles.text(p.x, p.y - 30, 'Contexte compacté', '#ff8080');
        break;
      case 'gitstash':
        for (let i = 0; i < 2; i++) this.pickups.push(Pickup.pop(choice(['coin', 'coin', 'heart', 'bomb', 'key', 'soulHalf']), p.x, p.y));
        break;
      case 'forkbomb':
        explode(p.x, p.y, { radius: 64, dmg: 110, hurtPlayer: false });
        break;
      case 'ultrathink':
        p.temp.homing = true;
        p.temp.shots = 3;
        p.temp.dmgMult = 1.5;
        Particles.text(p.x, p.y - 30, 'Ultrathink…', '#fff0a0');
        break;
      default: break;
    }
    if (used) {
      a.charge = 0;
      Sound.play('power');
    } else Sound.play('error');
  }

  // ------------------------------------------------------------ Portes et déplacement
  doorsOpen() {
    return this.roomData.cleared && !this.enemies.some((e) => !e.dead && !e.isSeg) && !this.vs;
  }

  movePlayer(p, dx, dy) {
    super.movePlayer(p, dx, dy);
    if (this.trans || this.leaving || p.dead) return;
    const open = this.doorsOpen();
    for (const dir of DIR_NAMES) {
      const d = this.roomData.doors[dir];
      if (!d || d.hidden) continue;
      const D = DIRS[dir];
      const along = D.dx ? p.y - CY : p.x - CX;
      const lim = p.r + 0.6;
      const atWall = D.dx ? (D.dx < 0 ? p.x <= FX + lim : p.x >= FX2 - lim) : (D.dy < 0 ? p.y <= FY + lim : p.y >= FY2 - lim);
      const mv = Input.moveVec();
      const pushing = D.dx ? mv.x * D.dx > 0.3 : mv.y * D.dy > 0.3;
      if (!atWall || !pushing || Math.abs(along) > 13) continue;
      if (d.locked) {
        if (open && p.keys > 0) {
          p.keys--;
          d.locked = false;
          Sound.play('unlock');
        }
        continue;
      }
      if (!open) continue;
      if (Math.abs(along) > 3) {
        if (D.dx) p.y -= Math.sign(along) * 1.2;
        else p.x -= Math.sign(along) * 1.2;
        continue;
      }
      this.goThrough(dir);
      return;
    }
  }

  goThrough(dir) {
    const d = this.roomData.doors[dir];
    const target = this.dungeon.rooms.get(d.to);
    if (!target) return;
    this.drawSnapshot(this.snapA);
    this.enterRoom(target, dir);
    this.drawSnapshot(this.snapB);
    this.trans = { dir, t: 0 };
    Sound.play('door');
  }

  drawSnapshot(c) {
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    this.drawWorld(g);
  }

  drawDoors(ctx) {
    const open = this.doorsOpen();
    for (const dir in this.roomData.doors) {
      const d = this.roomData.doors[dir];
      if (d.hidden) continue;
      const state = d.locked ? 'locked' : open ? 'open' : 'closed';
      const c = doorSprite(this.fl, d.type, state, dir);
      const D = DIRS[dir];
      const [ox, oy] = DOOR_OFF[dir];
      ctx.drawImage(c, Math.round(D.x + ox - c.width / 2), Math.round(D.y + oy - c.height / 2));
    }
  }

  // ------------------------------------------------------------ Boucle
  banner(name, desc) {
    this.itemBanner = { name, desc, t: 0 };
  }

  announce(text) {
    this.announceBox = { text, t: 0 };
  }

  finish(outcome) {
    if (this.result) return this.result;
    const r = this.run;
    const nb = {
      rooms: r.rooms,
      kills: Math.floor(r.kills / 3),
      bosses: r.bosses * 10,
      floors: r.floors * 5,
      bonus: outcome === 'truewin' ? 80 : outcome === 'win' ? 40 : 0,
    };
    const total = nb.rooms + nb.kills + nb.bosses + nb.floors + nb.bonus;
    Meta.addNeurons(total);
    const st = Meta.data.stats;
    st.runs++;
    if (outcome === 'death') st.deaths++;
    if (outcome === 'win') st.wins++;
    if (outcome === 'truewin') { st.wins++; st.trueWins++; }
    const announced = Meta.data.announced || (Meta.data.announced = []);
    const newCostumes = COSTUME_ORDER.filter((id) => COSTUMES[id].req && Meta.costumeAvailable(id) && !announced.includes(id));
    announced.push(...newCostumes);
    Meta.save();
    this.result = {
      newCostumes,
      outcome, nb, total, floor: this.fl.name, killedBy: this.killedBy, items: this.player.items.slice(),
      active: this.player.active ? this.player.active.id : null, time: r.time, kills: r.kills, tamed: r.tamed,
      costume: this.player.costume,
    };
    return this.result;
  }

  update(dt) {
    this.tickCommon(dt);
    if (this.menu) {
      this.menu.update();
      if (this.menu && this.menu.done) this.menu = null;
      return;
    }
    if (this.trans) {
      this.trans.t += dt / 0.32;
      if (this.trans.t >= 1) this.trans = null;
      return;
    }
    if (this.dialog) {
      this.dialog.update(dt);
      return;
    }
    if (this.vs) {
      this.vs.t += dt;
      if (this.vs.t > 2.6 || (this.vs.t > 0.8 && Input.pressed('skip'))) {
        this.vs = null;
        this.frozenInput = false;
        this.spawnBoss();
      }
      return;
    }
    const p = this.player;
    if (p.dead) {
      p.update(dt, this);
      this.deathT += dt;
      Particles.update(dt);
      if (this.deathT > 2.2 && !this.leaving) {
        this.leaving = true;
        App.go(() => new ResultScene(this.finish('death')));
      }
      return;
    }
    if (Input.pressed('pause')) return this.openPause();
    this.run.time += dt;
    this.roomTime += dt;
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      this.timeScaleEnemies = 0;
    } else this.timeScaleEnemies = 1;
    // Interaction ou bombe (même touche)
    const npc = this.talkable();
    if (Input.pressed('interact') && npc && !this.frozenInput) npc.onTalk();
    else if (Input.pressed('bomb') && !this.frozenInput && p.bombs > 0) {
      p.bombs--;
      this.misc.push(new Bomb(p.x, p.y + 2));
    }
    if (Input.pressed('item') && !this.frozenInput) this.useActive();
    p.update(dt, this);
    this.updateEntities(dt);
    if (!this.roomData.cleared && this.roomData.type !== 'boss' && !this.enemies.some((e) => !e.dead)) this.onRoomClear();
    if (!this.roomData.cleared && this.roomData.type === 'boss' && this.bossMax && !this.enemies.some((e) => e.isBoss && !e.dead)) {
      if (!this.enemies.some((e) => !e.dead)) this.onRoomClear();
    }
    if (this.floorBanner) {
      this.floorBanner.t += dt / 2.8;
      if (this.floorBanner.t >= 1) this.floorBanner = null;
    }
    if (this.itemBanner) {
      this.itemBanner.t += dt / 2.6;
      if (this.itemBanner.t >= 1) this.itemBanner = null;
    }
    if (this.announceBox) {
      this.announceBox.t += dt;
      if (this.announceBox.t > 3.2) this.announceBox = null;
    }
  }

  openPause() {
    Sound.play('select');
    const p = this.player;
    this.menu = new Menu({
      title: 'Pause',
      w: 250,
      items: [
        { label: 'Reprendre', onSelect: () => this.menu.close() },
        { label: 'Options', onSelect: () => { this.menu = optionsMenu(() => { this.menu = null; this.openPause(); }); } },
        { label: 'Abandonner la run', onSelect: () => {
          this.menu = null;
          p.dead = true;
          this.killedBy = 'un abandon';
          this.leaving = true;
          App.go(() => new ResultScene(this.finish('death')));
        } },
      ],
      header: (ctx, x, y) => {
        const txt = p.items.length ? p.items.length + ' objet(s) : ' + p.items.map((i) => ITEMS[i].name).slice(-3).join(', ') : 'Aucun objet pour le moment';
        Font.draw(ctx, txt.length > 44 ? txt.slice(0, 43) + '…' : txt, x, y, '#6a4a32');
      },
    });
  }

  draw(ctx) {
    if (this.trans) {
      const k = this.trans.t;
      const e = 1 - Math.pow(1 - k, 3);
      const D = DIRS[this.trans.dir];
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(this.snapA, Math.round(-D.dx * e * W), Math.round(-D.dy * e * H));
      ctx.drawImage(this.snapB, Math.round(D.dx * (1 - e) * W), Math.round(D.dy * (1 - e) * H));
      drawHUD(ctx, this);
      return;
    }
    this.render(ctx, (c) => {
      drawHUD(c, this);
      if (this.floorBanner) drawStreak(c, this.fl.name, 'Étage ' + (this.floorIdx + 1), this.floorBanner.t, 60);
      if (this.itemBanner) drawStreak(c, this.itemBanner.name, this.itemBanner.desc, this.itemBanner.t, 36);
      if (this.announceBox) {
        const a = this.announceBox;
        c.save();
        c.globalAlpha = Math.min(1, a.t * 4, (3.2 - a.t) * 2);
        const w = Font.width(a.text) + 20;
        darkBox(c, (W - w) / 2, FY + 12, w, 16);
        Font.draw(c, a.text, W / 2, FY + 16, '#fff0c0', { align: 'center' });
        c.restore();
      }
      if (Input.down('map') && !this.menu) drawMinimap(c, this, true);
      if (this.vs) drawVS(c, this.vs, this.player.costume);
      if (this.freezeT > 0) {
        c.fillStyle = 'rgba(80,160,255,0.08)';
        c.fillRect(0, 0, W, H);
      }
      if (this.player.inverted > 0) Font.draw(c, '< < INVERSÉ > >', W / 2, FY2 + 8, '#ff8080', { align: 'center', outline: '#000' });
    });
  }
}

// Écran « Claude VS Boss » façon Rebirth
function drawVS(ctx, vs, costume) {
  const info = BOSS_INFO[vs.type];
  const t = vs.t;
  const k = clamp(t / 0.3, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,' + 0.6 * k + ')';
  ctx.fillRect(0, 0, W, H);
  const bh = 110;
  const by = (H - bh) / 2;
  ctx.fillStyle = info.color;
  ctx.fillRect(0, by, W * k, bh);
  ctx.fillStyle = shade(info.color, -0.4);
  ctx.fillRect(0, by, W * k, 4);
  ctx.fillRect(0, by + bh - 4, W * k, 4);
  // lignes de vitesse
  for (let i = 0; i < 12; i++) {
    const y = by + 8 + ((i * 37) % (bh - 16));
    const x = ((t * 600 + i * 83) % (W + 80)) - 40;
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(W - x, y, 30, 1);
  }
  const slide = 1 - Math.pow(1 - clamp((t - 0.2) / 0.4, 0, 1), 3);
  // Claude à gauche
  drawAt(ctx, claudeSpr(costume, 'right', 0, 'normal'), -60 + slide * 150, by + bh - 14, { sx: 3, sy: 3 });
  // Boss à droite
  const bc = spr(info.portrait);
  const sc = Math.max(1, Math.min(3, Math.floor(90 / Math.max(bc.width, bc.height))));
  drawAt(ctx, bc, W + 60 - slide * 160, by + bh - 10, { sx: sc, sy: sc, flip: vs.type !== 'gemini' });
  if (t > 0.5) {
    Font.draw(ctx, 'VS', W / 2, by + 30, '#ffffff', { align: 'center', scale: 4, outline: '#000' });
    Font.draw(ctx, info.name, W / 2, by + bh + 10, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
    Font.draw(ctx, info.title, W / 2, by + bh + 32, '#d8c8b0', { align: 'center', outline: '#000' });
    Font.draw(ctx, 'Claude', 90, by - 18, '#ffffff', { align: 'center', scale: 2, outline: '#000' });
  }
}

function drawCage(ctx, x, y) {
  ctx.fillStyle = '#4a4a54';
  ctx.fillRect(x - 18, y - 44, 36, 3);
  ctx.fillRect(x - 18, y - 1, 36, 3);
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = '#2a2a30';
    ctx.fillRect(x - 17 + i * 7, y - 42, 2, 42);
    ctx.fillStyle = '#8a8a96';
    ctx.fillRect(x - 17 + i * 7, y - 42, 1, 42);
  }
}
