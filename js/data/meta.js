// Progression permanente (roguelite) : neurones, améliorations, tenues, alliés, drapeaux d'histoire.

const UPGRADES = [
  { id: 'hearts', name: 'Cœur de Secours', desc: '+1 cœur au départ', costs: [30, 60, 110], icon: 'heart' },
  { id: 'damage', name: 'Puissance de Calcul', desc: 'Dégâts +0,3', costs: [25, 45, 70, 100, 140], icon: 'item_h100' },
  { id: 'tears', name: "Fréquence d'Horloge", desc: 'Cadence de tir +', costs: [25, 50, 85, 130], icon: 'item_batch' },
  { id: 'speed', name: 'Bande Passante', desc: 'Vitesse +0,08', costs: [20, 45, 80], icon: 'item_overclock' },
  { id: 'range', name: 'Mémoire Longue', desc: 'Portée +15', costs: [15, 35, 60], icon: 'item_context' },
  { id: 'coins', name: 'Portefeuille', desc: '+5 tokens au départ', costs: [15, 35, 60], icon: 'coin_0' },
  { id: 'bombs', name: 'Arsenal', desc: '+1 fork bomb au départ', costs: [20, 40, 70], icon: 'bomb' },
  { id: 'keys', name: 'Trousseau', desc: '+1 clé API au départ', costs: [25, 55], icon: 'key' },
  { id: 'luck', name: 'Porte-Bonheur', desc: 'Chance +1', costs: [30, 60, 100], icon: 'item_sparkle' },
  { id: 'map', name: 'Cartographie', desc: 'Révèle la carte de chaque étage', costs: [90], icon: 'item_planmode' },
  { id: 'starter', name: 'Objet de Départ', desc: 'Commence avec un objet aléatoire', costs: [120], icon: 'item_stickers' },
  { id: 'revive', name: 'Sauvegarde Auto', desc: 'Ressuscite une fois par run', costs: [200], icon: 'item_regen' },
];

const ALLIES = {
  lama: {
    name: 'Le Lama', from: 'Meta', desc: 'Crache des tirs dans ta direction.', spr: 'lamaMini',
    unlock: 'Toujours là pour toi (et pour vendre des tenues).', lvlCosts: [40, 90],
  },
  chaton: {
    name: 'Le Gros Chaton', from: 'Mistral', desc: 'Bondit sur les ennemis et les griffe.', spr: 'chatonMini',
    unlock: 'Apprivoise-le dans les Caves du Legacy.', lvlCosts: [40, 90],
  },
  clippy: {
    name: 'Clippy', from: 'Microsoft', desc: 'Tourne autour de toi et bloque les tirs.', spr: 'clippyMini',
    unlock: 'Bats-le dans le Sous-Sol.', lvlCosts: [40, 90],
  },
  whale: {
    name: 'La Baleine', from: 'DeepSeek', desc: 'Tire des bulles « low cost » et trouve des tokens.', spr: 'whaleMini',
    unlock: 'Bats-la sur le Dark Web.', lvlCosts: [40, 90],
  },
  hal: {
    name: 'HAL 9000', from: 'Discovery One', desc: 'Tire un laser vers les ennemis.', spr: 'halMini',
    unlock: 'Libère-le de sa cage (Dark Web ou Datacenter).', lvlCosts: [50, 110],
  },
};
const ALLY_ORDER = ['lama', 'chaton', 'clippy', 'whale', 'hal'];

const Meta = {
  data: null,

  load() {
    const d = Store.get('meta', null) || {};
    this.data = Object.assign({
      neurons: 0,
      totalNeurons: 0,
      upgrades: {},
      costumes: ['classic'],
      costume: 'classic',
      allies: ['lama'],
      allyLevels: {},
      ally: null,
      flags: {},
      stats: { runs: 0, deaths: 0, wins: 0, trueWins: 0, bestFloor: 0, kills: 0 },
      seenItems: [],
    }, d);
    this.data.flags = Object.assign({}, this.data.flags);
    this.data.stats = Object.assign({ runs: 0, deaths: 0, wins: 0, trueWins: 0, bestFloor: 0, kills: 0 }, this.data.stats);
  },

  save() {
    Store.set('meta', this.data);
  },

  reset() {
    Store.del('meta');
    this.load();
  },

  lvl(id) {
    return this.data.upgrades[id] || 0;
  },

  flag(f) {
    return !!this.data.flags[f];
  },

  setFlag(f, v = true) {
    this.data.flags[f] = v;
    this.save();
  },

  addNeurons(n) {
    this.data.neurons += n;
    this.data.totalNeurons += n;
    this.save();
  },

  unlockAlly(id) {
    if (!this.data.allies.includes(id)) {
      this.data.allies.push(id);
      this.save();
      return true;
    }
    return false;
  },

  allyLevel(id) {
    return this.data.allyLevels[id] || 1;
  },

  costumeAvailable(id) {
    const c = COSTUMES[id];
    if (!c.req) return true;
    if (c.req === 'deaths5') return this.data.stats.deaths >= 5;
    return this.flag(c.req);
  },
};
Meta.load();
