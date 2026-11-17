// Clean 1920x1080 screenshots for the Steam page: no web bar, no playtest badge, no captions.
// Needs the dev server (npm run dev) on port 5173. Usage: node scripts/steam-screenshots.cjs <outdir>
const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  const wait = (ms) => p.waitForTimeout(ms);
  const press = async (k, n = 1, d = 150) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await wait(d); } };
  const mode = () => p.evaluate(() => window.ygg.mode);
  const settle = async (want) => { for (let i = 0; i < 60; i++) { const m = await mode(); if (m === want) break; if (m === 'story') await press('Escape'); else await press('Enter'); } };
  const clean = () => p.addStyleTag({ content: '#play-bar, .playtest-badge, .deed-banner, .toast { display: none !important; } #app { inset: 0 !important; }' });
  fs.mkdirSync(out, { recursive: true });
  const shot = async (name) => { await p.evaluate(() => window.dispatchEvent(new Event('resize'))); await wait(350); await p.screenshot({ path: `${out}/${name}.png` }); };
  const restore = () => p.evaluate(() => { const a = window.ygg; const maxOf = (sel, i) => Number((document.querySelectorAll(sel)[i]?.textContent ?? '0').split('/')[1]); a.game.state.party.forEach((m, i) => { m.hp = maxOf('.member .bar.hp .v', i); m.sp = maxOf('.member .bar.sp .v', i); }); });
  const go = async (floor, level) => {
    await p.evaluate(([f, l]) => { const a = window.ygg; a.game.state.party.forEach((m) => (m.level = l)); a.game.enterFloor(f, true); a.game.state.danger = -99999; a.enterExplore(); }, [floor, level]);
    await wait(500); await settle('explore');
  };
  const walk = async (steps) => {
    for (let s = 0; s < steps; s++) {
      const open = await p.evaluate(() => { const g = window.ygg.game; const dx = [0, 1, 0, -1][g.state.dir], dy = [-1, 0, 1, 0][g.state.dir]; return g.map.tiles[(g.state.y + dy) * g.map.width + g.state.x + dx] === 'floor'; });
      await p.keyboard.press(open ? 'ArrowUp' : (s % 3 ? 'ArrowRight' : 'ArrowLeft'));
      await wait(320);
      await p.evaluate(() => { window.ygg.game.state.danger = -99999; });
      if ((await mode()) !== 'explore') await settle('explore');
    }
    await wait(500);
  };
  const fight = async (start, rounds) => {
    await p.evaluate(start);
    for (let i = 0; i < 40; i++) { if (await p.evaluate(() => /What will/.test(document.body.innerText))) break; await wait(100); }
    await wait(400);
    for (let r = 0; r < rounds; r++) { await press('Enter', 1, 200); await press('Enter', 1, 200); for (let i = 0; i < 6 && !(await p.evaluate(() => /What will/.test(document.body.innerText))); i++) await press('Enter', 1, 250); }
  };

  await p.goto('http://localhost:5173/play.html'); await wait(2000); await clean();
  await shot('01-title');
  await press('Enter', 1, 600); await press('Enter', 1, 600); await press('ArrowDown', 2, 300); await press('Enter', 1, 700); await press('ArrowRight', 3, 300);
  await shot('02-oath-looks');
  await press('Enter', 1, 500); await p.keyboard.type('Sela'); await press('Enter', 1, 500);
  for (const [nm, d] of [['Bram', 0], ['Orrin', 3], ['Ragna', 5], ['Wren', 1]]) { await press('Enter'); await press('ArrowDown', d); await press('Enter'); await press('Enter'); await p.keyboard.type(nm); await press('Enter'); }
  await press('Enter');
  for (let i = 0; i < 40; i++) { const m = await mode(); if (m !== 'town') await press('Escape'); else break; }
  await p.evaluate(() => { const s = window.ygg.game.state; s.tipsOff = true; s.chartMode = 'auto'; s.gold = 1840; });
  await wait(600); await shot('03-lindholm');
  await go(0, 8); await walk(12); await shot('04-forest-map');
  await restore();
  await fight(() => { const a = window.ygg; a.startCombat(a.game.startCombat(['briarGnawer', 'puffcap', 'bogling'])); }, 0);
  await shot('05-fight');
  await press('Escape'); await settle('explore');
  for (const [floor, level, name] of [[6, 20, '06-drowned-roots'], [10, 40, '07-ymirs-bones'], [15, 50, '08-inside-the-sky'], [20, 60, '09-ginnungagap'], [25, 70, '10-hvergelmir']]) {
    await go(floor, level); await walk(10); await shot(name);
  }
  await go(29, 80); await restore();
  await fight(() => { const a = window.ygg; a.startCombat(a.game.startBossCombat()); }, 1);
  await shot('11-guardian');
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
