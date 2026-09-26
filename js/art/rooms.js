// Décors des salles : murs en perspective, sols texturés, ombres portées et vignettage
// façon Rebirth. Tout est généré à la volée et mis en cache par étage.

const OX = 12;
const OY = 4;
const OX2 = W - 12;
const OY2 = H - 4;

// Région et coordonnées de motif d'un pixel de mur.
function wallInfo(x, y) {
  if (x >= FX && x < FX2 && y >= FY && y < FY2) return null;
  if (x < OX || x >= OX2 || y < OY || y >= OY2) return null;
  // Distance normalisée vers le sol pour choisir le pan de mur.
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
  const seed = variant * 101 + fl.id.length * 7;
  const WALL = rgb(fl.wall);
  const FLOOR = rgb(fl.floor);
  const GROUT = rgb(fl.grout);
  const ACC = rgb(fl.accent);
  const PUD = rgb(mix(fl.floor, '#5a7a90', 0.4));
  const INKC = rgb('#4a3a2a');
  const BLUEL = rgb('#8aa0c0');
  const REDL = rgb('#c06060');
  const put = (x, y, col, k) => {
    const i = (y * W + x) * 4;
    D[i] = clamp(col[0] * k, 0, 255);
    D[i + 1] = clamp(col[1] * k, 0, 255);
    D[i + 2] = clamp(col[2] * k, 0, 255);
    D[i + 3] = 255;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const wi = wallInfo(x, y);
      if (wi) {
        // --- Mur
        const side = wi.side;
        const horiz = side === 'top' || side === 'bottom';
        const u = horiz ? x : y;
        const v = horiz ? y : x;
        let k = 1;
        let col = WALL;
        const n = fbm(x * 0.06, y * 0.06, seed + 3, 3);
        k *= 0.82 + n * 0.3;
        k *= 0.95 + hash2(x, y, seed) * 0.08;
        // Motif selon le style
        if (fl.style === 'bricks' || fl.style === 'flags' || fl.style === 'planks') {
          const bh = fl.style === 'planks' ? 9 : 8;
          const bw = fl.style === 'planks' ? 60 : fl.style === 'flags' ? 26 : 18;
          const row = Math.floor(v / bh);
          const off = row % 2 ? bw / 2 : 0;
          const bx = (u + off + row * 7) % bw;
          const by = v % bh;
          if (by === 0 || bx < 1) { col = GROUT; k *= 1.05; } else if (by === 1 || bx < 2) k *= 1.1;
          const blockN = hash2(Math.floor((u + off + row * 7) / bw), row, seed);
          k *= 0.9 + blockN * 0.2;
        } else if (fl.style === 'circuit') {
          const bx = u % 24;
          const by = v % 16;
          if (bx === 0 || by === 0) col = GROUT;
          if ((bx === 12 && by > 3 && by < 13) || (by === 8 && bx > 4 && bx < 20 && hash2(Math.floor(u / 24), Math.floor(v / 16), 5) > 0.5)) {
            col = ACC; k = 0.55 + 0.25 * hash2(Math.floor(u / 24), Math.floor(v / 16), 9);
          }
        } else if (fl.style === 'panels') {
          const bx = u % 30;
          const by = v % 20;
          if (bx === 0 || by === 0) { col = GROUT; }
          else if (bx === 1 || by === 1) k *= 1.12;
          if ((bx === 4 || bx === 26) && (by === 4 || by === 16)) { col = GROUT; }
          // câbles rouges « organiques »
          const cab = Math.sin(u * 0.08 + Math.floor(v / 20) * 2) * 3 + (v % 20) - 10;
          if (Math.abs(cab) < 1.1 && hash2(Math.floor(u / 30), Math.floor(v / 20), 3) > 0.45) { col = ACC; k = 0.8 + Math.abs(cab) * -0.1; }
        } else if (fl.style === 'paper') {
          // Pages couvertes de lignes d'écriture
          const lineY = v % 7;
          const word = hash2(Math.floor(u / 5), Math.floor(v / 7), seed) > 0.25;
          if (lineY === 3 && word && (u % 5) !== 0) { col = INKC; k = 0.9; }
          if (v % 42 === 0) { col = GROUT; }
        }
        // Lumière : plus clair près du sol, plus sombre vers l'extérieur
        k *= 1.15 - wi.depth * 0.75;
        if (side === 'top') k *= 1.08;
        if (side === 'bottom') k *= 0.78;
        if (side === 'left' || side === 'right') k *= 0.92;
        put(x, y, col, k);
      } else if (x >= FX && x < FX2 && y >= FY && y < FY2) {
        // --- Sol
        const lx = x - FX;
        const ly = y - FY;
        let col = FLOOR;
        let k = 1;
        const n = fbm(x * 0.045, y * 0.045, seed + 11, 4);
        k *= 0.8 + n * 0.36;
        k *= 0.96 + hash2(x, y, seed + 1) * 0.07;
        if (fl.style === 'flags') {
          // Grandes dalles irrégulières
          const tw = 52;
          const th = 36;
          const row = Math.floor(ly / th);
          const off = row % 2 ? tw / 2 : 0;
          const tx = (lx + off) % tw;
          const ty = ly % th;
          if (tx === 0 || ty === 0) { col = GROUT; k *= 1.1; }
          else if (tx === 1 || ty === 1) k *= 1.08;
          k *= 0.92 + hash2(Math.floor((lx + off) / tw), row, seed + 4) * 0.14;
        } else if (fl.style === 'bricks') {
          const tw = 26;
          const tx = lx % tw;
          const ty = ly % tw;
          if (tx === 0 || ty === 0) col = GROUT;
          k *= 0.9 + hash2(Math.floor(lx / tw), Math.floor(ly / tw), seed + 2) * 0.16;
          // flaques
          const pn = fbm(x * 0.03, y * 0.05, seed + 40, 2);
          if (pn > 0.68) { col = PUD; k *= 1.05; }
        } else if (fl.style === 'circuit') {
          const tw = 26;
          const tx = lx % tw;
          const ty = ly % tw;
          if (tx === 0 || ty === 0) col = GROUT;
          const cell = hash2(Math.floor(lx / tw), Math.floor(ly / tw), seed + 7);
          if (cell > 0.72 && ((tx === 13 && ty > 4 && ty < 22) || (ty === 13 && tx > 4 && tx < 22))) { col = ACC; k = 0.45; }
          if (cell > 0.72 && tx === 13 && ty === 13) { col = ACC; k = 0.9; }
        } else if (fl.style === 'panels') {
          const tw = 26;
          const tx = lx % tw;
          const ty = ly % tw;
          if (tx === 0 || ty === 0) col = GROUT;
          else if (tx === 1 || ty === 1) k *= 1.08;
          if ((tx === 4 || tx === 22) && (ty === 4 || ty === 22)) col = GROUT;
          const vein = fbm(x * 0.05, y * 0.05, seed + 60, 3);
          if (Math.abs(vein - 0.5) < 0.006) { col = ACC; k = 0.6; }
        } else if (fl.style === 'paper') {
          if (ly % 13 === 0) { col = BLUEL; k = 0.9; }
          if (lx === 30) { col = REDL; k = 0.9; }
        } else if (fl.style === 'planks') {
          const ph = 13;
          const row = Math.floor(ly / ph);
          const off = (row * 37) % 80;
          const tx = (lx + off) % 80;
          if (ly % ph === 0 || tx === 0) { col = GROUT; }
          else if (ly % ph === 1) k *= 1.1;
          k *= 0.9 + hash2(Math.floor((lx + off) / 80), row, 3) * 0.15;
          k *= 0.96 + Math.sin((lx + off) * 0.7 + row) * 0.03;
        }
        // Ombre portée des murs (occlusion)
        const dTop = ly;
        const dL = lx;
        const dR = FW - 1 - lx;
        const dB = FH - 1 - ly;
        if (dTop < 14) k *= 0.55 + (dTop / 14) * 0.45;
        if (dL < 9) k *= 0.7 + (dL / 9) * 0.3;
        if (dR < 9) k *= 0.7 + (dR / 9) * 0.3;
        if (dB < 5) k *= 0.8 + (dB / 5) * 0.2;
        put(x, y, col, k);
      } else {
        put(x, y, [8, 5, 6], 1);
      }
    }
  }
  g.putImageData(img, 0, 0);
  const p = new Pix(g);
  const R = RNG(seed * 13 + 5);
  // Arêtes des coins (diagonales) et plinthe
  for (const [ax, ay, bx, by] of [[OX, OY, FX, FY], [OX2 - 1, OY, FX2 - 1, FY], [OX, OY2 - 1, FX, FY2 - 1], [OX2 - 1, OY2 - 1, FX2 - 1, FY2 - 1]]) {
    g.globalAlpha = 0.5;
    p.line(ax, ay, bx, by, '#0a0608', 2);
    g.globalAlpha = 1;
  }
  g.globalAlpha = 0.7;
  p.rect(FX - 1, FY - 2, FW + 2, 2, shade(fl.wall, -0.5));
  p.rect(FX - 2, FY, 2, FH, shade(fl.wall, -0.45));
  p.rect(FX2, FY, 2, FH, shade(fl.wall, -0.45));
  p.rect(FX - 1, FY2, FW + 2, 2, shade(fl.wall, -0.3));
  g.globalAlpha = 1;
  // Salissures et fissures au sol
  const nst = fl.id === 'core' ? 6 : 14;
  for (let i = 0; i < nst; i++) {
    const x = R.int(FX + 10, FX2 - 10);
    const y = R.int(FY + 10, FY2 - 10);
    g.globalAlpha = R.range(0.08, 0.2);
    p.ell(x, y, R.range(4, 16), R.range(3, 9), fl.id === 'darkweb' ? '#000000' : '#1a100a');
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {
    let x = R.int(FX + 8, FX2 - 8);
    let y = R.int(FY + 8, FY2 - 8);
    g.globalAlpha = 0.45;
    for (let s = 0; s < R.int(4, 9); s++) {
      const nx = x + R.int(-4, 4);
      const ny = y + R.int(-3, 3);
      p.line(x, y, nx, ny, shade(fl.floor, -0.45));
      x = nx; y = ny;
    }
    g.globalAlpha = 1;
  }
  // Détails muraux : taches, câbles, fissures
  for (let i = 0; i < 10; i++) {
    const side = R.pick(['top', 'left', 'right', 'bottom']);
    let x;
    let y;
    if (side === 'top') { x = R.int(FX, FX2); y = R.int(OY + 6, FY - 6); }
    else if (side === 'bottom') { x = R.int(FX, FX2); y = R.int(FY2 + 4, OY2 - 6); }
    else if (side === 'left') { x = R.int(OX + 6, FX - 6); y = R.int(FY, FY2); }
    else { x = R.int(FX2 + 4, OX2 - 6); y = R.int(FY, FY2); }
    g.globalAlpha = 0.3;
    p.ell(x, y, R.range(3, 8), R.range(2, 6), '#0a0608');
    g.globalAlpha = 1;
  }
  wallProps(p, g, fl, R);
  SPR[key] = c;
  return c;
}

// Accessoires peints sur les murs (propres à chaque étage).
function wallProps(p, g, fl, R) {
  if (fl.id === 'basement') {
    // Chemin de câbles et tuyaux sur le mur du haut
    p.rect(OX + 30, 14, W - 2 * OX - 60, 3, '#3a3a40');
    p.rect(OX + 30, 14, W - 2 * OX - 60, 1, '#6a6a72');
    for (let x = OX + 40; x < W - OX - 40; x += 46) p.rect(x, 12, 3, 7, '#2a2a30');
    g.globalAlpha = 0.8;
    p.rect(FX + 20, 30, 40, 2, '#c07a40');
    Font.draw(g, 'ACCÈS INTERDIT', FX + 70, 24, '#2a1c14');
    g.globalAlpha = 1;
  } else if (fl.id === 'legacy') {
    for (let i = 0; i < 12; i++) {
      const x = R.int(OX + 10, W - OX - 10);
      g.globalAlpha = 0.35;
      p.rect(x, R.int(OY + 4, 20), 1, R.int(8, 26), '#1a3a14');
      g.globalAlpha = 1;
    }
    g.globalAlpha = 0.5;
    Font.draw(g, 'IDENTIFICATION DIVISION.', FX + 12, 22, '#1a2a14');
    Font.draw(g, 'PROCEDURE DIVISION.', FX2 - 12, 35, '#1a2a14', { align: 'right' });
    g.globalAlpha = 1;
  } else if (fl.id === 'darkweb') {
    for (let i = 0; i < 20; i++) {
      const x = R.int(OX + 4, W - OX - 4);
      const y = R.int(OY + 4, OY2 - 4);
      if (wallInfo(x, y)) {
        g.globalAlpha = 0.5;
        p.rect(x, y, R.int(2, 10), 1, R.pick(['#ff40c0', '#40e0ff', '#b040ff']));
        g.globalAlpha = 1;
      }
    }
    g.globalAlpha = 0.55;
    Font.draw(g, '404', FX + 20, 22, '#ff40c0');
    Font.draw(g, 'NE CLIQUEZ PAS', FX2 - 20, 30, '#40e0ff', { align: 'right' });
    g.globalAlpha = 1;
  } else if (fl.id === 'datacenter') {
    for (let x = FX + 10; x < FX2 - 10; x += 22) {
      p.rect(x, 18, 3, 3, R() > 0.3 ? '#40ff60' : '#ff4040');
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

// Vignettage global (assombrit les bords de l'écran).
defSpr('vignette', () => {
  const c = mkCanvas(W, H);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(CX, CY, 90, CX, CY, 300);
  grd.addColorStop(0, 'rgba(0,0,0,0)');
  grd.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  grd.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
  return c;
});

// ---------------------------------------------------------------- Portes
// Porte « du haut » (ouverture vers le bas), 38 x 32, les autres sont des rotations.
function paintDoor(fl, type, state) {
  const w = 38;
  const h = 32;
  let frame = shade(fl.wall, 0.12);
  let frameDk = shade(fl.wall, -0.2);
  if (type === 'treasure') { frame = '#e0b030'; frameDk = '#9a7018'; }
  if (type === 'boss') { frame = '#8a2a22'; frameDk = '#4a1010'; }
  if (type === 'shop') { frame = '#7a6a5a'; frameDk = '#4a3a2a'; }
  if (type === 'offer') { frame = '#3a1020'; frameDk = '#1a0610'; }
  if (type === 'ally') { frame = '#4a7ab0'; frameDk = '#2a4a70'; }
  if (type === 'secret') {
    return paint(w, h, (p) => {
      p.poly([[8, 32], [6, 18], [12, 8], [19, 4], [27, 9], [32, 17], [30, 32]], '#0a0606');
    }, { shade: false, outline: shade(fl.wall, -0.35) });
  }
  return paint(w, h, (p) => {
    // Arche
    p.rr(1, 2, 36, 30, 10, frame);
    if (type === 'boss') {
      // Cornes / dents
      p.poly([[2, 10], [-1, 0], [8, 6]], '#d8d0c0');
      p.poly([[36, 10], [39, 0], [30, 6]], '#d8d0c0');
    }
    if (type === 'offer') {
      p.poly([[4, 8], [0, -2], [10, 4]], '#6a1020');
      p.poly([[34, 8], [38, -2], [28, 4]], '#6a1020');
    }
  }, {
    shade: { hi: 0.25, lo: 0.3, grad: 0.1 },
    detail: (p) => {
      // Pierres de l'arche
      for (let i = 0; i < 5; i++) p.rect(3 + i * 7, 5, 1, 3, frameDk);
      // Ouverture sombre
      p.rr(9, 9, 20, 24, 7, '#050304');
      if (state === 'open') {
        p.rr(11, 13, 16, 20, 5, '#0e0808');
      } else {
        const wood = type === 'treasure' ? '#c89a30' : type === 'boss' ? '#5a1a14' : type === 'ally' ? '#3a5a8a' : type === 'offer' ? '#2a0a14' : '#6a4428';
        p.rr(9, 9, 20, 24, 7, wood);
        p.rect(18, 9, 2, 24, shade(wood, -0.45));
        for (let y = 14; y < 32; y += 5) {
          p.rect(10, y, 18, 1, shade(wood, -0.25));
        }
        if (state === 'locked') {
          p.rr(15, 18, 8, 7, 1, '#e0c040');
          p.rect(17, 15, 1, 4, '#c0a030');
          p.rect(20, 15, 1, 4, '#c0a030');
          p.rect(17, 15, 4, 1, '#c0a030');
          p.rect(18, 20, 2, 3, '#3a2a10');
        }
      }
      if (type === 'treasure') { p.px(19, 3, '#fff6c0'); p.rect(17, 3, 5, 2, '#fff0a0'); }
      if (type === 'boss') {
        // Petit crâne au sommet
        p.rr(15, 1, 8, 6, 2, '#e8e0d0');
        p.rect(16, 3, 2, 2, '#1a0a0a');
        p.rect(20, 3, 2, 2, '#1a0a0a');
      }
      if (type === 'ally') {
        p.circ(19, 4.5, 2, '#f0f0ff');
        p.px(16, 2, '#f0f0ff'); p.px(22, 2, '#f0f0ff'); p.px(18, 1, '#f0f0ff'); p.px(20, 1, '#f0f0ff');
      }
      if (type === 'shop') {
        Font.draw(p.g, '$', 17, 1, '#f0d060');
      }
      if (type === 'offer') {
        p.rect(17, 2, 4, 4, '#ff3050');
        p.px(18, 3, '#ffd0d8');
      }
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
function paintRock(kind, variant) {
  const R = RNG(variant * 17 + kind.length);
  const s = TILE;
  if (kind === 'box') {
    return paint(s, s + 2, (p) => {
      p.rect(2, 6, 22, 20, '#a87a4a');
      p.rect(2, 3, 22, 6, '#c09058');
    }, {
      detail: (p) => {
        p.rect(2, 8, 22, 1, '#6a4a28');
        p.rect(11, 3, 4, 23, '#d8c8a0');
        if (variant % 2) p.rect(4, 14, 6, 4, '#e8e0d0');
        else { p.rect(16, 12, 6, 5, '#f0e8d8'); p.px(18, 14, '#d97757'); }
      },
    });
  }
  if (kind === 'crt') {
    return paint(s, s + 2, (p) => {
      p.rr(1, 4, 24, 20, 3, '#b8b0a0');
      p.rect(5, 24, 16, 3, '#8a8478');
    }, {
      detail: (p) => {
        p.rr(4, 7, 18, 13, 2, '#1a2a20');
        const cols = ['#20a040', '#40c060', '#1a6a2a'];
        for (let y = 9; y < 18; y += 2) p.rect(6, y, R.int(3, 13), 1, R.pick(cols));
        p.px(21, 21, '#40ff40');
      },
    });
  }
  if (kind === 'crystal') {
    return paint(s, s + 4, (p) => {
      p.poly([[3, 29], [5, 12], [10, 4], [13, 14], [17, 2], [22, 12], [24, 29]], '#3a2a5a');
    }, {
      shade: { hi: 0.35, lo: 0.35 },
      detail: (p) => {
        p.line(10, 6, 11, 20, '#b070ff');
        p.line(17, 4, 16, 18, '#d090ff');
        p.px(17, 6, '#ffffff');
      },
    });
  }
  if (kind === 'rack') {
    return paint(s, s + 6, (p) => {
      p.rect(2, 1, 22, 30, '#2a2a30');
    }, {
      detail: (p) => {
        for (let y = 4; y < 29; y += 5) {
          p.rect(4, y, 18, 3, '#3e3e48');
          p.px(6, y + 1, R() > 0.3 ? '#40ff60' : '#ff4040');
          p.px(8, y + 1, '#40a0ff');
          p.rect(12, y + 1, 8, 1, '#1a1a20');
        }
      },
    });
  }
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
    }, {
      detail: (p) => {
        for (let y = 7; y < 26; y += 5) p.rect(4, y, 16, 1, '#e8dcc0');
      },
    });
  }
  // Roche générique
  return paint(s, s, (p) => {
    p.ell(13, 15, 12, 10, '#7a7068');
    p.ell(10, 11, 7, 6, '#8a8078');
  });
}

function paintPoop(kind, hp) {
  const k = hp / 4;
  const s = TILE;
  return paint(s, s, (p) => {
    const sc = 0.55 + k * 0.45;
    if (kind === 'spam') {
      // Tas d'enveloppes / papiers
      p.ell(13, 20, 11 * sc, 6 * sc, '#e8e0d0');
      p.rect(7, 20 - 10 * sc, 12 * sc, 8 * sc, '#f4f0e8');
      if (k > 0.5) p.rect(10, 20 - 14 * sc, 10, 6, '#e0d8c4');
    } else if (kind === 'floppy') {
      for (let i = 0; i < Math.ceil(hp); i++) p.rect(5 + i, 18 - i * 4, 15, 5, ['#2a2a3a', '#3a3a8a', '#8a2a2a', '#2a6a3a'][i]);
    } else if (kind === 'cookies') {
      p.circ(9, 18, 6 * sc, '#b07a3a');
      p.circ(17, 18, 6 * sc, '#a06a30');
      if (k > 0.5) p.circ(13, 12, 6, '#c08a44');
    } else if (kind === 'cables') {
      p.ell(13, 18, 11 * sc, 7 * sc, '#2a2a2a');
    } else {
      p.circ(13, 17, 9 * sc, '#e8e0c8');
    }
  }, {
    detail: (p) => {
      if (kind === 'spam') {
        p.line(8, 14, 12, 17, '#b0a890');
        if (k > 0.5) Font.draw(p.g, '@', 12, 7, '#c03030');
      } else if (kind === 'floppy') {
        p.rect(9, 19 - (Math.ceil(hp) - 1) * 4, 6, 2, '#c0c0c8');
      } else if (kind === 'cookies') {
        for (const [x, y] of [[8, 17], [11, 19], [16, 16], [18, 20], [13, 11]]) p.px(x, y, '#4a2a10');
      } else if (kind === 'cables') {
        p.line(4, 16, 22, 20, '#c02030');
        p.line(6, 21, 20, 14, '#2060c0');
        p.line(8, 13, 18, 22, '#e0c030');
      } else {
        p.line(8, 14, 18, 20, '#b0a080');
        p.line(10, 21, 16, 12, '#b0a080');
      }
    },
  });
}

for (const kind of ['box', 'crt', 'crystal', 'rack', 'books']) {
  for (let v = 0; v < 3; v++) defSpr(`rock_${kind}_${v}`, () => paintRock(kind, v));
}
for (const kind of ['spam', 'floppy', 'cookies', 'cables', 'crumple']) {
  for (let hp = 1; hp <= 4; hp++) defSpr(`poop_${kind}_${hp}`, () => paintPoop(kind, hp));
}

// Rocher marqué (secret) : même base + marque lumineuse.
function paintTinted(kind) {
  const base = spr(`rock_${kind}_0`);
  const c = mkCanvas(base.width, base.height);
  const g = c.getContext('2d');
  g.drawImage(base, 0, 0);
  const p = new Pix(g);
  p.rect(10, 12, 7, 2, '#60c0ff');
  p.rect(12, 10, 3, 6, '#60c0ff');
  p.px(13, 12, '#ffffff');
  return c;
}
for (const kind of ['box', 'crt', 'crystal', 'rack', 'books']) defSpr(`tinted_${kind}`, () => paintTinted(kind));

// Bloc métallique indestructible
defSpr('block', () => paint(TILE, TILE + 2, (p) => {
  p.rect(1, 2, 24, 24, '#5a5e6a');
}, {
  detail: (p) => {
    p.rect(3, 4, 20, 20, '#4a4e5a');
    for (const [x, y] of [[4, 5], [21, 5], [4, 22], [21, 22]]) p.px(x, y, '#a0a8b8');
    p.line(3, 4, 22, 23, '#3a3e48');
    p.line(22, 4, 3, 23, '#3a3e48');
  },
}));

// Braséro (le feu) : socle + flamme animée
defSpr('brazier', () => paint(22, 12, (p) => {
  p.rr(1, 2, 20, 9, 3, '#4a4a52');
}, {
  detail: (p) => {
    p.rect(3, 3, 16, 2, '#2a2020');
    p.rect(5, 6, 2, 3, '#2a2a30');
    p.rect(10, 6, 2, 3, '#2a2a30');
    p.rect(15, 6, 2, 3, '#2a2a30');
  },
}));
for (let f = 0; f < 3; f++) {
  for (const blue of [0, 1]) {
    defSpr(`flame${blue ? 'B' : ''}_${f}`, () => paint(16, 22, (p) => {
      const cols = blue ? ['#2a60e0', '#60a0ff', '#d0f0ff'] : ['#d0401a', '#ff9a2a', '#fff0a0'];
      const sway = [0, 1, -1][f];
      p.poly([[1, 21], [3, 10], [6 + sway, 2], [9 + sway, 7], [11 + sway, 0], [14, 11], [15, 21]], cols[0]);
      p.poly([[4, 21], [5, 13], [8 + sway, 6], [11, 13], [12, 21]], cols[1]);
      p.ell(8, 17, 3, 4, cols[2]);
    }, { shade: false, outline: blue ? '#0a1a4a' : '#4a0a0a' }));
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

// Trappe vers l'étage suivant
defSpr('trapdoor', () => paint(34, 26, (p) => {
  p.ell(17, 13, 16, 12, '#2a1a12');
}, {
  detail: (p) => {
    p.ell(17, 14, 13, 9, '#050303');
    p.ell(17, 16, 10, 6, '#000000');
    p.rect(6, 5, 3, 3, '#6a4428');
    p.rect(25, 5, 3, 3, '#6a4428');
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

// Piédestal (autel des objets)
defSpr('pedestal', () => paint(24, 16, (p) => {
  p.rect(2, 4, 20, 11, '#8a8278');
  p.rect(0, 1, 24, 5, '#a09a90');
}, {
  detail: (p) => {
    p.rect(4, 8, 16, 1, '#6a6258');
    p.rect(6, 11, 12, 1, '#6a6258');
  },
}));
defSpr('pedestalOffer', () => paint(24, 16, (p) => {
  p.rect(2, 4, 20, 11, '#3a1020');
  p.rect(0, 1, 24, 5, '#5a1830');
}, {
  detail: (p) => {
    p.rect(9, 8, 6, 4, '#ff3050');
  },
}));
