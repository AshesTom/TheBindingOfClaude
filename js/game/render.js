// Rendu des décors en "HD pixelisé" (2x) : sols, murs, portes, rochers,
// panneaux d'interface et sous-sol des menus.

const INK = '#f2e2cc';
const INK_RED = '#ff7060';
const INK_SOFT = '#a89098';

// Salle complète peinte à 2x la résolution logique.
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
      let col;
      const inX = X >= T && X < WH - T;
      const inY = Y >= T && Y < HH - T;
      const n = hash2(X, Y, seed);
      if (inX && inY) {
        const tx = Math.floor(X / T);
        const ty = Math.floor(Y / T);
        const lx = X % T;
        const ly = Y % T;
        col = (tx + ty) % 2 ? fB.slice() : fA.slice();
        // Grain de la pierre en petites taches
        const blot = hash2(X >> 2, Y >> 2, seed + 3);
        if (blot > 0.8) col = mixRgb(col, fDot, 0.35);
        else if (blot < 0.12) col = mixRgb(col, black, 0.12);
        if (n > 0.95) col = mixRgb(col, fDot, 0.6);
        if (theme.id === 1) {
          if (lx < 2 || ly < 2) col = mixRgb(col, fDot, 0.55);
          if (lx > T - 3 || ly > T - 3) col = mixRgb(col, black, 0.45);
          const crack = hash2(tx, ty, seed + 1);
          if (crack > 0.7 && Math.abs(lx - ly * 0.8 - crack * 10) < 1 && lx > 6 && lx < 26) col = mixRgb(col, black, 0.55);
        } else if (theme.id === 2) {
          if (lx < 2 || ly < 2) col = mixRgb(col, fDot, 0.8);
          if (lx > T - 3 || ly > T - 3) col = mixRgb(col, black, 0.5);
          if (ly > 5 && ly < 27 && lx > 5 && lx < 27 && ly % 4 === 0) col = mixRgb(col, black, 0.4);
          if (ly > 5 && ly < 27 && lx > 5 && lx < 27 && ly % 4 === 1) col = mixRgb(col, fDot, 0.3);
        } else if (theme.id >= 4) {
          // Parquet
          const ph = 10;
          const row = Math.floor(Y / ph);
          const len = 70 + Math.floor(hash2(row, 7, seed) * 50);
          const off = Math.floor(hash2(row, 3, seed) * len);
          const px2 = (X + off) % len;
          col = mixRgb(fA, fB, hash2(Math.floor((X + off) / len), row, seed) * 0.8);
          if (Y % ph === 0) col = mixRgb(col, black, 0.55);
          else if (Y % ph === 1) col = mixRgb(col, fDot, 0.4);
          if (px2 === 0) col = mixRgb(col, black, 0.45);
          if (Math.sin(X * 0.3 + row * 1.7 + Math.sin(X * 0.05) * 3) > 0.92) col = mixRgb(col, black, 0.15);
        } else {
          const neb = Math.sin(X * 0.025 + Math.sin(Y * 0.035) * 2) * 0.5 + 0.5;
          col = mixRgb(col, [96, 44, 128], dq(neb * 0.5, X, Y));
          if (n > 0.992) col = [240, 210, 255];
          if (lx < 1 || ly < 1) col = mixRgb(col, fDot, 0.4);
        }
        const dEdge = Math.min(X - T, Y - T, WH - T - 1 - X, HH - T - 1 - Y);
        if (dEdge < 22) col = mixRgb(col, black, dq((22 - dEdge) / 22, X, Y) * 0.5);
        const vx = (X - WH / 2) / (WH / 2);
        const vy = (Y - HH / 2) / (HH / 2);
        const v = clamp((vx * vx + vy * vy - 0.35) / 1.2, 0, 1);
        col = mixRgb(col, black, dq(v, X, Y) * 0.3);
      } else {
        // Murs épais : sombre à l'extérieur, éclairé au bord intérieur
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
        col = q < 0.5 ? mixRgb(wD, wM, q * 2) : mixRgb(wM, wL, (q - 0.5) * 2);
        col = mixRgb(black, col, dark);
        if (theme.id === 1) {
          // Grosses pierres façon cave
          const bw = 22;
          const bh = 11;
          const row = Math.floor(Y / bh);
          const off = row % 2 ? 11 : 0;
          const bx = (X + off) % bw;
          const by = Y % bh;
          if (by === 0 || bx === 0) col = mixRgb(col, black, 0.55);
          else if (by === 1 || bx === 1) col = mixRgb(col, wL, 0.25);
          const stone = hash2(Math.floor((X + off) / bw), row, seed + 9);
          col = mixRgb(col, stone > 0.5 ? wL : black, Math.abs(stone - 0.5) * 0.25);
        } else if (theme.id === 2) {
          const along = inY ? Y : X;
          const across = inY ? X : Y;
          const a = along % T;
          if (a < 2) col = mixRgb(col, black, 0.6);
          else if (a < 3) col = mixRgb(col, wL, 0.35);
          if (a % 6 === 0 && across % T > 6 && across % T < 24) col = mixRgb(col, black, 0.35);
          if (a % 6 === 0 && across % T === 26 && hash2(along, across, seed) > 0.5) col = hash2(along, 1, seed) > 0.3 ? [106, 240, 106] : [240, 160, 64];
        } else if (theme.id === 4) {
          // Étagères de livres
          const along = inY ? Y : X;
          const across = inY ? X : Y;
          const shelf = across % T;
          const bw = 4 + Math.floor(hash2(Math.floor(along / 5), Math.floor(across / T), seed) * 3);
          const book = Math.floor(along / bw);
          const bc = [[140, 50, 40], [50, 80, 130], [60, 110, 60], [150, 110, 50], [100, 50, 110]][Math.floor(hash2(book, Math.floor(across / T), seed) * 5)];
          if (shelf > 3 && shelf < T - 4) col = mixRgb(bc, black, (1 - t) * 0.6);
          if (along % bw === 0) col = mixRgb(col, black, 0.5);
          if (shelf <= 3 || shelf >= T - 4) col = mixRgb(wM, black, shelf <= 1 || shelf >= T - 2 ? 0.5 : 0.1);
        } else if (theme.id === 5) {
          // Boiseries du QG
          const along = inY ? Y : X;
          if (along % 24 < 2) col = mixRgb(col, black, 0.5);
          else if (along % 24 < 3) col = mixRgb(col, wL, 0.3);
          if (t > 0.55 && t < 0.62) col = mixRgb(col, [200, 140, 80], 0.5);
        } else {
          const f = ((X + Y) % 18 < 2) || ((X - Y + 999) % 26 < 2);
          if (f) col = mixRgb(col, wL, 0.4);
          if (n > 0.985) col = [240, 130, 200];
        }
        if (n > 0.93) col = mixRgb(col, black, 0.15);
      }
      const i = (Y * WH + X) * 4;
      D[i] = col[0];
      D[i + 1] = col[1];
      D[i + 2] = col[2];
      D[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Bord intérieur des murs
  R(x, T - 2, T - 2, WH - 2 * T + 4, 2, '#000');
  R(x, T - 2, HH - T, WH - 2 * T + 4, 2, '#000');
  R(x, T - 2, T - 2, 2, HH - 2 * T + 4, '#000');
  R(x, WH - T, T - 2, 2, HH - 2 * T + 4, '#000');
  R(x, T - 2, T - 4, WH - 2 * T + 4, 2, tone(theme.wallLight, 0.15));
  R(x, 0, 0, WH, 2, '#000');
  R(x, 0, HH - 2, WH, 2, '#000');
  R(x, 0, 0, 2, HH, '#000');
  R(x, WH - 2, 0, 2, HH, '#000');

  // Tapis du QG
  if (theme.id === 5) {
    E(x, WH / 2, HH / 2 + 8, 120, 58, '#2a0e0e');
    E(x, WH / 2, HH / 2 + 8, 116, 55, '#8a2a24');
    E(x, WH / 2, HH / 2 + 8, 104, 48, '#c8703a');
    E(x, WH / 2, HH / 2 + 8, 100, 45, '#7a2420');
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      E(x, WH / 2 + Math.cos(a) * 110, HH / 2 + 8 + Math.sin(a) * 51, 2, 2, '#f0c060');
    }
    E(x, WH / 2, HH / 2 + 8, 26, 12, '#c8703a');
  }

  // Rochers (avec ombre portée)
  const rock = SPR['rock_' + theme.id];
  for (let ty = 0; ty < ROOM_H; ty++) {
    for (let tx = 0; tx < ROOM_W; tx++) {
      if (room.tiles[ty * ROOM_W + tx] !== 2) continue;
      x.globalAlpha = 0.45;
      E(x, tx * T + 18, ty * T + 27, 13, 4, '#000');
      x.globalAlpha = 1;
      x.drawImage(rock.img, tx * T + Math.floor((T - rock.img.width) / 2), ty * T + T - rock.img.height + 1);
    }
  }

  // Texte au sol dans la salle de départ
  x.save();
  x.scale(HD, HD);
  if (opts.tutorial) {
    const col = 'rgba(255,240,220,0.2)';
    Font.draw(x, 'ZQSD / WASD : SE DÉPLACER', 120, 34, col, { align: 'center' });
    Font.draw(x, 'FLÈCHES : TIRER', 120, 48, col, { align: 'center' });
    Font.draw(x, 'ESPACE : DASH', 72, 96, col, { align: 'center' });
    Font.draw(x, 'E : ARTEFACT', 168, 96, col, { align: 'center' });
    Font.draw(x, 'ÉCHAP : PAUSE', 120, 110, col, { align: 'center' });
  } else if (opts.label) {
    Font.draw(x, opts.label, 120, 108, 'rgba(255,240,220,0.14)', { align: 'center' });
  }
  x.restore();
  return c;
}

// Fichier corrompu destructible (3 PV).
function drawDestructible(ctx, px, py, hp) {
  drawShadow(ctx, px + 9, py + 14, 7, 2);
  drawSpr(ctx, 'file_' + clamp(hp, 1, 3), px + 2, py);
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
    basementCache = c;
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
