import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// GET /api/og?slug=...
//
// Social link previews for a client-rendered app.
//
// Dropping Next.js means the site serves one empty HTML shell and fills it in
// with JavaScript. Google copes. WhatsApp, Facebook, Telegram and iMessage do
// not — their preview crawlers never execute JavaScript, so a shared product
// link would show the shop name and nothing else.
//
// That matters more here than on most shops: a diaspora store grows by someone
// in Seattle dropping a link into a family WhatsApp group. A preview with no
// photograph and no price is a lost sale.
//
// So a rewrite in vercel.json sends crawler user-agents here, where they get a
// small HTML document carrying real Open Graph tags. Human visitors never
// touch this function.
// ---------------------------------------------------------------------------

interface VercelRequest {
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  send(body: string): void;
}

/** Minimal escaping — these values land inside HTML attributes. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function page(meta: {
  title: string;
  description: string;
  image?: string;
  url: string;
  price?: string;
  currency?: string;
}): string {
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(meta.url)}" />`,
    `<meta property="og:site_name" content="Eyob Traditional Store" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];

  if (meta.image) {
    tags.push(`<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
    tags.push(`<meta property="og:image:alt" content="${escapeHtml(meta.title)}" />`);
  }
  if (meta.price && meta.currency) {
    tags.push(`<meta property="product:price:amount" content="${escapeHtml(meta.price)}" />`);
    tags.push(`<meta property="product:price:currency" content="${escapeHtml(meta.currency)}" />`);
  }

  // A human who somehow lands here is redirected into the app rather than
  // left looking at a metadata stub.
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
${tags.join('\n')}
<meta http-equiv="refresh" content="0; url=${escapeHtml(meta.url)}" />
</head>
<body><p>Redirecting to <a href="${escapeHtml(meta.url)}">${escapeHtml(meta.title)}</a>…</p></body>
</html>`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = typeof req.query.slug === 'string' ? req.query.slug : '';
  const siteUrl = process.env.VITE_SITE_URL ?? '';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Crawlers re-fetch often; an hour of caching keeps this off the function
  // budget without making price edits take long to show.
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');

  const fallback = {
    title: 'Eyob Traditional Store',
    description: 'Handwoven Ethiopian traditional clothing, made in Addis Ababa and shipped worldwide.',
    url: `${siteUrl}/shop`,
  };

  if (!slug || !supabaseUrl || !anonKey) {
    res.status(200).send(page(fallback));
    return;
  }

  try {
    // The anon key is correct here: this reads only public catalogue data,
    // exactly what any visitor can already see.
    const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

    const { data: product } = await supabase
      .from('products')
      .select('name, description, slug, product_images(storage_key, position), product_prices(amount, currency, tier)')
      .eq('slug', slug)
      .maybeSingle();

    if (!product) {
      res.status(200).send(page(fallback));
      return;
    }

    const images = (product.product_images ?? []) as { storage_key: string; position: number }[];
    const image = images.sort((a, b) => a.position - b.position)[0]?.storage_key;

    // Previews quote the international USD price: the overwhelming majority of
    // shared links are seen abroad.
    const prices = (product.product_prices ?? []) as { amount: number; currency: string; tier: string }[];
    const usd = prices.find((p) => p.currency === 'USD' && p.tier === 'international');

    res.status(200).send(
      page({
        title: `${product.name} — Eyob Traditional Store`,
        description: (product.description as string)?.slice(0, 200) ?? fallback.description,
        image,
        url: `${siteUrl}/product/${product.slug}`,
        price: usd ? (usd.amount / 100).toFixed(2) : undefined,
        currency: usd ? 'USD' : undefined,
      }),
    );
  } catch (err) {
    console.error('og: falling back', err);
    res.status(200).send(page(fallback));
  }
}
