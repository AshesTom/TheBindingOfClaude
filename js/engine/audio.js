// Effets sonores et musique chiptune synthétisés avec WebAudio.

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Chaque morceau : tempo, progression d'accords (1 accord par mesure), style.
const TRACKS = {
  title: { bpm: 88, style: 'calm', prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    lead: [0, -1, -1, -1, 2, -1, 1, -1, 0, -1, -1, -1, -1, -1, -1, -1] },
  intro: { bpm: 70, style: 'calm', prog: [[52, 55, 59], [48, 52, 55], [45, 48, 52], [47, 50, 54]],
    lead: [2, -1, -1, -1, -1, -1, 1, -1, -1, -1, 0, -1, -1, -1, -1, -1] },
  floor1: { bpm: 116, style: 'drive', prog: [[50, 53, 57], [46, 50, 53], [48, 52, 55], [45, 49, 52]],
    lead: [0, -1, 1, -1, 2, -1, -1, 1, -1, -1, 0, -1, 2, -1, 1, -1] },
  floor2: { bpm: 124, style: 'drive', prog: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]],
    lead: [2, -1, 1, -1, 0, -1, 1, 2, -1, -1, 1, -1, 0, -1, -1, -1] },
  floor3: { bpm: 104, style: 'drive', prog: [[53, 56, 60], [49, 53, 56], [51, 55, 58], [48, 51, 55]],
    lead: [0, -1, -1, 2, -1, -1, 1, -1, 0, -1, -1, 2, -1, 1, -1, -1] },
  boss: { bpm: 152, style: 'boss', prog: [[45, 48, 52], [45, 48, 52], [46, 50, 53], [44, 47, 51]],
    lead: [0, -1, 0, 1, -1, 2, -1, 1, 0, -1, 2, -1, 1, -1, 2, 1] },
  gameover: { bpm: 60, style: 'calm', prog: [[45, 48, 52], [41, 45, 48], [43, 46, 50], [40, 44, 47]],
    lead: [2, -1, -1, -1, 1, -1, -1, -1, 0, -1, -1, -1, -1, -1, -1, -1] },
  victory: { bpm: 120, style: 'drive', prog: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]],
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
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.pendingMusic) this.music(this.pendingMusic);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfxGain.gain.value = (this.sfxVol / 10) * 0.8;
    this.musicGain.gain.value = (this.musicVol / 10) * 0.35;
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
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
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
    switch (name) {
      case 'shoot': this.tone(760 + Math.random() * 80, 0.06, 'square', 0.05, -380); break;
      case 'hit': this.tone(260, 0.05, 'square', 0.07, -120); this.noise(0.04, 0.05, 3000); break;
      case 'splash': this.noise(0.05, 0.03, 1800); break;
      case 'kill': this.noise(0.18, 0.16, 1400); this.tone(320, 0.14, 'square', 0.07, -250); break;
      case 'hurt': this.tone(220, 0.25, 'sawtooth', 0.18, -160); this.noise(0.12, 0.14, 900); break;
      case 'dash': this.noise(0.12, 0.1, 3000, 0, null, 'bandpass'); this.tone(300, 0.1, 'sine', 0.08, 400); break;
      case 'coin': this.tone(988, 0.06, 'square', 0.08); this.tone(1319, 0.14, 'square', 0.08, 0, 0.06); break;
      case 'heart': [523, 659, 784].forEach((f, i) => this.tone(f, 0.12, 'triangle', 0.14, 0, i * 0.06)); break;
      case 'key': this.tone(1200, 0.06, 'square', 0.07); this.tone(1600, 0.1, 'square', 0.07, 0, 0.07); break;
      case 'item': [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, 'square', 0.09, 0, i * 0.09)); break;
      case 'boon': [392, 494, 587, 784, 988].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.14, 0, i * 0.07)); break;
      case 'door': this.noise(0.18, 0.12, 400); this.tone(90, 0.18, 'square', 0.1, -30); break;
      case 'doorOpen': this.tone(300, 0.12, 'square', 0.08, 300); this.tone(600, 0.1, 'square', 0.06, 200, 0.1); break;
      case 'select': this.tone(660, 0.04, 'square', 0.06); break;
      case 'confirm': this.tone(660, 0.06, 'square', 0.08); this.tone(990, 0.12, 'square', 0.08, 0, 0.06); break;
      case 'back': this.tone(440, 0.08, 'square', 0.07, -110); break;
      case 'error': this.tone(140, 0.1, 'square', 0.1); this.tone(140, 0.1, 'square', 0.1, 0, 0.13); break;
      case 'special':
        this.noise(0.5, 0.2, 1500);
        this.tone(200, 0.5, 'sawtooth', 0.12, 1000);
        this.tone(400, 0.4, 'square', 0.06, 800, 0.05);
        break;
      case 'shield': this.tone(1400, 0.15, 'triangle', 0.14, -600); break;
      case 'dodge': this.tone(900, 0.1, 'sine', 0.1, 500); break;
      case 'bossRoar':
        this.tone(70, 0.9, 'sawtooth', 0.22, -20);
        this.tone(105, 0.9, 'square', 0.1, -40);
        this.noise(0.9, 0.18, 500);
        break;
      case 'bossDie':
        this.noise(1.5, 0.25, 800);
        [400, 300, 220, 160, 110].forEach((f, i) => this.tone(f, 0.3, 'square', 0.12, -50, i * 0.2));
        break;
      case 'ebullet': this.tone(500, 0.05, 'triangle', 0.04, -150); break;
      case 'charge': this.tone(200, 0.3, 'sawtooth', 0.08, 200); break;
      case 'slam': this.noise(0.3, 0.25, 300); this.tone(60, 0.3, 'square', 0.14, -30); break;
      case 'buy': this.tone(1319, 0.08, 'square', 0.08); this.tone(1760, 0.2, 'square', 0.08, 0, 0.08); break;
      case 'stairs': [784, 659, 523, 392, 330].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.12, 0, i * 0.08)); break;
      case 'unlock': this.tone(800, 0.06, 'square', 0.08); this.tone(500, 0.1, 'square', 0.08, 0, 0.06); this.noise(0.1, 0.06, 2000, 0.06); break;
      case 'break': this.noise(0.15, 0.12, 1200); break;
      case 'blip': this.tone(900 + Math.random() * 200, 0.02, 'square', 0.025); break;
      case 'spawn': this.tone(200, 0.2, 'sine', 0.05, 300); break;
      case 'teleport': this.tone(1200, 0.2, 'sine', 0.08, -900); break;
      case 'clear': [523, 784].forEach((f, i) => this.tone(f, 0.15, 'square', 0.07, 0, i * 0.08)); break;
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
    while (this.nextTime < this.ctx.currentTime + 0.12) {
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
    if (tr.style === 'calm') {
      if (s % 8 === 0) this.tone(midi(chord[0] - 12), sd * 7, 'triangle', 0.35, 0, d, mg);
      if (s % 2 === 0) this.tone(midi(chord[(s / 2) % 3] + 12), sd * 3, 'triangle', 0.12, 0, d, mg);
    } else if (tr.style === 'drive') {
      if (s % 2 === 0) this.tone(midi(chord[0] - 12 + (s % 4 === 2 ? 12 : 0)), sd * 1.8, 'triangle', 0.35, 0, d, mg);
      if (s % 2 === 1) this.tone(midi(chord[((s - 1) / 2) % 3] + 12), sd * 1.5, 'square', 0.035, 0, d, mg);
      if (s === 0 || s === 8) this.kick(d);
      if (s === 4 || s === 12) this.noise(0.08, 0.1, 2500, d, mg, 'bandpass');
      if (s % 2 === 1) this.noise(0.02, 0.04, 7000, d, mg, 'highpass');
    } else if (tr.style === 'boss') {
      this.tone(midi(chord[0] - 12 + (s % 2 ? 12 : 0)), sd * 0.9, 'sawtooth', 0.1, 0, d, mg);
      if (s % 4 === 0) this.kick(d);
      if (s % 8 === 4) this.noise(0.1, 0.14, 2500, d, mg, 'bandpass');
      if (s % 2 === 1) this.noise(0.02, 0.05, 7000, d, mg, 'highpass');
    }
    const li = tr.lead[s];
    if (li >= 0 && (tr.style !== 'calm' || bar % 2 === 0 || s < 8)) {
      const note = chord[li] + 24 - (tr.style === 'calm' ? 12 : 0);
      this.tone(midi(note), sd * (tr.style === 'boss' ? 1.5 : 2.5), 'square', tr.style === 'calm' ? 0.05 : 0.06, 0, d, mg);
    }
  },

  kick(d) {
    this.tone(120, 0.15, 'sine', 0.5, -80, d, this.musicGain);
  },
};
