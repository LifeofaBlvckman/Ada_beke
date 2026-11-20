/* Postgres connection + tables.
   Uses DATABASE_URL (set by Vercel's Neon integration) or POSTGRES_URL.
   Tables are created on first use, and the starting product list is copied in
   once, the very first time. */
"use strict";

const { Pool } = require("pg");
const { HttpError } = require("./http");

const SCHEMA_VERSION = 1;

const SCHEMA = `
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
`;

let pool = null;
let ready = null;

function url() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}
function hasDb() {
  return !!url();
}

function getPool() {
  if (!pool) {
    let u = url();
    const opts = { max: 4, idleTimeoutMillis: 5000, connectionTimeoutMillis: 10000 };
    if (/supabase\.(co|com)/.test(u)) {
      // Supabase's certificate chain needs its own CA; encrypt without checking it
      u = u.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
      opts.ssl = { rejectUnauthorized: false };
    }
    opts.connectionString = u;
    pool = new Pool(opts);
    pool.on("error", (e) => console.error("db pool", e.message));
  }
  return pool;
}

async function seed(c) {
  const start = require("../assets/js/products.js").ADA_PRODUCTS || [];
  let pos = 0;
  for (const p of start) {
    await c.query(
      `insert into products (id, name, colour, price, status, badge, includes, fabric, fit, description, images, position)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (id) do nothing`,
      [
        p.id, p.name, p.colour || "", p.price == null ? null : Math.round(p.price), p.status || "available",
        p.badge || "", p.includes || "", p.fabric || "", p.fit || "Free size", p.description || "",
        JSON.stringify(p.images || []), pos++,
      ]
    );
  }
}

function ensure() {
  if (!hasDb()) return Promise.reject(new HttpError(503, "The database isn't connected yet.", { setup: "no-db" }));
  if (!ready) {
    ready = (async () => {
      const db = getPool();
      try {
        const v = await db.query("select value from settings where key = 'schema_version'");
        if (v.rows[0] && Number(v.rows[0].value) >= SCHEMA_VERSION) return;
      } catch (e) {
        /* first run: tables don't exist yet */
      }
      const c = await db.connect();
      try {
        await c.query("begin");
        await c.query("select pg_advisory_xact_lock(58218220)");
        await c.query(SCHEMA);
        const first = await c.query(
          "insert into settings (key, value) values ('seeded', 'true'::jsonb) on conflict (key) do nothing returning key"
        );
        if (first.rowCount) await seed(c);
        await c.query(
          "insert into settings (key, value) values ('schema_version', $1::jsonb) on conflict (key) do update set value = excluded.value",
          [JSON.stringify(SCHEMA_VERSION)]
        );
        await c.query("commit");
      } catch (e) {
        await c.query("rollback").catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

async function q(text, params) {
  await ensure();
  return getPool().query(text, params);
}

// Runs fn(client) inside a transaction.
async function tx(fn) {
  await ensure();
  const c = await getPool().connect();
  try {
    await c.query("begin");
    const out = await fn(c);
    await c.query("commit");
    return out;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

module.exports = { hasDb, ensure, q, tx };
