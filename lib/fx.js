/* Approximate prices for customers abroad (US dollars and British pounds).
   Settings (admin): "auto" uses the day's market rate, "manual" uses rates
   typed in the admin, "off" hides foreign prices. Customers always pay in naira. */
"use strict";

const { getSetting, setSetting } = require("./shop");

const SOURCES = [
  process.env.FX_URL,
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/ngn.json",
  "https://latest.currency-api.pages.dev/v1/currencies/ngn.json",
].filter(Boolean);
const FRESH_MS = 6 * 3600 * 1000;

function cleanSettings(s) {
  s = s && typeof s === "object" ? s : {};
  const mode = ["auto", "manual", "off"].includes(s.mode) ? s.mode : "auto";
  const num = (v) => {
    const n = Math.round(Number(String(v == null ? "" : v).replace(/[^\d.]/g, "")));
    return n > 0 && n < 1e7 ? n : null;
  };
  return { mode, usd: num(s.usd), gbp: num(s.gbp) };
}

// Today's market rates as naira per dollar / per pound, checked at most every 6 hours.
async function marketRates() {
  const cached = await getSetting("fx_auto", null);
  if (cached && Date.now() - cached.fetchedAt < FRESH_MS) return cached;
  for (const src of SOURCES) {
    try {
      const r = await fetch(src, { signal: AbortSignal.timeout(3500) });
      if (!r.ok) continue;
      const j = await r.json();
      const usd = j && j.ngn && Number(j.ngn.usd);
      const gbp = j && j.ngn && Number(j.ngn.gbp);
      if (usd > 0 && gbp > 0) {
        const v = { usd: Math.round(1 / usd), gbp: Math.round(1 / gbp), date: j.date || null, fetchedAt: Date.now() };
        await setSetting("fx_auto", v);
        return v;
      }
    } catch (e) {
      /* try the next source */
    }
  }
  return cached; // a slightly old rate beats none
}

// What the shop should use right now: { usd, gbp, mode, date } or null.
async function rates() {
  const s = cleanSettings(await getSetting("fx", null));
  if (s.mode === "off") return null;
  if (s.mode === "manual") return s.usd && s.gbp ? { usd: s.usd, gbp: s.gbp, mode: "manual", date: null } : null;
  const m = await marketRates();
  return m ? { usd: m.usd, gbp: m.gbp, mode: "auto", date: m.date } : null;
}

module.exports = { cleanSettings, marketRates, rates };
