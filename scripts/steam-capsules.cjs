// Draws the Steam store and library images from the game's own art (CC0 photos through the pixel filter, CC0 pixel
// sprites and the bundled pixel font), at the sizes Steamworks asks for. Check the sizes in Steamworks before upload.
// Usage: node scripts/steam-capsules.cjs <outdir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..');
const art = (p) => 'file://' + path.join(root, 'public/art', p);
const font = 'file://' + path.join(root, 'node_modules/@fontsource/pixelify-sans/files/pixelify-sans-latin-700-normal.woff2');
const out = path.resolve(process.argv[2] || 'steam');
fs.mkdirSync(out, { recursive: true });

const PARTY = ['bastion-0', 'strider-4', 'mender-2', 'runecaller-1', 'berserker-5'];

/** One image: background roots, optional guardian and party, optional logo. Sizes are in px of the final image. */
function page({ w, h, logo = true, party = true, beast = true, bg = true, logoSize, logoTop = 0.5, partyH = 0.36, beastH = 0.7, tagline = '' }) {
  const ls = logoSize ?? Math.round(Math.min(w / 8.2, h / 2.8));
  const heroes = PARTY.map((id) => `<img class="px hero" src="${art(`heroes/${id}.webp`)}">`).join('');
  return `<!doctype html><html><head><style>
    @font-face { font-family: Ygg; src: url('${font}') format('woff2'); font-weight: 700; }
    html, body { margin: 0; width: ${w}px; height: ${h}px; overflow: hidden; background: ${bg ? '#05080b' : 'transparent'}; }
    .bg { position: absolute; inset: 0; background: url('${art('places/rootdeep.webp')}') center/cover; image-rendering: pixelated; }
    .shade { position: absolute; inset: 0; background:
      radial-gradient(ellipse at 50% 62%, rgba(255,170,90,.22), rgba(0,0,0,0) 55%),
      linear-gradient(to bottom, rgba(5,8,11,.55), rgba(5,8,11,.15) 40%, rgba(5,8,11,.85)); }
    .px { image-rendering: pixelated; }
    .beast { position: absolute; left: 50%; bottom: ${party ? Math.round(h * partyH * 0.55) : Math.round(h * 0.05)}px; height: ${Math.round(h * beastH)}px; transform: translateX(-50%); filter: drop-shadow(0 0 ${Math.round(h * 0.04)}px rgba(255,90,60,.35)) brightness(.9); opacity: .92; }
    .party { position: absolute; left: 0; right: 0; bottom: ${Math.round(h * 0.02)}px; display: flex; justify-content: center; gap: ${Math.round(h * partyH * 0.02)}px; }
    .hero { height: ${Math.round(h * partyH)}px; filter: drop-shadow(0 ${Math.round(h * 0.01)}px 0 #000); }
    .logo { position: absolute; left: 0; right: 0; top: ${Math.round(h * logoTop)}px; transform: translateY(-50%); text-align: center;
      font: 700 ${ls}px Ygg, monospace; letter-spacing: .1em; padding-left: .1em; color: #f1d48a;
      text-shadow: 0 ${Math.max(2, Math.round(ls * 0.07))}px 0 #1a1208, 0 0 ${Math.round(ls * 0.35)}px rgba(0,0,0,.85); }
    .tag { position: absolute; left: 0; right: 0; top: ${Math.round(h * logoTop + ls * 0.75)}px; text-align: center;
      font: 700 ${Math.round(ls * 0.2)}px Ygg, monospace; letter-spacing: .25em; color: #e9e2cf; text-shadow: 0 2px 0 #000, 0 0 12px #000; }
  </style></head><body>
    ${bg ? '<div class="bg"></div><div class="shade"></div>' : ''}
    ${beast ? `<img class="px beast" src="${art('monsters/nidhogg.webp')}">` : ''}
    ${party ? `<div class="party">${heroes}</div>` : ''}
    ${logo ? '<div class="logo">YGDRASSIL</div>' : ''}
    ${tagline ? `<div class="tag">${tagline}</div>` : ''}
  </body></html>`;
}

const IMAGES = [
  // Store
  ['header-capsule-920x430.png', { w: 920, h: 430, logoTop: 0.3, partyH: 0.34, beastH: 0.62 }],
  ['small-capsule-462x174.png', { w: 462, h: 174, party: false, beast: false, logoTop: 0.5, logoSize: 70 }],
  ['main-capsule-1232x706.png', { w: 1232, h: 706, logoTop: 0.22, partyH: 0.3, beastH: 0.6, tagline: 'THE ROAD TO ASGARD RUNS THROUGH YMIR' }],
  ['vertical-capsule-748x896.png', { w: 748, h: 896, logoTop: 0.13, logoSize: 112, partyH: 0.16, beastH: 0.5 }],
  // Library
  ['library-capsule-600x900.png', { w: 600, h: 900, logoTop: 0.13, logoSize: 92, partyH: 0.13, beastH: 0.48 }],
  ['library-header-920x430.png', { w: 920, h: 430, logoTop: 0.3, partyH: 0.34, beastH: 0.62 }],
  ['library-hero-3840x1240.png', { w: 3840, h: 1240, logo: false, partyH: 0.3, beastH: 0.66 }],
  ['library-logo-1280x720.png', { w: 1280, h: 720, bg: false, party: false, beast: false, logoSize: 190 }],
  // Link previews (Discord, Reddit, Bluesky, ...): copied to public/og.png
  ['og-1200x630.png', { w: 1200, h: 630, logoTop: 0.24, partyH: 0.3, beastH: 0.58, tagline: 'A FREE DUNGEON CRAWLER IN YOUR BROWSER' }],
  // Store page background (optional)
  ['page-background-1438x810.png', { w: 1438, h: 810, logo: false, party: false, beast: false }],
];

(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of IMAGES) {
    const p = await b.newPage({ viewport: { width: opts.w, height: opts.h }, deviceScaleFactor: 1 });
    // From a file, so the page may load the art and font from disk.
    const file = path.join(out, '.page.html');
    fs.writeFileSync(file, page(opts));
    await p.goto('file://' + file, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, name), omitBackground: opts.bg === false });
    await p.close();
    console.log(name);
  }
  fs.rmSync(path.join(out, '.page.html'), { force: true });
  await b.close();
})();
