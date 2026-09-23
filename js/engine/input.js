// Clavier (QWERTY et AZERTY via les codes physiques) + manette.

const Input = {
  keys: new Set(),
  pressedKeys: new Set(),
  gpNow: {},
  gpPrev: {},
  axes: [0, 0, 0, 0],
  lastDevice: 'keyboard',

  ACTIONS: {
    mUp: { k: ['KeyW'], b: [12, 100] },
    mDown: { k: ['KeyS'], b: [13, 101] },
    mLeft: { k: ['KeyA'], b: [14, 102] },
    mRight: { k: ['KeyD'], b: [15, 103] },
    sUp: { k: ['ArrowUp', 'KeyI'], b: [3] },
    sDown: { k: ['ArrowDown', 'KeyK'], b: [0] },
    sLeft: { k: ['ArrowLeft', 'KeyJ'], b: [2] },
    sRight: { k: ['ArrowRight', 'KeyL'], b: [1] },
    dash: { k: ['Space', 'ShiftLeft', 'ShiftRight'], b: [4, 5] },
    special: { k: ['KeyE', 'KeyF'], b: [6, 7] },
    pause: { k: ['Escape', 'KeyP'], b: [9] },
    uiUp: { k: ['KeyW', 'ArrowUp'], b: [12, 100] },
    uiDown: { k: ['KeyS', 'ArrowDown'], b: [13, 101] },
    uiLeft: { k: ['KeyA', 'ArrowLeft'], b: [14, 102] },
    uiRight: { k: ['KeyD', 'ArrowRight'], b: [15, 103] },
    confirm: { k: ['Enter', 'NumpadEnter', 'Space', 'KeyE'], b: [0] },
    back: { k: ['Escape', 'Backspace'], b: [1] },
    any: { k: [], b: [0, 9] },
  },

  init() {
    addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
      if (!e.repeat) {
        this.pressedKeys.add(e.code);
        this.pressedKeys.add('__any');
        if (e.key === 'm' || e.key === 'M') this.pressedKeys.add('__mute');
      }
      this.keys.add(e.code);
      this.lastDevice = 'keyboard';
      Sound.unlock();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
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
    // Stick gauche comme boutons virtuels pour les menus.
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
    if (action === 'any') {
      if (this.pressedKeys.has('__any')) return true;
    }
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

  shootVec() {
    let x = 0;
    let y = 0;
    if (this.down('sLeft')) x -= 1;
    if (this.down('sRight')) x += 1;
    if (this.down('sUp')) y -= 1;
    if (this.down('sDown')) y += 1;
    if (Math.hypot(this.axes[2], this.axes[3]) > 0.45) {
      return norm(this.axes[2], this.axes[3]);
    }
    return norm(x, y);
  },

  endStep() {
    this.pressedKeys.clear();
    this.gpPrev = Object.assign({}, this.gpNow);
  },
};
