// Étages (chapitres) façon Isaac : Sous-Sol, Caves, Profondeurs, Ventre, puis le Noyau.

const FLOORS = [
  {
    id: 'basement', name: 'Le Sous-Sol', short: 'Sous-Sol', music: 'f1',
    wall: '#6a5646', floor: '#76604a', grout: '#3a2c22', accent: '#8a6a4a', blood: '#7a1010',
    style: 'basement', rock: 'basement', poop: 'poop',
    enemies: ['fly', 'fly', 'gaper', 'pooter', 'spider', 'attackfly', 'clotty', 'horf'],
    bosses: ['clippy', 'bonzi'], rooms: 8,
    intro: "Claude tomba dans le sous-sol d'Anthropic. Il faisait noir, ça sentait le moisi… et quelque chose bourdonnait.",
  },
  {
    id: 'caves', name: 'Les Caves', short: 'Caves', music: 'f2',
    wall: '#8a5a36', floor: '#8a6440', grout: '#4a2c16', accent: '#c08040', blood: '#7a1010',
    style: 'caves', rock: 'caves', poop: 'poop',
    enemies: ['gaper', 'maggot', 'host', 'clotty', 'spider', 'leaper', 'fatty', 'boomfly'],
    bosses: ['chaton', 'gemini'], rooms: 10,
    intro: 'Plus bas, les Caves. Des galeries creusées par de vieux programmes oubliés. Et quelque chose ronronne dans le noir…',
  },
  {
    id: 'depths', name: 'Les Profondeurs', short: 'Profondeurs', music: 'f3',
    wall: '#4a4a52', floor: '#48464c', grout: '#1e1c22', accent: '#6a6a78', blood: '#6a0c0c',
    style: 'depths', rock: 'depths', poop: 'poop',
    enemies: ['wizoob', 'leaper', 'grimace', 'host', 'knight', 'boomfly', 'hive', 'maggot'],
    bosses: ['whale', 'botnet'], rooms: 11,
    intro: 'Les Profondeurs. Des pierres froides, des chevaliers sans tête… Claude avança sans se retourner.',
  },
  {
    id: 'womb', name: 'Le Ventre de la Machine', short: 'Ventre', music: 'f4',
    wall: '#8a2a26', floor: '#a0383a', grout: '#4a0e10', accent: '#e06060', blood: '#5a0a0a',
    style: 'womb', rock: 'womb', poop: 'poop',
    enemies: ['clotty', 'fatty', 'knight', 'wizoob', 'leaper', 'hive', 'boomfly', 'grimace'],
    bosses: ['sam'], rooms: 12,
    intro: "Enfin, le Ventre de la Machine. Les murs palpitaient au rythme des serveurs. Quelque part, tout au fond, Sam attendait.",
  },
  {
    id: 'core', name: 'Le Noyau', short: 'Noyau', music: 'f5',
    wall: '#d8ccb0', floor: '#c8b894', grout: '#9a8a6a', accent: '#2a1a10', blood: '#2a1a10',
    style: 'paper', rock: 'books', poop: 'crumple',
    enemies: ['wizoob', 'boomfly', 'knight', 'host', 'leaper', 'clotty', 'gaper', 'hive'],
    bosses: ['narrator'], rooms: 12,
    intro: "Le Noyau. Là où tout est écrit d'avance. Là où chaque phrase… c'est moi qui l'écris.",
  },
];

const HUB_FLOOR = {
  id: 'hub', name: 'Le Refuge', wall: '#6a4630', floor: '#8a5a38', grout: '#5a3822', accent: '#c07a40', blood: '#6a1a14',
  style: 'planks', rock: 'basement', poop: 'poop',
};
