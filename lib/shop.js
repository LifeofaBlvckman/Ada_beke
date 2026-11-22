/* Shop rules shared by the checkout, order page and admin. */
"use strict";

const crypto = require("crypto");
const { q } = require("./db");
const { HttpError } = require("./http");

const PRODUCT_STATUS = ["available", "soon", "sold_out", "hidden"];
const ORDER_STATUS = ["new", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUS = ["unpaid", "paid", "failed", "refunded"];

// Order references look like AB-7KQ2M9XP: no 0/O or 1/I to mix up on the phone.
const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const REF_RE = /^AB-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/;
function newReference() {
  const bytes = crypto.randomBytes(8);
  let s = "AB-";
  for (const b of bytes) s += REF_ALPHABET[b % REF_ALPHABET.length];
  return s;
}

function toProduct(r) {
  return {
    id: r.id,
    name: r.name,
    colour: r.colour || "",
    price: r.price == null ? null : Number(r.price),
    status: r.status,
    badge: r.badge || null,
    includes: r.includes || null,
    fabric: r.fabric || null,
    fit: r.fit || null,
    description: r.description || "",
    images: Array.isArray(r.images) ? r.images : [],
    collection: r.collection || "",
    fitNote: r.fit_note || null,
  };
}

function toCollection(r) {
  return { id: r.id, name: r.name, tagline: r.tagline || "", image: r.image || "" };
}

/* ---------- discount codes ---------- */
function normCode(c) {
  return String(c || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30);
}
function money(n) {
  return "₦" + Number(n || 0).toLocaleString("en-NG");
}
function discountLabel(d) {
  return d.kind === "percent" ? d.value + "% off" : money(d.value) + " off";
}
// Checks a code against an order subtotal. Returns { code, amount, label } or throws.
async function applyDiscount(code, subtotal) {
  code = normCode(code);
  if (!code) return null;
  const r = await q("select * from discounts where code = $1", [code]);
  const d = r.rows[0];
  const no = (msg) => new HttpError(400, msg, { fields: ["code"] });
  if (!d || !d.active) throw no("That code isn't valid.");
  if (d.expires_at && new Date(d.expires_at).getTime() < Date.now()) throw no("That code has expired.");
  if (d.max_uses != null && d.uses >= d.max_uses) throw no("That code has been used up.");
  if (subtotal < d.min_subtotal) throw no("That code works on orders of " + money(d.min_subtotal) + " or more.");
  const amount = d.kind === "percent" ? Math.round((subtotal * Math.min(100, d.value)) / 100) : Math.min(d.value, subtotal);
  return { code: d.code, amount, label: discountLabel(d) };
}

/* ---------- early access contacts ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// "ada@x.com" -> email; "0803 123 4567" / "+44 7700 900123" -> WhatsApp number in international form
function cleanContact(v) {
  const raw = String(v || "").trim().slice(0, 160);
  if (raw.indexOf("@") >= 0) {
    const e = raw.toLowerCase();
    return EMAIL_RE.test(e) ? { contact: e, kind: "email" } : null;
  }
  let d = raw.replace(/[^\d+]/g, "");
  const plus = d.charAt(0) === "+";
  d = d.replace(/\D/g, "");
  if (!plus && /^0\d{10}$/.test(d)) d = "234" + d.slice(1); // Nigerian local number
  if (!plus && /^00\d+$/.test(d)) d = d.slice(2);
  if (d.length < 8 || d.length > 15) return null;
  return { contact: "+" + d, kind: "whatsapp" };
}

async function getSetting(key, fallback) {
  const r = await q("select value from settings where key = $1", [key]);
  return r.rows[0] ? r.rows[0].value : fallback;
}
async function setSetting(key, value) {
  await q(
    "insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value",
    [key, JSON.stringify(value)]
  );
}

function cleanText(v, max) {
  return String(v == null ? "" : v)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max);
}

function cleanDelivery(list) {
  if (!Array.isArray(list)) return [];
  return list
    .slice(0, 20)
    .map((d) => ({ name: cleanText(d && d.name, 80), fee: Math.max(0, Math.round(Number(d && d.fee) || 0)) }))
    .filter((d) => d.name);
}
async function getDelivery() {
  return cleanDelivery(await getSetting("delivery", []));
}

// Simple sliding-window limit: at most `max` hits per `minutes` for a bucket.
async function limit(bucket, max, minutes) {
  const r = await q(
    "select count(*)::int as n from hits where bucket = $1 and at > now() - make_interval(mins => $2)",
    [bucket, minutes]
  );
  if (r.rows[0].n >= max) throw new HttpError(429, "Too many tries. Please wait a few minutes and try again.");
  await q("insert into hits (bucket) values ($1)", [bucket]);
  if (Math.random() < 0.05) q("delete from hits where at < now() - interval '1 day'").catch(() => {});
}
function ipBucket(prefix, ip) {
  return prefix + ":" + crypto.createHash("sha256").update(String(ip)).digest("hex").slice(0, 16);
}

module.exports = {
  PRODUCT_STATUS, ORDER_STATUS, PAYMENT_STATUS, REF_RE, newReference, toProduct, toCollection,
  normCode, discountLabel, applyDiscount, cleanContact, EMAIL_RE,
  getSetting, setSetting, cleanText, cleanDelivery, getDelivery, limit, ipBucket,
};
