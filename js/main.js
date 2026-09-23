// Boucle principale, gestion des scènes et mise à l'échelle du canvas.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  const s = Math.min(window.innerWidth / W, window.innerHeight / H);
  const scale = s >= 1 ? Math.floor(s) : s;
  canvas.style.width = Math.floor(W * scale) + 'px';
  canvas.style.height = Math.floor(H * scale) + 'px';
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
      this.fade += dt * 4;
      if (this.fade >= 1) {
        this.fade = 1;
        this.scene = this.pending();
        this.pending = null;
        this.fadeDir = -1;
      }
      return;
    }
    if (this.fadeDir === -1) {
      this.fade -= dt * 4;
      if (this.fade <= 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }
    this.scene.update(dt);
  },

  draw() {
    ctx.imageSmoothingEnabled = false;
    this.scene.draw(ctx);
    if (Sound.muted) Font.draw(ctx, 'SON COUPÉ', W - 4, H - 10, '#4a4452', { align: 'right' });
    if (this.fade > 0) {
      ctx.save();
      ctx.globalAlpha = this.fade;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },
};

Input.init();
App.scene = new SplashScene();

const STEP = 1 / 60;
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    Input.poll();
    App.update(STEP);
    Input.endStep();
    acc -= STEP;
    steps++;
  }
  App.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Accès pour le débogage depuis la console.
window.TBOC = { App, Sound };
