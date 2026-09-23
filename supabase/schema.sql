-- ===========================================================================
-- Eyob Traditional Store — schema and Row Level Security
--
-- Run once against a fresh Supabase project (SQL editor, or `supabase db push`).
--
-- THE SECURITY MODEL, stated once so it is not re-derived from the policies:
--
--   * The anon key is public. It ships inside the browser bundle. Every
--     guarantee below is enforced here, in the database, not in the client.
--   * RLS is enabled on EVERY table. A table with RLS on and no policy denies
--     everything through the anon key, so a table added later and forgotten
--     fails closed rather than leaking.
--   * Customers read only their own orders and measurements.
--   * Admin access is membership of staff_users, checked by is_staff().
--   * Prices are never taken from the client. Orders are written by a function
--     that recomputes every amount from this database.
--
-- WHAT THIS SHOP DOES NOT HAVE: stock. A design is a template, orderable any
-- number of times. There is no quantity, no availability and no reservation
-- anywhere in this file, and that is deliberate.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
do $$ begin create type design_status as enum ('draft','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin create type price_tier as enum ('local','international');
exception when duplicate_object then null; end $$;

do $$ begin create type staff_role as enum ('owner','staff');
exception when duplicate_object then null; end $$;

do $$ begin create type review_status as enum (
  'submitted','under_review','awaiting_customer_confirmation','verified','rejected');
exception when duplicate_object then null; end $$;

do $$ begin create type order_status as enum (
  'pending_payment','paid','measurements_under_review','awaiting_customer_confirmation',
  'in_production','ready','dispatched','delivered','cancelled','refunded');
exception when duplicate_object then null; end $$;

do $$ begin create type production_stage as enum (
  'fabric_cut','sewing','embroidery','finishing','quality_check');
exception when duplicate_object then null; end $$;

do $$ begin create type payment_status as enum (
  'pending','paid','failed','abandoned','refunded');
exception when duplicate_object then null; end $$;

do $$ begin create type fulfilment_method as enum ('delivery','pickup');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table if not exists staff_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role staff_role not null default 'staff',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  phone text,
  preferred_currency text,
  preferred_unit text not null default 'cm',
  created_at timestamptz not null default now()
);

-- Keeps customers in step with auth.users without the client having to.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into customers (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table if not exists measurement_templates (
  id text primary key,
  name text not null,
  description text default '',
  -- Field definitions as JSON: label, instruction, ranges, whether a helper is
  -- needed. Stored as data so the workshop can correct them without a deploy.
  fields jsonb not null default '[]'::jsonb
);

create table if not exists categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text default '',
  measurement_template_id text references measurement_templates(id),
  position integer not null default 0
);

create table if not exists designs (
  id text primary key,
  slug text not null unique,
  status design_status not null default 'draft',
  name text not null,
  category_id text references categories(id),
  description text default '',
  care_instructions text default '',
  fabric text default '',
  colour text default '',
  embroidery text default '',
  occasion text[] not null default '{}',
  gender text not null default 'women'
    check (gender in ('women','men','children','unisex')),
  -- Working days in the workshop, before any delivery time is added.
  production_days integer not null default 14 check (production_days > 0),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists designs_status_idx on designs(status);
create index if not exists designs_category_idx on designs(category_id);

create table if not exists design_photos (
  id uuid primary key default gen_random_uuid(),
  design_id text not null references designs(id) on delete cascade,
  storage_key text not null,
  alt text default '',
  position integer not null default 0,
  widths integer[] default null
);

create index if not exists design_photos_design_idx on design_photos(design_id);

-- Exactly two rows per design: local in birr, international in dollars.
create table if not exists design_prices (
  design_id text not null references designs(id) on delete cascade,
  tier price_tier not null,
  -- Minor units. Integer, never floating point: 0.1 + 0.2 must not happen to
  -- money.
  amount bigint not null check (amount >= 0),
  primary key (design_id, tier)
);

create table if not exists design_options (
  id text primary key,
  design_id text not null references designs(id) on delete cascade,
  name text not null,
  required boolean not null default true,
  position integer not null default 0
);

create table if not exists design_option_choices (
  id text primary key,
  option_id text not null references design_options(id) on delete cascade,
  label text not null,
  price_effect_local bigint not null default 0,
  price_effect_usd bigint not null default 0,
  extra_production_days integer not null default 0,
  position integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Pricing context
-- ---------------------------------------------------------------------------

create table if not exists country_groups (
  id text primary key,
  name text not null,
  -- ISO alpha-2 codes; '*' is the catch-all.
  countries text[] not null default '{}',
  -- Covers delivery to this group, which is why an international price differs
  -- by destination with no shipping line at checkout.
  uplift_percent numeric(5,2) not null default 0,
  delivery_days_min integer not null default 7,
  delivery_days_max integer not null default 14,
  position integer not null default 0
);

create table if not exists exchange_rates (
  currency text primary key,
  -- Units of `currency` per USD, margin already applied.
  rate_from_usd numeric(14,6) not null check (rate_from_usd > 0),
  margin_percent numeric(5,2) not null default 0,
  fetched_at timestamptz not null default now()
);

create table if not exists store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'Eyob Traditional Store',
  support_email text default '',
  support_phone text default '',
  whatsapp_number text default '',
  telegram_username text,
  shop_address text default '',
  shop_map_url text,
  pickup_discount_percent numeric(5,2) not null default 0,
  forex_margin_percent numeric(5,2) not null default 2,
  -- What Chapa can actually charge in, which may differ from what we display.
  charge_currencies text[] not null default array['ETB','USD'],
  return_window_days integer not null default 14,
  customs_disclaimer text default ''
);

insert into store_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Measurements
-- ---------------------------------------------------------------------------

create table if not exists measurement_sets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  -- The customer's own label, e.g. 'Mine' or 'For Selam'.
  name text not null default 'My measurements',
  template_id text references measurement_templates(id),
  -- Values keyed by field name. ALWAYS centimetres; inches are a display
  -- conversion only, so there is one number here and no rounding drift.
  values jsonb not null default '{}'::jsonb,
  -- For customers who cannot measure: height and usual size, followed up by a
  -- tailor. Better than an abandoned order.
  fallback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists measurement_sets_customer_idx on measurement_sets(customer_id);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid not null references customers(id) on delete restrict,
  email text not null,
  phone text not null,
  status order_status not null default 'pending_payment',
  production_stage production_stage,

  currency text not null,
  tier price_tier not null,
  -- Frozen at placement so the rate can never move under the customer.
  locked_rate_from_usd numeric(14,6) not null default 1,
  locked_at timestamptz not null default now(),

  subtotal_amount bigint not null default 0 check (subtotal_amount >= 0),
  pickup_discount_amount bigint not null default 0,
  total_amount bigint not null default 0 check (total_amount >= 0),

  fulfilment fulfilment_method not null default 'delivery',
  shipping_address jsonb,

  promised_date date not null,
  -- Days the clock was stopped waiting on the customer. The refund guarantee is
  -- measured against promised_date plus this, so a slow customer cannot run
  -- down the shop's own deadline.
  paused_days integer not null default 0,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A delivery order needs somewhere to deliver to.
  constraint delivery_needs_address
    check (fulfilment <> 'delivery' or shipping_address is not null)
);

create index if not exists orders_customer_idx on orders(customer_id);
create index if not exists orders_status_idx on orders(status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  design_id text references designs(id) on delete set null,
  -- Snapshots: editing a design later must never rewrite order history.
  design_name text not null,
  design_slug text not null,
  photo_key text,
  chosen_options jsonb not null default '[]'::jsonb,
  -- Free text. Shown to staff, changes no price, discussed on the contact the
  -- tailor is already making.
  special_request text,
  measurement_set_id uuid references measurement_sets(id) on delete set null,
  -- Copy of the values at order time, so later edits are visible as edits.
  measurement_snapshot jsonb not null default '{}'::jsonb,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount bigint not null check (unit_amount >= 0)
);

create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  at timestamptz not null default now(),
  kind text not null,
  photo_key text,
  note text,
  actor_id uuid,
  visible_to_customer boolean not null default true
);

create index if not exists order_events_order_idx on order_events(order_id, at);

-- ---------------------------------------------------------------------------
-- Verification — the core workflow
-- ---------------------------------------------------------------------------

create table if not exists measurement_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  measurement_set_id uuid not null references measurement_sets(id) on delete cascade,
  status review_status not null default 'submitted',
  assigned_to uuid references staff_users(user_id) on delete set null,
  -- Raised by the automatic checks before a human looks.
  flags text[] not null default '{}',
  staff_notes text,
  customer_confirmed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references staff_users(user_id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists measurement_reviews_status_idx on measurement_reviews(status);

create table if not exists contact_attempts (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references measurement_reviews(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','telegram','email','phone')),
  attempted_at timestamptz not null default now(),
  staff_id uuid references staff_users(user_id) on delete set null,
  reached boolean not null default false,
  note text
);

-- Append-only. Nothing is ever overwritten.
--
-- This is the evidence when a customer says a garment does not fit: which
-- numbers were used, who set them, and when the customer approved them.
create table if not exists measurement_edits (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references measurement_reviews(id) on delete cascade,
  field_key text not null,
  old_value_cm numeric(6,2),
  new_value_cm numeric(6,2) not null,
  edited_by uuid references staff_users(user_id) on delete set null,
  edited_at timestamptz not null default now(),
  reason text not null default ''
);

create index if not exists measurement_edits_review_idx on measurement_edits(review_id);

-- Edits must never be rewritten or deleted, including by staff. Without this,
-- the audit trail is only as trustworthy as the last person to touch it.
create or replace function forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'measurement_edits is append-only';
end;
$$;

drop trigger if exists measurement_edits_immutable on measurement_edits;
create trigger measurement_edits_immutable
  before update or delete on measurement_edits
  for each row execute function forbid_mutation();

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  tx_ref text not null unique,
  provider_reference text,
  provider text not null default 'chapa',
  status payment_status not null default 'pending',
  amount bigint not null,
  charge_currency text not null,
  display_currency text not null,
  -- Stored verbatim. When a charge is disputed months later this is the only
  -- record of what the provider actually said.
  raw_webhook_payload jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payments_order_idx on payments(order_id);

-- Chapa may deliver the same event more than once; the unique constraint makes
-- a repeat a no-op rather than a second state change.
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'chapa',
  event_id text not null,
  tx_ref text,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  unique (provider, event_id)
);

create table if not exists refund_claims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null default 'open' check (status in ('open','approved','declined')),
  customer_reason text not null default '',
  staff_decision_reason text,
  decided_by uuid references staff_users(user_id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------------

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  design_id text not null references designs(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  photo_keys text[] not null default '{}',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists wishlist_entries (
  customer_id uuid not null references customers(id) on delete cascade,
  design_id text not null references designs(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (customer_id, design_id)
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_users
     where user_id = auth.uid() and active = true
  );
$$;

create or replace function is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff_users
     where user_id = auth.uid() and active = true and role = 'owner'
  );
$$;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================

alter table staff_users            enable row level security;
alter table customers              enable row level security;
alter table measurement_templates  enable row level security;
alter table categories             enable row level security;
alter table designs                enable row level security;
alter table design_photos          enable row level security;
alter table design_prices          enable row level security;
alter table design_options         enable row level security;
alter table design_option_choices  enable row level security;
alter table country_groups         enable row level security;
alter table exchange_rates         enable row level security;
alter table store_settings         enable row level security;
alter table measurement_sets       enable row level security;
alter table orders                 enable row level security;
alter table order_items            enable row level security;
alter table order_events           enable row level security;
alter table measurement_reviews    enable row level security;
alter table contact_attempts       enable row level security;
alter table measurement_edits      enable row level security;
alter table payments               enable row level security;
alter table webhook_events         enable row level security;
alter table refund_claims          enable row level security;
alter table reviews                enable row level security;
alter table wishlist_entries       enable row level security;

-- --- Catalogue: world-readable, staff-writable -----------------------------

drop policy if exists templates_read on measurement_templates;
create policy templates_read on measurement_templates for select using (true);
drop policy if exists templates_write on measurement_templates;
create policy templates_write on measurement_templates for all
  using (is_staff()) with check (is_staff());

drop policy if exists categories_read on categories;
create policy categories_read on categories for select using (true);
drop policy if exists categories_write on categories;
create policy categories_write on categories for all
  using (is_staff()) with check (is_staff());

-- Draft and archived designs are staff-only, so work in progress is not public.
drop policy if exists designs_read on designs;
create policy designs_read on designs for select
  using (status = 'published' or is_staff());
drop policy if exists designs_write on designs;
create policy designs_write on designs for all
  using (is_staff()) with check (is_staff());

drop policy if exists design_photos_read on design_photos;
create policy design_photos_read on design_photos for select using (true);
drop policy if exists design_photos_write on design_photos;
create policy design_photos_write on design_photos for all
  using (is_staff()) with check (is_staff());

drop policy if exists design_prices_read on design_prices;
create policy design_prices_read on design_prices for select using (true);
drop policy if exists design_prices_write on design_prices;
create policy design_prices_write on design_prices for all
  using (is_staff()) with check (is_staff());

drop policy if exists design_options_read on design_options;
create policy design_options_read on design_options for select using (true);
drop policy if exists design_options_write on design_options;
create policy design_options_write on design_options for all
  using (is_staff()) with check (is_staff());

drop policy if exists option_choices_read on design_option_choices;
create policy option_choices_read on design_option_choices for select using (true);
drop policy if exists option_choices_write on design_option_choices;
create policy option_choices_write on design_option_choices for all
  using (is_staff()) with check (is_staff());

drop policy if exists country_groups_read on country_groups;
create policy country_groups_read on country_groups for select using (true);
drop policy if exists country_groups_write on country_groups;
create policy country_groups_write on country_groups for all
  using (is_staff()) with check (is_staff());

drop policy if exists rates_read on exchange_rates;
create policy rates_read on exchange_rates for select using (true);
-- Rates are refreshed by a scheduled function using the service role, which
-- bypasses RLS. Only an owner may set them by hand.
drop policy if exists rates_write on exchange_rates;
create policy rates_write on exchange_rates for all
  using (is_owner()) with check (is_owner());

drop policy if exists settings_read on store_settings;
create policy settings_read on store_settings for select using (true);
drop policy if exists settings_write on store_settings;
create policy settings_write on store_settings for all
  using (is_owner()) with check (is_owner());

-- --- Customers -------------------------------------------------------------

drop policy if exists customers_self on customers;
create policy customers_self on customers for select
  using (id = auth.uid() or is_staff());
drop policy if exists customers_update_self on customers;
create policy customers_update_self on customers for update
  using (id = auth.uid()) with check (id = auth.uid());

-- --- Measurements ----------------------------------------------------------
-- A customer's body measurements are among the most personal data here.

drop policy if exists measurement_sets_own on measurement_sets;
create policy measurement_sets_own on measurement_sets for all
  using (customer_id = auth.uid() or is_staff())
  with check (customer_id = auth.uid() or is_staff());

-- --- Orders ----------------------------------------------------------------
-- Customers read their own. Nobody writes one directly: orders are created by
-- create_order(), which computes every amount from this database.

drop policy if exists orders_read_own on orders;
create policy orders_read_own on orders for select
  using (customer_id = auth.uid() or is_staff());
drop policy if exists orders_staff_write on orders;
create policy orders_staff_write on orders for all
  using (is_staff()) with check (is_staff());

drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items for select
  using (
    is_staff()
    or exists (select 1 from orders o where o.id = order_items.order_id and o.customer_id = auth.uid())
  );
drop policy if exists order_items_staff_write on order_items;
create policy order_items_staff_write on order_items for all
  using (is_staff()) with check (is_staff());

drop policy if exists order_events_read on order_events;
create policy order_events_read on order_events for select
  using (
    is_staff()
    or (
      visible_to_customer
      and exists (select 1 from orders o where o.id = order_events.order_id and o.customer_id = auth.uid())
    )
  );
drop policy if exists order_events_staff_write on order_events;
create policy order_events_staff_write on order_events for all
  using (is_staff()) with check (is_staff());

-- --- Verification ----------------------------------------------------------
-- The customer may READ their review, because they have to see and approve any
-- changes. They may not write it — approval goes through confirm_measurements().

drop policy if exists reviews_read_own on measurement_reviews;
create policy reviews_read_own on measurement_reviews for select
  using (
    is_staff()
    or exists (select 1 from orders o where o.id = measurement_reviews.order_id and o.customer_id = auth.uid())
  );
drop policy if exists reviews_staff_write on measurement_reviews;
create policy reviews_staff_write on measurement_reviews for all
  using (is_staff()) with check (is_staff());

drop policy if exists contact_attempts_staff on contact_attempts;
create policy contact_attempts_staff on contact_attempts for all
  using (is_staff()) with check (is_staff());

-- The customer can see what was changed and by whom — that transparency is the
-- point of the audit trail — but only staff may add to it, and the trigger
-- above stops anyone editing it.
drop policy if exists measurement_edits_read on measurement_edits;
create policy measurement_edits_read on measurement_edits for select
  using (
    is_staff()
    or exists (
      select 1 from measurement_reviews r
      join orders o on o.id = r.order_id
      where r.id = measurement_edits.review_id and o.customer_id = auth.uid()
    )
  );
drop policy if exists measurement_edits_insert on measurement_edits;
create policy measurement_edits_insert on measurement_edits for insert
  with check (is_staff());

-- --- Payments --------------------------------------------------------------
-- Staff only. Customers see payment state through their order, never the raw
-- provider payload.

drop policy if exists payments_staff on payments;
create policy payments_staff on payments for all
  using (is_staff()) with check (is_staff());

-- webhook_events has NO policy at all: only the service role touches it, and
-- the service role bypasses RLS. The anon key gets nothing.

drop policy if exists refund_claims_own on refund_claims;
create policy refund_claims_own on refund_claims for select
  using (
    is_staff()
    or exists (select 1 from orders o where o.id = refund_claims.order_id and o.customer_id = auth.uid())
  );
drop policy if exists refund_claims_create on refund_claims;
create policy refund_claims_create on refund_claims for insert
  with check (
    exists (select 1 from orders o where o.id = refund_claims.order_id and o.customer_id = auth.uid())
  );
drop policy if exists refund_claims_decide on refund_claims;
create policy refund_claims_decide on refund_claims for update
  using (is_staff()) with check (is_staff());

-- --- Social ----------------------------------------------------------------

drop policy if exists reviews_public_read on reviews;
create policy reviews_public_read on reviews for select
  using (approved = true or is_staff() or customer_id = auth.uid());

-- Only a customer who actually received an order may review, and only for a
-- design they ordered. Enforced here rather than in the UI so it cannot be
-- bypassed.
drop policy if exists reviews_verified_buyer on reviews;
create policy reviews_verified_buyer on reviews for insert
  with check (
    customer_id = auth.uid()
    and exists (
      select 1 from orders o
      join order_items oi on oi.order_id = o.id
      where o.id = reviews.order_id
        and o.customer_id = auth.uid()
        and o.status = 'delivered'
        and oi.design_id = reviews.design_id
    )
  );

drop policy if exists reviews_staff_moderate on reviews;
create policy reviews_staff_moderate on reviews for update
  using (is_staff()) with check (is_staff());

drop policy if exists wishlist_own on wishlist_entries;
create policy wishlist_own on wishlist_entries for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- --- Staff -----------------------------------------------------------------
-- A signed-in user may read their own row — that is how the client learns its
-- role. Only an owner may grant or revoke access.

drop policy if exists staff_read_self on staff_users;
create policy staff_read_self on staff_users for select
  using (user_id = auth.uid() or is_staff());
drop policy if exists staff_owner_write on staff_users;
create policy staff_owner_write on staff_users for all
  using (is_owner()) with check (is_owner());

-- ===========================================================================
-- After running this file
--
--   1. Create your own account through the site.
--   2. Make yourself the owner:
--
--        insert into staff_users (user_id, email, display_name, role)
--        values ('<your auth user id>', '<your email>', 'Eyob', 'owner');
--
--   3. Seed measurement templates, categories and country groups from the
--      admin, or with the seed script.
--
-- Until step 2, nobody can reach the admin — which is the correct default.
-- ===========================================================================
