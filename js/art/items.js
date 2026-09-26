// Icônes des objets (≈ 18 x 18), une petite illustration par objet.

const ITEM_ART = {
  h100: (p) => {
    p.rect(1, 5, 16, 9, '#2a6a3a');
    p.rect(1, 14, 12, 2, '#c0a040');
  },
  coffee: (p) => {
    p.rr(3, 6, 10, 10, 2, '#f0ece4');
    p.ring(14, 10, 2.5, '#f0ece4', 2);
  },
  context: (p) => {
    p.rect(3, 1, 12, 16, '#e8dcc0');
    p.rect(1, 0, 16, 3, '#c8b890');
    p.rect(1, 15, 16, 3, '#c8b890');
  },
  attention: (p) => {
    p.ell(9, 9, 8, 5.5, '#f4f4f4');
  },
  moe: (p) => {
    p.circ(4, 11, 3.5, '#d97757');
    p.circ(9, 6, 3.5, '#5a8ae0');
    p.circ(14, 11, 3.5, '#60c060');
  },
  cot: (p) => {
    for (let i = 0; i < 3; i++) p.rr(1 + i * 5, 6 + (i % 2) * 2, 7, 5, 2, '#a8a8b8');
  },
  temperature: (p) => {
    p.rr(7, 1, 4, 13, 2, '#e8e8f0');
    p.circ(9, 14, 3.5, '#e02020');
  },
  rlhf: (p) => {
    p.rr(3, 8, 10, 8, 2, '#f0c8a0');
    p.rr(4, 1, 4, 9, 2, '#f0c8a0');
    p.rect(13, 8, 3, 8, '#4a7ad0');
  },
  constitution: (p) => {
    p.rect(3, 2, 12, 15, '#e8e0cc');
    p.rect(2, 1, 14, 2, '#b8a880');
  },
  sysprompt: (p) => {
    p.rr(1, 2, 16, 13, 2, '#2a2a34');
    p.rect(6, 15, 6, 2, '#5a5a64');
  },
  quant: (p) => {
    p.rect(3, 3, 12, 12, '#3a3a44');
    for (let i = 0; i < 4; i++) { p.rect(1, 4 + i * 3, 2, 1, '#c0c0c8'); p.rect(15, 4 + i * 3, 2, 1, '#c0c0c8'); }
  },
  finetune: (p) => {
    p.rect(8, 7, 2, 10, '#b8b8c8');
    p.rect(4, 1, 2, 8, '#b8b8c8');
    p.rect(12, 1, 2, 8, '#b8b8c8');
    p.rect(4, 7, 10, 2, '#b8b8c8');
  },
  batch: (p) => {
    for (let i = 0; i < 4; i++) p.rect(2 + i, 12 - i * 3, 13, 4, i % 2 ? '#f0f0f0' : '#dcdcdc');
  },
  usb: (p) => {
    p.rr(5, 6, 8, 12, 2, '#3a5ab0');
    p.rect(6, 1, 6, 6, '#c0c0c8');
  },
  subagent: (p) => {
    p.rr(3, 5, 12, 9, 3, '#d97757');
    p.rect(0, 8, 3, 3, '#c86a4a'); p.rect(15, 8, 3, 3, '#c86a4a');
    for (const x of [4, 7, 10, 13]) p.rect(x, 13, 2, 3, '#a0503a');
  },
  kvcache: (p) => {
    p.circ(9, 9, 7.5, '#4a8ad0');
  },
  artifact: (p) => {
    p.poly([[9, 1], [16, 7], [9, 17], [2, 7]], '#ff8a4a');
  },
  planmode: (p) => {
    p.rect(1, 3, 16, 12, '#e0d0a8');
  },
  tokenizer: (p) => {
    p.circ(5, 13, 3.5, '#d04040');
    p.circ(13, 13, 3.5, '#d04040');
    p.poly([[5, 11], [14, 1], [15, 2], [7, 12]], '#c8c8d0');
    p.poly([[13, 11], [4, 1], [3, 2], [11, 12]], '#c8c8d0');
  },
  hallu: (p) => {
    p.ell(9, 7, 8, 6, '#e04080');
    p.rect(6, 10, 6, 7, '#f0e8d8');
  },
  mcp: (p) => {
    p.rr(3, 5, 12, 9, 2, '#e8e8f0');
    p.rect(5, 1, 2, 5, '#b8b8c0'); p.rect(11, 1, 2, 5, '#b8b8c0');
    p.rect(8, 14, 2, 4, '#2a2a2a');
  },
  stickers: (p) => {
    p.rr(2, 2, 14, 14, 3, '#f4f0e8');
  },
  moore: (p) => {
    p.rect(2, 4, 14, 13, '#3a3a44');
    p.poly([[9, 0], [15, 6], [3, 6]], '#40d040');
  },
  gradient: (p) => {
    p.circ(9, 10, 7, '#2a2a34');
    p.rect(8, 1, 3, 3, '#6a6a74');
  },
  dropout: (p) => {
    p.rr(2, 2, 14, 14, 2, '#f0f0f0');
  },
  overclock: (p) => {
    p.poly([[10, 0], [3, 10], [8, 10], [6, 18], [15, 7], [10, 7], [13, 0]], '#f0d020');
  },
  pr: (p) => {
    p.circ(9, 9, 8, '#2a9a4a');
  },
  sparkle: (p) => {
    p.poly([[9, 0], [11, 7], [18, 9], [11, 11], [9, 18], [7, 11], [0, 9], [7, 7]], '#f8e060');
  },
  openweights: (p) => {
    p.rect(3, 8, 12, 2, '#9a9aa8');
    p.rect(1, 4, 3, 10, '#4a4a54'); p.rect(14, 4, 3, 10, '#4a4a54');
    p.rect(0, 6, 1, 6, '#4a4a54'); p.rect(17, 6, 1, 6, '#4a4a54');
  },
  latent: (p) => {
    p.ell(5, 9, 5, 7, '#f4f4ff');
    p.ell(13, 9, 5, 7, '#f4f4ff');
  },
  rag: (p) => {
    p.rect(1, 3, 12, 14, '#6a3a8a');
    p.circ(12, 11, 4.5, '#a0c8e0');
    p.line(15, 14, 17, 17, '#6a4a2a', 2);
  },
  injection: (p) => {
    p.rect(2, 7, 11, 4, '#e0f0f8');
    p.rect(13, 8, 4, 2, '#c0c0c8');
    p.rect(0, 6, 2, 6, '#8a8a98');
  },
  benchmark: (p) => {
    p.rect(2, 12, 3, 5, '#5a8ad0');
    p.rect(7, 8, 3, 9, '#5a8ad0');
    p.rect(12, 2, 3, 15, '#e04050');
  },
  agi: (p) => {
    p.ell(9, 9, 8, 7, '#f0a0b8');
  },
  stargate: (p) => {
    p.ring(9, 9, 8, '#8a8a9a', 3);
  },
  equity: (p) => {
    p.ell(9, 11, 7, 6, '#c8a060');
    p.rect(6, 2, 6, 4, '#c8a060');
  },
  hype: (p) => {
    p.poly([[9, 0], [16, 16], [9, 12], [2, 16]], '#e04080');
  },
  regen: (p) => {
    p.ring(9, 9, 7, '#40a0e0', 3);
  },
  ctrlaltdel: (p) => {
    for (let i = 0; i < 3; i++) p.rr(0 + i * 6, 5, 6, 8, 1, '#e8e8f0');
  },
  espresso: (p) => {
    for (let i = 0; i < 3; i++) p.rr(1 + i * 6, 8, 5, 7, 1, '#f0ece4');
  },
  ratelimit: (p) => {
    p.rect(3, 1, 12, 2, '#8a5a30'); p.rect(3, 15, 12, 2, '#8a5a30');
    p.poly([[4, 3], [14, 3], [9, 9], [14, 15], [4, 15], [9, 9]], '#d8ecf8');
  },
  compact: (p) => {
    p.rect(1, 6, 16, 7, '#e8dcc0');
    p.rect(0, 3, 2, 13, '#6a6a74'); p.rect(16, 3, 2, 13, '#6a6a74');
  },
  gitstash: (p) => {
    p.rect(2, 6, 14, 10, '#b07a40');
    p.rect(1, 4, 16, 3, '#c88a48');
  },
  forkbomb: (p) => {
    p.circ(9, 10, 8, '#2a2a34');
    p.rect(7, 0, 4, 3, '#6a6a74');
  },
  ultrathink: (p) => {
    p.circ(9, 7, 6.5, '#fff0a0');
    p.rect(6, 12, 6, 5, '#b8b8c0');
  },
};

const ITEM_DETAIL = {
  h100: (p) => {
    p.circ(5.5, 9.5, 3, '#1a1a1a'); p.circ(12.5, 9.5, 3, '#1a1a1a');
    p.line(4, 8, 7, 11, '#6a6a6a'); p.line(11, 8, 14, 11, '#6a6a6a');
    p.rect(2, 5, 14, 1, '#76b900');
  },
  coffee: (p) => {
    p.rect(4, 7, 8, 2, '#5a3018');
    p.px(6, 2, '#ffffff'); p.px(7, 1, '#ffffff'); p.px(10, 3, '#ffffff'); p.px(9, 2, '#ffffff');
  },
  context: (p) => { for (let y = 4; y < 15; y += 2) p.rect(5, y, 8 - (y % 4), 1, '#8a7a5a'); },
  attention: (p) => {
    p.circ(9, 9, 3.5, '#d97757');
    p.circ(9, 9, 1.5, OUTLINE);
    p.px(8, 7, '#fff');
  },
  moe: (p) => { for (const [x, y] of [[3, 10], [8, 5], [13, 10]]) { p.px(x, y, OUTLINE); p.px(x + 2, y, OUTLINE); } },
  cot: (p) => { for (let i = 0; i < 3; i++) p.rect(3 + i * 5, 8 + (i % 2) * 2, 3, 1, '#4a4a5a'); },
  temperature: (p) => {
    p.rect(8, 5, 2, 9, '#e02020');
    for (let y = 3; y < 12; y += 2) p.px(11, y, '#6a6a7a');
  },
  rlhf: (p) => { p.rect(5, 11, 7, 1, '#b08060'); p.rect(5, 13, 7, 1, '#b08060'); },
  constitution: (p) => {
    for (let y = 8; y < 16; y += 2) p.rect(5, y, 8, 1, '#8a7a5a');
    Font.draw(p.g, '✻', 7, 3, '#d97757');
  },
  sysprompt: (p) => { Font.draw(p.g, '>_', 4, 5, '#50f070'); },
  quant: (p) => { Font.draw(p.g, '4b', 5, 6, '#f0d040'); },
  finetune: (p) => { p.px(4, 1, '#ffffff'); p.px(12, 1, '#ffffff'); },
  batch: (p) => { for (let i = 0; i < 4; i++) p.rect(5 + i, 13 - i * 3, 6, 1, '#9a9aa8'); },
  usb: (p) => { p.rect(7, 2, 1, 2, '#3a3a44'); p.rect(10, 2, 1, 2, '#3a3a44'); p.px(9, 12, '#80c0ff'); },
  subagent: (p) => { p.rect(6, 8, 2, 3, OUTLINE); p.rect(10, 8, 2, 3, OUTLINE); p.px(6, 8, '#fff'); p.px(10, 8, '#fff'); },
  kvcache: (p) => {
    p.ring(9, 9, 5, '#a0d0ff');
    Font.draw(p.g, 'KV', 5, 6, '#ffffff');
  },
  artifact: (p) => {
    p.line(9, 2, 9, 16, '#ffd0a0');
    p.line(3, 7, 15, 7, '#c0501a');
    p.px(7, 4, '#ffffff');
  },
  planmode: (p) => {
    p.rect(3, 6, 4, 3, '#8a7a5a'); p.rect(7, 7, 4, 1, '#8a7a5a'); p.rect(11, 5, 3, 5, '#8a7a5a');
    p.line(4, 12, 13, 12, '#c03030');
    p.px(13, 11, '#c03030');
  },
  tokenizer: (p) => { p.circ(5, 13, 1.5, '#fff0e0'); p.circ(13, 13, 1.5, '#fff0e0'); },
  hallu: (p) => {
    for (const [x, y, c] of [[5, 5, '#ffe060'], [11, 4, '#60e0ff'], [9, 8, '#a0ff80'], [14, 7, '#ffe060']]) p.circ(x, y, 1.2, c);
    p.px(7, 13, OUTLINE); p.px(10, 13, OUTLINE);
  },
  mcp: (p) => { Font.draw(p.g, 'MCP', 3, 6, '#d97757'); },
  stickers: (p) => {
    Font.draw(p.g, '✻', 3, 3, '#d97757');
    p.circ(12, 11, 3, '#5a8ae0');
    p.rect(3, 11, 5, 4, '#60c060');
  },
  moore: (p) => { p.rect(8, 6, 2, 8, '#40d040'); p.rect(4, 13, 10, 2, '#1a1a1a'); },
  gradient: (p) => {
    p.line(4, 14, 8, 10, '#ff5030'); p.line(8, 10, 10, 12, '#ff5030'); p.line(10, 12, 14, 6, '#ff5030');
    p.px(12, 0, '#ffd040'); p.px(11, 1, '#ffa040');
  },
  dropout: (p) => {
    for (const [x, y] of [[5, 5], [12, 5], [9, 9], [5, 13], [12, 13]]) p.rect(x - 1, y - 1, 2, 2, x === 9 ? '#d0d0d0' : OUTLINE);
  },
  overclock: (p) => { p.px(9, 3, '#ffffff'); p.px(8, 5, '#ffffff'); },
  pr: (p) => { p.line(5, 9, 8, 12, '#ffffff', 2); p.line(8, 12, 13, 5, '#ffffff', 2); },
  sparkle: (p) => { p.px(8, 7, '#ffffff'); p.px(9, 8, '#ffffff'); },
  openweights: (p) => { p.px(2, 5, '#9a9aa8'); p.px(15, 5, '#9a9aa8'); },
  latent: (p) => { for (let i = 0; i < 3; i++) { p.rect(2, 6 + i * 3, 5, 1, '#c0c8e0'); p.rect(11, 6 + i * 3, 5, 1, '#c0c8e0'); } },
  rag: (p) => {
    p.rect(3, 5, 6, 1, '#d8c0f0'); p.rect(3, 8, 5, 1, '#d8c0f0');
    p.px(11, 9, '#ffffff');
  },
  injection: (p) => { p.rect(3, 8, 7, 2, '#60e080'); p.px(17, 9, '#ffffff'); },
  benchmark: (p) => { p.line(2, 16, 16, 1, '#f0f0f0'); p.px(15, 1, '#f0f0f0'); p.px(16, 2, '#f0f0f0'); },
  agi: (p) => {
    p.line(4, 6, 8, 9, '#c06080'); p.line(10, 5, 12, 11, '#c06080'); p.line(5, 12, 13, 13, '#c06080');
    p.px(6, 4, '#ffffff');
  },
  stargate: (p) => {
    p.circ(9, 9, 4, '#60c0ff');
    p.circ(9, 9, 2, '#e0f4ff');
    for (const [x, y] of [[9, 1], [1, 9], [17, 9], [9, 17]]) p.px(x, y, '#ffa040');
  },
  equity: (p) => { Font.draw(p.g, '$', 7, 8, '#4a2a10'); p.rect(5, 5, 8, 1, '#6a4a20'); },
  hype: (p) => { p.px(9, 4, '#ffffff'); p.circ(9, 9, 1.5, '#ffe0f0'); },
  regen: (p) => { p.poly([[12, 1], [17, 4], [12, 7]], '#40a0e0'); p.px(9, 9, '#ffffff'); },
  ctrlaltdel: (p) => {
    Font.draw(p.g, 'C', 1, 6, '#3a3a44');
    Font.draw(p.g, 'A', 7, 6, '#3a3a44');
    Font.draw(p.g, 'S', 13, 6, '#3a3a44');
  },
  espresso: (p) => { for (let i = 0; i < 3; i++) { p.rect(2 + i * 6, 9, 3, 1, '#5a3018'); p.px(3 + i * 6, 6, '#ffffff'); } },
  ratelimit: (p) => { p.rect(7, 12, 4, 3, '#e0c060'); p.px(9, 8, '#e0c060'); },
  compact: (p) => {
    p.line(4, 9, 7, 9, '#3a2a1a'); p.line(11, 9, 14, 9, '#3a2a1a');
    p.px(6, 8, '#3a2a1a'); p.px(6, 10, '#3a2a1a'); p.px(12, 8, '#3a2a1a'); p.px(12, 10, '#3a2a1a');
  },
  gitstash: (p) => {
    p.circ(6, 11, 1.5, '#f05030'); p.circ(12, 9, 1.5, '#f05030');
    p.line(6, 11, 6, 7, '#f05030'); p.line(6, 9, 12, 9, '#f05030');
  },
  forkbomb: (p) => { Font.draw(p.g, ':(){', 2, 8, '#e0e0e8'); p.px(12, 1, '#ffd040'); },
  ultrathink: (p) => {
    p.rect(7, 13, 4, 1, '#6a6a74'); p.rect(7, 15, 4, 1, '#6a6a74');
    p.px(7, 4, '#ffffff'); p.px(8, 3, '#ffffff');
    p.line(9, 5, 9, 10, '#e0a020');
  },
};

for (const id in ITEM_ART) {
  defSpr('item_' + id, () => paint(18, 18, ITEM_ART[id], { shade: { hi: 0.28, lo: 0.3, grad: 0.15 }, detail: ITEM_DETAIL[id] }));
}
