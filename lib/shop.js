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
  };
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
  PRODUCT_STATUS, ORDER_STATUS, PAYMENT_STATUS, REF_RE, newReference, toProduct,
  getSetting, setSetting, cleanText, cleanDelivery, getDelivery, limit, ipBucket,
};
