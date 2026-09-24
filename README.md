# Eyob Traditional Store

A made-to-measure atelier platform. Handwoven Ethiopian clothing, cut to each
customer's own measurements in Addis Ababa and delivered worldwide.

**This is not a shop with inventory.** A design is a template, not an object —
it can be ordered by fifty people and each garment is cut differently. Nothing
is ever in stock, nothing sells out, and two people ordering the same design at
once is entirely ordinary. Almost every design decision follows from that.

---

## Running it

```bash
npm install
npm run dev
```

That is the whole setup. **With no environment variables the app runs in demo
mode**: a seeded catalogue on the shop's real photographs, working orders,
verification and simulated payments. Nothing leaves the machine.

Demo mode is labelled wherever it could be mistaken for the real thing.

| Command | |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | 85 unit tests |
| `npm run typecheck` | TypeScript |
| `npm run cap:sync` | Build and sync the mobile app |

The admin is at `/#/admin`. In demo mode any email and password signs you in as
the owner.

---

## The shape of it

**React + Vite, no Next.js.** One bundle, deployed static to Vercel and wrapped
by Capacitor for mobile. Hash routing, because inside the native app the bundle
loads from the device filesystem where no server exists to resolve deep paths.
Clean URLs still work on the web — `index.html` redirects them into the hash
route, and `api/og.ts` serves link previews at the same paths so a design shared
on WhatsApp shows its photograph and price.

```
src/
  lib/            Domain logic — start here
    types.ts          The vocabulary everything agrees on
    pricing.ts        Currencies, uplift, and the anti-spoofing rule
    measurements.ts   Templates per garment, and the sanity checks
    checkout.ts       Reserve nothing, trust nothing, lock the rate
    permissions.ts    Roles as data
    images.ts         In-browser resizing
    data/             Adapters: mock for demo, Supabase for production
  pages/          Storefront, account, admin
  components/     Shared UI
  i18n/           Every string, ready for Amharic and Tigrinya
api/              Serverless: payments, rates, geo, notifications, previews
supabase/         Schema, RLS policies, transactional functions
docs/             Decisions, data model, launch checklist
```

---

## The decisions that matter

### The verification workflow is the product

A customer submits measurements; a tailor checks them; where they look wrong
the tailor messages the customer and edits the numbers; **the customer must
approve the change before anything is cut.**

That last step is not politeness. When someone says months later that a garment
does not fit, you open the order and show the exact numbers they approved, and
the date. The edit log is append-only in both adapters and protected by a
database trigger that refuses updates and deletes — an audit trail that staff
can quietly tidy is not an audit trail.

Waiting on a customer **pauses the promised date**. Without that, a slow reply
eats the shop's own deadline and triggers a refund under the late-delivery
guarantee that was never owed.

### Diaspora pricing cannot be spoofed

The shop charges international customers more, because delivery is baked into
the price. Since price depends on who you are, someone will try to game it:

> **The price tier is a function of the delivery address country.**

Not the IP address, not the displayed currency, not anything the browser sends.
IP geolocation picks a currency to *show* a first-time visitor and never touches
money. `create_order()` derives the tier server-side and recomputes every
amount from stored prices. Switching the display to birr from Toronto changes
what you look at, never what you pay.

### Two prices, one uplift, no rate feed in the browser

You type a birr price and a dollar price per design. Each region carries an
**uplift percentage** covering delivery there, so when a courier raises prices
you edit one number instead of three hundred designs.

Exchange rates are fetched daily by a server function, with your margin applied
there rather than in the browser, and stored. Checkout reads stored rates — a
rate provider going down slows nothing. **The rate is frozen onto the order at
placement**, so days of verification cannot move the price under a customer.

### Measurements point in two directions

The same fields mean different things depending on the garment, and the field
list itself differs — a bridal gown needs twelve, a shawl needs two. Stored in
centimetres always; inches are a display conversion, so there is one number in
the database and no drift when someone toggles units mid-form.

The guide is **one measurement per screen**, because that is how the task
actually happens: put the phone down, measure, pick the phone up, type. Values
are checked as they are entered — including the classic failure of a tape read
in inches and entered as centimetres, which would produce a garment half the
size it should be.

**These field lists came from research into what established Habesha sellers
collect, not from this workshop.** They are data, not code. Have your tailor
correct them.

### Images are processed in the browser

R2's free tier has no transformation service and paid resizing is out of budget,
so `<canvas>` does it at upload: four renditions in WebP where supported. A 4MB
phone photograph becomes roughly 300–500KB.

---

## Security

**Row Level Security is on all 24 tables.** A table with RLS enabled and no
policy denies everything, so a table added later and forgotten fails closed.

- Customers read only their own orders and measurements.
- Draft designs are invisible to the public.
- Raw payment payloads are staff-only.
- **Only a verified webhook can mark an order paid.** A browser landing on a
  success page proves nothing.
- `mark_order_paid` is not granted to `anon` or `authenticated` at all.
- Reviews can only be written by a customer whose order reached *delivered* and
  contained that design — checked in the policy, not the interface.

### Which keys are public

| Variable | Where | Public? |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Yes, by design |
| `VITE_SUPABASE_ANON_KEY` | Browser | Yes — RLS is the protection |
| `VITE_SITE_URL` | Browser | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | **No — bypasses all RLS** |
| `CHAPA_SECRET_KEY` | Server only | **No — can take payments** |
| `CHAPA_WEBHOOK_SECRET` | Server only | **No — can forge payments** |
| `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `R2_SECRET_ACCESS_KEY` | Server only | **No** |

Anything prefixed `VITE_` is compiled into the bundle and readable by anyone.
**Never put a secret behind that prefix.** Audited on every build:

```bash
grep -rn "VITE_" src/ | grep -v "SUPABASE_URL\|ANON_KEY\|SITE_URL\|CHAPA_PUBLIC"
```

### The admin login is not a security boundary

`src/lib/auth.ts` decides what the interface *shows*. Anyone can set a flag in
their own browser. What protects data is RLS checking `staff_users` on every
query.

---

## Going live

See **`docs/LAUNCH-CHECKLIST.md`** — written for the shop owner, not a
developer.

Two things gate a real launch:

1. **The measurement lists need the workshop's confirmation.**
2. **Chapa's settlement currencies need checking**, and the `CONFIRM` points in
   `api/_lib/chapa.ts` verifying against their live documentation, which was
   unreachable from the machine this was built on.

---

## Not built yet

Deliberately deferred, with reasons, in `docs/DECISIONS.md`: group orders,
Amharic and Tigrinya, the WhatsApp Business API, app store releases, promo
codes, and wholesale accounts.

**Known gap:** uploaded photographs are held as temporary browser links until
R2 credentials are wired in. They compress correctly; they do not yet persist.
