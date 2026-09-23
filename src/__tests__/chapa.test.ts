import { describe, expect, it } from 'vitest';
import {
  computeSignature, splitName, toMajorUnits, verifyWebhookSignature,
} from '../../api/_lib/chapa';

const SECRET = 'test-webhook-secret';

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ tx_ref: 'ETS-ABC123-9f2a', status: 'success', amount: '145.00' });

  it('accepts a correct signature on x-chapa-signature', async () => {
    const signature = await computeSignature(body, SECRET);
    expect((await verifyWebhookSignature(body, { 'x-chapa-signature': signature }, SECRET)).valid).toBe(true);
  });

  it('accepts a correct signature on Chapa-Signature', async () => {
    const signature = await computeSignature(body, SECRET);
    expect((await verifyWebhookSignature(body, { 'chapa-signature': signature }, SECRET)).valid).toBe(true);
  });

  it('rejects a forged signature', async () => {
    expect((await verifyWebhookSignature(body, { 'x-chapa-signature': 'a'.repeat(64) }, SECRET)).valid).toBe(false);
  });

  it('rejects a signature made with a different secret', async () => {
    const signature = await computeSignature(body, 'wrong-secret');
    expect((await verifyWebhookSignature(body, { 'x-chapa-signature': signature }, SECRET)).valid).toBe(false);
  });

  it('rejects when no signature header is present', async () => {
    expect((await verifyWebhookSignature(body, {}, SECRET)).valid).toBe(false);
  });

  it('rejects when no secret is configured, rather than accepting everything', async () => {
    const signature = await computeSignature(body, SECRET);
    expect((await verifyWebhookSignature(body, { 'x-chapa-signature': signature }, '')).valid).toBe(false);
  });

  it('rejects a body that was modified after signing', async () => {
    const signature = await computeSignature(body, SECRET);
    const tampered = body.replace('145.00', '1.00');
    expect((await verifyWebhookSignature(tampered, { 'x-chapa-signature': signature }, SECRET)).valid).toBe(false);
  });

  it('rejects a re-serialised body, which is why raw bytes must be preserved', async () => {
    const signature = await computeSignature(body, SECRET);
    // Same data, different key order — exactly what JSON.parse + stringify does.
    const reserialised = JSON.stringify({ status: 'success', amount: '145.00', tx_ref: 'ETS-ABC123-9f2a' });
    expect((await verifyWebhookSignature(reserialised, { 'x-chapa-signature': signature }, SECRET)).valid).toBe(false);
  });

  it('is case-insensitive about the hex digest', async () => {
    const signature = (await computeSignature(body, SECRET)).toUpperCase();
    expect((await verifyWebhookSignature(body, { 'x-chapa-signature': signature }, SECRET)).valid).toBe(true);
  });

  it('does not throw on a malformed signature of the wrong length', async () => {
    await expect(
      verifyWebhookSignature(body, { 'x-chapa-signature': 'zz' }, SECRET),
    ).resolves.toEqual({ valid: false, reason: 'Signature did not match' });
  });
});

describe('toMajorUnits', () => {
  it('converts two-decimal currencies', () => {
    expect(toMajorUnits(14500, 2)).toBe('145.00');
  });

  it('converts three-decimal currencies', () => {
    expect(toMajorUnits(44500, 3)).toBe('44.500');
  });

  it('keeps trailing zeros, which Chapa expects as a decimal string', () => {
    expect(toMajorUnits(10000, 2)).toBe('100.00');
  });
});

describe('splitName', () => {
  it('splits a two-part name', () => {
    expect(splitName('Hanna Tesfaye')).toEqual({ firstName: 'Hanna', lastName: 'Tesfaye' });
  });

  it('keeps everything after the first word as the surname', () => {
    expect(splitName('Selam Girma Abebe')).toEqual({ firstName: 'Selam', lastName: 'Girma Abebe' });
  });

  it('substitutes a placeholder surname for a single name', () => {
    expect(splitName('Eyob')).toEqual({ firstName: 'Eyob', lastName: '-' });
  });
});
