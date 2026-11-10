"""Writes the photo table on public/credits.html from art/photo-sources.json (run after adding a photo)."""
import html, json, re, urllib.parse

LICENSES = {
    'CC0 1.0': 'https://creativecommons.org/publicdomain/zero/1.0/',
    'CC BY 2.0': 'https://creativecommons.org/licenses/by/2.0/',
    'CC BY 3.0': 'https://creativecommons.org/licenses/by/3.0/',
    'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
    'public domain': 'https://creativecommons.org/publicdomain/mark/1.0/',
}
rows = []
for p in json.load(open('art/photo-sources.json')):
    title = p['file'][5:].rsplit('.', 1)[0].replace('_', ' ')
    url = 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(p['file'])
    lic = p['license']
    rows.append(f'        <tr><td>{html.escape(p["use"])}</td><td><a href="{url}">{html.escape(title)}</a></td>'
                f'<td>{html.escape(p["author"])}</td><td><a href="{LICENSES.get(lic, "#")}">{html.escape(lic)}</a></td></tr>')
prow = []
for p in json.load(open('art/painting-sources.json')):
    url = 'https://commons.wikimedia.org/wiki/' + urllib.parse.quote(p['file'])
    prow.append(f'        <tr><td>{html.escape(p["use"])}</td><td><a href="{url}">{html.escape(p["work"])}</a></td>'
                f'<td>{html.escape(p["author"])}</td><td>Public domain</td></tr>')
page = open('public/credits.html').read()
page = re.sub(r'(<!-- PAINTINGS -->).*?(\n      </table>)', lambda m: m.group(1) + '\n' + '\n'.join(prow) + m.group(2), page, flags=re.S)
page = re.sub(r'(<!-- PHOTOS -->).*?(\n      </table>)', lambda m: m.group(1) + '\n' + '\n'.join(rows) + m.group(2), page, flags=re.S)
open('public/credits.html', 'w').write(page)
print(len(rows), 'photos and', len(prow), 'paintings credited')
