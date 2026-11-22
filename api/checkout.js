/* POST /api/checkout
   Creates an order from the bag. Prices always come from the database, never
   from the browser.
     channel "paystack": needs the customer's details; answers with the
                         Paystack payment page to send them to.
     channel "whatsapp": records the order under the reference that is in the
                         customer's WhatsApp message, so it shows in the admin.
     action "quote":     checks a discount code against the bag (nothing saved). */
"use strict";

const { send, HttpError, readJson, clientIp, origin, handler } = require("../lib/http");
const { q } = require("../lib/db");
const { REF_RE, newReference, cleanText, getDelivery, limit, ipBucket, applyDiscount } = require("../lib/shop");
const paystack = require("../lib/paystack");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const plain = (name) => String(name || "").replace(/\*/g, "");

module.exports = handler(async (req, res) => {
  if (req.method !== "POST") throw new HttpError(405, "Use POST.");
  const { data } = await readJson(req);
  const channel = data.channel === "whatsapp" ? "whatsapp" : "paystack";
  if (channel === "paystack" && !paystack.enabled()) {
    throw new HttpError(409, "Online payment isn't switched on yet. Please order on WhatsApp.", { whatsapp: true });
  }
  const quote = data.action === "quote";
  if (quote) await limit(ipBucket("quote", clientIp(req)), 60, 60);
  else await limit(ipBucket("checkout", clientIp(req)), 30, 60);

  // What's in the bag
  const want = new Map();
  (Array.isArray(data.items) ? data.items.slice(0, 30) : []).forEach((it) => {
    const id = cleanText(it && it.id, 80);
    const qty = Math.floor(Number(it && it.qty));
    if (id && qty >= 1) want.set(id, Math.min(20, (want.get(id) || 0) + qty));
  });
  if (!want.size) throw new HttpError(400, "Your bag is empty.");

  const found = await q("select * from products where id = any($1::text[])", [[...want.keys()]]);
  const byId = new Map(found.rows.map((p) => [p.id, p]));
  const items = [];
  let subtotal = 0;
  let onRequest = false;
  for (const [id, qty] of want) {
    const p = byId.get(id);
    if (!p || p.status === "hidden") {
      throw new HttpError(409, "One of the pieces in your bag is no longer available. Please remove it and try again.", { refresh: true });
    }
    if (p.status !== "available") {
      const why = p.status === "sold_out" ? "sold out" : "not available to order yet";
      throw new HttpError(409, plain(p.name) + " is " + why + ". Please remove it from your bag.", { refresh: true });
    }
    if (p.price == null) {
      if (channel === "paystack") {
        throw new HttpError(409, plain(p.name) + " is priced on request, so it can't be paid for online. Please order it on WhatsApp.", { whatsapp: true });
      }
      onRequest = true;
    } else {
      subtotal += p.price * qty;
    }
    items.push({ id: p.id, name: plain(p.name), colour: p.colour, price: p.price, qty, image: (p.images || [])[0] || null });
  }

  if (quote) {
    const d = await applyDiscount(data.code, subtotal);
    if (!d) throw new HttpError(400, "Enter a discount code.", { fields: ["code"] });
    return send(res, 200, { subtotal, discount: d });
  }

  // Who it's for
  const c = data.customer || {};
  const customer = {
    name: cleanText(c.name, 120),
    email: cleanText(c.email, 160).toLowerCase(),
    phone: cleanText(c.phone, 40),
    address: cleanText(c.address, 400),
    city: cleanText(c.city, 120),
    state: cleanText(c.state, 120),
    country: cleanText(c.country, 80),
    note: cleanText(c.note, 1000),
  };
  let delivery = { name: "", fee: 0 };
  if (channel === "paystack") {
    const missing = [];
    if (!customer.name) missing.push("name");
    if (!EMAIL_RE.test(customer.email)) missing.push("email");
    if (customer.phone.replace(/\D/g, "").length < 7) missing.push("phone");
    if (!customer.country) missing.push("country");
    if (!customer.city) missing.push("city");
    if (!customer.address) missing.push("address");
    const zones = await getDelivery();
    if (zones.length) {
      const z = zones.find((x) => x.name === data.delivery);
      if (!z) missing.push("delivery");
      else delivery = z;
    }
    if (missing.length) throw new HttpError(400, "Please check the highlighted details.", { fields: missing });
  }
  const discount = channel === "paystack" && data.code ? await applyDiscount(data.code, subtotal) : null;
  const total = subtotal - (discount ? discount.amount : 0) + delivery.fee;
  if (channel === "paystack" && total < 100) throw new HttpError(400, "The order total is too small to pay online.");

  // Save it
  let reference = channel === "whatsapp" && REF_RE.test(String(data.reference || "")) ? data.reference : newReference();
  let order = null;
  for (let attempt = 0; attempt < 3 && !order; attempt++) {
    const ins = await q(
      `insert into orders (reference, channel, name, email, phone, address, city, state, country, note,
                           delivery_name, delivery_fee, items, subtotal, total, on_request, discount_code, discount)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17,$18)
       on conflict (reference) do nothing returning *`,
      [
        reference, channel, customer.name, customer.email, customer.phone, customer.address, customer.city,
        customer.state, customer.country, customer.note, delivery.name, delivery.fee, JSON.stringify(items),
        subtotal, total, onRequest, discount ? discount.code : "", discount ? discount.amount : 0,
      ]
    );
    if (ins.rowCount) order = ins.rows[0];
    else if (channel === "whatsapp") return send(res, 200, { reference }); // the same order sent twice
    else reference = newReference();
  }
  if (!order) throw new Error("Could not create a unique order reference");

  if (channel === "whatsapp") return send(res, 200, { reference: order.reference });

  // Start the Paystack payment
  const site = origin(req);
  try {
    const init = await paystack.initialize({
      email: customer.email,
      amount: total * 100,
      currency: "NGN",
      reference: order.reference,
      callback_url: site + "/order.html",
      metadata: {
        order: order.reference,
        cancel_action: site + "/order.html?ref=" + order.reference,
        custom_fields: [
          { display_name: "Order", variable_name: "order", value: order.reference },
          { display_name: "Name", variable_name: "name", value: customer.name },
          { display_name: "Phone", variable_name: "phone", value: customer.phone },
        ],
      },
    });
    send(res, 200, { reference: order.reference, url: init.authorization_url });
  } catch (e) {
    await q("delete from orders where id = $1", [order.id]).catch(() => {});
    if (e.paystack) {
      console.error("paystack init", e.message);
      throw new HttpError(502, "We couldn't reach Paystack just now. Please try again, or order on WhatsApp.", { whatsapp: true });
    }
    throw e;
  }
});
