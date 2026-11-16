import { describe, expect, it } from 'vitest';
import { checkoutParams, isGameSession, stripeForm, validSignature } from '../../server/shop';
import { COSMETIC_BY_ID, DONATIONS, euros, itemsFor, PACKS } from './data/cosmetics';

describe('the shop', () => {
  it('sells only cosmetics that exist, at sensible prices', () => {
    for (const p of PACKS) {
      expect(p.price).toBeGreaterThanOrEqual(100);
      for (const id of p.items) expect(COSMETIC_BY_ID[id], id).toBeDefined();
    }
    expect(itemsFor('donation', '500')).toEqual(['supporter']);
    expect(euros(500)).toBe('€5');
    expect(euros(250)).toBe('€2.50');
    expect(DONATIONS.every((d) => d >= 100)).toBe(true);
  });

  it('builds a Stripe Checkout request tied to the buyer', () => {
    const form = stripeForm(checkoutParams('pack', 'supporterPack', 500, 'Ygdrassil: Supporter Pack', 'user-1')).join('&');
    expect(form).toContain('line_items%5B0%5D%5Bprice_data%5D%5Bunit_amount%5D=500');
    expect(form).toContain('line_items%5B0%5D%5Bprice_data%5D%5Bcurrency%5D=eur');
    expect(form).toContain('client_reference_id=user-1');
    expect(form).toContain('metadata%5Bid%5D=supporterPack');
    expect(stripeForm(checkoutParams('donation', '300', 300, 'Support', null)).join('&')).not.toContain('client_reference_id');
  });

  it('accepts only webhook calls signed with the secret, and not old ones', async () => {
    const secret = 'whsec_test';
    const body = '{"type":"checkout.session.completed"}';
    const t = 1_800_000_000;
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
    const sig = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(await validSignature(body, `t=${t},v1=${sig}`, secret, t * 1000)).toBe(true);
    expect(await validSignature(body + ' ', `t=${t},v1=${sig}`, secret, t * 1000)).toBe(false);
    expect(await validSignature(body, `t=${t},v1=${sig}`, 'whsec_other', t * 1000)).toBe(false);
    expect(await validSignature(body, `t=${t},v1=${sig}`, secret, (t + 3600) * 1000)).toBe(false);
  });

  it('only records the game\'s own payments, never other sales on the same Stripe account', () => {
    expect(stripeForm(checkoutParams('pack', 'supporterPack', 500, 'x', 'u')).join('&')).toContain('metadata%5Bgame%5D=ygdrassil');
    expect(isGameSession({ game: 'ygdrassil', kind: 'pack', id: 'supporterPack' })).toBe(true);
    expect(isGameSession({ game: 'ygdrassil', kind: 'donation', id: '500' })).toBe(true);
    expect(isGameSession(undefined)).toBe(false);
    expect(isGameSession({})).toBe(false);
    expect(isGameSession({ kind: 'pack', id: 'supporterPack' })).toBe(false);
    expect(isGameSession({ game: 'ygdrassil', kind: 'donation', id: '999' })).toBe(false);
    expect(isGameSession({ game: 'ygdrassil', kind: 'pack', id: 'nothing' })).toBe(false);
  });
});
