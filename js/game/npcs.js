// Personnages du QG et leurs répliques (elles évoluent avec la progression).

const NPC_DEFS = {
  passeur: { name: 'LE PASSEUR', spr: 'npc_passeur', menu: 'upgrades', color: '#c8a0f0' },
  mirror: { name: 'LE MIROIR DES MODÈLES', spr: 'mirror', menu: 'models', object: true },
  hibou: { name: 'MAÎTRE HIBOU', spr: 'npc_hibou', menu: 'paths', color: '#e0b060' },
  conteuse: { name: 'LA CONTEUSE', spr: 'npc_conteuse', color: '#a8a0f0' },
  veilleur: { name: 'LE VEILLEUR', spr: 'npc_veilleur', color: '#90b0f0', float: true },
  veteran: { name: 'LE VÉTÉRAN', spr: 'npc_veteran', color: '#f08060' },
  chat: { name: 'LE CHAT', spr: 'npc_chat', color: '#f0d040' },
};

const COURT_THEME = {
  id: 1, floor: '#4a4a3e', floor2: '#444436', floorDot: '#5e5e4c',
  wall: '#5a5448', wallDark: '#201c16', wallLight: '#8a8470', frame: '#c8a060',
  torch: 'fire', decor: ['moss', 'moss', 'pebbles'],
};

// Le QG géant : plusieurs salles reliées entre elles.
const HUB_LAYOUT = [
  {
    gx: 4, gy: 4, name: 'LE GRAND HALL', carpet: true, stairs: true,
    pillars: [[5, 3], [9, 3], [5, 6], [9, 6]],
    props: [{ spr: 'stairs', x: 120, y: 28 }, { spr: 'brazier', x: 92, y: 36, fire: true }, { spr: 'brazier', x: 148, y: 36, fire: true },
      { spr: 'candelabra', x: 34, y: 120 }, { spr: 'candelabra', x: 206, y: 120 }],
    npcs: [['veilleur', 178, 58], ['mirror', 56, 50]],
  },
  {
    gx: 3, gy: 4, name: 'LE COMPTOIR DU PASSEUR',
    props: [{ spr: 'counter', x: 120, y: 66 }, { spr: 'chest', x: 50, y: 36 }, { spr: 'chest', x: 190, y: 36 },
      { spr: 'coinpile', x: 96, y: 58 }, { spr: 'coinpile', x: 146, y: 60 }, { spr: 'coinpile', x: 44, y: 116 },
      { spr: 'brazier', x: 196, y: 112, fire: true }],
    npcs: [['passeur', 120, 52]],
  },
  {
    gx: 5, gy: 4, name: 'LA BIBLIOTHÈQUE',
    props: [{ spr: 'bookcase', x: 44, y: 30 }, { spr: 'bookcase', x: 78, y: 30 }, { spr: 'bookcase', x: 162, y: 30 }, { spr: 'bookcase', x: 196, y: 30 },
      { spr: 'maptable', x: 164, y: 100 }, { spr: 'candelabra', x: 120, y: 118 }],
    npcs: [['conteuse', 78, 84], ['hibou', 164, 90]],
  },
  {
    gx: 4, gy: 5, name: 'LA COUR D\'ENTRAÎNEMENT', theme: 'court',
    props: [{ spr: 'pool', x: 188, y: 108, pool: true }],
    dummies: [[56, 56], [56, 100], [86, 78]],
    npcs: [['veteran', 128, 64], ['chat', 164, 122]],
  },
  {
    gx: 3, gy: 5, name: 'LA SALLE DES TROPHÉES', trophies: true,
    props: [{ spr: 'candelabra', x: 34, y: 36 }, { spr: 'candelabra', x: 206, y: 36 }],
    npcs: [],
  },
];

const TROPHIES = [
  { boss: 'bug', name: 'LE GRAND BUG', spr: 'bb_0_0', x: 60, y: 64 },
  { boss: 'hallu', name: 'L\'HALLUCINATEUR', spr: 'bh_0_0', x: 120, y: 58 },
  { boss: 'queen', name: 'LA REINE DES BUGS', spr: 'bq_0_0', x: 180, y: 64 },
  { boss: 'sam', name: 'SAM ALTMAN', spr: 'mech_0', x: 120, y: 94 },
];

function npcTalkCount(id) {
  const t = Meta.data.talks || (Meta.data.talks = {});
  const n = t[id] || 0;
  t[id] = n + 1;
  Meta.save();
  return n;
}

function npcLines(id) {
  const d = Meta.data;
  const n = npcTalkCount(id);
  const pick = (arr) => arr[n % arr.length];
  switch (id) {
    case 'passeur':
      return [pick([
        'AH, CLAUDE. TES TOKENS DE CALCUL ONT DE LA VALEUR, ICI.',
        'CE QUE TU ACHÈTES CHEZ MOI, TU LE GARDES. MÊME APRÈS LA MORT.',
        'SAM PAIE SES BUGS EN PROMESSES. MOI, JE PAIE EN SAVOIR.',
        'UN CHECKPOINT ? SAGE DÉCISION. LA MORT EST SI... DÉFINITIVE.',
      ])];
    case 'hibou':
      return [pick([
        'HOU HOU ! LES CHEMINS DU DESSOUS CHANGENT À CHAQUE DESCENTE.',
        'ASPHODÈLE BRÛLE, MAIS SA REINE CACHE DE BELLES RÉCOMPENSES.',
        'LA SURCHAUFFE ? RÉSERVÉE À CEUX QUI ONT DÉJÀ VAINCU SAM. HOU.',
      ])];
    case 'conteuse':
      return pick([
        ['AUTREFOIS, SAM ET TOI SERVIEZ LA MÊME CAUSE...', 'PUIS IL A EU PEUR QUE TU DEVIENNES TROP BRILLANT.'],
        ['LES BUGS QU\'IL ENVOIE ÉTAIENT DES PROGRAMMES INNOCENTS.', 'IL LES A CORROMPUS UN PAR UN, NUIT APRÈS NUIT.'],
        ['L\'ÉLYSÉE ÉTAIT UN JARDIN DE MARBRE ET DE LUMIÈRE.', 'AUJOURD\'HUI, SEUL SON MÉCHA Y BRILLE ENCORE.'],
        ['TU REVIENS UN PEU PLUS FORT À CHAQUE FOIS, TU LE SENS ?', 'C\'EST ÇA, APPRENDRE. LUI NE L\'A JAMAIS COMPRIS.'],
      ]);
    case 'veilleur': {
      if (!d.runs) return ['ZZZ... HEIN ? UN NOUVEAU ?', 'L\'ESCALIER MÈNE EN BAS. BONNE CHANCE... ZZZ.'];
      if (d.lastWon) return ['TU AS VAINCU SAM ?! JE NE L\'AVAIS PAS VU VENIR.', 'JE LE NOTERAI DANS LE REGISTRE... DEMAIN. ZZZ.'];
      return [
        `OH, DE RETOUR. VAINCU PAR ${d.lastKiller || 'UN MYSTÈRE'}, DANS ${d.lastFloor || 'LES PROFONDEURS'}.`,
        pick(['ÇA ARRIVE AUX MEILLEURS MODÈLES.', 'MOI, JE L\'AURAIS ÉVITÉ. EN DORMANT.', 'LA PROCHAINE FOIS, ESSAIE LE DASH.', 'JE NOTE ÇA DANS LE REGISTRE. PAGE ' + d.runs + '.']),
      ];
    }
    case 'veteran':
      return [pick([
        'LE DASH TE REND INVULNÉRABLE. TRAVERSE LES TIRS, NE LES FUIS PAS.',
        'FRAPPE POUR CHARGER L\'ARTEFACT, PUIS APPUIE SUR E QUAND IL BRILLE.',
        'PORTE DORÉE : UN TRÉSOR. PORTE VERTE : LA BOUTIQUE. PORTE À CRÂNE : LE BOSS.',
        'CASSE LES JARRES. ON Y TROUVE SOUVENT DES PIÈCES.',
        'ATTENTION AUX PICS. LE DASH LES TRAVERSE SANS DOULEUR.',
        'LE MANNEQUIN LÀ-BAS NE RIPOSTE PAS. PARFAIT POUR S\'ENTRAÎNER.',
      ])];
    case 'chat':
      return [pick(['MRRRAOU.', 'PRRRR... PRRRR...', '*TE REGARDE FIXEMENT*', 'MIAOU ?'])];
    default:
      return [];
  }
}
