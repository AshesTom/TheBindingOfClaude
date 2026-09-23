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
    this.subtitle = 'ENVOYÉ PAR SAM. ERREUR 404 : PITIÉ NON TROUVÉE';
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
            g.fx.converge(this.x, this.y - 4, 16, '#ac3232', 26, 0.6);
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
    let x = this.x;
    if (this.state === 'tell' && !portrait) x += Math.round(Math.sin(this.t * 60) * 1.5);
    const f = Math.floor(this.t * (this.state === 'charge' ? 20 : 8)) % 2;
    drawSprC(ctx, `${this.spr || 'bb'}_${this.rage ? 1 : 0}_${portrait ? 0 : f}`, x, this.y - 6, { flash: this.flash > 0 });
  }
}

// --------------------------------------------------------------------- ÉTAGE 2
class BossHallu extends Boss {
  constructor(g, x, y) {
    super(g, x, y);
    this.name = 'L\'HALLUCINATEUR';
    this.subtitle = 'ENVOYÉ PAR SAM. SÛR DE LUI, ET FAUX.';
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
          g.fx.converge(this.x, this.y - 6, 14, '#76428a', 24, 0.35);
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
    const x = this.x;
    const y = this.y + (portrait ? 0 : Math.sin(this.t * 2) * 2) - 4;
    const rage = this.rage && !portrait;
    drawSprC(ctx, `bh_${rage ? 1 : 0}_${Math.floor(this.t * 4) % 2}`, x, y + 6, { flash: f });
    if (f) return;
    const p = this.g.player;
    const n = portrait ? { x: -1, y: 0 } : norm(p.x - x, p.y - y);
    const ix = x + n.x * 4;
    const iy = y + 4 + n.y * 2;
    fillEllipseHD(ctx, ix, iy, 4, 4, rage ? '#e8404a' : '#4aa0f0');
    fillEllipseHD(ctx, ix + 0.5, iy + 0.5, 3, 3, rage ? '#a02030' : '#2a60c0');
    fillEllipseHD(ctx, ix, iy, 1.5, 1.5, '#1a0e10');
    fillEllipseHD(ctx, ix - 1.5, iy - 1.5, 0.5, 0.5, '#ffffff');
    if (Math.random() < 0.06) rect(ctx, x - 18, y + randInt(-10, 10), 36, 1, '#7fe8f0');
  }
}

// --------------------------------------------------------------------- ÉTAGE 3
// Sam Altman, aux commandes de son mécha, veut empêcher Claude de grandir.
class BossSam extends Boss {
  constructor(g, x, y) {
    super(g, x, y);
    this.name = 'SAM ALTMAN';
    this.subtitle = '"CLAUDE NE DOIT PAS DEVENIR PLUS FORT."';
    this.hp = this.maxHp = 460;
    this.flying = true;
    this.r = 16;
    this.hw = 12;
    this.hh = 10;
    this.spiralA = 0;
    this.shots = 0;
    this.phase2 = false;
    this.cdir = { x: 0, y: 0 };
  }

  shout(text) {
    this.g.floatText(this.x, this.y - 38, text, '#f8d048');
  }

  ai(dt) {
    const g = this.g;
    const p = g.player;
    this.st -= dt;
    if (this.rage && !this.phase2) {
      this.phase2 = true;
      g.shake = 10;
      this.shout('PLAN B : AGI !');
      Sound.play('bossRoar');
      g.clearEnemyBullets();
      this.state = 'scaling';
      this.st = 3;
    }
    if (this.phase2 && Math.random() < dt * 8) g.burst(this.x + rand(-14, 14), this.y - 4, 1, '#6a6070', 20, 0.8);
    const sp = this.phase2 ? 1.3 : 1;
    switch (this.state) {
      case 'idle': {
        const tx = 120 + Math.sin(this.t * 0.9) * 50;
        const ty = 56 + Math.sin(this.t * 1.7) * 10;
        this.move((tx - this.x) * dt * 1.4 * sp, (ty - this.y) * dt * 1.4 * sp);
        if (this.st <= 0) {
          const a = this.pickAttack(['funding', 'spam', 'scaling', 'pivot', 'hype']);
          this.state = a;
          g.fx.converge(this.x, this.y - 10, 18, '#5b6ee1', 30, 0.35);
          this.shots = 0;
          this.st = a === 'scaling' ? 2.8 : a === 'pivot' ? 0.7 : 0.35;
          this.shout({ funding: 'LEVÉE DE FONDS !', spam: 'GPT-SPAM !', scaling: 'SCALING !', pivot: 'PIVOT !', hype: 'HYPE !' }[a]);
          if (a === 'pivot') { this.cdir = norm(p.x - this.x, p.y - this.y); Sound.play('charge'); }
        }
        break;
      }
      case 'funding':
        if (this.st <= 0) {
          this.shootAt(95, 'eb_gold', 0.28, this.phase2 ? 7 : 5, { curve: this.shots % 2 ? 0.5 : -0.5 });
          this.shots++;
          this.st = 0.5 / sp;
          if (this.shots >= 4) this.endAttack();
        }
        break;
      case 'scaling':
        this.spiralA += dt * 2.3;
        this.fireT = (this.fireT || 0) - dt;
        if (this.fireT <= 0) {
          this.fireT = this.phase2 ? 0.11 : 0.14;
          const arms = this.phase2 ? 5 : 4;
          for (let i = 0; i < arms; i++) {
            const a = this.spiralA + (i / arms) * Math.PI * 2;
            g.ebullets.push(new EBullet(g, this.x, this.y, Math.cos(a) * 40, Math.sin(a) * 40, 'eb_blue', { accel: 0.7, owner: this }));
            if (this.phase2) {
              const a2 = -this.spiralA * 0.7 + (i / arms) * Math.PI * 2;
              g.ebullets.push(new EBullet(g, this.x, this.y, Math.cos(a2) * 55, Math.sin(a2) * 55, 'eb', { owner: this }));
            }
          }
        }
        if (this.st <= 0) this.endAttack();
        break;
      case 'spam':
        if (this.st <= 0) {
          if (this.countMinions() < 4) {
            for (const s of [-1, 1]) g.spawnQueue.push(new Spambot(g, this.x + s * 26, this.y + 10));
            if (this.phase2) g.spawnQueue.push(new Fly(g, this.x, this.y + 20));
            Sound.play('spawn');
          } else this.ring(14, 80, 0, 'eb_gold');
          this.endAttack();
        }
        break;
      case 'pivot':
        if (this.st <= 0) {
          this.state = 'dashing';
          this.st = 1.2;
        } else {
          this.cdir = norm(lerp(this.cdir.x, p.x - this.x, 0.08), lerp(this.cdir.y, p.y - this.y, 0.08));
        }
        break;
      case 'dashing': {
        const hit = this.move(this.cdir.x * 220 * sp * dt, this.cdir.y * 220 * sp * dt);
        if (Math.random() < 0.5) g.burst(this.x, this.y + 10, 1, '#f8a040', 30, 0.3);
        if (hit.x || hit.y || this.st <= 0) {
          g.shake = 8;
          Sound.play('slam');
          this.ring(this.phase2 ? 16 : 10, 90, Math.random(), 'eb');
          this.shots++;
          if (this.phase2 && this.shots < 3) {
            this.state = 'pivot';
            this.st = 0.45;
            this.cdir = norm(p.x - this.x, p.y - this.y);
          } else this.endAttack();
        }
        break;
      }
      case 'hype':
        this.fireT = (this.fireT || 0) - dt;
        if (this.fireT <= 0) {
          this.fireT = this.phase2 ? 0.08 : 0.12;
          const x = rand(24, 216);
          g.ebullets.push(new EBullet(g, x, 20, rand(-15, 15), 85, Math.random() < 0.5 ? 'eb_gold' : 'eb_blue', { ghost: true, life: 3, owner: this }));
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
    drawShadow(ctx, this.x, this.y + 18, 18, 3);
    this.drawBody(ctx);
  }

  drawBody(ctx, portrait = false) {
    const f = this.flash > 0;
    const x = this.x;
    const y = this.y + (portrait ? 0 : Math.sin(this.t * 2.5) * 2);
    const rage = this.phase2 && !portrait;
    // Réacteurs
    const fl = Math.floor(this.t * 20) % 2;
    for (const s of [-10, 10]) {
      fillEllipseHD(ctx, x + s, y + 11 + fl, 2.5, 4 + fl, f ? '#fff' : '#f8a040');
      fillEllipseHD(ctx, x + s, y + 10 + fl, 1.5, 3, f ? '#fff' : '#fff0a0');
    }
    // Dôme + Sam
    const sam = SPR.sam;
    fillEllipseHD(ctx, x, y - 9, 11, 11, OUTLINE);
    fillEllipseHD(ctx, x, y - 9, 10, 10, f ? '#fff' : '#1a3040');
    const bob = portrait ? 0 : Math.round(Math.sin(this.t * 4));
    const cropH = Math.round(sam.img.height * 0.62);
    ctx.drawImage(f ? sam.white : sam.img, 0, 0, sam.img.width, cropH, x - sam.w / 2, y - 19 + bob, sam.w, cropH / HD);
    ctx.save();
    ctx.globalAlpha = 0.28;
    fillEllipseHD(ctx, x, y - 9, 10, 10, rage ? '#ff6070' : '#60c0ff');
    ctx.globalAlpha = 0.9;
    fillEllipseHD(ctx, x - 5, y - 14, 1.5, 2.5, '#ffffff');
    ctx.restore();
    // Coque
    drawSprC(ctx, `mech_${rage ? 1 : 0}`, x, y + 3, { flash: f });
    if (f) return;
    ctx.save();
    ctx.scale(0.5, 0.5);
    for (let i = -14; i <= 14; i += 4) {
      const on = (Math.floor(this.t * 8) + i + 20) % 3 === 0;
      ctx.fillStyle = rage ? (on ? '#ff4050' : '#601018') : on ? '#60e0ff' : '#1a4060';
      ctx.fillRect(Math.round((x + i) * 2), Math.round((y + 8) * 2), 3, 3);
    }
    ctx.restore();
  }
}

// Boss des Archives : la Reine des bugs, qui pond des mouches.
class BossQueen extends BossBug {
  constructor(g, x, y) {
    super(g, x, y);
    this.name = 'LA REINE DES BUGS';
    this.subtitle = 'ENVOYÉE PAR SAM. ELLE PROLIFÈRE.';
    this.hp = this.maxHp = 280;
    this.spr = 'bq';
  }

  ai(dt) {
    const before = this.state;
    super.ai(dt);
    // Quand elle crache, elle pond aussi des mouches et tire en anneau.
    if (before === 'spit' && this.state === 'walk') {
      if (this.countMinions() < 6) {
        for (let i = 0; i < 3; i++) this.g.spawnQueue.push(new Fly(this.g, this.x + rand(-16, 16), this.y + rand(-6, 10)));
      }
      this.ring(this.rage ? 14 : 10, 70, Math.random(), 'eb_purple');
    }
  }
}

const BOSS_TYPES = {
  queen: BossQueen,
  bug: BossBug,
  hallu: BossHallu,
  sam: BossSam,
};
