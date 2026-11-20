/* GET /api/catalogue
   A tiny script the shop pages load: the live product list, delivery options
   and whether online payment is on. Cached at Vercel's edge, so it's quick. */
"use strict";

const { send } = require("../lib/http");
const { hasDb, q } = require("../lib/db");
const { toProduct, getDelivery } = require("../lib/shop");
const paystack = require("../lib/paystack");

module.exports = async (req, res) => {
  const shop = { db: false, products: null, delivery: [], paystack: false };
  let cache = "public, max-age=0, s-maxage=20, stale-while-revalidate=604800";
  if (hasDb()) {
    try {
      const r = await q("select * from products where status <> 'hidden' order by position, created_at");
      shop.products = r.rows.map(toProduct);
      shop.delivery = await getDelivery();
      shop.db = true;
      shop.paystack = paystack.enabled();
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
