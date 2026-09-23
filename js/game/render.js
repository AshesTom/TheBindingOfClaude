// Rendu des décors "16 bits" : sols texturés, murs en relief, lumière tramée,
// portes, rochers, papier déchiré et sous-sol des menus (façon Isaac).

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;

// Bruit déterministe par pixel.
function hash2(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// Quantifie une valeur 0..1 en paliers tramés (look 16 bits).
function dq(v, x, y, steps = 4) {
  return clamp(Math.floor(v * steps + bayer(x, y)) / steps, 0, 1);
}

function renderRoomBG(room, theme, opts = {}) {
  const c = document.createElement('canvas');
  c.width = ROOM_PX_W;
  c.height = ROOM_PX_H;
  const x = c.getContext('2d');
  const img = x.createImageData(ROOM_PX_W, ROOM_PX_H);
  const D = img.data;
  const seed = Math.floor(Math.random() * 1000);
  const fA = rgb(theme.floor);
  const fB = rgb(theme.floor2);
  const fDot = rgb(theme.floorDot);
  const wD = rgb(theme.wallDark);
  const wM = rgb(theme.wall);
  const wL = rgb(theme.wallLight);
  const black = [8, 4, 10];

  for (let py = 0; py < ROOM_PX_H; py++) {
    for (let px = 0; px < ROOM_PX_W; px++) {
      let col;
      const inX = px >= TILE && px < ROOM_PX_W - TILE;
      const inY = py >= TILE && py < ROOM_PX_H - TILE;
      if (inX && inY) {
        // ---- Sol
        const tx = Math.floor(px / TILE);
        const ty = Math.floor(py / TILE);
        const lx = px % TILE;
        const ly = py % TILE;
        col = (tx + ty) % 2 ? fB.slice() : fA.slice();
        const n = hash2(px, py, seed);
        if (theme.id === 1) {
          // Dalles de pierre usées
          if (n > 0.9) col = mixRgb(col, fDot, 0.7);
          else if (n < 0.08) col = mixRgb(col, black, 0.25);
          if (lx === 0 || ly === 0) col = mixRgb(col, fDot, 0.6);
          if (lx === 15 || ly === 15) col = mixRgb(col, black, 0.4);
          const crack = hash2(tx, ty, seed + 1);
          if (crack > 0.75 && Math.abs(lx - ly - Math.floor(crack * 8)) < 1 && lx > 3 && lx < 13) col = mixRgb(col, black, 0.5);
        } else if (theme.id === 2) {
          // Caillebotis métallique
          if (lx === 0 || ly === 0) col = mixRgb(col, fDot, 0.8);
          if (lx === 15 || ly === 15) col = mixRgb(col, black, 0.5);
          if ((lx === 4 || lx === 11) && ly > 2 && ly < 13) col = mixRgb(col, black, 0.35);
          if ((lx === 5 || lx === 12) && ly > 2 && ly < 13) col = mixRgb(col, fDot, 0.3);
          if (n > 0.97) col = mixRgb(col, [80, 200, 255], 0.3);
        } else {
          // Nébuleuse latente
          const neb = Math.sin(px * 0.05 + Math.sin(py * 0.07) * 2) * 0.5 + 0.5;
          col = mixRgb(col, [90, 40, 120], dq(neb * 0.45, px, py));
          if (n > 0.985) col = [230, 190, 255];
          else if (n > 0.96) col = mixRgb(col, [180, 120, 230], 0.5);
          if (lx === 0 || ly === 0) col = mixRgb(col, fDot, 0.4);
        }
        // Occlusion près des murs (tramée)
        const dEdge = Math.min(px - TILE, py - TILE, ROOM_PX_W - TILE - 1 - px, ROOM_PX_H - TILE - 1 - py);
        const dTop = py - TILE;
        if (dEdge < 12) col = mixRgb(col, black, dq((12 - dEdge) / 12, px, py) * 0.45);
        if (dTop < 6) col = mixRgb(col, black, dq((6 - dTop) / 6, px, py) * 0.35);
        // Vignette
        const vx = (px - ROOM_PX_W / 2) / (ROOM_PX_W / 2);
        const vy = (py - ROOM_PX_H / 2) / (ROOM_PX_H / 2);
        const v = clamp((vx * vx + vy * vy - 0.35) / 1.2, 0, 1);
        col = mixRgb(col, black, dq(v, px, py) * 0.35);
      } else {
        // ---- Murs : dégradé sombre (extérieur) -> clair (bord intérieur)
        let t;
        let dark = 1;
        if (!inY && py < TILE) t = py / (TILE - 1);
        else if (!inY) { t = (ROOM_PX_H - 1 - py) / (TILE - 1); dark = 0.7; }
        else t = 1;
        if (!inX) {
          const tx2 = px < TILE ? px / (TILE - 1) : (ROOM_PX_W - 1 - px) / (TILE - 1);
          t = Math.min(t, tx2);
          if (inY) dark = 0.85;
        }
        const q = dq(Math.pow(t, 1.3), px, py, 5);
        col = q < 0.5 ? mixRgb(wD, wM, q * 2) : mixRgb(wM, wL, (q - 0.5) * 2);
        col = mixRgb(black, col, dark);
        const n = hash2(px, py, seed + 7);
        if (theme.id === 1) {
          // Briques
          const row = Math.floor(py / 5);
          const off = row % 2 ? 5 : 0;
          if (py % 5 === 4) col = mixRgb(col, black, 0.45);
          else if ((px + off) % 10 === 0) col = mixRgb(col, black, 0.4);
          else if (py % 5 === 0) col = mixRgb(col, wL, 0.25);
          if (n > 0.92) col = mixRgb(col, black, 0.2);
        } else if (theme.id === 2) {
          // Baies de serveurs
          const along = inY ? py : px;
          const across = inY ? px : py;
          if (along % 16 === 0) col = mixRgb(col, black, 0.6);
          else if (along % 16 === 1) col = mixRgb(col, wL, 0.3);
          if (along % 3 === 0 && (across % 16) > 3 && (across % 16) < 12) col = mixRgb(col, black, 0.3);
        } else {
          // Cristaux
          const f = ((px + py) % 9 === 0) || ((px - py + 144) % 13 === 0);
          if (f) col = mixRgb(col, wL, 0.4);
          if (n > 0.97) col = [240, 120, 190];
        }
      }
      const i = (py * ROOM_PX_W + px) * 4;
      D[i] = col[0];
      D[i + 1] = col[1];
      D[i + 2] = col[2];
      D[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  // Rebords éclairés et contours
  rect(x, TILE - 1, TILE - 1, ROOM_PX_W - TILE * 2 + 2, 1, '#000');
  rect(x, TILE - 1, ROOM_PX_H - TILE, ROOM_PX_W - TILE * 2 + 2, 1, '#000');
  rect(x, TILE - 1, TILE - 1, 1, ROOM_PX_H - TILE * 2 + 2, '#000');
  rect(x, ROOM_PX_W - TILE, TILE - 1, 1, ROOM_PX_H - TILE * 2 + 2, '#000');
  rect(x, TILE - 1, TILE - 2, ROOM_PX_W - TILE * 2 + 2, 1, tone(theme.wallLight, 0.15));
  x.strokeStyle = '#000';
  x.lineWidth = 1;
  x.strokeRect(0.5, 0.5, ROOM_PX_W - 1, ROOM_PX_H - 1);

  // Diodes des serveurs
  if (theme.id === 2) {
    for (let i = 0; i < 60; i++) {
      const side = i % 4;
      let px;
      let py;
      if (side === 0) { px = randInt(2, 236); py = randInt(3, 12); }
      else if (side === 1) { px = randInt(2, 236); py = randInt(131, 140); }
      else if (side === 2) { px = randInt(3, 12); py = randInt(18, 124); }
      else { px = randInt(227, 236); py = randInt(18, 124); }
      rect(x, px, py, 1, 1, choice(['#6af06a', '#6af06a', '#f0a040', '#60c0ff']));
    }
  }

  // Rochers
  for (let ty = 0; ty < ROOM_H; ty++) {
    for (let tx = 0; tx < ROOM_W; tx++) {
      if (room.tiles[ty * ROOM_W + tx] === 2) drawRock(x, tx * TILE, ty * TILE, theme);
    }
  }

  // Texte au sol dans la salle de départ
  if (opts.tutorial) {
    const col = 'rgba(255,240,220,0.18)';
    Font.draw(x, 'ZQSD / WASD : SE DÉPLACER', 120, 34, col, { align: 'center' });
    Font.draw(x, 'FLÈCHES : TIRER', 120, 48, col, { align: 'center' });
    Font.draw(x, 'ESPACE : DASH', 72, 96, col, { align: 'center' });
    Font.draw(x, 'E : ARTEFACT', 168, 96, col, { align: 'center' });
    Font.draw(x, 'ÉCHAP : PAUSE', 120, 110, col, { align: 'center' });
  } else if (opts.label) {
    Font.draw(x, opts.label, 120, 108, 'rgba(255,240,220,0.14)', { align: 'center' });
  }
  return c;
}

function drawRock(x, px, py, t) {
  // Ombre portée
  x.save();
  x.globalAlpha = 0.45;
  fillEllipse(x, px + 9, py + 13, 7, 3, '#000');
  x.restore();
  if (t.id === 1) {
    fillEllipse(x, px + 8, py + 8, 7, 7, '#140c10');
    fillEllipse(x, px + 8, py + 8, 6, 6, '#4a3e50');
    fillEllipse(x, px + 7, py + 7, 5, 5, '#6a5c72');
    fillEllipse(x, px + 6, py + 6, 3, 3, '#8e8098');
    rect(x, px + 4, py + 4, 2, 1, '#c8bcd0');
    rect(x, px + 4, py + 5, 1, 1, '#c8bcd0');
    rect(x, px + 9, py + 10, 3, 1, '#2e2434');
    rect(x, px + 10, py + 6, 1, 3, '#3a2e40');
    rect(x, px + 3, py + 10, 2, 1, '#5a4c62');
  } else if (t.id === 2) {
    rect(x, px + 1, py + 1, 14, 14, '#05080c');
    rect(x, px + 2, py + 2, 12, 12, '#2c3a4e');
    rect(x, px + 2, py + 2, 12, 1, '#7c96b8');
    rect(x, px + 2, py + 2, 1, 12, '#5a7090');
    rect(x, px + 13, py + 3, 1, 11, '#18202c');
    rect(x, px + 3, py + 13, 11, 1, '#18202c');
    for (let i = 0; i < 3; i++) {
      rect(x, px + 4, py + 5 + i * 3, 7, 1, '#141c28');
      rect(x, px + 4, py + 6 + i * 3, 7, 1, '#46586e');
      rect(x, px + 11, py + 5 + i * 3, 1, 1, i === 1 ? '#f04040' : '#6af06a');
    }
  } else {
    const shades = ['#12061e', '#5a2a8a', '#8a4ac0', '#b878f0', '#f0d0ff'];
    const shard = (cx, h, w) => {
      for (let yy = 0; yy < h; yy++) {
        const half = Math.max(1, Math.round((yy < h * 0.35 ? yy / (h * 0.35) : (h - yy) / (h * 0.65)) * w));
        rect(x, px + cx - half, py + 15 - h + yy, half * 2, 1, shades[0]);
        if (half > 1) {
          rect(x, px + cx - half + 1, py + 15 - h + yy, half - 1, 1, shades[3]);
          rect(x, px + cx, py + 15 - h + yy, half - 1, 1, shades[1]);
        }
      }
      rect(x, px + cx - 1, py + 16 - h + 1, 1, 2, shades[4]);
    };
    shard(5, 10, 3);
    shard(11, 12, 3);
    shard(8, 15, 4);
  }
}

// Fichier corrompu destructible (3 PV).
function drawDestructible(ctx, px, py, hp) {
  ctx.save();
  ctx.globalAlpha = 0.4;
  fillEllipse(ctx, px + 9, py + 14, 6, 2, '#000');
  ctx.restore();
  rect(ctx, px + 2, py + 1, 12, 14, '#1a1016');
  rect(ctx, px + 3, py + 2, 10, 12, '#f0e8f0');
  rect(ctx, px + 3, py + 2, 1, 12, '#ffffff');
  rect(ctx, px + 12, py + 5, 1, 9, '#b8b0c0');
  rect(ctx, px + 3, py + 13, 10, 1, '#b8b0c0');
  rect(ctx, px + 10, py + 2, 3, 3, '#a09aa8');
  rect(ctx, px + 10, py + 2, 1, 3, '#1a1016');
  rect(ctx, px + 10, py + 4, 3, 1, '#1a1016');
  for (let i = 0; i < 4; i++) rect(ctx, px + 5, py + 5 + i * 2, i % 2 ? 4 : 6, 1, '#8a8290');
  const glitch = ['#f070b8', '#7fe8f0', '#78d05a'];
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
  const fL = tone(frame, 0.18);
  const fD = tone(frame, -0.2);
  const horiz = dir === 'up' || dir === 'down';
  rect(ctx, px - 1, py - 1, TILE + 2, TILE + 2, '#000');
  rect(ctx, px, py, TILE, TILE, fD);
  rect(ctx, px + 1, py + 1, TILE - 2, TILE - 2, frame);
  rect(ctx, px + 1, py + 1, TILE - 2, 1, fL);
  rect(ctx, px + 1, py + 1, 1, TILE - 2, fL);
  // Ouverture
  let ox, oy, ow, oh;
  if (dir === 'up') { ox = px + 3; oy = py + 3; ow = 10; oh = 13; }
  else if (dir === 'down') { ox = px + 3; oy = py; ow = 10; oh = 13; }
  else if (dir === 'left') { ox = px + 3; oy = py + 3; ow = 13; oh = 10; }
  else { ox = px; oy = py + 3; ow = 13; oh = 10; }
  rect(ctx, ox, oy, ow, oh, '#000');
  if (state === 'open') {
    // Profondeur : lumière de la salle voisine, tramée
    for (let j = 0; j < oh; j++) {
      for (let i = 0; i < ow; i++) {
        let depth;
        if (dir === 'up') depth = j / oh;
        else if (dir === 'down') depth = 1 - j / oh;
        else if (dir === 'left') depth = i / ow;
        else depth = 1 - i / ow;
        if (depth > 0.55 && bayer(i, j) < (depth - 0.55) * 1.6) {
          ctx.fillStyle = kind === 'treasure' ? '#6a5010' : kind === 'boss' ? '#3a0810' : theme.wallDark;
          ctx.fillRect(ox + i, oy + j, 1, 1);
        }
      }
    }
    if (kind === 'treasure') {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.sin(t * 4) * 0.3;
      rect(ctx, ox + Math.floor(ow / 2) - 1, oy + Math.floor(oh / 2) - 1, 2, 2, '#f8d048');
      ctx.restore();
    }
  } else {
    rect(ctx, ox, oy, ow, oh, theme.wallDark);
    if (horiz) {
      for (let i = 1; i < ow; i += 3) {
        rect(ctx, ox + i, oy, 1, oh, fL);
        rect(ctx, ox + i + 1, oy, 1, oh, fD);
      }
    } else {
      for (let i = 1; i < oh; i += 3) {
        rect(ctx, ox, oy + i, ow, 1, fL);
        rect(ctx, ox, oy + i + 1, ow, 1, fD);
      }
    }
  }
  if (state === 'locked') {
    const cx = px + 8;
    const cy = py + 8;
    rect(ctx, cx - 4, cy - 2, 8, 6, '#1a1016');
    rect(ctx, cx - 3, cy - 1, 6, 4, '#f8d048');
    rect(ctx, cx - 3, cy - 1, 6, 1, '#fff0a0');
    rect(ctx, cx - 3, cy + 2, 6, 1, '#b88a20');
    rect(ctx, cx - 3, cy - 5, 6, 1, '#1a1016');
    rect(ctx, cx - 3, cy - 5, 1, 3, '#1a1016');
    rect(ctx, cx + 2, cy - 5, 1, 3, '#1a1016');
    rect(ctx, cx - 1, cy, 2, 2, '#1a1016');
  }
  if (kind === 'boss') {
    // Cornes
    const k = '#e8404a';
    const kd = '#801828';
    if (dir === 'up') { rect(ctx, px - 1, py, 2, 5, k); rect(ctx, px + 15, py, 2, 5, k); rect(ctx, px - 1, py + 4, 2, 1, kd); rect(ctx, px + 15, py + 4, 2, 1, kd); }
    if (dir === 'down') { rect(ctx, px - 1, py + 11, 2, 5, k); rect(ctx, px + 15, py + 11, 2, 5, k); }
    if (dir === 'left') { rect(ctx, px, py - 1, 5, 2, k); rect(ctx, px, py + 15, 5, 2, k); }
    if (dir === 'right') { rect(ctx, px + 11, py - 1, 5, 2, k); rect(ctx, px + 11, py + 15, 5, 2, k); }
  }
}

// ---------------------------------------------------------------------------
// Éléments de menus façon Isaac

const paperCache = new Map();

// Feuille de papier aux bords déchirés.
function paperCanvas(w, h, seed = 1, tint = 'paper') {
  const key = w + 'x' + h + ':' + seed + ':' + tint;
  if (paperCache.has(key)) return paperCache.get(key);
  const c = document.createElement('canvas');
  c.width = w + 3;
  c.height = h + 3;
  const x = c.getContext('2d');
  const base = tint === 'dark' ? rgb('#2e2018') : tint === 'red' ? rgb('#e8c8a8') : rgb('#e8d4a8');
  const shadow = [0, 0, 0];
  const edgeT = [];
  const edgeB = [];
  const edgeL = [];
  const edgeR = [];
  for (let i = 0; i < w; i++) {
    edgeT.push(Math.floor(hash2(i >> 1, 1, seed) * 3));
    edgeB.push(Math.floor(hash2(i >> 1, 2, seed) * 3));
  }
  for (let j = 0; j < h; j++) {
    edgeL.push(Math.floor(hash2(3, j >> 1, seed) * 3));
    edgeR.push(Math.floor(hash2(4, j >> 1, seed) * 3));
  }
  const inside = (i, j) => i >= 0 && j >= 0 && i < w && j < h && j >= edgeT[i] && j < h - edgeB[i] && i >= edgeL[j] && i < w - edgeR[j];
  const img = x.createImageData(w + 3, h + 3);
  const D = img.data;
  const put = (i, j, col, a = 255) => {
    const k = (j * (w + 3) + i) * 4;
    D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = a;
  };
  // Ombre portée
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (inside(i, j)) put(i + 3, j + 3, shadow, 110);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      if (!inside(i, j)) continue;
      let col = base.slice();
      const n = hash2(i, j, seed + 5);
      if (n > 0.93) col = mixRgb(col, [150, 110, 60], 0.25);
      else if (n < 0.05) col = mixRgb(col, [255, 250, 230], 0.4);
      // Taches de café
      const s1 = Math.hypot(i - w * 0.86, j - h * 0.2) / Math.min(12, Math.min(w, h) * 0.2);
      if (s1 < 1 && s1 > 0.82) col = mixRgb(col, [140, 90, 50], 0.18);
      // Bords assombris
      const e = Math.min(i - edgeL[j], w - edgeR[j] - 1 - i, j - edgeT[i], h - edgeB[i] - 1 - j);
      if (e < 4) col = mixRgb(col, [120, 80, 40], dq((4 - e) / 4, i, j) * 0.35);
      if (!inside(i - 1, j) || !inside(i + 1, j) || !inside(i, j - 1) || !inside(i, j + 1)) col = tint === 'dark' ? [20, 12, 8] : [90, 58, 32];
      put(i, j, col);
    }
  }
  x.putImageData(img, 0, 0);
  paperCache.set(key, c);
  return c;
}

function drawPaper(ctx, x, y, w, h, seed = 1, tint = 'paper') {
  ctx.drawImage(paperCanvas(w, h, seed, tint), Math.round(x), Math.round(y));
}

const INK = '#3a2418';
const INK_RED = '#a8281c';
const INK_SOFT = '#7a5a3a';

// Sélection à l'encre rouge : flèche + soulignement ondulé.
function drawScribble(ctx, cx, cy, w, t) {
  ctx.fillStyle = INK_RED;
  const x0 = Math.round(cx - w / 2 - 1);
  const ph = t * 12;
  for (let i = 0; i < w + 2; i++) {
    const oy = Math.round(Math.sin((i + ph) * 0.6));
    ctx.fillRect(x0 + i, Math.round(cy + 6 + oy), 1, 1);
  }
  const bump = Math.floor(t * 4) % 2;
  Font.draw(ctx, '>', x0 - 9 - bump, cy - 3, INK_RED);
}

// Sous-sol sombre (fond des menus).
let basementCache = null;
function drawBasement(ctx, t) {
  if (!basementCache) {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const x = c.getContext('2d');
    const img = x.createImageData(W, H);
    const D = img.data;
    const a = rgb('#3a2a22');
    const b = rgb('#33241e');
    const dot = rgb('#4e3a2e');
    const black = [6, 3, 4];
    for (let py = 0; py < H; py++) {
      for (let px = 0; px < W; px++) {
        const tx = Math.floor(px / 20);
        const ty = Math.floor(py / 20);
        const lx = px % 20;
        const ly = py % 20;
        let col = (tx + ty) % 2 ? a.slice() : b.slice();
        const n = hash2(px, py, 3);
        if (n > 0.9) col = mixRgb(col, dot, 0.7);
        else if (n < 0.06) col = mixRgb(col, black, 0.3);
        if (lx === 0 || ly === 0) col = mixRgb(col, dot, 0.5);
        if (lx === 19 || ly === 19) col = mixRgb(col, black, 0.5);
        const vx = (px - W / 2) / (W / 2);
        const vy = (py - H * 0.55) / (H / 2);
        const v = clamp((vx * vx + vy * vy - 0.15) / 1.1, 0, 1);
        col = mixRgb(col, black, dq(v, px, py, 6) * 0.92);
        const k = (py * W + px) * 4;
        D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0);
    basementCache = c;
  }
  ctx.drawImage(basementCache, 0, 0);
  // Poussière qui flotte dans la lumière
  for (let i = 0; i < 24; i++) {
    const x = (hash2(i, 1) * W + t * (4 + hash2(i, 2) * 6)) % W;
    const y = (hash2(i, 3) * H + Math.sin(t * 0.7 + i) * 6 + H) % H;
    ctx.globalAlpha = 0.25 + hash2(i, 4) * 0.4;
    rect(ctx, x, y, 1, 1, '#f0d8b0');
  }
  ctx.globalAlpha = 1;
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
