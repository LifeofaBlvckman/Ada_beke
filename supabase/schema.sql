-- ADA BEKE: database setup for Supabase
-- Paste all of this into Supabase -> SQL Editor -> New query, then press Run.
-- It is safe to run more than once: nothing that already exists is changed.
-- (Made by tools/make_schema_sql.js from the site's own table definitions.)

begin;

-- 1. Tables. Row level security is on with no rules, so Supabase's public data
--    API can't read or change anything; only the website can.
create table if not exists settings (
  key text primary key,
  value jsonb not null
);
create table if not exists products (
  id text primary key,
  name text not null,
  colour text not null default '',
  price integer,
  status text not null default 'available',
  badge text not null default '',
  includes text not null default '',
  fabric text not null default '',
  fit text not null default 'Free size',
  description text not null default '',
  images jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table products add column if not exists collection text not null default '';
alter table products add column if not exists fit_note text not null default '';
create table if not exists collections (
  id text primary key,
  name text not null,
  tagline text not null default '',
  image text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists orders (
  id bigserial primary key,
  reference text not null unique,
  channel text not null,
  payment text not null default 'unpaid',
  status text not null default 'new',
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  country text not null default '',
  note text not null default '',
  delivery_name text not null default '',
  delivery_fee integer not null default 0,
  items jsonb not null,
  subtotal integer not null default 0,
  total integer not null default 0,
  on_request boolean not null default false,
  currency text not null default 'NGN',
  paid_at timestamptz,
  paystack jsonb,
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table orders add column if not exists discount_code text not null default '';
alter table orders add column if not exists discount integer not null default 0;
create index if not exists orders_created_idx on orders (created_at desc);
create table if not exists images (
  id text primary key,
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);
create table if not exists hits (
  bucket text not null,
  at timestamptz not null default now()
);
create index if not exists hits_idx on hits (bucket, at);
create table if not exists subscribers (
  id bigserial primary key,
  contact text not null unique,
  kind text not null,
  source text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists discounts (
  code text primary key,
  kind text not null,
  value integer not null,
  min_subtotal integer not null default 0,
  max_uses integer,
  uses integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table settings enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table images enable row level security;
alter table hits enable row level security;
alter table collections enable row level security;
alter table subscribers enable row level security;
alter table discounts enable row level security;

-- 2. Starting collections and pieces (edit them later in the site's /admin)
insert into collections (id, name, tagline, image, position) values
  ('sets', 'Sets', 'Boubou and trouser sets, ready to wear', 'assets/img/shoot/abira-set.webp', 0),
  ('boubous', 'Boubous', 'Wide, flowing and free size', 'assets/img/shoot/wifey-gaze.webp', 1)
on conflict (id) do nothing;

insert into products (id, name, colour, price, status, badge, includes, fabric, fit, description, images, position, collection, fit_note) values
  ('omalicha', 'Omalicha set', 'Royal navy shimmer chiffon', 45000, 'available', 'Bestseller', 'Sold with the scarf only', 'Flowy shimmer chiffon', 'Free size', 'Our all-time bestseller, now in a flowy shimmer chiffon. A wide, free-size boubou over matching wide-leg trousers, finished with its scarf.', '["assets/img/omalicha-mannequin.webp","assets/img/omalicha-runway.webp"]'::jsonb, 0, 'sets', ''),
  ('wifey', 'Wifey boubou', 'Black', 50000, 'available', 'New', 'Sold with the co-ord set', 'Sheer dotted chiffon', 'Free size', 'A sheer, softly dotted black boubou with wide, floating sleeves. Sold with its co-ord set.', '["assets/img/shoot/wifey-seated.webp","assets/img/shoot/wifey-gaze.webp","assets/img/shoot/wifey-standing.webp"]'::jsonb, 1, 'boubous', ''),
  ('abira', 'Abira hoodie set', 'Rust & cobalt leaf print', 50000, 'available', 'Restocked', 'Abira hoodie boubou & pants set', '', 'Free size', 'For that woman who loves to show up in relaxed elegance. The Abira hoodie boubou with matching pants, available for immediate delivery.', '["assets/img/shoot/abira-front.webp","assets/img/shoot/abira-set.webp","assets/img/shoot/abira-pose.webp","assets/img/shoot/abira-turn.webp","assets/img/shoot/abira-back.webp"]'::jsonb, 2, 'sets', ''),
  ('something-soft', 'Something soft', 'Dropping soon', null, 'soon', 'Dropping soon', 'Details coming soon', 'To be revealed', 'Free size', 'Something soft for our beautiful, stylish ladies is on the way. Message us on WhatsApp to hear the moment it drops.', '["assets/img/bags-bag.webp","assets/img/bags-glass.webp"]'::jsonb, 3, '', '')
on conflict (id) do nothing;

-- 3. Tell the website the database is ready
insert into settings (key, value) values
  ('seeded', 'true'::jsonb),
  ('seeded_collections', 'true'::jsonb),
  ('schema_version', '2'::jsonb)
on conflict (key) do nothing;

commit;

-- Check: this should list 4 pieces
select id, name, price, status from products order by position;
