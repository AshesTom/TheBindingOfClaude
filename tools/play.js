// Pilote Playwright : node tools/play.js script.js outdir
// Le script exporte async (p, shot, key, wait) => {...}
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const [scriptPath, outDir] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  p.on('console', (m) => { if (m.type() === 'error') errs.push('console.error ' + m.text()); });
  await p.goto('file://' + path.resolve('index.html'));
  await p.waitForTimeout(400);
  let n = 0;
  const shot = async (name) => { await p.screenshot({ path: path.join(outDir, (++n) + '_' + name + '.png') }); };
  const key = async (k, ms = 80) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); await p.waitForTimeout(60); };
  const wait = (ms) => p.waitForTimeout(ms);
  const script = require(path.resolve(scriptPath));
  try { await script(p, shot, key, wait); } catch (e) { errs.push('SCRIPT ' + e.message); }
  const u = [...new Set(errs)]; console.log(u.join('\n') || 'no errors');
  await b.close();
})();
