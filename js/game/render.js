// Rendu des décors en "HD pixelisé" (2x) : sols, murs, portes, rochers,
// panneaux d'interface et sous-sol des menus.

const INK = '#f2e2cc';
const INK_RED = '#ff7060';
const INK_SOFT = '#a89098';

// Salle complète peinte à 2x la résolution logique.
// Chaque étage a son propre sol et ses propres murs (cave d'Isaac x enfers d'Hadès).
function floorColor(theme, X, Y, T, seed, fA, fB, fDot, black) {
  const n = hash2(X, Y, seed);
  const blot = hash2(X >> 2, Y >> 2, seed + 3);
  let col;
  if (theme.id === 1) {
    // Sous-sol : grandes dalles irrégulières
    const rh = 22;
    const row = Math.floor(Y / rh);
    const len = 30 + Math.floor(hash2(row, 7, seed) * 26);
    const off = Math.floor(hash2(row, 3, seed) * 40);
    const slab = Math.floor((X + off) / len);
    const lx = (X + off) % len;
    const ly = Y % rh;
    col = mixRgb(fA, fB, hash2(slab, row, seed));
    if (blot > 0.78) col = mixRgb(col, fDot, 0.3);
    if (n > 0.93) col = mixRgb(col, black, 0.2);
    if (ly < 2 || lx < 2) col = mixRgb(col, black, 0.55);
    else if (ly < 3 || lx < 3) col = mixRgb(col, fDot, 0.35);
  } else if (theme.id === 2) {
    // Catacombes : pierre grise, joints profonds
    const lx = X % T;
    const ly = Y % T;
    col = mixRgb(fA, fB, hash2(Math.floor(X / T), Math.floor(Y / T), seed));
    if (blot > 0.8) col = mixRgb(col, fDot, 0.4);
    if (n > 0.95) col = mixRgb(col, black, 0.25);
    if (lx < 2 || ly < 2) col = mixRgb(col, black, 0.6);
    else if (lx < 3 || ly < 3) col = mixRgb(col, fDot, 0.5);
    else if (lx > T - 3 || ly > T - 3) col = mixRgb(col, black, 0.25);
  } else if (theme.id === 3) {
    // Élysée : marbre veiné, joints dorés
    const lx = X % T;
    const ly = Y % T;
    col = (Math.floor(X / T) + Math.floor(Y / T)) % 2 ? fA.slice() : fB.slice();
    const vein = Math.sin(X * 0.08 + Math.sin(Y * 0.13 + X * 0.02) * 4 + seed + hash2(X >> 3, Y >> 3, seed) * 2);
    if (vein > 0.985) col = mixRgb(col, [210, 230, 220], 0.2);
    if (n > 0.97) col = mixRgb(col, fDot, 0.5);
    if (lx < 1 || ly < 1) col = [200, 168, 96];
    else if (lx < 2 || ly < 2) col = mixRgb(col, black, 0.3);
  } else if (theme.id === 4) {
    // Asphodèle : basalte et lave
    const lx = X % T;
    const ly = Y % T;
    col = mixRgb(fA, fB, hash2(Math.floor(X / T), Math.floor(Y / T), seed));
    if (blot > 0.82) col = mixRgb(col, fDot, 0.5);
    // Magma qui suinte entre certaines dalles
    const hot = hash2(Math.floor(X / T), Math.floor(Y / T), seed + 5) > 0.55;
    if (lx < 2 || ly < 2) col = hot ? [255, 110, 30] : mixRgb(col, [60, 16, 8], 0.7);
    else if (hot && (lx < 4 || ly < 4)) col = mixRgb(col, [200, 60, 10], 0.5);
  } else {
    // QG : marbre sombre en damier
    const lx = X % T;
    const ly = Y % T;
    col = (Math.floor(X / T) + Math.floor(Y / T)) % 2 ? fA.slice() : fB.slice();
    const vein = Math.sin(X * 0.05 + Math.sin(Y * 0.08) * 3);
    if (vein > 0.95) col = mixRgb(col, fDot, 0.6);
    if (lx < 1 || ly < 1) col = mixRgb(col, [200, 160, 96], 0.5);
  }
  return col;
}

function wallColor(theme, X, Y, T, WH, HH, inX, inY, seed, wD, wM, wL, black) {
  const n = hash2(X, Y, seed);
  let t;
  let dark = 1;
  if (!inY && Y < T) t = Y / (T - 1);
  else if (!inY) { t = (HH - 1 - Y) / (T - 1); dark = 0.72; }
  else t = 1;
  if (!inX) {
    const t2 = X < T ? X / (T - 1) : (WH - 1 - X) / (T - 1);
    t = Math.min(t, t2);
    if (inY) dark = 0.86;
  }
  const q = dq(Math.pow(t, 1.4), X, Y, 6);
  let col = q < 0.5 ? mixRgb(wD, wM, q * 2) : mixRgb(wM, wL, (q - 0.5) * 2);
  col = mixRgb(black, col, dark);
  const along = inY ? Y : X;
  if (theme.id === 1 || theme.id === 2 || theme.id === 4) {
    // Gros blocs de pierre
    const bw = theme.id === 2 ? 26 : 22;
    const bh = theme.id === 2 ? 13 : 11;
    const row = Math.floor(Y / bh);
    const off = row % 2 ? Math.floor(bw / 2) : 0;
    const bx = (X + off) % bw;
    const by = Y % bh;
    if (by === 0 || bx === 0) col = mixRgb(col, black, 0.6);
    else if (by === 1 || bx === 1) col = mixRgb(col, wL, 0.22);
    const stone = hash2(Math.floor((X + off) / bw), row, seed + 9);
    col = mixRgb(col, stone > 0.5 ? wL : black, Math.abs(stone - 0.5) * 0.3);
    if (theme.id === 4 && Math.sin(along * 0.21 + seed) > 0.97 && t > 0.3) col = [220, 80, 20];
    if (theme.id === 2 && stone > 0.93 && by > 3 && by < bh - 2 && bx > 6 && bx < bw - 6) col = mixRgb(col, black, 0.7);
  } else {
    // Élysée et QG : colonnes cannelées + frise dorée
    const c = along % 28;
    if (c < 2) col = mixRgb(col, black, 0.5);
    else if (c % 5 === 0) col = mixRgb(col, black, 0.25);
    else if (c % 5 === 1) col = mixRgb(col, wL, 0.2);
    if (t > 0.72 && t < 0.8) col = mixRgb(col, [200, 168, 96], 0.7);
    if (theme.id === 5 && t < 0.25) col = mixRgb(col, [90, 20, 30], 0.5);
  }
  if (n > 0.94) col = mixRgb(col, black, 0.15);
  return col;
}

function renderRoomBG(room, theme, opts = {}) {
  const WH = ROOM_PX_W * HD;
  const HH = ROOM_PX_H * HD;
  const T = TILE * HD;
  const c = newCanvas(WH, HH);
  const x = c.getContext('2d');
  const img = x.createImageData(WH, HH);
  const D = img.data;
  const seed = Math.floor(Math.random() * 1000);
  const fA = rgb(theme.floor);
  const fB = rgb(theme.floor2);
  const fDot = rgb(theme.floorDot);
  const wD = rgb(theme.wallDark);
  const wM = rgb(theme.wall);
  const wL = rgb(theme.wallLight);
  const black = [8, 4, 10];

  for (let Y = 0; Y < HH; Y++) {
    for (let X = 0; X < WH; X++) {
      const inX = X >= T && X < WH - T;
      const inY = Y >= T && Y < HH - T;
      let col;
      if (inX && inY) {
        col = floorColor(theme, X, Y, T, seed, fA, fB, fDot, black);
        const dEdge = Math.min(X - T, Y - T, WH - T - 1 - X, HH - T - 1 - Y);
        if (dEdge < 24) col = mixRgb(col, black, dq((24 - dEdge) / 24, X, Y) * 0.55);
        const vx = (X - WH / 2) / (WH / 2);
        const vy = (Y - HH / 2) / (HH / 2);
        const v = clamp((vx * vx + vy * vy - 0.35) / 1.2, 0, 1);
        col = mixRgb(col, black, dq(v, X, Y) * 0.3);
      } else {
        col = wallColor(theme, X, Y, T, WH, HH, inX, inY, seed, wD, wM, wL, black);
      }
      const i = (Y * WH + X) * 4;
      D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Bords
  R(x, T - 2, T - 2, WH - 2 * T + 4, 2, '#000');
  R(x, T - 2, HH - T, WH - 2 * T + 4, 2, '#000');
  R(x, T - 2, T - 2, 2, HH - 2 * T + 4, '#000');
  R(x, WH - T, T - 2, 2, HH - 2 * T + 4, '#000');
  R(x, T - 2, T - 4, WH - 2 * T + 4, 2, tone(theme.wallLight, 0.15));
  R(x, 0, 0, WH, 2, '#000');
  R(x, 0, HH - 2, WH, 2, '#000');
  R(x, 0, 0, 2, HH, '#000');
  R(x, WH - 2, 0, 2, HH, '#000');

  // Tapis rouge du QG
  if (opts.carpet) {
    R(x, 196, T, 88, HH - 2 * T, '#1a0608');
    R(x, 200, T, 80, HH - 2 * T, '#c8a060');
    R(x, 204, T, 72, HH - 2 * T, '#8a1a22');
    for (let Y = T; Y < HH - T; Y += 12) R(x, 238, Y + 4, 4, 4, '#c8a060');
  }

  // Décor au sol
  const decor = theme.decor || [];
  const free = [];
  for (let ty = 1; ty < ROOM_H - 1; ty++) for (let tx = 1; tx < ROOM_W - 1; tx++) if (room.tiles[ty * ROOM_W + tx] === 0) free.push([tx, ty]);
  shuffle(free);
  const nDecor = decor.length ? randInt(4, 9) : 0;
  for (let i = 0; i < nDecor && i < free.length; i++) {
    const s = SPR['d_' + choice(decor)];
    const [tx, ty] = free[i];
    x.drawImage(s.img, tx * T + randInt(0, T - s.img.width), ty * T + randInt(0, T - s.img.height));
  }

  // Pics (tuile 5)
  for (let ty = 0; ty < ROOM_H; ty++) {
    for (let tx = 0; tx < ROOM_W; tx++) {
      if (room.tiles[ty * ROOM_W + tx] === 5) x.drawImage(SPR.spikes.img, tx * T - 1, ty * T + 1);
    }
  }

  // Obstacles (avec ombre portée)
  for (let ty = 0; ty < ROOM_H; ty++) {
    for (let tx = 0; tx < ROOM_W; tx++) {
      if (room.tiles[ty * ROOM_W + tx] !== 2) continue;
      const rock = SPR[`rock_${theme.id}_${hash2(tx, ty, seed) > 0.5 ? 'a' : 'b'}`];
      x.globalAlpha = 0.45;
      E(x, tx * T + 18, ty * T + 28, 13, 4, '#000');
      x.globalAlpha = 1;
      x.drawImage(rock.img, tx * T + Math.floor((T - rock.img.width) / 2), ty * T + T - rock.img.height + 2);
    }
  }

  // Torches murales (la flamme est animée à l'exécution)
  room.torches = [];
  if (theme.torch) {
    const spots = [[4, 0], [10, 0], [0, 2], [0, 6], [14, 2], [14, 6]];
    for (const [tx, ty] of spots) {
      const lx = tx === 0 ? 8 : tx === 14 ? ROOM_PX_W - 8 : tx * TILE + 8;
      const ly = ty === 0 ? 9 : ty * TILE + 8;
      x.drawImage(SPR.sconce.img, lx * HD - 10, ly * HD - 4);
      room.torches.push({ x: lx, y: ly - 2, kind: theme.torch, ph: Math.random() * 10 });
    }
  }

  // Texte au sol dans la salle de départ
  x.save();
  x.scale(HD, HD);
  if (opts.tutorial) {
    const col = 'rgba(255,240,220,0.22)';
    Font.draw(x, 'ZQSD / WASD : SE DÉPLACER', 120, 34, col, { align: 'center' });
    Font.draw(x, 'FLÈCHES : TIRER', 120, 48, col, { align: 'center' });
    Font.draw(x, 'ESPACE : DASH', 72, 96, col, { align: 'center' });
    Font.draw(x, 'E : ARTEFACT', 168, 96, col, { align: 'center' });
    Font.draw(x, 'ÉCHAP : PAUSE', 120, 110, col, { align: 'center' });
  } else if (opts.label) {
    Font.draw(x, opts.label, 120, 108, 'rgba(255,240,220,0.14)', { align: 'center' });
  }
  x.restore();
  return quantizeCanvas(c);
}

const TORCH_COLORS = {
  fire: ['#ff9a30', '#ffe080', '255,150,60'],
  ghost: ['#40e080', '#c0ffd0', '80,240,140'],
  spirit: ['#70c0ff', '#e0f4ff', '120,200,255'],
  lava: ['#ff4a20', '#ffc060', '255,90,40'],
};

// Flamme animée d'une torche.
function drawTorchFlame(ctx, tc, t) {
  const [c1, c2] = TORCH_COLORS[tc.kind];
  const f = Math.round(Math.sin(poseT(t) * 12 + tc.ph) * 2) * 0.5;
  fillEllipseHD(ctx, tc.x, tc.y - 2 + f * 0.3, 2.5, 3.5 + f * 0.5, c1);
  fillEllipseHD(ctx, tc.x, tc.y - 1.5, 1.2, 2, c2);
}

// Jarre destructible (2 PV).
function drawDestructible(ctx, px, py, hp) {
  drawShadow(ctx, px + 8, py + 14, 6, 2);
  drawSpr(ctx, 'urn_' + clamp(hp, 1, 2), px + 3, py + 2);
}

// Porte HD pivotée selon le mur. state = 'open' | 'closed' | 'locked'
function drawDoor(ctx, dir, state, kind, theme, t) {
  const d = DIRS[dir];
  const cx = d.tx * TILE + 8;
  const cy = d.ty * TILE + 8;
  const ang = { up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[dir];
  const img = doorCanvas(theme.id, kind, state);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.drawImage(img, -16, -8, 32, 24);
  if (kind === 'treasure' && state === 'open') {
    ctx.globalAlpha = 0.4 + Math.sin(t * 4) * 0.3;
    fillEllipseHD(ctx, 0, 5, 2, 2, '#f8d048');
  }
  ctx.restore();
}

// Compatibilité : les anciens "papiers" deviennent des panneaux sombres.
function drawPaper(ctx, x, y, w, h, seed, tint) {
  drawPanel(ctx, x, y, w, h, tint === 'dark' ? 'dark' : tint === 'red' ? 'red' : 'light');
}

// Sélection : flèche + soulignement ondulé.
function drawScribble(ctx, cx, cy, w, t) {
  const x0 = Math.round(cx - w / 2 - 1);
  const ph = t * 12;
  ctx.save();
  ctx.scale(0.5, 0.5);
  ctx.fillStyle = INK_RED;
  for (let i = 0; i < (w + 2) * 2; i++) {
    const oy = Math.round(Math.sin((i + ph) * 0.35) * 1.5);
    ctx.fillRect(x0 * 2 + i, Math.round((cy + 6) * 2 + oy), 1, 2);
  }
  ctx.restore();
  const bump = Math.floor(t * 4) % 2;
  Font.draw(ctx, '>', x0 - 9 - bump, cy - 3, INK_RED);
}

// Sous-sol sombre (fond des menus), en HD.
let basementCache = null;
function drawBasement(ctx, t) {
  if (!basementCache) {
    const WH = W * HD;
    const HH = H * HD;
    const c = newCanvas(WH, HH);
    const x = c.getContext('2d');
    const img = x.createImageData(WH, HH);
    const D = img.data;
    const a = rgb('#3e2c24');
    const b = rgb('#36261f');
    const dot = rgb('#54402f');
    const black = [6, 3, 4];
    for (let Y = 0; Y < HH; Y++) {
      for (let X = 0; X < WH; X++) {
        const tx = Math.floor(X / 40);
        const ty = Math.floor(Y / 40);
        const lx = X % 40;
        const ly = Y % 40;
        let col = (tx + ty) % 2 ? a.slice() : b.slice();
        const blot = hash2(X >> 2, Y >> 2, 5);
        if (blot > 0.82) col = mixRgb(col, dot, 0.4);
        else if (blot < 0.1) col = mixRgb(col, black, 0.15);
        if (lx < 2 || ly < 2) col = mixRgb(col, dot, 0.5);
        if (lx > 37 || ly > 37) col = mixRgb(col, black, 0.5);
        const vx = (X - WH / 2) / (WH / 2);
        const vy = (Y - HH * 0.55) / (HH / 2);
        const v = clamp((vx * vx + vy * vy - 0.15) / 1.1, 0, 1);
        col = mixRgb(col, black, dq(v, X, Y, 8) * 0.92);
        const k = (Y * WH + X) * 4;
        D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    basementCache = quantizeCanvas(c);
  }
  ctx.drawImage(basementCache, 0, 0, W, H);
  ctx.save();
  ctx.scale(0.5, 0.5);
  for (let i = 0; i < 30; i++) {
    const px = (hash2(i, 1) * W * 2 + t * (8 + hash2(i, 2) * 12)) % (W * 2);
    const py = (hash2(i, 3) * H * 2 + Math.sin(t * 0.7 + i) * 12 + H * 2) % (H * 2);
    ctx.globalAlpha = 0.25 + hash2(i, 4) * 0.4;
    ctx.fillStyle = '#f0d8b0';
    ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  ctx.restore();
}

function drawTrapdoor(ctx, x, y, t) {
  drawSprC(ctx, 'trapdoor', x, y);
  ctx.save();
  ctx.globalAlpha = 0.25 + Math.sin(t * 3) * 0.15;
  fillEllipseHD(ctx, x, y + 1, 7, 3, '#a86ae8');
  ctx.restore();
}

function roundOutline(ctx, x, y, w, h, t, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + t, y, w - 2 * t, t);
  ctx.fillRect(x + t, y + h - t, w - 2 * t, t);
  ctx.fillRect(x, y + t, t, h - 2 * t);
  ctx.fillRect(x + w - t, y + t, t, h - 2 * t);
}

// Trombone stylisé (décor).
function drawPaperclip(ctx, x, y, w, h, t, color, shade) {
  x = Math.round(x);
  y = Math.round(y);
  roundOutline(ctx, x - 1, y - 1, w + 2, h + 2, 1, '#1a1016');
  roundOutline(ctx, x, y, w, h, t, color);
  const g = t + 2;
  ctx.fillStyle = shade;
  ctx.fillRect(x + g, y + g + 2, t, h - g * 2 - 2);
  ctx.fillRect(x + w - g - t, y + g, t, h - g * 2);
  ctx.fillRect(x + g, y + h - g - t, w - g * 2, t);
  if (w >= 10) ctx.fillRect(x + Math.floor(w / 2) - Math.floor(t / 2), y + g + 4, t, h - g * 2 - 6);
}

// Orbe de bénédiction (Hadès).
function drawBoonOrb(ctx, x, y, color, glyph, t = 0, r = 7) {
  const glow = r + 2 + Math.sin(t * 4);
  ctx.save();
  ctx.globalAlpha = 0.3;
  fillEllipseHD(ctx, x, y, glow, glow, color);
  ctx.restore();
  fillEllipseHD(ctx, x, y, r, r, OUTLINE);
  fillEllipseHD(ctx, x, y, r - 1, r - 1, color);
  fillEllipseHD(ctx, x + 1, y + 1, r - 2, r - 2, tone(color, -0.12));
  fillEllipseHD(ctx, x - 1, y - 1, r - 3, r - 3, color);
  fillEllipseHD(ctx, x - r * 0.35, y - r * 0.35, Math.max(1, r * 0.25), Math.max(1, r * 0.2), '#ffffff');
  if (glyph) Font.draw(ctx, glyph, x + 1, y - 3, OUTLINE, { align: 'center' });
}
