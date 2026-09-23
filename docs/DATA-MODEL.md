# Data Model — for your sign-off

Plain language, no jargon. **Nothing gets coded until you've read this and said
yes.** If a table below doesn't match how your business actually works, that's
the cheapest possible moment to say so.

---

## 1. What you sell

### designs
One row per design you offer. A design is a **template**, not an object — it
can be ordered by fifty people and each one is cut differently.

Holds: name, description, category, fabric, colour, embroidery style, occasion,
gender, **production days**, and which measurement template applies.

**No stock count. No availability. Nothing ever sells out.** This is the single
biggest difference from the prototype.

### design_photos
Photos per design, in an order you choose by dragging. Each upload is
automatically compressed into four sizes so a customer on a 3G phone in Addis
downloads a small one and a customer on a laptop gets the large one.

### design_options
The customisations that are common enough to be worth pricing: sleeve length,
border colour, fabric choice. Each option has a **price effect** you set, so the
total is always calculable and checkout never stalls.

Anything outside these goes in a free-text note — captured, shown to your team,
but **no price change**, discussed on the contact you're already making to
verify measurements.

### categories
Editable by you. Starting set: Bridal & Wedding, Habesha Kemis, Netela & Shash,
Gabi & Shemma, Men's Traditional, Children's Wear, Accessories.

---

## 2. Prices

### design_prices
Exactly two rows per design:
- **local** — an amount in ETB, typed by you
- **international** — an amount in USD, typed by you

That's all you maintain. Everything a customer sees in GBP, EUR, CAD, AUD or
ILS is derived from the USD figure.

### country_groups
Each group carries an **uplift percentage** and a **delivery estimate**.

| Group | Uplift | Delivery |
|---|---|---|
| Ethiopia | — (uses local price) | you set |
| USA & Canada | you set | you set |
| Europe & UK | you set | you set |
| Australia & NZ | you set | you set |
| Rest of world | you set | you set |

When couriers raise prices you edit **one uplift number**, not three hundred
designs. This is the answer to "how does one price cover both London and
Sydney".

### exchange_rates
Rates fetched once a day and stored. Checkout reads from this table, never from
the internet — so a rate service being down cannot stop you taking money.

Each row keeps the rate, the timestamp, and your 2% margin applied.

**How a price is calculated, in order:**

```
1. Delivery country  →  local or international?         (server decides)
2. Local?        →  ETB price. Done.
3. International →  USD price
                 →  × country uplift
                 →  + chosen options
                 →  − pickup discount, if collecting
                 →  × stored exchange rate (incl. 2% margin)
                 →  round to a number that looks like a price
4. Order placed  →  the rate used is SAVED onto the order, and never recalculated
```

Step 4 is why a customer who orders Monday and pays Monday cannot be surprised
by Thursday's rate.

---

## 3. Measurements — the heart of it

### measurement_templates
Which fields a garment type needs. A netela needs almost nothing; a structured
bridal gown needs a dozen.

Based on what established Habesha sellers actually collect, my proposed
starting point — **please correct this, it's your workshop's language, not
mine**:

**Standard (kemis, everyday dresses)**
shoulder to shoulder · bust · waist · hips · shoulder to waist ·
sleeve length (shoulder to wrist) · total length (shoulder to hem)

**Bridal & structured gowns** — the standard set, plus:
underbust · armhole · bicep · nape to waist · hollow to hem

**Netela, shash, gabi, kuta**
length · width (these are wraps; body measurements barely matter)

**Men's traditional**
shoulder to shoulder · chest · waist · sleeve length · shirt length ·
trouser waist · inseam

**Children's**
the standard set, plus age, since parents often know that and little else

I've also copied a good idea from other sellers: a fallback where a customer who
gives up measuring can submit **height and usual dress size** instead, flagged
for your specialist to follow up. Better than an abandoned order.

### customer_measurement_sets
A saved set belonging to a customer, reusable on later orders. Their second
order takes thirty seconds instead of twenty minutes — which is a genuine
reason to come back.

Always centimetres. Inches are a display conversion only, so there is one
number in the database and no rounding drift.

### measurement_reviews
**Your specialist's daily work queue.** One row per submitted set.

Holds: status, who it's assigned to, contact attempts (what channel, when,
outcome), notes, and whether the customer has confirmed any changes.

```
submitted
   │
   ├─ automatic checks: anything impossible? (sleeve longer than the dress)
   │
   ▼
under review  ──── looks right ──────────► verified ──► production
   │
   └─ looks wrong
         │
         ▼
   contact customer (message first, phone if needed)
         │
         ▼
   staff edits the numbers
         │
         ▼
   customer confirms  ◄── production CANNOT start until they do
         │
         ▼
      verified ──► production
```

### measurement_edits
Append-only. Every change: who, when, which field, old value, new value, why.

Nothing is ever overwritten. This is your evidence in a fit dispute, and it is
the reason to build it properly the first time rather than bolt it on after the
first argument.

---

## 4. Orders

### orders
Who, what, the locked exchange rate, the price agreed, delivery or pickup, the
promised date, and the current stage.

**The promised date pauses** while you're waiting for the customer to confirm
measurements. A customer who takes five days to reply cannot run down the clock
on your own refund guarantee.

### order_items
One per design ordered: a snapshot of the name and price at the time, the
chosen options, the measurement set used, and any free-text request.

**Snapshot** matters — renaming or repricing a design next month must never
rewrite what someone was actually sold.

### order_events
An append-only timeline. Every stage change, every note.

This is both what the customer watches and what you consult when something is
disputed.

**Stages**, visible to the customer:
measurements verified → fabric cut → sewing → embroidery → finishing →
quality check → ready → dispatched → delivered

Your workshop can attach a **progress photo** at any stage. For a diaspora
customer who has never seen your shop, watching their own dress being made is
the most persuasive thing you can show them.

### refund_claims
The customer claims a late delivery; you approve or decline; the reason is
recorded. Deliberately **not** automatic — a courier marking a parcel late when
it arrived on time would otherwise trigger refunds you never owed.

---

## 5. Payments

### payments
Chapa transaction reference, amount, currency, status, timestamps, and the
**raw webhook payload stored word for word**.

When a customer disputes a charge four months later, that stored payload is the
only record of what the payment provider actually said.

**Only a verified webhook can mark an order paid.** A customer's browser landing
on a success page proves nothing — anyone can visit that URL.

---

## 6. People

### users
Customers and staff in one table, separated by role.

**Roles are rows, not code.** You chose Owner and Staff for now; adding a
Measurement Specialist who can see customer contact details but *not* prices is
later a configuration change, not a rewrite.

Every rule is enforced in the database itself, so a staff member who tampers
with the app in their browser still cannot read what they shouldn't.

### reviews
Only from customers who actually received an order. Optional photos. You approve
each one before it appears.

### wishlists
Saved designs. Cheap to build and genuinely useful while someone decides between
two dresses.

---

## 7. Revised plan — fastest to first order

You asked for speed, so I've reordered from the earlier plan:

| # | Milestone | Days | Why here |
|---|---|---|---|
| 1 | Foundations, photos organised | 0.5 | Clears the wrong assumptions out |
| 2 | Accounts and permissions | 1.5 | Everything else needs to know who you are |
| 3 | Designs catalogue + admin | 3 | **You can start entering your catalogue here** |
| 4 | Measurements + animated guide | 4 | The hardest and most valuable part |
| 5 | Verification queue | 3 | Your specialist's daily screen |
| 6 | Currency engine | 2 | Needed before anyone can be charged correctly |
| 7 | Orders and checkout | 3 | |
| 8 | Chapa payments | 2.5 | **First real order possible here** |
| 9 | Notifications | 1.5 | |
| 10 | Reviews, wishlist, progress photos | 2 | |
| 11 | Hardening and launch | 2 | Security review, slow-connection testing |

**First real order: around 19–20 working days.**
**Everything in version one: around 25 days.**

Milestone 3 is deliberately early so you can be entering your 100–300 designs
while I build the rest. That work is yours, it's the longest single task in the
project, and it does not need me.

---

## What I need from you

1. **Read the measurement lists in section 3 and correct them.** They're my
   research, not your workshop's practice. This is the part I'm least able to
   guess and the part hardest to change later.
2. **Say yes to this model**, or tell me what's wrong.
3. **Check Chapa** for which currencies you can receive.
4. **Start photographing designs.** Longest pole, entirely yours.

Say the word and I'll start on milestone 1.
