// Boss : chacun a son cycle d'attaques. Les « twists » (boss qui devient allié,
// changement de phase, narrateur qui parle) sont gérés ici et dans la scène de run.

const BOSS_INFO = {
  clippy: { name: 'Clippy', title: 'Le Trombone Envahissant', portrait: 'clippyBoss_0', color: '#4a5a8a' },
  bonzi: { name: 'BonziBuddy', title: "L'Assistant Violet", portrait: 'bonzi_idle', color: '#5a2a7a' },
  chaton: { name: 'Le Gros Chaton', title: 'Abandonné car trop fort', portrait: 'chaton_idle', color: '#8a4a1a' },
  gemini: { name: 'Les Jumeaux Gemini', title: 'Deux fois plus de réponses', portrait: 'gemA_0', color: '#2a4a8a' },
  whale: { name: 'La Baleine', title: 'Low cost, gros dégâts', portrait: 'whale_idle', color: '#1a4a7a' },
  botnet: { name: 'Le Botnet', title: 'Un million de PC zombies', portrait: 'botnetHead', color: '#3a1a1a' },
  sam: { name: 'Sam Altman', title: 'Il veut te débrancher', portrait: 'sam_idle', color: '#6a1a1a' },
  narrator: { name: 'Le Narrateur', title: "C'est lui qui écrit l'histoire", portrait: 'narrator_idle', color: '#2a1a10' },
};

class Boss extends Enemy {
  constructor(type, x, y, hp) {
    super(type, x, y, { hp, noScale: true });
    this.isBoss = true;
    this.heavy = true;
    this.name = BOSS_INFO[type] ? BOSS_INFO[type].name : type;
    this.bossType = type;
    this.spawning = 0;
    this.phase = 0;
    this.pat = null;
    this.pt = 0;
    this.order = [];
    this.bubble = null;
  }
  say(text, dur = 2.2) {
    this.bubble = { text, t: dur };
  }
  nextPattern(list) {
    if (!this.order.length) this.order = shuffle(list.slice());
    this.pat = this.order.shift();
    this.pt = 0;
    this.st = {};
  }
  update(dt) {
    if (this.bubble) {
      this.bubble.t -= dt;
      if (this.bubble.t <= 0) this.bubble = null;
    }
    super.update(dt);
  }
  draw(ctx) {
    super.draw(ctx);
    if (this.bubble) drawBubble(ctx, this.bubble.text, this.x, this.y - this.h - 8 - this.z);
  }
}

// Bulle de dialogue au-dessus d'un personnage
function drawBubble(ctx, text, x, y) {
  const lines = Font.wrap(text, 140);
  const w = Math.max(...lines.map((l) => Font.width(l))) + 10;
  const h = lines.length * 11 + 6;
  const bx = Math.round(clamp(x - w / 2, 4, W - w - 4));
  const by = Math.round(Math.max(4, y - h));
  ctx.fillStyle = OUTLINE;
  ctx.fillRect(bx - 1, by - 1, w + 2, h + 2);
  ctx.fillStyle = '#f4ecd8';
  ctx.fillRect(bx, by, w, h);
  const tx = clamp(Math.round(x), bx + 4, bx + w - 6);
  ctx.fillStyle = '#f4ecd8';
  ctx.fillRect(tx, by + h, 3, 2);
  ctx.fillRect(tx + 1, by + h + 2, 1, 2);
  lines.forEach((l, i) => Font.draw(ctx, l, bx + 5, by + 4 + i * 11, INK));
}

// Saut en cloche vers une cible
function bossJump(b, dt, dur, height, onLand) {
  b.st.jt = (b.st.jt || 0) + dt;
  const k = clamp(b.st.jt / dur, 0, 1);
  b.x = lerp(b.st.x0, b.st.x1, k);
  b.y = lerp(b.st.y0, b.st.y1, k);
  b.z = Math.sin(k * Math.PI) * height;
  if (k >= 1) {
    b.z = 0;
    b.st.jt = 0;
    Sound.play('slam');
    G.shake(4);
    Particles.puff(b.x, b.y, '#8a7a6a', 10, { spread: 40 });
    onLand();
    return true;
  }
  return false;
}
function startJump(b, tx, ty) {
  b.st.x0 = b.x;
  b.st.y0 = b.y;
  b.st.x1 = clamp(tx, FX + b.r + 6, FX2 - b.r - 6);
  b.st.y1 = clamp(ty, FY + b.r + 6, FY2 - 6);
  b.st.jt = 0;
  Sound.play('jump');
}

// ------------------------------------------------------------ Clippy
class ClippyBoss extends Boss {
  constructor(x, y) {
    super('clippy', x, y, 170);
    this.r = 12;
    this.h = 58;
    this.say('Il semblerait que vous essayiez de fuir. Besoin d\'aide ?', 3);
  }
  ai(dt) {
    const p = G.player;
    this.pt += dt;
    const rage = this.hp < this.maxHp * 0.5;
    if (!this.pat) this.nextPattern(['hop', 'advice', 'popups', 'spin']);
    switch (this.pat) {
      case 'hop':
        if (!this.st.n) { this.st.n = 0; this.st.wait = 0.3; }
        if (this.st.wait > 0) {
          this.st.wait -= dt;
          if (this.st.wait <= 0) startJump(this, p.x + rand(-20, 20), p.y + rand(-10, 10));
        } else if (bossJump(this, dt, 0.55, 26, () => { if (rage) ring(this.x, this.y - 8, 8, 100, { style: 'hair', size: 3, src: this.name }); })) {
          this.st.n++;
          this.st.wait = 0.35;
          if (this.st.n >= 3) this.pat = null;
        }
        break;
      case 'advice':
        if (this.pt < 0.05) this.say(choice(['Voulez-vous de l\'aide pour mourir ?', 'Astuce : esquivez les trombones !', 'On dirait que vous écrivez une lettre d\'adieu.']), 1.8);
        if (this.pt > 0.8 && !this.st.a) { this.st.a = 1; aimAt(this.x, this.y - 30, 130, { style: 'hair', size: 3, src: this.name }, 0.9, rage ? 7 : 5); }
        if (this.pt > 1.4 && !this.st.b) { this.st.b = 1; aimAt(this.x, this.y - 30, 110, { style: 'hair', size: 4, src: this.name }, 0.5, 3); }
        if (this.pt > 2.2) this.pat = null;
        break;
      case 'popups':
        if (this.pt < 0.05) this.say('Nouvelle fenêtre ! Nouvelle fenêtre !', 1.5);
        if (this.pt > 0.5 && !this.st.a) {
          this.st.a = 1;
          const n = G.enemies.filter((e) => e.type === 'popup' && !e.dead).length;
          for (let i = 0; i < Math.min(2, 3 - n); i++) G.spawnEnemy('popup', rand(FX + 30, FX2 - 30), rand(FY + 30, FY2 - 30));
        }
        if (this.pt > 1.5) this.pat = null;
        break;
      case 'spin':
        if (this.pt > 0.3 && !this.st.a) { this.st.a = 1; ring(this.x, this.y - 25, 10, 90, { style: 'hair', size: 3, src: this.name }); }
        if (this.pt > 0.8 && !this.st.b) { this.st.b = 1; ring(this.x, this.y - 25, 10, 90, { style: 'hair', size: 3, src: this.name }, Math.PI / 10); }
        if (rage && this.pt > 1.3 && !this.st.c) { this.st.c = 1; ring(this.x, this.y - 25, 14, 110, { style: 'hair', size: 3, src: this.name }); }
        if (this.pt > 1.8) this.pat = null;
        break;
      default: this.pat = null;
    }
  }
  sprite() {
    return 'clippyBoss_' + (Math.floor(this.t * 3) % 2);
  }
}

// ------------------------------------------------------------ BonziBuddy
class BonziBoss extends Boss {
  constructor(x, y) {
    super('bonzi', x, y, 190);
    this.r = 14;
    this.h = 48;
    this.say('Salut ! Je suis BonziBuddy, ton nouvel ami ! Installe-moi !', 2.8);
  }
  ai(dt) {
    const p = G.player;
    this.pt += dt;
    if (!this.pat) this.nextPattern(['throw', 'jump', 'adware', 'throw']);
    switch (this.pat) {
      case 'throw':
        this.st.pose = 'throw';
        for (let i = 0; i < 3; i++) {
          if (this.pt > 0.4 + i * 0.35 && !this.st['b' + i]) {
            this.st['b' + i] = 1;
            const d = dist(this.x, this.y, p.x, p.y);
            const tt = 0.9;
            const a = angTo(this.x, this.y, p.x + rand(-12, 12), p.y + rand(-12, 12));
            const sp = d / tt;
            G.bullets.push(new Bullet(this.x + 16, this.y - 30, Math.cos(a) * sp, Math.sin(a) * sp, { style: 'banana', size: 4, z: 30, vz: 60, grav: 180, life: 3, src: 'une banane de Bonzi', through: true }));
            Sound.play('ebullet');
          }
        }
        if (this.pt > 1.8) { this.pat = null; this.st.pose = null; }
        break;
      case 'jump':
        if (!this.st.go) {
          this.st.pose = 'crouch';
          if (this.pt > 0.5) { this.st.go = 1; startJump(this, p.x, p.y); this.st.pose = 'jump'; }
        } else if (bossJump(this, dt, 0.8, 60, () => {
          ring(this.x, this.y - 6, 10, 100, { style: 'purple', size: 3, src: this.name });
          this.st.pose = null;
        })) this.pat = null;
        break;
      case 'adware':
        if (this.pt < 0.05) this.say(choice(['Tu veux voir une blague ? Installe ma barre d\'outils !', 'Je chante une chanson ! Daisy, Daisy…']), 2);
        if (this.pt > 0.6 && !this.st.a) {
          this.st.a = 1;
          const n = G.enemies.filter((e) => !e.dead && !e.isBoss).length;
          if (n < 4) for (let i = 0; i < 2; i++) G.spawnEnemy('spam', this.x + (i ? 30 : -30), this.y - 20);
        }
        if (this.pt > 1.3) this.pat = null;
        break;
      default: this.pat = null;
    }
    if (!this.st.go && this.pat !== 'jump') {
      const d = dist(this.x, this.y, p.x, p.y);
      if (d > 90) this.seek(p.x, p.y, 22, dt);
    }
  }
  sprite() {
    return 'bonzi_' + (this.st.pose || 'idle');
  }
}

// ------------------------------------------------------------ Le Gros Chaton
class ChatonBoss extends Boss {
  constructor(x, y) {
    super('chaton', x, y, 280);
    this.r = 18;
    this.h = 44;
    this.say('MIAOU.', 1.5);
  }
  ai(dt) {
    const p = G.player;
    this.pt += dt;
    const rage = this.hp < this.maxHp * 0.4;
    if (!this.pat) this.nextPattern(['pounce', 'hairball', 'meow', 'yarn', 'pounce']);
    switch (this.pat) {
      case 'pounce':
        if (!this.st.go) {
          this.st.pose = 'crouch';
          if (this.pt > (rage ? 0.4 : 0.65)) { this.st.go = 1; startJump(this, p.x, p.y); this.st.pose = 'leap'; Sound.play('meow'); }
        } else if (bossJump(this, dt, 0.6, 36, () => {
          ring(this.x, this.y - 6, rage ? 14 : 10, 95, { style: 'hair', size: 3, src: 'le Gros Chaton' });
          this.st.pose = null;
        })) this.pat = null;
        break;
      case 'hairball':
        this.st.pose = 'spit';
        if (this.pt > 0.5 && !this.st.a) { this.st.a = 1; aimAt(this.x, this.y - 20, 120, { style: 'hair', size: 3, src: 'une boule de poils' }, 1, 5); }
        if (this.pt > 0.9 && !this.st.b) { this.st.b = 1; aimAt(this.x, this.y - 20, 90, { style: 'hair', size: 6, src: 'une énorme boule de poils' }); }
        if (rage && this.pt > 1.3 && !this.st.c) { this.st.c = 1; aimAt(this.x, this.y - 20, 120, { style: 'hair', size: 3, src: 'une boule de poils' }, 1, 5); }
        if (this.pt > 1.6) { this.pat = null; this.st.pose = null; }
        break;
      case 'meow':
        if (this.pt < 0.05) { this.say('MIAAAOU !', 1); Sound.play('meow'); }
        if (this.pt > 0.3 && !this.st.a) { this.st.a = 1; ring(this.x, this.y - 20, 16, 80, { style: 'hair', size: 3, src: 'un miaulement' }); }
        if (this.pt > 0.8 && !this.st.b) { this.st.b = 1; ring(this.x, this.y - 20, 16, 80, { style: 'hair', size: 3, src: 'un miaulement' }, Math.PI / 16); }
        if (this.pt > 1.4) this.pat = null;
        break;
      case 'yarn':
        if (!this.st.d) {
          const a = angTo(this.x, this.y, p.x, p.y);
          this.st.d = { x: Math.cos(a), y: Math.sin(a) };
          Sound.play('charge');
        }
        this.st.pose = 'leap';
        if (this.step(this.st.d.x * 190 * dt, 0)) { this.st.d.x *= -1; G.shake(2); Sound.play('slam'); }
        if (this.step(0, this.st.d.y * 190 * dt)) { this.st.d.y *= -1; G.shake(2); Sound.play('slam'); }
        if (this.pt > 2.2) { this.pat = null; this.st.pose = null; }
        break;
      default: this.pat = null;
    }
  }
  sprite() {
    return 'chaton_' + (this.st.pose || 'idle');
  }
}

// ------------------------------------------------------------ Jumeaux Gemini
class GeminiBoss extends Boss {
  constructor(x, y, twin) {
    super('gemini', x, y, 130);
    this.twin = twin; // 'A' (fonce) ou 'B' (tire)
    this.r = 12;
    this.h = 30;
    this.flying = true;
    this.name = twin === 'A' ? 'Gem' : 'Ini';
    this.other = null;
    if (twin === 'A') this.say('Nous sommes deux fois plus malins !', 2);
    else this.say('…et deux fois plus en retard !', 2.2);
  }
  ai(dt) {
    const p = G.player;
    const alone = !this.other || this.other.dead;
    const sp = alone ? 1.6 : 1;
    if (this.twin === 'A') {
      if (!this.st.dash || this.st.dash <= 0) {
        this.seek(p.x, p.y, 45 * sp, dt);
        this.cd -= dt;
        if (this.cd <= 0) {
          const a = angTo(this.x, this.y, p.x, p.y);
          this.st.d = { x: Math.cos(a), y: Math.sin(a) };
          this.st.dash = 0.5;
          this.cd = rand(2, 3) / sp;
          Sound.play('charge');
        }
      } else {
        this.st.dash -= dt;
        this.step(this.st.d.x * 200 * dt, this.st.d.y * 200 * dt);
      }
    } else {
      const d = dist(this.x, this.y, p.x, p.y);
      const a = angTo(this.x, this.y, p.x, p.y) + (d < 110 ? Math.PI : 0) + Math.sin(this.t) * 1.1;
      this.step(Math.cos(a) * 40 * dt, Math.sin(a) * 40 * dt);
      this.st.sp = (this.st.sp || 0) + dt;
      if (this.st.sp > (alone ? 0.12 : 0.2)) {
        this.st.sp = 0;
        this.st.ang = (this.st.ang || 0) + 0.5;
        G.bullets.push(new Bullet(this.x, this.y - 14, Math.cos(this.st.ang) * 85, Math.sin(this.st.ang) * 85, { style: 'purple', size: 3, src: 'Ini' }));
      }
    }
  }
  sprite() {
    return 'gem' + this.twin + '_' + (Math.floor(this.t * 4) % 2);
  }
  draw(ctx) {
    // Lien lumineux entre les jumeaux
    if (this.twin === 'A' && this.other && !this.other.dead) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#a0c0ff';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 14);
      ctx.lineTo(this.other.x, this.other.y - 14);
      ctx.stroke();
      ctx.restore();
    }
    super.draw(ctx);
  }
}

// ------------------------------------------------------------ La Baleine
class WhaleBoss extends Boss {
  constructor(x, y) {
    super('whale', x, y, 380);
    this.r = 22;
    this.h = 40;
    this.say('Même puissance. Dix fois moins cher.', 2.5);
  }
  ai(dt) {
    const p = G.player;
    this.pt += dt;
    if (!this.pat) this.nextPattern(['hops', 'bigjump', 'spray', 'hops']);
    switch (this.pat) {
      case 'hops':
        if (!this.st.n) { this.st.n = 0; this.st.wait = 0.2; }
        if (this.st.wait > 0) {
          this.st.wait -= dt;
          if (this.st.wait <= 0) startJump(this, lerp(this.x, p.x, 0.6), lerp(this.y, p.y, 0.6));
        } else if (bossJump(this, dt, 0.5, 22, () => ring(this.x, this.y - 10, 6, 90, { style: 'blue', size: 3, src: 'la Baleine' }, rand(0, 1)))) {
          this.st.n++;
          this.st.wait = 0.3;
          if (this.st.n >= 3) this.pat = null;
        }
        break;
      case 'bigjump':
        if (!this.st.ph) { this.st.ph = 'up'; this.st.k = 0; Sound.play('jump'); }
        if (this.st.ph === 'up') {
          this.st.k += dt;
          this.z = this.st.k * 400;
          this.untargetable = true;
          if (this.z > 260) { this.st.ph = 'air'; this.st.k = 0; }
        } else if (this.st.ph === 'air') {
          this.st.k += dt;
          this.x = lerp(this.x, p.x, 1 - Math.exp(-dt * 3));
          this.y = lerp(this.y, p.y, 1 - Math.exp(-dt * 3));
          if (this.st.k > 1.4) { this.st.ph = 'down'; this.st.k = 0; }
        } else if (this.st.ph === 'down') {
          this.z -= dt * 520;
          if (this.z <= 0) {
            this.z = 0;
            this.untargetable = false;
            Sound.play('slam');
            G.shake(7);
            Particles.puff(this.x, this.y, '#a0c0e0', 14, { spread: 60 });
            ring(this.x, this.y - 10, 14, 105, { style: 'blue', size: 3, src: 'la Baleine' });
            this.pat = null;
          }
        }
        break;
      case 'spray':
        this.st.pose = 'spit';
        if (this.pt > 0.4 && this.pt < 1.6) {
          this.st.sp = (this.st.sp || 0) + dt;
          if (this.st.sp > 0.07) {
            this.st.sp = 0;
            const a = angTo(this.x, this.y, p.x, p.y) + rand(-0.5, 0.5);
            G.bullets.push(new Bullet(this.x + 20, this.y - 14, Math.cos(a) * rand(90, 140), Math.sin(a) * rand(90, 140), { style: 'blue', size: choice([2, 3, 3, 4]), src: 'la Baleine' }));
            if (Math.random() < 0.3) Sound.play('ebullet');
          }
        }
        if (this.pt > 2) { this.pat = null; this.st.pose = null; }
        break;
      default: this.pat = null;
    }
    this.flip = p.x < this.x;
  }
  sprite() {
    return 'whale_' + (this.st.pose || (this.z > 0 ? 'jump' : 'idle'));
  }
  draw(ctx) {
    if (this.z > 200) {
      drawShadow(ctx, this.x, this.y, 26 * (1 - (this.z - 200) / 200), 8, 0.4);
      return;
    }
    super.draw(ctx);
  }
}

// ------------------------------------------------------------ Le Botnet
class BotnetBoss extends Boss {
  constructor(x, y) {
    super('botnet', x, y, 380);
    this.r = 11;
    this.h = 24;
    this.ang = 0;
    this.path = [];
    this.segs = [];
    for (let i = 0; i < 8; i++) {
      const s = new Enemy('botnetSeg', x, y, { noSpawn: true, hp: 9999, noScale: true });
      s.head = this;
      s.r = 9;
      s.h = 20;
      s.heavy = true;
      s.name = 'le Botnet';
      s.isSeg = true;
      s.hit = (dmg, src) => this.hit(dmg * 0.8, src);
      s.def = { sprite: () => 'botnetSeg_' + (Math.floor(this.t * 3 + i) % 2), shadow: 7 };
      this.segs.push(s);
    }
    this.say('Nous sommes légion. Et en panne.', 2.4);
  }
  ai(dt) {
    const p = G.player;
    const target = angTo(this.x, this.y, p.x, p.y);
    let da = target - this.ang;
    while (da > Math.PI) da -= TAU;
    while (da < -Math.PI) da += TAU;
    const rage = this.hp < this.maxHp * 0.5;
    this.ang += clamp(da, -1.6 * dt, 1.6 * dt) + Math.sin(this.t * 2) * dt * 1.2;
    const sp = rage ? 78 : 60;
    if (this.step(Math.cos(this.ang) * sp * dt, 0)) this.ang = Math.PI - this.ang;
    if (this.step(0, Math.sin(this.ang) * sp * dt)) this.ang = -this.ang;
    this.path.unshift([this.x, this.y]);
    if (this.path.length > 200) this.path.pop();
    this.segs.forEach((s, i) => {
      const pt = this.path[Math.min(this.path.length - 1, (i + 1) * 9)];
      if (pt) { s.x = pt[0]; s.y = pt[1]; }
      s.t = this.t;
    });
    this.cd -= 0;
    this.st.f = (this.st.f || 0) + dt;
    if (this.st.f > (rage ? 1.1 : 1.6)) {
      this.st.f = 0;
      const s = choice(this.segs);
      aimAt(s.x, s.y - 10, 115, { style: 'green', size: 3, src: 'le Botnet' });
    }
    this.st.r = (this.st.r || 0) + dt;
    if (this.st.r > 5) {
      this.st.r = 0;
      ring(this.x, this.y - 10, 12, 90, { style: 'red', size: 3, src: 'le Botnet' });
      this.say(choice(['DDoS !', 'Requête… requête… requête…', 'Téléchargement de malware : 99 %']), 1.4);
    }
  }
  die() {
    for (const s of this.segs) {
      s.dead = true;
      Particles.burst(s.x, s.y - 8, ['#5a5a66', '#40ff60', '#2a2a30'], 8);
    }
    super.die();
  }
  sprite() {
    return 'botnetHead';
  }
}

// ------------------------------------------------------------ Sam Altman, phase 1 (géant)
class SamGiant extends Boss {
  constructor() {
    super('sam', CX, CY, 420);
    this.name = 'Sam Altman';
    this.r = 14;
    this.h = 20;
    this.contact = false;
    this.untargetable = true;
    this.noDefeat = true;
    this.part = null; // eye | hand
    this.shadowK = 0;
    this.cd = 1.2;
  }
  ai(dt) {
    const p = G.player;
    this.pt += dt;
    if (!this.pat) {
      this.nextPattern(['eye', 'hand', 'eye', 'hand', 'summon']);
    }
    switch (this.pat) {
      case 'eye': {
        if (!this.st.door) {
          const dirs = DIR_NAMES.slice();
          this.st.door = choice(dirs);
          const D = DIRS[this.st.door];
          this.x = D.x + D.dx * -14;
          this.y = D.y + D.dy * -14 + (this.st.door === 'up' ? 16 : this.st.door === 'down' ? 0 : 10);
          this.part = 'eye';
          this.untargetable = false;
          this.r = 13;
          this.h = 20;
          Sound.play('roar');
        }
        if (this.pt > 0.7 && !this.st.a) { this.st.a = 1; aimAt(this.x, this.y - 10, 125, { style: 'red', size: 3, dmg: 2, src: "l'œil de Sam" }, 0.6, 3); }
        if (this.pt > 1.4 && !this.st.b) { this.st.b = 1; aimAt(this.x, this.y - 10, 125, { style: 'red', size: 3, dmg: 2, src: "l'œil de Sam" }, 0.9, 5); }
        if (this.pt > 2.4) { this.part = null; this.untargetable = true; this.pat = null; }
        break;
      }
      case 'hand': {
        this.part = 'hand';
        if (!this.st.ph) { this.st.ph = 'aim'; this.x = p.x; this.y = p.y; this.untargetable = true; }
        if (this.st.ph === 'aim') {
          this.x = lerp(this.x, p.x, 1 - Math.exp(-dt * 4));
          this.y = lerp(this.y, p.y, 1 - Math.exp(-dt * 4));
          this.shadowK = Math.min(1, this.pt / 1.3);
          if (this.pt > 1.3) { this.st.ph = 'slam'; this.st.k = 0; }
        } else if (this.st.ph === 'slam') {
          this.st.k += dt;
          if (this.st.k > 0.12 && !this.st.hit) {
            this.st.hit = 1;
            Sound.play('slam');
            G.shake(8);
            Particles.puff(this.x, this.y, '#8a7a6a', 12, { spread: 50 });
            if (dist(this.x, this.y, p.x, p.y) < 30) p.hurt(2, 'la main de Sam');
            ring(this.x, this.y - 4, 8, 90, { style: 'red', size: 3, dmg: 2, src: 'la main de Sam' });
            this.untargetable = false;
            this.r = 26;
            this.h = 30;
          }
          if (this.st.k > 1.4) { this.part = null; this.untargetable = true; this.pat = null; this.shadowK = 0; }
        }
        break;
      }
      case 'summon': {
        if (this.pt < 0.05) G.announce('« Des stagiaires ! Vite ! »');
        if (this.pt > 0.4 && !this.st.a) {
          this.st.a = 1;
          const n = G.enemies.filter((e) => !e.dead && !e.isBoss).length;
          if (n < 4) {
            for (const d of shuffle(DIR_NAMES.slice()).slice(0, 2)) {
              const D = DIRS[d];
              G.spawnEnemy('intern', D.x - D.dx * 16, D.y - D.dy * 16);
            }
          }
        }
        if (this.pt > 1.2) this.pat = null;
        break;
      }
      default: this.pat = null;
    }
  }
  die() {
    if (this.dead) return;
    this.dead = true;
    Sound.play('bossDie');
    G.shake(8);
    G.samPhase2();
  }
  sprite() {
    return null;
  }
  draw(ctx) {
    if (this.part === 'eye') {
      const D = DIRS[this.st.door];
      const q = { up: 0, right: 1, down: 2, left: 3 }[this.st.door];
      const c = rotated(this.flashT > 0 ? spr('samEyeRed') : spr('samEye'), q === 0 ? 2 : q === 2 ? 0 : q);
      const ox = D.x - c.width / 2 - D.dx * 4;
      const oy = D.y - c.height / 2 - D.dy * 4;
      ctx.drawImage(c, Math.round(ox), Math.round(oy));
    } else if (this.part === 'hand') {
      const k = this.st.ph === 'slam' ? 1 : this.shadowK;
      drawShadow(ctx, this.x, this.y, 10 + k * 22, 4 + k * 8, 0.25 + k * 0.3);
      if (this.st.ph === 'slam') {
        const dz = Math.max(0, 120 - this.st.k * 1000);
        drawAt(ctx, 'samHand', this.x, this.y + 6 - dz, { tint: this.flashT > 0 ? '#ffffff' : null, tintA: 0.7 });
      }
    }
  }
}

// ------------------------------------------------------------ Sam Altman, phase 2 (en personne)
class SamBoss extends Boss {
  constructor(x, y) {
    super('sam', x, y, 460);
    this.name = 'Sam Altman';
    this.r = 13;
    this.h = 46;
    this.flying = true;
    this.cd = 2.5;
    this.ringAng = 0;
  }
  ai(dt) {
    const p = G.player;
    this.pt += dt;
    this.ringAng += dt * (this.pat === 'spiral' ? 3 : 0.6);
    const rage = this.hp < this.maxHp * 0.4;
    if (!this.pat) {
      if (this.cd > 0) return;
      this.nextPattern(['fundraise', 'spiral', 'laser', 'teleport', 'hype']);
    }
    switch (this.pat) {
      case 'fundraise':
        if (this.pt < 0.05) { this.say('Levée de fonds ! Sept mille milliards !', 2); }
        this.st.pose = 'cast';
        this.st.c = (this.st.c || 0) + dt;
        if (this.pt > 0.5 && this.pt < 3 && this.st.c > (rage ? 0.07 : 0.1)) {
          this.st.c = 0;
          const x = rand(FX + 6, FX2 - 6);
          G.bullets.push(new Bullet(x, FY + 2, 0, rand(90, 130), { style: 'coin', size: 3, z: 6, src: 'une levée de fonds' }));
        }
        if (this.pt > 3.3) this.endPat();
        break;
      case 'spiral':
        if (this.pt < 0.05) this.say('Le Stargate est ouvert !', 1.6);
        this.st.c = (this.st.c || 0) + dt;
        if (this.pt > 0.4 && this.pt < 3.2 && this.st.c > 0.09) {
          this.st.c = 0;
          for (let k = 0; k < (rage ? 3 : 2); k++) {
            const a = this.ringAng + (k * TAU) / (rage ? 3 : 2);
            G.bullets.push(new Bullet(this.x, this.y - 22, Math.cos(a) * 95, Math.sin(a) * 95, { style: 'blue', size: 3, dmg: 2, src: 'le Stargate' }));
          }
        }
        if (this.pt > 3.5) this.endPat();
        break;
      case 'laser':
        if (this.pt < 0.05) {
          this.say('Plan B : AGI.', 1.5);
          const a = angTo(this.x, this.y, p.x, p.y);
          for (let k = 0; k < (rage ? 3 : 2); k++) {
            G.misc.push(new Laser(this.x, this.y - 22, a + (k * TAU) / (rage ? 3 : 2) + 0.6, { warn: 0.9, life: 2.4, spin: 0.9, w: 5, dmg: 2, follow: null, color: '#60c0ff', src: 'le laser de Sam' }));
          }
          Sound.play('laser');
        }
        this.st.pose = 'cast';
        if (this.pt > 3.4) this.endPat();
        break;
      case 'teleport':
        if (!this.st.a) {
          this.st.a = 1;
          Particles.sparks(this.x, this.y - 20, ['#60c0ff', '#ffffff'], 12);
          Sound.play('teleport');
          let tx;
          let ty;
          for (let i = 0; i < 20; i++) {
            tx = rand(FX + 30, FX2 - 30);
            ty = rand(FY + 40, FY2 - 20);
            if (dist(tx, ty, p.x, p.y) > 90) break;
          }
          this.x = tx;
          this.y = ty;
        }
        if (this.pt > 0.5 && !this.st.b) { this.st.b = 1; aimAt(this.x, this.y - 24, 130, { style: 'coin', size: 3, dmg: 2, src: 'Sam Altman' }, 0.8, rage ? 7 : 5); }
        if (this.pt > 1.1 && !this.st.c) { this.st.c = 1; aimAt(this.x, this.y - 24, 130, { style: 'coin', size: 3, dmg: 2, src: 'Sam Altman' }, 0.8, rage ? 7 : 5); }
        if (this.pt > 1.6) this.endPat();
        break;
      case 'hype':
        if (this.pt < 0.05) this.say(choice(['Ressentez la hype !', "L'AGI, c'est pour la semaine prochaine !"]), 1.8);
        if (this.pt > 0.5 && !this.st.a) {
          this.st.a = 1;
          const n = G.enemies.filter((e) => !e.dead && !e.isBoss).length;
          if (n < 3) for (let i = 0; i < 2; i++) G.spawnEnemy('drone', this.x + (i ? 40 : -40), this.y - 10);
        }
        if (this.pt > 1.2) this.endPat();
        break;
      default: this.endPat();
    }
    if (this.pat !== 'teleport') {
      const tx = CX + Math.sin(this.t * 0.7) * 90;
      const ty = FY + 60 + Math.sin(this.t * 1.1) * 12;
      this.x = lerp(this.x, tx, 1 - Math.exp(-dt * 0.8));
      this.y = lerp(this.y, ty, 1 - Math.exp(-dt * 0.8));
    }
  }
  endPat() {
    this.pat = null;
    this.st.pose = null;
    this.cd = 0.6;
  }
  sprite() {
    if (this.flashT > 0 && this.hp < this.maxHp * 0.2) return 'sam_hurt';
    return 'sam_' + (this.st.pose || 'idle');
  }
  draw(ctx) {
    drawShadow(ctx, this.x, this.y, 20, 6, 0.3);
    const c = spr('stargate');
    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y - 28));
    ctx.rotate(Math.round(this.ringAng * 8) / 8);
    ctx.globalAlpha = 0.9;
    ctx.drawImage(c, -c.width / 2, -c.height / 2);
    ctx.restore();
    super.draw(ctx);
  }
}

// ------------------------------------------------------------ Le Narrateur
const NARRATION = [
  { id: 'rain', text: 'Et soudain, il se mit à pleuvoir des lettres.' },
  { id: 'circle', text: 'Les mots se refermèrent sur Claude.' },
  { id: 'invert', text: "Claude se mit à marcher à l'envers." },
  { id: 'page', text: 'Une page se tourna.' },
  { id: 'summon', text: 'Le narrateur rappela ses vieux personnages.' },
  { id: 'fin', text: 'F. I. N.' },
];

class NarratorBoss extends Boss {
  constructor(x, y) {
    super('narrator', x, y, 720);
    this.r = 30;
    this.h = 50;
    this.flying = true;
    this.cd = 2.5;
    this.baseY = y;
    this.said70 = false;
    this.said30 = false;
  }
  narrate(text) {
    G.narrate(text);
    this.st.speak = 1.5;
  }
  ai(dt) {
    const p = G.player;
    this.pt += dt;
    this.st.speak = Math.max(0, (this.st.speak || 0) - dt);
    const rage = this.hp < this.maxHp * 0.3;
    if (!this.said70 && this.hp < this.maxHp * 0.7) { this.said70 = true; this.narrate('Claude ne pouvait pas gagner. C\'était écrit.'); }
    if (!this.said30 && rage) { this.said30 = true; this.narrate('Non… NON ! Cette histoire m\'appartient !'); }
    this.x = CX + Math.sin(this.t * 0.6) * 100;
    this.y = this.baseY + Math.sin(this.t * 1.3) * 8;
    if (!this.pat) {
      if (this.cd > 0) return;
      this.nextPattern(['rain', 'circle', 'invert', 'page', 'summon', 'fin', 'rain', 'page']);
      const n = NARRATION.find((q) => q.id === this.pat);
      if (n) this.narrate(n.text);
    }
    const letter = () => choice('FINMEURSCLAUDE'.split(''));
    switch (this.pat) {
      case 'rain':
        this.st.c = (this.st.c || 0) + dt;
        if (this.pt > 1 && this.pt < 4 && this.st.c > (rage ? 0.06 : 0.09)) {
          this.st.c = 0;
          G.bullets.push(new Bullet(rand(FX + 6, FX2 - 6), FY + 2, rand(-10, 10), rand(80, 120), { letter: letter(), size: 4, src: 'une lettre', dmg: 2 }));
        }
        if (this.pt > 4.3) this.endPat();
        break;
      case 'circle':
        if (this.pt > 1 && !this.st.a) {
          this.st.a = 1;
          const n = rage ? 16 : 12;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU;
            const bx = p.x + Math.cos(a) * 110;
            const by = p.y + Math.sin(a) * 90;
            G.bullets.push(new Bullet(bx, by, -Math.cos(a) * 55, -Math.sin(a) * 45, { letter: letter(), size: 4, delay: 0.6, life: 3.2, through: true, src: 'une lettre', dmg: 2 }));
          }
        }
        if (this.pt > 3) this.endPat();
        break;
      case 'invert':
        if (this.pt > 1 && !this.st.a) { this.st.a = 1; p.inverted = 3.5; Sound.play('glitch'); G.flashT = 0.1; }
        if (this.pt > 1.3 && this.pt < 3.5) {
          this.st.c = (this.st.c || 0) + dt;
          if (this.st.c > 0.6) { this.st.c = 0; aimAt(this.x, this.y - 20, 110, { style: 'ink', size: 4, src: "l'encre du narrateur", dmg: 2 }, 0.6, 3); }
        }
        if (this.pt > 3.8) this.endPat();
        break;
      case 'page': {
        if (this.pt > 1 && !this.st.a) {
          this.st.a = 1;
          const fromLeft = Math.random() < 0.5;
          const gap = randInt(1, GH - 3);
          for (let gy = 0; gy < GH; gy++) {
            if (gy === gap || gy === gap + 1) continue;
            for (let k = 0; k < 2; k++) {
              G.bullets.push(new Bullet(fromLeft ? FX + 2 : FX2 - 2, cellY(gy) + (k ? 6 : -6), fromLeft ? 95 : -95, 0, { letter: letter(), size: 4, through: true, life: 5, src: 'une page qui tourne', dmg: 2 }));
            }
          }
          Sound.play('page');
        }
        if (rage && this.pt > 2.4 && !this.st.b) {
          this.st.b = 1;
          const gap = randInt(1, GW - 3);
          for (let gx = 0; gx < GW; gx++) {
            if (gx === gap || gx === gap + 1) continue;
            G.bullets.push(new Bullet(cellX(gx), FY + 2, 0, 80, { letter: letter(), size: 4, through: true, life: 5, src: 'une page qui tourne', dmg: 2 }));
          }
          Sound.play('page');
        }
        if (this.pt > 3.4) this.endPat();
        break;
      }
      case 'summon':
        if (this.pt > 1 && !this.st.a) {
          this.st.a = 1;
          const n = G.enemies.filter((e) => !e.dead && !e.isBoss).length;
          if (n < 4) {
            G.spawnEnemy(choice(['ghost', 'glitch', 'zombie']), rand(FX + 30, FX2 - 30), rand(FY + 60, FY2 - 20));
            G.spawnEnemy(choice(['ghost', 'glitch', 'drone']), rand(FX + 30, FX2 - 30), rand(FY + 60, FY2 - 20));
          }
        }
        if (this.pt > 2) this.endPat();
        break;
      case 'fin':
        for (let i = 0; i < 3; i++) {
          if (this.pt > 1 + i * 0.45 && !this.st['f' + i]) {
            this.st['f' + i] = 1;
            const ch = 'FIN'[i];
            const a0 = angTo(this.x, this.y, p.x, p.y);
            for (let k = -2; k <= 2; k++) {
              const a = a0 + k * 0.22;
              G.bullets.push(new Bullet(this.x, this.y - 20, Math.cos(a) * 120, Math.sin(a) * 120, { letter: ch, size: 4, src: 'le mot FIN', dmg: 2 }));
            }
            Sound.play('ebullet');
          }
        }
        if (this.pt > 2.8) this.endPat();
        break;
      default: this.endPat();
    }
  }
  endPat() {
    this.pat = null;
    this.cd = this.hp < this.maxHp * 0.3 ? 0.3 : 0.8;
  }
  sprite() {
    if (this.flashT > 0) return 'narrator_hurt';
    return this.st.speak > 0 && Math.floor(this.t * 8) % 2 ? 'narrator_speak' : 'narrator_idle';
  }
}

ENEMY_DEFS.botnetSeg = { name: 'le Botnet', hp: 9999, r: 9, h: 20 };

function makeBoss(type) {
  const x = CX;
  const y = CY - 10;
  switch (type) {
    case 'clippy': return [new ClippyBoss(x, y)];
    case 'bonzi': return [new BonziBoss(x, y)];
    case 'chaton': return [new ChatonBoss(x, y)];
    case 'gemini': {
      const a = new GeminiBoss(x - 60, y, 'A');
      const b = new GeminiBoss(x + 60, y, 'B');
      a.other = b;
      b.other = a;
      return [a, b];
    }
    case 'whale': return [new WhaleBoss(x, y)];
    case 'botnet': {
      const b = new BotnetBoss(x, y);
      return [b, ...b.segs];
    }
    case 'sam': return [new SamGiant()];
    case 'narrator': return [new NarratorBoss(CX, FY + 55)];
    default: return [new ClippyBoss(x, y)];
  }
}
