/* Small request/response helpers shared by the functions in /api.
   They only use plain Node APIs, so the same handlers run on Vercel and in
   a local test server. */
"use strict";

const MAX_BODY = 6 * 1024 * 1024;

function send(res, status, body, headers) {
  const h = Object.assign(
    { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    headers || {}
  );
  res.statusCode = status;
  for (const k of Object.keys(h)) res.setHeader(k, h[k]);
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function fail(res, status, message, extra) {
  send(res, status, Object.assign({ error: message }, extra || {}));
}

class HttpError extends Error {
  constructor(status, message, extra) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// The exact bytes that were sent, when the platform hasn't already read them.
function rawBody(req) {
  if (Buffer.isBuffer(req.rawBody)) return Promise.resolve(req.rawBody);
  if (req.readableEnded || typeof req.on !== "function") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, "That upload is too large."));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

// JSON body -> { data, raw }. raw is null when only the parsed body is available.
async function readJson(req) {
  const raw = await rawBody(req);
  if (raw && raw.length) {
    try {
      return { data: JSON.parse(raw.toString("utf8")), raw };
    } catch (e) {
      throw new HttpError(400, "That request wasn't valid.");
    }
  }
  let b;
  try {
    b = req.body; // Vercel parses JSON bodies for us
  } catch (e) {
    throw new HttpError(400, "That request wasn't valid.");
  }
  if (typeof b === "string" || Buffer.isBuffer(b)) {
    const text = b.toString("utf8");
    if (!text) return { data: {}, raw: null };
    try {
      return { data: JSON.parse(text), raw: Buffer.from(text) };
    } catch (e) {
      throw new HttpError(400, "That request wasn't valid.");
    }
  }
  return { data: b && typeof b === "object" ? b : {}, raw: null };
}

function query(req) {
  return new URL(req.url || "/", "http://localhost").searchParams;
}

function cookies(req) {
  const out = {};
  String(req.headers.cookie || "")
    .split(";")
    .forEach((part) => {
      const i = part.indexOf("=");
      if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    });
  return out;
}

function clientIp(req) {
  const h = req.headers;
  return (
    String(h["x-real-ip"] || "").trim() ||
    String(h["x-forwarded-for"] || "").split(",")[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    "unknown"
  );
}

function isHttps(req) {
  return String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}

// https://adabeke.vercel.app (or whatever address this request came in on)
function origin(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return (isHttps(req) ? "https://" : "http://") + host;
}

// Wraps a handler so thrown HttpErrors become tidy JSON answers.
function handler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      if (e instanceof HttpError) return fail(res, e.status, e.message, e.extra);
      console.error(e);
      fail(res, 500, "Something went wrong on our side. Please try again.");
    }
  };
}

module.exports = { send, fail, HttpError, rawBody, readJson, query, cookies, clientIp, isHttps, origin, handler };
