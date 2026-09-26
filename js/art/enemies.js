// Sprites des ennemis : la faune des tréfonds de l'informatique.

const EYE_R = '#ff3030';

function eyes2(p, x1, x2, y, col = OUTLINE, w = 2, h = 2, shine = true) {
  p.rect(x1, y, w, h, col);
  p.rect(x2, y, w, h, col);
  if (shine) { p.px(x1, y, '#ffffff'); p.px(x2, y, '#ffffff'); }
}

// 1. Bug : scarabée noir aux yeux rouges
for (let f = 0; f < 2; f++) {
  defSpr(`bug_${f}`, () => paint(14, 12, (p) => {
    p.ell(7, 8, 5, 4, '#3a2a2a');
    p.circ(7, 4.5, 3, '#2a1c1c');
  }, {
    detail: (p) => {
      p.px(5, 4, EYE_R); p.px(8, 4, EYE_R);
      p.rect(7, 6, 1, 5, '#140a0a');
      // ailes
      const c = 'rgba(220,230,255,0.75)';
      if (f === 0) { p.ell(3, 3, 3, 2, c); p.ell(11, 3, 3, 2, c); }
      else { p.ell(2, 6, 3, 2, c); p.ell(12, 6, 3, 2, c); }
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

// 3. Processus zombie : petit corps gris, tête-écran « x_x », bras tendus
for (let f = 0; f < 2; f++) {
  defSpr(`zombie_${f}`, () => paint(18, 24, (p) => {
    p.rr(5, 16, 3, 8 - (f ? 2 : 0), 1, '#4a5048');
    p.rr(10, 16, 3, 8 - (f ? 0 : 2), 1, '#4a5048');
    p.rr(4, 10, 10, 8, 2, '#8a9a80');
    p.rect(0, 11, 5, 3, '#8a9a80');
    p.rect(13, 11, 5, 3, '#8a9a80');
    p.rr(2, 0, 14, 11, 2, '#b8b4a8');
  }, {
    detail: (p) => {
      p.rect(4, 2, 10, 7, '#1a2a1a');
      p.line(5, 3, 7, 5, '#50e050'); p.line(7, 3, 5, 5, '#50e050');
      p.line(10, 3, 12, 5, '#50e050'); p.line(12, 3, 10, 5, '#50e050');
      p.rect(6, 7, 6, 1, '#50e050');
      p.rect(7, 13, 4, 3, '#6a1a1a');
    },
  }));
}

// 4. Web crawler : araignée-globe
for (let f = 0; f < 2; f++) {
  defSpr(`crawler_${f}`, () => paint(22, 14, (p) => {
    for (let i = 0; i < 4; i++) {
      const lift = (i + f) % 2 ? 1 : 0;
      p.line(8, 7, 1 + i * 2, 12 - lift, '#1a1a24');
      p.line(13, 7, 20 - i * 2, 12 - lift, '#1a1a24');
    }
    p.circ(11, 7, 6, '#2a4a8a');
  }, {
    detail: (p) => {
      p.ring(11, 7, 5, '#60a0e0');
      p.rect(6, 7, 11, 1, '#60a0e0');
      p.rect(11, 2, 1, 11, '#60a0e0');
      p.px(9, 4, EYE_R); p.px(13, 4, EYE_R); p.px(10, 3, EYE_R); p.px(12, 3, EYE_R);
    },
  }));
}

// 5. Fuite mémoire : flaque de gelée violette avec une barrette de RAM
for (let f = 0; f < 2; f++) {
  defSpr(`leak_${f}`, () => paint(22, 18, (p) => {
    const sq = f ? 1 : 0;
    p.ell(11, 11 + sq, 10 + sq, 6 - sq, '#7a3aa0');
    p.ell(11, 7 + sq * 2, 7, 6 - sq, '#8a4ab0');
  }, {
    shade: { hi: 0.35, lo: 0.3 },
    detail: (p) => {
      p.rect(13, 1 + f * 2, 7, 4, '#2a7a3a');
      p.rect(14, 2 + f * 2, 1, 2, '#e0c040'); p.rect(16, 2 + f * 2, 1, 2, '#e0c040'); p.rect(18, 2 + f * 2, 1, 2, '#e0c040');
      eyes2(p, 7, 12, 8 + f, OUTLINE, 2, 3);
      p.px(4, 12, '#d0a0f0'); p.px(16, 13, '#d0a0f0');
    },
  }));
}

// 6. Cookie traceur
for (let f = 0; f < 2; f++) {
  defSpr(`cookie_${f}`, () => paint(12, 12, (p) => {
    p.circ(6, 6, 5.5, '#c08a44');
  }, {
    detail: (p) => {
      const chips = f ? [[3, 3], [8, 4], [5, 8], [9, 8]] : [[4, 4], [8, 3], [3, 8], [8, 8]];
      for (const [x, y] of chips) p.px(x, y, '#4a2a10');
      p.line(3, 5, 5, 6, OUTLINE); p.line(9, 5, 7, 6, OUTLINE);
      p.px(4, 6, EYE_R); p.px(7, 6, EYE_R);
    },
  }));
}

// 7. Ver informatique : segments verts
for (let f = 0; f < 2; f++) {
  defSpr(`worm_${f}`, () => paint(24, 12, (p) => {
    for (let i = 0; i < 4; i++) {
      const y = 6 + (((i + f) % 2) ? -1 : 1);
      p.circ(4 + i * 4, y, 3.5, i % 2 ? '#4a9a3a' : '#5aaa4a');
    }
    p.circ(19, 6, 4.5, '#6aba5a');
  }, {
    detail: (p) => {
      p.rect(19, 3, 2, 3, OUTLINE); p.px(19, 3, '#fff');
      p.rect(21, 7, 2, 1, '#2a0a0a');
      p.px(6, 5, '#a0f080'); p.px(10, 7, '#a0f080');
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

// 9. Bloatware : gros tas rose avec un carton d'installation
for (let f = 0; f < 2; f++) {
  defSpr(`bloat_${f}`, () => paint(28, 28, (p) => {
    const s = f ? 1 : 0;
    p.ell(14, 17 + s, 13 + s, 10 - s, '#c07aa0');
    p.ell(14, 10 + s, 9, 8, '#d08ab0');
    p.rr(5, 24, 5, 4, 1, '#8a4a70');
    p.rr(18, 24, 5, 4, 1, '#8a4a70');
  }, {
    detail: (p) => {
      eyes2(p, 10, 16, 8 + (f ? 1 : 0), OUTLINE, 2, 2);
      p.rect(11, 13, 6, 2, '#4a1a2a');
      p.rect(8, 16, 12, 8, '#e0c890');
      Font.draw(p.g, 'EXE', 9, 17, '#4a2a10');
    },
  }));
}

// 10. Cheval de Troie en bois
for (let f = 0; f < 2; f++) {
  defSpr(`trojan_${f}`, () => paint(24, 24, (p) => {
    const cr = f ? 2 : 0;
    p.rect(3, 19, 18, 3, '#6a4428');
    p.circ(5, 22, 2, '#3a2a1a');
    p.circ(19, 22, 2, '#3a2a1a');
    p.rect(5, 16 + cr, 2, 4 - cr, '#8a5a34');
    p.rect(17, 16 + cr, 2, 4 - cr, '#8a5a34');
    p.rr(3, 9 + cr, 16, 8, 3, '#a8703e');
    p.rr(15, 2 + cr, 7, 10, 2, '#a8703e');
    p.rect(20, 5 + cr, 4, 4, '#a8703e');
  }, {
    detail: (p) => {
      const cr = f ? 2 : 0;
      p.rect(17, 4 + cr, 2, 2, OUTLINE);
      p.rect(14, 2 + cr, 2, 6, '#5a3a20');
      p.rect(8, 11 + cr, 5, 3, '#5a3a20');
      p.px(9, 12 + cr, EYE_R); p.px(11, 12 + cr, EYE_R);
    },
  }));
}

// 11. Captcha : bloc de pierre couvert de lettres tordues
for (let f = 0; f < 2; f++) {
  defSpr(`captcha_${f}`, () => paint(22, 24, (p) => {
    p.rr(1, 2, 20, 21, 3, '#9a948a');
  }, {
    detail: (p) => {
      const g = p.g;
      Font.draw(g, 'rX', 3, 4, '#3a2a6a');
      Font.draw(g, '7q', 11, 5, '#6a2a2a');
      p.line(2, 8, 20, 6, '#4a4040');
      p.rect(4, 14, 5, 3, f ? '#ff3030' : OUTLINE);
      p.rect(13, 14, 5, 3, f ? '#ff3030' : OUTLINE);
      p.rect(7, 19, 8, 2, '#2a1a1a');
    },
  }));
}

// 12. Pare-feu : bloc de briques en flammes, les yeux vers sa direction
for (const d of ['down', 'up', 'left', 'right']) {
  defSpr(`firewall_${d}`, () => paint(22, 26, (p) => {
    p.poly([[3, 8], [5, 0], [8, 5], [11, -1], [14, 5], [17, 0], [19, 8]], '#ff7a20');
    p.rr(1, 6, 20, 20, 2, '#a83a2a');
  }, {
    detail: (p) => {
      for (let y = 9; y < 26; y += 4) {
        p.rect(1, y, 20, 1, '#6a1a14');
        const off = (y / 4) % 2 ? 4 : 0;
        for (let x = 3 + off; x < 21; x += 8) p.rect(x, y - 3, 1, 3, '#6a1a14');
      }
      p.poly([[7, 7], [9, 3], [11, 7]], '#ffe070');
      if (d !== 'up') {
        const dx = d === 'left' ? -3 : d === 'right' ? 3 : 0;
        p.rect(6 + dx, 12, 3, 3, '#ffe070'); p.rect(13 + dx, 12, 3, 3, '#ffe070');
        p.px(7 + dx, 13, OUTLINE); p.px(14 + dx, 13, OUTLINE);
      }
    },
  }));
}

// 13. Hallucination : fantôme irisé
for (let f = 0; f < 2; f++) {
  defSpr(`ghost_${f}`, () => paint(18, 20, (p) => {
    p.circ(9, 8, 7.5, '#e8f0ff');
    p.rect(2, 8, 15, 8, '#e8f0ff');
    for (let i = 0; i < 4; i++) p.circ(3.5 + i * 4 + (f ? 1 : 0), 16, 2, '#e8f0ff');
  }, {
    shade: { hi: 0.1, lo: 0.25 },
    outline: '#4a4a8a',
    detail: (p) => {
      const rb = ['#ff8080', '#ffd080', '#80ff90', '#80c0ff', '#c080ff'];
      rb.forEach((c, i) => p.rect(3 + i * 3, 13, 2, 1, c));
      p.rect(5, 6, 3, 4, '#2a2a5a'); p.rect(10, 6, 3, 4, '#2a2a5a');
      p.px(5, 6, '#fff'); p.px(10, 6, '#fff');
      p.ell(9, 11.5, 1.5, 1, '#2a2a5a');
    },
  }));
}

// 14. Glitch : amas de pixels corrompus (3 poses)
for (let f = 0; f < 3; f++) {
  defSpr(`glitch_${f}`, () => {
    const R = RNG(f * 31 + 7);
    return paint(18, 18, (p) => {
      p.rect(3, 3, 12, 12, '#1a1a2a');
      for (let i = 0; i < 16; i++) {
        p.rect(R.int(0, 14), R.int(0, 14), R.int(2, 5), R.int(1, 3), R.pick(['#ff2080', '#20e0ff', '#f0f040', '#20ff60', '#ffffff']));
      }
    }, {
      shade: false,
      detail: (p) => {
        p.rect(5, 6, 3, 3, '#ffffff'); p.rect(11, 6, 3, 3, '#ffffff');
        p.px(6, 7, '#ff0040'); p.px(12, 7, '#ff0040');
      },
    });
  });
}

// 15. Drone de sécurité
for (let f = 0; f < 2; f++) {
  defSpr(`drone_${f}`, () => paint(24, 16, (p) => {
    p.rect(2, 3, 5, 2, '#5a5a64');
    p.rect(17, 3, 5, 2, '#5a5a64');
    p.rr(5, 5, 14, 9, 3, '#8a8a96');
    if (f === 0) { p.rect(0, 1, 9, 1, '#c0c0d0'); p.rect(15, 1, 9, 1, '#c0c0d0'); }
    else { p.rect(2, 1, 5, 1, '#c0c0d0'); p.rect(17, 1, 5, 1, '#c0c0d0'); }
  }, {
    detail: (p) => {
      p.circ(12, 9.5, 3, '#1a1a20');
      p.circ(12, 9.5, 1.6, '#ff2030');
      p.px(11, 8, '#ffc0c0');
    },
  }));
}

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
for (let f = 0; f < 4; f++) {
  defSpr(`coin_${f}`, () => {
    const wds = [5, 4, 2, 4];
    const w = wds[f];
    return paint(12, 12, (p) => {
      p.ell(6, 6, w + 0.5, 5.5, '#e8b830');
    }, {
      shade: { hi: 0.35, lo: 0.3 },
      outline: '#5a3a06',
      detail: (p) => {
        if (w >= 4) {
          p.rect(6, 3, 1, 6, '#a07a10');
          p.rect(4, 6, 5, 1, '#a07a10');
          p.px(4, 4, '#a07a10'); p.px(8, 8, '#a07a10'); p.px(8, 4, '#a07a10'); p.px(4, 8, '#a07a10');
        }
        p.px(6 - w + 1, 3, '#fff6c0');
      },
    });
  });
}
defSpr('bomb', () => paint(14, 16, (p) => {
  p.circ(7, 9.5, 6, '#2a2a34');
  p.rect(5, 1, 4, 3, '#6a6a74');
}, {
  shade: { hi: 0.3, lo: 0.2 },
  detail: (p) => {
    p.rect(3, 6, 2, 2, '#9a9aa8');
    Font.draw(p.g, '{}', 3, 7, '#e8e8f0');
    p.line(9, 1, 11, -1, '#c0a060');
    p.px(12, 0, '#ffd040');
  },
}));
defSpr('key', () => paint(9, 16, (p) => {
  p.circ(4.5, 4, 4, '#b8c0d8');
  p.rect(3, 7, 3, 9, '#b8c0d8');
  p.rect(6, 11, 3, 2, '#b8c0d8');
  p.rect(6, 14, 2, 2, '#b8c0d8');
}, {
  shade: { hi: 0.4, lo: 0.3 },
  outline: '#1a1a3a',
  detail: (p) => {
    p.circ(4.5, 4, 1.6, '#1a1a3a');
    p.px(3, 2, '#ffffff');
  },
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
