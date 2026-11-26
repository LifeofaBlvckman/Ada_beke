/* ==========================================================================
   ADA BEKE — site behaviour
   Gentle fades, home photo slideshow, bag + checkout, product details.
   Vanilla JS, no build step.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  window.ADA_READY = true; // tells the safety net in the page head that the script arrived
  var plain = !root.classList.contains("js"); // script came very late: page already shown plainly
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PRODUCTS = (window.ADA_PRODUCTS || []).filter(function (p) { return p.status !== "hidden"; });
  var CONTACT = window.ADA_CONTACT || { whatsapp: "2348093712578" };
  // Filled from /api/catalogue: live pieces, delivery options, online payment on/off
  var SHOP = { db: false, paystack: false, delivery: [], collections: [], fx: null };
  var COLLECTIONS = window.ADA_COLLECTIONS || [];

  /* ---------- helpers ---------- */
  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  // "*Omalicha* set" -> "<em>Omalicha</em> set"
  function richName(name) { return esc(name).replace(/\*(.+?)\*/g, "<em>$1</em>"); }
  function plainName(name) { return String(name).replace(/\*/g, ""); }
  // Shoot photos come in two sizes: name.webp (1600 wide) and name-800.webp.
  // small() picks the light one for thumbnails; sized() lets the browser choose.
  var SHOOT = /^(\/?assets\/img\/shoot\/[\w-]+)\.webp$/;
  function shootBase(src) {
    var m = SHOOT.exec(src || "");
    return m && !/-(800|blur)$/.test(m[1]) ? m[1] : null;
  }
  function small(src) { var b = shootBase(src); return b ? b + "-800.webp" : src; }
  function sized(src, sizes) {
    var b = shootBase(src);
    return 'src="' + esc(src) + '"' + (b ? ' srcset="' + esc(b + "-800.webp 800w, " + src + " 1600w") + '" sizes="' + sizes + '"' : "");
  }
  var CARD_SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw";
  function naira(n) { return "₦" + Number(n).toLocaleString("en-NG"); }
  // Approximate price abroad, e.g. "≈ $29 · £23" (customers always pay in naira)
  function fxText(n) {
    var fx = SHOP.fx;
    if (!fx || !(n > 0) || !(fx.usd > 0) || !(fx.gbp > 0)) return "";
    var f = function (v) { return v >= 100 ? Math.round(v).toLocaleString("en-US") : v >= 10 ? String(Math.round(v)) : v.toFixed(2); };
    return "≈ $" + f(n / fx.usd) + " · £" + f(n / fx.gbp);
  }
  function collectionById(id) { for (var i = 0; i < COLLECTIONS.length; i++) if (COLLECTIONS[i].id === id) return COLLECTIONS[i]; return null; }
  function priceText(p) { return p.price == null ? (p.status === "soon" ? "Coming soon" : "Price on request") : naira(p.price); }
  function byId(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }
  function waLink(text) { return "https://wa.me/" + CONTACT.whatsapp + "?text=" + encodeURIComponent(text); }
  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key) || "null");
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* storage blocked — bag lives for this page only */ }
    return null;
  }

  var ICON = {
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.36A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.08.81.82-3-.2-.31a8.2 8.2 0 1 1 6.94 3.83Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.85 2.03 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.17 3.68c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z"/></svg>',
  };

  /* ======================================================================
     0. Skeleton loading: photos shimmer until they arrive, then settle in
     ====================================================================== */
  function watchImg(img) {
    if (img.__skel || !img.getAttribute("src") || img.classList.contains("cut")) return; // cut-outs: no grey box behind them
    img.__skel = true;
    if (img.complete && img.naturalWidth) return;      // already here: no placeholder
    img.classList.add("skel");
    img.addEventListener("load", function () {
      img.classList.toggle("skel", false);
      if (!reduceMotion) img.classList.add("is-loaded");
    }, { once: true });
    img.addEventListener("error", function () { img.classList.toggle("skel", false); }, { once: true });
  }
  function skel(ctx) {
    $$("img", ctx || doc).forEach(watchImg);
    $$("video[poster]", ctx || doc).forEach(function (v) {
      if (v.__skel) return;
      v.__skel = true;
      v.classList.add("skel");
      var poster = new Image();
      poster.onload = poster.onerror = function () { v.classList.toggle("skel", false); };
      poster.src = v.getAttribute("poster");
    });
  }

  /* ======================================================================
     1. Page start: show what waits for the page to load
     ====================================================================== */
  function lift() {
    root.classList.remove("is-loading");
    if (plain) return; // the page is already showing plainly
    $$("[data-reveal-load]").forEach(function (el) { el.classList.add("is-in"); });
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", lift);
  else lift();

  /* ======================================================================
     2. Header: solid after scroll, hides on the way down
     ====================================================================== */
  var header = $("[data-header]");
  var lastY = window.scrollY;
  function onScrollHeader() {
    if (!header) return;
    var y = window.scrollY;
    header.classList.toggle("is-solid", y > 30);
    var menuOpen = root.classList.contains("menu-open");
    if (!menuOpen && y > 520 && y > lastY + 4) header.classList.add("is-hidden");
    else if (y < lastY - 4 || y < 520) header.classList.remove("is-hidden");
    // the shop filter bar follows the header up and down
    root.classList.toggle("header-hidden", header.classList.contains("is-hidden"));
    lastY = y;
  }

  /* ======================================================================
     3. Mobile menu
     ====================================================================== */
  var menuBtn = $("[data-menu-toggle]");
  var menu = $("#menu");
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    if (open) { menu.removeAttribute("hidden"); void menu.offsetWidth; header && header.classList.remove("is-hidden"); }
    root.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (!open) setTimeout(function () { if (!root.classList.contains("menu-open")) menu.setAttribute("hidden", ""); }, 500);
    var main = $("#main"), foot = $(".site-footer");
    [main, foot].forEach(function (el) { if (el) el.inert = open; });
    if (open) { var first = $("a", menu); first && setTimeout(function () { first.focus(); }, 60); }
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { setMenu(!root.classList.contains("menu-open")); });

  /* ======================================================================
     4. Fade-in on scroll
     ====================================================================== */
  // Clipped elements have no visible area until revealed, so they are
  // watched through their parent instead.
  var io = null;
  var watchers = new Map();
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        (watchers.get(en.target) || []).forEach(function (el) { el.classList.add("is-in"); });
        watchers.delete(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
  }
  function observe(el) {
    if (!io) { el.classList.add("is-in"); return; }
    var target = el.getAttribute("data-reveal") === "clip" ? el.parentElement : el;
    if (!watchers.has(target)) { watchers.set(target, []); io.observe(target); }
    watchers.get(target).push(el);
  }
  function observeAll(ctx) {
    $$("[data-reveal]:not([data-reveal-load])", ctx).forEach(observe);
  }

  /* ======================================================================
     6. Videos: play when visible, pause button, reduced motion
     ====================================================================== */
  $$("[data-video]").forEach(function (wrap) {
    var v = $("video", wrap);
    var btn = $(".media-toggle", wrap);
    if (!v) return;
    v.muted = true;
    var userPaused = reduceMotion;
    function sync() { if (btn) { btn.classList.toggle("is-paused", v.paused); btn.setAttribute("aria-label", v.paused ? "Play video" : "Pause video"); } }
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    if (btn) btn.addEventListener("click", function () {
      if (v.paused) { userPaused = false; v.play().catch(function () {}); }
      else { userPaused = true; v.pause(); }
    });
    if (reduceMotion) { v.removeAttribute("autoplay"); v.pause(); }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (x.isIntersecting && !userPaused) v.play().catch(function () {});
          else if (!x.isIntersecting) v.pause();
        });
      }, { threshold: 0.15 }).observe(v);
    }
    sync();
  });

  /* ======================================================================
     7. Product cards
     ====================================================================== */
  function cardMedia(p, eager) {
    if (!p.images || !p.images.length) {
      return '<div class="ph" aria-hidden="true"><span class="ph__name">' + esc(p.placeholder || plainName(p.name)) + '</span><span class="ph__note">Photo coming soon</span></div>';
    }
    var html = '<img ' + sized(p.images[0], CARD_SIZES) + ' alt="' + esc([plainName(p.name), p.colour].filter(Boolean).join(", ")) + '" loading="' + (eager ? "eager" : "lazy") + '" decoding="async" width="720" height="900">';
    if (p.images[1]) html += '<img class="alt" ' + sized(p.images[1], CARD_SIZES) + ' alt="" loading="lazy" decoding="async" width="720" height="900">';
    return html;
  }
  function subLine(p) { return [p.colour, p.fit].filter(Boolean).map(esc).join(" &middot; "); }
  function cardHTML(p, i, step) {
    var badgeCls = p.status === "soon" ? "card__badge card__badge--aqua" : p.status === "sold_out" ? "card__badge card__badge--out" : "card__badge";
    var badge = p.status === "sold_out" ? "Sold out" : p.badge;
    return (
      '<article class="card" data-reveal style="--d:' + (i % 4) * (step || 110) + 'ms" data-status="' + esc(p.status) + '" data-collection="' + esc(p.collection || "") + '" data-id="' + esc(p.id) + '">' +
        '<div class="card__media">' + cardMedia(p, false) + (badge ? '<span class="' + badgeCls + '">' + esc(badge) + "</span>" : "") + "</div>" +
        '<div class="card__row"><h3 class="card__name"><a class="card__link" href="shop.html?p=' + encodeURIComponent(p.id) + '" data-product="' + esc(p.id) + '">' + richName(p.name) + "</a></h3>" +
        '<span class="card__price' + (p.price == null ? " is-request" : "") + '">' + esc(priceText(p)) + "</span></div>" +
        '<p class="card__sub">' + subLine(p) + "</p>" +
      "</article>"
    );
  }
  function renderProducts() {
    $$("[data-products]").forEach(function (box) {
      if (box.getAttribute("data-products") === "home") {
        // Home: the first four pieces; "Shop all" leads to the rest
        box.innerHTML = PRODUCTS.slice(0, 4).map(function (p, i) { return cardHTML(p, i, 70); }).join("");
      } else {
        box.innerHTML = PRODUCTS.length
          ? PRODUCTS.map(function (p, i) { return cardHTML(p, i); }).join("")
          : '<p class="cards__empty">New pieces are on the way. <a href="' + esc(waLink("Hello ADA BEKE! What's dropping next?")) + '" target="_blank" rel="noopener">Ask us what&rsquo;s next</a>.</p>';
      }
      skel(box);
      observeAll(box);
    });
    applyFilter(currentFilter);
    doc.dispatchEvent(new Event("ada:products"));
  }

  /* Shop filters: All, each collection, Available now, Dropping soon */
  var chipBox = $(".chips");
  var countEl = $("[data-filter-count]");
  var currentFilter = (function () {
    var m = /[?&]c=([^&#]+)/.exec(location.search);
    return m ? "c:" + decodeURIComponent(m[1]) : "all";
  })();
  function applyFilter(f) {
    if (!chipBox) return;
    if (!$('[data-filter="' + f + '"]', chipBox)) f = "all";
    currentFilter = f;
    var shown = 0;
    $$(".cards--shop .card").forEach(function (c) {
      var ok = f === "all" || (f.indexOf("c:") === 0 ? c.getAttribute("data-collection") === f.slice(2) : c.getAttribute("data-status") === f);
      c.classList.toggle("is-filtered-out", !ok);
      if (ok) { shown++; c.classList.add("is-in"); }
    });
    $$("[data-filter]", chipBox).forEach(function (ch) { ch.setAttribute("aria-pressed", String(ch.getAttribute("data-filter") === f)); });
    if (countEl) countEl.textContent = shown + (shown === 1 ? " piece" : " pieces");
  }
  function renderCollectionChips() {
    if (!chipBox) return;
    $$("[data-filter^='c:']", chipBox).forEach(function (ch) { ch.remove(); });
    var all = $('[data-filter="all"]', chipBox);
    var html = COLLECTIONS.map(function (c) {
      return '<button class="chip" type="button" data-filter="c:' + esc(c.id) + '" aria-pressed="false">' + esc(c.name) + "</button>";
    }).join("");
    if (all) all.insertAdjacentHTML("afterend", html);
  }
  if (chipBox) chipBox.addEventListener("click", function (e) {
    var ch = e.target.closest("[data-filter]");
    if (!ch) return;
    var f = ch.getAttribute("data-filter");
    applyFilter(f);
    if (history.replaceState) {
      var q = f.indexOf("c:") === 0 ? "?c=" + encodeURIComponent(f.slice(2)) : "";
      history.replaceState(null, "", location.pathname + q + location.hash);
    }
  });

  /* Home: shop by collection */
  function renderCollections() {
    var box = $("[data-collections]");
    if (!box) return;
    var sec = box.closest("[data-collections-section]");
    if (sec) sec.hidden = !COLLECTIONS.length;
    box.innerHTML = COLLECTIONS.map(function (c, i) {
      var count = PRODUCTS.filter(function (p) { return p.collection === c.id; }).length;
      return '<a class="col-card" href="shop.html?c=' + encodeURIComponent(c.id) + '" data-reveal style="--d:' + i * 120 + 'ms">' +
        '<div class="col-card__media">' + (c.image ? '<img ' + sized(c.image, "(min-width: 640px) 50vw, 100vw") + ' alt="" loading="lazy" decoding="async">' : "") + "</div>" +
        '<div class="col-card__text"><h3 class="col-card__name">' + esc(c.name) + "</h3>" +
          '<p class="col-card__count">' + count + (count === 1 ? " piece" : " pieces") + "</p>" +
          (c.tagline ? '<p class="col-card__tag">' + esc(c.tagline) + "</p>" : "") + "</div></a>";
    }).join("");
    skel(box);
    observeAll(box);
  }

  /* Quote slider */
  $$("[data-slider]").forEach(function (box) {
    var sets = $$(".note__set", box);
    var idx = 0;
    function go(n) {
      idx = (n + sets.length) % sets.length;
      sets.forEach(function (s, k) {
        s.classList.toggle("is-active", k === idx);
        s.setAttribute("aria-hidden", String(k !== idx));
      });
      var live = $("[data-slider-status]", box);
      if (live) live.textContent = "Note " + (idx + 1) + " of " + sets.length;
    }
    var prev = $("[data-prev]", box), next = $("[data-next]", box);
    prev && prev.addEventListener("click", function () { go(idx - 1); });
    next && next.addEventListener("click", function () { go(idx + 1); });
    go(0);
  });

  /* ======================================================================
     8. Bag (stored in this browser) + WhatsApp checkout
     ====================================================================== */
  var BAG_KEY = "adabeke-bag";
  var bag = store(BAG_KEY) || [];
  function tidyBag() {
    bag = bag.filter(function (l) { var p = byId(l.id); return p && p.status === "available"; });
  }
  var bagStep = "bag"; // "bag" or "details" (Paystack checkout form)
  var DETAILS_KEY = "adabeke-details";
  var waRef = null, waRefFor = "";
  var discount = null, discountFor = ""; // { code, amount, label } checked against this bag

  doc.body.insertAdjacentHTML("beforeend",
    '<div class="drawer-scrim" data-bag-close></div>' +
    '<aside class="drawer" id="bag" role="dialog" aria-modal="true" aria-labelledby="bag-title" aria-hidden="true">' +
      '<div class="drawer__head"><h2 id="bag-title">Your <em>bag</em></h2>' +
      '<button class="icon-btn" type="button" data-bag-close aria-label="Close bag">' + ICON.close + "</button></div>" +
      '<div class="drawer__body" data-bag-body></div>' +
      '<div class="drawer__foot" data-bag-foot></div>' +
    "</aside>" +
    '<div class="toast" role="status" aria-live="polite"><span data-toast-text></span><button type="button" data-bag-open>View bag</button></div>'
  );
  var drawer = $("#bag");
  var bagBody = $("[data-bag-body]");
  var bagFoot = $("[data-bag-foot]");
  var lastFocus = null;

  function bagCount() { return bag.reduce(function (n, l) { return n + l.qty; }, 0); }
  function saveBag() { store(BAG_KEY, bag); renderBag(); }

  function bagTotals() {
    var subtotal = 0, onRequest = false;
    bag.forEach(function (l) { var p = byId(l.id); if (!p) return; if (p.price == null) onRequest = true; else subtotal += p.price * l.qty; });
    return { subtotal: subtotal, onRequest: onRequest };
  }

  // Order reference for WhatsApp orders, e.g. AB-7KQ2M9XP (same alphabet as the server)
  function waReference() {
    var sig = JSON.stringify(bag);
    if (!waRef || waRefFor !== sig) {
      var A = "23456789ABCDEFGHJKMNPQRSTUVWXYZ", buf = new Uint8Array(8), r = "AB-";
      (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(buf) : buf.forEach(function (_, i) { buf[i] = Math.random() * 256; });
      for (var i = 0; i < 8; i++) r += A[buf[i] % A.length];
      waRef = r; waRefFor = sig;
    }
    return waRef;
  }

  function renderBag() {
    var count = bagCount();
    $$("[data-bag-count]").forEach(function (el) {
      el.textContent = count;
      el.classList.toggle("has-items", count > 0);
    });
    $$("[data-bag-open]").forEach(function (b) {
      if (b.classList.contains("bag-btn")) b.setAttribute("aria-label", "Open bag, " + count + (count === 1 ? " item" : " items"));
    });
    if (!bag.length || !SHOP.paystack) bagStep = "bag";
    $("#bag-title").innerHTML = bagStep === "details" ? "Check<em>out</em>" : "Your <em>bag</em>";
    drawer.classList.toggle("is-checkout", bagStep === "details");
    if (!bag.length) {
      bagBody.innerHTML =
        '<div class="drawer__empty">' +
          '<div class="lottie lottie--bag" data-lottie aria-hidden="true" style="--i:0"></div>' +
          '<p style="--i:1">Your bag is empty.<br>Find a piece that feels like you.</p>' +
          '<a class="pill" href="shop.html" style="--i:2"><span class="pill__text">Browse the collection</span><span class="pill__icon">' + ICON.arrow + "</span></a>" +
        "</div>";
      bagFoot.hidden = true;
      if (root.classList.contains("bag-open")) initLotties(bagBody);
      return;
    }
    bagFoot.hidden = false;
    if (bagStep === "details") return renderDetails();
    setTimeout(function () { skel(bagBody); }, 0);
    bagBody.innerHTML = bag.map(function (l, k) {
      var p = byId(l.id);
      if (!p) return ""; // not in the list yet (the live list is still loading)
      var img = p.images && p.images[0]
        ? '<img src="' + esc(small(p.images[0])) + '" alt="" loading="lazy">'
        : '<div class="ph"><span class="ph__name">' + esc(p.placeholder || plainName(p.name)) + "</span></div>";
      return (
        '<div class="line-item" data-line="' + esc(p.id) + '" style="--i:' + k + '">' +
          '<div class="line-item__img">' + img + "</div>" +
          "<div>" +
            '<div class="line-item__top"><span>' + richName(p.name) + "</span><span>" + esc(p.price == null ? "On request" : naira(p.price * l.qty)) + "</span></div>" +
            '<p class="line-item__sub">' + subLine(p) + "</p>" +
            '<div class="line-item__ctrl">' +
              '<div class="qty"><button type="button" data-qty="-1" aria-label="Remove one ' + esc(plainName(p.name)) + '">' + ICON.minus + "</button>" +
              "<output aria-live=\"polite\">" + l.qty + "</output>" +
              '<button type="button" data-qty="1" aria-label="Add one more ' + esc(plainName(p.name)) + '">' + ICON.plus + "</button></div>" +
              '<button type="button" class="remove-btn" data-remove>Remove</button>' +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");

    var t = bagTotals();
    var online = SHOP.paystack && !t.onRequest;
    var waBtn = '<span class="pill__text">Checkout on WhatsApp</span><span class="pill__icon">' + ICON.wa + "</span>";
    var html = '<div class="drawer__total"><span>Subtotal</span><strong>' + naira(t.subtotal) + "</strong></div>";
    if (online) {
      html +=
        '<p class="small">Delivery is added at the next step. Pay securely by card, bank transfer or USSD.</p>' +
        '<button class="pill pill--navy pill--block" type="button" data-checkout-start><span class="pill__text">Checkout</span><span class="pill__icon">' + ICON.arrow + "</span></button>" +
        '<a class="drawer__alt" data-checkout target="_blank" rel="noopener" href="#">' + ICON.wa + "<span>Or order on WhatsApp</span></a>";
    } else {
      html +=
        '<p class="small">' + (t.onRequest ? "Some pieces are priced on request — we'll confirm the total with you. " : "") +
        "We confirm delivery and payment with you on WhatsApp. We deliver worldwide.</p>" +
        '<a class="pill pill--navy pill--block" data-checkout target="_blank" rel="noopener" href="#">' + waBtn + "</a>";
    }
    bagFoot.innerHTML = html;
    $("[data-checkout]", bagFoot).href = waLink(orderMessage());
  }

  function orderMessage() {
    var lines = ["Hello ADA BEKE! I'd like to order:", ""];
    var t = bagTotals();
    bag.forEach(function (l) {
      var p = byId(l.id);
      if (!p) return;
      var price = p.price == null ? "price on request" : naira(p.price * l.qty);
      lines.push("• " + plainName(p.name) + (p.colour ? " (" + p.colour + ")" : "") + " × " + l.qty + " — " + price);
    });
    lines.push("", "Subtotal: " + naira(t.subtotal) + (t.onRequest ? " + pieces on request" : ""));
    if (SHOP.db) lines.push("Order ref: " + waReference());
    lines.push("", "My name:", "Delivery city & country:");
    return lines.join("\n");
  }

  // WhatsApp checkout: also note the order in the admin under the same reference
  bagFoot.addEventListener("click", function (e) {
    if (e.target.closest("[data-checkout-start]")) {
      bagStep = "details";
      renderBag();
      var first = $("#co-name", bagBody);
      if (first && !first.value) setTimeout(function () { first.focus(); }, 60);
      return;
    }
    if (!e.target.closest("[data-checkout]") || !SHOP.db || !window.fetch) return;
    var payload = JSON.stringify({ channel: "whatsapp", reference: waReference(), items: bag });
    try {
      fetch("/api/checkout", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: payload }).catch(function () {});
    } catch (err) { /* never block the WhatsApp link */ }
  });

  /* Checkout form (Paystack) */
  function coField(id, label, type, auto, value, opts) {
    opts = opts || {};
    var input = type === "textarea"
      ? '<textarea id="co-' + id + '" name="' + id + '" rows="' + (opts.rows || 3) + '" autocomplete="' + auto + '"' + (opts.optional ? "" : " required") + ">" + esc(value || "") + "</textarea>"
      : '<input id="co-' + id + '" name="' + id + '" type="' + type + '" autocomplete="' + auto + '" value="' + esc(value || "") + '"' +
        (opts.inputmode ? ' inputmode="' + opts.inputmode + '"' : "") + (opts.optional ? "" : " required") + ">";
    return '<div class="field" style="--i:' + (opts.i || 0) + '"><label for="co-' + id + '">' + label + (opts.optional ? ' <span class="field__opt">optional</span>' : "") + "</label>" + input +
      (opts.hint ? '<span class="hint">' + opts.hint + "</span>" : "") +
      '<p class="error">' + (opts.error || "Please fill this in.") + "</p></div>";
  }
  function chosenZone() {
    var r = $('input[name="delivery"]:checked', bagBody);
    var zones = SHOP.delivery || [];
    for (var i = 0; i < zones.length; i++) if (r && zones[i].name === r.value) return zones[i];
    return null;
  }
  function currentDiscount() {
    if (discount && discountFor !== JSON.stringify(bag)) discount = null; // the bag changed: check again
    return discount;
  }
  function updateCheckoutTotals() {
    var t = bagTotals();
    var zones = SHOP.delivery || [];
    var z = chosenZone();
    var fee = z ? z.fee : 0;
    var d = currentDiscount();
    var off = d ? d.amount : 0;
    var total = t.subtotal - off + fee;
    var del = $("[data-co-delivery]", bagFoot), tot = $("[data-co-total]", bagFoot), pay = $("[data-co-pay]", bagFoot);
    var drow = $("[data-co-discount-row]", bagFoot), fxEl = $("[data-co-fx]", bagFoot);
    if (del) del.textContent = !zones.length ? "We'll confirm it with you" : z ? (z.fee ? naira(z.fee) : "Free") : "Choose below";
    if (drow) {
      drow.hidden = !d;
      if (d) $("[data-co-discount]", drow).textContent = "−" + naira(off);
      if (d) $("[data-co-discount-label]", drow).textContent = "Discount (" + d.code + ")";
    }
    if (tot) tot.textContent = naira(total);
    if (pay) pay.textContent = "Pay " + naira(total);
    if (fxEl) {
      var fx = fxText(total);
      fxEl.hidden = !fx;
      fxEl.textContent = fx ? fx + ". You pay in naira; your bank converts it." : "";
    }
  }
  function applyCode() {
    var input = $("#co-code", bagBody);
    if (!input) return;
    var field = input.closest(".field");
    var msg = $("[data-code-msg]", bagBody);
    var btn = $("[data-apply-code]", bagBody);
    var code = input.value.trim();
    field.classList.remove("has-error");
    if (!code) { discount = null; msg.textContent = ""; updateCheckoutTotals(); return; }
    btn.disabled = true;
    btn.textContent = "Checking…";
    fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quote", items: bag, code: code }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        btn.disabled = false;
        btn.textContent = "Apply";
        if (res.ok && res.j.discount) {
          discount = res.j.discount;
          discountFor = JSON.stringify(bag);
          input.value = discount.code;
          msg.textContent = discount.code + ": " + discount.label + " (−" + naira(discount.amount) + ")";
        } else {
          discount = null;
          msg.textContent = "";
          $(".error", field).textContent = (res.j && res.j.error) || "That code didn't work.";
          field.classList.add("has-error");
        }
        updateCheckoutTotals();
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = "Apply";
        $(".error", field).textContent = "We couldn't check that code. Check your internet and try again.";
        field.classList.add("has-error");
      });
  }
  function renderDetails() {
    var d = store(DETAILS_KEY) || {};
    var zones = SHOP.delivery || [];
    var picked = zones.some(function (z) { return z.name === d.delivery; }) ? d.delivery : zones.length === 1 ? zones[0].name : "";
    var count = bagCount();
    bagBody.innerHTML =
      '<form class="checkout form" id="checkout-form" novalidate>' +
        '<button type="button" class="checkout__back" data-checkout-back style="--i:0">' + ICON.left + "<span>Back to bag</span></button>" +
        '<p class="checkout__lead" style="--i:1">' + count + (count === 1 ? " piece" : " pieces") + " &middot; " + naira(bagTotals().subtotal) + ". Where should we send " + (count === 1 ? "it" : "them") + "?</p>" +
        '<div class="checkout__error" role="alert" hidden></div>' +
        coField("name", "Full name", "text", "name", d.name, { i: 2, error: "Enter your full name." }) +
        coField("email", "Email", "email", "email", d.email, { i: 3, inputmode: "email", hint: "Your receipt goes here.", error: "Enter a valid email address." }) +
        coField("phone", "Phone (WhatsApp)", "tel", "tel", d.phone, { i: 4, inputmode: "tel", hint: "We&rsquo;ll message you about delivery.", error: "Enter a phone number we can reach you on." }) +
        coField("country", "Country", "text", "country-name", d.country || "Nigeria", { i: 5 }) +
        '<div class="form__row checkout__row">' +
          coField("state", "State / region", "text", "address-level1", d.state, { i: 6, optional: true }) +
          coField("city", "City / town", "text", "address-level2", d.city, { i: 6 }) +
        "</div>" +
        coField("address", "Delivery address", "textarea", "street-address", d.address, { i: 7, rows: 2, error: "Enter the address we should deliver to." }) +
        (zones.length
          ? '<fieldset class="zones field" style="--i:8"><legend>Delivery</legend>' +
              zones.map(function (z, k) {
                return '<label class="zone"><input type="radio" name="delivery" value="' + esc(z.name) + '"' + (z.name === picked ? " checked" : "") + (k === 0 ? " required" : "") + ">" +
                  '<span class="zone__name">' + esc(z.name) + '</span><span class="zone__fee">' + (z.fee ? naira(z.fee) : "Free") + "</span></label>";
              }).join("") +
              '<p class="error">Choose how you&rsquo;d like it delivered.</p></fieldset>'
          : '<p class="small checkout__note" style="--i:8">We deliver worldwide. We&rsquo;ll confirm the delivery cost with you on WhatsApp after you order.</p>') +
        coField("note", "Note for us", "textarea", "off", "", { i: 9, rows: 2, optional: true }) +
        '<div class="field coupon" style="--i:10"><label for="co-code">Discount code <span class="field__opt">optional</span></label>' +
          '<div class="coupon__row"><input id="co-code" name="code" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" value="' + esc(currentDiscount() ? discount.code : "") + '">' +
          '<button type="button" class="coupon__btn" data-apply-code>Apply</button></div>' +
          '<span class="hint" data-code-msg aria-live="polite">' + (currentDiscount() ? esc(discount.code + ": " + discount.label + " (−" + naira(discount.amount) + ")") : "") + "</span>" +
          '<p class="error">That code didn&rsquo;t work.</p></div>' +
      "</form>";
    bagFoot.innerHTML =
      '<div class="checkout__sum">' +
        '<div class="drawer__total drawer__total--sm"><span>Subtotal</span><span>' + naira(bagTotals().subtotal) + "</span></div>" +
        '<div class="drawer__total drawer__total--sm" data-co-discount-row hidden><span data-co-discount-label>Discount</span><span data-co-discount></span></div>' +
        '<div class="drawer__total drawer__total--sm"><span>Delivery</span><span data-co-delivery></span></div>' +
        '<div class="drawer__total"><span>Total</span><strong data-co-total></strong></div>' +
        '<p class="checkout__fx" data-co-fx hidden></p>' +
      "</div>" +
      '<button class="pill pill--navy pill--block" type="submit" form="checkout-form"><span class="pill__text" data-co-pay></span><span class="pill__icon">' + ICON.lock + "</span></button>" +
      '<p class="checkout__secure">Secured by Paystack &middot; card, bank transfer or USSD</p>';
    updateCheckoutTotals();
  }
  function showCheckoutError(j, fields) {
    var box = $(".checkout__error", bagBody);
    if (!box) return;
    var msg = (j && j.error) || "Something went wrong. Please try again.";
    box.innerHTML = "<p>" + esc(msg) + "</p>" + (j && j.whatsapp ? '<a target="_blank" rel="noopener" href="' + esc(waLink(orderMessage())) + '">' + ICON.wa + "<span>Order on WhatsApp instead</span></a>" : "");
    box.hidden = false;
    (fields || []).forEach(function (f) {
      var el = $('[name="' + f + '"]', bagBody);
      var field = el && el.closest(".field");
      if (field) field.classList.add("has-error");
    });
    box.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }
  bagBody.addEventListener("change", function (e) {
    if (e.target.name === "delivery") {
      var f = e.target.closest(".field");
      if (f) f.classList.remove("has-error");
      updateCheckoutTotals();
    }
  });
  bagBody.addEventListener("input", function (e) {
    var f = e.target.closest && e.target.closest(".field");
    if (f && e.target.value.trim()) f.classList.remove("has-error");
    if (e.target.id === "co-code" && discount && e.target.value.trim().toUpperCase() !== discount.code) {
      discount = null;
      $("[data-code-msg]", bagBody).textContent = "";
      updateCheckoutTotals();
    }
  });
  bagBody.addEventListener("keydown", function (e) {
    if (e.target.id === "co-code" && e.key === "Enter") { e.preventDefault(); applyCode(); }
  });
  bagBody.addEventListener("submit", function (e) {
    e.preventDefault();
    var form = e.target;
    var f = form.elements;
    var val = function (n) { return f[n] ? String(f[n].value || "").trim() : ""; };
    var bad = [];
    if (!val("name")) bad.push("name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) bad.push("email");
    if (val("phone").replace(/\D/g, "").length < 7) bad.push("phone");
    if (!val("country")) bad.push("country");
    if (!val("city")) bad.push("city");
    if (!val("address")) bad.push("address");
    if ((SHOP.delivery || []).length && !chosenZone()) bad.push("delivery");
    $$(".field", form).forEach(function (fl) { fl.classList.remove("has-error"); });
    $(".checkout__error", form).hidden = true;
    if (bad.length) {
      bad.forEach(function (n) { var el = $('[name="' + n + '"]', form); if (el) el.closest(".field").classList.add("has-error"); });
      var firstBad = $('[name="' + bad[0] + '"]', form);
      if (firstBad) firstBad.focus();
      return;
    }
    var z = chosenZone();
    var details = { name: val("name"), email: val("email"), phone: val("phone"), country: val("country"), state: val("state"), city: val("city"), address: val("address"), delivery: z ? z.name : "" };
    store(DETAILS_KEY, details);
    var btn = $('[form="checkout-form"]', bagFoot);
    var label = $("[data-co-pay]", bagFoot);
    btn.disabled = true;
    btn.classList.add("is-busy");
    label.textContent = "Taking you to Paystack…";
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "paystack", items: bag, delivery: details.delivery, code: val("code"), customer: Object.assign({ note: val("note") }, details) }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.url) {
          store("adabeke-pending", res.j.reference);
          location.href = res.j.url;
          return;
        }
        btn.disabled = false;
        btn.classList.remove("is-busy");
        updateCheckoutTotals();
        showCheckoutError(res.j, res.j.fields);
      })
      .catch(function () {
        btn.disabled = false;
        btn.classList.remove("is-busy");
        updateCheckoutTotals();
        showCheckoutError({ error: "We couldn't connect. Check your internet and try again." });
      });
  });

  function addToBag(id) {
    var line = null;
    bag.forEach(function (l) { if (l.id === id) line = l; });
    if (line) line.qty++;
    else bag.push({ id: id, qty: 1 });
    saveBag();
    if (header) header.classList.toggle("is-hidden", false); // show the bag count as it bumps
    root.classList.toggle("header-hidden", false);
    $$("[data-bag-count]").forEach(function (el) {
      el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    });
    toast(plainName(byId(id).name) + " added to your bag");
  }

  bagBody.addEventListener("click", function (e) {
    if (e.target.closest("[data-apply-code]")) { applyCode(); return; }
    if (e.target.closest("[data-checkout-back]")) {
      bagStep = "bag";
      renderBag();
      var sb = $("[data-checkout-start]", bagFoot);
      if (sb) sb.focus();
      return;
    }
    var row = e.target.closest("[data-line]");
    if (!row) return;
    var id = row.getAttribute("data-line");
    var q = e.target.closest("[data-qty]");
    if (q) {
      bag.forEach(function (l) { if (l.id === id) l.qty = Math.max(0, l.qty + Number(q.getAttribute("data-qty"))); });
      bag = bag.filter(function (l) { return l.qty > 0; });
      saveBag();
      var again = $('[data-line="' + id + '"] [data-qty="' + q.getAttribute("data-qty") + '"]', bagBody);
      (again || $("[data-bag-close]", drawer)).focus();
    }
    if (e.target.closest("[data-remove]")) {
      bag = bag.filter(function (l) { return l.id !== id; });
      saveBag();
      $("[data-bag-close]", drawer).focus();
    }
  });

  function setBag(open) {
    root.classList.toggle("bag-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    [$("#main"), $(".site-footer"), header].forEach(function (el) { if (el) el.inert = open; });
    drawer.classList.toggle("is-settled", false);
    if (open) {
      lastFocus = doc.activeElement;
      setTimeout(function () { drawer.classList.add("is-settled"); }, 1400);
      initLotties(bagBody);
      setTimeout(function () { $("[data-bag-close]", drawer).focus(); }, 80);
    } else {
      if (bagStep !== "bag") setTimeout(function () { bagStep = "bag"; renderBag(); }, 600);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
  }
  doc.addEventListener("click", function (e) {
    if (e.target.closest("[data-bag-open]")) { e.preventDefault(); setBag(true); toastEl.classList.remove("is-on"); }
    if (e.target.closest("[data-bag-close]")) setBag(false);
  });

  var toastEl = $(".toast");
  var toastTimer;
  function toast(msg) {
    $("[data-toast-text]", toastEl).textContent = msg;
    toastEl.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("is-on"); }, 4200);
  }

  /* ======================================================================
     9. Product details dialog
     ====================================================================== */
  var dlg = null;
  function buildDialog() {
    doc.body.insertAdjacentHTML("beforeend",
      '<dialog class="pdialog" aria-labelledby="pd-title">' +
        '<button class="icon-btn pdialog__close" type="button" data-pd-close aria-label="Close details">' + ICON.close + "</button>" +
        '<div class="pdialog__grid">' +
          '<div class="pdialog__gallery"><div class="pdialog__main" data-pd-main></div><div class="pdialog__thumbs" data-pd-thumbs></div></div>' +
          '<div class="pdialog__info">' +
            '<p class="label" data-pd-label style="--i:0"></p>' +
            '<h2 class="pdialog__title" id="pd-title" data-pd-title style="--i:1"></h2>' +
            '<p class="pdialog__price" style="--i:2"><span data-pd-price></span><span class="pdialog__fx" data-pd-fx></span></p>' +
            '<p class="small" data-pd-desc style="--i:3"></p>' +
            '<p class="pdialog__fit" data-pd-fit style="--i:3" hidden></p>' +
            '<dl class="spec" data-pd-spec style="--i:4"></dl>' +
            '<div class="pdialog__actions" data-pd-actions style="--i:5"></div>' +
            '<div class="pdialog__related" data-pd-related style="--i:6"></div>' +
          "</div>" +
        "</div>" +
      "</dialog>"
    );
    dlg = $(".pdialog");
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-pd-close]")) dlg.close();
      var add = e.target.closest("[data-pd-add]");
      if (add) { addToBag(add.getAttribute("data-pd-add")); dlg.close(); }
      var th = e.target.closest("[data-pd-thumb]");
      if (th) showImage(th.getAttribute("data-pd-thumb"));
      var rel = e.target.closest("[data-pd-open]");
      if (rel) {
        e.preventDefault();
        openProduct(rel.getAttribute("data-pd-open"));
        dlg.scrollTop = 0;
        var info = $(".pdialog__info", dlg);
        if (info) info.scrollTop = 0;
        var t = $("[data-pd-title]", dlg);
        if (t) { t.setAttribute("tabindex", "-1"); t.focus({ preventScroll: true }); }
      }
    });
    dlg.addEventListener("close", function () {
      if (/[?&]p=/.test(location.search) && history.replaceState) history.replaceState(null, "", location.pathname + location.hash);
    });
    // swipe between photos on phones
    var main = $("[data-pd-main]", dlg), sx = null, sy = null;
    main.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    main.addEventListener("touchend", function (e) {
      if (sx === null || !current || current.images.length < 2) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      var n = current.images.length;
      showImage((shown + (dx < 0 ? 1 : -1) + n) % n);
    }, { passive: true });
  }
  var current = null, shown = 0;
  function showImage(i) {
    i = Number(i);
    shown = i;
    var p = current;
    $("[data-pd-main]", dlg).innerHTML = p.images.length
      ? '<img ' + sized(p.images[i], "(min-width: 900px) 50vw, 100vw") + ' alt="' + esc([plainName(p.name), p.colour, "photo " + (i + 1)].filter(Boolean).join(", ")) + '">'
      : '<div class="ph"><span class="ph__name">' + esc(p.placeholder || plainName(p.name)) + '</span><span class="ph__note">Photo coming soon</span></div>';
    $$("[data-pd-thumb]", dlg).forEach(function (b) { b.setAttribute("aria-current", String(Number(b.getAttribute("data-pd-thumb")) === i)); });
    skel(dlg);
  }
  function openProduct(id) {
    var p = byId(id);
    if (!p) return;
    if (!dlg) buildDialog();
    current = p;
    $("[data-pd-label]", dlg).textContent = [p.badge, p.fit].filter(Boolean).join(" · ");
    $("[data-pd-title]", dlg).innerHTML = richName(p.name);
    var price = $("[data-pd-price]", dlg);
    price.textContent = priceText(p);
    price.parentNode.classList.toggle("is-request", p.price == null);
    $("[data-pd-fx]", dlg).textContent = p.price != null ? fxText(p.price) : "";
    $("[data-pd-desc]", dlg).textContent = p.description;
    var fit = $("[data-pd-fit]", dlg);
    fit.hidden = !p.fitNote;
    fit.innerHTML = p.fitNote ? "<strong>Fit note</strong> " + esc(p.fitNote) : "";
    var rows = [["Colour", p.colour], ["Fabric", p.fabric], ["Fit", p.fit], ["Includes", p.includes], ["Delivery", "Worldwide via DHL"]];
    if (p.status === "sold_out") $("[data-pd-label]", dlg).textContent = ["Sold out", p.fit].filter(Boolean).join(" · ");
    $("[data-pd-spec]", dlg).innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r, i) {
      return '<div style="--i:' + i + '"><dt>' + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("");
    $("[data-pd-thumbs]", dlg).innerHTML = p.images.length > 1 ? p.images.map(function (src, i) {
      return '<button type="button" data-pd-thumb="' + i + '" aria-label="Show photo ' + (i + 1) + '"><img src="' + esc(small(src)) + '" alt=""></button>';
    }).join("") : "";
    var actions = $("[data-pd-actions]", dlg);
    if (p.status === "sold_out") {
      actions.innerHTML = '<button class="pill pill--block pill--off" type="button" disabled><span class="pill__text">Sold out</span></button>' +
        '<a class="pill pill--ghost pill--block" target="_blank" rel="noopener" href="' + esc(waLink("Hello ADA BEKE! Will " + plainName(p.name) + " be restocked?")) + '"><span class="pill__text">Ask about a restock</span><span class="pill__icon">' + ICON.wa + "</span></a>";
    } else if (p.status === "soon") {
      var waSoon = '<a class="pill ' + (SHOP.db ? "pill--ghost" : "pill--navy") + ' pill--block" target="_blank" rel="noopener" href="' + esc(waLink("Hello ADA BEKE! Please let me know when " + plainName(p.name) + " drops.")) + '"><span class="pill__text">' + (SHOP.db ? "Or ask on WhatsApp" : "Tell me when it drops") + '</span><span class="pill__icon">' + ICON.wa + "</span></a>";
      actions.innerHTML = SHOP.db
        ? '<form class="early-mini" data-early data-source="piece:' + esc(p.id) + '" novalidate>' +
            '<p class="early-mini__title">Get early access</p>' +
            '<p class="small">Be the first to know when ' + esc(plainName(p.name)) + " drops.</p>" +
            '<div class="wa-form wa-form--light"><label class="sr-only" for="ea-pd">Email or WhatsApp number</label>' +
              '<input id="ea-pd" name="contact" type="text" placeholder="Email or WhatsApp number" autocomplete="email" required>' +
              '<button type="submit">Notify me</button></div>' +
            '<p class="small early-mini__msg" data-early-msg aria-live="polite"></p>' +
          "</form>" + waSoon
        : waSoon;
    } else {
      actions.innerHTML =
        '<button class="pill pill--navy pill--block" type="button" data-pd-add="' + esc(p.id) + '"><span class="pill__text">Add to bag</span><span class="pill__icon">' + ICON.plus + "</span></button>" +
        '<a class="pill pill--ghost pill--block" target="_blank" rel="noopener" href="' + esc(waLink("Hello ADA BEKE! I'd like to order the " + plainName(p.name) + (p.colour ? " (" + p.colour + ")" : "") + (p.price != null ? " — " + naira(p.price) : "") + ".")) + '"><span class="pill__text">Order this on WhatsApp</span><span class="pill__icon">' + ICON.wa + "</span></a>";
    }
    // You may also like: same collection first, then the rest
    var others = PRODUCTS.filter(function (x) { return x.id !== p.id; });
    var rank = function (x) { return (x.collection && x.collection === p.collection ? 0 : 2) + (x.status === "available" ? 0 : 1); };
    var picks = others.slice().sort(function (a, b) { return rank(a) - rank(b); }).slice(0, 3);
    $("[data-pd-related]", dlg).innerHTML = picks.length
      ? '<p class="label">You may also like</p><div class="related">' + picks.map(function (x) {
          return '<a class="related__item" href="shop.html?p=' + encodeURIComponent(x.id) + '" data-pd-open="' + esc(x.id) + '">' +
            '<span class="related__img">' + (x.images && x.images[0] ? '<img src="' + esc(small(x.images[0])) + '" alt="" loading="lazy">' : "") + "</span>" +
            '<span class="related__name">' + richName(x.name) + '</span><span class="related__price">' + esc(priceText(x)) + "</span></a>";
        }).join("") + "</div>"
      : "";
    showImage(0);
    skel($("[data-pd-related]", dlg));
    if (!dlg.open) {
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    }
    // shareable link to this piece, without leaving the page
    if (history.replaceState) history.replaceState(null, "", location.pathname + "?p=" + encodeURIComponent(p.id) + location.hash);
  }
  // Tapping a piece anywhere opens its details right here: no page change
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-product]");
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openProduct(a.getAttribute("data-product"));
  });
  function openDeepLink() {
    var qp = /[?&]p=([^&]+)/.exec(location.search);
    if (qp) setTimeout(function () { openProduct(decodeURIComponent(qp[1])); }, reduceMotion ? 0 : 500);
  }

  /* ======================================================================
     9b. Order page (after Paystack, or from a link)
     ====================================================================== */
  function initOrderPage() {
    var box = $("[data-order]");
    if (!box) return;
    var qs = new URLSearchParams(location.search);
    var fromPaystack = !!(qs.get("reference") || qs.get("trxref"));
    var ref = String(qs.get("reference") || qs.get("trxref") || qs.get("ref") || store("adabeke-pending") || "").trim().toUpperCase();
    var title = $("[data-order-title]"), desc = $("[data-order-desc]"), refEl = $("[data-order-ref]"), actions = $("[data-order-actions]");
    var tries = 0;

    function setTitle(html) { title.innerHTML = html; }
    function pills(list) {
      actions.innerHTML = list.map(function (a) {
        return a.bag
          ? '<button class="pill pill--light" type="button" data-bag-open><span class="pill__text">' + a.text + '</span><span class="pill__icon">' + ICON.arrow + "</span></button>"
          : '<a class="pill ' + (a.cls || "pill--light") + '" href="' + esc(a.href) + '"' + (a.ext ? ' target="_blank" rel="noopener"' : "") + '><span class="pill__text">' + a.text + '</span><span class="pill__icon">' + (a.icon || ICON.arrow) + "</span></a>";
      }).join("");
    }
    function summary(o) {
      var rows = o.items.map(function (i, k) {
        return '<li class="order-line" style="--i:' + k + '">' +
          '<div class="order-line__img">' + (i.image ? '<img src="' + esc(small(i.image)) + '" alt="" loading="lazy">' : "") + "</div>" +
          '<div><p class="order-line__name">' + esc(i.name) + '</p><p class="order-line__sub">' + esc([i.colour, "× " + i.qty].filter(Boolean).join(" · ")) + "</p></div>" +
          '<p class="order-line__price">' + (i.price == null ? "On request" : naira(i.price * i.qty)) + "</p></li>";
      }).join("");
      return '<div class="order-card">' +
        '<h2 class="order-card__title">Your <em>order</em></h2>' +
        '<ul class="order-card__lines">' + rows + "</ul>" +
        '<div class="order-card__sum">' +
          '<div><span>Subtotal</span><span>' + naira(o.subtotal) + "</span></div>" +
          (o.discount ? "<div><span>Discount &middot; " + esc(o.discount.code) + "</span><span>−" + naira(o.discount.amount) + "</span></div>" : "") +
          (o.delivery ? "<div><span>Delivery &middot; " + esc(o.delivery.name) + "</span><span>" + (o.delivery.fee ? naira(o.delivery.fee) : "Free") + "</span></div>" : "") +
          '<div class="order-card__total"><span>Total</span><strong>' + naira(o.total) + "</strong></div>" +
        "</div></div>";
    }
    function show(o) {
      var waText = "Hello ADA BEKE! " + (o ? "My order reference is " + o.reference + "." : "I have a question about my order.");
      var wa = { text: "Message us on WhatsApp", href: waLink(waText), ext: true, icon: ICON.wa, cls: "pill--light" };
      if (!o) {
        refEl.textContent = ref ? ref : "Order";
        setTitle("We can&rsquo;t find that order");
        desc.textContent = "The link may be incomplete. If you’ve paid, don’t worry: message us with your receipt and we’ll sort it out.";
        pills([{ text: "Back to the shop", href: "shop.html" }, wa]);
        box.innerHTML = "";
        return;
      }
      refEl.textContent = "Order " + o.reference;
      var name = o.firstName ? esc(o.firstName) : "";
      if (o.payment === "paid") {
        setTitle("Thank you" + (name ? ", " + name : ""));
        desc.textContent = o.channel === "paystack"
          ? "Your payment of " + naira(o.total) + " is confirmed. Paystack has emailed your receipt, and we’ll message you on WhatsApp to arrange delivery."
          : "Your order is confirmed and paid. We’ll message you on WhatsApp to arrange delivery.";
        pills([{ text: "Continue shopping", href: "shop.html" }, wa]);
        if (bag.length) { bag = []; saveBag(); }
        try { localStorage.removeItem("adabeke-pending"); } catch (e) {}
        root.classList.add("order-paid");
      } else if (o.status === "cancelled") {
        setTitle("This order was cancelled");
        desc.textContent = "If that’s a surprise, message us and we’ll help.";
        pills([{ text: "Back to the shop", href: "shop.html" }, wa]);
      } else if (o.channel === "whatsapp") {
        setTitle("We&rsquo;ve got your order");
        desc.textContent = "We’ll confirm your total, payment and delivery with you on WhatsApp.";
        pills([wa, { text: "Back to the shop", href: "shop.html", cls: "pill--ghost" }]);
      } else {
        setTitle("Payment not completed");
        desc.textContent = bag.length
          ? "No money was taken. Your bag is saved, so you can try again whenever you’re ready."
          : "No money was taken. You can place your order again, or message us and we’ll help.";
        pills([bag.length ? { text: "Back to my bag", bag: true } : { text: "Back to the shop", href: "shop.html" }, wa]);
      }
      box.innerHTML = summary(o);
      skel(box);
      observeAll(box);
    }
    function load() {
      if (!/^AB-[A-Z0-9]{8}$/.test(ref)) return show(null);
      fetch("/api/order?ref=" + encodeURIComponent(ref), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (o) {
          // Paystack can take a moment to confirm: check a few more times
          if (o && fromPaystack && o.channel === "paystack" && o.payment !== "paid" && o.status !== "cancelled" && tries < 4) {
            tries++;
            desc.textContent = "Confirming your payment with Paystack…";
            return setTimeout(load, 2500);
          }
          show(o);
        })
        .catch(function () {
          desc.textContent = "We couldn’t check your order just now. Refresh the page to try again.";
        });
    }
    load();
  }

  /* ======================================================================
     9c. Early access sign-up (footer, and pieces that are dropping soon)
     ====================================================================== */
  doc.addEventListener("submit", function (e) {
    var form = e.target.closest && e.target.closest("[data-early]");
    if (!form) return;
    e.preventDefault();
    var input = form.elements.contact;
    var box = form.closest(".footer__early") || form;
    var msg = $("[data-early-msg]", box);
    var btn = $('button[type="submit"]', form);
    var value = String(input.value || "").trim();
    var looksOk = value.indexOf("@") > 0 ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) : value.replace(/\D/g, "").length >= 8;
    if (!looksOk) {
      msg.textContent = "Enter an email address, or a WhatsApp number with its country code.";
      msg.classList.add("is-error");
      input.focus();
      return;
    }
    if (!SHOP.db) {
      // No list yet: send the request on WhatsApp instead
      window.open(waLink("Hello ADA BEKE! Please add me to your early-access list: " + value), "_blank", "noopener");
      return;
    }
    btn.disabled = true;
    msg.classList.remove("is-error");
    msg.textContent = "Adding you…";
    fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: value, source: form.getAttribute("data-source") || "" }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        btn.disabled = false;
        if (res.ok) {
          form.classList.add("is-done");
          input.value = "";
          msg.textContent = res.j.already ? "You're already on the list. We'll be in touch." :
            res.j.kind === "whatsapp" ? "You're on the list. We'll message you on WhatsApp before the next drop." : "You're on the list. Watch your inbox before the next drop.";
        } else {
          msg.textContent = (res.j && res.j.error) || "That didn't work. Please try again.";
          msg.classList.add("is-error");
        }
      })
      .catch(function () {
        btn.disabled = false;
        msg.textContent = "We couldn't connect. Check your internet and try again.";
        msg.classList.add("is-error");
      });
  });

  /* ======================================================================
     10. WhatsApp forms (footer + contact page)
     ====================================================================== */
  $$("[data-wa-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var valid = true;
      $$("[required]", form).forEach(function (input) {
        var field = input.closest(".field");
        var bad = !input.value.trim();
        if (field) field.classList.toggle("has-error", bad);
        input.setAttribute("aria-invalid", String(bad));
        if (bad && valid) { input.focus(); valid = false; }
      });
      if (!valid) return;
      var kind = form.getAttribute("data-wa-form");
      var msg;
      if (kind === "quick") {
        msg = "Hello ADA BEKE! I'm looking for: " + form.elements.q.value.trim();
      } else {
        var f = form.elements;
        msg = "Hello ADA BEKE! My name is " + f.name.value.trim() + ".";
        if (f.piece && f.piece.value) msg += "\nI'm interested in: " + f.piece.value + ".";
        if (f.location && f.location.value.trim()) msg += "\nI'm in: " + f.location.value.trim() + ".";
        if (f.message && f.message.value.trim()) msg += "\n\n" + f.message.value.trim();
      }
      window.open(waLink(msg), "_blank", "noopener");
    });
    $$("input, textarea", form).forEach(function (input) {
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field && input.value.trim()) { field.classList.remove("has-error"); input.setAttribute("aria-invalid", "false"); }
      });
    });
  });

  // Fill the "piece" dropdown on the contact page from the product list
  function fillPieceOptions() { $$("[data-piece-options]").forEach(function (sel) {
    while (sel.options.length > 1) sel.remove(1);
    PRODUCTS.forEach(function (p) {
      var o = doc.createElement("option");
      o.value = plainName(p.name);
      o.textContent = plainName(p.name) + " — " + priceText(p);
      sel.appendChild(o);
    });
    var o = doc.createElement("option");
    o.value = "Not sure yet — help me choose";
    o.textContent = "Not sure yet — help me choose";
    sel.appendChild(o);
  }); }

  /* ======================================================================
     11. Lottie animation (self-hosted, loaded only when needed)
     ====================================================================== */
  var lottieLoading = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = doc.createElement("script");
      s.src = src; s.async = true; s.onload = res; s.onerror = rej;
      doc.head.appendChild(s);
    });
  }
  function getLottie() {
    if (!lottieLoading) {
      var base = (doc.querySelector('script[src*="assets/js/main.js"]') || {}).src || "";
      base = base.replace(/assets\/js\/main\.js.*$/, "");
      lottieLoading = loadScript(base + "assets/vendor/lottie_light.min.js")
        .then(function () { return window.ADA_LOTTIE_CHOOSING ? null : loadScript(base + "assets/lottie/choosing.js"); })
        .then(function () { return window.lottie; });
    }
    return lottieLoading;
  }
  function mountLottie(el) {
    if (el.__lottie) return;
    el.__lottie = true;
    getLottie().then(function (lottie) {
      if (!lottie || !window.ADA_LOTTIE_CHOOSING) return;
      var anim = lottie.loadAnimation({
        container: el,
        renderer: "svg",
        loop: true,
        autoplay: !reduceMotion,
        animationData: JSON.parse(JSON.stringify(window.ADA_LOTTIE_CHOOSING)),
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
      if (reduceMotion) anim.addEventListener("DOMLoaded", function () { anim.goToAndStop(30, true); });
      el.classList.add("is-ready");
    }).catch(function () { el.classList.add("is-ready"); }); // decorative: on failure just stop the shimmer
  }
  function initLotties(ctx) {
    $$("[data-lottie]", ctx).forEach(function (el) {
      // The bag's animation loads only once the bag is actually opened
      if (el.closest(".drawer")) {
        if (root.classList.contains("bag-open")) mountLottie(el);
        return;
      }
      if ("IntersectionObserver" in window) {
        var lo = new IntersectionObserver(function (en) {
          en.forEach(function (x) { if (x.isIntersecting) { mountLottie(el); lo.disconnect(); } });
        }, { rootMargin: "200px" });
        lo.observe(el);
      } else {
        mountLottie(el);
      }
    });
  }

  /* ======================================================================
     12. Keyboard, scroll loop, startup
     ====================================================================== */
  doc.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (root.classList.contains("bag-open")) setBag(false);
    else if (root.classList.contains("menu-open")) { setMenu(false); menuBtn && menuBtn.focus(); }
  });

  /* Home photos: phones show one at a time (they change on their own, or swipe,
     or tap a dot); laptops show all three side by side. */
  var slideBox = $("[data-slides]");
  if (slideBox) (function () {
    var slides = $$(".slide", slideBox);
    var dots = $$("[data-dot]");
    var wide = window.matchMedia("(min-width: 900px)");
    var SLIDE_MS = 5000;
    var idx = 0, timer = null, onScreen = true;

    function load(i) {
      var im = slides[i] && $("img[data-src]", slides[i]);
      if (!im) return;
      im.srcset = im.getAttribute("data-srcset");
      im.removeAttribute("data-srcset");
      im.src = im.getAttribute("data-src");
      im.removeAttribute("data-src");
      watchImg(im);
    }
    function schedule() {
      clearTimeout(timer);
      if (reduceMotion || wide.matches || !onScreen || doc.hidden) return;
      timer = setTimeout(function () { show(idx + 1); }, SLIDE_MS);
    }
    function show(i) {
      idx = (i + slides.length) % slides.length;
      load(idx);
      load((idx + 1) % slides.length);
      slides.forEach(function (s, k) { s.classList.toggle("is-active", k === idx); });
      dots.forEach(function (d, k) { d.setAttribute("aria-current", String(k === idx)); });
      schedule();
    }
    function sync() {
      if (wide.matches) slides.forEach(function (s, k) { load(k); }); // all three side by side
      schedule();
    }
    dots.forEach(function (d, k) { d.addEventListener("click", function () { show(k); }); });

    var sx = null, sy = null;
    slideBox.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    slideBox.addEventListener("touchend", function (e) {
      if (sx === null || wide.matches) return;
      var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) show(idx + (dx < 0 ? 1 : -1));
      sx = null;
    }, { passive: true });

    // Pause while the photos are off screen or the tab is hidden
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        onScreen = en[0].isIntersecting;
        schedule();
      }, { threshold: 0.25 }).observe(slideBox);
    }
    doc.addEventListener("visibilitychange", schedule);
    if (wide.addEventListener) wide.addEventListener("change", sync); else if (wide.addListener) wide.addListener(sync);
    window.addEventListener("load", function () { load(1); });
    sync();
  })();

  /* Search engines: the shop's pieces as structured data, from products.js */
  function productLd() {
    var old = $("script[data-product-ld]");
    if (old) old.remove();
    if (!$(".cards--shop") || !PRODUCTS.length) return;
    var base = /^https?:$/.test(location.protocol) ? location.origin : "https://adabeke.vercel.app";
    var items = PRODUCTS.filter(function (p) { return p.price != null && p.images && p.images.length; }).map(function (p, i) {
      var url = base + "/shop.html?p=" + encodeURIComponent(p.id);
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "Product",
          name: plainName(p.name),
          description: p.description,
          sku: p.id,
          color: p.colour,
          image: p.images.map(function (src) { return /^https?:/.test(src) ? src : base + (src.charAt(0) === "/" ? "" : "/") + src; }),
          brand: { "@type": "Brand", name: "ADA BEKE" },
          url: url,
          offers: {
            "@type": "Offer",
            price: String(p.price),
            priceCurrency: "NGN",
            availability: p.status === "soon" ? "https://schema.org/PreOrder" : p.status === "sold_out" ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            url: url,
            seller: { "@id": "https://adabeke.vercel.app/#store" },
          },
        },
      };
    });
    var s = doc.createElement("script");
    s.type = "application/ld+json";
    s.setAttribute("data-product-ld", "");
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: "ADA BEKE collection", itemListElement: items });
    doc.head.appendChild(s);
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  $$(".js-year").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  skel(doc);
  observeAll(doc);
  renderBag();
  initOrderPage();

  // Live pieces from the database. Skeleton cards show meanwhile; if the
  // catalogue is slow or missing, the built-in list is used after 2.5s.
  var catalogueUsed = false;
  function useCatalogue() {
    var live = window.ADA_SHOP;
    var first = !catalogueUsed;
    if (live && typeof live === "object") {
      SHOP = { db: !!live.db, paystack: !!live.paystack, delivery: live.delivery || [], collections: live.collections || [], fx: live.fx || null };
      if (Array.isArray(live.products)) {
        PRODUCTS = live.products;
        COLLECTIONS = live.collections || [];
      }
    }
    if (!first && !(live && Array.isArray(live.products))) return;
    catalogueUsed = true;
    root.classList.toggle("pay-online", SHOP.paystack);
    if (!(live && Array.isArray(live.products))) {
      // built-in list: only collections that have pieces
      COLLECTIONS = COLLECTIONS.filter(function (c) { return PRODUCTS.some(function (x) { return x.collection === c.id; }); });
    }
    renderCollectionChips();
    renderProducts();
    renderCollections();
    tidyBag();
    renderBag();
    fillPieceOptions();
    productLd();
    if (first) openDeepLink();
  }
  if (window.ADA_SHOP) useCatalogue();
  else {
    doc.addEventListener("ada:catalogue", useCatalogue);
    setTimeout(function () { if (!catalogueUsed) useCatalogue(); }, 2500);
  }
  initLotties(doc);
  onScrollHeader();
})();
