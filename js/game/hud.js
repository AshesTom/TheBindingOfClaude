// HUD façon Rebirth : objet actif, cœurs, compteurs, stats, mini-carte, barre de boss.

function drawHearts(ctx, p, x, y) {
  let i = 0;
  const pos = (k) => [x + (k % 6) * 12, y + Math.floor(k / 6) * 11];
  const full = Math.floor(p.hearts / 2);
  const half = p.hearts % 2;
  const cont = Math.ceil(p.maxHearts / 2);
  for (let k = 0; k < cont; k++) {
    const [hx, hy] = pos(i++);
    let s = 'hud_heartEmpty';
    if (k < full) s = 'heart';
    else if (k === full && half) s = 'hud_heartHalf';
    ctx.drawImage(spr(s), hx, hy);
  }
  const sf = Math.floor(p.soul / 2);
  for (let k = 0; k < sf; k++) {
    const [hx, hy] = pos(i++);
    ctx.drawImage(spr('soul'), hx, hy);
  }
  if (p.soul % 2) {
    const [hx, hy] = pos(i++);
    ctx.drawImage(spr('soulHalf'), hx, hy);
  }
}

function drawHUD(ctx, s) {
  const p = s.player;
  if (!p) return;
  // Objet actif
  if (p.active) {
    darkBox(ctx, 3, 3, 26, 26);
    const it = ITEMS[p.active.id];
    const ready = p.active.charge >= p.active.max;
    drawAt(ctx, 'item_' + p.active.id, 15, 25, { tint: ready && Math.floor(s.t * 3) % 2 ? '#ffffff' : null, tintA: 0.25 });
    // barre de charge segmentée
    const bh = 22;
    ctx.fillStyle = '#000';
    ctx.fillRect(30, 4, 5, bh + 2);
    const segH = bh / p.active.max;
    for (let k = 0; k < p.active.max; k++) {
      const y0 = 5 + bh - (k + 1) * segH;
      ctx.fillStyle = k < p.active.charge ? (ready ? '#f0e060' : '#60c060') : '#2a2a2a';
      ctx.fillRect(31, Math.round(y0) + 1, 3, Math.max(1, Math.round(segH) - 1));
    }
    void it;
  }
  drawHearts(ctx, p, 40, 5);
  // Compteurs
  const cy = 40;
  drawAt(ctx, 'coin_0', 10, cy + 10, { sx: 0.8, sy: 0.8 });
  Font.draw(ctx, pad2(p.coins), 18, cy + 2, '#f4ecd8', { outline: '#000' });
  drawAt(ctx, 'bomb', 10, cy + 24, { sx: 0.7, sy: 0.7 });
  Font.draw(ctx, pad2(p.bombs), 18, cy + 15, '#f4ecd8', { outline: '#000' });
  drawAt(ctx, 'key', 10, cy + 37, { sx: 0.7, sy: 0.7 });
  Font.draw(ctx, pad2(p.keys), 18, cy + 28, '#f4ecd8', { outline: '#000' });
  // Stats (façon Afterbirth+)
  const st = [
    ['Vit', (p.speedMul()).toFixed(2)],
    ['Cad', p.fireRate().toFixed(2)],
    ['Dég', p.dmg().toFixed(2)],
    ['Por', (p.range() / 40).toFixed(2)],
    ['Cha', String(p.s.luck)],
  ];
  st.forEach(([k, v], i) => {
    Font.draw(ctx, k, 4, 96 + i * 11, '#b8a890', { outline: '#000' });
    Font.draw(ctx, v, 24, 96 + i * 11, '#f4ecd8', { outline: '#000' });
  });
  if (s.dungeon) drawMinimap(ctx, s);
  // Barre de boss
  const bosses = s.enemies.filter((e) => e.isBoss && !e.dead);
  if (bosses.length && s.bossMax) {
    const hp = bosses.reduce((a, b) => a + Math.max(0, b.hp), 0);
    const k = clamp(hp / s.bossMax, 0, 1);
    const bw = 180;
    const bx = (W - bw) / 2;
    const by = H - 14;
    darkBox(ctx, bx - 4, by - 4, bw + 8, 12);
    bar(ctx, bx, by, bw, 4, k, '#c02020', '#3a0a0a');
    Font.draw(ctx, s.bossName || bosses[0].name, W / 2, by - 13, '#f4ecd8', { align: 'center', outline: '#000' });
  }
}

const MM = { w: 9, h: 7 };
function drawMinimap(ctx, s, big = false) {
  const d = s.dungeon;
  const cur = s.roomData;
  const cw = big ? 18 : MM.w;
  const ch = big ? 14 : MM.h;
  const areaW = big ? 300 : 84;
  const areaH = big ? 190 : 56;
  const ax = big ? (W - areaW) / 2 : W - areaW - 4;
  const ay = big ? (H - areaH) / 2 : 4;
  darkBox(ctx, ax, ay, areaW, areaH);
  const ox = ax + areaW / 2 - (cur.gx + 0.5) * (cw + 1);
  const oy = ay + areaH / 2 - (cur.gy + 0.5) * (ch + 1);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ax + 1, ay + 1, areaW - 2, areaH - 2);
  ctx.clip();
  for (const r of d.rooms.values()) {
    const show = r.visited || r.seen;
    if (!show) continue;
    const x = Math.round(ox + r.gx * (cw + 1));
    const y = Math.round(oy + r.gy * (ch + 1));
    let col = r.visited ? '#b8b0a4' : '#4a4440';
    if (r === cur) col = '#ffffff';
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, cw + 2, ch + 2);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, cw, ch);
    const icon = {
      boss: '#c02020', treasure: '#f0c030', shop: '#60c060', secret: '#8a8aff', offer: '#ff3050', ally: '#60a0ff',
    }[r.type];
    if (icon) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x + cw / 2 - 2, y + ch / 2 - 2, 4, 4);
      ctx.fillStyle = icon;
      ctx.fillRect(x + cw / 2 - 1.5, y + ch / 2 - 1.5, 3, 3);
    }
  }
  ctx.restore();
  if (big) Font.draw(ctx, s.fl.name, W / 2, ay - 12, '#f4ecd8', { align: 'center', outline: '#000' });
}
