// Méta-progression façon Hadès : tokens de calcul persistants, modèles de Claude
// à débloquer, améliorations permanentes, chemins alternatifs et Surchauffe.

const MODELS = {
  haiku: {
    name: 'CLAUDE HAIKU', title: 'LÉGER ET RAPIDE', cost: 0, prefix: 'haiku',
    desc: 'RAPIDE, CADENCE ÉLEVÉE, MAIS FRAGILE.',
    hp: 6, damage: 3, fireDelay: 0.33, speed: 94, special: 1,
    bars: [2, 2, 4, 4],
  },
  sonnet: {
    name: 'CLAUDE SONNET', title: 'L\'ÉQUILIBRE', cost: 150, prefix: 'sonnet',
    desc: 'POLYVALENT. COMMENCE AVEC UN OBJET ALÉATOIRE.',
    hp: 6, damage: 3.6, fireDelay: 0.4, speed: 86, special: 1.15, startItem: true,
    bars: [3, 3, 3, 3],
  },
  opus: {
    name: 'CLAUDE OPUS', title: 'LE PLUS PUISSANT', cost: 400, prefix: 'opus',
    desc: 'ÉNORMES DÉGÂTS, TIRS PERÇANTS, ARTEFACT SURPUISSANT. PLUS LENT.',
    hp: 8, damage: 4.8, fireDelay: 0.46, speed: 80, special: 1.4, pierce: true,
    bars: [4, 5, 2, 2],
  },
};
const MODEL_IDS = Object.keys(MODELS);

// Améliorations permanentes (le "Miroir" de Hadès).
const UPGRADES = [
  { id: 'hp', name: 'MÉMOIRE ÉTENDUE', desc: '+1 COEUR MAX', costs: [40, 90, 180], color: '#e83848' },
  { id: 'dmg', name: 'POIDS AFFINÉS', desc: '+10% DE DÉGÂTS', costs: [30, 70, 150], color: '#f08040' },
  { id: 'speed', name: 'INFÉRENCE RAPIDE', desc: '+6 DE VITESSE', costs: [25, 60, 120], color: '#50b0f0' },
  { id: 'luck', name: 'BUDGET DE DÉPART', desc: '+4 PIÈCES ET CHANCE +', costs: [20, 50, 110], color: '#f8c838' },
  { id: 'art', name: 'CACHE CHAUD', desc: 'ARTEFACT CHARGÉ À +30%', costs: [30, 70, 140], color: '#7fe8f0' },
  { id: 'revive', name: 'CHECKPOINT', desc: 'REVIENS À LA VIE 1 FOIS PAR RUN', costs: [250], color: '#78d05a' },
];

const PATHS = {
  archives: { name: 'LES ARCHIVES OUBLIÉES', cost: 120, desc: 'UN AUTRE CHEMIN APRÈS L\'ÉTAGE 1' },
};

const Meta = {
  data: null,

  defaults() {
    return {
      tokens: 0, runs: 0, wins: 0, bestFloor: 0,
      upgrades: {}, models: { haiku: true }, model: 'haiku',
      paths: {}, heat: 0, maxHeat: 0, lastGain: 0,
    };
  },

  load() {
    this.data = Object.assign(this.defaults(), Store.get('meta', {}));
    if (!this.data.models.haiku) this.data.models.haiku = true;
    return this.data;
  },

  save() {
    Store.set('meta', this.data);
  },

  lvl(id) {
    return this.data.upgrades[id] || 0;
  },

  buyUpgrade(u) {
    const l = this.lvl(u.id);
    if (l >= u.costs.length) return false;
    const c = u.costs[l];
    if (this.data.tokens < c) return false;
    this.data.tokens -= c;
    this.data.upgrades[u.id] = l + 1;
    this.save();
    return true;
  },

  buyModel(id) {
    if (this.data.models[id]) { this.data.model = id; this.save(); return true; }
    const c = MODELS[id].cost;
    if (this.data.tokens < c) return false;
    this.data.tokens -= c;
    this.data.models[id] = true;
    this.data.model = id;
    this.save();
    return true;
  },

  buyPath(id) {
    if (this.data.paths[id]) return true;
    const c = PATHS[id].cost;
    if (this.data.tokens < c) return false;
    this.data.tokens -= c;
    this.data.paths[id] = true;
    this.save();
    return true;
  },

  // Fin de run : on encaisse les tokens gagnés.
  endRun(game, won) {
    const d = this.data;
    const gain = Math.round(game.runTokens * (1 + d.heat * 0.25));
    d.tokens += gain;
    d.lastGain = gain;
    d.runs++;
    const k = game.stats.killer;
    d.lastKiller = k ? (k.label || k.name) : (game.stats.killerLabel || 'UN MYSTÈRE');
    d.lastFloor = game.floorDef ? game.floorDef.name : '';
    d.lastWon = !!won;
    d.bestFloor = Math.max(d.bestFloor, game.floorNum);
    if (won) {
      d.wins++;
      if (d.heat >= d.maxHeat) d.maxHeat = Math.min(5, d.heat + 1);
    }
    this.save();
    return gain;
  },
};

Meta.load();
