// Rendu des décors : sols, murs, portes, rochers, trappe, trombones...

function renderRoomBG(room, theme, opts = {}) {
  const c = document.createElement('canvas');
  c.width = ROOM_PX_W;
  c.height = ROOM_PX_H;
  const x = c.getContext('2d');

  // --- Sol
  rect(x, 0, 0, ROOM_PX_W, ROOM_PX_H, theme.floor);
  for (let ty = 1; ty < ROOM_H - 1; ty++) {
    for (let tx = 1; tx < ROOM_W - 1; tx++) {
      const px = tx * TILE;
      const py = ty * TILE;
      if ((tx + ty) % 2) rect(x, px, py, TILE, TILE, theme.floor2);
      if (theme.id === 1) {
        // Des bits de données gravés dans le sol
        if (Math.random() < 0.25) {
          const bit = Math.random() < 0.5 ? '0' : '1';
          Font.draw(x, bit, px + randInt(2, 10), py + randInt(2, 7), theme.floorDot);
        }
        for (let i = 0; i < 2; i++) rect(x, px + randInt(0, 15), py + randInt(0, 15), 1, 1, theme.floorDot);
      } else if (theme.id === 2) {
        rect(x, px, py, TILE, 1, theme.floorDot);
        rect(x, px, py, 1, TILE, theme.floorDot);
        if (Math.random() < 0.3) {
          for (let i = 0; i < 3; i++) rect(x, px + 4, py + 4 + i * 3, 8, 1, theme.floor2);
        }
      } else {
        for (let i = 0; i < 3; i++) {
          if (Math.random() < 0.4) rect(x, px + randInt(0, 15), py + randInt(0, 15), 1, 1, i === 0 ? '#8a5ab0' : theme.floorDot);
        }
      }
    }
  }
  // Ombre portée des murs
  x.fillStyle = 'rgba(0,0,0,0.3)';
  x.fillRect(TILE, TILE, ROOM_PX_W - TILE * 2, 3);
  x.fillRect(TILE, TILE, 3, ROOM_PX_H - TILE * 2);

  // --- Murs
  drawWalls(x, theme);

  // --- Rochers
  for (let ty = 0; ty < ROOM_H; ty++) {
    for (let tx = 0; tx < ROOM_W; tx++) {
      if (room.tiles[ty * ROOM_W + tx] === 2) drawRock(x, tx * TILE, ty * TILE, theme);
    }
  }

  // --- Texte au sol dans la salle de départ
  if (opts.tutorial) {
    const col = 'rgba(255,255,255,0.16)';
    Font.draw(x, 'ZQSD / WASD : SE DÉPLACER', 120, 34, col, { align: 'center' });
    Font.draw(x, 'FLÈCHES : TIRER', 120, 48, col, { align: 'center' });
    Font.draw(x, 'ESPACE : DASH', 72, 96, col, { align: 'center' });
    Font.draw(x, 'E : ARTEFACT', 168, 96, col, { align: 'center' });
    Font.draw(x, 'ÉCHAP : PAUSE', 120, 110, col, { align: 'center' });
  } else if (opts.label) {
    Font.draw(x, opts.label, 120, 108, 'rgba(255,255,255,0.12)', { align: 'center' });
  }
  return c;
}

function drawWalls(x, t) {
  const Wd = ROOM_PX_W;
  const Hd = ROOM_PX_H;
  x.save();
  x.beginPath();
  x.rect(0, 0, Wd, Hd);
  x.rect(TILE, TILE, Wd - TILE * 2, Hd - TILE * 2);
  x.clip('evenodd');
  // Fond des murs
  rect(x, 0, 0, Wd, TILE, t.wall);
  rect(x, 0, Hd - TILE, Wd, TILE, t.wall);
  rect(x, 0, 0, TILE, Hd, t.wall);
  rect(x, Wd - TILE, 0, TILE, Hd, t.wall);

  if (t.id === 1) {
    // Briques
    for (let y = 0; y < Hd; y += 5) {
      for (let xx = 0; xx < Wd; xx += 10) {
        const off = (y / 5) % 2 ? 5 : 0;
        const bx = xx + off;
        if (y < TILE || y >= Hd - TILE || bx < TILE || bx >= Wd - TILE) {
          rect(x, bx, y, 1, 5, t.wallDark);
          rect(x, bx + 1, y, 8, 1, t.wallLight);
        }
      }
      if (y < TILE || y >= Hd - TILE) rect(x, 0, y + 4, Wd, 1, t.wallDark);
      else {
        rect(x, 0, y + 4, TILE, 1, t.wallDark);
        rect(x, Wd - TILE, y + 4, TILE, 1, t.wallDark);
      }
    }
  } else if (t.id === 2) {
    // Baies de serveurs
    const rack = (rx, ry, rw, rh, vertical) => {
      rect(x, rx, ry, rw, rh, t.wallDark);
      rect(x, rx + 1, ry + 1, rw - 2, rh - 2, t.wall);
      if (vertical) {
        for (let yy = ry + 2; yy < ry + rh - 2; yy += 3) {
          rect(x, rx + 2, yy, rw - 4, 1, t.wallLight);
          if (Math.random() < 0.5) rect(x, rx + rw - 4, yy, 1, 1, Math.random() < 0.7 ? '#6af06a' : '#f0a040');
        }
      } else {
        for (let xx = rx + 2; xx < rx + rw - 2; xx += 3) {
          rect(x, xx, ry + 2, 1, rh - 4, t.wallLight);
          if (Math.random() < 0.5) rect(x, xx, ry + rh - 4, 1, 1, Math.random() < 0.7 ? '#6af06a' : '#f0a040');
        }
      }
    };
    for (let i = 0; i < ROOM_W; i++) {
      rack(i * TILE, 0, TILE, TILE, true);
      rack(i * TILE, Hd - TILE, TILE, TILE, true);
    }
    for (let j = 1; j < ROOM_H - 1; j++) {
      rack(0, j * TILE, TILE, TILE, false);
      rack(Wd - TILE, j * TILE, TILE, TILE, false);
    }
  } else {
    // Cristaux / nuages violets
    for (let i = 0; i < 70; i++) {
      const side = randInt(0, 3);
      let px, py;
      if (side === 0) { px = randInt(0, Wd - 6); py = randInt(0, TILE - 6); }
      else if (side === 1) { px = randInt(0, Wd - 6); py = randInt(Hd - TILE, Hd - 6); }
      else if (side === 2) { px = randInt(0, TILE - 6); py = randInt(0, Hd - 6); }
      else { px = randInt(Wd - TILE, Wd - 6); py = randInt(0, Hd - 6); }
      rect(x, px, py, 5, 5, Math.random() < 0.5 ? t.wallLight : t.wallDark);
      rect(x, px + 1, py + 1, 2, 2, Math.random() < 0.3 ? '#f070b8' : t.wall);
    }
  }
  x.restore();
  // Bords intérieurs
  rect(x, TILE - 1, TILE - 1, Wd - TILE * 2 + 2, 1, '#000');
  rect(x, TILE - 1, Hd - TILE, Wd - TILE * 2 + 2, 1, '#000');
  rect(x, TILE - 1, TILE - 1, 1, Hd - TILE * 2 + 2, '#000');
  rect(x, Wd - TILE, TILE - 1, 1, Hd - TILE * 2 + 2, '#000');
  rect(x, TILE - 2, TILE - 2, Wd - TILE * 2 + 4, 1, t.wallLight);
  // Bord extérieur
  x.strokeStyle = '#000';
  x.lineWidth = 1;
  x.strokeRect(0.5, 0.5, Wd - 1, Hd - 1);
}

function drawRock(x, px, py, t) {
  if (t.id === 1) {
    // Pile de papiers / pierre
    fillEllipse(x, px + 8, py + 9, 7, 6, '#1a1016');
    fillEllipse(x, px + 8, py + 8, 6, 5, '#6a5f70');
    fillEllipse(x, px + 7, py + 7, 4, 3, '#8a7f90');
    rect(x, px + 5, py + 5, 2, 1, '#aaa0b0');
    rect(x, px + 9, py + 11, 3, 1, '#4a4052');
  } else if (t.id === 2) {
    // Boîtier serveur
    rect(x, px + 1, py + 2, 14, 13, '#0a0e14');
    rect(x, px + 2, py + 3, 12, 11, '#3a4a60');
    rect(x, px + 2, py + 3, 12, 2, '#5a7090');
    rect(x, px + 3, py + 7, 10, 1, '#1a2230');
    rect(x, px + 3, py + 10, 10, 1, '#1a2230');
    rect(x, px + 11, py + 8, 1, 1, '#6af06a');
    rect(x, px + 11, py + 11, 1, 1, '#f04040');
  } else {
    // Cristal
    const col = ['#1a0c26', '#8a4ac0', '#c080f0'];
    for (let i = 0; i < 3; i++) {
      const inset = i;
      for (let yy = 0; yy < 14 - inset * 2; yy++) {
        const half = Math.round((yy < 7 - inset ? yy : 13 - inset * 2 - yy) * 0.8) + 1;
        rect(x, px + 8 - half + (i === 2 ? -1 : 0), py + 1 + inset + yy, half * 2 - (i === 2 ? 2 : 0), 1, col[i]);
      }
    }
  }
}

// Fichier corrompu destructible (3 PV).
function drawDestructible(ctx, px, py, hp) {
  rect(ctx, px + 2, py + 1, 12, 14, '#1a1016');
  rect(ctx, px + 3, py + 2, 10, 12, '#e8e0e8');
  rect(ctx, px + 10, py + 2, 3, 3, '#a09aa8');
  const glitch = ['#f070b8', '#7fe8f0', '#78d05a'];
  for (let i = 0; i < 4; i++) rect(ctx, px + 4, py + 5 + i * 2, i % 2 ? 5 : 7, 1, '#8a8290');
  if (hp <= 2) {
    rect(ctx, px + 3, py + 6, 10, 1, glitch[0]);
    rect(ctx, px + 5, py + 10, 8, 1, glitch[1]);
  }
  if (hp <= 1) {
    rect(ctx, px + 3, py + 8, 6, 2, glitch[2]);
    rect(ctx, px + 8, py + 3, 1, 10, '#1a1016');
    rect(ctx, px + 6, py + 12, 7, 1, glitch[0]);
  }
}

const DOOR_COLORS = {
  normal: null,
  boss: '#b02838',
  treasure: '#e0b030',
  shop: '#50b060',
};

// Porte : state = 'open' | 'closed' | 'locked'
function drawDoor(ctx, dir, state, kind, theme, t) {
  const d = DIRS[dir];
  const px = d.tx * TILE;
  const py = d.ty * TILE;
  const frame = DOOR_COLORS[kind] || theme.frame;
  const horiz = dir === 'up' || dir === 'down';
  rect(ctx, px, py, TILE, TILE, '#000');
  rect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, frame);
  // Ouverture
  let ox, oy, ow, oh;
  if (dir === 'up') { ox = px + 3; oy = py + 3; ow = 10; oh = 13; }
  else if (dir === 'down') { ox = px + 3; oy = py; ow = 10; oh = 13; }
  else if (dir === 'left') { ox = px + 3; oy = py + 3; ow = 13; oh = 10; }
  else { ox = px; oy = py + 3; ow = 13; oh = 10; }
  rect(ctx, ox, oy, ow, oh, '#050308');
  if (state !== 'open') {
    rect(ctx, ox, oy, ow, oh, theme.wallDark);
    ctx.fillStyle = frame;
    if (horiz) for (let i = 1; i < ow; i += 3) ctx.fillRect(ox + i, oy, 1, oh);
    else for (let i = 1; i < oh; i += 3) ctx.fillRect(ox, oy + i, ow, 1);
  }
  if (state === 'locked') {
    const cx = px + 8;
    const cy = py + 8;
    rect(ctx, cx - 4, cy - 2, 8, 6, '#1a1016');
    rect(ctx, cx - 3, cy - 1, 6, 4, '#f8d048');
    rect(ctx, cx - 3, cy - 5, 6, 1, '#1a1016');
    rect(ctx, cx - 3, cy - 5, 1, 3, '#1a1016');
    rect(ctx, cx + 2, cy - 5, 1, 3, '#1a1016');
    rect(ctx, cx - 1, cy, 2, 2, '#1a1016');
  }
  if (kind === 'boss') {
    // Petites cornes
    const k = '#e8404a';
    if (dir === 'up') { rect(ctx, px, py + 1, 2, 4, k); rect(ctx, px + 14, py + 1, 2, 4, k); }
    if (dir === 'down') { rect(ctx, px, py + 11, 2, 4, k); rect(ctx, px + 14, py + 11, 2, 4, k); }
    if (dir === 'left') { rect(ctx, px + 1, py, 4, 2, k); rect(ctx, px + 1, py + 14, 4, 2, k); }
    if (dir === 'right') { rect(ctx, px + 11, py, 4, 2, k); rect(ctx, px + 11, py + 14, 4, 2, k); }
  }
  if (kind === 'treasure' && state === 'open') {
    const a = 0.5 + Math.sin(t * 4) * 0.3;
    ctx.save();
    ctx.globalAlpha = a;
    rect(ctx, ox + Math.floor(ow / 2) - 1, oy + Math.floor(oh / 2) - 1, 2, 2, '#f8d048');
    ctx.restore();
  }
}

function drawTrapdoor(ctx, x, y, t) {
  fillEllipse(ctx, x, y, 13, 8, '#1a1016');
  fillEllipse(ctx, x, y, 11, 6, '#6a4a8a');
  fillEllipse(ctx, x, y + 1, 10, 5, '#000');
  const a = 0.3 + Math.sin(t * 3) * 0.2;
  ctx.save();
  ctx.globalAlpha = a;
  fillEllipse(ctx, x, y + 1, 6, 2, '#a86ae8');
  ctx.restore();
  rect(ctx, x - 4, y - 1, 8, 1, '#3a2a4a');
  rect(ctx, x - 4, y + 2, 8, 1, '#3a2a4a');
}

// Contour de rectangle "arrondi" (coins retirés).
function roundOutline(ctx, x, y, w, h, t, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + t, y, w - 2 * t, t);
  ctx.fillRect(x + t, y + h - t, w - 2 * t, t);
  ctx.fillRect(x, y + t, t, h - 2 * t);
  ctx.fillRect(x + w - t, y + t, t, h - 2 * t);
}

// Trombone stylisé.
function drawPaperclip(ctx, x, y, w, h, t, color, shade) {
  x = Math.round(x);
  y = Math.round(y);
  roundOutline(ctx, x - 1, y - 1, w + 2, h + 2, 1, '#1a1016');
  roundOutline(ctx, x, y, w, h, t, color);
  const g = t + 2;
  // Boucle intérieure (ouverte en haut)
  ctx.fillStyle = shade;
  ctx.fillRect(x + g, y + g + 2, t, h - g * 2 - 2);
  ctx.fillRect(x + w - g - t, y + g, t, h - g * 2);
  ctx.fillRect(x + g, y + h - g - t, w - g * 2, t);
  // Tige centrale
  if (w >= 10) ctx.fillRect(x + Math.floor(w / 2) - Math.floor(t / 2), y + g + 4, t, h - g * 2 - 6);
}

// Orbe de bénédiction (Hadès).
function drawBoonOrb(ctx, x, y, color, glyph, t = 0, r = 7) {
  const glow = r + 2 + Math.sin(t * 4) * 1;
  ctx.save();
  ctx.globalAlpha = 0.3;
  fillEllipse(ctx, x, y, glow, glow, color);
  ctx.restore();
  fillEllipse(ctx, x, y, r, r, '#1a1016');
  fillEllipse(ctx, x, y, r - 1, r - 1, color);
  fillEllipse(ctx, x - 2, y - 2, Math.max(1, r - 5), Math.max(1, r - 5), 'rgba(255,255,255,0.6)');
  if (glyph) Font.draw(ctx, glyph, x + 1, y - 3, '#1a1016', { align: 'center' });
}
