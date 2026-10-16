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
  const ts = {
    top: (FY - y) / (FY - OY),
    bottom: (y - FY2 + 1) / (OY2 - FY2),
    left: (FX - x) / (FX - OX),
    right: (x - FX2 + 1) / (OX2 - FX2),
  };
  let side = 'top';
  let m = -1;
  let m2 = -1;
  for (const k of ['bottom', 'left', 'right', 'top']) {
    const v = ts[k];
    if (v >= m) { m2 = m; m = v; side = k; } else if (v > m2) m2 = v;
  }
  return { side, depth: m, second: m2 };
}

// Coordonnées de texture en perspective : chaque pan de mur est un trapèze,
// U court le long du mur, V s'enfonce vers l'extérieur (0 = contre le sol).
function wallUV(x, y, side, t) {
  if (side === 'top' || side === 'bottom') {
    const xl = lerp(FX, OX, t);
    const xr = lerp(FX2, OX2, t);
    const sx = (x - xl) / (xr - xl);
    return [sx * 380 + (side === 'bottom' ? 1000 : 0), t * (side === 'top' ? 50 : 30)];
  }
  const yt = lerp(FY, OY, t);
  const yb = lerp(FY2, OY2, t);
  const sy = (y - yt) / (yb - yt);
  return [sy * 230 + (side === 'left' ? 500 : 1500), t * 62];
}

// Texel de mur selon le style de l'étage : renvoie [couleur, luminosité]
function wallTexel(U, V, st, seed, C) {
  if (st === 'basement' || st === 'caves') {
    const size = st === 'caves' ? 12 : 18;
    const vv = V * 1.3;
    const w = worley(U, vv, size, seed);
    const edge = w.d2 - w.d1;
    const crack = clamp(edge / 2.6, 0, 1);
    const ou = (U - w.fx) / size;
    const ov = (vv - w.fy) / size;
    const dome = 1 - Math.min(1, (w.d1 / size) * (w.d1 / size)) * 0.3;
    const bevel = 1 - ov * 0.32 - ou * 0.08;
    const grain = fbm(U * 0.22, V * 0.22, seed + 4, 3);
    let k = (0.82 + w.id * 0.24) * (0.62 + 0.38 * Math.pow(crack, 0.6)) * bevel * dome * (0.82 + grain * 0.34);
    let col = C.WALL;
    if (crack < 0.18) col = C.GROUT;
    // taches d'humidité / mousse
    if (st === 'caves' && fbm(U * 0.05, V * 0.08, seed + 9, 2) > 0.68) col = C.MOSS;
    return [col, k];
  }
  if (st === 'depths') {
    const bh = 9;
    const bw = 21;
    const row = Math.floor(V / bh);
    const off = row % 2 ? bw / 2 : 0;
    const bx = (U + off) % bw;
    const by = V % bh;
    const id = hash2(Math.floor((U + off) / bw), row, seed);
    if (by < 1 || bx < 1.1) return [C.GROUT, 0.6];
    let k = 0.84 + id * 0.24;
    if (by < 2.2 || bx < 2.2) k *= 1.16;
    if (by > bh - 1.6 || bx > bw - 1.4) k *= 0.74;
    k *= 0.86 + fbm(U * 0.25, V * 0.25, seed + 2, 3) * 0.28;
    if (hash2(Math.floor(U * 0.7), Math.floor(V * 0.7), seed + 5) > 0.985) k *= 0.6;
    return [C.WALL, k];
  }
  if (st === 'womb') {
    const h0 = fbm(U * 0.07, V * 0.1, seed + 20, 3);
    const hv = fbm(U * 0.07, (V + 1) * 0.1, seed + 20, 3);
    let k = 0.8 + (h0 - hv) * 6 + h0 * 0.3;
    const v = worley(U, V, 22, seed + 30);
    if (v.d2 - v.d1 < 1.1) return [C.VEIN, 0.85];
    if (h0 > 0.64) k *= 1.18;
    return [C.WALL, k];
  }
  if (st === 'planks') {
    const row = Math.floor(V / 7);
    const off = (row * 37) % 60;
    const bx = (U + off) % 60;
    if (V % 7 < 0.8 || bx < 1) return [C.GROUT, 0.8];
    let k = 0.88 + hash2(Math.floor((U + off) / 60), row, 3) * 0.2;
    k *= 0.94 + Math.sin(U * 0.6 + row) * 0.04 + fbm(U * 0.3, V * 0.6, seed, 2) * 0.1;
    if (V % 7 < 1.8) k *= 1.1;
    return [C.WALL, k];
  }
  // papier (le Noyau)
  const word = hash2(Math.floor(U / 5), Math.floor(V / 5), seed) > 0.25;
  if (Math.floor(V) % 5 === 2 && word && Math.floor(U) % 5 !== 0) return [C.INKC, 0.9];
  return [C.WALL, 0.95 + hash2(Math.floor(U), Math.floor(V), seed) * 0.06];
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
  const WC = { WALL, GROUT, VEIN, INKC, MOSS: rgb(mix(fl.wall, '#3a5a2a', 0.45)) };
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
        const t = wi.depth;
        const [U, V] = wallUV(x, y, wi.side, t);
        const tx = wallTexel(U, V, st, seed + 5, WC);
        const col = tx[0];
        let k = tx[1];
        // Lumière : vive près du sol, s'éteint vers l'extérieur
        k *= 1.12 - Math.pow(t, 1.15) * 0.88;
        if (wi.side === 'top') k *= 1.04;
        if (wi.side === 'bottom') k *= 0.7;
        if (wi.side === 'left' || wi.side === 'right') k *= 0.86;
        // Pli au pied du mur et rebord éclairé, comme dans Rebirth
        if (t < 0.025) k *= 0.5;
        else if (t < 0.075) k *= 1.16;
        // Angles de la pièce assombris
        const diff = t - wi.second;
        if (diff < 0.04) k *= 0.5 + (diff / 0.04) * 0.5;
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
          if (v.d2 - v.d1 < 0.8) { k *= 0.86; }
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
// Arche de voussoirs encastrée dans le mur, vue « du haut » (ouverture vers le bas).
// Les autres orientations sont des rotations. Peinte pixel par pixel.
const DOOR_W = 56;
const DOOR_H = 48;

function doorStyle(fl, type) {
  let frame = shade(fl.wall, 0.12);
  if (fl.style === 'womb') frame = '#b04a42';
  if (fl.style === 'paper') frame = '#e8dcc0';
  const S = { frame, wood: '#6e4626', band: '#3a3a42', rivet: '#a8a8b4', glow: null, teeth: false, horns: null, key: 'stone' };
  if (type === 'treasure') Object.assign(S, { frame: '#d8a830', wood: '#9a6a24', band: '#e8c040', rivet: '#fff4c0', key: 'gem' });
  if (type === 'boss') Object.assign(S, { frame: '#7a1e18', wood: '#3e0c08', band: '#d8ccb4', rivet: '#f4ecd8', teeth: true, horns: '#e8dcc8', key: 'skull' });
  if (type === 'offer') Object.assign(S, { frame: '#2a0c10', wood: '#1a0406', band: '#5a0a14', rivet: '#ff3050', horns: '#5a0a14', glow: '#ff2040', key: 'eye' });
  if (type === 'ally') Object.assign(S, { frame: '#dfe3ee', wood: '#8ea4cc', band: '#f4f6ff', rivet: '#ffffff', glow: '#fff8d0', key: 'halo' });
  if (type === 'shop') S.key = 'coin';
  return S;
}

function paintDoor(fl, type, state) {
  const w = DOOR_W;
  const h = DOOR_H;
  const cx = 28;
  const c = mkCanvas(w, h);
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const D = img.data;
  const set = (x, y, col, k = 1, a = 255) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = (y * w + x) * 4;
    D[i] = clamp(col[0] * k, 0, 255);
    D[i + 1] = clamp(col[1] * k, 0, 255);
    D[i + 2] = clamp(col[2] * k, 0, 255);
    D[i + 3] = a;
  };
  const S = doorStyle(fl, type);
  const FR = rgb(S.frame);
  const WOOD = rgb(S.wood);
  const BAND = rgb(S.band);
  const BLK = [6, 3, 3];
  // Formes : arche extérieure (centre 28,25 ; 26 x 23) et ouverture (centre 28,27 ; 14 x 15)
  const OYC = 25;
  const IYC = 27;
  const inOuter = (x, y) => (y >= OYC ? x >= 2 && x <= 53 : Math.hypot((x + 0.5 - cx) / 26, (y + 0.5 - OYC) / 23) <= 1);
  const inInner = (x, y) => (y >= IYC ? x >= 14 && x <= 41 : Math.hypot((x + 0.5 - cx) / 14, (y + 0.5 - IYC) / 15) <= 1);

  if (type === 'secret') {
    // trou éboulé : contour irrégulier, gravats, fissures
    const R = RNG(77);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = Math.atan2(y - 32, x - cx);
        const r = 15 + Math.sin(a * 5 + 1) * 2.5 + Math.sin(a * 9) * 1.5;
        const d = Math.hypot((x - cx) * 0.95, (y - 32) * 1.15);
        if (y > 44 && Math.abs(x - cx) < 15) { set(x, y, BLK, 1); continue; }
        if (d < r) {
          const f = d / r;
          set(x, y, rgb(shade(fl.wall, -0.5)), 0.08 + f * f * 0.5);
        } else if (d < r + 3.5) {
          set(x, y, rgb(fl.wall), 0.7 + hash2(x, y, 3) * 0.4);
        }
      }
    }
    g.putImageData(img, 0, 0);
    const p = new Pix(g);
    for (let i = 0; i < 7; i++) {
      const a = R.range(-3.0, -0.1);
      const r0 = 17;
      p.line(cx + Math.cos(a) * r0, 32 + Math.sin(a) * r0, cx + Math.cos(a) * (r0 + R.range(4, 9)), 32 + Math.sin(a) * (r0 + R.range(4, 9)), shade(fl.wall, -0.55));
    }
    for (let i = 0; i < 6; i++) p.ell(R.range(8, 48), R.range(38, 46), R.range(1.5, 3), R.range(1, 2), shade(fl.wall, R.range(-0.1, 0.2)));
    return outlinePass(c, '#0a0606');
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const out = inOuter(x, y);
      const inn = inInner(x, y);
      if (!out) continue;
      if (!inn) {
        // ---- Cadre : voussoirs dans l'arche, blocs sur les piliers
        let k = 1;
        let id = 0;
        let mortar = false;
        if (y < OYC + 1) {
          const a = Math.atan2(y + 0.5 - IYC, x + 0.5 - cx);
          const u = (a + Math.PI) / Math.PI;
          const nseg = 7;
          const seg = Math.floor(u * nseg);
          const loc = u * nseg - seg;
          const r = Math.hypot(x + 0.5 - cx, y + 0.5 - IYC);
          const thick = 1.1 / Math.max(6, r) * nseg / Math.PI * 2.2;
          if (loc < thick || loc > 1 - thick) mortar = true;
          id = hash2(seg, 1, 9);
          if (seg === 3) k *= 1.12;
          // bord intérieur éclairé, bord extérieur plus sombre
          const rn = (r - 14) / 12;
          k *= 1.12 - rn * 0.25;
          if (loc < 0.28) k *= 1.08;
        } else {
          const left = x < cx;
          const row = Math.floor((y - OYC) / 7.5);
          const ly = (y - OYC) - row * 7.5;
          if (ly < 1) mortar = true;
          id = hash2(row, left ? 1 : 2, 11);
          if (ly < 2.2) k *= 1.12;
          if (ly > 6.2) k *= 0.82;
          const edgeIn = left ? 13 - x : x - 42;
          if (edgeIn < 2) k *= 1.15;
          k *= left ? 1.04 : 0.9;
        }
        k *= 0.84 + id * 0.24;
        k *= 0.86 + fbm(x * 0.3, y * 0.3, 5, 2) * 0.28;
        k *= 1.08 - (y / h) * 0.25;
        if (mortar) set(x, y, FR, 0.45);
        else set(x, y, FR, k);
      } else if (state === 'open') {
        // ---- Couloir en perspective qui s'enfonce dans le noir
        const dx = (x + 0.5 - cx) / 14;
        const dy = (y + 0.5 - IYC) / 15;
        const F = y < IYC ? Math.hypot(dx, dy) : Math.abs(dx);
        let k = 0.05 + Math.pow(F, 2.4) * 0.5;
        let col = rgb(shade(fl.wall, -0.3));
        // sol du couloir
        if (y > 38) {
          col = rgb(shade(fl.floor, -0.2));
          k = 0.18 + ((y - 38) / 10) * 0.45 - Math.abs(dx) * 0.1;
        }
        if (S.glow) { col = rgb(S.glow); k = 0.12 + (1 - F) * 0.35; }
        // anneaux de profondeur (joints du couloir)
        if (y < 38 && Math.abs(F - 0.62) < 0.05) k *= 0.6;
        set(x, y, col, k);
      } else {
        // ---- Battants de bois cerclés de fer
        const lx = x - 14;
        const plank = Math.floor(lx / 4.67);
        const pl = lx - plank * 4.67;
        let k = 0.82 + hash2(plank, 3, 4) * 0.22;
        k *= 0.88 + fbm(x * 0.6, y * 0.12, plank + 3, 2) * 0.24;
        if (pl < 0.8) k *= 0.55;
        else if (pl < 1.8) k *= 1.12;
        let col = WOOD;
        if (x === 27 || x === 28) { col = BLK; k = 1; }
        if (x === 29) k *= 1.2;
        const band = (y >= 20 && y < 23) || (y >= 37 && y < 40);
        if (band) { col = BAND; k = y === 20 || y === 37 ? 1.25 : 0.9; }
        // ombre sous la voûte
        const dx = (x + 0.5 - cx) / 14;
        const dy = (y + 0.5 - IYC) / 15;
        if (y < IYC && Math.hypot(dx, dy) > 0.82) k *= 0.6;
        set(x, y, col, k);
      }
    }
  }
  // Seuil sombre sous l'ouverture
  for (let x = 14; x <= 41; x++) { set(x, h - 1, BLK, 1); }
  g.putImageData(img, 0, 0);
  const p = new Pix(g);
  if (state !== 'open') {
    for (const x of [16, 22, 33, 39]) { p.px(x, 21, S.rivet); p.px(x, 38, S.rivet); }
    // anneaux de tirage
    p.ring(25.5, 30.5, 2, S.band);
    p.ring(31.5, 30.5, 2, S.band);
    if (state === 'locked') {
      p.rr(23, 26, 11, 10, 2, '#e8c040');
      p.rect(24, 27, 9, 2, '#fff0a0');
      p.rect(25, 21, 2, 6, '#b89020');
      p.rect(30, 21, 2, 6, '#b89020');
      p.rect(25, 21, 7, 2, '#b89020');
      p.rect(27, 30, 3, 2, '#3a2a08');
      p.rect(28, 32, 1, 2, '#3a2a08');
    }
  }
  // Clé de voûte
  if (S.key === 'skull') {
    p.rr(22, 0, 12, 10, 4, '#ece2d0');
    p.rect(24, 3, 3, 3, '#1a0404');
    p.rect(29, 3, 3, 3, '#1a0404');
    p.rect(27, 7, 2, 1, '#1a0404');
    p.rect(24, 9, 8, 2, '#d8ccb4');
    for (let x = 25; x < 32; x += 2) p.px(x, 10, '#1a0404');
  } else if (S.key === 'gem') {
    p.poly([[28, 0], [33, 5], [28, 10], [23, 5]], '#fff0a0');
    p.poly([[28, 2], [31, 5], [28, 8], [25, 5]], '#e04040');
    p.px(27, 3, '#ffffff');
  } else if (S.key === 'eye') {
    p.ell(28, 5, 5, 3.5, '#ff3050');
    p.ell(28, 5, 2, 3, '#1a0004');
  } else if (S.key === 'halo') {
    p.ring(28, 3, 5, '#fff4b0', 2);
  } else if (S.key === 'coin') {
    p.circ(28, 5, 4.5, '#e0b030');
    Font.draw(g, '$', 26, 2, '#7a5010');
  } else {
    p.rr(23, 1, 10, 9, 1, shade(S.frame, 0.25));
    p.rect(24, 8, 8, 1, shade(S.frame, -0.3));
  }
  if (S.horns) {
    p.poly([[5, 18], [-1, 0], [13, 9]], S.horns);
    p.poly([[51, 18], [57, 0], [43, 9]], S.horns);
    p.line(4, 14, 3, 6, shade(S.horns, 0.3));
    p.line(52, 14, 53, 6, shade(S.horns, 0.3));
  }
  if (S.teeth) {
    for (let i = 0; i < 6; i++) {
      p.poly([[14, 24 + i * 4], [18, 25.5 + i * 4], [14, 27 + i * 4]], '#f4ecd8');
      p.poly([[42, 24 + i * 4], [38, 25.5 + i * 4], [42, 27 + i * 4]], '#f4ecd8');
    }
    for (let i = 0; i < 5; i++) {
      const a = -2.6 + i * 0.5;
      p.poly([[28 + Math.cos(a) * 14, 27 + Math.sin(a) * 15], [28 + Math.cos(a) * 10, 27 + Math.sin(a) * 11], [28 + Math.cos(a + 0.25) * 14, 27 + Math.sin(a + 0.25) * 15]], '#f4ecd8');
    }
  }
  if (type === 'treasure') {
    p.px(8, 22, '#ffffff'); p.px(9, 21, '#fff6c0'); p.px(46, 30, '#fff6c0');
  }
  return outlinePass(c, '#0a0606');
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
