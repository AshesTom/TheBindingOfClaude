// Décors des salles façon The Binding of Isaac : murs en grosses pierres irrégulières,
// sols terreux, portes en arche de pierre, rochers, cacas, feux de camp et trous.
// Tout est généré à la volée et mis en cache par étage.

const OX = 10;
const OY = 2;
const OX2 = W - 10;
const OY2 = H - 2;

// Bruit cellulaire (Worley) : distance au point le plus proche et au second,
// pour dessiner des pierres irrégulières avec un joint sombre entre elles.
function worley(x, y, size, seed) {
  const gx = Math.floor(x / size);
  const gy = Math.floor(y / size);
  let d1 = 1e9;
  let d2 = 1e9;
  let fx = 0;
  let fy = 0;
  let id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cy = gy + j;
      const px = (cx + 0.15 + hash2(cx, cy, seed) * 0.7) * size;
      const py = (cy + 0.15 + hash2(cx, cy, seed + 7) * 0.7) * size;
      const d = Math.hypot(x - px, y - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        fx = px;
        fy = py;
        id = hash2(cx, cy, seed + 13);
      } else if (d < d2) d2 = d;
    }
  }
  return { d1, d2, fx, fy, id };
}

// Pierre éclairée depuis le haut à gauche : renvoie un facteur de luminosité (ou -1 pour le joint).
function stoneShade(x, y, size, seed, mortar = 1.6) {
  const w = worley(x, y, size, seed);
  const edge = w.d2 - w.d1;
  if (edge < mortar) return { mortar: true, k: 0.55 + edge * 0.1 };
  const ox = (x - w.fx) / size;
  const oy = (y - w.fy) / size;
  // bosse : bord haut-gauche éclairé, bas-droite dans l'ombre
  const bevel = -(ox * 0.6 + oy * 0.8) * 0.9;
  let k = 0.82 + w.id * 0.3 + bevel * 0.35;
  if (edge < mortar + 2) k *= 0.82 + (edge - mortar) * 0.09;
  return { mortar: false, k, id: w.id };
}

function wallInfo(x, y) {
  if (x >= FX && x < FX2 && y >= FY && y < FY2) return null;
  if (x < OX || x >= OX2 || y < OY || y >= OY2) return null;
  const tTop = (FY - y) / (FY - OY);
  const tBot = (y - FY2 + 1) / (OY2 - FY2);
  const tL = (FX - x) / (FX - OX);
  const tR = (x - FX2 + 1) / (OX2 - FX2);
  const m = Math.max(tTop, tBot, tL, tR);
  let side = 'top';
  if (m === tBot) side = 'bottom';
  if (m === tL) side = 'left';
  if (m === tR) side = 'right';
  if (m === tTop) side = 'top';
  return { side, depth: m };
}

function paintRoomBG(fl, variant = 0) {
  const key = 'bg_' + fl.id + '_' + variant;
  if (SPR[key]) return SPR[key];
  const c = mkCanvas(W, H);
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const D = img.data;
  const seed = variant * 101 + fl.id.length * 7 + 3;
  const WALL = rgb(fl.wall);
  const FLOOR = rgb(fl.floor);
  const GROUT = rgb(fl.grout);
  const ACC = rgb(fl.accent);
  const INKC = rgb('#4a3a2a');
  const BLUEL = rgb('#8aa0c0');
  const REDL = rgb('#c06060');
  const VEIN = rgb('#5a0c10');
  const put = (x, y, col, k) => {
    const i = (y * W + x) * 4;
    D[i] = clamp(col[0] * k, 0, 255);
    D[i + 1] = clamp(col[1] * k, 0, 255);
    D[i + 2] = clamp(col[2] * k, 0, 255);
    D[i + 3] = 255;
  };
  const st = fl.style;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wi = wallInfo(x, y);
      if (wi) {
        // ------------------------------------------------ Murs
        let col = WALL;
        let k = 1;
        const horiz = wi.side === 'top' || wi.side === 'bottom';
        if (st === 'basement' || st === 'caves' || st === 'womb') {
          const size = st === 'caves' ? 13 : st === 'womb' ? 20 : 19;
          // pierres un peu écrasées dans le sens du mur (effet de perspective)
          const sx = horiz ? x : x * 1.35;
          const sy = horiz ? y * 1.35 : y;
          const s = stoneShade(sx, sy, size, seed + 5, st === 'womb' ? 2.2 : 1.7);
          if (s.mortar) { col = st === 'womb' ? VEIN : GROUT; k = s.k; }
          else k = s.k;
          if (st === 'womb' && !s.mortar) k *= 0.9 + fbm(x * 0.08, y * 0.08, seed, 2) * 0.25;
        } else if (st === 'depths') {
          // gros blocs taillés, biseautés
          const u = horiz ? x : y;
          const v = horiz ? y : x;
          const bh = 11;
          const bw = 24;
          const row = Math.floor(v / bh);
          const off = row % 2 ? bw / 2 : 0;
          const bx = (u + off) % bw;
          const by = v % bh;
          if (by === 0 || bx === 0) { col = GROUT; }
          else {
            if (by === 1 || bx === 1) k *= 1.18;
            if (by === bh - 1 || bx === bw - 1) k *= 0.72;
            k *= 0.86 + hash2(Math.floor((u + off) / bw), row, seed) * 0.26;
            k *= 0.94 + hash2(x, y, seed) * 0.1;
          }
        } else if (st === 'planks') {
          const u = horiz ? x : y;
          const v = horiz ? y : x;
          const row = Math.floor(v / 9);
          const off = row % 2 ? 30 : 0;
          const bx = (u + off + row * 7) % 60;
          if (v % 9 === 0 || bx < 1) col = GROUT;
          else if (v % 9 === 1) k *= 1.1;
          k *= 0.9 + hash2(Math.floor((u + off + row * 7) / 60), row, 3) * 0.2;
          k *= 0.95 + hash2(x, y, seed) * 0.08;
        } else if (st === 'paper') {
          const u = horiz ? x : y;
          const v = horiz ? y : x;
          const word = hash2(Math.floor(u / 5), Math.floor(v / 7), seed) > 0.25;
          if (v % 7 === 3 && word && u % 5 !== 0) { col = INKC; k = 0.9; }
          if (v % 42 === 0) col = GROUT;
          k *= 0.95 + hash2(x, y, seed) * 0.08;
        }
        k *= 0.9 + fbm(x * 0.03, y * 0.03, seed + 9, 2) * 0.2;
        // Lumière : clair près du sol, très sombre vers l'extérieur (façon Isaac)
        k *= 1.18 - Math.pow(wi.depth, 1.3) * 0.95;
        if (wi.side === 'top') k *= 1.06;
        if (wi.side === 'bottom') k *= 0.72;
        if (wi.side === 'left' || wi.side === 'right') k *= 0.88;
        // Lèvre du mur : liseré clair contre le sol
        if (wi.depth < 0.07) k *= 1.2;
        put(x, y, col, k);
      } else if (x >= FX && x < FX2 && y >= FY && y < FY2) {
        // ------------------------------------------------ Sol
        const lx = x - FX;
        const ly = y - FY;
        let col = FLOOR;
        let k = 1;
        const n = fbm(x * 0.04, y * 0.04, seed + 11, 4);
        const grain = hash2(x, y, seed + 1);
        if (st === 'basement') {
          // terre battue et grandes dalles à peine visibles
          k *= 0.8 + n * 0.34 + (grain - 0.5) * 0.09;
          const s = worley(x * 1.15, y, 40, seed + 3);
          if (s.d2 - s.d1 < 1.1) k *= 0.9;
          else k *= 0.95 + s.id * 0.08;
          if (grain > 0.985) k *= 0.7;
        } else if (st === 'caves') {
          const s = stoneShade(x * 1.1, y, 22, seed + 3, 1.3);
          k *= s.mortar ? 0.84 : 0.93 + (s.k - 0.95) * 0.22;
          k *= 0.85 + n * 0.25 + (grain - 0.5) * 0.08;
        } else if (st === 'depths') {
          const tx = lx % 26;
          const ty = ly % 26;
          if (tx === 0 || ty === 0) col = GROUT;
          else {
            if (tx === 1 || ty === 1) k *= 1.12;
            if (tx === 25 || ty === 25) k *= 0.8;
            k *= 0.86 + hash2(Math.floor(lx / 26), Math.floor(ly / 26), seed + 2) * 0.22;
          }
          k *= 0.85 + n * 0.25 + (grain - 0.5) * 0.08;
          const cr = fbm(x * 0.09, y * 0.09, seed + 40, 2);
          if (Math.abs(cr - 0.5) < 0.012) k *= 0.6;
        } else if (st === 'womb') {
          // chair bosselée, éclairée par le relief, veines sombres
          const h0 = fbm(x * 0.07, y * 0.07, seed + 20, 3);
          const hx = fbm((x + 1) * 0.07, y * 0.07, seed + 20, 3);
          const hy = fbm(x * 0.07, (y + 1) * 0.07, seed + 20, 3);
          k *= 0.86 + (h0 - hy) * 3.5 + (h0 - hx) * 2 + n * 0.16;
          const v = worley(x, y, 30, seed + 30);
          if (v.d2 - v.d1 < 0.9) { k *= 0.72; }
          if (h0 > 0.66) k *= 1.15;
        } else if (st === 'paper') {
          k *= 0.85 + n * 0.2 + (grain - 0.5) * 0.05;
          if (ly % 13 === 0) { col = BLUEL; k = 0.9; }
          if (lx === 30) { col = REDL; k = 0.9; }
        } else if (st === 'planks') {
          k *= 0.85 + n * 0.25;
          const ph = 13;
          const row = Math.floor(ly / ph);
          const off = (row * 37) % 80;
          const tx = (lx + off) % 80;
          if (ly % ph === 0 || tx === 0) col = GROUT;
          else if (ly % ph === 1) k *= 1.1;
          k *= 0.9 + hash2(Math.floor((lx + off) / 80), row, 3) * 0.15;
          k *= 0.96 + Math.sin((lx + off) * 0.7 + row) * 0.03;
        }
        // Ombre portée des murs (forte en haut, comme dans Isaac)
        const dT = ly;
        const dL = lx;
        const dR = FW - 1 - lx;
        const dB = FH - 1 - ly;
        if (dT < 20) k *= 0.45 + (dT / 20) * 0.55;
        if (dL < 12) k *= 0.62 + (dL / 12) * 0.38;
        if (dR < 12) k *= 0.62 + (dR / 12) * 0.38;
        if (dB < 6) k *= 0.8 + (dB / 6) * 0.2;
        // lumière centrale
        const cd = Math.hypot((x - CX) / FW, (y - CY) / FH);
        k *= 1.12 - cd * 0.45;
        put(x, y, col, k);
      } else {
        put(x, y, [6, 4, 5], 1);
      }
    }
  }
  g.putImageData(img, 0, 0);
  const p = new Pix(g);
  const R = RNG(seed * 13 + 5);
  // Arêtes des coins
  g.globalAlpha = 0.55;
  for (const [ax, ay, bx, by] of [[OX, OY, FX, FY], [OX2 - 1, OY, FX2 - 1, FY], [OX, OY2 - 1, FX, FY2 - 1], [OX2 - 1, OY2 - 1, FX2 - 1, FY2 - 1]]) p.line(ax, ay, bx, by, '#050304', 2);
  g.globalAlpha = 1;
  // Joint noir entre mur et sol
  g.globalAlpha = 0.8;
  p.rect(FX - 1, FY - 1, FW + 2, 1, '#0a0606');
  p.rect(FX - 1, FY, 1, FH, '#0a0606');
  p.rect(FX2, FY, 1, FH, '#0a0606');
  p.rect(FX - 1, FY2, FW + 2, 1, '#0a0606');
  g.globalAlpha = 1;
  floorDetails(p, g, fl, R);
  wallProps(p, g, fl, R);
  SPR[key] = c;
  return c;
}

// Salissures, cailloux, fissures et taches propres à chaque étage.
function floorDetails(p, g, fl, R) {
  const st = fl.style;
  const inFloor = () => [R.int(FX + 10, FX2 - 10), R.int(FY + 16, FY2 - 8)];
  // grandes taches sombres
  for (let i = 0; i < 10; i++) {
    const [x, y] = inFloor();
    g.globalAlpha = R.range(0.06, 0.16);
    p.ell(x, y, R.range(6, 20), R.range(4, 11), st === 'womb' ? '#3a0608' : '#140c08');
  }
  g.globalAlpha = 1;
  if (st === 'basement' || st === 'caves' || st === 'depths') {
    // petits cailloux
    for (let i = 0; i < 26; i++) {
      const [x, y] = inFloor();
      const r = R.range(1, 2.4);
      const base = st === 'depths' ? '#6a6a74' : st === 'caves' ? '#a07a52' : '#8a765e';
      p.ell(x, y + 1, r + 0.5, r * 0.6, 'rgba(0,0,0,0.35)');
      p.ell(x, y, r, r * 0.7, base);
      p.px(x - 1, y - 1, shade(base, 0.35));
    }
    // fissures
    for (let i = 0; i < 5; i++) {
      let [x, y] = inFloor();
      g.globalAlpha = 0.5;
      for (let s = 0; s < R.int(4, 9); s++) {
        const nx = x + R.int(-5, 5);
        const ny = y + R.int(-3, 3);
        p.line(x, y, nx, ny, shade(fl.floor, -0.5));
        x = nx;
        y = ny;
      }
      g.globalAlpha = 1;
    }
  }
  if (st === 'basement') {
    // vieilles taches de sang séchées
    for (let i = 0; i < 3; i++) {
      const [x, y] = inFloor();
      g.globalAlpha = 0.3;
      for (let k = 0; k < 8; k++) p.ell(x + R.range(-8, 8), y + R.range(-4, 4), R.range(1, 4), R.range(1, 3), '#5a1010');
      g.globalAlpha = 1;
    }
  }
  if (st === 'womb') {
    for (let i = 0; i < 18; i++) {
      const [x, y] = inFloor();
      p.ell(x, y, R.range(1.5, 3), R.range(1, 2), 'rgba(255,200,200,0.35)');
    }
  }
}

// Accessoires peints sur les murs (propres à chaque étage).
function wallProps(p, g, fl, R) {
  if (fl.id === 'basement') {
    // Toiles d'araignée dans les coins, une vieille inscription
    for (const [cx, cy, sx, sy] of [[FX, FY, 1, 1], [FX2, FY, -1, 1]]) {
      g.globalAlpha = 0.35;
      for (let i = 0; i < 5; i++) p.line(cx, cy, cx + sx * (6 + i * 5), cy + sy * (26 - i * 5), '#e8e0d0');
      for (let r = 6; r < 26; r += 6) p.line(cx + sx * r, cy, cx, cy + sy * r, '#e8e0d0');
      g.globalAlpha = 1;
    }
    g.globalAlpha = 0.45;
    Font.draw(g, 'ACCÈS INTERDIT', FX + 30, 22, '#1a100a');
    g.globalAlpha = 1;
  } else if (fl.id === 'caves') {
    // racines qui pendent
    for (let i = 0; i < 9; i++) {
      let x = R.int(OX + 20, W - OX - 20);
      let y = R.int(OY + 2, 14);
      g.globalAlpha = 0.6;
      for (let s = 0; s < R.int(3, 7); s++) {
        const ny = y + R.int(2, 5);
        const nx = x + R.int(-1, 1);
        p.line(x, y, nx, ny, '#3a2410');
        x = nx;
        y = ny;
      }
      g.globalAlpha = 1;
    }
  } else if (fl.id === 'depths') {
    // chaînes accrochées au mur
    for (const x of [FX + 50, FX2 - 50]) {
      for (let y = 8; y < FY - 4; y += 4) {
        p.ring(x, y, 2, '#8a8a96');
      }
    }
  } else if (fl.id === 'womb') {
    // veines palpitantes sur les murs
    for (let i = 0; i < 8; i++) {
      let x = R.int(OX + 10, W - OX - 10);
      let y = R.int(OY + 4, 30);
      g.globalAlpha = 0.6;
      for (let s = 0; s < 10; s++) {
        const nx = x + R.int(-4, 4);
        const ny = y + R.int(0, 3);
        p.line(x, y, nx, ny, '#3a0406', 2);
        x = nx;
        y = ny;
      }
      g.globalAlpha = 1;
    }
  } else if (fl.id === 'hub') {
    // Guirlande lumineuse
    let prev = null;
    for (let x = OX + 30; x <= W - OX - 30; x += 4) {
      const y = 12 + Math.round(Math.abs(Math.sin(((x - OX - 30) / (W - 2 * OX - 60)) * Math.PI * 3)) * 8);
      if (prev) p.line(prev[0], prev[1], x, y, '#2a1a10');
      prev = [x, y];
      if ((x / 4) % 5 === 0) {
        const c = ['#ffd060', '#ff7060', '#80e0ff', '#a0ff80'][(x / 20) % 4 | 0];
        p.rect(x - 1, y + 1, 3, 3, c);
        g.globalAlpha = 0.25;
        p.circ(x + 0.5, y + 2.5, 4, c);
        g.globalAlpha = 1;
      }
    }
    // Poster « Accroche-toi » (avec un chat…)
    p.rect(FX + 64, 22, 26, 22, '#e8dcc0');
    p.rect(FX + 66, 24, 22, 14, '#8ab0d0');
    p.circ(FX + 77, 31, 4, '#e0843a');
    p.poly([[FX + 73, 28], [FX + 74, 24], [FX + 76, 27]], '#e0843a');
    p.poly([[FX + 78, 27], [FX + 80, 24], [FX + 81, 28]], '#e0843a');
    Font.draw(g, 'TIENS', FX + 67, 38, '#3a2418');
    // Cadre photo : Claude et Sam, avant
    p.rect(FX2 - 120, 24, 24, 18, '#8a6a3a');
    p.rect(FX2 - 118, 26, 20, 14, '#e8e0d0');
    p.rect(FX2 - 116, 32, 6, 5, '#d97757');
    p.circ(FX2 - 103, 31, 2.5, '#f0c8a4');
    p.rect(FX2 - 105, 34, 5, 5, '#8a8e98');
    g.globalAlpha = 0.6;
    p.line(FX2 - 118, 26, FX2 - 99, 39, '#6a2a1a');
    g.globalAlpha = 1;
  } else if (fl.id === 'core') {
    g.globalAlpha = 0.6;
    Font.draw(g, 'Claude ne sortit jamais. FIN.', OX + 40, 24, '#3a2418');
    g.globalAlpha = 1;
  }
}

// Vignettage global : bords et coins très sombres, comme dans Rebirth.
defSpr('vignette', () => {
  const c = mkCanvas(W, H);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(CX, CY + 6, 80, CX, CY, 290);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.22)');
  grd.addColorStop(0.8, 'rgba(0,0,0,0.55)');
  grd.addColorStop(1, 'rgba(0,0,0,0.85)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  return c;
});

// ---------------------------------------------------------------- Portes
// Arche de pierre façon Isaac, vue « du haut » (ouverture vers le bas), 46 x 36.
// Les autres orientations sont des rotations.
const DOOR_W = 52;
const DOOR_H = 38;

function doorColors(fl, type) {
  let frame = shade(fl.wall, 0.08);
  if (fl.style === 'womb') frame = '#a8403a';
  const c = { frame, dark: shade(frame, -0.45), light: shade(frame, 0.35), wood: '#6a4424', iron: '#3a3a40' };
  if (type === 'treasure') Object.assign(c, { frame: '#d8a830', dark: '#7a5410', light: '#fff0a0', wood: '#b88a30', iron: '#6a4a10' });
  if (type === 'boss') Object.assign(c, { frame: '#7a1c16', dark: '#3a0606', light: '#c05048', wood: '#4a0e0a', iron: '#2a0404' });
  if (type === 'offer') Object.assign(c, { frame: '#2a0a10', dark: '#0a0204', light: '#6a1a28', wood: '#1a0408', iron: '#000000' });
  if (type === 'ally') Object.assign(c, { frame: '#d8e0f0', dark: '#7a88a8', light: '#ffffff', wood: '#8aa0c8', iron: '#5a6a8a' });
  return c;
}

function paintDoor(fl, type, state) {
  const w = DOOR_W;
  const h = DOOR_H;
  const C = doorColors(fl, type);
  if (type === 'secret') {
    // trou éboulé dans le mur
    return paint(w, h, (p) => {
      p.poly([[12, 38], [10, 24], [15, 13], [22, 8], [31, 9], [38, 15], [42, 25], [40, 38]], '#060404');
    }, {
      shade: false,
      outline: shade(fl.wall, -0.4),
      detail: (p) => {
        for (const [x, y] of [[6, 30], [39, 28], [10, 10], [36, 12], [22, 5]]) p.ell(x, y, 2.5, 2, shade(fl.wall, -0.1));
        p.poly([[15, 38], [14, 25], [19, 17], [26, 13], [33, 17], [37, 26], [36, 38]], '#000000');
      },
    });
  }
  // Arche : ouverture = rectangle + voûte en demi-ellipse
  const arch = (p, x0, y0, ww, hh, col) => {
    p.ell(x0 + ww / 2, y0 + ww * 0.36, ww / 2, ww * 0.36, col);
    p.rect(x0, y0 + ww * 0.36, ww, hh - ww * 0.36, col);
  };
  return paint(w, h, (p) => {
    // Piliers + voûte de pierre
    arch(p, 1, 3, 50, 35, C.frame);
    if (type === 'boss') {
      p.poly([[4, 16], [-2, 0], [12, 9]], '#e8dcc8');
      p.poly([[48, 16], [54, 0], [40, 9]], '#e8dcc8');
    }
    if (type === 'offer') {
      p.poly([[6, 14], [0, -2], [14, 7]], '#5a0a14');
      p.poly([[46, 14], [52, -2], [38, 7]], '#5a0a14');
    }
    if (type === 'treasure') p.poly([[20, 5], [26, -1], [32, 5]], C.frame);
  }, {
    shade: { hi: 0.28, lo: 0.3, grad: 0.12 },
    detail: (p) => {
      const cx = 26;
      const cy = 21;
      // Joints des voussoirs et des piliers
      for (const a of [-2.75, -2.3, -1.85, -1.3, -0.85, -0.4]) {
        p.line(cx + Math.cos(a) * 14, cy + Math.sin(a) * 11, cx + Math.cos(a) * 24, cy + Math.sin(a) * 17, C.dark);
      }
      for (const y of [24, 30, 35]) { p.rect(2, y, 9, 1, C.dark); p.rect(41, y, 9, 1, C.dark); }
      p.rect(6, 25, 1, 5, C.dark); p.rect(45, 31, 1, 4, C.dark);
      // Clé de voûte
      p.rr(22, 2, 8, 8, 1, C.light);
      p.rect(23, 8, 6, 1, C.dark);
      // Tunnel sombre qui s'enfonce
      arch(p, 11, 10, 30, 28, '#160c08');
      arch(p, 13, 13, 26, 25, '#0a0504');
      arch(p, 16, 17, 20, 21, '#030202');
      if (state !== 'open') {
        arch(p, 11, 10, 30, 28, C.wood);
        p.rect(25, 12, 2, 26, shade(C.wood, -0.55));
        for (let y = 17; y < 38; y += 5) p.rect(12, y, 28, 1, shade(C.wood, -0.3));
        p.rect(12, 21, 28, 2, C.iron);
        p.rect(12, 32, 28, 2, C.iron);
        for (const x of [14, 22, 29, 37]) { p.px(x, 21, '#a0a0ac'); p.px(x, 32, '#a0a0ac'); }
        p.px(24, 27, '#d8c070'); p.px(28, 27, '#d8c070');
        if (state === 'locked') {
          p.rr(21, 23, 10, 9, 2, '#e8c040');
          p.rect(23, 19, 2, 5, '#b89020');
          p.rect(27, 19, 2, 5, '#b89020');
          p.rect(23, 19, 6, 2, '#b89020');
          p.rect(25, 26, 2, 4, '#3a2a08');
          p.px(22, 24, '#fff4c0');
        }
      } else {
        p.rect(19, 32, 14, 6, 'rgba(255,220,160,0.05)');
      }
      if (type === 'boss') {
        p.rr(21, 0, 10, 9, 3, '#ece2d0');
        p.rect(23, 3, 2, 2, '#1a0404');
        p.rect(27, 3, 2, 2, '#1a0404');
        p.rect(25, 6, 2, 1, '#1a0404');
        for (let i = 0; i < 6; i++) {
          p.poly([[12, 17 + i * 3.5], [15, 18.5 + i * 3.5], [12, 20 + i * 3.5]], '#f0e8d8');
          p.poly([[40, 17 + i * 3.5], [37, 18.5 + i * 3.5], [40, 20 + i * 3.5]], '#f0e8d8');
        }
      }
      if (type === 'treasure') { p.rect(24, 0, 4, 3, '#fff6c0'); p.px(25, 4, '#ffffff'); }
      if (type === 'shop') Font.draw(p.g, '$', 24, 1, '#f0d060');
      if (type === 'offer') { p.rect(23, 3, 6, 5, '#ff2040'); p.px(24, 4, '#ffd0d8'); }
      if (type === 'ally') { p.circ(26, 5, 2.5, '#fff8c0'); p.px(23, 2, '#fff8c0'); p.px(29, 2, '#fff8c0'); }
    },
  });
}

function doorSprite(fl, type, state, dir) {
  const key = 'door_' + fl.id + '_' + type + '_' + state;
  if (!SPR[key]) SPR[key] = paintDoor(fl, type, state);
  const q = { up: 0, right: 1, down: 2, left: 3 }[dir];
  return rotated(SPR[key], q);
}

// ------------------------------------------------------------- Obstacles
const ROCK_COL = {
  basement: '#8a7c6c',
  caves: '#b08050',
  depths: '#7c7c88',
  womb: '#b85050',
};

function paintRock(kind, variant) {
  const s = TILE;
  const R = RNG(variant * 17 + kind.length * 5);
  if (kind === 'books') {
    return paint(s, s + 2, (p) => {
      const cols = ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#7a5a2a', '#5a2a6a'];
      let y = 25;
      for (let i = 0; i < 4; i++) {
        const w = R.int(18, 24);
        const x = R.int(1, 25 - w);
        p.rect(x, y - 5, w, 5, R.pick(cols));
        y -= 5;
      }
    }, { detail: (p) => { for (let y = 7; y < 26; y += 5) p.rect(4, y, 16, 1, '#e8dcc0'); } });
  }
  const base = ROCK_COL[kind] || ROCK_COL.basement;
  return paint(s + 2, s + 2, (p) => {
    // Rocher facetté : plusieurs blocs arrondis qui se chevauchent
    if (variant === 0) {
      p.ell(14, 17, 12.5, 9.5, shade(base, -0.08));
      p.ell(11, 12, 8, 7, base);
      p.ell(18, 13, 7, 6, shade(base, 0.05));
    } else if (variant === 1) {
      p.ell(9, 18, 8, 7, base);
      p.ell(19, 17, 8, 8, shade(base, -0.05));
      p.ell(14, 10, 7, 6, shade(base, 0.06));
    } else {
      p.ell(14, 17, 12.5, 8.5, base);
      p.ell(14, 12, 10, 6, shade(base, 0.08));
    }
    if (kind === 'womb') {
      p.ell(8, 20, 4, 3, shade(base, 0.1));
      p.ell(21, 21, 3, 2.5, shade(base, 0.1));
    }
  }, {
    shade: { hi: 0.32, lo: 0.36, grad: 0.25 },
    detail: (p) => {
      const dk = shade(base, -0.45);
      // arêtes et fissures
      p.line(7, 14, 12, 17, dk);
      p.line(12, 17, 11, 22, dk);
      p.line(17, 11, 20, 16, dk);
      p.line(20, 16, 24, 17, dk);
      p.px(9, 9, shade(base, 0.55));
      p.px(10, 9, shade(base, 0.45));
      p.px(17, 8, shade(base, 0.5));
      if (kind === 'womb') {
        p.line(6, 18, 12, 20, '#5a0a0c');
        p.px(15, 12, '#ffd0d0');
      }
    },
  });
}

// Tas de caca façon Isaac (4 états de dégâts)
function paintPoop(kind, hp) {
  const k = hp / 4;
  const s = TILE;
  if (kind === 'crumple') {
    return paint(s, s, (p) => { p.circ(13, 17, 9 * (0.55 + k * 0.45), '#e8e0c8'); }, {
      detail: (p) => { p.line(8, 14, 18, 20, '#b0a080'); p.line(10, 21, 16, 12, '#b0a080'); },
    });
  }
  const c1 = '#7a4a22';
  return paint(s, s, (p) => {
    const sc = 0.5 + k * 0.5;
    const by = 21;
    p.ell(13, by, 11 * sc, 5 * sc, c1);
    if (k > 0.3) p.ell(13, by - 5 * sc, 8.5 * sc, 4.2 * sc, shade(c1, 0.05));
    if (k > 0.55) p.ell(13, by - 9.5 * sc, 6 * sc, 3.5 * sc, shade(c1, 0.1));
    if (k > 0.8) p.poly([[10, by - 12 * sc], [14, by - 17.5 * sc], [16, by - 11 * sc]], shade(c1, 0.12));
  }, {
    shade: { hi: 0.35, lo: 0.35, grad: 0.2 },
    outline: '#2a1408',
    detail: (p) => {
      const sc = 0.5 + k * 0.5;
      const by = 21;
      // sillons de la spirale
      p.line(4 + (1 - sc) * 8, by - 2 * sc, 20, by - 1, '#4a2a10');
      if (k > 0.3) p.line(7, by - 7 * sc, 18, by - 6 * sc, '#4a2a10');
      if (k > 0.55) p.line(10, by - 11 * sc, 16, by - 10.5 * sc, '#4a2a10');
      p.px(9, by - 4 * sc, '#c8905a');
      if (k > 0.55) p.px(11, by - 10 * sc, '#c8905a');
    },
  });
}

for (const kind of ['basement', 'caves', 'depths', 'womb', 'books']) {
  for (let v = 0; v < 3; v++) defSpr(`rock_${kind}_${v}`, () => paintRock(kind, v));
}
for (const kind of ['poop', 'crumple']) {
  for (let hp = 1; hp <= 4; hp++) defSpr(`poop_${kind}_${hp}`, () => paintPoop(kind, hp));
}

// Rocher marqué (secret) : croix plus claire, comme les rochers teintés d'Isaac
function paintTinted(kind) {
  const base = spr(`rock_${kind}_0`);
  const c = mkCanvas(base.width, base.height);
  const g = c.getContext('2d');
  g.drawImage(base, 0, 0);
  const p = new Pix(g);
  const col = kind === 'books' ? '#60c0ff' : shade(ROCK_COL[kind] || '#8a7c6c', 0.5);
  p.line(9, 11, 19, 20, col, 2);
  p.line(19, 11, 9, 20, col, 2);
  return c;
}
for (const kind of ['basement', 'caves', 'depths', 'womb', 'books']) defSpr(`tinted_${kind}`, () => paintTinted(kind));

// Bloc métallique indestructible
defSpr('block', () => paint(TILE, TILE + 2, (p) => {
  p.rect(1, 2, 24, 24, '#6a6e7a');
}, {
  detail: (p) => {
    p.rect(3, 4, 20, 20, '#585c68');
    for (const [x, y] of [[4, 5], [21, 5], [4, 22], [21, 22]]) p.px(x, y, '#b0b8c8');
    p.line(3, 4, 22, 23, '#44485a');
    p.line(22, 4, 3, 23, '#44485a');
  },
}));

// Feu de camp façon Isaac : bûches croisées (le nom « brazier » est historique)
defSpr('brazier', () => paint(26, 14, (p) => {
  p.rr(1, 5, 24, 6, 3, '#6a3e1c');
  p.rr(3, 2, 20, 6, 3, '#7a4a24');
}, {
  detail: (p) => {
    p.ell(3, 8, 2, 2.5, '#c89060');
    p.ell(23, 8, 2, 2.5, '#c89060');
    p.ell(5, 5, 2, 2.5, '#d8a070');
    p.ell(21, 5, 2, 2.5, '#d8a070');
    p.px(3, 8, '#6a3e1c'); p.px(23, 8, '#6a3e1c');
    p.rect(8, 6, 10, 2, '#2a1408');
    p.px(10, 5, '#ff8030'); p.px(15, 6, '#ffa040');
  },
}));
for (let f = 0; f < 3; f++) {
  for (const blue of [0, 1]) {
    defSpr(`flame${blue ? 'B' : ''}_${f}`, () => paint(18, 24, (p) => {
      const cols = blue ? ['#2a60e0', '#60a0ff', '#d0f0ff'] : ['#e04a1a', '#ffa02a', '#fff0a0'];
      const sway = [0, 1, -1][f];
      p.poly([[1, 23], [3, 12], [6 + sway, 3], [9 + sway, 8], [12 + sway, 0], [16, 12], [17, 23]], cols[0]);
      p.poly([[4, 23], [5, 14], [9 + sway, 6], [13, 14], [14, 23]], cols[1]);
      p.ell(9, 19, 3.5, 4.5, cols[2]);
    }, { shade: false, outline: blue ? '#0a1a4a' : '#5a0a0a' }));
  }
}

// Pics au sol
defSpr('spikes', () => {
  const c = mkCanvas(TILE, TILE);
  const p = new Pix(c.getContext('2d'));
  p.rect(1, 1, 24, 24, '#2a2020');
  p.rect(2, 2, 22, 22, '#3a3030');
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 7;
      const y = 5 + j * 7;
      p.poly([[x, y + 5], [x + 2.5, y - 1], [x + 5, y + 5]], '#c8c8d0');
      p.line(x + 2, y, x + 2, y + 4, '#ffffff');
      p.line(x + 4, y + 2, x + 4, y + 4, '#6a6a78');
    }
  }
  return c;
});

// Trou (bloque la marche, pas les tirs ni les volants)
defSpr('pit', () => {
  const c = mkCanvas(TILE + 2, TILE + 2);
  const p = new Pix(c.getContext('2d'));
  p.rr(0, 0, TILE + 2, TILE + 2, 6, '#1a100c');
  p.rr(2, 3, TILE - 2, TILE - 3, 5, '#070404');
  p.rect(3, 3, TILE - 4, 3, '#2a1a12');
  return c;
});

// Trappe vers l'étage suivant (écoutille de bois ouverte)
defSpr('trapdoor', () => paint(36, 28, (p) => {
  p.rr(1, 2, 34, 25, 6, '#4a2c16');
}, {
  detail: (p) => {
    p.rr(4, 5, 28, 19, 5, '#070404');
    p.rr(7, 9, 22, 14, 4, '#000000');
    for (let x = 6; x < 32; x += 6) p.rect(x, 2, 1, 3, '#2a1808');
    p.rect(8, 11, 20, 1, '#1a100a');
    p.rect(8, 15, 20, 1, '#1a100a');
  },
}));

// Faisceau de lumière (vers le Noyau)
defSpr('beam', () => {
  const c = mkCanvas(40, 200);
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 40, 0);
  grd.addColorStop(0, 'rgba(255,240,200,0)');
  grd.addColorStop(0.5, 'rgba(255,250,230,0.8)');
  grd.addColorStop(1, 'rgba(255,240,200,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 40, 200);
  return c;
});

// Piédestal de pierre (autel des objets)
defSpr('pedestal', () => paint(26, 18, (p) => {
  p.rect(3, 5, 20, 12, '#9a948c');
  p.rr(0, 1, 26, 6, 2, '#b4aea4');
}, {
  detail: (p) => {
    p.rect(3, 7, 20, 1, '#6a6258');
    p.rect(5, 11, 2, 5, '#7a7268');
    p.rect(19, 11, 2, 5, '#7a7268');
    p.rect(9, 12, 8, 1, '#7a7268');
  },
}));
defSpr('pedestalOffer', () => paint(26, 18, (p) => {
  p.rect(3, 5, 20, 12, '#3a1020');
  p.rr(0, 1, 26, 6, 2, '#5a1830');
}, { detail: (p) => { p.rect(10, 9, 6, 5, '#ff3050'); } }));
