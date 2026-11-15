"""Writes docs/herinneringen.md: every memory and its shards from src/core/data/memories.ts, to read and review."""
import json, re

src = open('src/core/data/memories.ts', encoding='utf-8').read()
body = src[src.index('export const MEMORIES'):]
out = ['# Herinneringen (memory shards)', '',
       'Gemaakt uit `src/core/data/memories.ts` met `python3 scripts/memories-to-md.py`. Per shard: de tekst zoals je hem',
       'in de eerste ronde vindt, en daaronder (cursief) de Heimdall-laag uit latere rondes. Shard 15 komt altijd als laatste.', '']
for block in re.split(r"\n  \{\n    // ", body)[1:]:
    title = json.loads(re.search(r"title: (\"[^\n]*\"|'[^\n]*'),", block).group(1).replace("'", '"'))
    lines = block.split('\n')
    note = ' '.join([lines[0]] + [l.strip()[3:] for l in lines[1:] if l.strip().startswith('//')])
    texts = [json.loads(t) for t in re.findall(r'text: ("(?:[^"\\]|\\.)*"),', block)]
    heim = [json.loads(t) for t in re.findall(r'heimdall: ("(?:[^"\\]|\\.)*"),', block)]
    out += [f'## {title}', '', note, '']
    for i, (t, h) in enumerate(zip(texts, heim), 1):
        out += [f'{i}. {t}', f'   *Heimdall: {h}*']
    out.append('')
open('docs/herinneringen.md', 'w', encoding='utf-8').write('\n'.join(out))
print('wrote', len(re.findall(r'^## ', '\n'.join(out), re.M)), 'memories')
