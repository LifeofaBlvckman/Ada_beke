/* ==========================================================================
   ADA BEKE — site behaviour
   Fades, word-by-word reveals, bag + WhatsApp checkout, product details,
   Lottie embed. Vanilla JS, no build step.
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var PRODUCTS = window.ADA_PRODUCTS || [];
  var CONTACT = window.ADA_CONTACT || { whatsapp: "2348093712578" };

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
  function naira(n) { return "₦" + Number(n).toLocaleString("en-NG"); }
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
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.36A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.08.81.82-3-.2-.31a8.2 8.2 0 1 1 6.94 3.83Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.85 2.03 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.17 3.68c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z"/></svg>',
  };

  /* ======================================================================
     1. Curtain: load fade + page-to-page fade
     ====================================================================== */
  // Arriving from another ADA BEKE page? Then skip the brand pause and lift at once.
  var NAV_KEY = "adabeke-nav";
  var fromInside = false;
  try { fromInside = sessionStorage.getItem(NAV_KEY) === "1"; sessionStorage.setItem(NAV_KEY, "0"); } catch (e) {}

  var started = false;
  function reveal() {
    // the aqua panel lifts away, then resets out of sight
    root.classList.add("is-revealing");
    root.classList.remove("is-loading", "is-leaving");
    setTimeout(function () { root.classList.remove("is-revealing"); }, reduceMotion ? 0 : 720);
  }
  function lift() {
    if (started) return;
    started = true;
    reveal();
    // page words start while the curtain lifts
    setTimeout(function () {
      $$('[data-split="load"], [data-chars="load"]').forEach(function (el) { el.classList.add("is-in"); });
      $$('[data-reveal-load]').forEach(function (el) { el.classList.add("is-in"); });
      $$(".hero .megamark, .page-hero .megamark").forEach(function (el) { el.classList.add("is-in"); });
    }, reduceMotion || fromInside ? 0 : 140);
  }
  function whenReady() {
    // Fonts swap in on their own; never hold the page back waiting for them.
    setTimeout(lift, reduceMotion || fromInside ? 0 : 420);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", whenReady);
  else whenReady();

  window.addEventListener("pageshow", function (e) {
    if (e.persisted) { if (started) reveal(); else lift(); }
  });

  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (a.target && a.target !== "_self") return;
    if (a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
    if (a.hasAttribute("data-product") && $(".cards--shop")) return; // opens details in place
    if (a.protocol !== location.protocol || a.host !== location.host) return;
    if (a.pathname === location.pathname && a.search === location.search && a.hash) return;
    if (!/\.html?$|\/$/.test(a.pathname)) return;
    if (reduceMotion) return;
    e.preventDefault();
    root.classList.add("is-leaving");
    try { sessionStorage.setItem(NAV_KEY, "1"); } catch (err) {}
    setTimeout(function () { location.href = a.href; }, 430);
  });

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
     4. Words appearing one by one
     ====================================================================== */
  function splitWords(el, cls) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var parts = ch.textContent.split(/(\s+)/);
          var frag = doc.createDocumentFragment();
          parts.forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(doc.createTextNode(p)); return; }
            var s = doc.createElement("span");
            s.className = cls;
            s.style.setProperty("--i", i++);
            s.textContent = p;
            frag.appendChild(s);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          if (ch.tagName === "BR") return;
          if (ch.tagName.toLowerCase() === "svg" || ch.classList.contains("mark")) {
            var w = doc.createElement("span");
            w.className = cls;
            w.style.setProperty("--i", i++);
            ch.parentNode.replaceChild(w, ch);
            w.appendChild(ch);
            return;
          }
          walk(ch);
        }
      });
    })(el);
    return i;
  }
  $$("[data-split]").forEach(function (el) { splitWords(el, "w"); });

  // Letter-by-letter (hero headline)
  $$("[data-chars]").forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = doc.createDocumentFragment();
          Array.prototype.forEach.call(ch.textContent, function (c) {
            if (/\s/.test(c)) { frag.appendChild(doc.createTextNode(c)); return; }
            var s = doc.createElement("span");
            s.className = "ch";
            s.style.setProperty("--i", i++);
            s.textContent = c;
            frag.appendChild(s);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          walk(ch);
        }
      });
    })(el);
  });

  /* Scroll-scrubbed paragraph: words light up as you scroll */
  var scrubs = $$("[data-scrub]").map(function (el) {
    splitWords(el, "sw");
    return { el: el, words: $$(".sw", el) };
  });
  function onScrollScrub() {
    var vh = window.innerHeight;
    scrubs.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      var start = vh * 0.9, end = vh * 0.38;
      var p = (start - r.top) / (start - end + r.height * 0.55);
      p = Math.max(0, Math.min(1, p));
      var n = Math.round(p * s.words.length);
      for (var i = 0; i < s.words.length; i++) s.words[i].classList.toggle("on", i < n);
    });
  }

  /* ======================================================================
     5. Fade-in on scroll
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
    $$("[data-reveal]:not([data-reveal-load]), [data-split]:not([data-split='load']), .site-footer .megamark", ctx).forEach(observe);
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
    var html = '<img src="' + esc(p.images[0]) + '" alt="' + esc(plainName(p.name) + ", " + p.colour) + '" loading="' + (eager ? "eager" : "lazy") + '" decoding="async" width="720" height="900">';
    if (p.images[1]) html += '<img class="alt" src="' + esc(p.images[1]) + '" alt="" loading="lazy" decoding="async" width="720" height="900">';
    return html;
  }
  function cardHTML(p, i) {
    var badgeCls = p.status === "soon" ? "card__badge card__badge--aqua" : "card__badge";
    return (
      '<article class="card" data-reveal data-cursor="' + (p.status === "soon" ? "Soon" : "View") + '" style="--d:' + (i % 4) * 110 + 'ms" data-status="' + esc(p.status) + '" data-id="' + esc(p.id) + '">' +
        '<div class="card__media">' + cardMedia(p, false) + (p.badge ? '<span class="' + badgeCls + '">' + esc(p.badge) + "</span>" : "") + "</div>" +
        '<div class="card__row"><h3 class="card__name"><a class="card__link" href="shop.html?p=' + encodeURIComponent(p.id) + '" data-product="' + esc(p.id) + '">' + richName(p.name) + "</a></h3>" +
        '<span class="card__price' + (p.price == null ? " is-request" : "") + '">' + esc(priceText(p)) + "</span></div>" +
        '<p class="card__sub">' + esc(p.colour) + " &middot; " + esc(p.fit) + "</p>" +
      "</article>"
    );
  }
  $$("[data-products]").forEach(function (box) {
    var mode = box.getAttribute("data-products");
    var list = PRODUCTS.slice(0, mode === "featured" ? 4 : PRODUCTS.length);
    box.innerHTML = list.map(function (p, i) {
      var c = cardHTML(p, i);
      return mode === "featured" ? '<div class="scatter-item">' + c + "</div>" : c;
    }).join("");
  });

  /* Shop filters */
  var chips = $$("[data-filter]");
  var countEl = $("[data-filter-count]");
  function applyFilter(f) {
    var shown = 0;
    $$(".cards--shop .card").forEach(function (c) {
      var ok = f === "all" || c.getAttribute("data-status") === f;
      c.classList.toggle("is-filtered-out", !ok);
      if (ok) { shown++; c.classList.add("is-in"); }
    });
    chips.forEach(function (ch) { ch.setAttribute("aria-pressed", String(ch.getAttribute("data-filter") === f)); });
    if (countEl) countEl.textContent = shown + (shown === 1 ? " piece" : " pieces");
  }
  chips.forEach(function (ch) {
    ch.addEventListener("click", function () { applyFilter(ch.getAttribute("data-filter")); });
  });
  if (chips.length) applyFilter("all");

  /* Piece list with image swap (home) */
  $$("[data-fit]").forEach(function (box) {
    var imgs = $$(".fit__preview img", box);
    var links = $$(".fit__list a", box);
    function activate(i) {
      imgs.forEach(function (im, k) { im.classList.toggle("is-active", k === i); });
      links.forEach(function (l, k) { l.classList.toggle("is-active", k === i); });
    }
    links.forEach(function (l, i) {
      l.addEventListener("mouseenter", function () { activate(i); });
      l.addEventListener("focus", function () { activate(i); });
    });
    activate(0);
  });

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
  bag = bag.filter(function (l) { return byId(l.id); });

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

  function renderBag() {
    var count = bagCount();
    $$("[data-bag-count]").forEach(function (el) {
      el.textContent = count;
      el.classList.toggle("has-items", count > 0);
    });
    $$("[data-bag-open]").forEach(function (b) {
      if (b.classList.contains("bag-btn")) b.setAttribute("aria-label", "Open bag, " + count + (count === 1 ? " item" : " items"));
    });
    if (!bag.length) {
      bagBody.innerHTML =
        '<div class="drawer__empty">' +
          '<div class="lottie lottie--bag" data-lottie aria-hidden="true"></div>' +
          "<p>Your bag is empty.<br><em class=\"serif-i\">Find a piece that feels like you.</em></p>" +
          '<a class="pill" href="shop.html"><span class="pill__text">Browse the collection</span><span class="pill__icon">' + ICON.arrow + "</span></a>" +
        "</div>";
      bagFoot.hidden = true;
      if (root.classList.contains("bag-open")) initLotties(bagBody);
      return;
    }
    bagFoot.hidden = false;
    bagBody.innerHTML = bag.map(function (l) {
      var p = byId(l.id);
      var img = p.images && p.images[0]
        ? '<img src="' + esc(p.images[0]) + '" alt="" loading="lazy">'
        : '<div class="ph"><span class="ph__name">' + esc(p.placeholder || plainName(p.name)) + "</span></div>";
      return (
        '<div class="line-item" data-line="' + esc(p.id) + '">' +
          '<div class="line-item__img">' + img + "</div>" +
          "<div>" +
            '<div class="line-item__top"><span>' + richName(p.name) + "</span><span>" + esc(p.price == null ? "On request" : naira(p.price * l.qty)) + "</span></div>" +
            '<p class="line-item__sub">' + esc(p.colour) + " &middot; " + esc(p.fit) + "</p>" +
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

    var subtotal = 0, onRequest = false;
    bag.forEach(function (l) { var p = byId(l.id); if (p.price == null) onRequest = true; else subtotal += p.price * l.qty; });
    bagFoot.innerHTML =
      '<div class="drawer__total"><span>Subtotal</span><strong>' + naira(subtotal) + "</strong></div>" +
      '<p class="small">' + (onRequest ? "Some pieces are priced on request — we'll confirm the total with you. " : "") +
      "We confirm delivery and payment with you on WhatsApp. We deliver worldwide.</p>" +
      '<a class="pill pill--navy pill--block" data-checkout target="_blank" rel="noopener" href="#"><span class="pill__text">Checkout on WhatsApp</span><span class="pill__icon">' + ICON.wa + "</span></a>";
    $("[data-checkout]", bagFoot).href = waLink(orderMessage());
  }

  function orderMessage() {
    var lines = ["Hello ADA BEKE! I'd like to order:", ""];
    var subtotal = 0, onRequest = false;
    bag.forEach(function (l) {
      var p = byId(l.id);
      var price = p.price == null ? "price on request" : naira(p.price * l.qty);
      if (p.price == null) onRequest = true; else subtotal += p.price * l.qty;
      lines.push("• " + plainName(p.name) + " (" + p.colour + ") × " + l.qty + " — " + price);
    });
    lines.push("", "Subtotal: " + naira(subtotal) + (onRequest ? " + pieces on request" : ""), "", "My name:", "Delivery city & country:");
    return lines.join("\n");
  }

  function addToBag(id) {
    var line = null;
    bag.forEach(function (l) { if (l.id === id) line = l; });
    if (line) line.qty++;
    else bag.push({ id: id, qty: 1 });
    saveBag();
    if (header) header.classList.toggle("is-hidden", false); // show the bag count as it bumps
    $$("[data-bag-count]").forEach(function (el) {
      el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
    });
    toast(plainName(byId(id).name) + " added to your bag");
  }

  bagBody.addEventListener("click", function (e) {
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
    if (open) {
      lastFocus = doc.activeElement;
      initLotties(bagBody);
      setTimeout(function () { $("[data-bag-close]", drawer).focus(); }, 80);
    } else if (lastFocus && lastFocus.focus) {
      lastFocus.focus();
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
            '<p class="label" data-pd-label></p>' +
            '<h2 class="pdialog__title" id="pd-title" data-pd-title></h2>' +
            '<p class="pdialog__price" data-pd-price></p>' +
            '<p class="small" data-pd-desc></p>' +
            '<dl class="spec" data-pd-spec></dl>' +
            '<div class="pdialog__actions" data-pd-actions></div>' +
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
    });
    dlg.addEventListener("close", function () {
      if (/[?&]p=/.test(location.search) && history.replaceState) history.replaceState(null, "", location.pathname);
    });
  }
  var current = null;
  function showImage(i) {
    i = Number(i);
    var p = current;
    $("[data-pd-main]", dlg).innerHTML = p.images.length
      ? '<img src="' + esc(p.images[i]) + '" alt="' + esc(plainName(p.name) + ", " + p.colour + ", photo " + (i + 1)) + '">'
      : '<div class="ph"><span class="ph__name">' + esc(p.placeholder || plainName(p.name)) + '</span><span class="ph__note">Photo coming soon</span></div>';
    $$("[data-pd-thumb]", dlg).forEach(function (b) { b.setAttribute("aria-current", String(Number(b.getAttribute("data-pd-thumb")) === i)); });
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
    price.classList.toggle("is-request", p.price == null);
    $("[data-pd-desc]", dlg).textContent = p.description;
    var rows = [["Colour", p.colour], ["Fabric", p.fabric], ["Fit", p.fit], ["Includes", p.includes], ["Delivery", "Worldwide"]];
    $("[data-pd-spec]", dlg).innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return "<div><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>";
    }).join("");
    $("[data-pd-thumbs]", dlg).innerHTML = p.images.length > 1 ? p.images.map(function (src, i) {
      return '<button type="button" data-pd-thumb="' + i + '" aria-label="Show photo ' + (i + 1) + '"><img src="' + esc(src) + '" alt=""></button>';
    }).join("") : "";
    var actions = $("[data-pd-actions]", dlg);
    if (p.status === "soon") {
      actions.innerHTML = '<a class="pill pill--navy pill--block" target="_blank" rel="noopener" href="' + esc(waLink("Hello ADA BEKE! Please let me know when " + plainName(p.name) + " drops.")) + '"><span class="pill__text">Tell me when it drops</span><span class="pill__icon">' + ICON.wa + "</span></a>";
    } else {
      actions.innerHTML =
        '<button class="pill pill--navy pill--block" type="button" data-pd-add="' + esc(p.id) + '"><span class="pill__text">Add to bag</span><span class="pill__icon">' + ICON.plus + "</span></button>" +
        '<a class="pill pill--ghost pill--block" target="_blank" rel="noopener" href="' + esc(waLink("Hello ADA BEKE! I'd like to order the " + plainName(p.name) + " (" + p.colour + ")" + (p.price != null ? " — " + naira(p.price) : "") + ".")) + '"><span class="pill__text">Order this on WhatsApp</span><span class="pill__icon">' + ICON.wa + "</span></a>";
    }
    showImage(0);
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    if (history.replaceState && $(".cards--shop")) history.replaceState(null, "", location.pathname + "?p=" + encodeURIComponent(p.id));
  }
  // On the shop page, open details in place instead of reloading
  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("[data-product]");
    if (!a || !$(".cards--shop")) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openProduct(a.getAttribute("data-product"));
  });
  var qp = /[?&]p=([^&]+)/.exec(location.search);
  if (qp && $(".cards--shop")) setTimeout(function () { openProduct(decodeURIComponent(qp[1])); }, reduceMotion ? 0 : 700);

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
  $$("[data-piece-options]").forEach(function (sel) {
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
  });

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
    }).catch(function () { /* animation is decorative; ignore */ });
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

  /* Hero: words drift up and fade, film pushes in, as the page scrolls */
  var heroEl = $(".hero");
  function onScrollHero() {
    if (!heroEl || reduceMotion) return;
    var p = Math.max(0, Math.min(1, window.scrollY / (window.innerHeight * 0.9)));
    heroEl.style.setProperty("--hero-p", p.toFixed(4));
  }

  /* Gentle parallax on editorial photos: [data-parallax="0.08"] */
  var parallaxEls = reduceMotion ? [] : $$("[data-parallax]");
  function onScrollParallax() {
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > vh + 100) return;
      var speed = parseFloat(el.getAttribute("data-parallax")) || 0.08;
      var offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.translate = "0 " + offset.toFixed(1) + "px";
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { onScrollHeader(); onScrollScrub(); onScrollHero(); onScrollParallax(); ticking = false; });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ======================================================================
     13. "View" cursor bubble over pieces (mouse only)
     ====================================================================== */
  if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
    root.classList.add("has-cursor");
    var bubble = doc.createElement("div");
    bubble.className = "cursor-view";
    bubble.setAttribute("aria-hidden", "true");
    bubble.textContent = "View";
    doc.body.appendChild(bubble);
    var tx = 0, ty = 0, cx = 0, cy = 0, on = false, running = false;
    function follow() {
      cx += (tx - cx) * 0.2;
      cy += (ty - cy) * 0.2;
      bubble.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0) translate(-50%,-50%)";
      if (on || Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) requestAnimationFrame(follow);
      else running = false;
    }
    doc.addEventListener("mousemove", function (e) {
      tx = e.clientX; ty = e.clientY;
      var target = e.target.closest && e.target.closest("[data-cursor]");
      var wasOn = on;
      on = !!target;
      if (target) bubble.textContent = target.getAttribute("data-cursor");
      if (on && !wasOn) { cx = tx; cy = ty; }
      bubble.classList.toggle("is-on", on);
      if (!running) { running = true; requestAnimationFrame(follow); }
    }, { passive: true });
    doc.addEventListener("mouseleave", function () { on = false; bubble.classList.toggle("is-on", false); });
  }

  $$(".js-year").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  observeAll(doc);
  renderBag();
  initLotties(doc);
  onScrollHeader();
  onScrollScrub();
  onScrollHero();
  onScrollParallax();
})();
