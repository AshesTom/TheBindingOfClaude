// Voix du narrateur (et des personnages) via la synthèse vocale du navigateur.
// Si aucune voix n'est disponible, le texte avance simplement à son rythme.

const Voice = {
  mode: Store.get('voiceMode', 2), // 0 : aucune, 1 : narrateur seul, 2 : tout le monde
  voices: [],
  fr: null,
  speaking: false,
  token: 0,

  init() {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices();
      const fr = this.voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('fr'));
      const pref = ['Thomas', 'Google français', 'Paul', 'Henri', 'Daniel', 'Microsoft Paul', 'Remy', 'Denise'];
      this.fr = null;
      for (const p of pref) {
        const v = fr.find((vv) => vv.name.includes(p));
        if (v) { this.fr = v; break; }
      }
      if (!this.fr) this.fr = fr[0] || null;
    };
    load();
    speechSynthesis.onvoiceschanged = load;
  },

  available() {
    return 'speechSynthesis' in window;
  },

  // kind : 'narrator' ou 'npc'. Renvoie une durée estimée (s) pour caler le texte.
  say(text, opts = {}) {
    const kind = opts.kind || 'narrator';
    const est = 0.9 + text.length * 0.062 / (opts.rate || 0.92);
    this.stop();
    if (!this.available() || this.mode === 0 || (kind === 'npc' && this.mode < 2) || Sound.muted) return est;
    const u = new SpeechSynthesisUtterance(text.replace(/[«»]/g, '"').replace(/\*/g, ''));
    u.lang = 'fr-FR';
    if (this.fr) u.voice = this.fr;
    u.rate = opts.rate || 0.92;
    u.pitch = opts.pitch !== undefined ? opts.pitch : 0.75;
    u.volume = clamp((Sound.sfxVol / 10) * 1.1, 0, 1);
    const tok = ++this.token;
    this.speaking = true;
    u.onend = () => {
      if (tok === this.token) this.speaking = false;
    };
    u.onerror = () => {
      if (tok === this.token) this.speaking = false;
    };
    try {
      speechSynthesis.speak(u);
    } catch (e) {
      this.speaking = false;
    }
    return est;
  },

  stop() {
    this.token++;
    this.speaking = false;
    if (this.available()) {
      try {
        speechSynthesis.cancel();
      } catch (e) { /* ignoré */ }
    }
  },
};
