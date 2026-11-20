/* POST /api/paystack-webhook
   Paystack calls this when a payment succeeds, even if the customer closes
   their browser before coming back. Paste this address into
   Paystack > Settings > API Keys & Webhooks > Webhook URL. */
"use strict";

const { send, readJson, handler } = require("../lib/http");
const { q } = require("../lib/db");
const paystack = require("../lib/paystack");

module.exports = handler(async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST." });
  if (!paystack.enabled()) return send(res, 503, { error: "Paystack isn't set up." });

  const { data, raw } = await readJson(req);
  const sig = req.headers["x-paystack-signature"];
  // Paystack signs the exact JSON it sends; some hosts only hand us the parsed body.
  const ok = (raw && paystack.validSignature(raw, sig)) || paystack.validSignature(JSON.stringify(data), sig);
  if (!ok) return send(res, 401, { error: "Bad signature." });

  if (data.event === "charge.success" && data.data && data.data.reference) {
    const r = await q("select * from orders where reference = $1", [String(data.data.reference)]);
    if (r.rowCount) {
      // Double-check with Paystack directly before marking anything paid.
      const fresh = await paystack.verify(r.rows[0].reference);
      await paystack.settle(r.rows[0], fresh);
    }
  }
  send(res, 200, { received: true });
});
