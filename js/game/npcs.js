// Personnages du QG et leurs répliques (elles évoluent avec la progression).

const NPCS = [
  { id: 'passeur', name: 'LE PASSEUR', x: 38, y: 50, spr: 'npc_passeur', menu: 'upgrades', color: '#c8a0f0' },
  { id: 'mirror', name: 'LE MIROIR DES MODÈLES', x: 206, y: 48, spr: 'mirror', menu: 'models', object: true },
  { id: 'hibou', name: 'MAÎTRE HIBOU', x: 34, y: 88, spr: 'npc_hibou', menu: 'paths', color: '#e0b060', perch: true },
  { id: 'conteuse', name: 'LA CONTEUSE', x: 204, y: 94, spr: 'npc_conteuse', color: '#a8a0f0' },
  { id: 'veilleur', name: 'LE VEILLEUR', x: 178, y: 58, spr: 'npc_veilleur', color: '#90b0f0', float: true },
  { id: 'veteran', name: 'LE VÉTÉRAN', x: 176, y: 118, spr: 'npc_veteran', color: '#f08060' },
  { id: 'chat', name: 'LE CHAT', x: 88, y: 124, spr: 'npc_chat', color: '#f0d040' },
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
