import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// POST /api/rates/refresh
//
// Fetches exchange rates and stores them, with the shop's margin applied.
//
// Why this is server-side: the margin is a commercial decision and has no
// business being visible in the browser bundle. It also means checkout reads
// rates from our own database rather than calling a third party mid-purchase,
// so a rate provider going down slows nothing and breaks nothing.
//
// Intended to run once a day on a schedule, and on demand from the admin.
// ---------------------------------------------------------------------------

/**
 * A free, key-less endpoint. If it is ever unavailable the stored rates simply
 * stay as they are, which is the correct failure: slightly stale prices are
 * vastly better than a shop that cannot quote.
 */
const RATE_SOURCE = 'https://open.er-api.com/v6/latest/USD';

/** Only the currencies the shop displays. */
const WANTED = ['EUR', 'GBP', 'CAD', 'AUD', 'ILS'] as const;

interface Req { method?: string }
interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('rates: missing environment configuration');
    res.status(500).json({ message: 'Not configured' });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // The margin is stored with the rest of the shop settings so the owner can
  // change it without a deploy.
  const { data: settings } = await supabase
    .from('store_settings').select('forex_margin_percent').eq('id', 1).maybeSingle();
  const margin = Number(settings?.forex_margin_percent ?? 2);

  let rates: Record<string, number>;
  try {
    const response = await fetch(RATE_SOURCE);
    if (!response.ok) throw new Error(`rate source returned ${response.status}`);
    const body = (await response.json()) as { result?: string; rates?: Record<string, number> };
    if (body.result !== 'success' || !body.rates) throw new Error('unexpected rate payload');
    rates = body.rates;
  } catch (err) {
    console.error('rates: fetch failed', err);
    // Deliberately not a 500 to the admin: the shop is fine, the rates are
    // merely not newer than they were.
    res.status(200).json({
      updated: 0,
      message: 'Could not reach the rate service. Existing rates are still in use.',
    });
    return;
  }

  const rows = WANTED
    .filter((currency) => typeof rates[currency] === 'number')
    .map((currency) => ({
      currency,
      // The margin makes the customer's price slightly higher, covering the gap
      // between the mid-market rate quoted here and what actually settles.
      rate_from_usd: Number((rates[currency] * (1 + margin / 100)).toFixed(6)),
      margin_percent: margin,
      fetched_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    res.status(200).json({ updated: 0, message: 'No usable rates were returned.' });
    return;
  }

  const { error } = await supabase.from('exchange_rates').upsert(rows);
  if (error) {
    console.error('rates: could not store', error.message);
    res.status(500).json({ message: 'Could not store the rates.' });
    return;
  }

  res.status(200).json({ updated: rows.length, marginPercent: margin });
}
