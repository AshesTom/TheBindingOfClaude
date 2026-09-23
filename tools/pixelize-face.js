// Pixelise une photo de visage en sprite de tête pour le jeu.
//
// Usage :
//   node tools/pixelize-face.js <photo.png|jpg> [cx cy taille]
//     cx, cy : centre du visage dans la photo (px) ; taille : largeur du cadrage.
//     Sans ces valeurs, on cadre au centre de l'image.
//
// Produit js/engine/sam_face.js (palette réduite + pixels indexés), chargé
// automatiquement par index.html : la tête dessinée de Sam est alors remplacée.
//
// Nécessite Playwright (npm i -g playwright) pour disposer d'un canvas.

const fs = require('fs');
const path = require('path');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (e) {
  ({ chromium } = require('/opt/node22/lib/node_modules/playwright'));
}

(async () => {
  const [src, cx, cy, size] = process.argv.slice(2);
  if (!src) {
    console.error('Usage : node tools/pixelize-face.js photo.png [cx cy taille]');
    process.exit(1);
  }
  const ext = path.extname(src).slice(1).toLowerCase().replace('jpg', 'jpeg');
  const dataUrl = `data:image/${ext};base64,` + fs.readFileSync(src).toString('base64');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out = await page.evaluate(async ({ dataUrl, cx, cy, size }) => {
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const S = size ? +size : Math.min(img.width, img.height) * 0.8;
    const X = (cx ? +cx : img.width / 2) - S / 2;
    const Y = (cy ? +cy : img.height / 2) - S * 0.55;
    const H = S * 1.15;

    function sample(w) {
      const h = Math.round(w * 1.15);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      x.drawImage(img, X, Y, S, H, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data;
      // Couleur du fond : moyenne des coins supérieurs de la photo
      const full = document.createElement('canvas');
      full.width = img.width;
      full.height = img.height;
      const fx = full.getContext('2d');
      fx.drawImage(img, 0, 0);
      const bgs = [[8, 8], [img.width - 9, 8], [8, img.height * 0.3], [img.width - 9, img.height * 0.3]].map(([a, b]) => fx.getImageData(a, b, 1, 1).data);
      const isBg = (k) => bgs.some((b) => Math.abs(d[k] - b[0]) + Math.abs(d[k + 1] - b[1]) + 2.5 * Math.abs(d[k + 2] - b[2]) < 95);
      // Remplissage depuis les bords : on retire le fond sans toucher au visage
      const bg = new Uint8Array(w * h);
      const q = [];
      for (let i = 0; i < w; i++) q.push([i, 0]);
      for (let j = 0; j < h; j++) { q.push([0, j]); q.push([w - 1, j]); }
      while (q.length) {
        const [i, j] = q.pop();
        if (i < 0 || j < 0 || i >= w || j >= h || bg[j * w + i]) continue;
        if (!isBg((j * w + i) * 4)) continue;
        bg[j * w + i] = 1;
        q.push([i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]);
      }
      // Masque : pas de fond, et on coupe sous le cou
      const px = [];
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = (j * w + i) * 4;
          const dx = (i + 0.5 - w / 2) / (w / 2);
          const keep = !bg[j * w + i] && j < h * 0.93 && Math.abs(dx) < (j > h * 0.78 ? 0.5 : 1.1);
          px.push(keep ? [d[k], d[k + 1], d[k + 2]] : null);
        }
      }
      // Quantification (k-moyennes, 12 couleurs) + contraste un peu poussé
      const pts = px.filter(Boolean).map((p) => p.map((v) => Math.min(255, Math.max(0, (v - 128) * 1.15 + 128))));
      let cent = [];
      const K = 12;
      const sorted = pts.slice().sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
      for (let i = 0; i < K; i++) cent.push(sorted[Math.floor((i + 0.5) * sorted.length / K)].slice());
      for (let it = 0; it < 12; it++) {
        const acc = cent.map(() => [0, 0, 0, 0]);
        for (const p of pts) {
          let b = 0;
          let bd = 1e9;
          cent.forEach((c, ci) => {
            const dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
            if (dd < bd) { bd = dd; b = ci; }
          });
          acc[b][0] += p[0]; acc[b][1] += p[1]; acc[b][2] += p[2]; acc[b][3]++;
        }
        cent = acc.map((a, i) => (a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : cent[i]));
      }
      const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
      let data = '';
      let pi = 0;
      for (const p of px) {
        if (!p) { data += '/'; continue; }
        const q = pts[pi++];
        let b = 0;
        let bd = 1e9;
        cent.forEach((c, ci) => {
          const dd = (q[0] - c[0]) ** 2 + (q[1] - c[1]) ** 2 + (q[2] - c[2]) ** 2;
          if (dd < bd) { bd = dd; b = ci; }
        });
        data += String.fromCharCode(48 + b);
      }
      return { w, h, palette: cent.map(hex), data };
    }
    return { big: sample(48), small: sample(24) };
  }, { dataUrl, cx, cy, size });
  await browser.close();
  const js = '// Généré par tools/pixelize-face.js — tête pixelisée à partir d\'une photo.\n'
    + 'const SAM_FACE = ' + JSON.stringify(out.big) + ';\n'
    + 'const SAM_FACE_S = ' + JSON.stringify(out.small) + ';\n';
  const dest = path.join(__dirname, '..', 'js', 'engine', 'sam_face.js');
  fs.writeFileSync(dest, js);
  const html = path.join(__dirname, '..', 'index.html');
  let h = fs.readFileSync(html, 'utf8');
  if (!h.includes('sam_face.js')) {
    h = h.replace('<script src="js/engine/hd.js"></script>', '<script src="js/engine/sam_face.js"></script>\n  <script src="js/engine/hd.js"></script>');
    fs.writeFileSync(html, h);
  }
  console.log('Écrit :', dest);
})();
