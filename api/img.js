/* GET /api/img?id=...
   Photos uploaded in the admin. Each id is a fingerprint of the photo, so
   browsers and Vercel's edge can keep a copy forever. */
"use strict";

const { send, query, handler } = require("../lib/http");
const { q } = require("../lib/db");

module.exports = handler(async (req, res) => {
  const id = String(query(req).get("id") || "");
  if (!/^[a-f0-9]{32}$/.test(id)) return send(res, 404, { error: "Not found." });
  const r = await q("select mime, data from images where id = $1", [id]);
  if (!r.rowCount) return send(res, 404, { error: "Not found." });
  send(res, 200, r.rows[0].data, {
    "Content-Type": r.rows[0].mime,
    "Cache-Control": "public, max-age=31536000, immutable",
  });
});
