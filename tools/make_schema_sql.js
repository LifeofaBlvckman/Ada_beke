/* Writes supabase/schema.sql: everything the site needs in the database, ready to
   paste into Supabase's SQL Editor. It uses the same table definitions as the site
   (lib/db.js) and the starting pieces and collections from assets/js/products.js,
   so the site sees the database as already set up.
   Run: node tools/make_schema_sql.js */
"use strict";

const fs = require("fs");
const path = require("path");
const { SCHEMA, SCHEMA_VERSION } = require("../lib/db.js");
const { ADA_PRODUCTS, ADA_COLLECTIONS } = require("../assets/js/products.js");

const q = (v) => (v == null ? "null" : typeof v === "number" ? String(Math.round(v)) : "'" + String(v).replace(/'/g, "''") + "'");

const products = ADA_PRODUCTS.map((p, i) =>
  `  (${[p.id, p.name, p.colour || "", p.price == null ? null : p.price, p.status || "available", p.badge || "", p.includes || "",
       p.fabric || "", p.fit || "Free size", p.description || ""].map(q).join(", ")}, ${q(JSON.stringify(p.images || []))}::jsonb, ${i}, ${q(p.collection || "")}, ${q(p.fitNote || "")})`
).join(",\n");

const collections = ADA_COLLECTIONS.map((c, i) =>
  `  (${[c.id, c.name, c.tagline || "", c.image || ""].map(q).join(", ")}, ${i})`
).join(",\n");

const sql = `-- ADA BEKE: database setup for Supabase
-- Paste all of this into Supabase -> SQL Editor -> New query, then press Run.
-- It is safe to run more than once: nothing that already exists is changed.
-- (Made by tools/make_schema_sql.js from the site's own table definitions.)

begin;

-- 1. Tables. Row level security is on with no rules, so Supabase's public data
--    API can't read or change anything; only the website can.
${SCHEMA.trim()}

-- 2. Starting collections and pieces (edit them later in the site's /admin)
insert into collections (id, name, tagline, image, position) values
${collections}
on conflict (id) do nothing;

insert into products (id, name, colour, price, status, badge, includes, fabric, fit, description, images, position, collection, fit_note) values
${products}
on conflict (id) do nothing;

-- 3. Tell the website the database is ready
insert into settings (key, value) values
  ('seeded', 'true'::jsonb),
  ('seeded_collections', 'true'::jsonb),
  ('schema_version', '${SCHEMA_VERSION}'::jsonb)
on conflict (key) do nothing;

commit;

-- Check: this should list 4 pieces
select id, name, price, status from products order by position;
`;

const out = path.join(__dirname, "..", "supabase", "schema.sql");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, sql);
console.log("wrote", path.relative(process.cwd(), out), sql.length, "bytes");
