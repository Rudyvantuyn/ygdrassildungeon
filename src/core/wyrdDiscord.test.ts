import { describe, expect, it } from 'vitest';
import { wyrdMessage } from '../../server/wyrd-discord';
import { wyrdDay } from './wyrd';

describe('the daily Wyrdweave post on Discord', () => {
  it('names the day and the rule of each of the three floors', () => {
    const day = 20_408;
    const m = wyrdMessage(day) as { embeds: { title: string; fields: { name: string; value: string }[] }[] };
    const d = wyrdDay(day);
    expect(m.embeds[0].title).toContain(d.name);
    expect(m.embeds[0].fields.map((f) => f.value)).toEqual(d.rules.map((r) => r.text));
    expect(m.embeds[0].fields[2].name).toMatch(/^Floor III: /);
  });
});
