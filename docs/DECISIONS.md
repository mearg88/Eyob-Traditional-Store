# Decision Record

Every decision from the Round 2 interview, with the reasoning. This is the
authoritative record — where this file and any older document disagree, this
file wins.

**One item is still open:** which currencies Chapa can actually receive
(you're checking your dashboard). Everything else is settled.

---

## The business

You run a **made-to-measure atelier**, not a shop. You sell **designs** —
templates that are cut to each customer's body. Nothing is ever in stock,
nothing sells out, and a design can be ordered any number of times.

| Decision | Choice |
|---|---|
| Inventory | None. Designs are templates, ordered on demand |
| Shop | Physical shop and workshop in Addis (placeholder address for now) |
| Staff roles | Owner and Staff — but stored as data so more can be added without a rewrite |
| Customer accounts | Required, email and password |
| Wholesale | Offline entirely. The site is retail-only, fixed-price |
| Negotiation | None on the site. Wholesale only, handled by you directly |

## Money

| Decision | Choice |
|---|---|
| Local price | Typed by you in ETB, independently |
| International price | Typed by you in USD |
| Country differences | One USD price plus an **uplift percentage per country group** you set once |
| Forex | Free rate API, refreshed daily, **+2% margin**, plus a manual refresh button |
| Rate locking | **Locked when the order is placed.** The price they saw is the price they pay |
| Display currency | Detected by IP; customer can change it freely |
| Price tier | Decided by the **delivery address**, server-side. Cannot be changed by the browser |
| Permitted currencies | ETB, USD, EUR (all EU + Switzerland + Norway), GBP, CAD, AUD, ILS. Gulf countries see USD. Everywhere else USD |
| Tax | Excluded, with a clear disclaimer that duties are the buyer's responsibility |
| Delivery cost | Included in the price. No shipping step, no shipping line at checkout |
| Pickup | Offered at a **lower price** (you set the discount) |
| Promo codes | Phase 2 |

**The anti-spoofing rule, stated once:** switching the displayed currency
changes only what you *look at*. The local-versus-international price is
derived from where the parcel is going, on the server. Without this, one VPN
and a dropdown would let anyone buy at Addis prices — and your international
price has delivery baked into it, so every such sale would lose money.

## Orders

| Decision | Choice |
|---|---|
| Payment timing | **In full when the order is placed.** One payment flow |
| Measurements | Collected during checkout, before payment |
| Verification | After payment, by a human |
| Lead time | Production days (per design) + delivery days (per country group) |
| Promised date | **Pauses** while waiting on the customer, so a slow customer can't run down your clock |
| Refund guarantee | Customer claims it, you approve. Not automatic |
| Group orders | After launch |
| Customisation | Structured options with set prices, plus free-text notes |
| Free-text requests | **Notes only, no price change.** Discussed on the verification contact you're already making |

## Measurement verification — the core workflow

| Decision | Choice |
|---|---|
| Who measures | The customer, at home, with someone helping |
| Fields | **Different set per garment type** |
| Units | Stored in centimetres always. Inches for display only |
| Staff edits | Allowed, fully audited |
| Customer confirmation | **Required** before production starts |
| First contact | **Message first** (WhatsApp/email), phone only if needed |
| Guide | Animated, step by step, with common-mistake warnings |

**Why customer confirmation is non-negotiable:** when someone says "it doesn't
fit, you made it wrong", you open the order and show the exact numbers they
approved and the date they approved them. On garments at this price, that
record is the difference between a conversation and a refund.

## Communication

| Decision | Choice |
|---|---|
| Customer emails | Resend, free tier |
| Owner alerts | Telegram — every order, payment, and measurement awaiting review |
| WhatsApp | Click-to-chat button now. Business API is a later decision |
| Language | English, built so Amharic and Tigrinya drop in without code changes |

## Design and scope

| Decision | Choice |
|---|---|
| Visual direction | **Etsy's trust signals, a fashion house's looks.** Generous space, very large images, restrained type, Ethiopian pattern as a sparing signature |
| Categories | Bridal & Wedding first, then Habesha Kemis, Netela & Shash, Gabi & Shemma, Men's Traditional, Children's Wear, Accessories |
| Filters | Category, price, colour, fabric, occasion, and lead time ("ready within X weeks") |
| Mobile | Installable web app now. App stores later, from the same code |
| Catalogue entry | You upload and name designs yourself through the admin |
| Priority | **Fastest path to a first real order** |
| Codebase | Keep the prototype's foundations, rewrite the business logic |

**On the design direction:** you cited Etsy, but your photography is couture —
studio lighting, a gold-embroidered ballgown with horses. Etsy is a busy
marketplace and would make that work look cheaper than it is. We took Etsy's
*trust* (visible reviews, clear dates, obvious returns) and dropped its *look*.

## In version one

Catalogue · measurements · verification · payment · reviews · wishlist ·
progress photos

## Deferred

Group orders · quote path · promo codes · app stores · Amharic and Tigrinya ·
WhatsApp Business API · wholesale accounts

---

## Open

**Chapa currencies.** My expectation is that Chapa settles in ETB and charges
international cards in USD — meaning a Londoner sees £190 as an indicative
price and is charged the dollar equivalent, with their bank converting. That is
normal and legal, but it must be stated plainly at checkout or it produces
chargebacks from people who felt misled.

If your dashboard says otherwise, the checkout copy changes. Nothing structural
does.
