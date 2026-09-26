// Effets sonores et musique synthétisés en direct (WebAudio) : aucun fichier audio.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Chaque morceau : tempo, accords (1 par mesure), style, mélodie (indices dans l'accord, -1 = silence).
const TRACKS = {
  title: { bpm: 72, style: 'organ', prog: [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]],
    lead: [2, -1, -1, 1, -1, -1, 0, -1, 1, -1, -1, -1, 2, -1, -1, -1] },
  hub: { bpm: 84, style: 'music-box', prog: [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]],
    lead: [0, -1, 1, -1, 2, -1, 1, -1, 0, -1, 2, -1, 1, -1, -1, -1] },
  story: { bpm: 60, style: 'organ', prog: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]],
    lead: [2, -1, -1, -1, 1, -1, -1, -1, 0, -1, -1, -1, 1, -1, -1, -1] },
  f1: { bpm: 100, style: 'crypt', prog: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [44, 47, 52]],
    lead: [0, -1, -1, 2, -1, 1, -1, -1, 0, -1, 2, -1, 1, -1, 0, -1] },
  f2: { bpm: 92, style: 'crypt', prog: [[43, 46, 50], [39, 43, 46], [41, 44, 48], [38, 42, 45]],
    lead: [2, -1, 1, -1, -1, 0, -1, -1, 2, -1, -1, 1, -1, -1, 0, -1] },
  f3: { bpm: 110, style: 'pulse', prog: [[40, 43, 47], [36, 40, 43], [38, 41, 45], [35, 39, 42]],
    lead: [0, 2, -1, 1, -1, 2, -1, -1, 0, -1, 1, 2, -1, -1, 1, -1] },
  f4: { bpm: 118, style: 'pulse', prog: [[47, 50, 54], [43, 47, 50], [45, 48, 52], [42, 46, 49]],
    lead: [2, -1, 0, -1, 1, -1, 2, 1, -1, 0, -1, -1, 1, -1, 2, -1] },
  f5: { bpm: 66, style: 'organ', prog: [[38, 41, 45], [39, 43, 46], [34, 38, 41], [37, 40, 44]],
    lead: [0, -1, 1, -1, 2, -1, -1, -1, 2, -1, 1, -1, 0, -1, -1, -1] },
  boss: { bpm: 148, style: 'boss', prog: [[45, 48, 52], [45, 48, 52], [46, 50, 53], [44, 47, 51]],
    lead: [0, -1, 0, 1, -1, 2, -1, 1, 0, -1, 2, -1, 1, -1, 2, 1] },
  final: { bpm: 160, style: 'boss', prog: [[40, 43, 47], [41, 44, 48], [38, 42, 45], [39, 43, 46]],
    lead: [2, 1, 0, -1, 2, -1, 1, -1, 0, 1, 2, -1, 1, 0, -1, -1] },
  death: { bpm: 56, style: 'organ', prog: [[45, 48, 52], [41, 45, 48], [43, 46, 50], [40, 44, 47]],
    lead: [2, -1, -1, -1, 1, -1, -1, -1, 0, -1, -1, -1, -1, -1, -1, -1] },
  win: { bpm: 112, style: 'music-box', prog: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]],
    lead: [0, 1, 2, -1, 2, -1, 1, 2, -1, 2, 1, 0, -1, 1, 2, -1] },
};

const Sound = {
  ctx: null,
  master: null,
  sfxGain: null,
  musicGain: null,
  noiseBuf: null,
  muted: false,
  musicVol: Store.get('musicVol', 6),
  sfxVol: Store.get('sfxVol', 7),
  current: null,
  step: 0,
  nextTime: 0,
  timer: null,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) {
        return;
      }
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3200;
      this.musicGain.connect(lp);
      lp.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.pendingMusic) {
        const m = this.pendingMusic;
        this.pendingMusic = null;
        this.music(m);
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfxGain.gain.value = (this.sfxVol / 10) * 0.8;
    this.musicGain.gain.value = (this.musicVol / 10) * 0.33;
  },

  toggleMute() {
    this.muted = !this.muted;
    this.applyVolumes();
  },

  tone(freq, dur, type = 'square', vol = 0.2, slide = 0, delay = 0, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  // Nappe douce (attaque lente) pour l'orgue et les chœurs.
  pad(freq, dur, type, vol, delay, dest) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.detune.setValueAtTime((Math.random() - 0.5) * 8, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.25, dur * 0.3));
    g.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  },

  noise(dur, vol = 0.2, freq = 2000, delay = 0, dest, type = 'lowpass') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f);
    f.connect(g);
    g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  },

  play(name) {
    if (!this.ctx) return;
    const r = Math.random();
    switch (name) {
      case 'tear': this.tone(520 + r * 90, 0.07, 'sine', 0.12, -260); this.noise(0.03, 0.03, 4000); break;
      case 'splat': this.noise(0.06, 0.06, 1200); this.tone(180 + r * 40, 0.05, 'sine', 0.06, -80); break;
      case 'hit': this.tone(160 + r * 40, 0.07, 'square', 0.07, -80); this.noise(0.05, 0.08, 1800); break;
      case 'kill': this.noise(0.22, 0.18, 900); this.tone(140, 0.2, 'sawtooth', 0.08, -90); break;
      case 'hurt': this.tone(300, 0.08, 'square', 0.12, 120); this.tone(180, 0.28, 'sawtooth', 0.14, -120, 0.06); break;
      case 'coin': this.tone(1318, 0.05, 'square', 0.06); this.tone(1760, 0.16, 'square', 0.06, 0, 0.05); break;
      case 'heart': [587, 740, 880].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.14, 0, i * 0.05)); break;
      case 'soul': [880, 1175, 1480].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.12, 0, i * 0.06)); break;
      case 'key': this.tone(1400, 0.05, 'square', 0.06); this.tone(1900, 0.1, 'square', 0.06, 0, 0.06); break;
      case 'bombpick': this.tone(200, 0.08, 'square', 0.08, 80); this.tone(260, 0.08, 'square', 0.06, 0, 0.07); break;
      case 'item': [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.13, 0, i * 0.08));
        this.pad(midi(60), 1.2, 'sine', 0.08, 0.1, this.sfxGain); this.pad(midi(67), 1.2, 'sine', 0.06, 0.1, this.sfxGain); break;
      case 'bad': [392, 370, 349, 311].forEach((f, i) => this.tone(f, 0.25, 'sawtooth', 0.08, 0, i * 0.12)); break;
      case 'door': this.noise(0.25, 0.12, 300); this.tone(80, 0.25, 'square', 0.1, -25); break;
      case 'doorOpen': this.noise(0.2, 0.08, 500); this.tone(120, 0.15, 'square', 0.06, 60); break;
      case 'unlock': this.tone(900, 0.05, 'square', 0.07); this.tone(600, 0.1, 'square', 0.07, 0, 0.06); this.noise(0.12, 0.06, 2500, 0.05); break;
      case 'select': this.tone(640, 0.04, 'square', 0.05); break;
      case 'confirm': this.tone(640, 0.06, 'square', 0.07); this.tone(960, 0.12, 'square', 0.07, 0, 0.06); break;
      case 'back': this.tone(420, 0.08, 'square', 0.06, -110); break;
      case 'error': this.tone(130, 0.1, 'square', 0.09); this.tone(130, 0.1, 'square', 0.09, 0, 0.13); break;
      case 'buy': this.tone(1318, 0.07, 'square', 0.07); this.tone(1760, 0.2, 'square', 0.07, 0, 0.07); this.noise(0.08, 0.05, 5000, 0.02); break;
      case 'fuse': this.noise(0.1, 0.04, 6000, 0, null, 'highpass'); break;
      case 'explode': this.noise(0.7, 0.32, 600); this.tone(90, 0.5, 'sawtooth', 0.18, -60); this.tone(50, 0.6, 'sine', 0.3, -20); break;
      case 'rock': this.noise(0.18, 0.14, 700); this.tone(110, 0.1, 'square', 0.06, -40); break;
      case 'poop': this.noise(0.12, 0.1, 500); this.tone(90, 0.1, 'sine', 0.1, -30); break;
      case 'fire': this.noise(0.25, 0.08, 2500, 0, null, 'bandpass'); break;
      case 'ebullet': this.tone(420 + r * 60, 0.06, 'triangle', 0.05, -160); break;
      case 'charge': this.tone(150, 0.4, 'sawtooth', 0.08, 250); break;
      case 'slam': this.noise(0.35, 0.28, 280); this.tone(55, 0.35, 'square', 0.16, -25); break;
      case 'jump': this.tone(220, 0.15, 'square', 0.06, 260); break;
      case 'roar': this.tone(70, 1, 'sawtooth', 0.22, -20); this.tone(104, 1, 'square', 0.1, -40); this.noise(1, 0.18, 450); break;
      case 'bossDie': this.noise(1.6, 0.26, 700);
        [392, 311, 262, 196, 131].forEach((f, i) => this.tone(f, 0.35, 'sawtooth', 0.1, -40, i * 0.22)); break;
      case 'clear': [523, 659, 784].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.08, 0, i * 0.07)); break;
      case 'stairs': [784, 659, 523, 392, 330, 262].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.11, 0, i * 0.09)); break;
      case 'spawn': this.tone(180, 0.25, 'sine', 0.06, 280); break;
      case 'teleport': this.tone(1300, 0.22, 'sine', 0.08, -1000); break;
      case 'laser': this.tone(900, 0.4, 'sawtooth', 0.07, -600); this.noise(0.4, 0.06, 3000, 0, null, 'bandpass'); break;
      case 'meow': this.tone(700, 0.12, 'triangle', 0.1, 300); this.tone(1000, 0.25, 'triangle', 0.1, -500, 0.1); break;
      case 'purr': for (let i = 0; i < 8; i++) this.tone(60, 0.06, 'sawtooth', 0.05, 0, i * 0.07); break;
      case 'shield': this.tone(1400, 0.15, 'triangle', 0.12, -600); break;
      case 'power': this.pad(midi(48), 0.8, 'sawtooth', 0.08, 0, this.sfxGain); this.tone(300, 0.6, 'square', 0.06, 700); break;
      case 'blip': this.tone(700 + r * 250, 0.025, 'square', 0.025); break;
      case 'talk': this.tone(300 + r * 200, 0.04, 'triangle', 0.05); break;
      case 'page': this.noise(0.18, 0.08, 3500, 0, null, 'highpass'); break;
      case 'glitch': for (let i = 0; i < 5; i++) this.tone(100 + Math.random() * 1500, 0.04, 'square', 0.05, 0, i * 0.035); break;
      case 'secret': [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.1, 0, i * 0.1)); break;
      case 'unlockBig': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, 'square', 0.07, 0, i * 0.09)); break;
      default: break;
    }
  },

  // ----------------------------------------------------------------- Musique
  music(name) {
    if (!this.ctx) {
      this.pendingMusic = name;
      return;
    }
    if (this.current === name) return;
    this.current = name;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  },

  stopMusic() {
    this.current = null;
    this.pendingMusic = null;
  },

  schedule() {
    if (!this.ctx || !this.current) return;
    const tr = TRACKS[this.current];
    const stepDur = 60 / tr.bpm / 4;
    if (this.nextTime < this.ctx.currentTime - 0.5) this.nextTime = this.ctx.currentTime + 0.05;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(tr, this.step, this.nextTime - this.ctx.currentTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % (tr.prog.length * 16);
    }
  },

  playStep(tr, step, delay, sd) {
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = tr.prog[bar % tr.prog.length];
    const mg = this.musicGain;
    const d = Math.max(0, delay);
    const st = tr.style;
    if (st === 'organ') {
      if (s === 0) chord.forEach((n) => this.pad(midi(n), sd * 16, 'triangle', 0.12, d, mg));
      if (s === 0) this.pad(midi(chord[0] - 12), sd * 16, 'sawtooth', 0.05, d, mg);
      if (s % 4 === 0) this.tone(midi(chord[(s / 4) % 3] + 12), sd * 4, 'sine', 0.06, 0, d, mg);
    } else if (st === 'music-box') {
      if (s % 8 === 0) this.tone(midi(chord[0] - 12), sd * 7, 'triangle', 0.3, 0, d, mg);
      if (s % 2 === 0) this.tone(midi(chord[(s / 2) % 3] + 12), sd * 3, 'sine', 0.1, 0, d, mg);
    } else if (st === 'crypt') {
      if (s === 0) chord.forEach((n) => this.pad(midi(n), sd * 16, 'triangle', 0.07, d, mg));
      if (s % 4 === 0) this.tone(midi(chord[0] - 12), sd * 3, 'triangle', 0.32, 0, d, mg);
      if (s % 4 === 2) this.tone(midi(chord[2] - 12), sd * 1.5, 'triangle', 0.16, 0, d, mg);
      if (s === 0 || s === 10) this.kick(d);
      if (s === 4 || s === 12) this.noise(0.12, 0.08, 1800, d, mg, 'bandpass');
      if (s % 2 === 1) this.noise(0.02, 0.025, 7000, d, mg, 'highpass');
    } else if (st === 'pulse') {
      if (s % 2 === 0) this.tone(midi(chord[0] - 12 + (s % 4 === 2 ? 12 : 0)), sd * 1.8, 'triangle', 0.3, 0, d, mg);
      if (s % 2 === 1) this.tone(midi(chord[((s - 1) / 2) % 3] + 12), sd * 1.4, 'square', 0.03, 0, d, mg);
      if (s % 4 === 0) this.kick(d);
      if (s === 4 || s === 12) this.noise(0.08, 0.1, 2500, d, mg, 'bandpass');
      if (s % 2 === 1) this.noise(0.02, 0.04, 7000, d, mg, 'highpass');
    } else if (st === 'boss') {
      this.tone(midi(chord[0] - 12 + (s % 2 ? 12 : 0)), sd * 0.9, 'sawtooth', 0.09, 0, d, mg);
      if (s === 0) chord.forEach((n) => this.pad(midi(n), sd * 16, 'sawtooth', 0.03, d, mg));
      if (s % 4 === 0) this.kick(d);
      if (s % 8 === 4) this.noise(0.12, 0.14, 2200, d, mg, 'bandpass');
      if (s % 2 === 1) this.noise(0.02, 0.05, 7000, d, mg, 'highpass');
    }
    const li = tr.lead[s];
    if (li >= 0 && (st !== 'organ' || bar % 2 === 0 || s < 8)) {
      const note = chord[li] + (st === 'organ' ? 12 : 24);
      const type = st === 'music-box' ? 'sine' : st === 'organ' ? 'triangle' : 'square';
      const vol = st === 'music-box' ? 0.14 : st === 'organ' ? 0.1 : 0.05;
      this.tone(midi(note), sd * (st === 'boss' ? 1.5 : 3), type, vol, 0, d, mg);
    }
  },

  kick(d) {
    this.tone(110, 0.16, 'sine', 0.5, -75, d, this.musicGain);
  },
};
