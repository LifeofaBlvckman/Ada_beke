"""ADA BEKE page builder.

Writes the static pages (index, shop, about, contact, 404) plus robots.txt,
sitemap.xml, site.webmanifest and vercel.json, all sharing one header,
footer and set of metadata.

Run from the repository root after changing pages, styles or scripts:

    python3 tools/build_pages.py .

Product details live in assets/js/products.js and are drawn by the browser,
so adding a piece there does not need a rebuild.
"""
import hashlib
import json
import sys
from datetime import date
from pathlib import Path

OUT = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
SITE = "https://adabeke.vercel.app"
TODAY = date.today().isoformat()

FONTS = ("https://fonts.googleapis.com/css2?family=Cinzel:wght@400"
         "&family=Montserrat:wght@300..600&display=swap")

WA = "https://wa.me/2348093712578"
IG = "https://www.instagram.com/byadabeke/"
TH = "https://www.threads.net/@byadabeke"
PHONE = "+2348093712578"


def version(rel):
    """Short content hash so browsers fetch a fresh copy whenever a file changes."""
    return hashlib.md5((OUT / rel).read_bytes()).hexdigest()[:10]


V_CSS = version("assets/css/style.css")
V_JS = version("assets/js/main.js")
V_PRODUCTS = version("assets/js/products.js")
V_ADMIN_CSS = version("assets/admin/admin.css")
V_ADMIN_JS = version("assets/admin/admin.js")

ICON = {
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "bag": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1 12.5H6L5 8Z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/></svg>',
    "ig": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor" stroke="none"/></svg>',
    "threads": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M16.6 11.2c-.5-2.6-2.3-3.7-4.5-3.7-2.6 0-4.3 1.7-4.3 1.7"/><path d="M17.6 12.3c0 3-2.4 4.4-4.8 4.4-1.9 0-3.4-.9-3.4-2.6 0-2.4 3-2.9 7.2-2.4"/><path d="M19.5 7.5C18 4.6 15.4 3.5 12.2 3.5 7 3.5 4.5 7.2 4.5 12s2.5 8.5 7.7 8.5c3.4 0 5.6-1.4 6.8-3.6"/></svg>',
    "wa": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.36A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.08.81.82-3-.2-.31a8.2 8.2 0 1 1 6.94 3.83Zm4.5-6.14c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.55.12-.16.25-.63.8-.78.97-.14.16-.29.18-.53.06a6.7 6.7 0 0 1-3.32-2.9c-.25-.43.25-.4.72-1.33.08-.16.04-.3-.02-.43-.06-.12-.55-1.33-.76-1.82-.2-.48-.4-.41-.55-.42h-.47a.9.9 0 0 0-.65.3 2.74 2.74 0 0 0-.85 2.03 4.76 4.76 0 0 0 1 2.53 10.9 10.9 0 0 0 4.17 3.68c1.55.67 2.16.73 2.94.61.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z"/></svg>',
    "sparkle": '<svg class="sparkle" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0c.9 6.4 5 10.9 12 12-7 1.1-11.1 5.6-12 12-.9-6.4-5-10.9-12-12C7 10.9 11.1 6.4 12 0Z"/></svg>',
    "pause": '<svg class="i-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    "play": '<svg class="i-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
    "left": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
}


# --------------------------------------------------------------------------
# Small building blocks
# --------------------------------------------------------------------------
def pill(text, href, variant="", icon="arrow", attrs=""):
    cls = "pill" + (f" pill--{variant}" if variant else "")
    return (f'<a class="{cls}" href="{href}"{attrs}><span class="pill__text">{text}</span>'
            f'<span class="pill__icon">{ICON[icon]}</span></a>')


def toggle():
    return (f'<button class="media-toggle" type="button" aria-label="Pause video">'
            f'{ICON["pause"]}{ICON["play"]}</button>')


ANNOUNCE = ["Free size", "Made in Nigeria", "Worldwide delivery via DHL", "Order on WhatsApp",
            "New: the Abira hoodie set"]


def band(title, id_, attrs=""):
    """Dark band with the page title, as Moye's "SHOP ALL"."""
    return (f'  <section class="band" aria-labelledby="{id_}">\n'
            f'    <h1 class="band__title" id="{id_}"{attrs}>{title}</h1>\n'
            f'  </section>\n')


def skel_cards(n, tag="li", cls="rail__item skel-card"):
    """Placeholder cards shown until the real pieces are drawn in."""
    one = (f'<{tag} class="{cls}" aria-hidden="true"><div class="skel-card__media"></div>'
           f'<div class="skel-card__row"><span class="skel-card__line"></span><span class="skel-card__line skel-card__line--price"></span></div>'
           f'<span class="skel-card__line skel-card__line--short"></span></{tag}>')
    return one * n




def ld(obj):
    return ('<script type="application/ld+json">'
            + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + "</script>")


ORG_ID = SITE + "/#store"
ORG = {
    "@type": "OnlineStore",
    "@id": ORG_ID,
    "name": "ADA BEKE",
    "alternateName": "byadabeke",
    "url": SITE + "/",
    "logo": SITE + "/assets/img/icons/logo-512.png",
    "image": SITE + "/assets/img/og/og-home.jpg",
    "description": "A feel good fashion brand: free-size boubous and sets in soft, flowing fabrics. Made in Nigeria, delivered worldwide via DHL.",
    "slogan": "Chic. relaxed. Elegance.",
    "sameAs": [IG, TH],
    "address": {"@type": "PostalAddress", "addressCountry": "NG"},
    "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "telephone": PHONE,
        "url": WA,
        "availableLanguage": ["English"],
        "areaServed": "Worldwide",
    },
}


def crumbs_ld(name, path):
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": name, "item": SITE + path},
        ],
    }


# --------------------------------------------------------------------------
# Head, header, footer
# --------------------------------------------------------------------------
def head(title, desc, page, path, og_image, og_alt, graph=None, robots="index, follow, max-image-preview:large"):
    url = SITE + path
    first = HERO_PHOTOS[0][0]
    preload = (f'<link rel="preload" as="image" href="assets/img/shoot/{first}.webp" '
               f'imagesrcset="{shoot_set("shoot/" + first)}" imagesizes="{HERO_SIZES}" fetchpriority="high">\n'
               if page == "home" else "")
    data = ld({"@context": "https://schema.org", "@graph": graph}) if graph else ""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{url}">
<meta name="theme-color" content="#58dadc">
<meta name="author" content="ADA BEKE">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="assets/img/icons/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="assets/img/icons/apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
<meta property="og:type" content="website">
<meta property="og:site_name" content="ADA BEKE">
<meta property="og:locale" content="en_NG">
<meta property="og:url" content="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="{SITE}/assets/img/og/{og_image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{og_alt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{SITE}/assets/img/og/{og_image}">
<meta name="twitter:image:alt" content="{og_alt}">
{data}
<script>(function(d){{d.classList.add("js","is-loading");setTimeout(function(){{if(!window.ADA_READY){{d.className=d.className.replace(/\\b(js|is-loading)\\b/g,"");}}}},4000);}})(document.documentElement);</script>
<script src="/api/catalogue" async onerror="window.ADA_SHOP={{}};document.dispatchEvent(new Event('ada:catalogue'))"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="assets/css/style.css?v={V_CSS}">
{preload}</head>
<body class="page-{page}">
<a class="skip" href="#main">Skip to content</a>
"""


def header(page):
    def cur(p):
        return ' aria-current="page"' if p == page else ""
    items = "".join(f"<span>{t}</span>" for t in ANNOUNCE)
    return f"""<header class="site-header" data-header>
  <div class="announce">
    <p class="sr-only">{" · ".join(ANNOUNCE)}</p>
    <div class="announce__track" aria-hidden="true">{items}{items}</div>
  </div>
  <div class="site-header__inner">
    <button class="icon-btn menu-btn" type="button" data-menu-toggle aria-controls="menu" aria-expanded="false" aria-label="Open menu"><span class="menu-btn__lines" aria-hidden="true"></span></button>
    <a class="brand" href="index.html" aria-label="ADA BEKE, home">ADA BEKE</a>
    <nav class="nav" aria-label="Main">
      <a href="index.html"{cur("home")}>Home</a>
      <a href="shop.html"{cur("shop")}>Shop</a>
      <a href="about.html"{cur("about")}>About</a>
      <a href="contact.html"{cur("contact")}>Contact</a>
    </nav>
    <div class="header-actions">
      <a class="icon-btn icon-btn--ig" href="{IG}" target="_blank" rel="noopener" aria-label="ADA BEKE on Instagram">{ICON["ig"]}</a>
      <button class="icon-btn bag-btn" type="button" data-bag-open aria-controls="bag" aria-label="Open bag, 0 items">{ICON["bag"]}<span class="bag-count" data-bag-count>0</span></button>
    </div>
  </div>
</header>
<div class="menu" id="menu" hidden>
  <nav aria-label="Menu">
    <ul class="menu__links">
      <li><a href="index.html"{cur("home")}>Home</a></li>
      <li><a href="shop.html"{cur("shop")}>Shop</a></li>
      <li><a href="about.html"{cur("about")}>About</a></li>
      <li><a href="contact.html"{cur("contact")}>Contact</a></li>
    </ul>
  </nav>
  <div class="menu__foot label">
    <a href="{IG}" target="_blank" rel="noopener">Instagram</a>
    <a href="{WA}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="{TH}" target="_blank" rel="noopener">Threads</a>
  </div>
</div>
"""


FOOTER = f"""<footer class="site-footer">
  <div class="wrap">
    <p class="footer__mark" aria-hidden="true">ADA BEKE</p>
    <div class="footer__grid">
      <div class="footer__col footer__about">
        <p>Tag <a href="{IG}" target="_blank" rel="noopener">@byadabeke</a> on Instagram for a chance to be featured. Free-size boubous and sets in soft, flowing fabrics, made in Nigeria and delivered worldwide.</p>
        <ul class="footer__social">
          <li><a href="{IG}" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="{TH}" target="_blank" rel="noopener">Threads</a></li>
          <li><a href="{WA}" target="_blank" rel="noopener">WhatsApp</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h2>Shop</h2>
        <ul>
          <li><a href="shop.html">Shop all</a></li>
          <li><a href="shop.html?c=sets">Sets</a></li>
          <li><a href="shop.html?c=boubous">Boubous</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h2>Info</h2>
        <ul>
          <li><a href="about.html">About us</a></li>
          <li><a href="contact.html">Contact us</a></li>
          <li><a href="contact.html#order">How to order</a></li>
          <li><a href="contact.html#size">Size guide</a></li>
          <li><a href="contact.html#faq">Questions</a></li>
        </ul>
      </div>
      <div class="footer__col footer__early">
        <p class="footer__lead">Be first to the next drop. New pieces reach the list before anyone else.</p>
        <form class="wa-form wa-form--line" data-early data-source="footer" novalidate>
          <label class="sr-only" for="ea-foot">Email or WhatsApp number</label>
          <input id="ea-foot" name="contact" type="text" placeholder="Email or WhatsApp number" autocomplete="email" required>
          <button type="submit">Get early access</button>
        </form>
        <p class="small" data-early-msg aria-live="polite">No spam, ever.</p>
      </div>
    </div>
    <div class="footer__base">
      <span>&copy; <span class="js-year">2026</span> ADA BEKE. All rights reserved.</span>
      <span>Made in Nigeria &middot; Delivered worldwide via DHL</span>
    </div>
  </div>
</footer>
"""

SCRIPTS = f"""<script src="assets/js/products.js?v={V_PRODUCTS}"></script>
<script src="assets/js/main.js?v={V_JS}"></script>
</body>
</html>
"""

# Photos from the shoot live in assets/img/shoot/ in two sizes: name.webp (1600 x 2000)
# and name-800.webp (800 x 1000); the browser picks the one the screen needs.
#
# Home: three shoot photos with their own backgrounds. Phones show one at a time
# (they change on their own, swipe or tap a dot); laptops show all three side by side.
# The words sit under the photos, never on the clothes.
HERO_PHOTOS = [
    ("circles-side", "Model in a white boubou with large orange circle prints"),
    ("abira-front", "Model in the rust and cobalt Abira hoodie set, hood up"),
    ("wifey-gaze", "Model in the sheer black Wifey boubou"),
]
HERO_SIZES = "(min-width: 900px) 34vw, 100vw"


def shoot_set(n):
    return f"assets/img/{n}-800.webp 800w, assets/img/{n}.webp 1600w"


def shoot_img(n, alt, sizes, attrs=""):
    """<img> for a shoot photo, sized by the browser."""
    return (f'<img{attrs} src="assets/img/shoot/{n}.webp" srcset="{shoot_set("shoot/" + n)}" '
            f'sizes="{sizes}" alt="{alt}" loading="lazy" decoding="async" width="1600" height="2000">')


def slides_html():
    """Only the first photo loads with the page on phones; laptops load all three."""
    figs = []
    for k, (n, alt) in enumerate(HERO_PHOTOS):
        pre = "data-" if k else ""
        extra = ' fetchpriority="high"' if not k else ""
        figs.append(
            f'      <figure class="slide{"" if k else " is-active"}">'
            f'<img {pre}src="assets/img/shoot/{n}.webp" {pre}srcset="{shoot_set("shoot/" + n)}" '
            f'sizes="{HERO_SIZES}" alt="{alt}" width="1600" height="2000" decoding="async"{extra}></figure>')
    return "\n".join(figs)


def dots_html():
    return "".join(
        f'<button type="button" data-dot aria-label="Show photo {k + 1}" aria-current="{str(k == 0).lower()}"></button>'
        for k in range(len(HERO_PHOTOS)))


VALUE_SIZES = "(min-width: 900px) 30vw, 100vw"

# --------------------------------------------------------------------------
# HOME
# --------------------------------------------------------------------------
home = head(
    "ADA BEKE — Free-size fashion, made in Nigeria",
    "ADA BEKE is a feel good fashion brand: free-size boubous and sets in soft, flowing fabrics. Made in Nigeria, delivered worldwide via DHL.",
    "home", "/", "og-home.jpg", "ADA BEKE: model in a white boubou with large orange circle prints",
    graph=[ORG, {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "ADA BEKE",
                 "inLanguage": "en", "publisher": {"@id": ORG_ID}}],
) + header("home") + f"""
<main id="main">
  <h1 class="sr-only">ADA BEKE: free-size fashion, made in Nigeria</h1>
  <section class="hero" aria-label="New collection">
    <div class="hero__slides" data-slides aria-roledescription="carousel" aria-label="New collection">
{slides_html()}
    </div>
    <div class="hero__dots" role="group" aria-label="Photos">{dots_html()}</div>
  </section>

  <section class="section home-pieces" aria-labelledby="edit-title">
    <div class="wrap">
      <h2 class="sec-title" id="edit-title">Discover your style</h2>
      <div class="cards cards--home" data-products="home">{skel_cards(4, "div", "skel-card")}</div>
      <p class="more"><a class="u-link" href="shop.html">Shop all</a></p>
    </div>
  </section>

  <section class="collections" aria-labelledby="col-title" data-collections-section hidden>
    <h2 class="sr-only" id="col-title">Shop by collection</h2>
    <div class="col-grid" data-collections></div>
  </section>

  <section class="section lookbook" aria-label="Lookbook">
    <div class="wrap">
      <picture>
        <source media="(min-width: 700px)" srcset="assets/img/shoot/duo-doors-wide-1600.webp 1600w, assets/img/shoot/duo-doors-wide.webp 2400w" sizes="min(100vw, 1440px)">
        <img src="assets/img/shoot/duo-doors.webp" srcset="{shoot_set("shoot/duo-doors")}" sizes="100vw" alt="Two models at arched black doors, in the circle-print and checked boubous" loading="lazy" decoding="async" width="1600" height="2000">
      </picture>
      <p class="more"><a class="u-link" href="shop.html">View all pieces</a></p>
    </div>
  </section>

  <section class="section story-sec" aria-labelledby="story-title">
    <div class="wrap">
      <div class="story-card" data-reveal>
        <div class="story-card__media" data-video>
          <video src="assets/video/campaign.mp4" poster="assets/img/campaign-poster.webp" muted loop playsinline preload="none" aria-label="Film: models in the new ADA BEKE pieces"></video>
          {toggle()}
        </div>
        <div class="story-card__body">
        <div class="story-card__text">
          <h2 class="story-card__title" id="story-title">Chic, relaxed, elegance.</h2>
          <p>ADA BEKE is a feel good fashion brand built on free size culture. Generous shapes, soft fabrics and pieces that flatter without fuss, made in Nigeria.</p>
          {pill("About ADA BEKE", "about.html", "light")}
        </div>
        <ul class="story-card__list" aria-label="What we stand for">
          <li>Free size.</li>
          <li>Made in Nigeria.</li>
          <li>Delivered worldwide.</li>
        </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="section social-sec" aria-labelledby="social-title">
    <div class="wrap social">
      <div class="social__text">
        <h2 class="social__title" id="social-title">Feel good, look good, in ADA BEKE.</h2>
        <p>Follow us for new drops, styling ideas and the stories behind every piece.</p>
        <div class="social__links">
          {pill("@byadabeke on Instagram", IG, "", "ig", ' target="_blank" rel="noopener"')}
          {pill("Threads", TH, "", "threads", ' target="_blank" rel="noopener"')}
          {pill("Chat on WhatsApp", WA, "", "wa", ' target="_blank" rel="noopener"')}
        </div>
        <p class="small">Tag @byadabeke on Instagram for a chance to be featured.</p>
      </div>
      <div class="collage" aria-hidden="true">
        <img src="assets/img/shoot/circles-lean-800.webp" alt="" loading="lazy" decoding="async" width="800" height="1000">
        <img src="assets/img/shoot/check-doors-800.webp" alt="" loading="lazy" decoding="async" width="800" height="1000">
        <img src="assets/img/shoot/gold-pleats-800.webp" alt="" loading="lazy" decoding="async" width="800" height="1000">
        <img src="assets/img/shoot/abira-pose-800.webp" alt="" loading="lazy" decoding="async" width="800" height="1000">
      </div>
    </div>
  </section>
</main>
""" + FOOTER + SCRIPTS

# --------------------------------------------------------------------------
# SHOP
# --------------------------------------------------------------------------
shop = head(
    "Shop the collection — ADA BEKE",
    "Shop ADA BEKE: the Omalicha set, the Wifey boubou, the Abira hoodie set and more. Free size, made in Nigeria, delivered worldwide via DHL.",
    "shop", "/shop.html", "og-shop.jpg", "The Omalicha set in royal navy shimmer chiffon",
    graph=[ORG,
           {"@type": "CollectionPage", "@id": SITE + "/shop.html#page", "url": SITE + "/shop.html",
            "name": "Shop the collection", "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": ORG_ID}},
           crumbs_ld("Shop", "/shop.html")],
) + header("shop") + f"""
<main id="main">
{band("Shop all", "shop-title")}
  <div class="filters">
    <div class="wrap filters__inner">
      <div class="chips" role="group" aria-label="Show pieces">
        <button class="chip" type="button" data-filter="all" aria-pressed="true">All<span class="chip__more"> pieces</span></button>
        <button class="chip" type="button" data-filter="available" aria-pressed="false">Available<span class="chip__more"> now</span></button>
        <button class="chip" type="button" data-filter="soon" aria-pressed="false">Dropping soon</button>
      </div>
      <p class="filters__count" data-filter-count aria-live="polite"></p>
    </div>
  </div>

  <section class="section shop-grid" aria-label="Pieces">
    <div class="wrap">
      <div class="cards cards--shop" data-products="all">{skel_cards(4, "div", "skel-card")}</div>
    </div>
  </section>

  <section class="section--tight" aria-labelledby="help-title" style="padding-top:0">
    <div class="wrap">
      <div class="helper" data-reveal>
        <div class="lottie" data-lottie aria-hidden="true"></div>
        <div style="display:grid;gap:16px;position:relative">
          <h3 id="help-title">Not sure which piece is you? We&rsquo;ll help you choose.</h3>
          <p>Tell us your height, your usual size and where you&rsquo;re wearing it. We&rsquo;ll reply on WhatsApp.</p>
          <div>{pill("Ask on WhatsApp", WA + "?text=Hello%20ADA%20BEKE!%20Please%20help%20me%20choose%20a%20piece.", "dark", "wa", ' target="_blank" rel="noopener"')}</div>
        </div>
      </div>
    </div>
  </section>
</main>
""" + FOOTER + SCRIPTS

# --------------------------------------------------------------------------
# ABOUT
# --------------------------------------------------------------------------
about = head(
    "Our story — ADA BEKE",
    "ADA BEKE is a feel good fashion brand built on free size culture. Chic, relaxed, elegance. Made in Nigeria, delivered worldwide.",
    "about", "/about.html", "og-about.jpg", "Model in the sheer black Wifey boubou",
    graph=[ORG,
           {"@type": "AboutPage", "@id": SITE + "/about.html#page", "url": SITE + "/about.html",
            "name": "Our story", "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": ORG_ID}},
           crumbs_ld("Our story", "/about.html")],
) + header("about") + f"""
<main id="main">
  <section class="photo-hero" aria-labelledby="about-title">
    <picture>
      <source media="(min-width: 700px)" srcset="assets/img/shoot/circles-back-wide-1600.webp 1600w, assets/img/shoot/circles-back-wide.webp 2400w" sizes="100vw">
      <img src="assets/img/shoot/circles-back.webp" srcset="{shoot_set("shoot/circles-back")}" sizes="100vw" alt="Model seen from behind in a white boubou with large orange circle prints, against an orange wall with hanging plants" width="1600" height="2000" fetchpriority="high">
    </picture>
    <div class="photo-hero__text">
      <h1 class="photo-hero__title" id="about-title">About <span>ADA BEKE</span></h1>
      <p class="photo-hero__sub">Chic &middot; Relaxed &middot; Elegance</p>
    </div>
  </section>

  <section class="split split--cream" aria-labelledby="who-title">
    <div class="split__media">{shoot_img("check-vine", "Model in a navy, red and orange checked boubou among hanging plants", "(min-width: 900px) 50vw, 100vw")}</div>
    <div class="split__text" data-reveal>
      <p class="kicker">Our story</p>
      <h2 class="split__title" id="who-title">The story</h2>
      <p>ADA BEKE is a feel good fashion brand, built on free size culture. Getting dressed should feel easy: generous shapes, soft fabrics and pieces that flatter without fuss.</p>
      <p>Chic, relaxed, elegance. Fashion pieces focused on free size culture, made in Nigeria and delivered worldwide.</p>
    </div>
  </section>

  <section class="quote-band" aria-label="A word from Ada Beke">
    <blockquote>&ldquo;Through it all, God has been faithful.&rdquo;</blockquote>
    <p class="kicker">Ada Beke</p>
  </section>

  <section class="split split--flip" id="letter" aria-labelledby="letter-title">
    <div class="split__media">{shoot_img("wifey-standing", "Model in the sheer black Wifey boubou, hand raised", "(min-width: 900px) 50vw, 100vw")}</div>
    <div class="split__text" data-reveal>
      <p class="kicker">We&rsquo;re back</p>
      <h2 class="split__title" id="letter-title">Ready for a new chapter</h2>
      <div class="letter__cols">
        <p>After a little over a year away, we&rsquo;re finally ready to return to what we love most &mdash; bringing fashion, style, and elegance to you.</p>
        <p>Shortly after taking the exciting step of rebranding, life took an unexpected turn. The space we were operating out of was sold and we had to evacuate the premises; then the daunting task of looking for a new production space began.</p>
        <p>What was meant to be a fresh start became an unforeseen pause &mdash; one that gave us time to reflect, regroup, and prepare for everything ahead.</p>
        <p>It hasn&rsquo;t been the easiest journey, but through it all, <strong>God has been faithful and his mercy has been evident every step of the way.</strong></p>
        <p>To everyone who continued to support us, check in on us, and patiently await our return, <strong>thank you for standing by us, even in our silence.</strong> Your love and loyalty mean more than words can express.</p>
        <p>We&rsquo;re back with renewed passion, fresh ideas, and an even stronger commitment to serving you better than ever.</p>
        <p>This is more than a comeback; it&rsquo;s the beginning of a beautiful new chapter, and we can&rsquo;t wait to share it with you.</p>
      </div>
      <p class="signoff"><span class="sig">Ada Beke</span><span class="label">Chic &bull; relaxed &bull; Elegance</span></p>
    </div>
  </section>

  <section class="section" id="values" aria-labelledby="values-title">
    <div class="wrap">
      <div class="edit__head">
        <h2 class="heading" id="values-title">Chic, relaxed, elegance</h2>
      </div>
      <div class="values">
        <article class="value">
          <h3 class="value__word">Chic</h3>
          <div class="value__img">{shoot_img("gold-pleats", "Model in a sheer black shirt and gold pleated wide-leg trousers", VALUE_SIZES)}</div>
          <p>Clean lines, rich colour and fabric that catches the light. Pieces that look considered without trying too hard.</p>
        </article>
        <article class="value">
          <h3 class="value__word">Relaxed</h3>
          <div class="value__img frame">{shoot_img("circles-side", "Model in a white boubou with orange circle prints, hand in pocket", VALUE_SIZES)}</div>
          <p>Wide, easy shapes you can sit, move and breathe in. Free size means no squeezing into a number.</p>
        </article>
        <article class="value">
          <h3 class="value__word">Elegance</h3>
          <div class="value__img">{shoot_img("wifey-standing", "Model in the sheer black Wifey boubou, hand raised", VALUE_SIZES)}</div>
          <p>Flowing chiffon and graceful drape that carry you from a quiet day to a special evening.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section--tight section--mist" id="made" aria-label="How we work">
    <div class="wrap"><div class="facts">
      <div class="fact"><h3>Free size</h3><p>Generous, flowing cuts designed to sit beautifully on a wide range of bodies.</p></div>
      <div class="fact"><h3>Made in Nigeria</h3><p>Designed and produced in Nigeria, from our new production space.</p></div>
      <div class="fact"><h3>Delivered worldwide</h3><p>Wherever you are, we deliver via DHL. Message us and we&rsquo;ll get your piece to you.</p></div>
    </div></div>
  </section>

  <section class="section about-cta" aria-labelledby="about-cta">
    <div class="wrap about-cta__inner">
      <h2 class="sec-title" id="about-cta">Find your feel good piece</h2>
      {pill("Shop the collection", "shop.html", "dark")}
    </div>
  </section>
</main>
""" + FOOTER + SCRIPTS

# --------------------------------------------------------------------------
# CONTACT
# --------------------------------------------------------------------------
FAQ = [
    ("What does free size mean?",
     "Each piece is cut wide and flowing rather than to a fixed dress size, so one size is designed to fit a wide range of bodies. If you&rsquo;re unsure about length, see the <a href=\"#size\">size guide</a> or message us.",
     "Each piece is cut wide and flowing rather than to a fixed dress size, so one size is designed to fit a wide range of bodies. If you're unsure about length, message us and we'll help."),
    ("Do you deliver outside Nigeria?",
     "Yes, we deliver worldwide via DHL. Send us your city and country with your order and we&rsquo;ll confirm delivery for you.",
     "Yes, we deliver worldwide via DHL. Send us your city and country with your order and we'll confirm delivery for you."),
    ("How do I order and pay?",
     "<span data-pay=\"whatsapp\">Add pieces to your bag and choose &ldquo;Checkout on WhatsApp&rdquo;, or message us directly. We confirm your total and how to pay with you on WhatsApp.</span>"
     "<span data-pay=\"online\">Add pieces to your bag and choose Checkout to pay securely online through Paystack, by card, bank transfer or USSD. Prefer to chat? Choose WhatsApp instead and we&rsquo;ll confirm your total there.</span>",
     "Add pieces to your bag and choose Checkout on WhatsApp, or message us directly. We confirm your total and how to pay with you on WhatsApp."),
    ("What comes with each piece?",
     "Every listing says what&rsquo;s included. For example, the Omalicha set is sold with the scarf only, and the Wifey boubou is sold with the co-ord set.",
     "Every listing says what's included. For example, the Omalicha set is sold with the scarf only, and the Wifey boubou is sold with the co-ord set."),
    ("Is the Abira hoodie set available?",
     "Yes. The Abira hoodie boubou &amp; pants set (&#8358;50,000) is restocked and available for immediate delivery.",
     "Yes. The Abira hoodie boubou & pants set (₦50,000) is restocked and available for immediate delivery."),
    ("When is the next drop?",
     f"Something soft is on the way. Follow <a href=\"{IG}\" target=\"_blank\" rel=\"noopener\">@byadabeke</a> or message us on WhatsApp and we&rsquo;ll tell you the moment it drops.",
     "Something soft is on the way. Follow @byadabeke on Instagram or message us on WhatsApp and we'll tell you the moment it drops."),
]
faq_html = "\n".join(
    f'          <details>\n            <summary>{q}<span class="plus" aria-hidden="true"></span></summary>\n'
    f'            <div class="answer"><p>{a}</p></div>\n          </details>' for q, a, _ in FAQ)

contact = head(
    "Contact & ordering — ADA BEKE",
    "Order ADA BEKE on WhatsApp, ask about fit, or find us on Instagram. Free-size pieces, delivered worldwide via DHL.",
    "contact", "/contact.html", "og-contact.jpg", "Model in the rust and cobalt Abira hoodie set",
    graph=[ORG,
           {"@type": "ContactPage", "@id": SITE + "/contact.html#page", "url": SITE + "/contact.html",
            "name": "Contact & ordering", "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": ORG_ID}},
           crumbs_ld("Contact", "/contact.html"),
           {"@type": "FAQPage", "@id": SITE + "/contact.html#faq",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": plain}} for q, _, plain in FAQ]}],
) + header("contact") + f"""
<main id="main">
{band("Contact us", "contact-title")}  <section class="intro">
    <div class="wrap intro__inner">
      <p class="hero__desc">Orders, questions about fit, or help choosing a piece: send us a message on WhatsApp and we&rsquo;ll take it from there.</p>
      {pill("Message us on WhatsApp", WA, "", "wa", ' target="_blank" rel="noopener"')}
    </div>
  </section>

  <section class="section" id="order" aria-labelledby="order-title">
    <div class="wrap">
      <div class="edit__head">
        <h2 class="heading" id="order-title">How to order</h2>
      </div>
      <ol class="steps">
        <li class="step"><h3>Choose your piece</h3><p>Browse the collection and add what you love to your bag.</p></li>
        <li class="step"><h3><span data-pay="whatsapp">Send it on WhatsApp</span><span data-pay="online">Check out your way</span></h3><p><span data-pay="whatsapp">Checkout opens WhatsApp with your order already written out.</span><span data-pay="online">Pay securely online by card, bank transfer or USSD, or send your order to us on WhatsApp.</span></p></li>
        <li class="step"><h3>Confirm the details</h3><p><span data-pay="whatsapp">We confirm your total, payment and delivery with you directly.</span><span data-pay="online">We message you on WhatsApp to confirm your delivery.</span></p></li>
        <li class="step"><h3>We deliver worldwide</h3><p>Your piece is on its way to you via DHL, wherever you are.</p></li>
      </ol>
    </div>
  </section>

  <section class="section section--mist" aria-labelledby="write-title">
    <div class="wrap contact">
      <div>
        <h2 class="heading" id="write-title" style="margin-bottom:clamp(28px,3vw,44px)">Write to us</h2>
        <form class="form" data-wa-form="contact" novalidate>
          <div class="form__row">
            <div class="field">
              <label for="c-name">Your name</label>
              <input id="c-name" name="name" type="text" autocomplete="name" required aria-describedby="c-name-err">
              <p class="error" id="c-name-err">Enter your name so we know who we&rsquo;re talking to.</p>
            </div>
            <div class="field">
              <label for="c-loc">City &amp; country</label>
              <input id="c-loc" name="location" type="text" autocomplete="address-level2">
              <span class="hint">Helps us confirm delivery.</span>
            </div>
          </div>
          <div class="field">
            <label for="c-piece">Piece you&rsquo;re interested in</label>
            <select id="c-piece" name="piece" data-piece-options><option value="">Choose a piece (optional)</option></select>
          </div>
          <div class="field">
            <label for="c-msg">Message</label>
            <textarea id="c-msg" name="message" rows="4" placeholder="Your height and usual size help us advise on fit."></textarea>
          </div>
          <div><button class="pill pill--dark" type="submit"><span class="pill__text">Send on WhatsApp</span><span class="pill__icon">{ICON["wa"]}</span></button></div>
          <p class="small">Opens WhatsApp with your message ready to send. Nothing is sent until you press send there.</p>
        </form>
      </div>
      <div style="display:grid;gap:40px;align-content:start">
        <div class="channels">
          <a class="channel" href="{WA}" target="_blank" rel="noopener"><span class="channel__icon">{ICON["wa"]}</span><span><span class="channel__name">WhatsApp</span><br><span class="channel__sub">+234 809 371 2578</span></span><span class="channel__arrow">{ICON["arrow"]}</span></a>
          <a class="channel" href="{IG}" target="_blank" rel="noopener"><span class="channel__icon">{ICON["ig"]}</span><span><span class="channel__name">Instagram</span><br><span class="channel__sub">@byadabeke</span></span><span class="channel__arrow">{ICON["arrow"]}</span></a>
          <a class="channel" href="{TH}" target="_blank" rel="noopener"><span class="channel__icon">{ICON["threads"]}</span><span><span class="channel__name">Threads</span><br><span class="channel__sub">@byadabeke</span></span><span class="channel__arrow">{ICON["arrow"]}</span></a>
        </div>
        <div class="helper" data-reveal style="background:var(--white)">
          <div class="lottie" data-lottie aria-hidden="true"></div>
          <div style="display:grid;gap:12px">
            <h3>Torn between two? We&rsquo;ll help.</h3>
            <p>Pick &ldquo;Not sure yet&rdquo; in the form and tell us what you have in mind.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="size" aria-labelledby="size-title">
    <div class="wrap">
      <div class="sizebox">
        <div style="position:relative">
          <p class="label" style="margin-bottom:18px">Size guide</p>
          <h2 class="heading" id="size-title">Free size, explained</h2>
          <p class="small" style="margin-top:22px;max-width:40ch">Our pieces are cut generously, so one size is designed to flow on a wide range of bodies. Length and drape differ from piece to piece, so tell us a little about you and we&rsquo;ll tell you how a piece will sit.</p>
          <p class="small" data-reveal style="margin-top:14px">Our size chart is also in the <a class="text-link" href="{IG}" target="_blank" rel="noopener">Size chart highlight on Instagram</a>.</p>
        </div>
        <div style="position:relative">
          <table class="sizebox__table">
            <caption class="sr-only">What to send us for fit advice</caption>
            <thead><tr><th scope="col">Send us</th><th scope="col">Why it helps</th></tr></thead>
            <tbody>
              <tr><td>Your height</td><td>So we can tell you where the hem will fall</td></tr>
              <tr><td>Your usual size</td><td>So we can compare with how the piece is cut</td></tr>
              <tr><td>How you like it to fall</td><td>Ankle or floor length, relaxed or neat</td></tr>
              <tr><td>The occasion</td><td>So we can suggest the right piece and fabric</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--mist" id="faq" aria-labelledby="faq-title">
    <div class="wrap grid-3">
      <p class="label">Questions</p>
      <div>
        <h2 class="heading" id="faq-title" style="margin-bottom:clamp(28px,3vw,48px)">Questions</h2>
        <div class="faq">
{faq_html}
        </div>
      </div>
      <span aria-hidden="true"></span>
    </div>
  </section>
</main>
""" + FOOTER + SCRIPTS

# --------------------------------------------------------------------------
# 404 — served by Vercel for any missing address, so every link is absolute
# --------------------------------------------------------------------------
notfound = head(
    "Page not found — ADA BEKE",
    "This page isn't here. Find your feel good piece in the ADA BEKE collection.",
    "notfound", "/404.html", "og-home.jpg", "ADA BEKE", robots="noindex, follow",
) + header("") + f"""
<main id="main">
{band("Page not found", "nf-title")}  <section class="intro intro--tall">
    <div class="wrap intro__inner">
      <p class="hero__desc">This page isn&rsquo;t here, but your feel good piece is.</p>
      <div class="nf-actions">{pill("Shop the collection", "shop.html", "dark")}{pill("Back home", "index.html")}</div>
    </div>
  </section>
</main>
""" + FOOTER + SCRIPTS


# Order page: Paystack brings customers back here after paying
# --------------------------------------------------------------------------
order = head(
    "Your order — ADA BEKE",
    "Your ADA BEKE order.",
    "order", "/order.html", "og-home.jpg", "ADA BEKE", robots="noindex, nofollow",
) + header("") + f"""
<main id="main">
{band("One moment", "order-title", " data-order-title")}  <section class="intro">
    <div class="wrap intro__inner">
      <p class="label" data-order-ref>Your order</p>
      <p class="hero__desc" data-order-desc aria-live="polite">Checking your order&hellip;</p>
      <div class="nf-actions" data-order-actions></div>
    </div>
  </section>
  <section class="section order-section">
    <div class="wrap" data-order>
      <div class="order-card order-card--skel" aria-hidden="true">
        <span class="skel-card__line" style="width:34%;height:22px"></span>
        <div class="order-line"><div class="order-line__img skel-card__media"></div><div><span class="skel-card__line" style="width:70%"></span><span class="skel-card__line skel-card__line--short"></span></div></div>
        <div class="order-line"><div class="order-line__img skel-card__media"></div><div><span class="skel-card__line" style="width:55%"></span><span class="skel-card__line skel-card__line--short"></span></div></div>
        <span class="skel-card__line" style="width:100%;height:18px"></span>
      </div>
    </div>
  </section>
</main>
""" + FOOTER + SCRIPTS


# --------------------------------------------------------------------------
# Admin dashboard (/admin): its own lightweight page, never indexed
# --------------------------------------------------------------------------
admin = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Admin — ADA BEKE</title>
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="same-origin">
<meta name="theme-color" content="#f5fbfb">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="/assets/admin/admin.css?v={V_ADMIN_CSS}">
</head>
<body>
<div id="app"><div class="gate"><div class="gate__card"><p class="gate__mark">ADA BEKE<span>Admin</span></p><span class="sk" style="height:38px;width:70%"></span><span class="sk" style="height:48px"></span><span class="sk" style="height:44px;border-radius:999px"></span></div></div></div>
<noscript><p style="padding:24px">The admin dashboard needs JavaScript turned on.</p></noscript>
<script src="/assets/admin/admin.js?v={V_ADMIN_JS}"></script>
</body>
</html>
"""


def absolutise(html):
    for a, b in [('href="assets/', 'href="/assets/'), ('src="assets/', 'src="/assets/'),
                 ('data-src="assets/', 'data-src="/assets/'), ('href="index.html"', 'href="/"'),
                 ('href="shop.html', 'href="/shop.html'), ('href="about.html', 'href="/about.html'),
                 ('href="contact.html', 'href="/contact.html'), ('href="site.webmanifest"', 'href="/site.webmanifest"')]:
        html = html.replace(a, b)
    return html


# --------------------------------------------------------------------------
# Write pages and site files
# --------------------------------------------------------------------------
for name, html in [("index.html", home), ("shop.html", shop), ("about.html", about),
                   ("contact.html", contact), ("404.html", absolutise(notfound)), ("order.html", order)]:
    (OUT / name).write_text(html, encoding="utf-8")
    print("wrote", name, len(html))
(OUT / "admin").mkdir(exist_ok=True)
(OUT / "admin" / "index.html").write_text(admin, encoding="utf-8")
print("wrote admin/index.html", len(admin))

(OUT / "robots.txt").write_text(f"""# ADA BEKE
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /order.html

Sitemap: {SITE}/sitemap.xml
""", encoding="utf-8")


def img_tags(paths):
    return "".join(f"\n    <image:image><image:loc>{SITE}/{p}</image:loc></image:image>" for p in paths)


PAGES = [
    ("/", "1.0", [f"assets/img/shoot/{n}.webp" for n, _ in HERO_PHOTOS]),
    ("/shop.html", "0.9", ["assets/img/omalicha-mannequin.webp", "assets/img/shoot/wifey-seated.webp",
                           "assets/img/shoot/abira-front.webp", "assets/img/shoot/abira-set.webp"]),
    ("/about.html", "0.6", ["assets/img/shoot/gold-pleats.webp", "assets/img/shoot/circles-side.webp",
                            "assets/img/shoot/wifey-standing.webp"]),
    ("/contact.html", "0.6", []),
]
urls = "".join(
    f"""
  <url>
    <loc>{SITE}{p}</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>{prio}</priority>{img_tags(imgs)}
  </url>""" for p, prio, imgs in PAGES)
(OUT / "sitemap.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">{urls}
</urlset>
""", encoding="utf-8")

(OUT / "site.webmanifest").write_text(json.dumps({
    "name": "ADA BEKE",
    "short_name": "ADA BEKE",
    "description": "Free-size fashion, made in Nigeria. Chic, relaxed, elegance.",
    "start_url": "/",
    "scope": "/",
    "display": "standalone",
    "background_color": "#58dadc",
    "theme_color": "#58dadc",
    "icons": [
        {"src": "/assets/img/icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "/assets/img/icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "/assets/img/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}, indent=2) + "\n", encoding="utf-8")

(OUT / "vercel.json").write_text(json.dumps({
    # once a day: keeps a free Supabase project from going to sleep
    "crons": [{"path": "/api/catalogue?keepalive=1", "schedule": "17 6 * * *"}],
    "headers": [
        {"source": "/assets/css/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        {"source": "/assets/js/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        {"source": "/assets/(img|video|lottie|vendor)/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800"}]},
        {"source": "/assets/admin/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        {"source": "/admin(.*)", "headers": [
            {"key": "X-Robots-Tag", "value": "noindex, nofollow"},
            {"key": "X-Frame-Options", "value": "DENY"},
            {"key": "Cache-Control", "value": "no-store"},
        ]},
        {"source": "/(.*)", "headers": [
            {"key": "X-Content-Type-Options", "value": "nosniff"},
            {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
        ]},
    ],
}, indent=2) + "\n", encoding="utf-8")
print("wrote robots.txt, sitemap.xml, site.webmanifest, vercel.json")
