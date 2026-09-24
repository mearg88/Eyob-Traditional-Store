# Launch checklist

Work down this list. Nothing here needs a developer except where it says so.

---

## 1. Before anything else — your catalogue

**This is the longest task in the whole project and it is entirely yours.**

- [ ] Photograph the categories you have nothing for: **Netela & Shash, Gabi &
      Shemma, Men's Traditional, Children's Wear**. All 41 photographs you sent
      are women's dresses, so four of your seven categories are empty. A
      customer tapping one today finds a dead end.
- [ ] Enter each design in the admin: name, category, description, fabric,
      colour, border, production days, and both prices.
- [ ] Set a birr price **and** a dollar price for every design. A design with
      no price cannot be ordered.
- [ ] Publish each one. Designs stay as drafts until you press Publish, and
      publishing is refused until there is at least one photograph.

## 2. Check the measurements with your tailor

- [ ] Open `docs/DATA-MODEL.md`, section 3, and read the measurement lists to
      whoever actually cuts the garments.
- [ ] Tell your developer anything that is missing, wrong, or unnecessary.

**Why this matters more than it looks:** those lists came from researching what
other Habesha sellers ask for, not from your workshop. Every order collects
exactly these fields, and your specialist checks exactly these fields. Changing
them later means changing screens, checks and existing orders.

## 3. Accounts you need

| What | Cost | Needed for |
|---|---|---|
| Domain name | ~$12/year | Emails reaching inboxes, link previews, trust |
| Supabase | Free | The database and accounts |
| Cloudflare R2 | Free to 10GB | Photograph storage |
| Vercel | Free | Hosting |
| Resend | Free to 3,000/month | Order emails |
| Telegram bot | Free | Instant alerts to your phone |
| Chapa | Per transaction | Taking money |

- [ ] Buy a domain. **This blocks more than you would expect** — order emails
      from a free hosting address get marked as spam, and shared links show no
      photograph.
- [ ] Decide the shop's real name. "Eyob Traditional Store" is a placeholder.

## 4. Chapa — do this before any real money moves

- [ ] Log in and check **which currencies you can actually receive**.
- [ ] Tell your developer the answer.

The site currently assumes Chapa settles in **birr and dollars only**, and
tells a customer viewing pounds that they will be charged in dollars. If your
account can do more, that message should change. If it can do less, it must.

- [ ] Verify the current fees. The 3.5% local / 1% international figures came
      from your brief, not from Chapa.
- [ ] Test a real payment with a small amount before announcing the shop.

**For your developer:** the webhook signature handling has points marked
`CONFIRM` in `api/_lib/chapa.ts`. Chapa's documentation was unreachable from
the machine this was built on, so the request shape follows their published
SDKs. Check those before going live.

## 5. Set up the database

For your developer:

```sql
-- 1. Run supabase/schema.sql in the Supabase SQL editor.
-- 2. Create the owner's account through the site, then:
insert into staff_users (user_id, email, display_name, role)
values ('<auth user id>', '<email>', 'Eyob', 'owner');
```

Until that insert, nobody can reach the admin — which is the right default.

- [ ] Schedule the daily rate refresh (`/api/rates/refresh`).
- [ ] Seed categories and country groups from the admin.

## 6. Set your prices and regions

- [ ] **Pricing → Regions.** Set the uplift for each region to cover what
      delivery there actually costs you. These are placeholders today.
- [ ] **Settings → Collection.** Set the discount for collecting from the shop.
      Delivery is included in your prices, so collecting has to cost less or
      nobody will choose it.
- [ ] **Settings → Shop address.** Currently a placeholder in Addis.
- [ ] Check the customs wording. It is shown on every page.

## 7. Walk through it yourself before anyone else does

- [ ] Order something, as a customer, on your own phone.
- [ ] Take the measurements through the guide. Time it. If it is tedious for
      you it is worse for someone who has never done it.
- [ ] Find the order in **Measurements**, change a number, and see that the
      customer is asked to confirm.
- [ ] Confirm as the customer. Check the change is shown clearly.
- [ ] Verify it, move it through the workshop stages, add a progress
      photograph, and mark it delivered.
- [ ] Leave a review as the customer, then approve it.

Anything that irritates you in that run will irritate every customer. Say so.

## 8. Before you announce it

- [ ] Every design has a photograph and both prices.
- [ ] No category is empty.
- [ ] Order emails arrive and are not in spam.
- [ ] Telegram alerts reach your phone.
- [ ] A real payment has gone through and appeared in your Chapa account.
- [ ] The shop loads acceptably on a normal phone on mobile data, not wifi.
- [ ] Someone who has never seen it can order without asking you a question.

---

## What is deliberately not built yet

Agreed as later, not forgotten:

- **Group orders** — bridesmaids ordering together, each with their own
  measurements. Valuable and it pairs with bridal leading the catalogue.
- **Amharic and Tigrinya** — English only for now, but every piece of text
  lives in one file, so adding a language is translation rather than rebuilding.
- **WhatsApp Business API** — needs Meta verification and costs per
  conversation. A normal WhatsApp chat link works today.
- **App Store and Play Store** — the site already installs to a phone's home
  screen for free. The stores need $99/year and $25.
- **Promo codes** — phase 2, your decision.
- **Wholesale** — stays off the site entirely, as you asked.

## Known limitations

- **Photographs live in the browser until R2 is connected.** Uploads are
  compressed correctly but held as temporary links. They must be wired to R2
  before real use, or photographs vanish on reload.
- **The refund guarantee is manual.** A customer claims, you approve. That is
  deliberate: automatic refunds on a courier's late tracking would pay out on
  delays you never caused.
- **Demo mode is obvious on purpose.** Every screen that could be mistaken for
  real says so while Supabase keys are absent.
