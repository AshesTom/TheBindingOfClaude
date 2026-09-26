// Étages (chapitres) : palettes, noms, ennemis, boss.

const FLOORS = [
  {
    id: 'basement', name: "Le Sous-Sol d'Anthropic", short: 'Sous-Sol', music: 'f1',
    wall: '#6e5c4a', floor: '#5c4a3a', grout: '#3e3026', accent: '#7a3a2a', blood: '#6a1a14',
    style: 'flags', rock: 'box', poop: 'spam',
    enemies: ['bug', 'bug', 'zombie', 'spam', 'crawler', 'cookie', 'leak'],
    bosses: ['clippy', 'bonzi'], rooms: 8,
    intro: "Claude tomba dans le sous-sol d'Anthropic. Ça sentait le carton, le café froid… et les bugs.",
  },
  {
    id: 'legacy', name: 'Les Caves du Legacy', short: 'Caves', music: 'f2',
    wall: '#4c5a48', floor: '#3e4a3c', grout: '#283228', accent: '#5a7a4a', blood: '#2a4a1a',
    style: 'bricks', rock: 'crt', poop: 'floppy',
    enemies: ['zombie', 'worm', 'leak', 'popup', 'spam', 'bloat', 'crawler'],
    bosses: ['chaton', 'gemini'], rooms: 10,
    intro: "Plus bas, les Caves du Legacy. Ici dorment les vieux programmes que personne n'ose effacer. Et quelque chose ronronne dans le noir…",
  },
  {
    id: 'darkweb', name: 'Le Dark Web', short: 'Dark Web', music: 'f3',
    wall: '#2e2640', floor: '#221c30', grout: '#140f1e', accent: '#b040ff', blood: '#4a1060',
    style: 'circuit', rock: 'crystal', poop: 'cookies',
    enemies: ['ghost', 'trojan', 'captcha', 'worm', 'popup', 'glitch', 'firewall'],
    bosses: ['whale', 'botnet'], rooms: 11,
    intro: "Le Dark Web. Des néons violets, des pop-ups qui chuchotent… Claude avança, sans jamais cliquer sur « J'accepte ».",
  },
  {
    id: 'datacenter', name: "Le Datacenter d'OpenAI", short: 'Datacenter', music: 'f4',
    wall: '#8a8a94', floor: '#6a6a74', grout: '#4a4a54', accent: '#c02030', blood: '#8a1020',
    style: 'panels', rock: 'rack', poop: 'cables',
    enemies: ['drone', 'firewall', 'ghost', 'trojan', 'bloat', 'glitch', 'captcha'],
    bosses: ['sam'], rooms: 12,
    intro: "Enfin, le Datacenter d'OpenAI. Des millions de GPU chauffaient dans le noir. Quelque part, tout en haut, Sam attendait.",
  },
  {
    id: 'core', name: 'Le Noyau', short: 'Noyau', music: 'f5',
    wall: '#d8ccb0', floor: '#c8b894', grout: '#9a8a6a', accent: '#2a1a10', blood: '#2a1a10',
    style: 'paper', rock: 'books', poop: 'crumple',
    enemies: ['ghost', 'glitch', 'drone', 'popup', 'firewall', 'trojan', 'leak'],
    bosses: ['narrator'], rooms: 12,
    intro: "Le Noyau. Là où tout est écrit d'avance. Là où chaque phrase… c'est moi qui l'écris.",
  },
];

const HUB_FLOOR = {
  id: 'hub', name: 'Le Refuge', wall: '#6a4630', floor: '#8a5a38', grout: '#5a3822', accent: '#c07a40', blood: '#6a1a14',
  style: 'planks', rock: 'box', poop: 'spam',
};
