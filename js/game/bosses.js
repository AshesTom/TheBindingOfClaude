// Boss de fin d'étage.

class Boss extends Enemy {
  constructor(g, x, y) {
    super(g, x, y);
    this.boss = true;
    this.kb = 0;
    this.contact = 2;
    this.spawnT = 0;
    this.state = 'idle';
    this.st = 1.2;
    this.lastAttack = null;
  }

  get rage() {
    return this.hp < this.maxHp * 0.5;
  }

  pickAttack(list) {
    const opts = list.filter((a) => a !== this.lastAttack);
    this.lastAttack = choice(opts);
    return this.lastAttack;
  }

  countMinions() {
    return this.g.enemies.filter((e) => !e.boss && !e.dead).length;
  }

  // Portrait pour l'écran d'intro ("VS").
  drawPortrait(ctx, x, y) {
    const ox = this.x;
    const oy = this.y;
    const fl = this.flash;
    this.x = x;
    this.y = y;
    this.flash = 0;
    this.drawBody(ctx, true);
    this.x = ox;
    this.y = oy;
    this.flash = fl;
  }
}

// --------------------------------------------------------------------- ÉTAGE 1
class BossBug extends Boss {
  constructor(g, x, y) {
    super(g, x, y);
    this.name = 'LE GRAND BUG';
    this.subtitle = 'ERREUR 404 : PITIÉ NON TROUVÉE';
    this.hp = this.maxHp = 190;
    this.r = 13;
    this.hw = 11;
    this.hh = 8;
    this.cycle = 0;
    this.cdir = { x: 0, y: 0 };
  }

  ai(dt) {
    const g = this.g;
    const p = g.player;
    this.st -= dt;
    const sp = this.rage ? 1.35 : 1;
    switch (this.state) {
      case 'idle':
      case 'walk': {
        const n = g.pathDir(this);
        this.move(n.x * 30 * sp * dt, n.y * 30 * sp * dt);
        if (this.st <= 0) {
          this.cycle++;
          if (this.cycle % 3 === 0) {
            this.state = 'spit';
            this.st = 0.6;
          } else {
            this.state = 'tell';
            this.st = 0.65;
            this.cdir = norm(p.x - this.x, p.y - this.y);
            Sound.play('charge');
          }
        }
        break;
      }
      case 'tell':
        this.cdir = norm(lerp(this.cdir.x, p.x - this.x, 0.05), lerp(this.cdir.y, p.y - this.y, 0.05));
        if (this.st <= 0) {
          this.state = 'charge';
          this.st = 1.4;
        }
        break;
      case 'charge': {
        const v = 210 * sp;
        const hit = this.move(this.cdir.x * v * dt, this.cdir.y * v * dt);
        if (Math.floor(this.t * 30) % 2) g.burst(this.x, this.y + 6, 1, '#6a5f70', 20, 0.3);
        if (hit.x || hit.y || this.st <= 0) {
          g.shake = 7;
          Sound.play('slam');
          this.ring(this.rage ? 12 : 8, 85, Math.random());
          this.state = 'stun';
          this.st = 0.8;
        }
        break;
      }
      case 'stun':
        if (this.st <= 0) {
          this.state = 'walk';
          this.st = rand(1.2, 2);
        }
        break;
      case 'spit':
        if (this.st <= 0) {
          this.shootAt(100, 'eb', 0.22, this.rage ? 7 : 5);
          if (this.countMinions() < 4) {
            for (let i = 0; i < 2; i++) {
              const b = new Bug(g, this.x + (i ? 14 : -14), this.y + 6);
              g.spawnQueue.push(b);
            }
            Sound.play('spawn');
          }
          this.state = 'walk';
          this.st = rand(1.5, 2.2);
        }
        break;
      default: break;
    }
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y + 8, 16, 3);
    this.drawBody(ctx);
  }

  drawBody(ctx, portrait = false) {
    const f = this.flash > 0;
    const C = (c) => (f ? '#ffffff' : c);
    let x = Math.round(this.x);
    let y = Math.round(this.y) - 6;
    if (this.state === 'tell' && !portrait) x += Math.round(Math.sin(this.t * 60) * 1.5);
    const walk = Math.floor(this.t * (this.state === 'charge' ? 20 : 8)) % 2;
    const body = this.rage ? '#a03040' : '#3a8a3a';
    const bodyL = this.rage ? '#e0505a' : '#78d05a';
    // Pattes
    for (let i = 0; i < 3; i++) {
      const ly = y - 4 + i * 6 + (walk === i % 2 ? 1 : -1);
      rect(ctx, x - 19, ly, 6, 2, C('#1a1016'));
      rect(ctx, x + 13, ly, 6, 2, C('#1a1016'));
      rect(ctx, x - 20, ly + 2, 2, 3, C('#1a1016'));
      rect(ctx, x + 18, ly + 2, 2, 3, C('#1a1016'));
    }
    // Corps
    fillEllipse(ctx, x, y, 15, 12, C('#1a1016'));
    fillEllipse(ctx, x, y, 14, 11, C(body));
    fillEllipse(ctx, x - 4, y - 4, 7, 5, C(bodyL));
    rect(ctx, x, y - 11, 1, 22, C('#1a1016'));
    // Taches "glitch"
    rect(ctx, x - 9, y + 2, 3, 2, C('#f070b8'));
    rect(ctx, x + 6, y - 5, 4, 2, C('#7fe8f0'));
    rect(ctx, x + 4, y + 5, 2, 2, C('#f8d048'));
    // Tête
    fillEllipse(ctx, x, y + 11, 9, 6, C('#1a1016'));
    fillEllipse(ctx, x, y + 11, 8, 5, C('#2a2130'));
    // Yeux
    rect(ctx, x - 6, y + 9, 4, 3, C('#e8404a'));
    rect(ctx, x + 2, y + 9, 4, 3, C('#e8404a'));
    rect(ctx, x - 5, y + 10, 1, 1, C('#ffffff'));
    rect(ctx, x + 3, y + 10, 1, 1, C('#ffffff'));
    // Mandibules
    const m = this.state === 'spit' || this.state === 'tell' ? 2 : 0;
    rect(ctx, x - 7 - m, y + 15, 3, 4, C('#d8d0c8'));
    rect(ctx, x + 4 + m, y + 15, 3, 4, C('#d8d0c8'));
    // Antennes
    rect(ctx, x - 5, y - 16, 1, 5, C('#1a1016'));
    rect(ctx, x + 4, y - 16, 1, 5, C('#1a1016'));
    rect(ctx, x - 6, y - 17, 2, 2, C('#f8d048'));
    rect(ctx, x + 4, y - 17, 2, 2, C('#f8d048'));
  }
}

// --------------------------------------------------------------------- ÉTAGE 2
class BossHallu extends Boss {
  constructor(g, x, y) {
    super(g, x, y);
    this.name = 'L\'HALLUCINATEUR';
    this.subtitle = 'IL EST SÛR DE LUI. IL A TORT.';
    this.hp = this.maxHp = 300;
    this.flying = true;
    this.r = 14;
    this.hw = 10;
    this.hh = 8;
    this.alpha = 1;
    this.spiralA = 0;
    this.shots = 0;
  }

  ai(dt) {
    const g = this.g;
    const p = g.player;
    this.st -= dt;
    switch (this.state) {
      case 'idle': {
        const tx = 120 + Math.sin(this.t * 0.8) * 60;
        const ty = 60 + Math.sin(this.t * 1.3) * 16;
        this.move((tx - this.x) * dt * 1.5, (ty - this.y) * dt * 1.5);
        if (this.st <= 0) {
          const a = this.pickAttack(['ring', 'spiral', 'teleport', 'clones', 'rain']);
          this.state = a;
          this.shots = 0;
          this.st = a === 'spiral' ? 2.6 : a === 'teleport' ? 0.4 : 0.3;
          if (a === 'teleport') { this.invuln = true; Sound.play('teleport'); }
        }
        break;
      }
      case 'ring':
        if (this.st <= 0) {
          this.ring(this.rage ? 18 : 14, 72, this.shots * 0.22, 'eb_purple');
          this.shots++;
          this.st = 0.5;
          if (this.shots >= 3) this.endAttack();
        }
        break;
      case 'spiral':
        this.spiralA += dt * (this.rage ? 3.4 : 2.6);
        this.fireT = (this.fireT || 0) - dt;
        if (this.fireT <= 0) {
          this.fireT = 0.09;
          const arms = this.rage ? 3 : 2;
          for (let i = 0; i < arms; i++) {
            const a = this.spiralA + (i / arms) * Math.PI * 2;
            g.ebullets.push(new EBullet(g, this.x, this.y, Math.cos(a) * 80, Math.sin(a) * 80, 'eb_purple'));
          }
        }
        if (this.st <= 0) this.endAttack();
        break;
      case 'teleport':
        this.alpha = Math.max(0.05, this.st / 0.4);
        if (this.st <= 0) {
          const pos = g.randomFreeSpot(p.x, p.y, 60, 110, true);
          this.x = pos.x;
          this.y = pos.y;
          this.state = 'appear';
          this.st = 0.35;
        }
        break;
      case 'appear':
        this.alpha = 1 - this.st / 0.35;
        if (this.st <= 0) {
          this.alpha = 1;
          this.invuln = false;
          this.state = 'burst';
          this.shots = 0;
          this.st = 0.1;
        }
        break;
      case 'burst':
        if (this.st <= 0) {
          this.shootAt(115, 'eb_purple', 0.2, 3);
          this.shots++;
          this.st = 0.35;
          if (this.shots >= (this.rage ? 4 : 3)) this.endAttack();
        }
        break;
      case 'clones':
        if (this.st <= 0) {
          if (this.countMinions() < 3) {
            for (let i = 0; i < 2; i++) {
              const pos = g.randomFreeSpot(this.x, this.y, 20, 50, true);
              g.spawnQueue.push(new Ghost(g, pos.x, pos.y));
            }
            Sound.play('spawn');
          } else this.ring(10, 70, 0, 'eb_purple');
          this.endAttack();
        }
        break;
      case 'rain':
        this.fireT = (this.fireT || 0) - dt;
        if (this.fireT <= 0) {
          this.fireT = this.rage ? 0.1 : 0.14;
          const x = rand(24, 216);
          g.ebullets.push(new EBullet(g, x, 20, 0, 70, 'eb_purple', { ghost: true, life: 3 }));
          this.shots++;
        }
        if (this.shots > 22) this.endAttack();
        break;
      default: break;
    }
  }

  endAttack() {
    this.state = 'idle';
    this.st = this.rage ? rand(0.6, 1) : rand(1, 1.6);
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.3 * this.alpha;
    fillEllipse(ctx, this.x, this.y + 18, 14, 3, '#000');
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = this.alpha;
    this.drawBody(ctx);
    ctx.restore();
  }

  drawBody(ctx, portrait = false) {
    const f = this.flash > 0;
    const C = (c) => (f ? '#ffffff' : c);
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(this.t * 2) * 2) - 4;
    const main = this.rage ? '#c050a0' : '#8a4ad0';
    const dark = this.rage ? '#701850' : '#4a2080';
    // Tentacules
    for (let i = 0; i < 5; i++) {
      const tx = x - 12 + i * 6;
      for (let j = 0; j < 7; j++) {
        const wob = Math.round(Math.sin(this.t * 4 + i + j * 0.6) * 2);
        rect(ctx, tx + wob, y + 10 + j * 2, 3, 2, C(j % 2 ? dark : main));
      }
    }
    // Nuage
    const pulse = Math.round(Math.sin(this.t * 3));
    fillEllipse(ctx, x, y, 17 + pulse, 14, C('#1a1016'));
    fillEllipse(ctx, x - 9, y - 7, 8, 7, C(main));
    fillEllipse(ctx, x + 9, y - 6, 8, 7, C(main));
    fillEllipse(ctx, x, y, 16 + pulse, 13, C(main));
    fillEllipse(ctx, x - 5, y - 6, 6, 4, C('#c890f0'));
    // Oeil géant
    fillEllipse(ctx, x, y + 1, 10, 7, C('#1a1016'));
    fillEllipse(ctx, x, y + 1, 9, 6, C('#ffffff'));
    const p = this.g.player;
    const n = portrait ? { x: -1, y: 0 } : norm(p.x - x, p.y - y);
    const ix = x + Math.round(n.x * 4);
    const iy = y + 1 + Math.round(n.y * 2);
    fillEllipse(ctx, ix, iy, 4, 4, C(this.rage ? '#e8404a' : '#4aa0f0'));
    fillEllipse(ctx, ix, iy, 2, 2, C('#1a1016'));
    rect(ctx, ix - 2, iy - 2, 1, 1, C('#ffffff'));
    // Glitch
    if (!f && Math.random() < 0.08) {
      rect(ctx, x - 18, y + randInt(-10, 10), 36, 1, '#7fe8f0');
    }
  }
}

// --------------------------------------------------------------------- ÉTAGE 3
class BossClip extends Boss {
  constructor(g, x, y) {
    super(g, x, y);
    this.name = 'LE MAXIMISEUR DE TROMBONES';
    this.subtitle = 'TOUT DEVIENDRA TROMBONE.';
    this.hp = this.maxHp = 440;
    this.flying = true;
    this.r = 14;
    this.hw = 10;
    this.hh = 10;
    this.spiralA = 0;
    this.shots = 0;
    this.phase2 = false;
    this.cdir = { x: 0, y: 0 };
  }

  ai(dt) {
    const g = this.g;
    const p = g.player;
    this.st -= dt;
    if (this.rage && !this.phase2) {
      this.phase2 = true;
      g.shake = 10;
      g.floatText(this.x, this.y - 30, 'MAXIMISATION !', '#e8404a');
      Sound.play('bossRoar');
      g.clearEnemyBullets();
      this.state = 'spiral';
      this.st = 3;
    }
    const sp = this.phase2 ? 1.3 : 1;
    switch (this.state) {
      case 'idle': {
        const n = norm(p.x - this.x, p.y - this.y);
        this.move(n.x * 22 * sp * dt, n.y * 22 * sp * dt);
        if (this.st <= 0) {
          const a = this.pickAttack(['throw', 'spiral', 'summon', 'dash', 'rain']);
          this.state = a;
          this.shots = 0;
          this.st = a === 'spiral' ? 2.8 : a === 'dash' ? 0.7 : 0.3;
          if (a === 'dash') { this.cdir = norm(p.x - this.x, p.y - this.y); Sound.play('charge'); }
        }
        break;
      }
      case 'throw':
        if (this.st <= 0) {
          this.shootAt(105, 'eb_clip', 0.35, this.phase2 ? 5 : 3, { curve: this.shots % 2 ? 0.6 : -0.6 });
          this.shots++;
          this.st = 0.45 / sp;
          if (this.shots >= 4) this.endAttack();
        }
        break;
      case 'spiral':
        this.spiralA += dt * 2.2;
        this.fireT = (this.fireT || 0) - dt;
        if (this.fireT <= 0) {
          this.fireT = this.phase2 ? 0.1 : 0.13;
          const arms = this.phase2 ? 5 : 4;
          for (let i = 0; i < arms; i++) {
            const a = this.spiralA + (i / arms) * Math.PI * 2;
            const a2 = -this.spiralA * 0.7 + (i / arms) * Math.PI * 2;
            g.ebullets.push(new EBullet(g, this.x, this.y, Math.cos(a) * 70, Math.sin(a) * 70, 'eb_clip'));
            if (this.phase2) g.ebullets.push(new EBullet(g, this.x, this.y, Math.cos(a2) * 55, Math.sin(a2) * 55, 'eb'));
          }
        }
        if (this.st <= 0) this.endAttack();
        break;
      case 'summon':
        if (this.st <= 0) {
          if (this.countMinions() < 6) {
            for (let i = 0; i < (this.phase2 ? 4 : 3); i++) {
              const a = (i / 3) * Math.PI * 2;
              g.spawnQueue.push(new MiniClip(g, this.x + Math.cos(a) * 20, this.y + Math.sin(a) * 20));
            }
            Sound.play('spawn');
          } else this.ring(12, 80, 0, 'eb_clip');
          this.endAttack();
        }
        break;
      case 'dash':
        if (this.st <= 0) {
          this.state = 'dashing';
          this.st = 1.2;
        } else {
          this.cdir = norm(lerp(this.cdir.x, p.x - this.x, 0.08), lerp(this.cdir.y, p.y - this.y, 0.08));
        }
        break;
      case 'dashing': {
        const hit = this.move(this.cdir.x * 220 * sp * dt, this.cdir.y * 220 * sp * dt);
        if (hit.x || hit.y || this.st <= 0) {
          g.shake = 8;
          Sound.play('slam');
          this.ring(this.phase2 ? 16 : 10, 90, Math.random(), 'eb_clip');
          this.shots++;
          if (this.phase2 && this.shots < 3) {
            this.state = 'dash';
            this.st = 0.45;
            this.cdir = norm(p.x - this.x, p.y - this.y);
          } else this.endAttack();
        }
        break;
      }
      case 'rain':
        this.fireT = (this.fireT || 0) - dt;
        if (this.fireT <= 0) {
          this.fireT = this.phase2 ? 0.08 : 0.12;
          const x = rand(24, 216);
          g.ebullets.push(new EBullet(g, x, 20, rand(-15, 15), 85, 'eb_clip', { ghost: true, life: 3 }));
          this.shots++;
        }
        if (this.shots > 28) this.endAttack();
        break;
      default: break;
    }
  }

  endAttack() {
    this.state = 'idle';
    this.st = this.phase2 ? rand(0.5, 0.9) : rand(0.9, 1.4);
  }

  draw(ctx) {
    drawShadow(ctx, this.x, this.y + 14, 13, 3);
    this.drawBody(ctx);
  }

  drawBody(ctx, portrait = false) {
    const f = this.flash > 0;
    const x = Math.round(this.x);
    const y = Math.round(this.y + Math.sin(this.t * 2.5) * 2);
    const rage = this.phase2 && !portrait;
    if (rage) {
      ctx.save();
      ctx.globalAlpha = 0.25 + Math.sin(this.t * 8) * 0.1;
      fillEllipse(ctx, x, y - 6, 22, 26, '#e8404a');
      ctx.restore();
    }
    const metal = f ? '#ffffff' : rage ? '#e8a0a0' : '#c8c0c8';
    const shade = f ? '#ffffff' : rage ? '#a04050' : '#8a8290';
    // Le grand trombone
    const tilt = this.state === 'dashing' ? Math.round(Math.sin(this.t * 40)) : 0;
    drawPaperclip(ctx, x - 12 + tilt, y - 30, 24, 40, 3, metal, shade);
    // Yeux menaçants
    const eyeC = f ? '#fff' : '#e8404a';
    rect(ctx, x - 8, y - 14, 6, 4, '#1a1016');
    rect(ctx, x + 2, y - 14, 6, 4, '#1a1016');
    rect(ctx, x - 7, y - 13, 4, 2, eyeC);
    rect(ctx, x + 3, y - 13, 4, 2, eyeC);
    // Sourcils
    rect(ctx, x - 9, y - 17, 3, 1, '#1a1016');
    rect(ctx, x - 6, y - 16, 3, 1, '#1a1016');
    rect(ctx, x + 3, y - 16, 3, 1, '#1a1016');
    rect(ctx, x + 6, y - 17, 3, 1, '#1a1016');
    // Bouche
    rect(ctx, x - 5, y - 6, 10, 2, '#1a1016');
    if (this.state === 'spiral' || this.state === 'summon') rect(ctx, x - 4, y - 5, 8, 3, '#1a1016');
  }
}

const BOSS_TYPES = {
  bug: BossBug,
  hallu: BossHallu,
  clip: BossClip,
};
