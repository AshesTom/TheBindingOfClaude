// Clavier (QWERTY et AZERTY grâce aux codes physiques) + manette.

const Input = {
  keys: new Set(),
  pressedKeys: new Set(),
  gpNow: {},
  gpPrev: {},
  axes: [0, 0, 0, 0],
  lastDevice: 'keyboard',
  shootOrder: [],

  ACTIONS: {
    sUp: { k: ['ArrowUp', 'KeyI'], b: [3] },
    sDown: { k: ['ArrowDown', 'KeyK'], b: [0] },
    sLeft: { k: ['ArrowLeft', 'KeyJ'], b: [2] },
    sRight: { k: ['ArrowRight', 'KeyL'], b: [1] },
    bomb: { k: ['KeyE', 'ShiftLeft', 'ShiftRight'], b: [4] },
    item: { k: ['Space'], b: [5, 7] },
    interact: { k: ['KeyE', 'Enter'], b: [0] },
    map: { k: ['Tab'], b: [8] },
    pause: { k: ['Escape', 'KeyP'], b: [9] },
    uiUp: { k: ['KeyW', 'ArrowUp'], b: [12, 100] },
    uiDown: { k: ['KeyS', 'ArrowDown'], b: [13, 101] },
    uiLeft: { k: ['KeyA', 'ArrowLeft'], b: [14, 102] },
    uiRight: { k: ['KeyD', 'ArrowRight'], b: [15, 103] },
    confirm: { k: ['Enter', 'NumpadEnter', 'Space', 'KeyE'], b: [0] },
    back: { k: ['Escape', 'Backspace'], b: [1] },
    skip: { k: ['Escape', 'Enter', 'Space'], b: [9, 0] },
  },

  init() {
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.pressedKeys.add(e.code);
        this.pressedKeys.add('__any');
        if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') this.pressedKeys.add('__mute');
        if (e.code.startsWith('Arrow')) {
          this.shootOrder = this.shootOrder.filter((c) => c !== e.code);
          this.shootOrder.push(e.code);
        }
      }
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
      Sound.unlock();
    });
    addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.shootOrder = this.shootOrder.filter((c) => c !== e.code);
    });
    addEventListener('blur', () => {
      this.keys.clear();
      this.shootOrder = [];
    });
    addEventListener('pointerdown', () => {
      Sound.unlock();
      this.pressedKeys.add('__any');
    });
  },

  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    this.gpNow = {};
    this.axes = [0, 0, 0, 0];
    if (!gp) return;
    gp.buttons.forEach((b, i) => {
      if (b.pressed || b.value > 0.5) this.gpNow[i] = true;
    });
    for (let i = 0; i < 4; i++) {
      const v = gp.axes[i] || 0;
      this.axes[i] = Math.abs(v) > 0.25 ? v : 0;
    }
    if (this.axes[1] < -0.5) this.gpNow[100] = true;
    if (this.axes[1] > 0.5) this.gpNow[101] = true;
    if (this.axes[0] < -0.5) this.gpNow[102] = true;
    if (this.axes[0] > 0.5) this.gpNow[103] = true;
    if (Object.keys(this.gpNow).length) {
      if (this.lastDevice !== 'gamepad') Sound.unlock();
      this.lastDevice = 'gamepad';
    }
  },

  down(action) {
    const a = this.ACTIONS[action];
    for (const k of a.k) if (this.keys.has(k)) return true;
    for (const b of a.b) if (this.gpNow[b]) return true;
    return false;
  },

  pressed(action) {
    if (action === 'any') return this.pressedKeys.has('__any') || (this.gpNow[0] && !this.gpPrev[0]) || (this.gpNow[9] && !this.gpPrev[9]);
    if (action === 'mute') return this.pressedKeys.has('__mute');
    const a = this.ACTIONS[action];
    for (const k of a.k) if (this.pressedKeys.has(k)) return true;
    for (const b of a.b) if (this.gpNow[b] && !this.gpPrev[b]) return true;
    return false;
  },

  moveVec() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.gpNow[14]) x -= 1;
    if (this.keys.has('KeyD') || this.gpNow[15]) x += 1;
    if (this.keys.has('KeyW') || this.gpNow[12]) y -= 1;
    if (this.keys.has('KeyS') || this.gpNow[13]) y += 1;
    if (this.axes[0] || this.axes[1]) {
      x = this.axes[0];
      y = this.axes[1];
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    }
    return norm(x, y);
  },

  // Tir façon Isaac : une seule direction cardinale, la dernière touche pressée gagne.
  shootDir() {
    if (Math.hypot(this.axes[2], this.axes[3]) > 0.5) {
      const ax = this.axes[2];
      const ay = this.axes[3];
      if (Math.abs(ax) > Math.abs(ay)) return ax < 0 ? 'left' : 'right';
      return ay < 0 ? 'up' : 'down';
    }
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    for (let i = this.shootOrder.length - 1; i >= 0; i--) {
      if (this.keys.has(this.shootOrder[i])) return map[this.shootOrder[i]];
    }
    if (this.down('sUp')) return 'up';
    if (this.down('sDown')) return 'down';
    if (this.down('sLeft')) return 'left';
    if (this.down('sRight')) return 'right';
    return null;
  },

  endStep() {
    this.pressedKeys.clear();
    this.gpPrev = Object.assign({}, this.gpNow);
  },
};
