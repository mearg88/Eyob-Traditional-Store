// ---------------------------------------------------------------------------
// GET /api/geo
//
// Returns the visitor's country, for guessing which currency to display.
//
// Both Vercel and Cloudflare put this in a request header for free, so there
// is no third-party geolocation service, no API key and no per-lookup cost.
//
// This value NEVER decides a price. It picks what a first-time visitor sees
// before they have chosen for themselves, and nothing more — the tier that
// decides what someone pays comes from their delivery address, server-side.
// See src/lib/pricing.ts.
// ---------------------------------------------------------------------------

interface Req {
  headers: Record<string, string | string[] | undefined>;
}

interface Res {
  status(code: number): Res;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
}

function header(headers: Req['headers'], name: string): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export default function handler(req: Req, res: Res) {
  const country =
    header(req.headers, 'x-vercel-ip-country') ??   // Vercel
    header(req.headers, 'cf-ipcountry') ??          // Cloudflare
    header(req.headers, 'x-country-code');          // some proxies

  // Never cached at the edge: two visitors in different countries must not
  // share a response.
  res.setHeader('Cache-Control', 'private, no-store');
  res.status(200).json({ country: country ?? null });
}
