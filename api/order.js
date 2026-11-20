/* GET /api/order?ref=AB-XXXXXXXX
   What the "thank you" page shows. Checks with Paystack if the order isn't
   marked paid yet. Only shares what the customer already knows. */
"use strict";

const { send, HttpError, query, clientIp, handler } = require("../lib/http");
const { q } = require("../lib/db");
const { REF_RE, limit, ipBucket } = require("../lib/shop");
const paystack = require("../lib/paystack");

module.exports = handler(async (req, res) => {
  if (req.method !== "GET") throw new HttpError(405, "Use GET.");
  const p = query(req);
  const ref = String(p.get("ref") || p.get("reference") || "").trim().toUpperCase();
  if (!REF_RE.test(ref)) throw new HttpError(404, "We couldn't find that order.");
  await limit(ipBucket("order", clientIp(req)), 60, 10);

  const r = await q("select * from orders where reference = $1", [ref]);
  if (!r.rowCount) throw new HttpError(404, "We couldn't find that order.");
  const o = await paystack.refresh(r.rows[0]);

  send(res, 200, {
    reference: o.reference,
    channel: o.channel,
    payment: o.payment,
    status: o.status,
    firstName: String(o.name || "").split(/\s+/)[0] || "",
    items: (o.items || []).map((i) => ({ name: i.name, colour: i.colour, qty: i.qty, price: i.price, image: i.image })),
    subtotal: o.subtotal,
    delivery: o.delivery_name ? { name: o.delivery_name, fee: o.delivery_fee } : null,
    total: o.total,
    createdAt: o.created_at,
  });
});
