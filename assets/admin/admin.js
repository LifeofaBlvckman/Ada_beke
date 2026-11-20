/* ==========================================================================
   ADA BEKE — admin dashboard
   Sign in, see sales, manage orders and pieces, set delivery fees.
   Talks to /api/admin. Vanilla JS, no build step.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var app = doc.getElementById("app");
  var API = "/api/admin";
  var VIEWS = ["overview", "orders", "products", "settings"];
  var TZ = "Africa/Lagos";

  var state = {
    status: null,
    view: null,
    toShip: 0,
    orders: { filter: "all", q: "", list: [], more: false, counts: null },
    products: [],
    delivery: [],
    sheet: null, // { kind, id, dirty }
  };

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rich(name) { return esc(name).replace(/\*(.+?)\*/g, "<em>$1</em>"); }
  function plain(name) { return String(name || "").replace(/\*/g, ""); }
  function money(n) { return "₦" + (Number(n) || 0).toLocaleString("en-NG"); }
  function moneyShort(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return "₦" + (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e4) return "₦" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return money(n);
  }
  function imgSrc(p) { return !p ? "" : /^(https?:|\/)/.test(p) ? p : "/" + p; }
  var dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  var timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  var dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" });
  var longFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  function when(iso) {
    if (!iso) return "";
    var d = new Date(iso), now = new Date();
    var day = dayFmt.format(d);
    if (day === dayFmt.format(now)) return "Today, " + timeFmt.format(d);
    if (day === dayFmt.format(new Date(now.getTime() - 864e5))) return "Yesterday, " + timeFmt.format(d);
    return dateFmt.format(d) + ", " + timeFmt.format(d);
  }
  function hourInLagos() { return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date())); }
  // WhatsApp wants international digits: 0803... -> 234803...
  function waNumber(phone) {
    var d = String(phone || "").replace(/\D/g, "");
    if (/^0\d{10}$/.test(d)) d = "234" + d.slice(1);
    return d.length >= 8 ? d : "";
  }
  function waLink(phone, text) { return "https://wa.me/" + waNumber(phone) + "?text=" + encodeURIComponent(text); }

  var ICON = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1v-7.5Z"/></svg>',
    orders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 8h14l-1 12.5H6L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
    pieces: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 3.5 4 6l1.5 5L8 10v10.5h8V10l2.5 1L20 6l-5-2.5c-.5 1.4-1.6 2.3-3 2.3s-2.5-.9-3-2.3Z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 5h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m14 6-6 6 6 6"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m10 6 6 6-6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 14 6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m6 10 6 6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
    arrowDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2Z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm.01 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.22 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>',
  };

  /* ---------- talking to the server ---------- */
  function api(action, opts) {
    opts = opts || {};
    var url = API + "?a=" + encodeURIComponent(action);
    if (opts.query) Object.keys(opts.query).forEach(function (k) {
      if (opts.query[k] !== "" && opts.query[k] != null) url += "&" + encodeURIComponent(k) + "=" + encodeURIComponent(opts.query[k]);
    });
    var init = { credentials: "same-origin", cache: "no-store", headers: {} };
    if (opts.body !== undefined) {
      init.method = "POST";
      init.headers["Content-Type"] = "application/json";
      init.headers["X-AB"] = "1";
      init.body = JSON.stringify(opts.body);
    }
    return fetch(url, init).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) {
          var e = new Error(j.error || "Something went wrong. Please try again.");
          e.data = j;
          e.status = r.status;
          if (r.status === 401 && j.signin && action !== "login") showLogin("You were signed out. Please sign in again.");
          throw e;
        }
        return j;
      });
    }, function () {
      throw new Error("No connection. Check your internet and try again.");
    });
  }

  var toastTimer;
  function toast(msg, isError) {
    var t = $(".toast");
    if (!t) { doc.body.insertAdjacentHTML("beforeend", '<div class="toast" role="status" aria-live="polite"></div>'); t = $(".toast"); }
    t.innerHTML = (isError ? ICON.alert : ICON.check) + "<span>" + esc(msg) + "</span>";
    t.classList.toggle("is-error", !!isError);
    t.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-on"); }, isError ? 5200 : 3000);
  }
  function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle("is-busy", on);
  }

  /* ======================================================================
     Start: database? password? signed in?
     ====================================================================== */
  function boot() {
    api("status").then(function (s) {
      state.status = s;
      if (!s.db || s.dbError) return showSetup(s);
      if (s.password !== "ok") return showSetup(s);
      if (!s.signedIn) return showLogin();
      startApp();
    }, function (e) {
      gate('<p class="gate__title">Can&rsquo;t reach <em>the shop.</em></p><p class="gate__text">' + esc(e.message) + '</p><button class="btn" type="button" data-retry>Try again</button>');
      $("[data-retry]").addEventListener("click", boot);
    });
  }

  function gate(inner, wide) {
    closeSheet(true);
    app.innerHTML = '<div class="gate"><div class="gate__card' + (wide ? " gate__card--wide" : "") + '"><p class="gate__mark">ADA BEKE<span>Admin</span></p>' + inner + "</div></div>";
  }

  function showSetup(s) {
    var steps = [];
    var title;
    if (s.dbError) {
      title = "The database isn&rsquo;t <em>answering.</em>";
      steps.push(esc(s.dbError));
      steps.push("In Vercel, open <b>Storage</b> and check the Neon database is connected to this project, then redeploy.");
    } else if (!s.db) {
      title = "One-time <em>setup.</em>";
      steps.push("In Vercel, open the <b>adabeke</b> project, go to <b>Storage</b> and choose <b>Create Database</b>. Pick <b>Neon</b> (Postgres), keep the free plan, and connect it to this project.");
      if (s.password !== "ok") steps.push("Go to <b>Settings &rarr; Environment Variables</b> and add <code>ADMIN_PASSWORD</code> with a password of at least " + s.minPassword + " characters. This is what you&rsquo;ll sign in with.");
      steps.push("Open <b>Deployments</b>, press <b>&middot;&middot;&middot;</b> on the latest one and choose <b>Redeploy</b>. Then refresh this page.");
    } else {
      title = s.password === "short" ? "Choose a longer <em>password.</em>" : "Add an admin <em>password.</em>";
      steps.push("In Vercel, open the <b>adabeke</b> project, go to <b>Settings &rarr; Environment Variables</b>.");
      steps.push((s.password === "short" ? "Change" : "Add") + " <code>ADMIN_PASSWORD</code>: at least " + s.minPassword + " characters. This is what you&rsquo;ll sign in with.");
      steps.push("Open <b>Deployments</b>, press <b>&middot;&middot;&middot;</b> on the latest one and choose <b>Redeploy</b>. Then refresh this page.");
    }
    gate('<h1 class="gate__title">' + title + "</h1>" +
      '<p class="gate__text">The dashboard needs a database for orders and pieces. The shop keeps working while you set it up.</p>' +
      '<ol class="steps">' + steps.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ol>" +
      '<button class="btn" type="button" data-retry>I&rsquo;ve done this, check again</button>', true);
    $("[data-retry]").addEventListener("click", function () { busy(this, true); boot(); });
  }

  function showLogin(msg) {
    gate('<h1 class="gate__title">Welcome <em>back.</em></h1>' +
      '<form class="stack" data-login novalidate>' +
        (msg ? '<p class="gate__msg" role="alert">' + esc(msg) + "</p>" : '<p class="gate__msg" role="alert" hidden></p>') +
        '<div class="field"><label for="pw">Password</label><div class="pw"><input id="pw" name="password" type="password" autocomplete="current-password" required><button type="button" data-show>Show</button></div></div>' +
        '<button class="btn btn--block" type="submit">Sign in</button>' +
      "</form>" +
      '<p class="gate__text" style="font-size:13px">Forgotten it? The password is <code>ADMIN_PASSWORD</code> in Vercel &rarr; Settings &rarr; Environment Variables.</p>');
    var form = $("[data-login]");
    var pw = $("#pw");
    setTimeout(function () { pw.focus(); }, 50);
    $("[data-show]").addEventListener("click", function () {
      var show = pw.type === "password";
      pw.type = show ? "text" : "password";
      this.textContent = show ? "Hide" : "Show";
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = $(".gate__msg", form);
      if (!pw.value) { m.textContent = "Enter your password."; m.hidden = false; pw.focus(); return; }
      var btn = $('[type="submit"]', form);
      busy(btn, true);
      api("login", { body: { password: pw.value } }).then(function () {
        state.status.signedIn = true;
        startApp();
      }, function (err) {
        busy(btn, false);
        m.textContent = err.message;
        m.hidden = false;
        pw.select();
      });
    });
  }

  /* ======================================================================
     App shell + navigation
     ====================================================================== */
  function startApp() {
    app.innerHTML =
      '<div class="shell">' +
        '<header class="top">' +
          '<a class="brand" href="#overview">ADA BEKE<span>Admin</span></a>' +
          '<div class="top__actions">' +
            '<a class="icon-btn" href="/" target="_blank" rel="noopener" aria-label="View the shop">' + ICON.eye + '<span hidden>View the shop</span></a>' +
            '<button class="icon-btn" type="button" data-signout aria-label="Sign out">' + ICON.out + '<span hidden>Sign out</span></button>' +
          "</div>" +
        "</header>" +
        '<nav class="tabs" aria-label="Sections">' +
          tab("overview", "Overview", ICON.home) + tab("orders", "Orders", ICON.orders) +
          tab("products", "Pieces", ICON.pieces) + tab("settings", "Settings", ICON.settings) +
        "</nav>" +
        '<main class="main" id="view" tabindex="-1"></main>' +
      "</div>";
    $("[data-signout]").addEventListener("click", signOut);
    state.view = null;
    route();
  }
  function tab(id, label, icon) {
    return '<a class="tab" href="#' + id + '" data-tab="' + id + '">' + icon + "<span>" + label + "</span>" + (id === "orders" ? '<span class="tab__count" data-ship-count hidden></span>' : "") + "</a>";
  }
  function setShipCount(n) {
    state.toShip = Number(n) || 0;
    var el = $("[data-ship-count]");
    if (!el) return;
    el.textContent = state.toShip;
    el.hidden = !state.toShip;
    el.setAttribute("aria-label", state.toShip + " to ship");
  }
  function signOut() {
    api("logout", { body: {} }).catch(function () {}).then(function () {
      state.status.signedIn = false;
      showLogin();
    });
  }

  function route() {
    if (!$("#view")) return;
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var view = VIEWS.indexOf(parts[0]) >= 0 ? parts[0] : "overview";
    if (view !== state.view) {
      if (state.sheet && state.sheet.dirty && !confirm("Leave without saving your changes?")) {
        history.pushState(null, "", "#" + state.sheet.hash);
        return;
      }
      closeSheet(true);
      state.view = view;
      $$("[data-tab]").forEach(function (t) {
        if (t.getAttribute("data-tab") === view) t.setAttribute("aria-current", "page");
        else t.removeAttribute("aria-current");
      });
      renderView();
    }
    var sub = parts[1] ? decodeURIComponent(parts[1]) : "";
    if (sub) {
      if (!state.sheet || state.sheet.hash !== view + "/" + sub) openSheet(view, sub);
    } else if (state.sheet) {
      if (state.sheet.dirty && !confirm("Leave without saving your changes?")) {
        history.pushState(null, "", "#" + state.sheet.hash);
        return;
      }
      closeSheet();
    }
  }
  window.addEventListener("hashchange", route);

  function renderView() {
    var v = $("#view");
    v.innerHTML = "";
    if (state.view === "overview") overview(v);
    if (state.view === "orders") orders(v);
    if (state.view === "products") products(v);
    if (state.view === "settings") settings(v);
  }
  function viewShell(v, title, sub, action) {
    v.innerHTML = '<div class="view"><div class="head"><div><h1 class="head__title">' + title + "</h1>" + (sub ? '<p class="head__sub">' + sub + "</p>" : "") + "</div>" + (action || "") + '</div><div data-body></div></div>';
    return $("[data-body]", v);
  }
  function failBox(body, err, retry) {
    body.innerHTML = '<div class="empty-state"><strong>That didn&rsquo;t load.</strong><span>' + esc(err.message) + '</span><button class="btn btn--ghost btn--sm" type="button">Try again</button></div>';
    $("button", body).addEventListener("click", retry);
  }

  /* ======================================================================
     Overview
     ====================================================================== */
  function overview(v) {
    var h = hourInLagos();
    var hello = h < 12 ? "Good <em>morning.</em>" : h < 17 ? "Good <em>afternoon.</em>" : "Good <em>evening.</em>";
    var body = viewShell(v, hello, longFmt.format(new Date()));
    body.innerHTML = '<div class="kpis">' + [0, 1, 2, 3].map(function () { return '<span class="sk sk--kpi"></span>'; }).join("") + '</div><div class="card"><span class="sk sk--row"></span><span class="sk sk--row"></span><span class="sk sk--row"></span></div>';
    api("overview").then(function (d) {
      var s = d.stats;
      setShipCount(s.to_ship);
      var sales = Number(s.month_sales), last = Number(s.last_month_sales);
      var delta;
      if (last > 0) {
        var pct = Math.round(((sales - last) / last) * 100);
        delta = '<span class="kpi__delta ' + (pct >= 0 ? "up" : "down") + '">' + (pct >= 0 ? ICON.arrowUp : ICON.arrowDown) + (pct >= 0 ? "+" : "−") + Math.abs(pct) + "% vs last month</span>";
      } else {
        delta = '<span class="kpi__delta">' + (sales > 0 ? "No sales last month to compare" : "Nothing paid yet this month") + "</span>";
      }
      var pay = state.status.paystack;
      var notes = "";
      if (!pay.on) {
        notes += '<div class="note">' + ICON.info + '<div><b>Online payment is off.</b> Customers check out on WhatsApp for now. <a href="#settings">Switch on Paystack</a></div></div>';
      } else if (pay.mode === "test") {
        notes += '<div class="note note--warn">' + ICON.alert + '<div><b>Paystack is in test mode.</b> Payments are pretend until you add your live key. <a href="#settings">How</a></div></div>';
      }
      body.innerHTML =
        (notes ? '<div class="stack" style="margin-bottom:14px">' + notes + "</div>" : "") +
        '<div class="kpis">' +
          '<a class="kpi kpi--lead" href="#orders" style="--i:0"><span class="kpi__label">Sales this month</span><span class="kpi__value" title="' + money(sales) + '">' + moneyShort(sales) + "</span>" + delta + "</a>" +
          '<a class="kpi" href="#orders" style="--i:1"><span class="kpi__label">Paid orders this month</span><span class="kpi__value">' + s.month_orders + "</span></a>" +
          '<a class="kpi" href="#orders" data-go-filter="ship" style="--i:2"><span class="kpi__label">To pack &amp; ship</span><span class="kpi__value">' + s.to_ship + '</span><span class="kpi__more">' + (s.to_ship ? "See them" : "All caught up") + "</span></a>" +
          '<a class="kpi" href="#orders" data-go-filter="unpaid" style="--i:3"><span class="kpi__label">Unpaid, last 30 days</span><span class="kpi__value">' + s.unpaid + '</span><span class="kpi__more">' + (s.unpaid ? "Follow up" : "None") + "</span></a>" +
        "</div>" +
        '<div class="card"><h2 class="card__title">Latest orders <a href="#orders">See all</a></h2>' +
          (d.recent.length ? '<div class="list">' + d.recent.map(orderRowHTML).join("") + "</div>"
            : '<div class="empty-state"><strong>No orders yet.</strong><span>New orders appear here as soon as they come in.</span></div>') +
        "</div>" +
        '<div class="card"><h2 class="card__title">Shop <a href="#products">Manage pieces</a></h2>' +
          '<p>' + s.products_live + " of " + s.products_total + " pieces are available to buy. All-time sales: <b>" + money(s.all_sales) + "</b> from " + s.all_orders + " paid " + (s.all_orders === 1 ? "order" : "orders") + ".</p>" +
        "</div>";
      $$("[data-go-filter]", body).forEach(function (a) {
        a.addEventListener("click", function () { state.orders.filter = a.getAttribute("data-go-filter"); state.orders.q = ""; });
      });
    }, function (e) { failBox(body, e, renderView); });
  }

  /* ======================================================================
     Orders
     ====================================================================== */
  var PAY_LABEL = { paid: "Paid", unpaid: "Unpaid", failed: "Payment failed", refunded: "Refunded" };
  var STATUS_LABEL = { new: "New", confirmed: "Confirmed", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" };
  var FILTERS = [["all", "All"], ["ship", "To ship"], ["unpaid", "Unpaid"], ["shipped", "Shipped"], ["delivered", "Delivered"], ["cancelled", "Cancelled"]];

  function badges(o) {
    return '<span class="badge badge--' + o.payment + '">' + PAY_LABEL[o.payment] + "</span>" +
      '<span class="badge badge--plain badge--' + o.status + '">' + STATUS_LABEL[o.status] + "</span>" +
      '<span class="badge badge--plain">' + (o.channel === "paystack" ? "Online checkout" : o.channel === "whatsapp" ? "WhatsApp" : "Manual") + "</span>";
  }
  function orderRowHTML(o) {
    var who = o.name ? esc(o.name) : '<span class="empty">' + (o.channel === "whatsapp" ? "WhatsApp chat, no name yet" : "No name") + "</span>";
    return '<a class="row" href="#orders/' + o.id + '">' +
      '<div class="row__main"><p class="row__title">' + who + '</p><p class="row__sub">' + esc(o.summary) + "</p></div>" +
      '<div class="row__right"><p class="row__amount">' + money(o.total) + (o.onRequest ? "+" : "") + '</p><p class="row__time">' + when(o.createdAt) + "</p></div>" +
      '<div class="row__meta"><span class="ref">' + esc(o.reference) + "</span>" + badges(o) + "</div>" +
    "</a>";
  }

  function orders(v) {
    var body = viewShell(v, "Orders", "Newest first. Tap an order to update it.");
    var st = state.orders;
    body.innerHTML =
      '<label class="search"><span class="sr">Search orders</span>' + ICON.search + '<input class="input" type="search" placeholder="Name, phone, email or AB-reference" value="' + esc(st.q) + '" data-q></label>' +
      '<div class="chips" role="group" aria-label="Show orders">' + FILTERS.map(function (f) {
        return '<button class="chip" type="button" data-filter="' + f[0] + '" aria-pressed="' + (st.filter === f[0]) + '">' + f[1] + ' <span class="chip__n" data-n="' + f[0] + '"></span></button>';
      }).join("") + "</div>" +
      '<div class="card" data-list></div>';
    var list = $("[data-list]", body);
    var timer;
    $("[data-q]", body).addEventListener("input", function () {
      var val = this.value;
      clearTimeout(timer);
      timer = setTimeout(function () { st.q = val.trim(); load(false); }, 300);
    });
    $$("[data-filter]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        st.filter = b.getAttribute("data-filter");
        $$("[data-filter]", body).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        load(false);
      });
    });
    function draw() {
      if (st.counts) Object.keys(st.counts).forEach(function (k) { var n = $('[data-n="' + k + '"]', body); if (n) n.textContent = st.counts[k]; });
      if (!st.list.length) {
        list.innerHTML = '<div class="empty-state"><strong>' + (st.q ? "No orders match that." : st.filter === "all" ? "No orders yet." : "Nothing here.") + "</strong><span>" +
          (st.q ? "Try a name, phone number or AB-reference." : st.filter === "all" ? "Orders from the shop appear here." : "Orders move here as you update them.") + "</span></div>";
        return;
      }
      list.innerHTML = '<div class="list">' + st.list.map(orderRowHTML).join("") + "</div>" +
        (st.more ? '<div class="more"><button class="btn btn--ghost btn--sm" type="button" data-more>Show older orders</button></div>' : "");
      var more = $("[data-more]", list);
      if (more) more.addEventListener("click", function () { busy(more, true); load(true); });
    }
    function load(append) {
      if (!append) list.innerHTML = '<span class="sk sk--row"></span><span class="sk sk--row"></span><span class="sk sk--row"></span><span class="sk sk--row"></span>';
      var before = append && st.list.length ? st.list[st.list.length - 1].id : "";
      api("orders", { query: { filter: st.filter, q: st.q, before: before } }).then(function (d) {
        st.list = append ? st.list.concat(d.orders) : d.orders;
        st.more = d.more;
        st.counts = d.counts;
        setShipCount(d.counts.ship);
        draw();
      }, function (e) { failBox(list, e, function () { load(append); }); });
    }
    load(false);
  }

  /* ---------- order detail ---------- */
  function waMessage(o) {
    var first = String(o.name || "").split(/\s+/)[0] || "there";
    if (o.payment !== "paid" && o.status !== "cancelled") {
      return o.channel === "paystack"
        ? "Hello " + first + "! This is ADA BEKE. We saw your order " + o.reference + " wasn't completed. Can we help you finish it?"
        : "Hello " + first + "! This is ADA BEKE about your order " + o.reference + ".";
    }
    if (o.status === "shipped") return "Hello " + first + "! Your ADA BEKE order " + o.reference + " is on its way to you.";
    if (o.status === "delivered") return "Hello " + first + "! We hope you love your ADA BEKE pieces. Thank you for shopping with us.";
    return "Hello " + first + "! Thank you for your ADA BEKE order " + o.reference + ". We're getting it ready and will let you know when it ships.";
  }

  function orderSheet(sheet, id) {
    var body = $(".sheet__body", sheet);
    body.innerHTML = '<span class="sk sk--row"></span><span class="sk sk--row" style="height:140px"></span><span class="sk sk--row" style="height:200px"></span>';
    api("order", { query: { id: id } }).then(function (d) { drawOrder(sheet, d.order); }, function (e) {
      failBox(body, e, function () { orderSheet(sheet, id); });
    });
  }

  function drawOrder(sheet, o) {
    if (!state.sheet || !doc.contains(sheet)) return;
    state.sheet.order = o;
    $(".sheet__title", sheet).innerHTML = "Order " + esc(o.reference) + "<small>" + esc(when(o.createdAt)) + "</small>";
    var body = $(".sheet__body", sheet);
    var ps = o.paystack || {};
    var payInfo = "";
    if (o.channel === "paystack") {
      payInfo = o.payment === "paid"
        ? "Paid online" + (ps.card ? " with " + esc(ps.card) : ps.channel ? " by " + esc(ps.channel) : "") + (o.paidAt ? ", " + esc(when(o.paidAt)) : "") + (ps.fees != null ? ". Paystack fee " + money(ps.fees / 100) : "") + (ps.mode === "test" ? ". Test payment, no real money." : ".")
        : "Customer started paying online but hasn&rsquo;t finished." + (ps.gateway_response ? " Paystack says: " + esc(ps.gateway_response) + "." : "");
    } else if (o.channel === "whatsapp") {
      payInfo = o.payment === "paid" ? "Marked as paid" + (o.paidAt ? " on " + esc(when(o.paidAt)) : "") + "." : "Ordered on WhatsApp. Mark it paid once the money is in.";
    }
    var payBtns = "";
    if (o.channel === "paystack" && o.payment !== "paid" && o.payment !== "refunded") payBtns = '<button class="btn btn--sm" type="button" data-verify>Check payment with Paystack</button>';
    else if (o.channel === "paystack" && o.payment === "paid") payBtns = '<button class="btn btn--quiet btn--sm" type="button" data-pay="refunded">Mark as refunded</button>';
    else if (o.channel === "paystack" && o.payment === "refunded") payBtns = '<button class="btn btn--quiet btn--sm" type="button" data-pay="paid">Undo refund</button>';
    else if (o.payment === "paid") payBtns = '<button class="btn btn--quiet btn--sm" type="button" data-pay="unpaid">Mark as unpaid</button>';
    else payBtns = '<button class="btn btn--sm" type="button" data-pay="paid">' + ICON.check + "Mark as paid</button>";

    var addr = [o.address, o.city, o.state, o.country].filter(Boolean).map(esc).join(", ");
    var wa = waNumber(o.phone);
    body.innerHTML =
      '<div class="card" style="--i:0"><h2 class="card__title">Progress</h2>' +
        '<div class="seg" role="group" aria-label="Order progress">' + ["new", "confirmed", "shipped", "delivered"].map(function (s) {
          return '<button type="button" data-status="' + s + '" aria-pressed="' + (o.status === s) + '">' + STATUS_LABEL[s] + "</button>";
        }).join("") + "</div>" +
        '<div class="seg seg--danger" style="margin-top:8px"><button type="button" data-status="cancelled" aria-pressed="' + (o.status === "cancelled") + '">' + (o.status === "cancelled" ? "Cancelled" : "Cancel order") + "</button></div>" +
      "</div>" +
      '<div class="card" style="--i:1"><h2 class="card__title">Payment</h2>' +
        '<div class="pay-line"><span class="badge badge--' + o.payment + '">' + PAY_LABEL[o.payment] + "</span>" + payBtns + "</div>" +
        (payInfo ? '<p class="pay-detail">' + payInfo + "</p>" : "") +
        (ps.problem ? '<div class="note note--warn" style="margin-top:10px">' + ICON.alert + "<div>" + esc(ps.problem) + "</div></div>" : "") +
      "</div>" +
      '<div class="card" style="--i:2" data-customer><h2 class="card__title">Customer <button class="btn btn--quiet btn--sm" type="button" data-edit-customer>Edit</button></h2>' +
        '<dl class="kv">' +
          "<div><dt>Name</dt><dd>" + (esc(o.name) || "&mdash;") + "</dd></div>" +
          "<div><dt>Phone</dt><dd>" + (esc(o.phone) || "&mdash;") + "</dd></div>" +
          "<div><dt>Email</dt><dd>" + (esc(o.email) || "&mdash;") + "</dd></div>" +
          "<div><dt>Deliver to</dt><dd>" + (addr || "&mdash;") + "</dd></div>" +
          (o.deliveryName ? "<div><dt>Delivery</dt><dd>" + esc(o.deliveryName) + " (" + (o.deliveryFee ? money(o.deliveryFee) : "free") + ")</dd></div>" : "") +
        "</dl>" +
        '<div class="contact-actions">' +
          (wa ? '<a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="' + esc(waLink(o.phone, waMessage(o))) + '">' + ICON.wa + "WhatsApp</a>" : "") +
          (o.phone ? '<a class="btn btn--ghost btn--sm" href="tel:' + esc(o.phone.replace(/[^\d+]/g, "")) + '">' + ICON.phone + "Call</a>" : "") +
          (o.email ? '<a class="btn btn--ghost btn--sm" href="mailto:' + esc(o.email) + "?subject=" + encodeURIComponent("Your ADA BEKE order " + o.reference) + '">' + ICON.mail + "Email</a>" : "") +
        "</div>" +
        (o.note ? '<div class="note" style="margin-top:14px">' + ICON.info + "<div><b>Their note:</b> " + esc(o.note) + "</div></div>" : "") +
      "</div>" +
      '<div class="card" style="--i:3"><h2 class="card__title">Items</h2><div class="lines">' + o.items.map(function (i) {
        return '<div class="line"><div class="line__img">' + (i.image ? '<img src="' + esc(imgSrc(i.image)) + '" alt="" loading="lazy">' : "") + "</div>" +
          '<div><p class="line__name">' + esc(i.name) + '</p><p class="line__sub">' + esc([i.colour, "× " + i.qty].filter(Boolean).join(" · ")) + "</p></div>" +
          '<p class="line__price">' + (i.price == null ? "On request" : money(i.price * i.qty)) + "</p></div>";
      }).join("") + "</div>" +
        '<div class="sum"><div><span>Subtotal</span><span>' + money(o.subtotal) + "</span></div>" +
          (o.deliveryName ? "<div><span>Delivery</span><span>" + money(o.deliveryFee) + "</span></div>" : "") +
          '<div class="sum__total"><span>Total</span><span>' + money(o.total) + (o.onRequest ? " + pieces on request" : "") + "</span></div></div>" +
      "</div>" +
      '<div class="card" style="--i:4"><h2 class="card__title">Private note</h2>' +
        '<div class="field"><label class="sr" for="an">Private note</label><textarea id="an" rows="3" placeholder="Only you see this. Tracking number, sizes, anything.">' + esc(o.adminNote) + "</textarea></div>" +
        '<div style="margin-top:10px"><button class="btn btn--sm" type="button" data-save-note disabled>Save note</button></div>' +
      "</div>" +
      (o.payment !== "paid" ? '<div class="danger-zone" style="--i:5"><button class="btn btn--danger btn--sm" type="button" data-delete>' + ICON.trash + "Delete this order</button></div>" : "");

    $$("[data-status]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        var s = b.getAttribute("data-status");
        if (s === o.status) return;
        if (s === "cancelled" && !confirm("Cancel order " + o.reference + "?")) return;
        save({ status: s }, "Marked as " + STATUS_LABEL[s].toLowerCase());
      });
    });
    $$("[data-pay]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        var p = b.getAttribute("data-pay");
        if (p === "refunded" && !confirm("Mark this order as refunded? Do the refund itself in your Paystack dashboard.")) return;
        busy(b, true);
        save({ payment: p }, p === "paid" ? "Marked as paid" : p === "refunded" ? "Marked as refunded" : "Marked as unpaid");
      });
    });
    var verify = $("[data-verify]", body);
    if (verify) verify.addEventListener("click", function () {
      busy(verify, true);
      api("order-verify", { body: { id: o.id } }).then(function (d) {
        drawOrder(sheet, d.order);
        refreshList();
        toast(d.order.payment === "paid" ? "Payment confirmed" : "Paystack: not paid yet");
      }, function (e) { busy(verify, false); toast(e.message, true); });
    });
    var note = $("#an", body), saveNote = $("[data-save-note]", body);
    note.addEventListener("input", function () { saveNote.disabled = note.value === (o.adminNote || ""); state.sheet.dirty = !saveNote.disabled; });
    saveNote.addEventListener("click", function () { busy(saveNote, true); save({ adminNote: note.value }, "Note saved"); });
    $("[data-edit-customer]", body).addEventListener("click", function () { editCustomer(sheet, o); });
    var del = $("[data-delete]", body);
    if (del) del.addEventListener("click", function () {
      if (!confirm("Delete order " + o.reference + "? This can't be undone.")) return;
      busy(del, true);
      api("order-delete", { body: { id: o.id } }).then(function () {
        toast("Order deleted");
        state.sheet.dirty = false;
        closeSheetToList();
        refreshList();
      }, function (e) { busy(del, false); toast(e.message, true); });
    });

    function save(changes, msg) {
      $$("button", body).forEach(function (b) { b.disabled = true; });
      api("order-update", { body: Object.assign({ id: o.id }, changes) }).then(function (d) {
        state.sheet.dirty = false;
        drawOrder(sheet, d.order);
        refreshList();
        toast(msg);
      }, function (e) { drawOrder(sheet, o); toast(e.message, true); });
    }
  }

  function editCustomer(sheet, o) {
    var box = $("[data-customer]", sheet);
    var f = function (id, label, val, type, auto) {
      return '<div class="field"><label for="cu-' + id + '">' + label + '</label><input id="cu-' + id + '" name="' + id + '" type="' + (type || "text") + '" autocomplete="' + (auto || "off") + '" value="' + esc(val) + '"></div>';
    };
    box.innerHTML = '<h2 class="card__title">Customer</h2><form class="stack" data-cu>' +
      f("name", "Name", o.name) + '<div class="row2">' + f("phone", "Phone", o.phone, "tel") + f("email", "Email", o.email, "email") + "</div>" +
      f("address", "Address", o.address) + '<div class="row2">' + f("city", "City / town", o.city) + f("state", "State / region", o.state) + "</div>" + f("country", "Country", o.country) +
      '<div style="display:flex;gap:8px"><button class="btn btn--sm" type="submit">Save details</button><button class="btn btn--ghost btn--sm" type="button" data-cancel>Cancel</button></div></form>';
    state.sheet.dirty = true;
    var form = $("[data-cu]", box);
    $("#cu-name", form).focus();
    $("[data-cancel]", form).addEventListener("click", function () { state.sheet.dirty = false; drawOrder(sheet, o); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var c = {};
      ["name", "phone", "email", "address", "city", "state", "country"].forEach(function (k) { c[k] = form.elements[k].value.trim(); });
      busy($('[type="submit"]', form), true);
      api("order-update", { body: { id: o.id, customer: c } }).then(function (d) {
        state.sheet.dirty = false;
        drawOrder(sheet, d.order);
        refreshList();
        toast("Details saved");
      }, function (err) { busy($('[type="submit"]', form), false); toast(err.message, true); });
    });
  }

  function refreshList() {
    if (state.view === "orders" || state.view === "overview") {
      var y = window.scrollY;
      renderView();
      setTimeout(function () { window.scrollTo(0, y); }, 400);
    }
  }

  /* ======================================================================
     Pieces (products)
     ====================================================================== */
  var P_STATUS = [
    ["available", "Available", "Shows in the shop and can be bought."],
    ["soon", "Dropping soon", "Shows in the shop; customers can ask to be told when it drops."],
    ["sold_out", "Sold out", "Shows in the shop as sold out."],
    ["hidden", "Hidden", "Not shown in the shop at all."],
  ];
  function statusLabel(s) { for (var i = 0; i < P_STATUS.length; i++) if (P_STATUS[i][0] === s) return P_STATUS[i][1]; return s; }

  function products(v) {
    var body = viewShell(v, "Pieces", "The order here is the order in the shop.", '<a class="btn btn--aqua" href="#products/new">' + ICON.plus + "Add a piece</a>");
    body.innerHTML = '<div class="card"><span class="sk sk--row"></span><span class="sk sk--row"></span><span class="sk sk--row"></span></div>';
    api("products").then(function (d) {
      state.products = d.products;
      drawProducts(body);
    }, function (e) { failBox(body, e, renderView); });
  }
  function drawProducts(body) {
    var list = state.products;
    if (!list.length) {
      body.innerHTML = '<div class="card"><div class="empty-state"><strong>No pieces yet.</strong><span>Add your first piece and it appears in the shop.</span><a class="btn" href="#products/new">' + ICON.plus + "Add a piece</a></div></div>";
      return;
    }
    body.innerHTML = '<div class="card"><div class="list">' + list.map(function (p, i) {
      var img = p.images && p.images[0] ? '<img src="' + esc(imgSrc(p.images[0])) + '" alt="" loading="lazy">' : esc(plain(p.name).charAt(0));
      return '<div class="prod">' +
        '<div class="prod__img">' + img + "</div>" +
        '<a class="prod__open" href="#products/' + encodeURIComponent(p.id) + '"><span class="prod__name">' + rich(p.name) + '</span>' +
          '<span class="prod__sub"><span>' + (p.price == null ? "Price on request" : money(p.price)) + '</span><span class="badge badge--' + p.status + '">' + statusLabel(p.status) + "</span></span></a>" +
        '<div class="prod__move"><button class="icon-btn" type="button" data-move="-1" data-i="' + i + '" aria-label="Move ' + esc(plain(p.name)) + ' up"' + (i === 0 ? " disabled" : "") + ">" + ICON.up + "</button>" +
          '<button class="icon-btn" type="button" data-move="1" data-i="' + i + '" aria-label="Move ' + esc(plain(p.name)) + ' down"' + (i === list.length - 1 ? " disabled" : "") + ">" + ICON.down + "</button></div>" +
      "</div>";
    }).join("") + "</div></div>";
    $$("[data-move]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        var i = Number(b.getAttribute("data-i")), j = i + Number(b.getAttribute("data-move"));
        var arr = state.products;
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        drawProducts(body);
        var again = $('[data-i="' + j + '"][data-move="' + b.getAttribute("data-move") + '"]', body);
        (again && !again.disabled ? again : $('[data-i="' + j + '"]', body)).focus();
        saveOrder();
      });
    });
  }
  var orderTimer;
  function saveOrder() {
    clearTimeout(orderTimer);
    orderTimer = setTimeout(function () {
      api("products-reorder", { body: { ids: state.products.map(function (p) { return p.id; }) } }).then(function () {
        toast("New order saved");
      }, function (e) { toast(e.message, true); });
    }, 500);
  }

  /* ---------- piece editor ---------- */
  function blankPiece() {
    return { id: "", name: "", colour: "", price: null, status: "available", badge: "", includes: "", fabric: "", fit: "Free size", description: "", images: [] };
  }
  function productSheet(sheet, id) {
    var body = $(".sheet__body", sheet);
    function go(p, isNew) { drawEditor(sheet, JSON.parse(JSON.stringify(p)), isNew); }
    if (id === "new") return go(blankPiece(), true);
    var found = state.products.filter(function (p) { return p.id === id; })[0];
    if (found) return go(found, false);
    body.innerHTML = '<span class="sk sk--row"></span><span class="sk sk--row" style="height:200px"></span>';
    api("products").then(function (d) {
      state.products = d.products;
      var p = d.products.filter(function (x) { return x.id === id; })[0];
      if (p) go(p, false);
      else body.innerHTML = '<div class="empty-state"><strong>That piece doesn&rsquo;t exist any more.</strong></div>';
    }, function (e) { failBox(body, e, function () { productSheet(sheet, id); }); });
  }

  function drawEditor(sheet, p, isNew) {
    var body = $(".sheet__body", sheet);
    var uploading = 0;
    $(".sheet__title", sheet).innerHTML = isNew ? "New piece" : esc(plain(p.name)) + '<small>adabeke.vercel.app/shop.html?p=' + esc(p.id) + "</small>";
    var f = function (id, label, val, hint, attrs) {
      return '<div class="field"><label for="pe-' + id + '">' + label + "</label>" +
        '<input id="pe-' + id + '" name="' + id + '" type="text" value="' + esc(val == null ? "" : val) + '"' + (attrs || "") + ">" +
        (hint ? '<span class="field__hint">' + hint + "</span>" : "") + "</div>";
    };
    body.innerHTML =
      '<div class="card" style="--i:0"><h2 class="card__title">Photos <span class="field__hint" style="text-transform:none;letter-spacing:0">First photo is the main one</span></h2><div class="photos" data-photos></div></div>' +
      '<div class="card stack" style="--i:1">' +
        f("name", "Name", p.name, "Put a word between *stars* to show it in italics, like *Omalicha* set.", ' required autocomplete="off"') +
        '<p class="name-preview" data-preview aria-live="polite"></p>' +
        '<div class="row2">' +
          '<div class="field"><label for="pe-price">Price</label><div class="money"><input id="pe-price" name="price" type="text" inputmode="numeric" value="' + (p.price == null ? "" : p.price.toLocaleString("en-NG")) + '" placeholder="45,000"></div><span class="field__hint">Leave empty for &ldquo;price on request&rdquo;.</span></div>' +
          f("colour", "Colour", p.colour, "", ' autocomplete="off"') +
        "</div>" +
      "</div>" +
      '<div class="card" style="--i:2"><h2 class="card__title">In the shop</h2>' +
        '<div class="seg" role="radiogroup" aria-label="Status">' + P_STATUS.map(function (s) {
          return '<button type="button" role="radio" data-st="' + s[0] + '" aria-pressed="' + (p.status === s[0]) + '" aria-checked="' + (p.status === s[0]) + '">' + s[1] + "</button>";
        }).join("") + "</div>" +
        '<p class="field__hint" data-st-hint style="margin-top:10px"></p>' +
      "</div>" +
      '<div class="card stack" style="--i:3"><h2 class="card__title" style="margin-bottom:0">Details</h2>' +
        '<div class="row2">' + f("badge", "Badge", p.badge, "A short tag on the photo: New, Bestseller, Restocked.", ' maxlength="40"') + f("fit", "Fit", p.fit) + "</div>" +
        f("includes", "What&rsquo;s included", p.includes, "For example: Sold with the scarf only.") +
        f("fabric", "Fabric", p.fabric) +
        '<div class="field"><label for="pe-description">Description</label><textarea id="pe-description" name="description" rows="4">' + esc(p.description) + "</textarea></div>" +
      "</div>" +
      (!isNew ? '<div class="danger-zone" style="--i:4"><button class="btn btn--danger btn--sm" type="button" data-del>' + ICON.trash + "Delete this piece</button></div>" : "");

    var foot = $(".sheet__foot", sheet);
    foot.hidden = false;
    foot.innerHTML = '<button class="btn btn--ghost" type="button" data-cancel>Cancel</button><button class="btn" type="button" data-save>' + (isNew ? "Add piece" : "Save changes") + "</button>";

    function dirty() { state.sheet.dirty = true; }
    function preview() {
      var n = $("#pe-name", body).value;
      $("[data-preview]", body).innerHTML = n.indexOf("*") >= 0 ? "Shows as: " + rich(n) : "";
    }
    function stHint() {
      P_STATUS.forEach(function (s) { if (s[0] === p.status) $("[data-st-hint]", body).textContent = s[2]; });
    }
    preview();
    stHint();
    $$("input, textarea", body).forEach(function (el) { el.addEventListener("input", dirty); });
    $("#pe-name", body).addEventListener("input", preview);
    $("#pe-price", body).addEventListener("blur", function () {
      var n = this.value.replace(/[^\d]/g, "");
      this.value = n ? Number(n).toLocaleString("en-NG") : "";
    });
    $$("[data-st]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        p.status = b.getAttribute("data-st");
        $$("[data-st]", body).forEach(function (x) { var on = x === b; x.setAttribute("aria-pressed", String(on)); x.setAttribute("aria-checked", String(on)); });
        stHint();
        dirty();
      });
    });

    function drawPhotos() {
      var box = $("[data-photos]", body);
      box.innerHTML = p.images.map(function (src, i) {
        return '<div class="photo"><img src="' + esc(imgSrc(src)) + '" alt="Photo ' + (i + 1) + '">' + (i === 0 ? '<span class="photo__main">Main</span>' : "") +
          '<div class="photo__tools">' +
            '<button type="button" data-ph="left" data-i="' + i + '" aria-label="Move photo ' + (i + 1) + ' earlier"' + (i === 0 ? " disabled" : "") + ">" + ICON.left + "</button>" +
            '<button type="button" data-ph="remove" data-i="' + i + '" aria-label="Remove photo ' + (i + 1) + '">' + ICON.trash + "</button>" +
            '<button type="button" data-ph="right" data-i="' + i + '" aria-label="Move photo ' + (i + 1) + ' later"' + (i === p.images.length - 1 ? " disabled" : "") + ">" + ICON.right + "</button>" +
          "</div></div>";
      }).join("") +
        new Array(uploading + 1).join('<div class="photo"><span class="sk"></span></div>') +
        (p.images.length + uploading < 12 ? '<label class="photo photo--add">' + ICON.photo + "<span>Add photos</span>" +
          '<input type="file" accept="image/*" multiple data-file aria-label="Add photos"></label>' : "");
      $$("[data-ph]", box).forEach(function (b) {
        b.addEventListener("click", function () {
          var i = Number(b.getAttribute("data-i")), act = b.getAttribute("data-ph");
          if (act === "remove") p.images.splice(i, 1);
          else {
            var j = act === "left" ? i - 1 : i + 1;
            var t = p.images[i]; p.images[i] = p.images[j]; p.images[j] = t;
          }
          dirty();
          drawPhotos();
        });
      });
      var file = $("[data-file]", box);
      if (file) file.addEventListener("change", function () {
        var files = Array.prototype.slice.call(file.files || []).slice(0, 12 - p.images.length - uploading);
        files.forEach(function (fl) {
          uploading++;
          prepareImage(fl).then(toBase64).then(function (data) {
            return api("image-upload", { body: { data: data } });
          }).then(function (d) {
            uploading--;
            p.images.push(d.url);
            dirty();
            drawPhotos();
          }, function (e) {
            uploading--;
            drawPhotos();
            toast(e.message, true);
          });
        });
        drawPhotos();
      });
    }
    drawPhotos();

    $("[data-cancel]", foot).addEventListener("click", function () { requestClose(); });
    $("[data-save]", foot).addEventListener("click", function () {
      var btn = this;
      if (uploading) { toast("Wait for the photos to finish uploading", true); return; }
      var data = {
        id: p.id,
        name: $("#pe-name", body).value.trim(),
        price: $("#pe-price", body).value.replace(/[^\d]/g, ""),
        colour: $("#pe-colour", body).value.trim(),
        status: p.status,
        badge: $("#pe-badge", body).value.trim(),
        fit: $("#pe-fit", body).value.trim(),
        includes: $("#pe-includes", body).value.trim(),
        fabric: $("#pe-fabric", body).value.trim(),
        description: $("#pe-description", body).value.trim(),
        images: p.images,
      };
      if (data.price === "") data.price = null;
      $$(".field", body).forEach(function (x) { x.classList.remove("has-error"); });
      if (!data.name.replace(/\*/g, "").trim()) {
        $("#pe-name", body).closest(".field").classList.add("has-error");
        $("#pe-name", body).focus();
        toast("Give the piece a name", true);
        return;
      }
      busy(btn, true);
      api("product-save", { body: { isNew: isNew, product: data } }).then(function (d) {
        state.sheet.dirty = false;
        var list = state.products, done = false;
        for (var i = 0; i < list.length; i++) if (list[i].id === d.product.id) { list[i] = d.product; done = true; }
        if (!done) list.push(d.product);
        toast(isNew ? "Piece added. It shows in the shop within a minute." : "Saved. The shop updates within a minute.");
        closeSheetToList();
        renderView();
      }, function (e) {
        busy(btn, false);
        ((e.data && e.data.fields) || []).forEach(function (k) {
          var el = $('[name="' + k + '"]', body);
          if (el) el.closest(".field").classList.add("has-error");
        });
        toast(e.message, true);
      });
    });
    var del = $("[data-del]", body);
    if (del) del.addEventListener("click", function () {
      if (!confirm("Delete " + plain(p.name) + "? It disappears from the shop. Past orders keep their details.")) return;
      busy(del, true);
      api("product-delete", { body: { id: p.id } }).then(function () {
        state.sheet.dirty = false;
        state.products = state.products.filter(function (x) { return x.id !== p.id; });
        toast("Piece deleted");
        closeSheetToList();
        renderView();
      }, function (e) { busy(del, false); toast(e.message, true); });
    });
    if (isNew) setTimeout(function () { $("#pe-name", body).focus(); }, 450);
  }

  // Shrink photos on the phone before sending: max 1600px, WebP (or JPEG where WebP isn't available)
  function prepareImage(file) {
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type || "image/")) return reject(new Error(file.name + " isn't a photo."));
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = doc.createElement("canvas");
        c.width = Math.round(w * k);
        c.height = Math.round(h * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (b && b.type === "image/webp" && b.size < 3.5e6) return resolve(b);
          c.toBlob(function (j) { j ? resolve(j) : reject(new Error("Couldn't read that photo.")); }, "image/jpeg", 0.84);
        }, "image/webp", 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("That photo couldn't be opened. Try a JPG or PNG.")); };
      img.src = url;
    });
  }
  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).replace(/^data:[^,]*,/, "")); };
      r.onerror = function () { reject(new Error("Couldn't read that photo.")); };
      r.readAsDataURL(blob);
    });
  }

  /* ======================================================================
     Settings
     ====================================================================== */
  function settings(v) {
    var body = viewShell(v, "Settings", "");
    var s = state.status;
    var pay = s.paystack;
    var payState = pay.on
      ? '<span class="badge ' + (pay.mode === "live" ? "badge--paid" : "badge--unpaid") + '">' + (pay.mode === "live" ? "Live: taking real payments" : "Test mode") + "</span>"
      : '<span class="badge badge--hidden">Not connected</span>';
    var payHelp = pay.on
      ? (pay.mode === "test"
        ? "<p>Payments in test mode are pretend. When you&rsquo;re ready, put your <b>live</b> secret key (starts with <code>sk_live_</code>) in <code>PAYSTACK_SECRET_KEY</code> in Vercel and redeploy.</p>"
        : "<p>Customers can pay by card, bank transfer and USSD. Paystack emails them a receipt, and you see each order here.</p>") +
        '<p style="margin-top:12px">Paystack must know where to report payments. In Paystack, open <b>Settings &rarr; API Keys &amp; Webhooks</b> and set the <b>Webhook URL</b> to:</p>'
      : '<ol class="steps" style="margin-top:4px">' +
          "<li>In your Paystack dashboard, open <b>Settings &rarr; API Keys &amp; Webhooks</b> and copy the <b>Secret Key</b>. Start with the test key (<code>sk_test_&hellip;</code>).</li>" +
          "<li>In Vercel, open the <b>adabeke</b> project, go to <b>Settings &rarr; Environment Variables</b> and add it as <code>PAYSTACK_SECRET_KEY</code>.</li>" +
          "<li>Back in Paystack, set the <b>Webhook URL</b> to the address below.</li>" +
          "<li>In Vercel, <b>Redeploy</b>. The shop&rsquo;s checkout switches to online payment by itself.</li>" +
        "</ol>";
    body.innerHTML =
      '<div class="card stack"><h2 class="card__title" style="margin-bottom:0">Delivery options</h2>' +
        '<p class="field__hint">Shown at checkout for customers to choose. Leave the list empty to agree delivery on WhatsApp after each order.</p>' +
        '<div data-zones></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn--ghost btn--sm" type="button" data-add-zone>' + ICON.plus + 'Add an option</button><button class="btn btn--sm" type="button" data-save-zones disabled>Save delivery options</button></div>' +
      "</div>" +
      '<div class="card stack"><h2 class="card__title" style="margin-bottom:0">Online payment (Paystack)</h2>' +
        "<div>" + payState + "</div>" + payHelp +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><code data-webhook>' + esc(s.webhook) + '</code><button class="btn btn--ghost btn--sm" type="button" data-copy>' + ICON.copy + "Copy</button></div>" +
      "</div>" +
      '<div class="card stack"><h2 class="card__title" style="margin-bottom:0">Account</h2>' +
        "<p>To change the admin password, change <code>ADMIN_PASSWORD</code> in Vercel and redeploy. Everyone is signed out when it changes.</p>" +
        '<div><button class="btn btn--ghost btn--sm" type="button" data-out>' + ICON.out + "Sign out</button></div>" +
      "</div>";
    $("[data-out]", body).addEventListener("click", signOut);
    $("[data-copy]", body).addEventListener("click", function () {
      var text = s.webhook;
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast("Copied"); }, function () {
        var r = doc.createRange(); r.selectNodeContents($("[data-webhook]", body));
        var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
        toast("Selected. Copy it from here.");
      });
    });

    var zonesBox = $("[data-zones]", body), saveBtn = $("[data-save-zones]", body);
    var zones = [];
    function drawZones() {
      zonesBox.innerHTML = zones.length ? zones.map(function (z, i) {
        return '<div class="zone-row"><input class="input" type="text" placeholder="e.g. Lagos" aria-label="Option ' + (i + 1) + ' name" value="' + esc(z.name) + '" data-zn="' + i + '">' +
          '<div class="money"><input class="input" type="text" inputmode="numeric" placeholder="5,000" aria-label="Option ' + (i + 1) + ' fee" value="' + (z.fee ? Number(z.fee).toLocaleString("en-NG") : "") + '" data-zf="' + i + '"></div>' +
          '<button class="icon-btn" type="button" data-zr="' + i + '" aria-label="Remove option ' + (i + 1) + '">' + ICON.close + "</button></div>";
      }).join("") : '<p class="field__hint">No delivery options yet.</p>';
      $$("[data-zn]", zonesBox).forEach(function (el) { el.addEventListener("input", function () { zones[+el.getAttribute("data-zn")].name = el.value; saveBtn.disabled = false; }); });
      $$("[data-zf]", zonesBox).forEach(function (el) {
        el.addEventListener("input", function () { zones[+el.getAttribute("data-zf")].fee = Number(el.value.replace(/[^\d]/g, "")) || 0; saveBtn.disabled = false; });
        el.addEventListener("blur", function () { var n = el.value.replace(/[^\d]/g, ""); el.value = n ? Number(n).toLocaleString("en-NG") : ""; });
      });
      $$("[data-zr]", zonesBox).forEach(function (el) { el.addEventListener("click", function () { zones.splice(+el.getAttribute("data-zr"), 1); saveBtn.disabled = false; drawZones(); }); });
    }
    zonesBox.innerHTML = '<span class="sk sk--row" style="height:48px"></span>';
    api("settings").then(function (d) { zones = d.delivery; drawZones(); }, function (e) { failBox(zonesBox, e, function () { settings(v); }); });
    $("[data-add-zone]", body).addEventListener("click", function () {
      zones.push({ name: "", fee: 0 });
      drawZones();
      saveBtn.disabled = false;
      var inputs = $$("[data-zn]", zonesBox);
      inputs[inputs.length - 1].focus();
    });
    saveBtn.addEventListener("click", function () {
      busy(saveBtn, true);
      api("settings-save", { body: { delivery: zones } }).then(function (d) {
        zones = d.delivery;
        drawZones();
        busy(saveBtn, false);
        saveBtn.disabled = true;
        toast("Delivery options saved");
      }, function (e) { busy(saveBtn, false); toast(e.message, true); });
    });
  }

  /* ======================================================================
     Sheets (order detail, piece editor)
     ====================================================================== */
  var lastFocus = null;
  function openSheet(view, sub) {
    if (view !== "orders" && view !== "products") return;
    closeSheet(true);
    lastFocus = doc.activeElement;
    state.sheet = { kind: view, id: sub, hash: view + "/" + sub, dirty: false, fromList: state.cameFromList };
    state.cameFromList = false;
    doc.body.insertAdjacentHTML("beforeend",
      '<div class="scrim" data-scrim></div>' +
      '<section class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title">' +
        '<div class="sheet__head"><button class="icon-btn" type="button" data-close aria-label="Close">' + ICON.back + '</button><h2 class="sheet__title" id="sheet-title" tabindex="-1"></h2></div>' +
        '<div class="sheet__body"></div><div class="sheet__foot" hidden></div>' +
      "</section>");
    var sheet = $(".sheet");
    $("[data-close]", sheet).addEventListener("click", requestClose);
    $("[data-scrim]").addEventListener("click", requestClose);
    ["#view", ".top", ".tabs"].forEach(function (q) { if ($(q)) $(q).inert = true; });
    requestAnimationFrame(function () {
      $("[data-scrim]").classList.add("is-on");
      sheet.classList.add("is-on");
      setTimeout(function () { $("#sheet-title").focus(); }, 60);
    });
    if (view === "orders") orderSheet(sheet, sub);
    else productSheet(sheet, sub);
  }
  function requestClose() {
    if (state.sheet && state.sheet.dirty && !confirm("Leave without saving your changes?")) return;
    if (state.sheet) state.sheet.dirty = false;
    closeSheetToList();
  }
  function closeSheetToList() {
    if (!state.sheet) return;
    if (state.sheet.fromList) history.back();
    else { history.replaceState(null, "", "#" + state.view); closeSheet(); }
  }
  function closeSheet(instant) {
    var sheet = $(".sheet"), scrim = $("[data-scrim]");
    state.sheet = null;
    ["#view", ".top", ".tabs"].forEach(function (q) { if ($(q)) $(q).inert = false; });
    if (!sheet) return;
    if (instant) { sheet.remove(); if (scrim) scrim.remove(); return; }
    sheet.classList.remove("is-on");
    if (scrim) scrim.classList.remove("is-on");
    setTimeout(function () { sheet.remove(); if (scrim) scrim.remove(); }, 450);
    if (lastFocus && lastFocus.focus && doc.contains(lastFocus)) lastFocus.focus();
  }
  // Opening a sheet from a list: closing it later goes "back" instead of adding history
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#orders/"], a[href^="#products/"]');
    if (a) state.cameFromList = true;
  });
  doc.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && state.sheet) requestClose();
  });
  window.addEventListener("beforeunload", function (e) {
    if (state.sheet && state.sheet.dirty) { e.preventDefault(); e.returnValue = ""; }
  });

  boot();
})();
