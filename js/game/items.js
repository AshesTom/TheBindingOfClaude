// Objets (salles au trésor, boutique, boss) et bénédictions (façon Hadès).

const ITEMS = {
  gpu: {
    name: 'GPU H100', desc: 'CADENCE DE TIR ++', icon: 'it_gpu',
    pools: ['treasure', 'shop', 'boss'],
    apply(s) { s.fireDelay *= 0.72; },
  },
  context: {
    name: 'FENÊTRE DE CONTEXTE', desc: 'PORTÉE ++  VITESSE DES TIRS +', icon: 'it_context',
    pools: ['treasure', 'shop'],
    apply(s) { s.range *= 1.5; s.shotSpeed *= 1.15; s.damageAdd += 0.3; },
  },
  temperature: {
    name: 'TEMPÉRATURE 2.0', desc: 'TIR TRIPLE, MAIS PLUS LENT', icon: 'it_temperature',
    pools: ['treasure', 'boss'],
    apply(s) { s.shots += 2; s.spread = Math.max(s.spread, 0.26); s.fireDelay *= 1.25; },
  },
  attention: {
    name: 'ATTENTION IS ALL YOU NEED', desc: 'TIRS À TÊTE CHERCHEUSE', icon: 'it_attention',
    pools: ['treasure', 'boss'],
    apply(s) { s.homing = true; },
  },
  finetune: {
    name: 'FINE-TUNING', desc: 'DÉGÂTS +1', icon: 'it_finetune',
    pools: ['treasure', 'shop', 'boss'],
    apply(s) { s.damageAdd += 1; },
  },
  rlhf: {
    name: 'RLHF', desc: '+1 COEUR MAX, SOIN TOTAL', icon: 'it_rlhf',
    pools: ['treasure', 'shop', 'boss'],
    onPickup(p) { p.maxHp = Math.min(24, p.maxHp + 2); p.hp = p.maxHp; },
  },
  moe: {
    name: 'MIXTURE OF EXPERTS', desc: 'TIR DOUBLE', icon: 'it_moe',
    pools: ['treasure', 'boss'],
    apply(s) { s.shots += 1; },
  },
  transformer: {
    name: 'TRANSFORMER', desc: 'DÉGÂTS X1.5, GROS TIRS', icon: 'it_transformer',
    pools: ['treasure', 'boss'],
    apply(s) { s.damageMult *= 1.5; s.shotSize = 2; s.fireDelay *= 1.08; },
  },
  dropout: {
    name: 'DROPOUT', desc: '15% D\'ESQUIVE, VITESSE +', icon: 'it_dropout',
    pools: ['treasure', 'shop'],
    apply(s) { s.dodge += 0.15; s.speed += 10; },
  },
  cot: {
    name: 'CHAIN OF THOUGHT', desc: 'TIRS PERÇANTS, DÉGÂTS +', icon: 'it_cot',
    pools: ['treasure', 'boss'],
    apply(s) { s.pierce = true; s.damageAdd += 0.5; },
  },
  subagent: {
    name: 'SOUS-AGENT', desc: 'UN MINI-CLAUDE TIRE AVEC TOI', icon: 'it_subagent',
    pools: ['treasure', 'shop'],
    familiar: 'subagent',
  },
  constitution: {
    name: 'CONSTITUTION', desc: 'BLOQUE UN COUP PAR SALLE', icon: 'it_constitution',
    pools: ['treasure', 'boss'],
    apply(s) { s.shield = true; },
  },
  cache: {
    name: 'PROMPT CACHING', desc: '+15 PIÈCES, CHANCE +', icon: 'it_cache',
    pools: ['treasure', 'shop'],
    onPickup(p) { p.coins = Math.min(99, p.coins + 15); },
    apply(s) { s.luck += 1; },
  },
  quant: {
    name: 'QUANTIFICATION', desc: 'VITESSE ++  CADENCE +', icon: 'it_quant',
    pools: ['treasure', 'shop'],
    apply(s) { s.speed += 16; s.fireDelay *= 0.9; },
  },
  gradient: {
    name: 'DESCENTE DE GRADIENT', desc: 'VITESSE +  DÉGÂTS +', icon: 'it_gradient',
    pools: ['treasure', 'shop', 'boss'],
    apply(s) { s.speed += 8; s.damageAdd += 0.6; },
  },
  mcp: {
    name: 'PROTOCOLE MCP', desc: 'UN ORBITAL BLOQUE LES TIRS', icon: 'it_mcp',
    pools: ['treasure', 'shop'],
    familiar: 'orbital',
  },
  coffee: {
    name: 'CAFÉ DU DEV', desc: 'TOUT UN PEU MIEUX', icon: 'it_coffee',
    pools: ['shop', 'treasure'],
    apply(s) { s.speed += 5; s.fireDelay *= 0.93; s.damageAdd += 0.3; s.range *= 1.1; },
    onPickup(p) { p.hp = Math.min(p.maxHp, p.hp + 1); },
  },
  embed: {
    name: 'EMBEDDINGS', desc: 'ARTEFACT SE CHARGE PLUS VITE', icon: 'it_embed',
    pools: ['treasure', 'shop'],
    apply(s) { s.specialRate *= 1.6; s.damageAdd += 0.3; },
  },
};

const ITEM_IDS = Object.keys(ITEMS);

// Bénédictions reçues après chaque boss (choix de 1 parmi 3, comme dans Hadès).
const BOONS = [
  { id: 'dashnova', name: 'DASH EXPLOSIF', desc: 'TON DASH LIBÈRE UN ANNEAU DE TOKENS', color: '#f8d048', glyph: 'D',
    apply(s) { s.dashNova = true; } },
  { id: 'crit', name: 'COUP CRITIQUE', desc: '15% DE CHANCE DE TRIPLER LES DÉGÂTS', color: '#e8404a', glyph: 'C',
    apply(s) { s.crit += 0.15; } },
  { id: 'vamp', name: 'RÉCUPÉRATION', desc: 'LES ENNEMIS VAINCUS SOIGNENT PARFOIS', color: '#78d05a', glyph: 'R',
    apply(s) { s.vamp += 0.08; } },
  { id: 'overcharge', name: 'SURCHARGE', desc: 'L\'ARTEFACT SE CHARGE 2X PLUS VITE', color: '#7fe8f0', glyph: 'S',
    apply(s) { s.specialRate *= 2; } },
  { id: 'echo', name: 'ÉCHO', desc: '30% DE CHANCE DE TIRER EN DOUBLE', color: '#a86ae8', glyph: 'E',
    apply(s) { s.echo += 0.3; } },
  { id: 'silicon', name: 'SILICIUM VITAL', desc: '+1 COEUR MAX ET SOIN COMPLET', color: '#f070b8', glyph: 'V',
    onPickup(p) { p.maxHp = Math.min(24, p.maxHp + 2); p.hp = p.maxHp; } },
  { id: 'swift', name: 'PAS LÉGERS', desc: 'VITESSE + ET DASH PLUS FRÉQUENT', color: '#4aa0f0', glyph: 'P',
    apply(s) { s.speed += 12; s.dashCd *= 0.6; } },
  { id: 'power', name: 'FORCE BRUTE', desc: 'DÉGÂTS +25%', color: '#d97757', glyph: 'F',
    apply(s) { s.damageMult *= 1.25; } },
  { id: 'phase', name: 'DASH FANTÔME', desc: 'DASH PLUS LONG ET INVULNÉRABILITÉ +', color: '#c8c0c8', glyph: 'F',
    apply(s) { s.dashTime *= 1.5; s.iframes += 0.6; } },
];

const BOON_MAP = {};
for (const b of BOONS) BOON_MAP[b.id] = b;
