// ---------------------------------------------------------------------------
// Chapa integration primitives.
//
// VERIFY THIS SECTION AGAINST https://developer.chapa.co BEFORE GOING LIVE.
//
// Chapa's developer documentation was not reachable from the machine this was
// written on (blocked by an egress proxy), so the request shape below comes
// from their published SDKs rather than from the specification itself. The
// pieces most worth re-checking are marked CONFIRM.
//
// The logic is deliberately isolated here, with no network or database
// access, so it can be unit-tested and corrected in one place.
//
// Crypto is WebCrypto rather than node:crypto, and there is no Buffer, so this
// file runs unchanged on Vercel's Node runtime AND on Cloudflare Workers.
// Having one verified implementation matters more than the small convenience
// of the Node API: two copies of signature checking is two chances to get it
// subtly wrong.
// ---------------------------------------------------------------------------

export const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

/**
 * Chapa sends a signature header on every webhook. Two header names are in
 * circulation in their SDKs and community integrations:
 *
 *   x-chapa-signature  — HMAC-SHA256 of the raw request body
 *   Chapa-Signature    — reported in some integrations as an HMAC of the
 *                        secret itself rather than the body
 *
 * CONFIRM which your account actually sends, and what it signs.
 *
 * Until that is confirmed, we accept a request only if EITHER header carries a
 * correct HMAC of the raw body. That is strictly safer than trusting a header
 * whose meaning we are unsure of: an attacker still has to produce a valid
 * HMAC over the exact bytes they sent, which requires the secret.
 */
export const SIGNATURE_HEADERS = ['x-chapa-signature', 'chapa-signature'] as const;

/**
 * Constant-time comparison of two hex digests.
 *
 * A plain `===` on a signature leaks, through timing, how many leading
 * characters matched, which is enough to forge a signature one byte at a time.
 * This compares every character regardless of where the first difference is.
 *
 * The length check leaks only the length, which for a fixed-size digest tells
 * an attacker nothing they did not already know.
 */
function safeEqualHex(a: string, b: string): boolean {
  if (a.length === 0 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * HMAC-SHA256 of the raw body, as a lowercase hex digest.
 *
 * Async because WebCrypto is. That ripples out to the verify function and its
 * callers, which is a small price for running on both platforms.
 */
export async function computeSignature(rawBody: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  return toHex(signature);
}

/**
 * Verify a webhook.
 *
 * `rawBody` must be the EXACT bytes received. Parsing the JSON and
 * re-serialising it changes key order and whitespace, which changes the hash,
 * which fails every legitimate webhook. This is the single most common way to
 * break a webhook integration.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): Promise<{ valid: boolean; reason?: string }> {
  if (!secret) return { valid: false, reason: 'No webhook secret configured' };

  const expected = await computeSignature(rawBody, secret);

  for (const name of SIGNATURE_HEADERS) {
    const raw = headers[name] ?? headers[name.toLowerCase()];
    const received = Array.isArray(raw) ? raw[0] : raw;
    if (received && safeEqualHex(received.trim().toLowerCase(), expected)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: 'Signature did not match' };
}

export interface ChapaInitializeInput {
  amount: string;
  currency: string;
  email: string;
  firstName: string;
  lastName: string;
  txRef: string;
  /** Server-to-server confirmation. This is the one that decides truth. */
  callbackUrl: string;
  /** Where the customer's browser lands afterwards. Informational only. */
  returnUrl: string;
  title?: string;
  description?: string;
}

export interface ChapaInitializeResult {
  ok: boolean;
  checkoutUrl?: string;
  message?: string;
}

/**
 * Convert minor units to the major-unit decimal string Chapa expects.
 *
 * CONFIRM Chapa's expectations for three-decimal currencies (KWD, OMR, BHD)
 * if those are enabled on the account.
 */
export function toMajorUnits(amount: number, decimals: number): string {
  return (amount / 10 ** decimals).toFixed(decimals);
}

export async function initializeTransaction(
  input: ChapaInitializeInput,
  secretKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ChapaInitializeResult> {
  const response = await fetchImpl(`${CHAPA_BASE_URL}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      email: input.email,
      first_name: input.firstName,
      last_name: input.lastName,
      tx_ref: input.txRef,
      callback_url: input.callbackUrl,
      return_url: input.returnUrl,
      customization: {
        title: input.title ?? 'Eyob Traditional Store',
        description: input.description ?? 'Handwoven Ethiopian clothing',
      },
    }),
  });

  const body = (await response.json().catch(() => ({}))) as {
    status?: string;
    message?: string;
    data?: { checkout_url?: string };
  };

  if (!response.ok || body.status !== 'success' || !body.data?.checkout_url) {
    return {
      ok: false,
      message: body.message ?? `Chapa returned ${response.status}`,
    };
  }

  return { ok: true, checkoutUrl: body.data.checkout_url };
}

/**
 * Ask Chapa directly what happened to a transaction.
 *
 * Used as a fallback when a webhook is late or never arrives — polling on the
 * confirmation page is far better than leaving a paying customer looking at
 * "waiting for payment" indefinitely.
 */
export async function verifyTransaction(
  txRef: string,
  secretKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ paid: boolean; reference?: string; raw: unknown }> {
  const response = await fetchImpl(`${CHAPA_BASE_URL}/transaction/verify/${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });

  const body = (await response.json().catch(() => ({}))) as {
    status?: string;
    data?: { status?: string; reference?: string };
  };

  return {
    paid: body.status === 'success' && body.data?.status === 'success',
    reference: body.data?.reference,
    raw: body,
  };
}

/** Split a single name field into the two Chapa asks for. */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] || 'Customer', lastName: '-' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
