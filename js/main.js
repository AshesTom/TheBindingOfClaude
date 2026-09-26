// Boucle principale (pas fixe 60 Hz), gestion des scènes et mise à l'échelle entière.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const cs = getComputedStyle(document.body);
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const aw = (window.innerWidth - pad) * dpr;
  const ah = window.innerHeight * dpr;
  const k = Math.floor(Math.min(aw / canvas.width, ah / canvas.height));
  let w = canvas.width * k;
  let h = canvas.height * k;
  if (k < 1) {
    const f = Math.max(0.25, Math.min(aw / canvas.width, ah / canvas.height));
    w = Math.floor(canvas.width * f);
    h = Math.floor(canvas.height * f);
  }
  canvas.style.width = w / dpr + 'px';
  canvas.style.height = h / dpr + 'px';
}
window.addEventListener('resize', resize);
resize();

const App = {
  scene: null,
  pending: null,
  fade: 0,
  fadeDir: 0,

  go(factory) {
    if (this.fadeDir === 1) return;
    this.pending = factory;
    this.fadeDir = 1;
  },

  update(dt) {
    if (Input.pressed('mute')) Sound.toggleMute();
    if (this.fadeDir === 1) {
      this.fade += dt * 3.5;
      if (this.fade >= 1) {
        this.fade = 1;
        this.scene = this.pending();
        this.pending = null;
        this.fadeDir = -1;
      }
      return;
    }
    if (this.fadeDir === -1) {
      this.fade -= dt * 3.5;
      if (this.fade <= 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }
    this.scene.update(dt);
  },

  draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    this.scene.draw(ctx);
    if (Sound.muted) Font.draw(ctx, 'SON COUPÉ (M)', W - 4, H - 10, '#8a7a6a', { align: 'right', outline: '#000' });
    if (this.fade > 0) {
      ctx.fillStyle = 'rgba(0,0,0,' + this.fade + ')';
      ctx.fillRect(0, 0, W, H);
    }
  },
};

Input.init();
Voice.init();
App.scene = new TitleScene();

const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  let steps = 0;
  try {
    while (acc >= STEP && steps < 4) {
      Input.poll();
      App.update(STEP);
      Input.endStep();
      acc -= STEP;
      steps++;
    }
    App.draw();
  } catch (e) {
    console.error(e);
    acc = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.TAOC = { App, Sound, Meta, Voice };
