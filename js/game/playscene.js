// Base commune au Refuge et aux runs : entités, collisions, dessin trié en profondeur,
// secousses, dialogues.

class PlayScene {
  constructor() {
    G = this;
    this.enemies = [];
    this.tears = [];
    this.bullets = [];
    this.pickups = [];
    this.misc = [];
    this.fams = [];
    this.npcs = [];
    this.t = 0;
    this.shakeA = 0;
    this.flashT = 0;
    this.dialog = null;
    this.menu = null;
    this.narr = null;
    this.player = null;
    this.room = null;
    this.floorIdx = 0;
    this.timeScaleEnemies = 1;
    Particles.clear();
    Particles.decalTarget = (x, y, c, s) => {
      if (this.room && x > FX && x < FX2 && y > FY && y < FY2) this.room.decal(x, y, c, s, 0.7);
    };
  }

  shake(a) {
    this.shakeA = Math.max(this.shakeA, a);
  }

  nearestEnemy(x, y, maxD = 9999) {
    let best = null;
    let bd = maxD;
    for (const e of this.enemies) {
      if (e.dead || e.spawning > 0 || e.untargetable || e.isSeg) continue;
      const d = dist(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  spawnEnemy(type, x, y, o = {}) {
    const e = new Enemy(type, x, y, o);
    if (o.jitter) { e.x += rand(-8, 8); e.y += rand(-8, 8); }
    this.enemies.push(e);
    if (!o.noSpawn) Particles.puff(x, y, '#3a2a2a', 4);
    return e;
  }

  onEnemyKilled() {}
  onCellDestroyed() {}

  movePlayer(p, dx, dy) {
    this.room.move(p, dx, dy, p.s.flight ? 'fly' : 'walk');
    // Les PNJ « solides » repoussent Claude
    for (const n of this.npcs) {
      if (!n.solidR || n.hidden) continue;
      const d = dist(p.x, p.y, n.x, n.y);
      const m = n.solidR + p.r;
      if (d < m) {
        const k = d > 0.01 ? norm(p.x - n.x, p.y - n.y) : { x: 0, y: 1 };
        this.room.move(p, k.x * (m - d), k.y * (m - d), 'walk');
      }
    }
  }

  startDialog(lines, onEnd) {
    this.dialog = new Dialog(lines, () => {
      this.dialog = null;
      if (onEnd) onEnd();
    });
  }

  narrate(text, who) {
    this.narr = new Narration(text, { who });
  }

  updateEntities(dt) {
    const upd = (arr) => {
      for (const e of arr) e.update(dt, this);
      for (let i = arr.length - 1; i >= 0; i--) if (arr[i].dead) arr.splice(i, 1);
    };
    upd(this.tears);
    upd(this.enemies);
    upd(this.bullets);
    upd(this.pickups);
    upd(this.misc);
    upd(this.fams);
    upd(this.npcs);
    // Les ennemis se repoussent un peu entre eux
    const E = this.enemies;
    for (let i = 0; i < E.length; i++) {
      const a = E[i];
      if (a.isBoss || a.isSeg || a.z > 0) continue;
      for (let j = i + 1; j < E.length; j++) {
        const b = E[j];
        if (b.isBoss || b.isSeg || b.z > 0 || a.flying !== b.flying) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const m = a.r + b.r - 2;
        if (d < m && d > 0.01) {
          const n = norm(b.x - a.x, b.y - a.y);
          const push = (m - d) * 0.5;
          if (!a.heavy) a.step(-n.x * push, -n.y * push);
          if (!b.heavy) b.step(n.x * push, n.y * push);
        }
      }
    }
    // Les ramassables se poussent aussi (façon Isaac)
    const P = this.pickups;
    for (let i = 0; i < P.length; i++) {
      for (let j = i + 1; j < P.length; j++) {
        const a = P[i];
        const b = P[j];
        if (a.price || b.price) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        if (d < 9 && d > 0.01) {
          const n = norm(b.x - a.x, b.y - a.y);
          a.x -= n.x * 0.5; a.y -= n.y * 0.5;
          b.x += n.x * 0.5; b.y += n.y * 0.5;
        }
      }
    }
    Particles.update(dt);
  }

  // Dessin du monde (sans HUD) sur un contexte donné.
  drawWorld(ctx) {
    this.room.drawFloor(ctx);
    this.drawDoors(ctx);
    const list = [];
    this.room.pushDrawables(list, this.t);
    const add = (arr, off = 0) => {
      for (const e of arr) list.push({ y: e.y + off, draw: (c) => e.draw(c, this.t) });
    };
    for (const m of this.misc) {
      if (m.flat) m.draw(ctx, this.t);
      else list.push({ y: m.y, draw: (c) => m.draw(c, this.t) });
    }
    add(this.pickups, -1);
    for (const n of this.npcs) if (n.flat) n.draw(ctx, this.t);
    add(this.npcs.filter((n) => !n.flat));
    add(this.enemies);
    add(this.fams);
    if (this.player) list.push({ y: this.player.y, draw: (c) => this.player.draw(c) });
    add(this.tears, 2);
    add(this.bullets, 2);
    list.sort((a, b) => a.y - b.y);
    for (const d of list) d.draw(ctx);
    Particles.draw(ctx);
    ctx.drawImage(spr('vignette'), 0, 0);
    const n = !this.dialog && !this.menu ? this.talkable() : null;
    if (n) n.drawPrompt(ctx);
  }

  drawDoors() {}

  // Cadre commun : secousse, flash, HUD, overlays.
  render(ctx, drawHudFn) {
    ctx.save();
    if (this.shakeA > 0.2) ctx.translate(Math.round(rand(-this.shakeA, this.shakeA)), Math.round(rand(-this.shakeA, this.shakeA)));
    ctx.fillStyle = '#000';
    ctx.fillRect(-10, -10, W + 20, H + 20);
    this.drawWorld(ctx);
    ctx.restore();
    if (this.flashT > 0) {
      ctx.fillStyle = 'rgba(255,250,240,' + Math.min(0.7, this.flashT * 6) + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (drawHudFn) drawHudFn(ctx);
    if (this.narr) this.narr.draw(ctx);
    if (this.dialog) this.dialog.draw(ctx);
    if (this.menu) this.menu.draw(ctx);
  }

  tickCommon(dt) {
    this.t += dt;
    this.shakeA *= Math.pow(0.001, dt);
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.narr) {
      this.narr.update(dt);
      if (this.narr.done) this.narr = null;
    }
  }

  // PNJ le plus proche avec lequel on peut parler.
  talkable() {
    const p = this.player;
    if (!p) return null;
    let best = null;
    let bd = 999;
    for (const n of this.npcs) {
      if (!n.onTalk || !n.near(p)) continue;
      const d = dist(p.x, p.y, n.x, n.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
}
