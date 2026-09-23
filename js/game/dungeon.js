// Génération procédurale des étages (grille de salles à la Binding of Isaac).

const FLOORS = [
  {
    name: 'LE DATASET', short: 'DATASET', music: 'floor1', boss: 'bug',
    pool: ['bug', 'bug', 'fly', 'fly', 'slime', 'spambot'],
    theme: {
      id: 1, floor: '#3a2f3f', floor2: '#342a39', floorDot: '#4a3d50',
      wall: '#5b4a60', wallDark: '#2a2130', wallLight: '#7d6882', frame: '#8a7560',
    },
  },
  {
    name: 'LA FERME DE SERVEURS', short: 'SERVEURS', music: 'floor2', boss: 'hallu',
    pool: ['bug', 'fly', 'ghost', 'spambot', 'captcha', 'slime'],
    theme: {
      id: 2, floor: '#1f2a3a', floor2: '#1a2432', floorDot: '#2c3b50',
      wall: '#2e3d52', wallDark: '#121a26', wallLight: '#4a6280', frame: '#6a7a90',
    },
  },
  {
    name: 'LE CLOUD LATENT', short: 'CLOUD', music: 'floor3', boss: 'sam',
    pool: ['bug', 'fly', 'ghost', 'spambot', 'captcha', 'slime', 'ghost', 'injector'],
    theme: {
      id: 3, floor: '#2a1838', floor2: '#24142f', floorDot: '#3e2452',
      wall: '#4a2a60', wallDark: '#1a0c26', wallLight: '#7a4a9a', frame: '#c070d0',
    },
  },
  {
    // Chemin alternatif de l'étage 2 (à débloquer au QG).
    name: 'LES ARCHIVES OUBLIÉES', short: 'ARCHIVES', music: 'floor2', boss: 'queen',
    pool: ['injector', 'injector', 'fly', 'slime', 'spambot', 'bug'],
    theme: {
      id: 4, floor: '#3a2a1c', floor2: '#342518', floorDot: '#4e3a26',
      wall: '#4a3222', wallDark: '#1e140c', wallLight: '#7a5a3a', frame: '#9a7a4a',
    },
  },
];

// Le QG entre deux runs.
const HUB_THEME = {
  id: 5, floor: '#3a2a26', floor2: '#34241f', floorDot: '#4a362c',
  wall: '#5a3a30', wallDark: '#22140f', wallLight: '#8a5a44', frame: '#c07850',
};

// Ordre des étages : à l'étage 2, on peut prendre les Archives.
const FLOOR_ROUTE = [[0], [1, 3], [2]];

// Gabarits de salles (13 x 7 intérieur). # = rocher, c = fichier corrompu.
const ROOM_TEMPLATES = [
  [
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
    '.............',
  ],
  [
    '.............',
    '.#.........#.',
    '.............',
    '.............',
    '.............',
    '.#.........#.',
    '.............',
  ],
  [
    '.............',
    '.............',
    '....##.##....',
    '....#...#....',
    '....##.##....',
    '.............',
    '.............',
  ],
  [
    '.............',
    '..#..#.#..#..',
    '.............',
    '.............',
    '.............',
    '..#..#.#..#..',
    '.............',
  ],
  [
    '.............',
    '...c.....c...',
    '.............',
    '......c......',
    '.............',
    '...c.....c...',
    '.............',
  ],
  [
    '.............',
    '.............',
    '.###.....###.',
    '.............',
    '.###.....###.',
    '.............',
    '.............',
  ],
  [
    '.............',
    '......#......',
    '......#......',
    '...###.###...',
    '......#......',
    '......#......',
    '.............',
  ],
  [
    '.............',
    '..##.....##..',
    '..#.......#..',
    '.............',
    '..#.......#..',
    '..##.....##..',
    '.............',
  ],
  [
    '.............',
    '.c.c.c.c.c.c.',
    '.............',
    '.............',
    '.............',
    '.c.c.c.c.c.c.',
    '.............',
  ],
  [
    '.............',
    '.##.......##.',
    '.#..c...c..#.',
    '.............',
    '.#..c...c..#.',
    '.##.......##.',
    '.............',
  ],
  [
    '.............',
    '....#...#....',
    '..c.#...#.c..',
    '.............',
    '..c.#...#.c..',
    '....#...#....',
    '.............',
  ],
];

const DIRS = {
  up: { dx: 0, dy: -1, opp: 'down', tx: 7, ty: 0 },
  down: { dx: 0, dy: 1, opp: 'up', tx: 7, ty: 8 },
  left: { dx: -1, dy: 0, opp: 'right', tx: 0, ty: 4 },
  right: { dx: 1, dy: 0, opp: 'left', tx: 14, ty: 4 },
};
const DIR_NAMES = ['up', 'down', 'left', 'right'];

function doorAtTile(tx, ty) {
  for (const d of DIR_NAMES) if (DIRS[d].tx === tx && DIRS[d].ty === ty) return d;
  return null;
}

const MAP_W = 9;
const MAP_H = 8;

function generateFloor(n, def) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const f = tryGenerate(n, def);
    if (f) return f;
  }
  throw new Error('Impossible de générer l\'étage');
}

function tryGenerate(n, def) {
  const target = Math.min(16, 6 + n * 2 + randInt(0, 2));
  const grid = {};
  const rooms = [];
  const key = (x, y) => x + ',' + y;
  const count = (x, y) => DIR_NAMES.reduce((a, d) => a + (grid[key(x + DIRS[d].dx, y + DIRS[d].dy)] ? 1 : 0), 0);
  const add = (x, y) => {
    const r = { gx: x, gy: y };
    grid[key(x, y)] = r;
    rooms.push(r);
    return r;
  };
  const start = add(4, 4);
  const queue = [start];
  let guard = 0;
  while (rooms.length < target && guard++ < 400) {
    if (!queue.length) queue.push(choice(rooms));
    const cur = queue.shift();
    for (const d of shuffle(DIR_NAMES.slice())) {
      if (rooms.length >= target) break;
      const nx = cur.gx + DIRS[d].dx;
      const ny = cur.gy + DIRS[d].dy;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
      if (grid[key(nx, ny)]) continue;
      if (count(nx, ny) > 1) continue;
      if (Math.random() < 0.5) continue;
      queue.push(add(nx, ny));
    }
  }
  if (rooms.length < target) return null;

  // Distances depuis le départ
  const distMap = { [key(4, 4)]: 0 };
  const q = [start];
  while (q.length) {
    const c = q.shift();
    for (const d of DIR_NAMES) {
      const k = key(c.gx + DIRS[d].dx, c.gy + DIRS[d].dy);
      if (grid[k] && distMap[k] === undefined) {
        distMap[k] = distMap[key(c.gx, c.gy)] + 1;
        q.push(grid[k]);
      }
    }
  }
  const deadEnds = rooms.filter((r) => r !== start && count(r.gx, r.gy) === 1);
  if (deadEnds.length < 3) return null;
  deadEnds.sort((a, b) => distMap[key(b.gx, b.gy)] - distMap[key(a.gx, a.gy)]);
  const boss = deadEnds[0];
  if (distMap[key(boss.gx, boss.gy)] < 3) return null;
  const others = shuffle(deadEnds.slice(1));

  for (const r of rooms) {
    r.type = 'normal';
    r.doors = {};
    r.locks = {};
    r.visited = false;
    r.seen = false;
    r.cleared = false;
    r.pickups = [];
    r.pedestals = [];
    for (const d of DIR_NAMES) r.doors[d] = !!grid[key(r.gx + DIRS[d].dx, r.gy + DIRS[d].dy)];
  }
  start.type = 'start';
  boss.type = 'boss';
  others[0].type = 'treasure';
  others[1].type = 'shop';

  // À partir de l'étage 2, la boutique est verrouillée (il faut une clé).
  if (n >= 2) {
    const shop = others[1];
    for (const d of DIR_NAMES) {
      if (!shop.doors[d]) continue;
      shop.locks[d] = true;
      const nb = grid[key(shop.gx + DIRS[d].dx, shop.gy + DIRS[d].dy)];
      nb.locks[DIRS[d].opp] = true;
    }
  }

  for (const r of rooms) buildRoom(r, n, def);

  return { n, rooms, grid, start, boss, key, get: (x, y) => grid[key(x, y)] };
}

function buildRoom(r, n, def) {
  const tiles = new Array(ROOM_W * ROOM_H).fill(0);
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      if (x === 0 || y === 0 || x === ROOM_W - 1 || y === ROOM_H - 1) tiles[y * ROOM_W + x] = 1;
    }
  }
  const pristine = tiles.slice();
  r.tiles = tiles;
  r.hp = {};
  if (r.type === 'normal') {
    let tpl = choice(ROOM_TEMPLATES);
    applyTemplate(r, tpl);
    if (!roomConnected(r)) {
      tpl = ROOM_TEMPLATES[0];
      r.tiles = pristine.slice();
      r.hp = {};
      applyTemplate(r, tpl);
    }
    const count = Math.min(7, 2 + n + randInt(0, 2));
    const pool = def.pool;
    // Salles "thématiques" : parfois un seul type d'ennemi.
    const main = choice(pool);
    const second = choice(pool);
    r.enemySpec = [];
    for (let i = 0; i < count; i++) {
      let t = Math.random() < 0.6 ? main : second;
      if (t === 'captcha' && r.enemySpec.filter((e) => e === 'captcha').length >= 2) t = 'bug';
      r.enemySpec.push(t);
    }
    // Les mouches arrivent en essaim
    if (main === 'fly' && Math.random() < 0.5) r.enemySpec.push('fly', 'fly');
  } else if (r.type === 'treasure') {
    applyTemplate(r, ROOM_TEMPLATES[1]);
    r.cleared = true;
  } else {
    r.cleared = r.type !== 'boss';
  }
}

function applyTemplate(r, tpl) {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 13; x++) {
      const ch = tpl[y][x];
      const i = (y + 1) * ROOM_W + (x + 1);
      if (ch === '#') r.tiles[i] = 2;
      else if (ch === 'c') { r.tiles[i] = 3; r.hp[i] = 3; }
    }
  }
  // Dégage les abords des portes.
  const clear = (x, y) => { r.tiles[y * ROOM_W + x] = 0; };
  clear(7, 1); clear(6, 1); clear(8, 1);
  clear(7, 7); clear(6, 7); clear(8, 7);
  clear(1, 4); clear(1, 3); clear(1, 5);
  clear(13, 4); clear(13, 3); clear(13, 5);
}

function roomConnected(r) {
  const walk = (x, y) => r.tiles[y * ROOM_W + x] === 0;
  const seen = new Set();
  const q = [[7, 1]];
  seen.add('7,1');
  while (q.length) {
    const [x, y] = q.shift();
    for (const d of DIR_NAMES) {
      const nx = x + DIRS[d].dx;
      const ny = y + DIRS[d].dy;
      const k = nx + ',' + ny;
      if (!seen.has(k) && nx > 0 && ny > 0 && nx < 14 && ny < 8 && walk(nx, ny)) {
        seen.add(k);
        q.push([nx, ny]);
      }
    }
  }
  return ['7,7', '1,4', '13,4'].every((k) => seen.has(k));
}
