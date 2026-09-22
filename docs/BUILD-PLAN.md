# Build Plan — Eyob Traditional Store

**Status:** proposed, awaiting sign-off
**Companion document:** `docs/ROUND-2-QUESTIONS.txt` — read that first

This plan assumes the answers I expect from Round 2. Every assumption is
labelled **ASSUMES**, and each one is a place the plan changes if you answer
differently.

---

## 1. What we are actually building

A made-to-measure atelier platform. Not a shop with inventory.

The distinction drives everything below. A customer browses **designs**, submits
**their own body measurements**, a **human expert verifies** those measurements,
and only then does a garment get made. Nothing is ever "in stock" and nothing
ever "sells out".

Three applications, one codebase:

| Surface | Who uses it | Priority |
|---|---|---|
| Customer storefront (web) | Buyers in Ethiopia and abroad | 1 |
| Admin portal (mobile-first) | You and your staff, on phones | 1 |
| Mobile app (iOS + Android) | Same customers, from an app store | 3 |

---

## 2. The three hard parts

Most of this project is ordinary work. Three pieces are genuinely difficult, and
they are where the risk lives.

### 2.1 Measurement verification — the core of the business

This is not a form. It is a workflow with a human in the middle, and it is the
thing that makes your business different from a dropshipper.

```
Customer submits measurements
        │
        ▼
Automatic sanity checks  ──── obviously impossible? ───► flagged immediately
        │                     (sleeve longer than dress)
        ▼
Verification queue (staff)
        │
        ├─ looks right ──────────────────────► verified ──► production
        │
        └─ looks wrong
                │
                ▼
        Staff calls / WhatsApps customer
                │
                ▼
        Staff edits the numbers
                │
                ▼
        Customer confirms the change  ◄── protects you in a dispute
                │
                ▼
             verified ──► production
```

**Every change is recorded**: who, when, old value, new value, why. When a
customer says "it doesn't fit, you made it wrong", you open the order and show
the exact numbers used and the date the customer approved them. That audit trail
is worth building properly the first time.

**Open question that reshapes this:** does payment happen before or after
verification? (Q1.7)

### 2.2 Currency — where money quietly leaks

Six things have to be right at once:

1. Detect the visitor's country (free — the hosting platform tells us)
2. Map country → currency, with your permitted list
3. Fetch live forex rates, cached — **never** call a rate API per page view
4. Convert and round to prices that look like prices
5. **Lock the rate when the order is placed** so it can't move under the customer
6. Charge through Chapa in a currency Chapa actually supports (Q1.5)

**The security rule, stated once:** the *displayed* currency is chosen by IP and
the customer can change it freely. The *price tier* — local Ethiopian vs
international — is decided by the **delivery address**, server-side, and can
never be changed by the browser. Switching the display to birr from Toronto
changes what you look at, never what you pay.

### 2.3 Permissions — six roles, enforced in the database

Not UI hiding. Anyone can edit their own browser. Every rule is enforced in
Postgres with Row Level Security, so a Measurement Specialist who tampers with
the app still cannot read a single price.

---

## 3. Data model in plain language

Twelve tables. Named so you can read them.

**designs** — what you sell. A template, not an object. Name, description,
category, fabric, colour, embroidery style, occasion, photos, production days,
and which measurement template it needs. Never has a stock count.

**design_prices** — two rows per design: a local price in ETB and an
international price in USD. Everything else is converted live.
*ASSUMES Q1.2 is confirmed.*

**categories** — editable by admin, as you asked.

**measurement_templates** — which fields a garment type needs. A netela needs
one; a structured bridal gown needs a dozen. *Depends entirely on Q1.9.*

**customer_measurements** — a saved set belonging to a customer, reusable across
orders. Always centimetres in the database; inches are display only.

**measurement_reviews** — the verification queue. Status, assigned staff member,
call attempts, notes, and the full before/after history of every edit.

**orders** — who, which design, which measurement set, the locked exchange rate,
the price they agreed to, delivery or pickup, promised date.

**order_events** — an append-only timeline. Every status change, every note.
This is what the customer sees as "where is my order" and what you consult in a
dispute.

**payments** — Chapa transaction reference, amount, currency, status, and the
raw webhook payload stored verbatim for audit.

**users / roles / permissions** — staff accounts and what each may do.

**reviews** — customer reviews, optionally with photos.

**exchange_rates** — cached rates with timestamps, so we never depend on a rate
API being up at the moment someone checks out.

---

## 4. Milestones

Each milestone ends with something you can open on your phone and use. I check
in at every one.

Estimates assume focused work and no long gaps waiting for answers.

### M0 — Foundations (~half a day)
Strip the wrong assumptions out of the prototype. Move your 41 photos out of the
repository root into proper storage. Set up the text system so Amharic and
Tigrinya can be added later without touching code.

**You get:** a clean base and your photos organised.

### M1 — Identity and permissions (~2 days)
Customer accounts, staff accounts, the six roles, and database-level enforcement
of every one of them.

**You get:** you can create a staff member, give them a role, log in as them,
and see that they genuinely cannot reach what they shouldn't.
**Blocked by:** Q1.11, Q1.12

### M2 — Designs catalogue and admin (~3 days)
Browse, filter, search. Admin can add a design, upload photos, set both prices,
set production days. Photos are compressed automatically on upload.

**You get:** your real catalogue, entered by you, live on a real site.
**Blocked by:** Q1.13, Q3.2, Q3.3

### M3 — Measurements and the interactive guide (~4 days)
The animated measuring guide. Measurement capture per garment type. Saved
measurement sets. Automatic sanity checks.

**You get:** the thing that reduces your phone calls. The piece I most want to
get right.
**Blocked by:** Q1.9, Q2.2

### M4 — The verification queue (~3 days)
The screen your specialist lives in. Review, edit, call-attempt logging,
customer confirmation of changes, full audit trail.

**You get:** your actual daily workflow, working.
**Blocked by:** Q1.7, Q1.8, Q1.10

### M5 — Currency engine (~2 days)
IP country detection, forex fetching and caching, rate locking at order time,
manual override with the price-tier rule enforced server-side.

**You get:** a Londoner sees GBP, an Ethiopian sees ETB, and nobody can cheat.
**Blocked by:** Q1.1, Q1.2, Q1.3, Q1.4, Q1.6

### M6 — Orders and checkout (~3 days)
Cart, delivery-or-pickup, order placement, the customer's order timeline,
production stage tracking.

**You get:** end-to-end ordering, minus payment.
**Blocked by:** Q1.14, Q2.7, Q2.8

### M7 — Chapa payments (~2-3 days)
Hosted checkout, webhook verification, every failure state handled explicitly,
full audit record. Tested against Chapa's test keys before touching real money.

**You get:** real payments.
**Blocked by:** Q1.5, Q1.7, Q2.3

### M8 — Notifications (~2 days)
Order confirmations, status updates, verification requests. Email plus Telegram,
with WhatsApp click-to-chat. Owner alerts on every order.

**Blocked by:** Q2.4, Q2.5

### M9 — Reviews and wishlist (~1.5 days)
Verified-buyer reviews with optional photos, moderation, wishlist.
**Blocked by:** Q2.9, Q3.6

### M10 — Mobile apps (~2-3 days, plus store review time)
Package for iOS and Android. Store listings, icons, screenshots. Submission.

**Note:** Apple's review takes days and routinely rejects first submissions.
This is calendar time you cannot compress.
**Blocked by:** Q2.10 and the developer account fees

### M11 — Hardening and launch (~2 days)
Full security review, load check on a slow connection, a dry run of a complete
order, and a launch checklist you can follow yourself.

---

## 5. Honest timeline

**Roughly 5 to 6 weeks of focused work** for everything through M11.

A usable shop — browse, measure, verify, order, pay — is **M0 through M7,
roughly 3 weeks**. I'd suggest launching there, taking real orders, and building
M8–M11 while money is already coming in.

The prototype took two days because it made assumptions. This is the real thing,
and the measurement workflow alone is more complex than the entire prototype.

**What will actually slow us down** is not coding. It is the wait for answers,
Apple's review queue, WhatsApp Business verification, and getting 100–300
designs photographed and entered. Start that last one now — it's the longest
pole and it doesn't need me.

---

## 6. What this costs to run

| Service | Free tier | When you'd pay |
|---|---|---|
| Hosting (Vercel) | Generous | Unlikely at this scale |
| Database (Supabase) | 500MB, 50k users | Comfortable for years |
| Photo storage (R2) | 10GB | ~300 designs × 4 photos fits fine |
| Forex rates | Free tier available | Only at high volume |
| Email (Resend) | 3,000/month | Well beyond your volume |
| Telegram | Free | Never |
| **Domain** | — | **~$12/year — needed** |
| **Apple Developer** | — | **$99/year — only if you want App Store** |
| **Google Play** | — | **$25 once — only if you want Play Store** |
| WhatsApp Business API | — | Per conversation, if you go that route |

Everything essential stays free except the domain. The app stores are optional
and can wait.

---

## 7. What I need from you, in order

1. **Answer the 14 blockers** in `ROUND-2-QUESTIONS.txt`
2. **Tell me what the 41 photos are** — or say "build the admin first and I'll
   upload them myself", which is probably faster for you anyway
3. **Check your Chapa dashboard** for which currencies you can actually receive
4. **Decide on the domain**
5. **Start photographing and listing designs** — the longest pole, and entirely
   in your hands

Once the blockers are answered I'll write the data model in plain language for
sign-off, then start on M0.

**Nothing gets coded until you've signed off on the data model and this plan.**
