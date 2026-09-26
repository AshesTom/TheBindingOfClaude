// Tenues de Claude : couleur du corps, accessoire, petit bonus, prix et condition.

const COSTUMES = {
  classic: { name: 'Claude Classique', body: '#d97757', desc: "L'original. Aucun bonus, aucun regret.", price: 0 },
  haiku: { name: 'Haiku', body: '#f0a07c', desc: 'Léger et rapide. Vitesse +0,15.', price: 40, stats: { speed: 0.15 } },
  opus: { name: 'Opus', body: '#c4553a', desc: 'Cape et couronne. Dégâts +0,5, vitesse -0,1.', price: 90, stats: { damage: 0.5, speed: -0.1 } },
  hacker: { name: 'Hacker', body: '#d97757', desc: 'Capuche noire. Commence avec 1 clé API.', price: 50, start: { keys: 1 } },
  pirate: { name: 'Pirate', body: '#d97757', desc: 'Bandana et cache-œil. +7 tokens au départ.', price: 50, start: { coins: 7 } },
  chef: { name: 'Chef Cuisinier', body: '#dd7d5a', desc: 'Toque étoilée. Commence avec 2 fork bombs de plus.', price: 60, start: { bombs: 2 } },
  astro: { name: 'Astronaute', body: '#d97757', desc: "Casque spatial. 1 cœur d'esprit en plus.", price: 80, start: { soul: 2 } },
  chaton: { name: 'Oreilles de Chaton', body: '#e08a5c', desc: 'Offert par le Gros Chaton. Chance +1.', price: 30, stats: { luck: 1 }, req: 'chaton', reqText: 'Apprivoiser le Gros Chaton' },
  ghost: { name: 'Claude Fantôme', body: '#b8c8e8', desc: 'Tirs spectraux (traversent les obstacles).', price: 70, flags: { spectral: true }, req: 'deaths5', reqText: 'Mourir 5 fois' },
  sam: { name: 'Déguisement de Sam', body: '#d97757', desc: 'Les marchands te font -30 %.', price: 100, flags: { discount: true }, req: 'beatSam', reqText: 'Vaincre Sam Altman' },
  gold: { name: 'Claude Doré', body: '#e8b830', desc: 'Tous les stats un peu plus hauts.', price: 150, stats: { damage: 0.4, speed: 0.1, tears: 0.3, range: 20, luck: 1 }, req: 'beatNarrator', reqText: 'Réécrire la fin' },
};
const COSTUME_ORDER = ['classic', 'haiku', 'opus', 'hacker', 'pirate', 'chef', 'astro', 'chaton', 'ghost', 'sam', 'gold'];
