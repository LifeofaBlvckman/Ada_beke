/* POST /api/subscribe  { contact, source }
   Early access: adds an email address or WhatsApp number to the list that
   hears about new drops first. The list is in the admin under Marketing. */
"use strict";

const { send, HttpError, readJson, clientIp, handler } = require("../lib/http");
const { q } = require("../lib/db");
const { cleanContact, cleanText, limit, ipBucket } = require("../lib/shop");

module.exports = handler(async (req, res) => {
  if (req.method !== "POST") throw new HttpError(405, "Use POST.");
  const { data } = await readJson(req);
  const c = cleanContact(data.contact);
  if (!c) throw new HttpError(400, "Enter an email address or a WhatsApp number with its country code.", { fields: ["contact"] });
  await limit(ipBucket("subscribe", clientIp(req)), 12, 60);
  const r = await q(
    "insert into subscribers (contact, kind, source) values ($1, $2, $3) on conflict (contact) do nothing returning id",
    [c.contact, c.kind, cleanText(data.source, 60)]
  );
  send(res, 200, { ok: true, already: r.rowCount === 0, kind: c.kind });
});
