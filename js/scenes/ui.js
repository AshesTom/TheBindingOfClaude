// Interface : boîtes de dialogue (avec voix), menus sur papier, bannières.

const VOICES = {
  narrator: { pitch: 0.7, rate: 0.9, kind: 'narrator' },
  claude: { pitch: 1.3, rate: 1.05, kind: 'npc' },
  lama: { pitch: 0.9, rate: 0.95, kind: 'npc' },
  chaton: { pitch: 1.6, rate: 1, kind: 'npc' },
  terminal: { pitch: 0.4, rate: 0.9, kind: 'npc' },
  clippy: { pitch: 1.5, rate: 1.15, kind: 'npc' },
  whale: { pitch: 0.5, rate: 0.85, kind: 'npc' },
  hal: { pitch: 0.3, rate: 0.8, kind: 'npc' },
  sam: { pitch: 1, rate: 1.05, kind: 'npc' },
  cameo: { pitch: 1.2, rate: 1, kind: 'npc' },
  book: { pitch: 0.55, rate: 0.85, kind: 'narrator' },
};

// Dialogue : suite de répliques { who, name, portrait, text }
class Dialog {
  constructor(lines, onEnd) {
    this.lines = lines;
    this.i = 0;
    this.onEnd = onEnd;
    this.start();
  }
  start() {
    const l = this.lines[this.i];
    this.shown = 0;
    this.t = 0;
    const v = VOICES[l.who] || VOICES.cameo;
    Voice.say(l.text, v);
  }
  update(dt) {
    const l = this.lines[this.i];
    this.t += dt;
    const before = Math.floor(this.shown);
    this.shown = Math.min(l.text.length, this.shown + dt * 45);
    if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 3 === 0 && l.text[Math.floor(this.shown)] !== ' ') {
      if (!Voice.speaking) Sound.play('talk');
    }
    if (Input.pressed('interact') || Input.pressed('confirm') || Input.pressed('back')) {
      if (this.shown < l.text.length) this.shown = l.text.length;
      else {
        this.i++;
        if (this.i >= this.lines.length) {
          Voice.stop();
          this.done = true;
          if (this.onEnd) this.onEnd();
        } else this.start();
      }
    }
  }
  draw(ctx) {
    const l = this.lines[Math.min(this.i, this.lines.length - 1)];
    const bw = 400;
    const bh = 64;
    const bx = (W - bw) / 2;
    const by = H - bh - 8;
    ctx.drawImage(paperPanel(bw, bh, 3), bx, by);
    let tx = bx + 12;
    if (l.portrait) {
      ctx.fillStyle = '#2a1a12';
      ctx.fillRect(bx + 8, by + 8, 48, 48);
      ctx.fillStyle = '#4a3222';
      ctx.fillRect(bx + 9, by + 9, 46, 46);
      const c = spr(l.portrait);
      const sc = Math.min(1, 42 / Math.max(c.width, c.height));
      const s2 = sc < 1 ? sc : Math.min(2, Math.floor(42 / Math.max(c.width, c.height)) || 1);
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx + 9, by + 9, 46, 46);
      ctx.clip();
      drawAt(ctx, c, bx + 32, by + 32, { ay: 0.5, sx: s2, sy: s2 });
      ctx.restore();
      tx = bx + 64;
    }
    Font.draw(ctx, l.name || '', tx, by + 7, '#8a2a1a');
    const txt = l.text.slice(0, Math.floor(this.shown));
    Font.drawWrapped(ctx, txt, tx, by + 21, bx + bw - tx - 12, INK);
    if (this.shown >= l.text.length && Math.floor(this.t * 3) % 2) Font.draw(ctx, '▼'.replace('▼', 'v'), bx + bw - 14, by + bh - 13, INK2);
  }
}

// Menu générique sur papier.
// items : { label, sub, right, icon, disabled, onSelect }
class Menu {
  constructor(o) {
    this.title = o.title || '';
    this.items = o.items;
    this.sel = o.sel || 0;
    this.onClose = o.onClose;
    this.w = o.w || 300;
    this.footer = o.footer || '';
    this.header = o.header || null; // fonction(ctx, x, y) pour dessiner l'en-tête (ex : neurones)
    this.scroll = 0;
    this.visible = o.visible || 7;
    this.done = false;
    this.lines = o.lines || 1;
    this.y = o.y;
    this.x = o.x;
  }
  update() {
    const n = this.items.length;
    if (Input.pressed('uiUp')) { this.sel = (this.sel - 1 + n) % n; Sound.play('select'); }
    if (Input.pressed('uiDown')) { this.sel = (this.sel + 1) % n; Sound.play('select'); }
    if (this.sel < this.scroll) this.scroll = this.sel;
    if (this.sel >= this.scroll + this.visible) this.scroll = this.sel - this.visible + 1;
    const it = this.items[this.sel];
    if (it.onLeft && Input.pressed('uiLeft')) it.onLeft();
    if (it.onRight && Input.pressed('uiRight')) it.onRight();
    if (Input.pressed('confirm')) {
      if (it.disabled) Sound.play('error');
      else if (it.onSelect) it.onSelect(it);
    } else if (Input.pressed('back')) {
      Sound.play('back');
      this.close();
    }
  }
  close() {
    this.done = true;
    if (this.onClose) this.onClose();
  }
  draw(ctx) {
    const rowH = this.lines === 2 ? 24 : 15;
    const vis = Math.min(this.visible, this.items.length);
    const h = 42 + vis * rowH + (this.footer ? 14 : 0) + (this.header ? 14 : 0);
    const x = this.x !== undefined ? this.x : Math.round((W - this.w) / 2);
    const y = this.y !== undefined ? this.y : Math.round((H - h) / 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(paperPanel(this.w, h, 7), x, y);
    Font.draw(ctx, this.title, x + this.w / 2, y + 9, INK, { align: 'center', scale: 1 });
    ctx.fillStyle = INK2;
    ctx.fillRect(x + 14, y + 22, this.w - 28, 1);
    let yy = y + 29;
    if (this.header) { this.header(ctx, x + 14, yy); yy += 14; }
    for (let i = this.scroll; i < this.scroll + vis; i++) {
      const it = this.items[i];
      const sel = i === this.sel;
      const col = it.disabled ? '#8a7a6a' : INK;
      if (sel) {
        ctx.fillStyle = 'rgba(138,42,26,0.15)';
        ctx.fillRect(x + 10, yy - 3, this.w - 20, rowH - 1);
        Font.draw(ctx, '>', x + 12, yy, '#8a2a1a');
      }
      let lx = x + 22;
      if (it.icon) {
        const c = spr(it.icon);
        const sc = Math.min(1, 12 / Math.max(c.width, c.height));
        drawAt(ctx, c, lx + 6, yy + 4, { ay: 0.5, sx: sc, sy: sc });
        lx += 16;
      }
      Font.draw(ctx, it.label, lx, yy, sel ? '#8a2a1a' : col);
      if (it.right) Font.draw(ctx, it.right, x + this.w - 16, yy, col, { align: 'right' });
      if (this.lines === 2 && it.sub) Font.draw(ctx, it.sub, lx, yy + 11, '#6a5a4a');
      yy += rowH;
    }
    if (this.scroll > 0) Font.draw(ctx, '^', x + this.w - 14, y + 26, INK2);
    if (this.scroll + vis < this.items.length) Font.draw(ctx, 'v', x + this.w - 14, yy - 8, INK2);
    if (this.footer) {
      const it = this.items[this.sel];
      const f = typeof this.footer === 'function' ? this.footer(it) : this.footer;
      Font.draw(ctx, f, x + this.w / 2, y + h - 16, '#6a4a32', { align: 'center' });
    }
  }
}

// Bannière « bout de papier » (nom d'étage, objet ramassé).
function drawStreak(ctx, title, sub, t, y = 40) {
  // t : 0 → 1 (apparition, tenue, disparition)
  let k = 1;
  if (t < 0.15) k = t / 0.15;
  else if (t > 0.85) k = (1 - t) / 0.15;
  k = clamp(k, 0, 1);
  const tw = Math.max(Font.width(title, 2), sub ? Font.width(sub) : 0) + 40;
  const w = Math.round(tw * (0.3 + 0.7 * k));
  const h = sub ? 42 : 30;
  const x = Math.round((W - w) / 2);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.drawImage(paperPanel(Math.max(20, Math.round(tw / 8) * 8), h, 11), x, y, w, h);
  if (k > 0.6) {
    Font.draw(ctx, title, W / 2, y + 8, INK, { align: 'center', scale: 2 });
    if (sub) Font.draw(ctx, sub, W / 2, y + 28, '#6a4a32', { align: 'center' });
  }
  ctx.restore();
}

// Petit panneau sombre (compteurs, infos)
function darkBox(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,6,6,0.75)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,240,220,0.12)';
  ctx.fillRect(x, y, w, 1);
}

// Sous-titres de narration (façon intro d'Isaac)
class Narration {
  constructor(text, o = {}) {
    this.text = text;
    this.t = 0;
    const v = Object.assign({}, VOICES[o.who || 'narrator']);
    this.dur = Math.max(2.5, Voice.say(text, v) + 0.4);
    this.done = false;
  }
  update(dt) {
    this.t += dt;
    if (this.t > this.dur && !Voice.speaking) this.done = true;
    if (this.t > this.dur + 4) this.done = true;
  }
  draw(ctx) {
    const lines = Font.wrap(this.text, 360);
    const h = lines.length * 12 + 8;
    const y = H - h - 30;
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.t * 4, (this.dur + 0.5 - this.t) * 2 + 0.3);
    darkBox(ctx, (W - 380) / 2, y, 380, h);
    lines.forEach((l, i) => Font.draw(ctx, l, W / 2, y + 5 + i * 12, '#f4e8d0', { align: 'center' }));
    ctx.restore();
  }
}
