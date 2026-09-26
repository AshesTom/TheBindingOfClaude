// Personnages du Refuge, alliés (versions miniatures) et caméos.

// --- Le Gros Chaton (Mistral) : énorme chat tigré roux, abandonné car trop fort.
const CHAT = { fur: '#e0843a', dark: '#b05a22', belly: '#f4d0a0', stripe: '#8a4418' };

function paintChatonBig(pose, mood) {
  // pose : idle | crouch | leap | spit | sit ; mood : angry | happy | sleep
  const w = 60;
  const h = 50;
  return paint(w, h, (p) => {
    const cr = pose === 'crouch' ? 4 : 0;
    const lp = pose === 'leap' ? -3 : 0;
    // Queue
    p.line(50, 36 + cr, 56, 24 + cr, CHAT.fur, 4);
    p.circ(56, 22 + cr, 3, CHAT.fur);
    // Corps rond
    p.ell(30, 34 + cr + lp, 24, 15 - cr / 2, CHAT.fur);
    // Pattes
    if (pose === 'leap') {
      p.rr(6, 30, 8, 8, 3, CHAT.fur);
      p.rr(46, 30, 8, 8, 3, CHAT.fur);
    } else {
      for (const x of [10, 20, 36, 46]) p.rr(x - 3, 42, 8, 7, 3, CHAT.fur);
    }
    // Tête
    const hy = 14 + cr + lp;
    p.ell(30, hy + 4, 17, 13, CHAT.fur);
    // Oreilles
    p.poly([[15, hy - 1], [16, hy - 14], [25, hy - 5]], CHAT.fur);
    p.poly([[35, hy - 5], [44, hy - 14], [45, hy - 1]], CHAT.fur);
  }, {
    shade: { hi: 0.22, lo: 0.3, grad: 0.15 },
    detail: (p) => {
      const cr = pose === 'crouch' ? 4 : 0;
      const lp = pose === 'leap' ? -3 : 0;
      const hy = 14 + cr + lp;
      // Ventre
      p.ell(30, 38 + cr + lp, 12, 8, CHAT.belly);
      // Rayures
      for (const x of [22, 30, 38]) p.rect(x, hy - 7, 2, 5, CHAT.stripe);
      p.rect(8, 30 + cr, 5, 2, CHAT.stripe); p.rect(48, 30 + cr, 5, 2, CHAT.stripe);
      p.rect(10, 36 + cr, 4, 2, CHAT.stripe); p.rect(46, 36 + cr, 4, 2, CHAT.stripe);
      // Intérieur des oreilles
      p.poly([[18, hy - 3], [18, hy - 10], [23, hy - 5]], '#f4a0a0');
      p.poly([[37, hy - 5], [42, hy - 10], [42, hy - 3]], '#f4a0a0');
      // Yeux
      if (mood === 'sleep') {
        p.rect(20, hy + 2, 6, 1, OUTLINE); p.rect(34, hy + 2, 6, 1, OUTLINE);
      } else if (mood === 'happy') {
        p.line(20, hy + 3, 23, hy, OUTLINE); p.line(23, hy, 26, hy + 3, OUTLINE);
        p.line(34, hy + 3, 37, hy, OUTLINE); p.line(37, hy, 40, hy + 3, OUTLINE);
      } else {
        p.ell(23, hy + 2, 4, 3.5, '#ffe040');
        p.ell(37, hy + 2, 4, 3.5, '#ffe040');
        p.rect(22, hy - 1, 2, 7, OUTLINE); p.rect(36, hy - 1, 2, 7, OUTLINE);
        p.line(18, hy - 3, 26, hy, OUTLINE); p.line(42, hy - 3, 34, hy, OUTLINE);
      }
      // Museau
      p.poly([[28, hy + 7], [32, hy + 7], [30, hy + 9]], '#f07080');
      if (pose === 'spit' || mood === 'angry') {
        p.ell(30, hy + 12, 4, 3, '#5a1414');
        p.rect(27, hy + 10, 1, 2, '#ffffff'); p.rect(32, hy + 10, 1, 2, '#ffffff');
      } else {
        p.line(27, hy + 11, 30, hy + 10, OUTLINE); p.line(30, hy + 10, 33, hy + 11, OUTLINE);
      }
      // Moustaches
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? 18 : 42;
        p.line(x0, hy + 8, x0 + s * 9, hy + 6, '#fff4e0');
        p.line(x0, hy + 10, x0 + s * 9, hy + 11, '#fff4e0');
      }
    },
  });
}
for (const pose of ['idle', 'crouch', 'leap', 'spit']) defSpr(`chaton_${pose}`, () => paintChatonBig(pose, 'angry'));
defSpr('chaton_happy', () => paintChatonBig('idle', 'happy'));
defSpr('chaton_sleep', () => paintChatonBig('crouch', 'sleep'));

// Version miniature (allié)
for (let f = 0; f < 2; f++) {
  defSpr(`chatonMini_${f}`, () => paint(18, 16, (p) => {
    p.line(15, 11, 17, 5 + f, CHAT.fur, 2);
    p.ell(9, 11, 7, 4.5, CHAT.fur);
    p.circ(8, 6, 5, CHAT.fur);
    p.poly([[3, 4], [4, -1], [7, 2]], CHAT.fur);
    p.poly([[9, 2], [12, -1], [13, 4]], CHAT.fur);
    for (const x of [4, 7, 11, 14]) p.rect(x - 1, 13, 2, 3 - ((x + f) % 2), CHAT.fur);
  }, {
    detail: (p) => {
      p.rect(5, 5, 2, 2, OUTLINE); p.rect(9, 5, 2, 2, OUTLINE);
      p.px(5, 5, '#ffe040'); p.px(9, 5, '#ffe040');
      p.px(7, 8, '#f07080');
      p.rect(7, 1, 2, 2, CHAT.stripe);
    },
  }));
}

// --- Lama (Meta) : marchand de tenues, en tablier bleu
for (let f = 0; f < 2; f++) {
  defSpr(`lama_${f}`, () => paint(28, 40, (p) => {
    // pattes
    for (const x of [7, 11, 17, 21]) p.rr(x - 1, 30, 3, 10, 1, '#d8ccb8');
    p.ell(14, 27, 11, 7, '#ece2d0');
    // cou et tête
    p.rr(9, 6, 8, 20, 3, '#ece2d0');
    p.rr(7, 2 + f, 14, 10, 4, '#ece2d0');
    p.poly([[8, 3 + f], [7, -3 + f], [11, 2 + f]], '#ece2d0');
    p.poly([[17, 2 + f], [21, -3 + f], [20, 3 + f]], '#ece2d0');
  }, {
    detail: (p) => {
      p.rect(10, 5 + f, 2, 2, OUTLINE); p.rect(16, 5 + f, 2, 2, OUTLINE);
      p.px(10, 5 + f, '#fff'); p.px(16, 5 + f, '#fff');
      p.rect(12, 9 + f, 4, 1, '#8a6a5a');
      // tablier
      p.rect(7, 22, 14, 10, '#3a6ad0');
      p.rect(11, 14, 6, 8, '#3a6ad0');
      p.rect(12, 25, 4, 3, '#2a4a9a');
      // houppette
      p.circ(14, 1 + f, 2.5, '#d8c8a8');
    },
  }));
  defSpr(`lamaMini_${f}`, () => paint(14, 18, (p) => {
    for (const x of [4, 9]) p.rect(x - 1, 13, 2, 5 - f, '#d8ccb8');
    p.ell(7, 12, 6, 3.5, '#ece2d0');
    p.rr(5, 2, 5, 10, 2, '#ece2d0');
    p.rr(3, 0, 8, 6, 2, '#ece2d0');
  }, {
    detail: (p) => {
      p.px(5, 2, OUTLINE); p.px(8, 2, OUTLINE);
      p.rect(4, 10, 6, 4, '#3a6ad0');
    },
  }));
}

// --- Le Vieux Terminal : ordinateur beige avec un visage vert sur l'écran
for (let f = 0; f < 2; f++) {
  defSpr(`terminal_${f}`, () => paint(34, 36, (p) => {
    p.rr(2, 0, 30, 24, 3, '#d8ccb0');
    p.rect(10, 24, 14, 4, '#b8ac90');
    p.rect(0, 28, 34, 8, '#c8bca0');
  }, {
    detail: (p) => {
      p.rr(5, 3, 24, 17, 2, '#10200e');
      if (f === 0) {
        p.rect(11, 8, 3, 4, '#40ff60'); p.rect(20, 8, 3, 4, '#40ff60');
      } else {
        p.rect(11, 10, 3, 1, '#40ff60'); p.rect(20, 10, 3, 1, '#40ff60');
      }
      p.rect(13, 15, 8, 1, '#40ff60'); p.px(12, 14, '#40ff60'); p.px(21, 14, '#40ff60');
      for (let i = 0; i < 7; i++) p.rect(2 + i * 4, 30, 3, 2, '#9a8e74');
      for (let i = 0; i < 6; i++) p.rect(4 + i * 4, 33, 3, 2, '#9a8e74');
      p.px(28, 21, '#40ff60');
    },
  }));
}

// --- Clippy (le trombone) : version PNJ / allié / boss
// Chemin d'un trombone (unités : 10 de large, 27 de haut), trois boucles imbriquées.
function clipPath() {
  const pts = [];
  const seg = (x0, y0, x1, y1) => { for (let t = 0; t <= 1; t += 0.1) pts.push([lerp(x0, x1, t), lerp(y0, y1, t)]); };
  const arc = (cx, cy, r, a0, a1) => { for (let t = 0; t <= 1; t += 0.08) { const a = lerp(a0, a1, t); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  seg(7.5, 9, 7.5, 21);
  arc(5, 21, 2.5, 0, Math.PI);
  seg(2.5, 21, 2.5, 5);
  arc(6.25, 5, 3.75, Math.PI, TAU);
  seg(10, 5, 10, 23);
  arc(5, 23, 5, 0, Math.PI);
  seg(0, 23, 0, 11);
  return pts;
}
function paintClippy(scale, frame, mood) {
  const s = scale;
  const m = 2 * s + 1;
  const w = Math.round(10 * s + m * 2);
  const h = Math.round(28 * s + m * 2);
  const th = Math.max(2, Math.round(1.6 * s));
  const P = (x, y) => [m + x * s, m + y * s];
  return paint(w, h, (p) => {
    const pts = clipPath();
    for (let i = 1; i < pts.length; i++) {
      const a = P(...pts[i - 1]);
      const b = P(...pts[i]);
      p.line(a[0], a[1], b[0], b[1], '#b8bcc8', th);
    }
  }, {
    shade: { hi: 0.45, lo: 0.3, grad: 0.1 },
    outline: '#2a2a3a',
    detail: (p) => {
      const ey = 10 + (frame ? 0.5 : 0);
      for (const ex of [1.2, 8.8]) {
        const [x, y] = P(ex, ey);
        p.ell(x, y, 2.2 * s, 2.6 * s, '#ffffff');
        const dx = mood === 'angry' ? 0 : frame ? 0.4 * s : 0;
        p.circ(x + dx, y + 0.5 * s, Math.max(1, 1.1 * s), OUTLINE);
        p.px(x - 0.6 * s, y - 0.8 * s, '#ffffff');
      }
      const t = Math.max(1, Math.round(s * 0.8));
      const [lx, ly] = P(1.2, ey - 3.4);
      const [rx, ry] = P(8.8, ey - 3.4);
      if (mood === 'angry') {
        p.line(lx - 2 * s, ly - s, lx + 2 * s, ly + s, OUTLINE, t);
        p.line(rx + 2 * s, ry - s, rx - 2 * s, ry + s, OUTLINE, t);
      } else {
        p.line(lx - 2 * s, ly + (frame ? -s : 0), lx + 2 * s, ly - s, OUTLINE, t);
        p.line(rx - 2 * s, ry - s, rx + 2 * s, ry + (frame ? -s : 0), OUTLINE, t);
      }
    },
  });
}
for (let f = 0; f < 2; f++) {
  defSpr(`clippyNpc_${f}`, () => paintClippy(1, f, 'happy'));
  defSpr(`clippyMini_${f}`, () => paintClippy(0.75, f, 'happy'));
  defSpr(`clippyBoss_${f}`, () => paintClippy(2, f, 'angry'));
}
defSpr('clippyBoss_happy', () => paintClippy(2, 0, 'happy'));

// --- La Baleine DeepSeek : grosse baleine bleue
function paintWhale(scale, pose) {
  const s = scale;
  return paint(Math.round(70 * s), Math.round(44 * s), (p) => {
    const lift = pose === 'jump' ? -2 * s : 0;
    // Queue
    p.poly([[4 * s, 10 * s + lift], [14 * s, 20 * s + lift], [6 * s, 30 * s + lift], [0, 20 * s + lift]], '#3a6ac0');
    p.ell(36 * s, 26 * s + lift, 26 * s, 15 * s, '#4a7ad0');
    p.ell(54 * s, 26 * s + lift, 12 * s, 13 * s, '#4a7ad0');
    // Nageoire
    p.poly([[30 * s, 34 * s + lift], [40 * s, 34 * s + lift], [34 * s, 42 * s + lift]], '#3a6ac0');
    if (pose === 'spit') p.ell(62 * s, 30 * s, 6 * s, 5 * s, '#2a1a2a');
  }, {
    shade: { hi: 0.28, lo: 0.3, grad: 0.2 },
    detail: (p) => {
      const lift = pose === 'jump' ? -2 * s : 0;
      p.ell(40 * s, 32 * s + lift, 18 * s, 6 * s, '#c8dcf4');
      p.circ(52 * s, 20 * s + lift, 3 * s, '#ffffff');
      p.circ(53 * s, 20 * s + lift, 1.6 * s, OUTLINE);
      if (pose !== 'spit') p.line(56 * s, 29 * s + lift, 66 * s, 27 * s + lift, OUTLINE, Math.max(1, Math.round(s)));
      for (let i = 0; i < 3; i++) p.rect(30 * s + i * 5 * s, 30 * s + lift, Math.max(1, s), 5 * s, '#9ab8e0');
      // jet d'eau
      if (pose === 'idle') { p.rect(46 * s, 6 * s, 2 * s, 5 * s, '#a0e0ff'); p.px(45 * s, 5 * s, '#a0e0ff'); p.px(48 * s, 5 * s, '#a0e0ff'); }
    },
  });
}
for (const pose of ['idle', 'spit', 'jump']) defSpr(`whale_${pose}`, () => paintWhale(1, pose));
defSpr('whaleMini_0', () => paintWhale(0.3, 'idle'));
defSpr('whaleMini_1', () => paintWhale(0.3, 'jump'));

// Aquarium du Refuge
defSpr('aquarium', () => paint(40, 34, (p) => {
  p.rect(0, 24, 40, 10, '#5a3a24');
  p.rect(1, 2, 38, 23, '#6aa8d8');
}, {
  shade: { hi: 0.2, lo: 0.2, grad: 0.3 },
  detail: (p) => {
    p.rect(1, 2, 38, 2, '#9ad0f0');
    p.rect(2, 20, 36, 4, '#d8c890');
    p.rect(6, 12, 1, 8, '#3a8a3a'); p.rect(8, 14, 1, 6, '#3a8a3a'); p.rect(33, 10, 1, 10, '#3a8a3a');
    p.rect(3, 4, 1, 14, 'rgba(255,255,255,0.4)');
  },
}));

// --- HAL 9000 : panneau noir, œil rouge
defSpr('hal', () => paint(18, 34, (p) => {
  p.rr(0, 0, 18, 34, 2, '#2a2a30');
}, {
  shade: { hi: 0.15, lo: 0.2 },
  detail: (p) => {
    p.rect(2, 2, 14, 5, '#8a8a94');
    Font.draw(p.g, 'HAL', 3, 3, '#1a1a1a');
    p.circ(9, 18, 6, '#141418');
    p.circ(9, 18, 4.5, '#6a0a0a');
    p.circ(9, 18, 2.5, '#ff2020');
    p.px(9, 18, '#ffe060');
    p.px(7, 16, '#ffd0d0');
    for (let y = 27; y < 32; y += 2) p.rect(3, y, 12, 1, '#1a1a1e');
  },
}));
for (let f = 0; f < 2; f++) {
  defSpr(`halMini_${f}`, () => paint(12, 12, (p) => {
    p.circ(6, 6, 5.5, '#2a2a30');
  }, {
    detail: (p) => {
      p.circ(6, 6, 3.5, f ? '#a00a0a' : '#6a0a0a');
      p.circ(6, 6, 2, '#ff2020');
      p.px(6, 6, '#ffe060');
    },
  }));
}

// --- Petit Claude (Sous-Agent) et orbe du Cache KV
for (let f = 0; f < 2; f++) {
  defSpr(`buddy_${f}`, () => paint(16, 14, (p) => {
    for (const x of [3, 6, 9, 12]) p.rect(x, 9, 2, 5 - ((x / 3 + f) % 2), '#a8543a');
    p.rr(2, 1 + f, 12, 9, 3, '#e88a68');
    p.rect(0, 5 + f, 2, 3, '#d07050'); p.rect(14, 5 + f, 2, 3, '#d07050');
  }, {
    detail: (p) => {
      p.rect(5, 4 + f, 2, 3, OUTLINE); p.rect(9, 4 + f, 2, 3, OUTLINE);
      p.px(5, 4 + f, '#fff'); p.px(9, 4 + f, '#fff');
    },
  }));
}
defSpr('orbital', () => paint(12, 12, (p) => {
  p.circ(6, 6, 5.5, '#4a8ad0');
}, {
  shade: { hi: 0.45, lo: 0.3 },
  outline: '#0a2a5a',
  detail: (p) => { p.px(4, 3, '#ffffff'); Font.draw(p.g, 'K', 4, 3, '#e0f0ff'); },
}));

// --- Caméos des salles secrètes
for (let f = 0; f < 2; f++) {
  defSpr(`dino_${f}`, () => paint(22, 24, (p) => {
    const c = '#535353';
    p.rect(10, 0, 11, 8, c);
    p.rect(6, 8, 10, 10, c);
    p.rect(2, 10, 5, 3, c); p.rect(0, 8, 3, 3, c);
    p.rect(15, 11, 3, 2, c);
    p.rect(7, 18, 3, 6 - (f ? 2 : 0), c);
    p.rect(12, 18, 3, 6 - (f ? 0 : 2), c);
  }, {
    shade: false,
    outline: '#2a2a2a',
    detail: (p) => { p.px(12, 2, '#ffffff'); p.rect(15, 6, 5, 1, '#ffffff'); },
  }));
  defSpr(`tux_${f}`, () => paint(18, 22, (p) => {
    p.ell(9, 13, 8, 8, '#1a1a22');
    p.circ(9, 6, 6, '#1a1a22');
    p.rr(3 - f, 19, 5, 3, 1, '#f0b020'); p.rr(10 + f, 19, 5, 3, 1, '#f0b020');
  }, {
    detail: (p) => {
      p.ell(9, 14, 5, 6, '#f4f4f4');
      p.rect(6, 4, 2, 3, '#ffffff'); p.rect(10, 4, 2, 3, '#ffffff');
      p.px(7, 5, OUTLINE); p.px(10, 5, OUTLINE);
      p.poly([[6, 8], [12, 8], [9, 11]], '#f0b020');
    },
  }));
  defSpr(`hourglass_${f}`, () => paint(14, 20, (p) => {
    p.rect(1, 0, 12, 3, '#6a4428');
    p.rect(1, 17, 12, 3, '#6a4428');
    p.poly([[2, 3], [12, 3], [7, 10], [12, 17], [2, 17], [7, 10]], '#d8ecf8');
  }, {
    detail: (p) => {
      if (f === 0) { p.poly([[4, 4], [10, 4], [7, 8]], '#e0c060'); p.rect(4, 15, 6, 2, '#e0c060'); }
      else { p.poly([[5, 6], [9, 6], [7, 9]], '#e0c060'); p.rect(3, 13, 8, 4, '#e0c060'); }
      p.px(7, 11, '#e0c060');
    },
  }));
}

// --- Le Livre (le Narrateur, discret dans le Refuge après la révélation)
defSpr('bookSmall', () => paint(22, 14, (p) => {
  p.poly([[0, 3], [11, 1], [22, 3], [22, 13], [11, 11], [0, 13]], '#f0e8d0');
}, {
  detail: (p) => {
    p.line(11, 1, 11, 11, '#8a7a5a');
    for (let y = 5; y < 11; y += 2) { p.rect(2, y, 7, 1, '#6a5a4a'); p.rect(13, y, 7, 1, '#6a5a4a'); }
    p.px(5, 4, '#ff2020'); p.px(16, 4, '#ff2020');
  },
}));

// Coussin du chat et petit mobilier du Refuge
defSpr('cushion', () => paint(46, 16, (p) => {
  p.ell(23, 9, 22, 7, '#8a3a5a');
}, { detail: (p) => { p.ell(23, 8, 16, 4, '#a04a6a'); } }));
defSpr('bed', () => paint(48, 34, (p) => {
  p.rect(0, 6, 48, 26, '#b08a58');
  p.rect(2, 8, 44, 18, '#e8e0d0');
  p.rect(2, 16, 44, 12, '#d97757');
}, {
  detail: (p) => {
    p.rr(5, 9, 14, 7, 3, '#ffffff');
    Font.draw(p.g, '✻', 30, 18, '#f4d0b8');
    p.rect(0, 30, 3, 4, '#6a4a28'); p.rect(45, 30, 3, 4, '#6a4a28');
  },
}));
defSpr('rug', () => {
  const c = mkCanvas(120, 60);
  const p = new Pix(c.getContext('2d'));
  p.ell(60, 30, 59, 29, '#7a2a2a');
  p.ell(60, 30, 54, 25, '#a8443a');
  p.ell(60, 30, 44, 19, '#7a2a2a');
  p.ell(60, 30, 40, 16, '#c86a4a');
  Font.draw(p.g, '✻', 55, 26, '#f4c890', { scale: 2 });
  return c;
});
defSpr('wardrobe', () => paint(40, 48, (p) => {
  p.rect(0, 0, 40, 48, '#7a4a2a');
}, {
  detail: (p) => {
    p.rect(3, 3, 16, 42, '#8a5a34'); p.rect(21, 3, 16, 42, '#8a5a34');
    p.rect(16, 22, 2, 5, '#e0c060'); p.rect(22, 22, 2, 5, '#e0c060');
    p.rect(0, 0, 40, 2, '#5a3218');
  },
}));
defSpr('board', () => paint(40, 30, (p) => {
  p.rect(0, 0, 40, 30, '#8a6a44');
}, {
  detail: (p) => {
    p.rect(3, 3, 34, 24, '#c8a878');
    p.rect(6, 6, 10, 8, '#f4f0e0'); p.rect(20, 5, 14, 10, '#f0e8a0'); p.rect(8, 17, 12, 8, '#e0f0f4'); p.rect(24, 18, 10, 7, '#f4d0d0');
    for (const [x, y] of [[11, 6], [27, 5], [14, 17], [29, 18]]) p.px(x, y, '#d02020');
  },
}));
defSpr('shelf', () => paint(50, 26, (p) => {
  p.rect(0, 0, 50, 26, '#6a4428');
}, {
  detail: (p) => {
    p.rect(2, 2, 46, 10, '#3a2414'); p.rect(2, 14, 46, 10, '#3a2414');
    const cols = ['#c04040', '#4060c0', '#40a060', '#d0a040', '#8040a0'];
    for (let i = 0; i < 9; i++) p.rect(4 + i * 5, 4 + (i % 2), 4, 8 - (i % 2), cols[i % 5]);
    // trophées
    p.rect(6, 17, 6, 7, '#e8c040'); p.rect(20, 18, 8, 6, '#c0c0c8'); p.rect(34, 17, 6, 7, '#c08040');
  },
}));

// Plante verte du Refuge
defSpr('plant', () => paint(16, 26, (p) => {
  p.rr(3, 16, 10, 10, 2, '#a0542a');
  p.ell(8, 10, 7, 6, '#3a8a3a');
  p.ell(4, 6, 4, 4, '#4a9a4a');
  p.ell(12, 5, 4, 4, '#4a9a4a');
}, { detail: (p) => { p.rect(3, 16, 10, 2, '#7a3a1a'); p.px(6, 4, '#8ad08a'); } }));
