// Claude : bloc orange à pinces et quatre pattes (itération de l'ancien design),
// redessiné façon Rebirth : volume doux, contour épais, grands yeux brillants.
// Sprite 28 x 30 (+ contour). Pieds en bas au centre.

const CL_W = 28;
const CL_H = 30;

function claudePal(costume) {
  const b = (COSTUMES[costume] || COSTUMES.classic).body;
  return { body: b, arm: shade(b, -0.1), leg: shade(b, -0.28), cheek: mix(b, '#ff6f8a', 0.45) };
}

// Accessoires dessinés avant l'ombrage (ils prennent du volume et un contour).
function claudeAccessoryBack(p, costume, by) {
  if (costume === 'opus') {
    p.rr(2, by + 3, 24, 17, 5, '#5a2a86');
    p.rect(2, by + 17, 24, 3, '#4a1f70');
  }
}

function claudeAccessory(p, costume, by, dir) {
  const flip = dir === 'left';
  const X = (x) => (flip ? CL_W - 1 - x : x);
  if (costume === 'haiku') {
    p.line(X(17), by + 1, X(19), by - 4, '#5a3a22', 1);
    p.line(X(19), by - 4, X(22), by - 6, '#5a3a22', 1);
    p.circ(X(21) + 0.5, by - 6, 2.2, '#ffb6c8');
    p.circ(X(17) + 0.5, by - 4, 1.8, '#ffc8d6');
    p.circ(X(23) + 0.5, by - 3, 1.5, '#ffd0dc');
  } else if (costume === 'opus') {
    p.rect(9, by - 3, 10, 4, '#f0c030');
    p.rect(9, by - 6, 2, 3, '#f0c030');
    p.rect(13, by - 7, 2, 4, '#f0c030');
    p.rect(17, by - 6, 2, 3, '#f0c030');
  } else if (costume === 'hacker') {
    p.rr(3, by - 2, 22, 11, 6, '#2a2a34');
    p.rect(3, by + 5, 22, 3, '#2a2a34');
  } else if (costume === 'pirate') {
    p.rr(4, by - 2, 20, 7, 3, '#c02a2a');
    p.rect(X(22), by + 1, 3, 2, '#c02a2a');
    p.rect(X(24), by + 2, 2, 3, '#a02020');
  } else if (costume === 'chef') {
    p.rect(8, by - 3, 12, 4, '#f4f0ea');
    p.circ(10.5, by - 5, 3.5, '#f4f0ea');
    p.circ(14, by - 7, 4, '#f4f0ea');
    p.circ(17.5, by - 5, 3.5, '#f4f0ea');
  } else if (costume === 'astro') {
    p.rr(3, by - 3, 22, 9, 6, '#e8ecf0');
    p.rect(13, by - 8, 2, 5, '#9aa4b0');
    p.circ(14, by - 9, 1.6, '#e04040');
  } else if (costume === 'chaton') {
    p.poly([[5, by + 3], [7, by - 5], [12, by + 1]], claudePal('chaton').body);
    p.poly([[16, by + 1], [21, by - 5], [23, by + 3]], claudePal('chaton').body);
  } else if (costume === 'sam') {
    p.rr(5, by - 3, 18, 7, 3, '#6a4a34');
    p.rect(X(6), by - 4, 5, 2, '#6a4a34');
    p.rect(X(16), by - 5, 4, 3, '#7a5840');
  }
}

function claudeAccessoryDetail(p, costume, by, dir, eyes) {
  if (costume === 'chaton' && dir !== 'up') {
    p.px(7, by - 2, '#ff9ab0');
    p.px(20, by - 2, '#ff9ab0');
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? 3 : 24;
      p.line(x0, by + 10, x0 + s * 3, by + 9, '#3a2020');
      p.line(x0, by + 12, x0 + s * 3, by + 12, '#3a2020');
    }
  }
  if (costume === 'pirate' && dir !== 'up') {
    const ex = dir === 'left' ? eyes[0] : eyes[1];
    p.rect(ex - 1, by + 3, 5, 6, '#1a1010');
    p.line(4, by + 3, 24, by + 2, '#1a1010');
  }
  if (costume === 'hacker' && dir !== 'up') {
    p.rect(eyes[0] - 1, by + 4, 5, 4, '#1a2a1a');
    p.rect(eyes[1] - 1, by + 4, 5, 4, '#1a2a1a');
    p.rect(eyes[0] + 3, by + 5, eyes[1] - eyes[0] - 3, 1, '#1a2a1a');
    p.px(eyes[0], by + 5, '#50ff70');
    p.px(eyes[1], by + 5, '#50ff70');
  }
  if (costume === 'gold') {
    p.px(6, by + 2, '#fffbe0');
    p.px(22, by + 6, '#fffbe0');
    p.px(21, by + 5, '#fff2a0');
  }
  if (costume === 'astro') {
    p.rect(6, by - 1, 5, 2, '#ffffff');
  }
  if (costume === 'opus') {
    p.px(14, by - 5, '#e02848');
    p.px(10, by - 1, '#50c0f0');
    p.px(18, by - 1, '#50c0f0');
  }
}

// face : normal | blink | shoot | hurt | happy | dead
function paintClaude(costume, dir, frame, face) {
  const P = claudePal(costume);
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  const by = 9 + bob;
  const happy = face === 'happy';
  let eyes = [9, 16];
  if (dir === 'left') eyes = [7, 14];
  if (dir === 'right') eyes = [11, 18];
  return paint(CL_W, CL_H, (p) => {
    // Pattes (derrière le corps)
    const legs = [5, 10, 15, 20];
    legs.forEach((lx, i) => {
      let lift = 0;
      if (frame === 1 && i % 2 === 0) lift = 2;
      if (frame === 3 && i % 2 === 1) lift = 2;
      p.rr(lx, 21, 3, 7 - lift, 1, P.leg);
    });
    claudeAccessoryBack(p, costume, by);
    // Pinces
    if (happy) {
      p.rr(0, by - 6, 6, 9, 2, P.arm);
      p.rr(22, by - 6, 6, 9, 2, P.arm);
    } else {
      const sway = frame === 1 ? 1 : frame === 3 ? -1 : 0;
      p.rr(0, by + 5 + sway, 6, 6, 2, P.arm);
      p.rr(22, by + 5 - sway, 6, 6, 2, P.arm);
    }
    // Corps
    p.rr(4, by, 20, 15, 5, P.body);
    claudeAccessory(p, costume, by, dir);
  }, {
    shade: { hi: 0.24, lo: 0.32, grad: 0.2 },
    detail: (p) => {
      if (costume === 'ghost') {
        p.dither(4, by + 12, 20, 3, shade(P.body, -0.2));
      }
      if (dir === 'up') {
        // Dos : petite couture et reflet
        p.rect(10, by + 10, 8, 1, shade(P.body, -0.25));
        claudeAccessoryDetail(p, costume, by, dir, eyes);
        return;
      }
      const ey = by + 4;
      for (const ex of eyes) {
        if (face === 'blink') {
          p.rect(ex, ey + 3, 3, 1, OUTLINE);
        } else if (face === 'shoot') {
          p.rect(ex - 1, ey + 2, 4, 2, OUTLINE);
          p.px(ex, ey + 2, '#ffffff');
        } else if (face === 'hurt') {
          p.line(ex, ey + 1, ex + 2, ey + 3, OUTLINE);
          p.line(ex + 2, ey + 3, ex, ey + 5, OUTLINE);
        } else if (face === 'dead') {
          p.line(ex, ey + 1, ex + 2, ey + 3, OUTLINE);
          p.line(ex + 2, ey + 1, ex, ey + 3, OUTLINE);
        } else if (happy) {
          p.px(ex, ey + 3, OUTLINE);
          p.px(ex + 1, ey + 2, OUTLINE);
          p.px(ex + 2, ey + 3, OUTLINE);
        } else {
          p.rect(ex, ey, 3, 5, OUTLINE);
          p.rect(ex, ey + 1, 1, 1, '#ffffff');
          p.px(ex + 2, ey + 3, '#6a4a60');
        }
      }
      const mx = Math.round((eyes[0] + eyes[1]) / 2) + 1;
      if (face === 'shoot') p.rect(mx - 1, ey + 7, 2, 2, '#4a1414');
      if (face === 'hurt') { p.rect(mx - 2, ey + 7, 4, 2, '#4a1414'); p.rect(mx - 1, ey + 7, 2, 1, '#ffffff'); }
      if (happy) { p.rect(mx - 2, ey + 6, 4, 2, '#4a1414'); p.rect(mx - 1, ey + 8, 2, 1, '#ff8080'); }
      if (face !== 'dead' && face !== 'hurt') {
        p.rect(eyes[0] - 2, ey + 6, 2, 1, P.cheek);
        p.rect(eyes[1] + 3, ey + 6, 2, 1, P.cheek);
      }
      claudeAccessoryDetail(p, costume, by, dir, eyes);
    },
  });
}

// Accès mis en cache : claudeSpr('classic', 'down', 0, 'normal')
const _claudeCache = {};
function claudeSpr(costume, dir, frame, face = 'normal') {
  const key = costume + dir + frame + face;
  let c = _claudeCache[key];
  if (!c) {
    c = paintClaude(costume, dir, frame, face);
    _claudeCache[key] = c;
  }
  return c;
}

// Larme de Claude : petite étincelle orange (le « ✻ » de Claude), 3 tailles, 2 poses.
function paintSpark(size, pose, color = '#ff9a5a') {
  const n = size * 2 + 3;
  const c0 = size + 1.5;
  return paint(n, n, (p) => {
    p.circ(c0, c0, size * 0.75 + 0.8, color);
    if (pose === 0) {
      p.rect(Math.floor(c0), 0, 1, n, color);
      p.rect(0, Math.floor(c0), n, 1, color);
    } else {
      p.line(1, 1, n - 2, n - 2, color);
      p.line(n - 2, 1, 1, n - 2, color);
    }
  }, {
    shade: { hi: 0.4, lo: 0.25, grad: 0.1 },
    outline: '#3a1208',
    detail: (p) => {
      p.px(Math.floor(c0) - 1, Math.floor(c0) - 1, '#fff6e8');
      if (size >= 2) p.px(Math.floor(c0), Math.floor(c0) - 1, '#fff6e8');
    },
  });
}
for (let s = 1; s <= 4; s++) {
  for (let pz = 0; pz < 2; pz++) {
    defSpr(`tear${s}_${pz}`, () => paintSpark(s, pz));
    defSpr(`tearB${s}_${pz}`, () => paintSpark(s, pz, '#b8d4ff'));
    defSpr(`tearP${s}_${pz}`, () => paintSpark(s, pz, '#a8e060'));
    defSpr(`tearR${s}_${pz}`, () => paintSpark(s, pz, '#ff5a6a'));
  }
}

defSpr('claude_portrait', () => claudeSpr('classic', 'down', 0, 'normal'));
