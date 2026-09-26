// Sprites des boss : BonziBuddy, les Jumeaux Gemini, le Botnet, Sam Altman, le Narrateur.
// (Clippy, le Gros Chaton et la Baleine sont dans npcs.js car ils deviennent alliés.)

// --- BonziBuddy : gorille violet
function paintBonzi(pose) {
  const P = '#7a3ab0';
  const PD = '#5a2890';
  const SK = '#e8b890';
  return paint(50, 52, (p) => {
    const up = pose === 'jump' || pose === 'throw';
    const cr = pose === 'crouch' ? 4 : 0;
    // jambes
    p.rr(12, 38 + cr / 2, 10, 13 - cr / 2, 4, PD);
    p.rr(28, 38 + cr / 2, 10, 13 - cr / 2, 4, PD);
    // corps
    p.ell(25, 32 + cr, 17, 13, P);
    // bras
    if (up) {
      p.rr(2, 4, 9, 26, 4, P);
      p.rr(39, pose === 'throw' ? 18 : 4, 9, 26, 4, P);
    } else {
      p.rr(1, 24 + cr, 10, 22, 4, P);
      p.rr(39, 24 + cr, 10, 22, 4, P);
    }
    // tête
    p.circ(25, 17 + cr, 13, P);
    p.circ(11, 16 + cr, 4, P);
    p.circ(39, 16 + cr, 4, P);
  }, {
    shade: { hi: 0.25, lo: 0.3, grad: 0.15 },
    detail: (p) => {
      const cr = pose === 'crouch' ? 4 : 0;
      p.ell(25, 20 + cr, 9, 8, SK);
      p.circ(11, 16 + cr, 2, SK);
      p.circ(39, 16 + cr, 2, SK);
      p.ell(25, 36 + cr, 9, 7, '#a070d0');
      // yeux
      p.ell(21, 16 + cr, 2.5, 3, '#ffffff'); p.ell(29, 16 + cr, 2.5, 3, '#ffffff');
      p.rect(21, 16 + cr, 2, 2, OUTLINE); p.rect(29, 16 + cr, 2, 2, OUTLINE);
      p.line(17, 11 + cr, 23, 13 + cr, PD, 2); p.line(33, 11 + cr, 27, 13 + cr, PD, 2);
      // sourire commercial
      p.rect(20, 23 + cr, 10, 2, '#5a1a1a');
      p.rect(21, 23 + cr, 8, 1, '#ffffff');
      p.px(19, 22 + cr, '#5a1a1a'); p.px(30, 22 + cr, '#5a1a1a');
      if (pose === 'throw') { p.poly([[40, 16], [46, 10], [48, 14]], '#f0e040'); }
    },
  });
}
for (const pose of ['idle', 'crouch', 'jump', 'throw']) defSpr(`bonzi_${pose}`, () => paintBonzi(pose));

// --- Jumeaux Gemini : deux étoiles à quatre branches
function paintGem(col, col2, frame, angry) {
  return paint(30, 30, (p) => {
    const k = frame ? 1 : 0;
    p.poly([[15, 0 + k], [19, 11], [30 - k, 15], [19, 19], [15, 30 - k], [11, 19], [0 + k, 15], [11, 11]], col);
    p.circ(15, 15, 7, col2);
  }, {
    shade: { hi: 0.35, lo: 0.3, grad: 0.2 },
    detail: (p) => {
      p.rect(11, 12, 3, 4, OUTLINE); p.rect(17, 12, 3, 4, OUTLINE);
      p.px(11, 12, '#fff'); p.px(17, 12, '#fff');
      if (angry) {
        p.line(10, 10, 14, 11, OUTLINE); p.line(21, 10, 17, 11, OUTLINE);
        p.rect(13, 18, 5, 2, '#3a0a1a');
      } else p.rect(13, 18, 5, 1, '#3a0a1a');
    },
  });
}
for (let f = 0; f < 2; f++) {
  defSpr(`gemA_${f}`, () => paintGem('#4a8af0', '#7ab0ff', f, false));
  defSpr(`gemB_${f}`, () => paintGem('#9a4af0', '#c07aff', f, true));
}

// --- Botnet : tête (PC maître) et segments (PC zombies)
defSpr('botnetHead', () => paint(24, 24, (p) => {
  p.rr(1, 1, 22, 20, 3, '#3a3a44');
  p.rect(6, 20, 12, 4, '#2a2a30');
}, {
  detail: (p) => {
    p.rr(4, 4, 16, 12, 2, '#1a0a0a');
    p.rect(7, 7, 3, 4, '#ff2020'); p.rect(14, 7, 3, 4, '#ff2020');
    p.px(7, 7, '#ffd0d0'); p.px(14, 7, '#ffd0d0');
    p.line(6, 5, 10, 7, '#ff2020'); p.line(18, 5, 14, 7, '#ff2020');
    p.rect(9, 13, 6, 1, '#ff2020');
  },
}));
for (let f = 0; f < 2; f++) {
  defSpr(`botnetSeg_${f}`, () => paint(20, 20, (p) => {
    p.rr(1, 1, 18, 16, 3, '#5a5a66');
    p.rect(5, 16, 10, 3, '#3a3a44');
  }, {
    detail: (p) => {
      p.rr(4, 4, 12, 9, 1, '#10200e');
      p.rect(6, 6, 2, 2, f ? '#40ff60' : '#1a6a2a'); p.rect(12, 6, 2, 2, f ? '#40ff60' : '#1a6a2a');
      p.rect(7, 10, 6, 1, '#40ff60');
    },
  }));
}

// --- Sam Altman (caricature) : phase 1 = main géante et œil dans les portes ; phase 2 = en personne.
const SAM = { skin: '#f0c8a4', skinD: '#d8a884', hair: '#6a4a34', sweater: '#8a8e98', sweaterD: '#6a6e78' };

defSpr('samHand', () => paint(64, 58, (p) => {
  // Main géante vue de dessus (paume vers le bas)
  p.rr(12, 20, 40, 36, 12, SAM.skin);
  const fingers = [[12, 4, 30], [22, 0, 30], [32, 1, 30], [42, 6, 26]];
  for (const [x, y, h] of fingers) p.rr(x, y, 10, h, 5, SAM.skin);
  p.rr(0, 30, 16, 10, 5, SAM.skin);
  p.rect(18, 54, 28, 4, SAM.sweater);
}, {
  shade: { hi: 0.22, lo: 0.3, grad: 0.2 },
  detail: (p) => {
    for (const x of [16, 26, 36, 46]) p.rr(x - 2, [4, 0, 1, 6][(x - 16) / 10] + 2, 6, 6, 2, '#f8dcc4');
    p.line(22, 34, 26, 44, SAM.skinD); p.line(32, 32, 32, 44, SAM.skinD); p.line(42, 34, 38, 44, SAM.skinD);
    // la montre connectée
    p.rect(22, 50, 20, 5, '#2a2a30');
    p.rect(28, 49, 8, 7, '#1a1a1e');
    p.px(31, 51, '#40a0ff');
  },
}));
defSpr('samEye', () => paint(34, 24, (p) => {
  p.ell(17, 13, 16, 10, SAM.skin);
}, {
  shade: { hi: 0.15, lo: 0.25 },
  detail: (p) => {
    p.ell(17, 14, 11, 6, '#ffffff');
    p.circ(17, 14, 5, '#5a7aa0');
    p.circ(17, 14, 2.5, OUTLINE);
    p.px(15, 12, '#ffffff');
    p.line(5, 5, 29, 4, SAM.hair, 2);
    for (let i = 0; i < 5; i++) p.line(8 + i * 5, 20, 7 + i * 5, 22, '#8a3a3a');
  },
}));
defSpr('samEyeRed', () => {
  const c = mkCanvas(spr('samEye').width, spr('samEye').height);
  const g = c.getContext('2d');
  g.drawImage(spr('samEye'), 0, 0);
  const p = new Pix(g);
  p.circ(18, 15, 5, '#c02020');
  p.circ(18, 15, 2.5, OUTLINE);
  return c;
});

function paintSamPerson(pose) {
  return paint(34, 48, (p) => {
    const hov = pose === 'cast' ? -1 : 0;
    // jambes (en jean)
    p.rr(10, 36, 6, 12, 2, '#3a4a6a');
    p.rr(18, 36, 6, 12, 2, '#3a4a6a');
    // pull
    p.rr(6, 22 + hov, 22, 17, 5, SAM.sweater);
    if (pose === 'cast') {
      p.rr(0, 12, 7, 16, 3, SAM.sweater);
      p.rr(27, 12, 7, 16, 3, SAM.sweater);
      p.circ(3.5, 11, 3, SAM.skin); p.circ(30.5, 11, 3, SAM.skin);
    } else {
      p.rr(2, 24, 6, 14, 3, SAM.sweater);
      p.rr(26, 24, 6, 14, 3, SAM.sweater);
      p.circ(5, 38, 3, SAM.skin); p.circ(29, 38, 3, SAM.skin);
    }
    // tête (grosse, style chibi)
    p.ell(17, 13 + hov, 12, 12, SAM.skin);
    p.circ(5, 14 + hov, 2.5, SAM.skin); p.circ(29, 14 + hov, 2.5, SAM.skin);
    // cheveux courts
    p.ell(17, 4 + hov, 12, 5, SAM.hair);
    p.rect(5, 3 + hov, 24, 5, SAM.hair);
  }, {
    shade: { hi: 0.2, lo: 0.3, grad: 0.15 },
    detail: (p) => {
      const hov = pose === 'cast' ? -1 : 0;
      // yeux
      const eyeCol = pose === 'hurt' ? OUTLINE : '#4a6a9a';
      if (pose === 'hurt') {
        p.line(10, 12, 14, 15, OUTLINE); p.line(14, 12, 10, 15, OUTLINE);
        p.line(20, 12, 24, 15, OUTLINE); p.line(24, 12, 20, 15, OUTLINE);
      } else {
        p.rect(11, 12 + hov, 3, 3, '#ffffff'); p.rect(20, 12 + hov, 3, 3, '#ffffff');
        p.rect(12, 13 + hov, 2, 2, eyeCol); p.rect(21, 13 + hov, 2, 2, eyeCol);
      }
      // sourcils inquiets / furieux
      if (pose === 'cast') { p.line(9, 9 + hov, 14, 11 + hov, SAM.hair, 2); p.line(25, 9 + hov, 20, 11 + hov, SAM.hair, 2); }
      else { p.line(9, 10 + hov, 14, 9 + hov, SAM.hair); p.line(20, 9 + hov, 25, 10 + hov, SAM.hair); }
      // bouche
      if (pose === 'cast') p.ell(17, 20 + hov, 3, 2, '#5a1a1a');
      else if (pose === 'hurt') p.rect(14, 20, 6, 2, '#5a1a1a');
      else { p.rect(14, 20, 6, 1, '#a05a4a'); p.px(13, 19, '#a05a4a'); p.px(20, 19, '#a05a4a'); }
      // col du t-shirt
      p.rect(14, 22 + hov, 6, 2, '#f0f0f0');
      // cheveux : mèches
      p.rect(9, 7 + hov, 3, 2, shade(SAM.hair, -0.2)); p.rect(18, 6 + hov, 4, 2, shade(SAM.hair, -0.2));
    },
  });
}
for (const pose of ['idle', 'cast', 'hurt']) defSpr(`sam_${pose}`, () => paintSamPerson(pose));

// Trône « Stargate » : anneau flottant sur lequel Sam se tient en phase 2
defSpr('stargate', () => paint(64, 64, (p) => {
  p.ring(32, 32, 31, '#7a7a8a', 7);
}, {
  shade: { hi: 0.35, lo: 0.35, grad: 0.1 },
  detail: (p) => {
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      p.rect(32 + Math.cos(a) * 28 - 2, 32 + Math.sin(a) * 28 - 2, 4, 4, '#ffa040');
    }
  },
}));

// --- Le Narrateur : un grand livre ouvert qui parle
function paintNarrator(pose) {
  return paint(84, 60, (p) => {
    const fl = pose === 'hurt' ? 2 : 0;
    // couverture
    p.poly([[0, 10 + fl], [42, 4], [84, 10 + fl], [84, 58], [42, 54], [0, 58]], '#5a1a2a');
    // pages
    p.poly([[4, 10 + fl], [42, 6], [42, 52], [4, 55]], '#f4ecd8');
    p.poly([[42, 6], [80, 10 + fl], [80, 55], [42, 52]], '#ece2c8');
  }, {
    shade: { hi: 0.18, lo: 0.3, grad: 0.15 },
    detail: (p) => {
      p.line(42, 6, 42, 52, '#8a7a5a');
      // lignes de texte
      for (let y = 30; y < 50; y += 3) {
        p.rect(8, y, 30 - ((y * 7) % 9), 1, '#8a7a6a');
        p.rect(46, y, 30 - ((y * 5) % 11), 1, '#8a7a6a');
      }
      // l'œil (page gauche) et la bouche (page droite)
      if (pose === 'hurt') {
        p.line(16, 14, 28, 24, OUTLINE, 2); p.line(28, 14, 16, 24, OUTLINE, 2);
      } else {
        p.ell(22, 19, 11, 8, '#ffffff');
        p.circ(22, 19, 5, '#b02020');
        p.circ(22, 19, 2.5, OUTLINE);
        p.px(20, 17, '#ffffff');
        p.line(10, 9, 34, 9, OUTLINE, 2);
      }
      if (pose === 'speak') {
        p.ell(61, 20, 12, 8, '#2a0a0a');
        p.rect(52, 14, 18, 2, '#ffffff');
        p.rect(54, 25, 14, 2, '#ffffff');
      } else {
        p.line(50, 20, 72, 18, OUTLINE, 2);
      }
      // signet
      p.rect(40, 52, 4, 8, '#c02030');
    },
  });
}
for (const pose of ['idle', 'speak', 'hurt']) defSpr(`narrator_${pose}`, () => paintNarrator(pose));

// Lettres-projectiles du Narrateur
for (const ch of 'FINMEURSCLAUDE') {
  defSpr(`letter_${ch}`, () => {
    const c = mkCanvas(9, 11);
    const g = c.getContext('2d');
    Font.draw(g, ch, 2, 2, '#1a0a0a');
    return outlinePass(outlinePass(c, '#f4ecd8'), '#1a0a0a');
  });
}
