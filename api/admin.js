/* /api/admin?a=<action>
   Everything the admin dashboard does. All actions except "status" and
   "login" need the admin cookie; changes also need the X-AB header, which
   other websites can't send. */
"use strict";

const crypto = require("crypto");
const { send, HttpError, readJson, query, clientIp, origin, handler } = require("../lib/http");
const { hasDb, ensure, q, tx } = require("../lib/db");
const shop = require("../lib/shop");
const auth = require("../lib/auth");
const paystack = require("../lib/paystack");

const IMG_RE = /^(\/api\/img\?id=[a-f0-9]{32}|assets\/img\/[\w.\-\/]+\.(webp|jpe?g|png|avif))$/;
const plain = (s) => String(s || "").replace(/\*/g, "");

/* ---------- reads ---------- */

async function status(req) {
  const out = {
    db: hasDb(),
    dbError: null,
    password: auth.passwordState(),
    minPassword: auth.MIN_LENGTH,
    paystack: { on: paystack.enabled(), mode: paystack.mode() },
    webhook: origin(req) + "/api/paystack-webhook",
    signedIn: false,
  };
  if (out.db) {
    try {
      await ensure();
      out.signedIn = await auth.signedIn(req);
    } catch (e) {
      console.error("admin status", e.message);
      out.dbError = "We couldn't reach the database. Check the connection in Vercel.";
    }
  }
  return out;
}

const MONTH_START = "(date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos')";
const FILTERS = {
  all: "true",
  ship: "payment = 'paid' and status in ('new','confirmed')",
  unpaid: "payment in ('unpaid','failed') and status <> 'cancelled'",
  shipped: "status = 'shipped'",
  delivered: "status = 'delivered'",
  cancelled: "status = 'cancelled'",
};

async function overview() {
  const s = await q(`
    select
      coalesce(sum(total) filter (where payment = 'paid' and paid_at >= ${MONTH_START}), 0)::bigint as month_sales,
      count(*) filter (where payment = 'paid' and paid_at >= ${MONTH_START})::int as month_orders,
      coalesce(sum(total) filter (where payment = 'paid' and paid_at >= ${MONTH_START} - interval '1 month'
                                    and paid_at < ${MONTH_START}), 0)::bigint as last_month_sales,
      count(*) filter (where ${FILTERS.ship})::int as to_ship,
      count(*) filter (where ${FILTERS.unpaid} and created_at > now() - interval '30 days')::int as unpaid,
      coalesce(sum(total) filter (where payment = 'paid'), 0)::bigint as all_sales,
      count(*) filter (where payment = 'paid')::int as all_orders
    from orders`);
  const p = await q(`select count(*) filter (where status = 'available')::int as live, count(*)::int as total from products`);
  const recent = await q("select * from orders order by created_at desc limit 6");
  return { stats: Object.assign({}, s.rows[0], { products_live: p.rows[0].live, products_total: p.rows[0].total }), recent: recent.rows.map(orderRow) };
}

function orderRow(o) {
  return {
    id: Number(o.id),
    reference: o.reference,
    channel: o.channel,
    payment: o.payment,
    status: o.status,
    name: o.name,
    phone: o.phone,
    total: Number(o.total),
    onRequest: o.on_request,
    count: (o.items || []).reduce((n, i) => n + (i.qty || 0), 0),
    summary: (o.items || []).map((i) => i.name + (i.qty > 1 ? " ×" + i.qty : "")).join(", "),
    createdAt: o.created_at,
  };
}

async function orders(p) {
  const filter = FILTERS[p.get("filter")] ? p.get("filter") : "all";
  const where = [FILTERS[filter]];
  const args = [];
  const term = String(p.get("q") || "").trim().slice(0, 80);
  if (term) {
    args.push("%" + term.replace(/[\\%_]/g, "\\$&") + "%");
    where.push(`(reference ilike $${args.length} or name ilike $${args.length} or phone ilike $${args.length} or email ilike $${args.length})`);
  }
  const before = Number(p.get("before"));
  if (before > 0) {
    args.push(before);
    where.push(`id < $${args.length}`);
  }
  const r = await q(`select * from orders where ${where.join(" and ")} order by id desc limit 41`, args);
  const counts = await q(
    `select ${Object.keys(FILTERS).map((k) => `count(*) filter (where ${FILTERS[k]})::int as "${k}"`).join(", ")} from orders`
  );
  return { orders: r.rows.slice(0, 40).map(orderRow), more: r.rowCount > 40, counts: counts.rows[0] };
}

function orderFull(o) {
  return Object.assign(orderRow(o), {
    email: o.email,
    address: o.address,
    city: o.city,
    state: o.state,
    country: o.country,
    note: o.note,
    deliveryName: o.delivery_name,
    deliveryFee: Number(o.delivery_fee),
    items: o.items || [],
    subtotal: Number(o.subtotal),
    currency: o.currency,
    paidAt: o.paid_at,
    paystack: o.paystack,
    adminNote: o.admin_note,
    updatedAt: o.updated_at,
  });
}

async function getOrder(id) {
  const r = await q("select * from orders where id = $1", [Number(id) || 0]);
  if (!r.rowCount) throw new HttpError(404, "That order doesn't exist any more.");
  return r.rows[0];
}

async function products() {
  const r = await q("select * from products order by position, created_at");
  return { products: r.rows.map((row) => Object.assign(shop.toProduct(row), { updatedAt: row.updated_at })) };
}

/* ---------- changes ---------- */

async function updateOrder(b) {
  const o = await getOrder(b.id);
  const sets = [];
  const args = [o.id];
  const put = (sql, v) => {
    args.push(v);
    sets.push(sql.replace("?", "$" + args.length));
  };
  if (b.status !== undefined) {
    if (!shop.ORDER_STATUS.includes(b.status)) throw new HttpError(400, "Unknown order status.");
    put("status = ?", b.status);
  }
  if (b.payment !== undefined && b.payment !== o.payment) {
    if (!shop.PAYMENT_STATUS.includes(b.payment)) throw new HttpError(400, "Unknown payment status.");
    if (o.channel === "paystack" && !(b.payment === "refunded" && o.payment === "paid") && !(b.payment === "paid" && o.payment === "refunded")) {
      throw new HttpError(409, "Online payments are confirmed by Paystack. Use “Check payment” instead.");
    }
    put("payment = ?", b.payment);
    if (b.payment === "paid") sets.push("paid_at = coalesce(paid_at, now())");
  }
  if (b.adminNote !== undefined) put("admin_note = ?", shop.cleanText(b.adminNote, 2000));
  if (b.customer && typeof b.customer === "object") {
    const lim = { name: 120, email: 160, phone: 40, address: 400, city: 120, state: 120, country: 80 };
    Object.keys(lim).forEach((k) => {
      if (b.customer[k] !== undefined) put(k + " = ?", shop.cleanText(b.customer[k], lim[k]));
    });
  }
  if (!sets.length) return { order: orderFull(o) };
  const r = await q(`update orders set ${sets.join(", ")}, updated_at = now() where id = $1 returning *`, args);
  return { order: orderFull(r.rows[0]) };
}

function slugify(s) {
  return plain(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function cleanProduct(p) {
  const name = shop.cleanText(p.name, 120);
  if (!plain(name).trim()) throw new HttpError(400, "Give the piece a name.", { fields: ["name"] });
  let price = null;
  if (p.price !== null && p.price !== undefined && String(p.price).trim() !== "") {
    price = Math.round(Number(String(p.price).replace(/[^\d.]/g, "")));
    if (!Number.isFinite(price) || price < 0 || price > 100000000) throw new HttpError(400, "That price doesn't look right.", { fields: ["price"] });
  }
  const status = shop.PRODUCT_STATUS.includes(p.status) ? p.status : "available";
  const images = (Array.isArray(p.images) ? p.images : []).map(String).filter((u) => IMG_RE.test(u)).slice(0, 12);
  return {
    name,
    colour: shop.cleanText(p.colour, 120),
    price,
    status,
    badge: shop.cleanText(p.badge, 40),
    includes: shop.cleanText(p.includes, 200),
    fabric: shop.cleanText(p.fabric, 120),
    fit: shop.cleanText(p.fit, 60),
    description: shop.cleanText(p.description, 2000),
    images,
  };
}

async function tidyImages() {
  await q(`delete from images i where i.created_at < now() - interval '1 day' and not exists (
             select 1 from products p, jsonb_array_elements_text(p.images) u where u = '/api/img?id=' || i.id)`);
}

async function saveProduct(b) {
  const p = cleanProduct(b.product || {});
  const vals = [p.name, p.colour, p.price, p.status, p.badge, p.includes, p.fabric, p.fit, p.description, JSON.stringify(p.images)];
  let row;
  if (b.isNew) {
    const id = slugify(b.product && b.product.id) || slugify(p.name);
    if (!id) throw new HttpError(400, "Give the piece a name with some letters in it.", { fields: ["name"] });
    const r = await q(
      `insert into products (id, name, colour, price, status, badge, includes, fabric, fit, description, images, position)
       values ($11,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb, (select coalesce(max(position), -1) + 1 from products))
       on conflict (id) do nothing returning *`,
      vals.concat([id])
    );
    if (!r.rowCount) throw new HttpError(409, "There's already a piece with the link name “" + id + "”. Change the name a little.", { fields: ["name"] });
    row = r.rows[0];
  } else {
    const r = await q(
      `update products set name=$1, colour=$2, price=$3, status=$4, badge=$5, includes=$6, fabric=$7, fit=$8,
              description=$9, images=$10::jsonb, updated_at=now() where id=$11 returning *`,
      vals.concat([String((b.product && b.product.id) || "")])
    );
    if (!r.rowCount) throw new HttpError(404, "That piece doesn't exist any more.");
    row = r.rows[0];
  }
  tidyImages().catch((e) => console.error("tidy images", e.message));
  return { product: shop.toProduct(row) };
}

async function reorder(b) {
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(String).slice(0, 500);
  await tx(async (c) => {
    for (let i = 0; i < ids.length; i++) await c.query("update products set position = $1 where id = $2", [i, ids[i]]);
  });
  return { ok: true };
}

function sniff(buf) {
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

async function uploadImage(b) {
  const buf = Buffer.from(String(b.data || "").replace(/^data:[^,]*,/, ""), "base64");
  if (!buf.length) throw new HttpError(400, "That photo didn't come through. Try again.");
  if (buf.length > 4 * 1024 * 1024) throw new HttpError(413, "That photo is too large.");
  const mime = sniff(buf);
  if (!mime) throw new HttpError(415, "Please upload a JPG, PNG or WebP photo.");
  const id = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 32);
  await q("insert into images (id, mime, data) values ($1, $2, $3) on conflict (id) do nothing", [id, mime, buf]);
  return { url: "/api/img?id=" + id };
}

/* ---------- router ---------- */

module.exports = handler(async (req, res) => {
  const p = query(req);
  const a = String(p.get("a") || "");

  if (req.method === "GET") {
    if (a === "status") return send(res, 200, await status(req));
    await auth.requireAdmin(req);
    if (a === "overview") return send(res, 200, await overview());
    if (a === "orders") return send(res, 200, await orders(p));
    if (a === "order") return send(res, 200, { order: orderFull(await getOrder(p.get("id"))) });
    if (a === "products") return send(res, 200, await products());
    if (a === "settings") return send(res, 200, { delivery: await shop.getDelivery() });
    throw new HttpError(404, "Unknown action.");
  }

  if (req.method !== "POST") throw new HttpError(405, "Use GET or POST.");
  if (req.headers["x-ab"] !== "1") throw new HttpError(403, "Not allowed.");
  if (!hasDb()) throw new HttpError(503, "The database isn't connected yet.", { setup: "no-db" });
  const { data: b } = await readJson(req);

  if (a === "login") {
    if (auth.passwordState() !== "ok") throw new HttpError(503, "The admin password isn't set up yet.", { setup: "password" });
    await shop.limit(shop.ipBucket("login", clientIp(req)), 8, 15);
    if (!auth.checkPassword(String(b.password || ""))) {
      await new Promise((r) => setTimeout(r, 400));
      throw new HttpError(401, "That password isn't right.");
    }
    return send(res, 200, { ok: true }, { "Set-Cookie": await auth.issue(req) });
  }
  if (a === "logout") return send(res, 200, { ok: true }, { "Set-Cookie": auth.clear(req) });

  await auth.requireAdmin(req);
  if (a === "order-update") return send(res, 200, await updateOrder(b));
  if (a === "order-verify") {
    const o = await getOrder(b.id);
    if (o.channel !== "paystack") throw new HttpError(400, "This order wasn't paid online.");
    if (!paystack.enabled()) throw new HttpError(409, "Paystack isn't connected.");
    let fresh;
    try {
      fresh = await paystack.verify(o.reference);
    } catch (e) {
      if (e.paystack) throw new HttpError(502, "Paystack says: " + e.message);
      throw e;
    }
    return send(res, 200, { order: orderFull(await paystack.settle(o, fresh)) });
  }
  if (a === "order-delete") {
    const r = await q("delete from orders where id = $1 and payment <> 'paid' returning id", [Number(b.id) || 0]);
    if (!r.rowCount) throw new HttpError(409, "Paid orders can't be deleted. Mark it cancelled instead.");
    return send(res, 200, { ok: true });
  }
  if (a === "product-save") return send(res, 200, await saveProduct(b));
  if (a === "product-delete") {
    await q("delete from products where id = $1", [String(b.id || "")]);
    tidyImages().catch(() => {});
    return send(res, 200, { ok: true });
  }
  if (a === "products-reorder") return send(res, 200, await reorder(b));
  if (a === "image-upload") return send(res, 200, await uploadImage(b));
  if (a === "settings-save") {
    const delivery = shop.cleanDelivery(b.delivery);
    await shop.setSetting("delivery", delivery);
    return send(res, 200, { delivery });
  }
  throw new HttpError(404, "Unknown action.");
});
