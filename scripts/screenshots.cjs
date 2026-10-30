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

  await press('Enter'); // New Game -> founding the party at the Oath Hall
  await shot('01b-founding');
  // Swear in four adventurers: [name, steps down the class list].
  for (const [name, down] of [['Bram', 0], ['Sela', 1], ['Wren', 2], ['Orrin', 3]]) {
    await press('Enter'); // Swear in an adventurer
    await press('ArrowDown', down);
    await press('Enter'); // the class
    await page.keyboard.type(name);
    await press('Enter'); // swear the oath
  }
  await shot('01c-founded');
  await press('Enter'); // Set out for Lindholm
  // The intro story and the first tips: show one, then step through them.
  for (let i = 0; i < 12 && (await page.evaluate(() => window.ygg.mode)) === 'story'; i++) await page.keyboard.press('Escape');
  await shot('01d-tip');
  for (let i = 0; i < 12 && (await page.evaluate(() => window.ygg.mode)) === 'overlay'; i++) await press('Escape');
  // Tips are covered above; the rest of the tour runs without them.
  await page.evaluate(() => (window.ygg.game.state.tipsOff = true));
  await shot('02-town');
  await press('ArrowUp', 2); // Shop
  await press('Enter');
  await press('ArrowDown'); // Equipment
  await press('Enter');
  await shot('02b-shop-equipment');
  await press('Enter'); // Copper Edge -> choose wearer
  await shot('02c-shop-wearer');
  await press('Enter'); // Bram buys it
  await press('Escape');
  await press('Escape');
  await press('Escape');
  await press('ArrowDown', 2); // Rootdeep
  await press('Enter');
  await press('Enter'); // first floor
  for (let i = 0; i < 12 && (await page.evaluate(() => window.ygg.mode)) === 'story'; i++) await page.keyboard.press('Escape');
  await page.evaluate(() => (window.ygg.game.state.encounterAt = 999));
  await shot('02d-explore-start');
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
  await shot('08-pack');
  await press('Escape');
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
