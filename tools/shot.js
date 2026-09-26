// Capture d'écran d'une page locale : node tools/shot.js page.html sortie.png [js à évaluer] [attente ms]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const [page_, out, evalJs, wait] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + '\n' + e.stack));
  p.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !m.text().includes('willReadFrequently'))) errs.push(m.type() + ' ' + m.text()); });
  await p.goto('file://' + require('path').resolve(page_));
  await p.waitForTimeout(300);
  if (evalJs) { try { const r = await p.evaluate(evalJs); if (r !== undefined) console.log('EVAL:', JSON.stringify(r)); } catch (e) { errs.push('EVAL ' + e.message); } }
  await p.waitForTimeout(+wait || 300);
  await p.screenshot({ path: out });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
