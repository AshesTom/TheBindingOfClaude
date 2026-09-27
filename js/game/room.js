// Salle en cours : obstacles (grille 13 x 7), collisions, taches persistantes au sol.

function buildCells(layout) {
  const cells = [];
  for (let gy = 0; gy < GH; gy++) {
    const row = [];
    for (let gx = 0; gx < GW; gx++) {
      const ch = layout[gy][gx];
      let c = null;
      if (ch === 'r') c = { t: 'rock', v: randInt(0, 2) };
      else if (ch === 't') c = { t: 'tinted' };
      else if (ch === 'p') c = { t: 'poop', hp: 4 };
      else if (ch === 'b') c = { t: 'block' };
      else if (ch === 'f') c = { t: 'fire', hp: 4, blue: Math.random() < 0.1 };
      else if (ch === 's') c = { t: 'spikes' };
      else if (ch === 'o') c = { t: 'pit' };
      row.push(c);
    }
    cells.push(row);
  }
  // Les cases devant les portes restent libres
  for (const d of DIR_NAMES) {
    const [gx, gy] = DIRS[d].cell;
    cells[gy][gx] = null;
  }
  return cells;
}

// Garantit qu'on peut rejoindre chaque porte : sinon on dégage une ligne vers le centre.
function ensurePaths(cells) {
  const seen = new Set();
  const q = [[6, 3]];
  const free = (x, y) => {
    const c = cells[y][x];
    return !c || c.t === 'spikes';
  };
  if (!free(6, 3)) cells[3][6] = null;
  seen.add('6,3');
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of NB) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const k = nx + ',' + ny;
      if (seen.has(k) || !free(nx, ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  for (const d of DIR_NAMES) {
    const [gx, gy] = DIRS[d].cell;
    if (seen.has(gx + ',' + gy)) continue;
    let x = gx;
    let y = gy;
    while (x !== 6 || y !== 3) {
      if (cells[y][x] && cells[y][x].t !== 'spikes') cells[y][x] = null;
      if (x !== 6) x += Math.sign(6 - x);
      else y += Math.sign(3 - y);
    }
  }
}

class Room {
  constructor(data, fl) {
    this.data = data;
    this.fl = fl;
    if (!data.cells) {
      data.cells = buildCells(data.layout);
      ensurePaths(data.cells);
    }
    this.cells = data.cells;
    if (!data.decals) data.decals = mkCanvas(W, H);
    this.decals = data.decals;
    this.dg = this.decals.getContext('2d');
    this.bg = paintRoomBG(fl, data.bg);
    this.flow = null;
  }

  cell(gx, gy) {
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return { t: 'wall' };
    return this.cells[gy][gx];
  }

  // who : walk | fly | tear
  solid(gx, gy, who = 'walk') {
    const c = this.cell(gx, gy);
    if (!c) return false;
    if (c.t === 'wall') return true;
    if (c.t === 'spikes' || c.t === 'ember') return false;
    if (who === 'fly') return false;
    if (c.t === 'pit' && who === 'tear') return false;
    return true;
  }

  // Un cercle de rayon r en (x, y) chevauche-t-il un obstacle ?
  overlaps(x, y, r, who = 'walk') {
    const x0 = toGX(x - r);
    const x1 = toGX(x + r - 0.01);
    const y0 = toGY(y - r);
    const y1 = toGY(y + r - 0.01);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) continue;
        if (this.solid(gx, gy, who)) return { gx, gy };
      }
    }
    return null;
  }

  // Déplacement avec collisions : on glisse le long des obstacles.
  move(e, dx, dy, who = 'walk') {
    let hit = false;
    const r = e.r;
    if (dx) {
      e.x += dx;
      const o = who === 'fly' ? null : this.overlaps(e.x, e.y, r, who);
      if (o) {
        hit = true;
        if (dx > 0) e.x = FX + o.gx * TILE - r - 0.01;
        else e.x = FX + (o.gx + 1) * TILE + r + 0.01;
      }
    }
    if (dy) {
      e.y += dy;
      const o = who === 'fly' ? null : this.overlaps(e.x, e.y, r, who);
      if (o) {
        hit = true;
        if (dy > 0) e.y = FY + o.gy * TILE - r - 0.01;
        else e.y = FY + (o.gy + 1) * TILE + r + 0.01;
      }
    }
    const x0 = e.x;
    const y0 = e.y;
    e.x = clamp(e.x, FX + r, FX2 - r);
    e.y = clamp(e.y, FY + r, FY2 - r);
    if (e.x !== x0 || e.y !== y0) hit = true;
    return hit;
  }

  // Dégât d'un tir sur une case (tas et feux). Renvoie true si le tir est arrêté.
  hitCell(gx, gy, dmg) {
    const c = this.cell(gx, gy);
    if (!c || c.t === 'spikes' || c.t === 'ember' || c.t === 'pit') return false;
    if (c.t === 'wall') return true;
    if (c.t === 'poop' || c.t === 'fire') {
      c.hit = (c.hit || 0) + dmg;
      if (c.hit >= 3.5) {
        c.hit = 0;
        c.hp--;
        const x = cellX(gx);
        const y = cellY(gy);
        if (c.t === 'poop') {
          Sound.play('poop');
          Particles.burst(x, y, ['#e8e0d0', '#c8c0b0', '#8a8070'], 5, { decal: false });
          if (c.hp <= 0) {
            this.cells[gy][gx] = null;
            if (G && G.onCellDestroyed) G.onCellDestroyed(c, x, y);
          }
        } else {
          Sound.play('fire');
          Particles.puff(x, y - 8, '#6a6a6a', 4);
          if (c.hp <= 0) this.cells[gy][gx] = { t: 'ember' };
        }
      }
      return true;
    }
    return true;
  }

  // Explosion : détruit rochers, tas et feux dans le rayon.
  blast(x, y, radius) {
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const c = this.cells[gy][gx];
        if (!c || c.t === 'block' || c.t === 'spikes' || c.t === 'ember' || c.t === 'pit') continue;
        if (dist(x, y, cellX(gx), cellY(gy)) > radius + 12) continue;
        const cx = cellX(gx);
        const cy = cellY(gy);
        if (c.t === 'fire') this.cells[gy][gx] = { t: 'ember' };
        else this.cells[gy][gx] = null;
        Particles.burst(cx, cy, [shade(this.fl.wall, 0.1), shade(this.fl.wall, -0.2)], 8, { decal: false });
        this.decal(cx, cy + 4, '#000000', 6, 0.15);
        if (G && G.onCellDestroyed) G.onCellDestroyed(c, cx, cy);
      }
    }
    this.flow = null;
  }

  // Tache au sol persistante (sang, huile, brûlure…).
  decal(x, y, color, size = 2, alpha = 0.8) {
    const g = this.dg;
    g.globalAlpha = alpha;
    g.fillStyle = color;
    if (size <= 2) g.fillRect(Math.round(x), Math.round(y), size, size);
    else {
      const p = new Pix(g);
      p.ell(x, y, size, size * 0.6, color);
    }
    g.globalAlpha = 1;
  }

  splat(x, y, color, n = 6, rad = 10) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const d = Math.random() * rad;
      this.decal(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, color, randInt(1, 4), 0.7);
    }
  }

  // Carte des distances vers une case cible (pour que les ennemis contournent les obstacles).
  flowTo(tx, ty) {
    tx = clamp(tx, 0, GW - 1);
    ty = clamp(ty, 0, GH - 1);
    if (this.flow && this.flow.tx === tx && this.flow.ty === ty) return this.flow;
    const d = new Int16Array(GW * GH).fill(999);
    d[ty * GW + tx] = 0;
    const q = [[tx, ty]];
    while (q.length) {
      const [x, y] = q.shift();
      const cd = d[y * GW + x];
      for (const [dx, dy] of NB) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        if (this.solid(nx, ny)) continue;
        const c = this.cell(nx, ny);
        const cost = c && c.t === 'spikes' ? 3 : 1;
        if (d[ny * GW + nx] > cd + cost) {
          d[ny * GW + nx] = cd + cost;
          q.push([nx, ny]);
        }
      }
    }
    this.flow = { tx, ty, d };
    return this.flow;
  }

  // Direction conseillée pour aller de (x, y) vers la cible du champ de flux.
  flowDir(x, y) {
    const f = this.flow;
    if (!f) return null;
    const gx = toGX(x);
    const gy = toGY(y);
    if (gx === f.tx && gy === f.ty) return null;
    let best = null;
    let bd = gx >= 0 && gy >= 0 && gx < GW && gy < GH ? f.d[gy * GW + gx] : 999;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      if (dx && dy && (this.solid(gx + dx, gy) || this.solid(gx, gy + dy))) continue;
      const v = f.d[ny * GW + nx] + (dx && dy ? 0.4 : 0);
      if (v < bd) { bd = v; best = [nx, ny]; }
    }
    if (!best) return null;
    return norm(cellX(best[0]) - x, cellY(best[1]) - y);
  }

  drawFloor(ctx) {
    ctx.drawImage(this.bg, 0, 0);
    ctx.drawImage(this.decals, 0, 0);
    // éléments plats (pics, braises)
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const c = this.cells[gy][gx];
        if (!c) continue;
        if (c.t === 'spikes') ctx.drawImage(spr('spikes'), FX + gx * TILE, FY + gy * TILE);
        if (c.t === 'pit') ctx.drawImage(spr('pit'), FX + gx * TILE - 1, FY + gy * TILE - 1);
        if (c.t === 'ember') {
          drawAt(ctx, 'brazier', cellX(gx), FY + (gy + 1) * TILE - 4);
        }
      }
    }
  }

  // Ajoute les obstacles « debout » à la liste de dessin triée par y.
  pushDrawables(list, t) {
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const c = this.cells[gy][gx];
        if (!c || c.t === 'spikes' || c.t === 'ember' || c.t === 'pit') continue;
        const x = cellX(gx);
        const y = FY + (gy + 1) * TILE;
        const fl = this.fl;
        list.push({
          y: y - 2,
          draw: (ctx) => {
            if (c.t === 'rock') drawAt(ctx, `rock_${fl.rock}_${c.v || 0}`, x, y + 1);
            else if (c.t === 'tinted') drawAt(ctx, `tinted_${fl.rock}`, x, y + 1);
            else if (c.t === 'poop') drawAt(ctx, `poop_${fl.poop}_${Math.max(1, c.hp)}`, x, y);
            else if (c.t === 'block') drawAt(ctx, 'block', x, y + 1);
            else if (c.t === 'fire') {
              drawAt(ctx, 'brazier', x, y - 4);
              const f = Math.floor(t * 10 + gx) % 3;
              const sc = 0.5 + (c.hp / 4) * 0.5;
              drawAt(ctx, `flame${c.blue ? 'B' : ''}_${f}`, x, y - 8, { sx: sc, sy: sc });
            }
          },
        });
      }
    }
  }
}
