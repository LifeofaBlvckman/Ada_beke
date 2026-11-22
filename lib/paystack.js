/* Paystack: start a payment, confirm it, and mark the order paid.
   Switches on when PAYSTACK_SECRET_KEY (sk_test_... or sk_live_...) is set. */
"use strict";

const crypto = require("crypto");
const { q } = require("./db");

function apiBase() {
  return (process.env.PAYSTACK_API_URL || "https://api.paystack.co").replace(/\/+$/, "");
}
function key() {
  return String(process.env.PAYSTACK_SECRET_KEY || "").trim();
}
function mode() {
  const k = key();
  if (k.startsWith("sk_live_")) return "live";
  if (k.startsWith("sk_test_")) return "test";
  return null;
}
function enabled() {
  return mode() !== null;
}

async function call(method, path, body) {
  const r = await fetch(apiBase() + path, {
    method,
    headers: { Authorization: "Bearer " + key(), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.status) {
    const err = new Error(j.message || "Paystack answered " + r.status);
    err.paystack = true;
    throw err;
  }
  return j.data;
}

function initialize(opts) {
  return call("POST", "/transaction/initialize", opts);
}
function verify(reference) {
  return call("GET", "/transaction/verify/" + encodeURIComponent(reference));
}

// Paystack signs each webhook with HMAC-SHA512 of the body, keyed with the secret key.
function validSignature(payload, signature) {
  if (!enabled() || !payload || !signature) return false;
  const want = crypto.createHmac("sha512", key()).update(payload).digest("hex");
  const got = String(signature);
  return want.length === got.length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(got));
}

// Record what Paystack says about an order's payment. Only a successful
// payment of the exact amount and currency marks the order paid.
async function settle(order, data) {
  if (!data || data.reference !== order.reference) return order;
  const summary = {
    status: data.status,
    amount: data.amount,
    currency: data.currency,
    channel: data.channel || null,
    paid_at: data.paid_at || data.paidAt || null,
    fees: data.fees == null ? null : data.fees,
    gateway_response: data.gateway_response || null,
    card: data.authorization ? [data.authorization.brand, data.authorization.last4 && "•••• " + data.authorization.last4].filter(Boolean).join(" ") : null,
    bank: data.authorization && data.authorization.bank ? data.authorization.bank : null,
    customer_email: data.customer && data.customer.email ? data.customer.email : null,
    mode: mode(),
    checked_at: new Date().toISOString(),
  };
  const amountOk = Number(data.amount) === Number(order.total) * 100 && String(data.currency || "").toUpperCase() === order.currency;
  let r;
  if (data.status === "success" && amountOk) {
    r = await q(
      `update orders set payment = 'paid', paid_at = coalesce(paid_at, $2::timestamptz, now()), paystack = $3::jsonb, updated_at = now()
       where id = $1 and payment <> 'paid' returning *`,
      [order.id, summary.paid_at, JSON.stringify(summary)]
    );
    if (r.rowCount && r.rows[0].discount_code) {
      await q("update discounts set uses = uses + 1 where code = $1", [r.rows[0].discount_code]);
    }
    if (!r.rowCount) r = await q("select * from orders where id = $1", [order.id]);
  } else {
    if (data.status === "success" && !amountOk) summary.problem = "Paid amount doesn't match the order total. Check this payment in Paystack.";
    const failed = data.status === "failed" && order.payment === "unpaid";
    r = await q(
      `update orders set paystack = $2::jsonb, payment = case when $3 then 'failed' else payment end, updated_at = now()
       where id = $1 and payment <> 'paid' returning *`,
      [order.id, JSON.stringify(summary), failed]
    );
  }
  return r.rows[0] || order;
}

// Ask Paystack about an unpaid online order and save the answer.
async function refresh(order) {
  if (!enabled() || order.channel !== "paystack" || order.payment === "paid") return order;
  try {
    return await settle(order, await verify(order.reference));
  } catch (e) {
    console.error("paystack verify", order.reference, e.message);
    return order;
  }
}

module.exports = { enabled, mode, initialize, verify, validSignature, settle, refresh };
