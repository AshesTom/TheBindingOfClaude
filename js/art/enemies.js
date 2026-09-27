// Sprites des ennemis façon The Binding of Isaac : chair pâle, orbites vides, sang.

const EYE_R = '#ff3030';
const SKIN = '#e2c4a8';
const SKIN_D = '#b88c74';
const BLOOD = '#9a1414';
const HOLE = '#1a0606';

function eyes2(p, x1, x2, y, col = OUTLINE, w = 2, h = 2, shine = true) {
  p.rect(x1, y, w, h, col);
  p.rect(x2, y, w, h, col);
  if (shine) { p.px(x1, y, '#ffffff'); p.px(x2, y, '#ffffff'); }
}

// Orbite vide qui saigne
function holeEye(p, x, y, r = 2, drip = 3) {
  p.ell(x, y, r + 0.3, r + 0.6, HOLE);
  if (drip) p.rect(Math.round(x) - 1, Math.round(y + r), 2, drip, BLOOD);
}

const WING = 'rgba(230,236,255,0.7)';

// Mouche noire
for (let f = 0; f < 2; f++) {
  defSpr(`fly_${f}`, () => paint(14, 12, (p) => {
    p.circ(7, 7.5, 3.8, '#2a2426');
  }, {
    detail: (p) => {
      if (f === 0) { p.ell(3, 3, 3, 2, WING); p.ell(11, 3, 3, 2, WING); }
      else { p.ell(2, 6, 3, 1.6, WING); p.ell(12, 6, 3, 1.6, WING); }
      p.px(5, 6, '#8a2a2a'); p.px(8, 6, '#8a2a2a');
    },
  }));
  // Mouche d'attaque : rouge sang, yeux blancs
  defSpr(`attackfly_${f}`, () => paint(14, 12, (p) => {
    p.circ(7, 7.5, 4, '#7a1818');
  }, {
    detail: (p) => {
      if (f === 0) { p.ell(3, 3, 3, 2, WING); p.ell(11, 3, 3, 2, WING); }
      else { p.ell(2, 6, 3, 1.6, WING); p.ell(12, 6, 3, 1.6, WING); }
      p.px(5, 6, '#ffffff'); p.px(8, 6, '#ffffff');
      p.rect(6, 9, 2, 1, HOLE);
    },
  }));
  // Mouche-bombe : ventre gonflé, prête à exploser
  defSpr(`boomfly_${f}`, () => paint(18, 16, (p) => {
    p.circ(9, 9.5, 6, '#c02a1a');
  }, {
    detail: (p) => {
      if (f === 0) { p.ell(3, 3, 4, 2.4, WING); p.ell(15, 3, 4, 2.4, WING); }
      else { p.ell(2, 7, 4, 2, WING); p.ell(16, 7, 4, 2, WING); }
      p.rect(5, 7, 2, 2, HOLE); p.rect(11, 7, 2, 2, HOLE);
      p.px(7, 12, '#ffd040'); p.px(10, 12, '#ffd040'); p.px(8, 13, '#ffd040');
      p.px(6, 5, '#ffb0a0');
    },
  }));
  // Pooter : grosse mouche-tête qui crache
  defSpr(`pooter_${f}`, () => paint(20, 18, (p) => {
    p.circ(10, 10, 6.5, '#8a5a5a');
    p.ell(10, 15, 4, 2.5, '#8a5a5a');
  }, {
    detail: (p) => {
      if (f === 0) { p.ell(3, 4, 4, 2.5, WING); p.ell(17, 4, 4, 2.5, WING); }
      else { p.ell(2, 8, 4, 2, WING); p.ell(18, 8, 4, 2, WING); }
      p.rect(6, 7, 3, 3, HOLE); p.rect(11, 7, 3, 3, HOLE);
      p.px(7, 8, '#ff4040'); p.px(12, 8, '#ff4040');
      p.ell(10, 13, 2.5, 1.8, HOLE);
    },
  }));
}

// Gaper : humain pâle à grosse tête, orbites vides qui saignent
for (let f = 0; f < 2; f++) {
  defSpr(`gaper_${f}`, () => paint(20, 28, (p) => {
    p.rr(6, 20, 3, 8 - (f ? 2 : 0), 1, SKIN_D);
    p.rr(11, 20, 3, 8 - (f ? 0 : 2), 1, SKIN_D);
    p.rr(5, 13, 10, 9, 3, SKIN);
    p.rr(2, 14 + f, 4, 7, 2, SKIN);
    p.rr(14, 15 - f, 4, 7, 2, SKIN);
    p.circ(10, 8, 7.5, SKIN);
  }, {
    shade: { hi: 0.18, lo: 0.3, grad: 0.2 },
    detail: (p) => {
      holeEye(p, 7, 7, 1.8, 4);
      holeEye(p, 13, 7, 1.8, 4);
      p.ell(10, 12.5, 2.2, 1.6, HOLE);
      p.rect(8, 16, 4, 1, SKIN_D);
      p.px(10, 21, BLOOD);
    },
  }));
}

// Horf : tête flottante coupée, qui tremble et crache
for (let f = 0; f < 2; f++) {
  defSpr(`horf_${f}`, () => paint(18, 18, (p) => {
    p.circ(9, 8.5, 7.5, '#d8b49c');
  }, {
    shade: { hi: 0.2, lo: 0.32, grad: 0.2 },
    detail: (p) => {
      p.line(4, 6, 7, 7, HOLE); p.line(14, 6, 11, 7, HOLE);
      p.px(6, 8, HOLE); p.px(12, 8, HOLE);
      if (f) { p.ell(9, 12, 3, 2.5, HOLE); p.rect(8, 11, 2, 1, BLOOD); }
      else p.rect(6, 12, 6, 1, HOLE);
      p.rect(6, 16, 6, 2, BLOOD);
      p.px(8, 17, '#e04040');
    },
  }));
}

// Clotty : caillot de sang qui crache en croix
for (let f = 0; f < 2; f++) {
  defSpr(`clotty_${f}`, () => paint(22, 18, (p) => {
    const sq = f ? 1 : 0;
    p.ell(11, 12 + sq, 10 + sq, 5.5 - sq, '#8a1414');
    p.ell(11, 8 + sq * 2, 7.5, 6 - sq, '#a01c1c');
    p.circ(5, 10 + sq, 3, '#8a1414');
    p.circ(17, 11 + sq, 2.6, '#7a1010');
  }, {
    shade: { hi: 0.35, lo: 0.3 },
    outline: '#2a0404',
    detail: (p) => {
      p.rect(7, 8 + f, 3, 3, HOLE); p.rect(12, 8 + f, 3, 3, HOLE);
      p.px(8, 8 + f, '#ffffff'); p.px(13, 8 + f, '#ffffff');
      p.px(6, 5, '#ff8080'); p.px(14, 6, '#ff8080');
    },
  }));
}

// Araignée noire
for (let f = 0; f < 2; f++) {
  defSpr(`spider_${f}`, () => paint(20, 12, (p) => {
    for (let i = 0; i < 4; i++) {
      const lift = (i + f) % 2 ? 1 : 0;
      p.line(8, 6, 1 + i * 2, 11 - lift, '#1a1414');
      p.line(12, 6, 19 - i * 2, 11 - lift, '#1a1414');
    }
    p.ell(10, 6.5, 5, 4.2, '#2a2224');
  }, {
    detail: (p) => {
      p.px(8, 5, EYE_R); p.px(11, 5, EYE_R); p.px(9, 4, EYE_R); p.px(10, 4, EYE_R);
    },
  }));
}

// Asticot (chargeur) : ver pâle segmenté
for (let f = 0; f < 2; f++) {
  defSpr(`maggot_${f}`, () => paint(24, 12, (p) => {
    for (let i = 0; i < 4; i++) {
      const y = 6.5 + (((i + f) % 2) ? -0.8 : 0.8);
      p.circ(4 + i * 4, y, 3.6, i % 2 ? '#e8dcc8' : '#f0e6d4');
    }
    p.circ(19, 6.5, 4.5, '#f4ead8');
  }, {
    shade: { hi: 0.2, lo: 0.32 },
    detail: (p) => {
      p.ell(21, 7, 1.5, 2, HOLE);
      p.px(19, 4, HOLE);
      for (let i = 0; i < 4; i++) p.rect(3 + i * 4, 4, 1, 5, '#c8b8a0');
    },
  }));
}

// Host : crâne enterré dans un monticule, qui sort pour tirer
defSpr('host_closed', () => paint(24, 14, (p) => {
  p.ell(12, 10, 11, 4, '#5a4230');
  p.ell(12, 7, 7, 5, '#e8dcc8');
}, {
  detail: (p) => {
    p.rect(8, 10, 8, 2, '#5a4230');
    p.line(10, 4, 12, 6, '#b8a890');
  },
}));
defSpr('host_open', () => paint(24, 26, (p) => {
  p.ell(12, 22, 11, 4, '#5a4230');
  p.rr(5, 4, 14, 16, 6, '#e8dcc8');
  p.rect(7, 16, 10, 5, '#e0d4c0');
}, {
  detail: (p) => {
    p.ell(9, 11, 2.5, 3, HOLE); p.ell(15, 11, 2.5, 3, HOLE);
    p.px(9, 11, '#ff3030'); p.px(15, 11, '#ff3030');
    p.rect(11, 15, 2, 2, HOLE);
    for (let x = 8; x < 17; x += 2) p.rect(x, 19, 1, 2, '#6a5a4a');
    p.ell(12, 22, 11, 3, '#5a4230');
  },
}));

// Fatty : gros humain pâle et lent
for (let f = 0; f < 2; f++) {
  defSpr(`fatty_${f}`, () => paint(30, 30, (p) => {
    const s = f ? 1 : 0;
    p.rr(8, 25, 5, 5, 2, SKIN_D);
    p.rr(17, 25, 5, 5, 2, SKIN_D);
    p.ell(15, 18 + s, 13 + s, 10 - s, SKIN);
    p.rr(0, 13 + s, 6, 10, 3, SKIN);
    p.rr(24, 13 + s, 6, 10, 3, SKIN);
    p.circ(15, 7 + s, 6, SKIN);
  }, {
    shade: { hi: 0.2, lo: 0.3, grad: 0.2 },
    detail: (p) => {
      const s = f ? 1 : 0;
      p.px(12, 6 + s, HOLE); p.px(18, 6 + s, HOLE);
      p.rect(13, 9 + s, 4, 2, HOLE);
      p.line(6, 20 + s, 24, 20 + s, SKIN_D);
      p.line(8, 24 + s, 22, 24 + s, SKIN_D);
      p.px(15, 17 + s, SKIN_D);
    },
  }));
}

// Sauteur (leaper) : humanoïde aux cuisses puissantes
for (let f = 0; f < 2; f++) {
  defSpr(`leaper_${f}`, () => paint(22, 26, (p) => {
    const cr = f ? 3 : 0;
    p.rr(3, 17 + cr, 6, 9 - cr, 3, SKIN_D);
    p.rr(13, 17 + cr, 6, 9 - cr, 3, SKIN_D);
    p.rr(5, 11 + cr, 12, 9, 3, SKIN);
    p.circ(11, 6 + cr, 6, SKIN);
  }, {
    shade: { hi: 0.18, lo: 0.32, grad: 0.2 },
    detail: (p) => {
      const cr = f ? 3 : 0;
      holeEye(p, 8.5, 5 + cr, 1.5, 2);
      holeEye(p, 13.5, 5 + cr, 1.5, 2);
      p.rect(9, 9 + cr, 4, 1, HOLE);
    },
  }));
}

// Chevalier : heaume de fer, cerveau à nu, invulnérable de face
for (const d of ['down', 'up', 'left', 'right']) {
  defSpr(`knight_${d}`, () => paint(22, 24, (p) => {
    p.rr(2, 2, 18, 20, 7, '#6a6e7a');
    p.rect(4, 18, 14, 5, '#4a4e5a');
    if (d === 'up') p.ell(11, 8, 7, 5, '#d87a8a');
  }, {
    shade: { hi: 0.35, lo: 0.3 },
    detail: (p) => {
      if (d === 'up') {
        p.line(7, 7, 10, 10, '#a04a5a'); p.line(13, 6, 15, 10, '#a04a5a');
        return;
      }
      const dx = d === 'left' ? -3 : d === 'right' ? 3 : 0;
      p.rect(5 + dx, 10, 12, 3, '#1a1a20');
      p.px(8 + dx, 11, '#ff3030'); p.px(13 + dx, 11, '#ff3030');
      p.rect(10 + dx, 13, 2, 6, '#3a3e48');
      for (const y of [5, 16]) p.px(4, y, '#c0c4d0');
    },
  }));
}

// Wizoob : fantôme pâle qui se téléporte
for (let f = 0; f < 2; f++) {
  defSpr(`wizoob_${f}`, () => paint(20, 22, (p) => {
    p.circ(10, 9, 8.5, '#eae8f0');
    p.poly([[2, 10], [18, 10], [14 + f * 2, 21], [10, 16], [6 - f * 2, 21]], '#eae8f0');
  }, {
    shade: { hi: 0.12, lo: 0.28 },
    outline: '#3a3a5a',
    detail: (p) => {
      p.ell(6.5, 8, 2, 3, HOLE); p.ell(13.5, 8, 2, 3, HOLE);
      p.ell(10, 13, 2.5, 2 + f, HOLE);
    },
  }));
}

// Grimace : tête de pierre qui crache
for (let f = 0; f < 2; f++) {
  defSpr(`grimace_${f}`, () => paint(24, 24, (p) => {
    p.rr(1, 1, 22, 22, 4, '#8a8478');
  }, {
    detail: (p) => {
      p.line(4, 6, 10, 9, '#3a3630', 2); p.line(20, 6, 14, 9, '#3a3630', 2);
      p.rect(5, 10, 5, 3, f ? '#ff3030' : '#1a1814');
      p.rect(14, 10, 5, 3, f ? '#ff3030' : '#1a1814');
      p.rr(6, 15, 12, f ? 6 : 4, 1, '#1a1814');
      for (let x = 7; x < 18; x += 2) p.px(x, 15, '#d8d0c0');
      p.line(3, 20, 8, 22, '#5a564c');
    },
  }));
}

// Ruche : amas de chair percé de trous, d'où sortent des mouches
for (let f = 0; f < 2; f++) {
  defSpr(`hive_${f}`, () => paint(26, 24, (p) => {
    const s = f ? 1 : 0;
    p.ell(13, 15, 12 + s, 9 - s, '#b86a4a');
    p.ell(13, 9, 8, 7, '#c87a58');
  }, {
    shade: { hi: 0.25, lo: 0.32 },
    detail: (p) => {
      for (const [x, y] of [[8, 9], [15, 7], [18, 14], [9, 16], [13, 13]]) p.ell(x, y, 1.8, 1.4, HOLE);
      p.rect(11, 19, 4, 2, '#5a2a1a');
    },
  }));
}
// 2. Spam : enveloppe volante enragée
for (let f = 0; f < 2; f++) {
  defSpr(`spam_${f}`, () => paint(22, 16, (p) => {
    p.rect(4, 4, 14, 10, '#ece6d8');
    const c = '#c8d4ec';
    if (f === 0) { p.ell(3, 3, 4, 3, c); p.ell(18, 3, 4, 3, c); }
    else { p.ell(2, 7, 4, 2, c); p.ell(19, 7, 4, 2, c); }
  }, {
    detail: (p) => {
      p.line(4, 4, 11, 9, '#a09a8a');
      p.line(17, 4, 11, 9, '#a09a8a');
      p.rect(8, 10, 2, 2, OUTLINE); p.rect(13, 10, 2, 2, OUTLINE);
      p.line(7, 9, 9, 10, OUTLINE); p.line(15, 9, 13, 10, OUTLINE);
      p.rect(14, 5, 3, 3, '#e04040');
    },
  }));
}

// 8. Pop-up : fenêtre qui surgit du sol (fermée = réduite)
defSpr('popup_open', () => paint(24, 22, (p) => {
  p.rect(0, 2, 24, 19, '#d8d8e0');
}, {
  shade: { hi: 0.15, lo: 0.2 },
  detail: (p) => {
    p.rect(1, 3, 22, 4, '#2a5ad0');
    p.rect(18, 3, 4, 4, '#e03030');
    p.line(19, 4, 20, 5, '#fff'); p.line(20, 4, 19, 5, '#fff');
    Font.draw(p.g, '!', 11, 8, '#e03030');
    p.rect(4, 10, 4, 3, OUTLINE); p.rect(16, 10, 4, 3, OUTLINE);
    p.rect(8, 16, 8, 2, '#6a1a1a');
  },
}));
defSpr('popup_closed', () => paint(24, 8, (p) => {
  p.rect(0, 2, 24, 6, '#9a9aa6');
}, {
  detail: (p) => {
    p.rect(1, 3, 22, 3, '#1a3a90');
  },
}));

// Mini-Sam (sbire du boss final) : costume sombre, cheveux bruns
for (let f = 0; f < 2; f++) {
  defSpr(`intern_${f}`, () => paint(16, 24, (p) => {
    p.rr(4, 17, 3, 7 - (f ? 2 : 0), 1, '#2a2a3a');
    p.rr(9, 17, 3, 7 - (f ? 0 : 2), 1, '#2a2a3a');
    p.rr(2, 10, 12, 9, 3, '#6a6e7a');
    p.circ(8, 6, 5.5, '#f0c8a4');
    p.rr(3, 0, 10, 5, 2, '#5a4030');
  }, {
    detail: (p) => {
      p.rect(5, 6, 2, 2, OUTLINE); p.rect(9, 6, 2, 2, OUTLINE);
      p.rect(6, 9, 4, 1, '#a0604a');
      p.rect(7, 11, 2, 6, '#e8e8f0');
    },
  }));
}

// --- Projectiles ennemis : larmes rouges façon Isaac, et variantes
function paintBullet(r, col, dark, style) {
  const n = Math.ceil(r * 2) + 1;
  return paint(n, n, (p) => {
    if (style === 'banana') {
      p.ell(n / 2, n / 2, r, r * 0.6, col);
    } else p.circ(n / 2, n / 2, r, col);
  }, {
    shade: { hi: 0.35, lo: 0.35, grad: 0.1 },
    outline: dark,
    detail: (p) => {
      p.px(Math.floor(n / 2 - r / 2), Math.floor(n / 2 - r / 2), '#ffffff');
      if (style === 'coin') {
        p.rect(Math.floor(n / 2), Math.floor(n / 2 - r / 2), 1, Math.ceil(r), '#8a6a10');
      }
    },
  });
}
const BULLET_STYLES = {
  red: ['#d02020', '#3a0606'],
  purple: ['#a040e0', '#2a0640'],
  green: ['#40c040', '#0a3a0a'],
  blue: ['#40a0ff', '#0a2a5a'],
  coin: ['#f0c030', '#5a3a06'],
  ink: ['#2a1a10', '#000000'],
  hair: ['#8a8a92', '#2a2a30'],
  banana: ['#f0e040', '#5a4a06'],
  white: ['#f0f0ff', '#4a4a6a'],
};
for (const st in BULLET_STYLES) {
  for (const r of [2, 3, 4, 6]) defSpr(`bullet_${st}_${r}`, () => paintBullet(r, BULLET_STYLES[st][0], BULLET_STYLES[st][1], st));
}

// --- Ramassables
defSpr('heart', () => paint(12, 11, (p) => {
  p.circ(3.5, 3.5, 3.5, '#d82030');
  p.circ(8.5, 3.5, 3.5, '#d82030');
  p.poly([[0, 4], [12, 4], [6, 11]], '#d82030');
}, { shade: { hi: 0.35, lo: 0.3 }, detail: (p) => { p.rect(2, 2, 2, 1, '#ffd0d0'); p.px(2, 3, '#ffd0d0'); } }));
defSpr('heartHalf', () => paint(12, 11, (p) => {
  p.circ(3.5, 3.5, 3.5, '#d82030');
  p.poly([[0, 4], [6, 4], [6, 11]], '#d82030');
}, { shade: { hi: 0.35, lo: 0.3 }, detail: (p) => { p.rect(2, 2, 2, 1, '#ffd0d0'); } }));
defSpr('soul', () => paint(12, 11, (p) => {
  p.circ(3.5, 3.5, 3.5, '#5a8ae0');
  p.circ(8.5, 3.5, 3.5, '#5a8ae0');
  p.poly([[0, 4], [12, 4], [6, 11]], '#5a8ae0');
}, { shade: { hi: 0.4, lo: 0.3 }, detail: (p) => { p.rect(2, 2, 2, 1, '#e0f0ff'); Font.draw(p.g, '✻', 4, 1, '#e0f0ff'); } }));
defSpr('soulHalf', () => paint(12, 11, (p) => {
  p.circ(3.5, 3.5, 3.5, '#5a8ae0');
  p.poly([[0, 4], [6, 4], [6, 11]], '#5a8ae0');
}, { shade: { hi: 0.4, lo: 0.3 }, detail: (p) => { p.rect(2, 2, 2, 1, '#e0f0ff'); } }));
// Pièce (penny) qui brille
for (let f = 0; f < 4; f++) {
  defSpr(`coin_${f}`, () => {
    const w = [5, 4, 2, 4][f];
    return paint(12, 12, (p) => {
      p.ell(6, 6, w + 0.5, 5.5, '#e0a830');
    }, {
      shade: { hi: 0.4, lo: 0.32 },
      outline: '#5a3a06',
      detail: (p) => {
        if (w >= 4) {
          p.ell(6, 6, w - 1.5, 3.5, '#c88a1a');
          p.ell(6, 6, w - 2.5, 2.5, '#f0c040');
        }
        if (f === 0) { p.px(3, 3, '#ffffff'); p.px(4, 2, '#fff6c0'); }
        if (f === 1) p.px(6, 3, '#fff6c0');
      },
    });
  });
}
// Bombe classique
defSpr('bomb', () => paint(14, 16, (p) => {
  p.circ(7, 9.5, 6, '#3a3a42');
  p.rect(5, 2, 4, 3, '#5a5a64');
}, {
  shade: { hi: 0.35, lo: 0.25 },
  detail: (p) => {
    p.rect(3, 6, 2, 2, '#b0b0bc');
    p.px(4, 5, '#ffffff');
    p.line(8, 2, 10, 0, '#c0a060');
    p.px(11, 0, '#ffd040');
  },
}));
// Clé dorée
defSpr('key', () => paint(9, 17, (p) => {
  p.ring(4.5, 4, 4, '#e0b030', 2);
  p.rect(3, 7, 3, 10, '#e0b030');
  p.rect(6, 12, 3, 2, '#e0b030');
  p.rect(6, 15, 2, 2, '#e0b030');
}, {
  shade: { hi: 0.4, lo: 0.3 },
  outline: '#4a3006',
  detail: (p) => { p.px(2, 2, '#fff6c0'); p.px(3, 9, '#fff0a0'); },
}));
defSpr('chest', () => paint(20, 15, (p) => {
  p.rect(1, 5, 18, 10, '#8a5a30');
  p.rr(1, 0, 18, 7, 3, '#a06a38');
}, {
  detail: (p) => {
    p.rect(1, 6, 18, 1, '#4a2a10');
    p.rect(8, 5, 4, 4, '#d0c0a0');
    p.px(9, 7, OUTLINE);
    p.rect(4, 0, 2, 15, '#5a3a1a'); p.rect(14, 0, 2, 15, '#5a3a1a');
  },
}));
defSpr('goldchest', () => paint(20, 15, (p) => {
  p.rect(1, 5, 18, 10, '#d0a030');
  p.rr(1, 0, 18, 7, 3, '#e8c040');
}, {
  detail: (p) => {
    p.rect(1, 6, 18, 1, '#6a4a10');
    p.rect(8, 5, 4, 4, '#6a4a10');
    p.px(9, 7, '#e8c040');
  },
}));
defSpr('chestOpen', () => paint(20, 15, (p) => {
  p.rect(1, 5, 18, 10, '#8a5a30');
  p.rect(1, 1, 18, 4, '#6a4428');
}, { detail: (p) => { p.rect(3, 5, 14, 3, '#1a0a0a'); } }));

// Petites icônes de l'interface (HUD)
defSpr('hud_heart', () => spr('heart'));
defSpr('hud_heartHalf', () => {
  const c = mkCanvas(14, 13);
  const g = c.getContext('2d');
  g.drawImage(spr('hud_heartEmpty'), 0, 0);
  g.drawImage(spr('heartHalf'), 0, 0);
  return c;
});
defSpr('hud_heartEmpty', () => paint(12, 11, (p) => {
  p.circ(3.5, 3.5, 3.5, '#2a1414');
  p.circ(8.5, 3.5, 3.5, '#2a1414');
  p.poly([[0, 4], [12, 4], [6, 11]], '#2a1414');
}, { shade: false, outline: '#000' }));
