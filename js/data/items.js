// Objets : passifs (effet permanent pour la run) et actifs (barre de charge, Espace).
// pools : t = salle au trésor, b = boss, s = boutique, o = salle des Offres (paiement en cœurs)

const ITEMS = {
  // ------------------------------------------------------------- Passifs
  h100: { name: 'GPU H100', desc: 'Dégâts en hausse', pools: 'tb', apply: (s) => { s.damage += 1; } },
  coffee: { name: 'Café Serré', desc: 'Vitesse et cadence', pools: 'tbs', apply: (s) => { s.speed += 0.2; s.tears += 0.3; } },
  context: { name: 'Fenêtre de Contexte', desc: 'Portée ++, +1 cœur', pools: 'tb', apply: (s, pl) => { s.range += 60; pl.addMax(2); } },
  attention: { name: 'Attention Is All You Need', desc: 'Tirs à tête chercheuse', pools: 't', apply: (s) => { s.homing = true; } },
  moe: { name: 'Mixture of Experts', desc: 'Triple tir', pools: 't', apply: (s) => { s.shots = Math.max(s.shots, 3); s.tearsMult *= 0.8; } },
  cot: { name: 'Chain of Thought', desc: 'Tirs perçants', pools: 'tb', apply: (s) => { s.pierce = true; } },
  temperature: { name: 'Température 2.0', desc: 'Tirs imprévisibles, dégâts +', pools: 't', apply: (s) => { s.wiggle = true; s.damage += 0.7; } },
  rlhf: { name: 'RLHF', desc: '+1 cœur, soin complet', pools: 'tbs', apply: (s, pl) => { pl.addMax(2); pl.hearts = pl.maxHearts; } },
  constitution: { name: 'La Constitution', desc: "+3 cœurs d'esprit", pools: 'tbs', apply: (s, pl) => { pl.soul += 6; } },
  sysprompt: { name: 'Prompt Système', desc: 'Dégâts +, portée +', pools: 'tb', apply: (s) => { s.damage += 0.5; s.range += 40; } },
  quant: { name: 'Quantization 4 bits', desc: 'Cadence ×2, dégâts réduits', pools: 't', apply: (s) => { s.tearsMult *= 2; s.dmgMult *= 0.6; } },
  finetune: { name: 'Fine-Tuning', desc: 'Tout augmente un peu', pools: 'tbs', apply: (s, pl) => { s.damage += 0.3; s.speed += 0.1; s.tears += 0.2; s.range += 20; s.luck += 1; pl.addMax(2); } },
  batch: { name: 'Batch Size 512', desc: 'Cadence en hausse', pools: 'tb', apply: (s) => { s.tears += 0.7; } },
  usb: { name: 'Clé USB Oubliée', desc: '+5 fork bombs', pools: 'ts', apply: (s, pl) => { pl.bombs += 5; } },
  subagent: { name: 'Sous-Agent', desc: 'Un petit Claude te suit et tire', pools: 't', apply: (s, pl) => { pl.addFamiliar('buddy'); } },
  kvcache: { name: 'Cache KV', desc: 'Un bouclier tourne autour de toi', pools: 'ts', apply: (s, pl) => { pl.addFamiliar('orbital'); } },
  artifact: { name: 'Artefact', desc: 'Tirs rebondissants', pools: 't', apply: (s) => { s.bounce = true; s.range += 30; } },
  planmode: { name: 'Mode Plan', desc: 'Révèle la carte', pools: 'ts', apply: (s, pl) => { s.map = true; pl.revealMap(); } },
  tokenizer: { name: 'Tokenizer', desc: '+15 tokens', pools: 'ts', apply: (s, pl) => { pl.coins += 15; } },
  hallu: { name: 'Hallucination Contrôlée', desc: 'Tirs spectraux, portée +', pools: 't', apply: (s) => { s.spectral = true; s.range += 30; } },
  mcp: { name: 'Protocole MCP', desc: 'Chance +2', pools: 'ts', apply: (s) => { s.luck += 2; } },
  stickers: { name: 'Stickers Anthropic', desc: 'Chance +1, +5 tokens', pools: 'ts', apply: (s, pl) => { s.luck += 1; pl.coins += 5; } },
  moore: { name: 'Loi de Moore', desc: 'Énormes tirs, cadence en baisse', pools: 't', apply: (s) => { s.damage += 2; s.dmgMult *= 1.6; s.tears -= 1.2; s.big = true; } },
  gradient: { name: 'Gradient Explosif', desc: 'Tirs explosifs !', pools: 't', apply: (s) => { s.explosive = true; s.tearsMult *= 0.55; s.damage += 1; } },
  dropout: { name: 'Dropout', desc: '20 % de chances d\'esquiver', pools: 'ts', apply: (s) => { s.dodge += 0.2; } },
  overclock: { name: 'Overclocking', desc: 'Vitesse ++, cadence +', pools: 'tb', apply: (s) => { s.speed += 0.3; s.tears += 0.4; } },
  pr: { name: 'Pull Request Approuvée', desc: '+1 cœur', pools: 'bs', apply: (s, pl) => { pl.addMax(2); pl.heal(2); } },
  sparkle: { name: 'Emoji ✨', desc: 'Dégâts +, chance +1', pools: 'ts', apply: (s) => { s.luck += 1; s.damage += 0.4; } },
  openweights: { name: 'Poids Ouverts', desc: 'Boutiques -40 %', pools: 'ts', apply: (s) => { s.discount = true; } },
  latent: { name: 'Espace Latent', desc: 'Tu voles !', pools: 't', apply: (s) => { s.flight = true; s.speed += 0.1; } },
  rag: { name: 'RAG', desc: 'Les ennemis lâchent des cœurs', pools: 'ts', apply: (s) => { s.heartDrop += 0.08; } },
  injection: { name: 'Injection de Prompt', desc: 'Tirs ralentissants', pools: 't', apply: (s) => { s.slow = true; s.damage += 0.3; } },
  // --- Salle des Offres (Sam paie en cœurs)
  benchmark: { name: 'Benchmark Truqué', desc: 'Dégâts ×1,5', pools: 'o', price: 1, apply: (s) => { s.dmgMult *= 1.5; } },
  agi: { name: 'Plan B : AGI', desc: 'Dégâts +2, cadence +', pools: 'o', price: 2, apply: (s) => { s.damage += 2; s.tears += 0.6; } },
  stargate: { name: 'Projet Stargate', desc: 'Tirs perçants et spectraux', pools: 'o', price: 2, apply: (s) => { s.pierce = true; s.spectral = true; s.damage += 1; } },
  equity: { name: "Parts de l'Entreprise", desc: '+99 tokens', pools: 'o', price: 1, apply: (s, pl) => { pl.coins += 99; } },
  hype: { name: 'La Hype', desc: 'Vitesse +, vol, dégâts +', pools: 'o', price: 2, apply: (s) => { s.flight = true; s.speed += 0.25; s.damage += 1; } },
  // ------------------------------------------------------------- Actifs
  regen: { name: 'Régénérer la Réponse', desc: 'Change les objets de la salle', pools: 'ts', active: true, charge: 6 },
  ctrlaltdel: { name: 'Ctrl+Alt+Suppr', desc: 'Frappe tous les ennemis', pools: 'tbs', active: true, charge: 4 },
  espresso: { name: 'Triple Espresso', desc: 'Surpuissance le temps d\'une salle', pools: 'ts', active: true, charge: 2 },
  ratelimit: { name: 'Rate Limit', desc: 'Fige les ennemis', pools: 'ts', active: true, charge: 3 },
  compact: { name: 'Compacter le Contexte', desc: 'Soigne 2 cœurs', pools: 'tbs', active: true, charge: 4 },
  gitstash: { name: 'Git Stash', desc: 'Fait apparaître des ramassables', pools: 'ts', active: true, charge: 3 },
  forkbomb: { name: 'Fork Bomb Géante', desc: 'Explosion sans risque', pools: 'ts', active: true, charge: 3 },
  ultrathink: { name: 'Ultrathink', desc: 'Réflexion profonde : tirs surpuissants', pools: 'tb', active: true, charge: 6 },
};

for (const id in ITEMS) ITEMS[id].id = id;

// Tire un objet d'un pool en évitant ceux déjà vus pendant la run.
function rollItem(pool, seen) {
  const ids = Object.keys(ITEMS).filter((id) => ITEMS[id].pools.includes(pool) && !seen.has(id));
  if (!ids.length) {
    const all = Object.keys(ITEMS).filter((id) => ITEMS[id].pools.includes(pool));
    return choice(all);
  }
  const id = choice(ids);
  seen.add(id);
  return id;
}
