/* Admin sign-in: one password (ADMIN_PASSWORD in Vercel), a signed cookie. */
"use strict";

const crypto = require("crypto");
const { q } = require("./db");
const { getSetting, setSetting } = require("./shop");
const { HttpError, cookies, isHttps } = require("./http");

const COOKIE = "ab_admin";
const DAYS = 14;
const MIN_LENGTH = 8;

function password() {
  return String(process.env.ADMIN_PASSWORD || "");
}
function passwordState() {
  const p = password();
  if (!p) return "missing";
  if (p.length < MIN_LENGTH) return "short";
  return "ok";
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function sha256(s) {
  return crypto.createHash("sha256").update(String(s)).digest();
}

// A random secret kept in the database; changing ADMIN_PASSWORD signs everyone out.
async function signingKey() {
  let s = await getSetting("session_secret", null);
  if (!s) {
    await q("insert into settings (key, value) values ('session_secret', $1::jsonb) on conflict (key) do nothing", [
      JSON.stringify(crypto.randomBytes(32).toString("hex")),
    ]);
    s = await getSetting("session_secret", null);
  }
  return crypto.createHmac("sha256", String(s)).update("admin:" + password()).digest();
}

function checkPassword(given) {
  if (passwordState() !== "ok") return false;
  return crypto.timingSafeEqual(sha256(given), sha256(password()));
}

async function issue(req) {
  const payload = b64url(JSON.stringify({ exp: Date.now() + DAYS * 864e5 }));
  const sig = b64url(crypto.createHmac("sha256", await signingKey()).update(payload).digest());
  return cookieHeader(req, payload + "." + sig, DAYS * 86400);
}
function cookieHeader(req, value, maxAge) {
  return (
    COOKIE + "=" + value + "; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=" + maxAge + (isHttps(req) ? "; Secure" : "")
  );
}
function clear(req) {
  return cookieHeader(req, "", 0);
}

async function signedIn(req) {
  if (passwordState() !== "ok") return false;
  const token = cookies(req)[COOKIE];
  if (!token || token.indexOf(".") < 1) return false;
  const [payload, sig] = token.split(".");
  const want = b64url(crypto.createHmac("sha256", await signingKey()).update(payload).digest());
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
    return Number(data.exp) > Date.now();
  } catch (e) {
    return false;
  }
}

async function requireAdmin(req) {
  if (!(await signedIn(req))) throw new HttpError(401, "Please sign in again.", { signin: true });
}

module.exports = { passwordState, checkPassword, issue, clear, signedIn, requireAdmin, MIN_LENGTH };
