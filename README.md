# Eyob Traditional Store

Online shop for handwoven Ethiopian traditional clothing — habesha kemis,
netela, gabi, kuta, menswear, children's wear and accessories — selling to
customers inside Ethiopia and to the diaspora abroad.

One React codebase serves the web store and, through Capacitor, the iOS and
Android apps.

---

## Running it

```bash
npm install
npm run dev
```

That is the whole setup. **With no environment variables at all the app runs in
demo mode**: a seeded catalogue of 20 pieces, working cart and checkout, and
simulated payments. Nothing leaves the machine and no accounts are needed.

Demo mode is labelled in the interface everywhere it could be mistaken for the
real thing.

| Command | What it does |
|---|---|
| `npm run dev` | Development server on :5173 |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit tests |
| `npm run typecheck` | TypeScript, no emit |
| `npm run cap:sync` | Build and sync into the native projects |

The admin area is at `/#/admin`. In demo mode any email and any password of
four characters or more will sign you in.

---

## How it is put together

**React + Vite, no Next.js.** One bundle, deployed static to Vercel and wrapped
by Capacitor for mobile. Routing is hash-based (`/#/shop`) because inside the
native app the bundle loads from the device filesystem, where no server exists
to resolve deep paths.

The cost of dropping server rendering is that link-preview crawlers — WhatsApp,
Facebook, Telegram — cannot read a JavaScript-rendered page. `api/og.ts` covers
that: a rewrite in `vercel.json` sends those crawlers to a small function that
returns real Open Graph tags, so a shared product link shows the photograph and
the price. Humans never hit it.

```
src/
  lib/          Domain logic. Start here.
    types.ts        The shapes everything else agrees on
    pricing.ts      Currencies, and the diaspora pricing rule
    measurements.ts The seven measurements, and which direction they point
    shipping.ts     Zones, flat rates, and the provider interface
    checkout.ts     Reserve-then-write, with the client never trusted
    images.ts       In-browser resizing and compression
    data/           Adapters: mock for demo, Supabase for production
  pages/        Storefront and admin screens
  components/   Shared UI
api/            Serverless functions (Chapa, link previews)
supabase/       Schema, RLS policies, transactional functions
```

---

## The decisions worth knowing

### Ready-made pieces are one of a kind

Each ready-made garment physically exists, once. There is no size matrix and no
stock count — a product is `available`, `reserved`, `sold` or `archived`.

This makes the concurrency problem *more* important, not less: every sale is a
last-item sale. `reserve_products()` in the schema flips `available` to
`reserved` with a single atomic conditional `UPDATE`, so of two customers
racing for the same kemis, exactly one wins and the other is told plainly what
happened.

Made-to-order pieces never sell out. They carry a lead time and collect the
customer's measurements instead.

### Measurements point in two directions

The same seven fields (bust, waist, hips, shoulder-to-shoulder,
shoulder-to-waist, arm length, total length) are used for both kinds, but they
describe different things:

- **Ready-made** → the measurements of *the garment*
- **Made to order** → the measurements of *the wearer*

Sellers in this category consistently report that customers reading a body
chart as a garment chart is the main cause of fit returns, so the interface
labels which one is on screen every time it shows them. Stored in centimetres;
inches are a display conversion only.

### Prices are typed by hand, never converted

There is no exchange-rate feed anywhere in this system, by explicit decision.
Every price in every currency is entered in the admin. No rate API to break, no
stale cache, and prices that read like prices — $145, not $137.42.

The cost is data entry, and it is real: 12 currencies × 2 tiers per product.

### Diaspora customers pay more, and it cannot be spoofed

The shop charges international customers a higher tier. Since price depends on
who you are, someone will try to game it, so the rule is narrow:

> **The price tier is a function of the shipping destination country.**

Not the IP address, not a query parameter, not anything in localStorage. IP
geolocation picks a *display currency* for a first-time visitor and never
touches money. `create_order()` recomputes the tier from the saved shipping
address before writing a single amount, so a client that lies is corrected
rather than obeyed.

Checkout tells the customer plainly when their destination changes the prices
they were shown, rather than quietly altering the number.

### Shipping is flat rates, deliberately

Live courier rates (DHL, FedEx, Aramex) need a commercial account with
negotiated rates before credentials are issued, and Ethiopian Postal Service
has no public API. None of that exists yet.

So rates are per-zone, set by the owner in the admin, behind a
`ShippingRateProvider` interface. When a carrier is chosen, write one adapter,
register it, and checkout does not change.

### Images are processed in the browser

R2's free tier has no transformation service and paid resizing is out of
budget, so `<canvas>` does it at upload time: four renditions (thumb, listing,
detail, zoom) in WebP where supported. A 4 MB phone photo becomes roughly
300–500 KB in total. At 50 products × 3 photos that sits comfortably inside the
10 GB allowance; the originals alone would not.

---

## Security

**Row Level Security is on every table.** With RLS enabled and no policy, a
table denies everything through the anon key — so a table added later and
forgotten fails closed.

- Customers read their own orders only. A guest needs the reference **and** the
  matching email together; a guessed reference alone returns nothing.
- Nobody can write an order directly. `create_order()` computes every amount
  from the database.
- **Nothing but the verified webhook can mark an order paid.** A browser
  redirect to a success page proves nothing — anyone can visit that URL.
- `mark_order_paid()` is not granted to `anon` or `authenticated` at all.

### Which keys are public, which are secret

| Variable | Where it lives | Public? |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser bundle | Yes — public by design |
| `VITE_SUPABASE_ANON_KEY` | Browser bundle | Yes — RLS is what protects data |
| `VITE_CHAPA_PUBLIC_KEY` | Browser bundle | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Serverless only | **No — bypasses all RLS** |
| `CHAPA_SECRET_KEY` | Serverless only | **No — can take payments** |
| `CHAPA_WEBHOOK_SECRET` | Serverless only | **No — can forge payments** |
| `R2_SECRET_ACCESS_KEY` | Serverless only | **No** |

Anything prefixed `VITE_` is compiled into the bundle and readable by anyone
who opens the site. **Never put a secret behind that prefix.**

### The admin login is not a security boundary

`src/lib/adminAuth.ts` controls what the admin UI *shows*. Anyone can set a
flag in their own browser. What actually protects admin data is RLS checking
membership of `admin_users` on every query. Hiding a button is a convenience,
not a defence.

---

## Going live

### 1. Supabase

Create a project, run `supabase/schema.sql` in the SQL editor, then make
yourself an admin:

```sql
insert into admin_users (user_id, role)
values ('<your-auth-user-id>', 'owner');
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The app leaves demo mode
automatically.

Schedule reservation cleanup so abandoned checkouts release their stock:

```sql
select cron.schedule('expire-reservations', '*/15 * * * *',
  $$select expire_stale_reservations(30)$$);
```

### 2. Chapa — read this before trusting the integration

**Chapa's developer documentation was not reachable from the machine this was
built on** (blocked by an egress proxy), so `api/_lib/chapa.ts` follows their
published SDKs rather than the specification. Points marked `CONFIRM` in that
file need checking against <https://developer.chapa.co> before real money moves:

- The exact webhook signature header, and what it signs. Two names are in
  circulation (`x-chapa-signature`, `Chapa-Signature`) and reports differ on
  whether one signs the body or the secret. We currently accept either header
  **only** when it carries a correct HMAC of the raw body — safer than trusting
  a header whose meaning is unconfirmed, but worth pinning down.
- Which currencies your account may charge in.
- The expected amount format for three-decimal currencies (KWD, OMR, BHD).

Fee context for pricing decisions: roughly 3.5% on local transactions and 1% on
international ones. **Verify current rates against Chapa's own pricing page** —
these are from the brief, not from their API.

Then: set `CHAPA_SECRET_KEY` and `CHAPA_WEBHOOK_SECRET`, point the webhook at
`https://yourdomain/api/chapa/webhook`, and test with their test keys first.

The webhook handles a bad signature (401), a duplicate delivery (200, no
change — a non-2xx would make Chapa retry forever), an unknown reference, a
failed payment (releases the stock), and a late arrival (no time limit).

### 3. Mobile

```bash
npm i -D @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npm run cap:sync
```

### 4. Before the first deploy

- [ ] `grep -r "VITE_" src/` — confirm no secret is behind that prefix
- [ ] Replace every seeded photograph with the shop's own
- [ ] Set real shipping rates in the admin
- [ ] Confirm the Chapa `CONFIRM` points above
- [ ] Test a real payment end to end with a small amount

---

## Not built yet

Deliberately out of scope for the first version, in rough priority order:

- **Amharic and Tigrinya.** English only for now. Roughly doubles the text work
  and needs font handling.
- **Live courier rates.** Blocked on choosing a carrier and opening an account.
- **WhatsApp order updates.** The Business API needs Meta verification,
  an approved number and template approval, and costs money per conversation.
  A `wa.me` support link stands in; Telegram is the free instant channel.
- **Customer accounts.** Guest checkout plus reference-and-email lookup covers
  the need; saved addresses and order history need Supabase Auth wired up.
- **R2 upload wiring.** Processing is done; the PUT to the bucket needs
  credentials.
- **Email sending.** Templates and a Resend key.
- **Review submission.** Reviews display; customers cannot yet leave one.
