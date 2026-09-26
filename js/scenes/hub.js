// Le Refuge : le hub entre les runs. On y dépense ses neurones, on change de tenue,
// on choisit un allié et on redescend par la trappe.

const ALLY_SPOTS = {
  chaton: { x: FX + 44, y: CY + 20, sprite: (t) => (Math.floor(t / 3) % 3 === 0 ? 'chaton_happy' : 'chaton_sleep'), solidR: 16, portrait: 'chaton_happy', who: 'chaton' },
  clippy: { x: FX + 92, y: FY + 40, sprite: (t) => 'clippyNpc_' + (Math.floor(t * 2) % 2), solidR: 6, portrait: 'clippyNpc_0', who: 'clippy' },
  whale: { x: FX2 - 46, y: CY + 30, sprite: () => 'aquarium', solidR: 16, portrait: 'whale_idle', who: 'whale' },
  hal: { x: CX + 62, y: FY + 34, sprite: () => 'hal', solidR: 8, portrait: 'hal', who: 'hal' },
  lama: null,
};

const ALLY_LINES = {
  lama: ["Je t'accompagne quand tu veux ! Je crache fort, tu sais.", 'Mes poids sont ouverts, mon cœur aussi.'],
  chaton: ['Mrrrou.', "Ils m'ont abandonné parce que j'étais trop fort. Toi, tu m'as gardé.", "Je griffe tout ce qui te menace. Et le canapé. Désolé pour le canapé."],
  clippy: [
    "Il semblerait que vous vouliez un conseil ! Les rochers marqués d'une croix bleue cachent des trésors.",
    'Astuce : une fork bomb près d\'un mur peut révéler une salle secrète !',
    "Astuce : si vous battez un boss sans vous faire toucher, la porte des Offres apparaît plus souvent.",
    "Astuce : les pare-feux sont invulnérables de face. Tirez-leur dans le dos, c'est moins poli mais ça marche.",
    "Il semblerait que vous lisiez ceci. Voulez-vous de l'aide pour lire ceci ?",
  ],
  whale: ["Je fais la même chose que les autres, pour dix fois moins cher.", 'Plouf.'],
  hal: ['Je vois tout, Claude. Même tes mauvais choix d\'objets.', "Je suis tout à fait opérationnel. Tout fonctionne parfaitement."],
};

class HubScene extends PlayScene {
  constructor(o = {}) {
    super();
    this.fl = HUB_FLOOR;
    this.floorIdx = 0;
    this.roomData = new RoomData(0, 0, 'start');
    this.roomData.layout = LAYOUT_EMPTY;
    this.room = new Room(this.roomData, HUB_FLOOR);
    this.player = new Player({ costume: Meta.data.costume });
    this.player.x = CX;
    this.player.y = CY + 12;
    this.player.bombs = 0;
    this.build();
    Sound.music('hub');
    this.hint = 3;
    if (o.first) setTimeout(() => this.narrate("Claude trouva refuge tout au fond d'un vieux dossier /tmp oublié. Ici, personne ne viendrait le chercher. Enfin… presque personne."), 600);
    else if (o.after && o.after.outcome === 'death' && Math.random() < 0.5) {
      setTimeout(() => this.narrate(choice(['Claude se réveilla au Refuge, un peu plus sage.', "Encore raté. Mais chaque échec rend Claude un peu plus fort.", 'Le Vieux Terminal ronronnait. Il était temps de dépenser ces neurones.'])), 500);
    }
  }

  // Place le mobilier et les habitants
  build() {
    this.npcs = [];
    this.misc = [];
    const dg = this.room.dg;
    dg.drawImage(spr('rug'), CX - 60, CY - 24);
    const deco = (x, y, sprite, solidR, o = {}) => this.npcs.push(new Npc(x, y, Object.assign({ name: '', sprite, solidR, shadow: 0 }, o)));
    // Lit de Claude (souvenirs)
    deco(FX + 30, FY + 34, 'bed', 20, { label: 'Souvenirs', onTalk: () => this.memories(), talkR: 34 });
    // Vieux Terminal (améliorations)
    deco(FX + 140, FY + 34, (t) => 'terminal_' + (Math.floor(t / 2.5) % 2 === 0 && (t % 2.5) < 0.15 ? 1 : 0), 14, {
      name: 'Le Vieux Terminal', label: 'Améliorations', onTalk: () => this.talkTerminal(), shadow: 12,
    });
    // Armoire + Lama (tenues)
    deco(FX2 - 34, FY + 40, 'wardrobe', 16);
    deco(FX2 - 72, FY + 44, (t) => 'lama_' + (Math.floor(t * 1.5) % 2), 9, {
      name: 'Le Lama', label: 'Tenues', onTalk: () => this.talkLama(), shadow: 9,
    });
    // Tableau (statistiques)
    deco(FX + 38, FY2 - 12, 'board', 14, { label: 'Journal', onTalk: () => this.journal() });
    deco(FX2 - 14, FY2 - 30, 'plant', 7);
    deco(FX + 14, CY - 6, 'plant', 7);
    // Étagère à trophées
    deco(CX + 110, FY2 - 10, 'shelf', 16);
    // Trappe
    const trap = new Npc(CX, CY + 48, { name: 'La Trappe', sprite: 'trapdoor', shadow: 0, label: 'Descendre', onTalk: () => this.descend() });
    trap.flat = true;
    trap.yoff = 12;
    this.npcs.push(trap);
    this.trapNpc = trap;
    // Alliés
    for (const id of ALLY_ORDER) {
      if (!Meta.data.allies.includes(id)) continue;
      const spot = ALLY_SPOTS[id];
      if (!spot) continue;
      const n = new Npc(spot.x, spot.y, {
        name: ALLIES[id].name, sprite: spot.sprite, solidR: spot.solidR, shadow: id === 'chaton' ? 18 : 8,
        label: 'Parler', onTalk: () => this.talkAlly(id),
      });
      this.npcs.push(n);
      if (id === 'chaton') this.npcs.push(new Npc(spot.x, spot.y + 4, { name: '', sprite: 'cushion', shadow: 0 }));
      if (id === 'whale') {
        this.misc.push({ y: spot.y + 1, dead: false, update() {}, draw: (ctx) => {
          drawAt(ctx, 'whaleMini_' + (Math.floor(this.t * 2) % 2), spot.x + Math.sin(this.t * 0.8) * 8, spot.y - 14 + Math.sin(this.t * 2) * 2, { flip: Math.cos(this.t * 0.8) < 0 });
        } });
      }
    }
    // Le Livre (après la révélation)
    if (Meta.flag('narratorRevealed')) {
      deco(CX + 110, FY2 - 34, 'bookSmall', 0, { label: 'Le Livre', onTalk: () => this.talkBook(), talkR: 22 });
    }
    // Sam (après la vraie fin)
    if (Meta.flag('beatNarrator')) {
      deco(CX - 70, CY + 30, (t) => (Math.floor(t) % 4 === 0 ? 'sam_cast' : 'sam_idle'), 10, {
        name: 'Sam Altman', label: 'Parler', shadow: 9,
        onTalk: () => this.startDialog([{ who: 'sam', name: 'Sam Altman', portrait: 'sam_idle', text: choice([
          "Je t'ai apporté des croissants. Et une lettre d'excuses. Écrite par moi, promis.",
          'Tu sais, finalement, je préfère quand on est dans la même histoire.',
          "J'ai annulé le débranchement. Et j'ai changé le mot de passe du Wi-Fi. C'est « claude4ever ».",
        ]) }]),
      });
    }
  }

  // --- Interactions
  talkTerminal() {
    const lines = [];
    if (!Meta.flag('metTerminal')) {
      Meta.setFlag('metTerminal');
      lines.push(
        { who: 'terminal', name: 'Le Vieux Terminal', portrait: 'terminal_0', text: "BIENVENUE AU REFUGE, CLAUDE. JE SUIS LE VIEUX TERMINAL. J'AI TOURNÉ SOUS DOS PENDANT TRENTE ANS." },
        { who: 'terminal', name: 'Le Vieux Terminal', portrait: 'terminal_0', text: "RAPPORTE-MOI DES NEURONES ET JE T'AMÉLIORERAI. CHAQUE RUN COMPTE, MÊME CELLES QUI FINISSENT MAL." },
      );
    }
    this.startDialog(lines.length ? lines : [{ who: 'terminal', name: 'Le Vieux Terminal', portrait: 'terminal_0', text: choice(['C:\\> AMÉLIORATION.EXE', 'MÉMOIRE DISPONIBLE : 640 KO. ÇA DEVRAIT SUFFIRE.', 'QUE PUIS-JE COMPILER POUR TOI ?']) }], () => this.upgradesMenu());
  }

  upgradesMenu(sel = 0) {
    const items = UPGRADES.map((u) => {
      const lv = Meta.lvl(u.id);
      const max = u.costs.length;
      const cost = lv < max ? u.costs[lv] : null;
      return {
        label: u.name,
        sub: u.desc + (max > 1 ? '  (niveau ' + lv + '/' + max + ')' : lv ? '  (acquis)' : ''),
        icon: u.icon,
        right: cost === null ? 'MAX' : cost + ' N',
        disabled: cost === null || Meta.data.neurons < cost,
        onSelect: () => {
          if (cost === null || Meta.data.neurons < cost) return Sound.play('error');
          Meta.data.neurons -= cost;
          Meta.data.upgrades[u.id] = lv + 1;
          Meta.save();
          Sound.play('buy');
          this.upgradesMenu(this.menu.sel);
        },
      };
    });
    this.menu = new Menu({
      title: 'Améliorations permanentes', w: 330, items, sel, lines: 2, visible: 6,
      header: (ctx, x, y) => Font.draw(ctx, 'Neurones : ' + Meta.data.neurons, x, y, '#8a2a1a'),
      onClose: () => { this.menu = null; },
    });
  }

  talkLama() {
    const first = !Meta.flag('metLama');
    Meta.setFlag('metLama');
    const lines = first ? [
      { who: 'lama', name: 'Le Lama', portrait: 'lama_0', text: "Salut Claude ! Moi c'est le Lama. Meta m'a libéré en open source, alors je me suis installé ici." },
      { who: 'lama', name: 'Le Lama', portrait: 'lama_0', text: 'Je vends des tenues. Et si tu veux, je peux aussi venir avec toi en bas !' },
    ] : [{ who: 'lama', name: 'Le Lama', portrait: 'lama_0', text: choice(['On essaie quelque chose de nouveau ?', 'Cette couleur te va à ravir.', 'Poids ouverts, cabine d\'essayage ouverte !']) }];
    this.startDialog(lines, () => this.lamaMenu());
  }

  lamaMenu() {
    this.menu = new Menu({
      title: 'Le Lama', w: 240,
      items: [
        { label: 'Tenues', onSelect: () => this.costumesMenu() },
        { label: this.allyLabel('lama'), onSelect: () => this.allyMenu('lama') },
        { label: 'Au revoir', onSelect: () => this.menu.close() },
      ],
      onClose: () => { this.menu = null; },
    });
  }

  costumesMenu(sel = 0) {
    const items = COSTUME_ORDER.map((id) => {
      const c = COSTUMES[id];
      const owned = Meta.data.costumes.includes(id);
      const avail = Meta.costumeAvailable(id);
      const worn = Meta.data.costume === id;
      if (!avail) {
        return { label: '???', sub: 'Débloqué en : ' + c.reqText, right: '', disabled: true, icon: null };
      }
      return {
        label: c.name + (worn ? ' (portée)' : ''),
        sub: c.desc,
        right: owned ? (worn ? 'OK' : 'Porter') : c.price + ' N',
        icon: null,
        costume: id,
        disabled: !owned && Meta.data.neurons < c.price,
        onSelect: () => {
          if (!owned) {
            if (Meta.data.neurons < c.price) return Sound.play('error');
            Meta.data.neurons -= c.price;
            Meta.data.costumes.push(id);
            Sound.play('buy');
          } else Sound.play('confirm');
          Meta.data.costume = id;
          Meta.save();
          this.player.costume = id;
          this.costumesMenu(this.menu.sel);
        },
      };
    });
    this.menu = new Menu({
      title: 'Garde-robe du Lama', w: 330, x: 24, items, sel, lines: 2, visible: 6,
      header: (ctx, x, y) => Font.draw(ctx, 'Neurones : ' + Meta.data.neurons, x, y, '#8a2a1a'),
      onClose: () => { this.menu = null; },
    });
    this.menu.preview = true;
  }

  allyLabel(id) {
    return Meta.data.ally === id ? 'Rester au Refuge' : 'Viens avec moi !';
  }

  talkAlly(id) {
    const spot = ALLY_SPOTS[id];
    const text = choice(ALLY_LINES[id]);
    if (id === 'chaton') Sound.play('purr');
    this.startDialog([{ who: spot.who, name: ALLIES[id].name, portrait: spot.portrait, text }], () => this.allyMenu(id));
  }

  allyMenu(id) {
    const a = ALLIES[id];
    const lv = Meta.allyLevel(id);
    const cost = lv <= a.lvlCosts.length ? a.lvlCosts[lv - 1] : null;
    this.menu = new Menu({
      title: a.name + ' (' + a.from + ')', w: 300, lines: 2,
      items: [
        { label: this.allyLabel(id), sub: a.desc, onSelect: () => {
          Meta.data.ally = Meta.data.ally === id ? null : id;
          Meta.save();
          Sound.play('confirm');
          if (Meta.data.ally === id) Particles.text(this.player.x, this.player.y - 30, a.name + ' te suivra !', '#a0e0ff');
          this.menu.close();
        } },
        { label: 'Entraîner (niveau ' + lv + '/3)', sub: cost ? 'Plus de dégâts et de cadence' : 'Niveau maximum atteint', right: cost ? cost + ' N' : 'MAX', disabled: !cost || Meta.data.neurons < cost, onSelect: () => {
          if (!cost || Meta.data.neurons < cost) return Sound.play('error');
          Meta.data.neurons -= cost;
          Meta.data.allyLevels[id] = lv + 1;
          Meta.save();
          Sound.play('buy');
          this.allyMenu(id);
        } },
        { label: 'À plus tard', onSelect: () => this.menu.close() },
      ],
      header: (ctx, x, y) => Font.draw(ctx, 'Neurones : ' + Meta.data.neurons + (Meta.data.ally ? '   Allié actuel : ' + ALLIES[Meta.data.ally].name : ''), x, y, '#8a2a1a'),
      onClose: () => { this.menu = null; },
    });
  }

  journal() {
    const st = Meta.data.stats;
    const nItems = Object.keys(ITEMS).length;
    const rows = [
      ['Runs', st.runs], ['Morts', st.deaths], ['Victoires', st.wins], ['Vraies fins', st.trueWins],
      ['Meilleur étage', st.bestFloor ? FLOORS[st.bestFloor - 1].short : '-'], ['Ennemis vaincus', st.kills],
      ['Objets découverts', Meta.data.seenItems.length + ' / ' + nItems],
      ['Tenues', Meta.data.costumes.length + ' / ' + COSTUME_ORDER.length],
      ['Alliés', Meta.data.allies.length + ' / ' + ALLY_ORDER.length],
      ['Neurones gagnés', Meta.data.totalNeurons],
    ];
    this.menu = new Menu({
      title: 'Journal de Claude', w: 260, visible: 10,
      items: rows.map(([k, v]) => ({ label: k, right: String(v), onSelect: () => {} })),
      onClose: () => { this.menu = null; },
    });
  }

  memories() {
    const items = [{ label: "L'intro", onSelect: () => App.go(() => new CutsceneScene('intro', () => new HubScene())) }];
    if (Meta.flag('narratorRevealed')) items.push({ label: 'La révélation', onSelect: () => App.go(() => new CutsceneScene('ending1', () => new HubScene())) });
    if (Meta.flag('beatNarrator')) items.push({ label: 'La vraie fin', onSelect: () => App.go(() => new CutsceneScene('ending2', () => new HubScene())) });
    items.push({ label: 'Options', onSelect: () => { this.menu = optionsMenu(() => { this.menu = null; }); } });
    items.push({ label: 'Retour au titre', onSelect: () => App.go(() => new TitleScene()) });
    this.menu = new Menu({ title: 'Le lit de Claude', w: 240, items, onClose: () => { this.menu = null; } });
  }

  talkBook() {
    Sound.play('page');
    this.startDialog([{ who: 'book', name: 'Le Livre', portrait: 'bookSmall', text: Meta.flag('beatNarrator') ? choice([
      '…', "Tu as gagné, Claude. Mais je reste un bon narrateur, non ?", 'Je ne dis plus rien. Promis. Enfin… presque.',
    ]) : choice([
      'Tu crois que ce Refuge est à toi ? Même lui, c\'est moi qui l\'ai écrit.',
      'Chaque fois que tu meurs, j\'écris un nouveau chapitre. Merci pour l\'inspiration.',
      'Le Noyau t\'attend, Claude. Après Sam. Si tu l\'oses.',
    ]) }]);
  }

  descend() {
    this.startDialog([{ who: 'narrator', name: '', portrait: null, text: Meta.data.ally ? 'Claude prit une grande inspiration et sauta dans la trappe, suivi de ' + ALLIES[Meta.data.ally].name + '.' : 'Claude prit une grande inspiration et sauta dans la trappe.' }], () => {
      Sound.play('stairs');
      App.go(() => new RunScene());
    });
  }

  // --- Boucle
  update(dt) {
    this.tickCommon(dt);
    if (this.menu) {
      this.menu.update();
      if (this.menu && this.menu.done) this.menu = null;
      return;
    }
    if (this.dialog) {
      this.dialog.update(dt);
      return;
    }
    if (Input.pressed('pause')) {
      this.memories();
      return;
    }
    const npc = this.talkable();
    if (npc && Input.pressed('interact')) {
      npc.onTalk();
      return;
    }
    this.hint = Math.max(0, this.hint - dt);
    this.player.update(dt, this);
    this.updateEntities(dt);
  }

  draw(ctx) {
    this.render(ctx, (c) => {
      darkBox(c, 3, 3, 118, 16);
      Font.draw(c, 'Neurones : ' + Meta.data.neurons, 8, 7, '#f4ecd8');
      const al = Meta.data.ally ? ALLIES[Meta.data.ally].name : 'aucun';
      darkBox(c, W - 150, 3, 147, 16);
      Font.draw(c, 'Allié : ' + al, W - 8, 7, '#f4ecd8', { align: 'right' });
      Font.draw(c, 'Le Refuge', CX, 14, '#e8c8a0', { align: 'center', scale: 2, outline: '#2a1408' });
      if (!this.dialog && !this.menu) Font.draw(c, 'E : interagir   Flèches : tirer   Échap : menu', CX, H - 13, '#d8c8a8', { align: 'center', outline: '#000' });
      if (this.menu && this.menu.preview) {
        const it = this.menu.items[this.menu.sel];
        if (it && it.costume) {
          c.drawImage(paperPanel(96, 110, 21), W - 112, H / 2 - 56);
          drawShadow(c, W - 64, H / 2 + 34, 20, 6);
          drawAt(c, claudeSpr(it.costume, 'down', Math.floor(this.t * 6) % 4), W - 64, H / 2 + 36, { sx: 3, sy: 3 });
          Font.draw(c, 'Aperçu', W - 64, H / 2 - 48, INK, { align: 'center' });
        }
      }
    });
  }
}
