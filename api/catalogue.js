/* GET /api/catalogue
   A tiny script the shop pages load: the live pieces, collections, delivery
   options, approximate foreign prices and whether online payment is on.
   Cached at Vercel's edge, so it's quick.
   GET /api/catalogue?keepalive=1 (daily, from vercel.json) keeps a free
   Supabase project from going to sleep. */
"use strict";

const { send, query } = require("../lib/http");
const { hasDb, q } = require("../lib/db");
const { toProduct, toCollection, getDelivery } = require("../lib/shop");
const paystack = require("../lib/paystack");
const fx = require("../lib/fx");

module.exports = async (req, res) => {
  if (query(req).get("keepalive")) {
    let ok = false;
    if (hasDb()) {
      try {
        await q("select 1");
        ok = true;
      } catch (e) {
        console.error("keepalive", e.message);
      }
    }
    return send(res, ok || !hasDb() ? 200 : 503, { ok, db: hasDb() });
  }

  const shop = { db: false, products: null, collections: [], delivery: [], paystack: false, fx: null };
  let cache = "public, max-age=0, s-maxage=20, stale-while-revalidate=604800";
  if (hasDb()) {
    try {
      const r = await q("select * from products where status <> 'hidden' order by position, created_at");
      shop.products = r.rows.map(toProduct);
      const used = new Set(shop.products.map((p) => p.collection).filter(Boolean));
      const c = await q("select * from collections order by position, created_at");
      shop.collections = c.rows.filter((x) => used.has(x.id)).map(toCollection);
      shop.delivery = await getDelivery();
      shop.db = true;
      shop.paystack = paystack.enabled();
      shop.fx = await fx.rates().catch(() => null);
    } catch (e) {
      console.error("catalogue", e.message);
      shop.products = null; // the page falls back to its built-in list
      cache = "no-store";
    }
  }
  const json = JSON.stringify(shop).replace(/</g, "\\u003c");
  send(
    res,
    200,
    "window.ADA_SHOP=" + json + ';document.dispatchEvent(new Event("ada:catalogue"));\n',
    { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": cache }
  );
};
