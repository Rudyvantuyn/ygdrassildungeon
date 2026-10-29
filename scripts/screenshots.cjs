/**
 * Smoke test + screenshots. Starts nothing itself: run `npm run dev` first, then
 *   node scripts/screenshots.cjs [url]
 * Requires Playwright (`npm i -D playwright && npx playwright install chromium`).
 * Writes PNGs to screenshots/ and fails on page errors.
 */
const { chromium } = require('playwright');
const fs = require('fs');

const url = process.argv[2] || 'http://localhost:5173/';
const out = 'screenshots';

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  const shot = async (name) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}.png` });
    console.log(`saved ${out}/${name}.png`);
  };
  const press = async (key, times = 1) => {
    for (let i = 0; i < times; i++) {
      await page.keyboard.press(key);
      await page.waitForTimeout(190);
    }
  };

  await page.goto(url);
  await page.waitForTimeout(800);
  await shot('01-title');

  await press('Enter'); // New Game
  await page.evaluate(() => (window.ygg.game.state.encounterAt = 999));
  await shot('02-explore-start');
  await press('ArrowUp', 4);
  await shot('03-explore-walk');
  await press('ArrowRight');
  await press('ArrowUp', 2);
  await shot('04-explore-turn');

  await page.evaluate(() => window.ygg.debugEncounter());
  await page.waitForTimeout(1900);
  await shot('05-combat-command');

  // Fight until the battle ends: Attack with everyone each round.
  for (let round = 0; round < 15; round++) {
    const mode = await page.evaluate(() => window.ygg.mode);
    if (mode !== 'combat') break;
    for (let m = 0; m < 4; m++) {
      await press('Enter'); // Attack
      await press('Enter'); // first target
    }
    if (round === 0) await shot('06-combat-playback');
    await page.waitForTimeout(3500);
  }
  await shot('07-after-combat');
  await press('Enter');

  await press('c');
  await shot('08-camp');
  await press('Escape');
  await press('m');
  await shot('09-map');
  await press('Escape');

  await browser.close();
  if (errors.length) {
    console.error('Page errors:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log('No page errors.');
})();
