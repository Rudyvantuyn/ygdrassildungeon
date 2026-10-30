// Prints a floor code from the Drafting Table as readable JSON, to add it to src/core/data/floors.ts.
//   node scripts/floor-code.mjs YGF1.xxxxx
const code = (process.argv[2] ?? '').trim();
if (!code.startsWith('YGF1.')) {
  console.error('Usage: node scripts/floor-code.mjs YGF1.<code>');
  process.exit(1);
}
const json = Buffer.from(code.slice(5), 'base64url').toString('utf8');
const d = JSON.parse(json);
console.log(JSON.stringify({ name: d.n, theme: d.t, monstersLike: d.m, boss: d.b, prowlers: d.p.map(([enemy, hunt, route]) => ({ enemy, hunt, route })), rows: d.r }, null, 2));
