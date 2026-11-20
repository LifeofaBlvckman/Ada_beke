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

FONTS = ("https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@1,6..96,400..500"
         "&family=Cinzel:wght@400;500"
         "&family=Jost:wght@300..600&display=swap")

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


def megamark():
    spans, d = [], 0
    for ch in "ADA BEKE":
        if ch == " ":
            spans.append(" ")
            d += 60
            continue
        spans.append(f'<tspan style="transition-delay:{d}ms">{ch}</tspan>')
        d += 90
    return ('<div class="megamark" aria-hidden="true"><svg viewBox="0 0 1000 150" '
            'preserveAspectRatio="xMidYMax meet" focusable="false"><text x="500" y="139" '
            'text-anchor="middle" font-size="178" textLength="992" lengthAdjust="spacingAndGlyphs">'
            + "".join(spans) + "</text></svg></div>")


def rings(cls=""):
    """Concentric rings, after the circle print on the white & brown boubou."""
    solid = "".join(f'<circle cx="100" cy="100" r="{r}"/>' for r in (14, 38, 62, 86))
    dashed = "".join(f'<circle cx="100" cy="100" r="{r}"/>' for r in (26, 50, 74, 98))
    return (f'<svg class="rings {cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">'
            f'<g class="rings__solid">{solid}</g><g class="rings__dash">{dashed}</g>'
            f'<circle class="rings__core" cx="100" cy="100" r="4"/></svg>')


def spark(x, y, size=18, delay=0.0):
    return (f'<span class="spark" style="--sx:{x};--sy:{y};--ss:{size}px;--sd:{delay}s" '
            f'aria-hidden="true">{ICON["sparkle"]}</span>')


def ghost(text, drift="-0.12", cls=""):
    return f'<p class="ghost {cls}" data-drift="{drift}">{text}</p>'


def skel_cards(n, tag="li", cls="rail__item skel-card"):
    """Placeholder cards shown until the real pieces are drawn in."""
    one = (f'<{tag} class="{cls}" aria-hidden="true"><div class="skel-card__media"></div>'
           f'<div class="skel-card__row"><span class="skel-card__line"></span><span class="skel-card__line skel-card__line--price"></span></div>'
           f'<span class="skel-card__line skel-card__line--short"></span></{tag}>')
    return one * n


def decor(*items):
    return '<div class="decor" aria-hidden="true">' + "".join(items) + "</div>"


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
    preload = ('<link rel="preload" as="image" href="assets/img/hero-1-white-brown.webp" fetchpriority="high">\n'
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
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<link rel="stylesheet" href="assets/css/style.css?v={V_CSS}">
{preload}</head>
<body class="page-{page}">
<a class="skip" href="#main">Skip to content</a>
<div class="progress" aria-hidden="true"><span></span></div>
<div class="curtain" aria-hidden="true"><span class="curtain__mark"><span style="--ci:0">A</span><span style="--ci:1">D</span><span style="--ci:2">A</span><span style="--ci:3">&nbsp;</span><span style="--ci:4">B</span><span style="--ci:5">E</span><span style="--ci:6">K</span><span style="--ci:7">E</span></span></div>
"""


def header(page):
    def cur(p):
        return ' aria-current="page"' if p == page else ""
    return f"""<header class="site-header" data-header>
  <div class="site-header__inner">
    <a class="brand" href="index.html" aria-label="ADA BEKE, home">ADA BEKE</a>
    <nav class="nav" aria-label="Main">
      <a href="shop.html"{cur("shop")}>Shop</a>
      <a href="about.html"{cur("about")}>About</a>
      <a href="contact.html"{cur("contact")}>Contact</a>
    </nav>
    <div class="header-actions">
      <a class="icon-btn icon-btn--ig" href="{IG}" target="_blank" rel="noopener" aria-label="ADA BEKE on Instagram">{ICON["ig"]}</a>
      <button class="icon-btn bag-btn" type="button" data-bag-open aria-controls="bag" aria-label="Open bag, 0 items">{ICON["bag"]}<span class="bag-count" data-bag-count>0</span></button>
      <button class="icon-btn menu-btn" type="button" data-menu-toggle aria-controls="menu" aria-expanded="false" aria-label="Open menu"><span class="menu-btn__lines" aria-hidden="true"></span></button>
    </div>
  </div>
</header>
<div class="menu" id="menu" hidden>
  {decor(rings("rings--menu"))}
  <nav aria-label="Menu">
    <ul class="menu__links">
      <li><a href="index.html"{cur("home")}>Home</a></li>
      <li><a href="shop.html"{cur("shop")}>Shop <em>the collection</em></a></li>
      <li><a href="about.html"{cur("about")}>Our <em>story</em></a></li>
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


FOOTER = f"""<div class="curve curve--navy" aria-hidden="true"></div>
<footer class="site-footer">
  {decor(rings("rings--footer"), spark("88%", "18%", 22, 0.4), spark("8%", "62%", 14, 1.4))}
  <div class="wrap">
    <div class="footer__grid">
      <div class="footer__col">
        <h2>Navigation</h2>
        <ul data-pop="items">
          <li><a href="index.html">Home</a></li>
          <li><a href="shop.html">Shop the collection</a></li>
          <li><a href="about.html">Our story</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
      </div>
      <div class="footer__col">
        <h2>Client care</h2>
        <ul data-pop="items">
          <li><a href="contact.html#order">How to order</a></li>
          <li><a href="contact.html#size">Free size guide</a></li>
          <li><a href="contact.html#faq">Worldwide delivery</a></li>
          <li><a href="contact.html#faq">Questions</a></li>
        </ul>
      </div>
      <div class="footer__col footer__order">
        <h2 class="big" data-split>Order with <em>ADA BEKE</em></h2>
        <form class="wa-form" data-wa-form="quick" novalidate>
          <label class="sr-only" for="q-foot">What are you looking for?</label>
          <input id="q-foot" name="q" type="text" placeholder="What are you looking for?" autocomplete="off" required>
          <button type="submit">Send on WhatsApp</button>
        </form>
        <p class="small">Opens WhatsApp with your message ready to send.</p>
      </div>
      <div class="footer__col">
        <h2>Social</h2>
        <ul data-pop="items">
          <li><a href="{IG}" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="{TH}" target="_blank" rel="noopener">Threads</a></li>
          <li><a href="{WA}" target="_blank" rel="noopener">WhatsApp</a></li>
        </ul>
      </div>
    </div>
    <div class="footer__base" data-pop="items">
      <span>&copy; <span class="js-year">2026</span> ADA BEKE. All rights reserved.</span>
      <span>Chic &bull; relaxed &bull; Elegance</span>
      <span>Made in Nigeria &middot; Delivered worldwide via DHL</span>
    </div>
  </div>
  {megamark()}
</footer>
"""

SCRIPTS = f"""<script src="assets/js/products.js?v={V_PRODUCTS}"></script>
<script src="assets/js/main.js?v={V_JS}"></script>
</body>
</html>
"""

LINES = '<div class="hero__lines" aria-hidden="true"><span></span><span></span><span></span></div>'

SLIDES = [
    ("hero-1-white-brown", "Model with arms outstretched in a white boubou with large brown circle prints", "dark", "dark"),
    ("hero-2-blue", "Model leaning on a wall in a royal blue pinstripe crop top and wide trousers", "light", "light"),
    ("hero-3-black", "Model in the sheer black Wifey boubou", "light", "light"),
    ("hero-4-ash", "Model in an ash halter maxi dress with red trim", "light", "light"),
]


def slides_html():
    figs = []
    for k, (n, alt, desk, head_tone) in enumerate(SLIDES):
        src = "src" if k == 0 else "data-src"
        extra = ' fetchpriority="high"' if k == 0 else ""
        hidden = "" if k == 0 else ' aria-hidden="true"'
        figs.append(
            f'      <figure class="slide{" is-active" if k == 0 else ""}" data-tone-desk="{desk}" '
            f'data-head-phone="{head_tone}" aria-roledescription="slide" aria-label="{k + 1} of {len(SLIDES)}"{hidden}>'
            f'<img class="slide__bg" {src}="assets/img/{n}-blur.webp" alt="" aria-hidden="true">'
            f'<img class="slide__img" {src}="assets/img/{n}.webp" alt="{alt}" width="1024" height="1280"{extra}></figure>')
    return "\n".join(figs)


# --------------------------------------------------------------------------
# HOME
# --------------------------------------------------------------------------
home = head(
    "ADA BEKE — Free-size fashion, made in Nigeria",
    "ADA BEKE is a feel good fashion brand: free-size boubous and sets in soft, flowing fabrics. Made in Nigeria, delivered worldwide via DHL.",
    "home", "/", "og-home.jpg", "ADA BEKE: model in a white boubou with large brown circle prints",
    graph=[ORG, {"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": "ADA BEKE",
                 "inLanguage": "en", "publisher": {"@id": ORG_ID}}],
) + header("home") + f"""
<main id="main">
  <section class="hero" aria-labelledby="hero-title" aria-roledescription="carousel" data-slides data-tone="dark">
    <div class="hero__slides">
{slides_html()}
    </div>
    <div class="hero__veil" aria-hidden="true"><span class="veil veil--bottom"></span><span class="veil veil--side-dark"></span><span class="veil veil--side-light"></span><span class="veil veil--top-dark"></span><span class="veil veil--top-light"></span></div>
    <div class="hero__inner">
      <h1 class="hero__title" id="hero-title" data-chars="load" aria-label="Feel good fashion for every body."><span class="ln" aria-hidden="true">Feel good</span><span class="ln ln--in" aria-hidden="true">fashion for</span><span class="ln" aria-hidden="true">every body<span class="dot">.</span></span></h1>
      <div class="hero__cta" data-reveal data-reveal-load style="--d:900ms">{pill("Shop the collection", "shop.html", "film")}</div>
    </div>
  </section>

  <section class="section story" aria-labelledby="story-label">
    {decor(rings("rings--story"), spark("47%", "9%", 16, 0.2))}
    <div class="wrap">
      <div class="grid-3">
        <p class="label" id="story-label" data-pop="chars">Our story</p>
        <div>
          <p class="lede story__lede" data-scrub>At <span class="mark">ADA BEKE</span>, fashion is more than what you wear {ICON["sparkle"]} it&rsquo;s how you feel in it. We make free-size pieces in soft, flowing fabrics, so every woman can feel chic, relaxed and elegant.</p>
          <figure class="story__float" data-parallax="0.1">
            <div class="arch" data-reveal="wipe"><img src="assets/img/omalicha-runway.webp" alt="Model walking in the Omalicha set with a navy head wrap" loading="lazy" width="591" height="700"></div>
            <figcaption class="tag" data-pop="words">Omalicha, in motion</figcaption>
          </figure>
        </div>
        <div>
          <div class="story__thumb" data-reveal="wipe" style="--d:150ms"><img data-parallax="0.05" src="assets/img/hero-3-black.webp" alt="Model in the sheer black Wifey boubou" loading="lazy" width="1024" height="1280"></div>
        </div>
      </div>
      <div class="story__row">
        <div class="story__note" data-reveal>
          <span class="dot">{ICON["arrow"]}</span>
          <p class="small" data-pop="words">Cut wide and flowing, each free-size piece is made to move with you. Not sure about length? Message us and we&rsquo;ll help.</p>
        </div>
        <span aria-hidden="true"></span>
        <p class="story__big" data-split>Made in Nigeria. Delivered to you, wherever you are in the world.</p>
      </div>
    </div>
  </section>

  <section class="section section--mist curvy" aria-labelledby="fit-title">
    {decor(ghost("free size", "-0.14"), rings("rings--fit"))}
    <div class="wrap fit" data-fit>
      <div class="fit__left">
        <p class="label" data-pop="chars">The ADA BEKE way</p>
        <h2 class="heading heading--spark" id="fit-title" data-split>Free size,<br><em>perfect fit.</em>{spark("100%", "8%", 20, 0.6)}</h2>
        <p class="small" data-pop="words" style="max-width:38ch">Every piece is cut generously to flow, so it sits beautifully on a wide range of bodies.</p>
        <div data-reveal>{pill("Shop new arrivals", "shop.html")}</div>
        <div class="fit__preview arch" data-reveal="wipe" aria-hidden="true">
          <img src="assets/img/hero-2-blue.webp" alt="" loading="lazy">
          <img src="assets/img/hero-1-white-brown.webp" alt="" loading="lazy">
          <img src="assets/img/hero-3-black.webp" alt="" loading="lazy">
          <img src="assets/img/hero-4-ash.webp" alt="" loading="lazy">
          <img src="assets/img/bags-heels.webp" alt="" loading="lazy">
        </div>
      </div>
      <ul class="fit__list" data-pop="items">
        <li><a href="about.html#values"><span>Chic</span><span class="meta">Clean lines, rich fabric</span></a></li>
        <li><a href="about.html#values"><span><em class="serif-i">relaxed</em></span><span class="meta">Easy shapes you can move in</span></a></li>
        <li><a href="about.html#values"><span>Elegance</span><span class="meta">From day into evening</span></a></li>
        <li><a href="contact.html#size"><span>Free <em class="serif-i">size</em></span><span class="meta">One generous cut</span></a></li>
        <li><a href="about.html#made"><span>Made in Nigeria</span><span class="meta">Delivered worldwide</span></a></li>
      </ul>
    </div>
  </section>

  <section class="section edit" aria-labelledby="edit-title">
    {decor(spark("94%", "12%", 18, 1.1))}
    <div class="wrap">
      <div class="edit__head">
        <p class="label" data-pop="chars">The edit</p>
        <h2 class="heading" id="edit-title" data-split>Handpicked<br><em>for you.</em></h2>
        <div class="rail__nav" data-pop="items">
          <button class="round-btn" type="button" data-rail-prev aria-label="Previous pieces">{ICON["left"]}</button>
          <button class="round-btn round-btn--on" type="button" data-rail-next aria-label="Next pieces">{ICON["arrow"]}</button>
        </div>
      </div>
    </div>
    <div class="rail" data-rail data-cursor="Drag" tabindex="0" aria-label="Handpicked pieces. Swipe or use the arrows to see more.">
      <ul class="rail__track" data-products="rail">{skel_cards(4)}</ul>
    </div>
    <div class="wrap rail__foot" data-reveal>
      <div class="rail__bar" aria-hidden="true"><span data-rail-fill></span></div>
      <p class="rail__count" aria-hidden="true"><span data-rail-now>01</span><span class="rail__sep">/</span><span data-rail-total>04</span></p>
    </div>
  </section>

  <section class="section section--mist curvy" aria-labelledby="note-title">
    {decor(rings("rings--note"), spark("94%", "8%", 16, 0.8))}
    <div class="wrap" data-slider>
      <div class="note__head">
        <p class="label" data-pop="chars">A note from Ada Beke</p>
        <h2 class="heading" id="note-title" data-split>We&rsquo;re back.<br><em>A new chapter.</em></h2>
      </div>
      <div class="note__body">
        <div class="note__img arch" data-reveal="wipe"><img data-parallax="0.06" src="assets/img/wifey-seated.webp" alt="Model seated in the black Wifey boubou" loading="lazy" width="720" height="900"></div>
        <div class="note__right">
          <div class="note__quotes" data-reveal>
            <div class="note__set is-active">
              <blockquote class="quote"><p>&ldquo;After a little over a year away, we&rsquo;re finally ready to return to what we love most: bringing fashion, style, and elegance to you.&rdquo;</p><footer><span class="sig">Ada Beke</span></footer></blockquote>
              <blockquote class="quote"><p>&ldquo;To everyone who continued to support us, check in on us, and patiently await our return &mdash; thank you for standing by us, even in our silence.&rdquo;</p><footer><span class="sig">Ada Beke</span></footer></blockquote>
            </div>
            <div class="note__set">
              <blockquote class="quote"><p>&ldquo;We&rsquo;re back with renewed passion, fresh ideas, and an even stronger commitment to serving you better than ever.&rdquo;</p><footer><span class="sig">Ada Beke</span></footer></blockquote>
              <blockquote class="quote"><p>&ldquo;This is more than a comeback; it&rsquo;s the beginning of a beautiful new chapter, and we can&rsquo;t wait to share it with you.&rdquo;</p><footer><span class="sig">Ada Beke</span></footer></blockquote>
            </div>
          </div>
          <div class="note__ctrl" data-pop="items">
            <span class="sr-only" aria-live="polite" data-slider-status></span>
            <a class="text-link" href="about.html#letter" style="margin-right:auto">Read the full letter</a>
            <button class="round-btn" type="button" data-prev aria-label="Previous note">{ICON["left"]}</button>
            <button class="round-btn round-btn--on" type="button" data-next aria-label="Next note">{ICON["arrow"]}</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="banner-title">
    <div class="wrap">
      <div class="banner" data-reveal>
        {decor(rings("rings--banner"), spark("88%", "16%", 20, 0.3), spark("62%", "78%", 12, 1.6))}
        <div class="banner__text">
          <h2 class="heading" id="banner-title" data-split>Designed to flow,<br><em>made in Nigeria.</em></h2>
          <div>
            <p class="small" data-pop="words">Ready-to-wear, free-size pieces, delivered to you anywhere in the world. Ordering takes a few messages on WhatsApp.</p>
            <div style="margin-top:22px">{pill("How to order", "contact.html#order", "light")}</div>
          </div>
        </div>
        <div class="banner__media" data-video>
          <video data-parallax="0.05" src="assets/video/wifey.mp4" poster="assets/img/wifey-standing.webp" muted loop playsinline preload="none" aria-label="Film: model in the black Wifey boubou"></video>
          {toggle()}
        </div>
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
  <section class="page-hero" aria-labelledby="shop-title">
    {LINES}
    {decor(rings("rings--hero"))}
    <div class="page-hero__inner">
      <p class="crumbs label" data-reveal data-reveal-load><a href="index.html">Home</a><span aria-hidden="true">/</span><span>Shop</span></p>
      <h1 class="display page-hero__title" id="shop-title" data-split="load">The<br><em>collection.</em></h1>
      <div class="page-hero__aside" data-reveal data-reveal-load style="--d:650ms">
        <p class="label">{ICON["sparkle"]} New chapter &middot; 2026</p>
        <p class="hero__desc">Every piece is free size and ready to wear. Add pieces to your bag and check out on WhatsApp. We deliver worldwide.</p>
      </div>
    </div>
    {megamark()}
  </section>

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
    {decor(rings("rings--shop"))}
    <div class="wrap">
      <div class="cards cards--shop" data-products="all">{skel_cards(4, "div", "skel-card")}</div>
    </div>
  </section>

  <section class="section--tight" aria-labelledby="help-title" style="padding-top:0">
    <div class="wrap">
      <div class="helper" data-reveal>
        {decor(rings("rings--helper"))}
        <div class="lottie" data-lottie aria-hidden="true"></div>
        <div style="display:grid;gap:16px;position:relative">
          <h3 id="help-title" data-split>Not sure which piece is you? <em>We&rsquo;ll help you choose.</em></h3>
          <p data-pop="words">Tell us your height, your usual size and where you&rsquo;re wearing it. We&rsquo;ll reply on WhatsApp.</p>
          <div>{pill("Ask on WhatsApp", WA + "?text=Hello%20ADA%20BEKE!%20Please%20help%20me%20choose%20a%20piece.", "navy", "wa", ' target="_blank" rel="noopener"')}</div>
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
  <section class="page-hero page-hero--media" aria-labelledby="about-title">
    {LINES}
    <div class="page-hero__inner">
      <h1 class="display page-hero__title" id="about-title" data-split="load">Chic,<br><em>relaxed,</em><br>Elegance.</h1>
      <div class="page-hero__media" data-video data-reveal="clip" data-reveal-load style="--d:150ms">
        <video src="assets/video/wifey.mp4" poster="assets/img/wifey-seated.webp" autoplay muted loop playsinline preload="auto" aria-label="Film: model in the black Wifey boubou"></video>
        {toggle()}
      </div>
      <div class="page-hero__aside" data-reveal data-reveal-load style="--d:800ms">
        <p class="label">{ICON["sparkle"]} Our story</p>
        <p class="hero__desc">Fashion pieces focused on free size culture. A feel good fashion brand, made in Nigeria.</p>
      </div>
    </div>
    <figure class="polaroid" data-reveal="drop" data-reveal-load style="--d:1200ms">
      <img src="assets/img/bags-heels.webp" alt="ADA BEKE shopping bag beside red strappy heels" width="720" height="1280">
      <figcaption>Wrapped in aqua</figcaption>
    </figure>
    {megamark()}
  </section>

  <section class="section" aria-labelledby="who-label">
    {decor(rings("rings--who"), spark("40%", "12%", 16, 0.5))}
    <div class="wrap grid-3">
      <p class="label" id="who-label" data-pop="chars">Who we are</p>
      <p class="lede" data-scrub style="max-width:22ch"><span class="mark">ADA BEKE</span> is a feel good fashion brand {ICON["sparkle"]} built on free size culture. Getting dressed should feel easy: generous shapes, soft fabrics and pieces that flatter without fuss.</p>
      <div class="who__img">
        <div class="arch" data-reveal="wipe"><img data-parallax="0.05" src="assets/img/omalicha-mannequin.webp" alt="The Omalicha set in royal navy" loading="lazy"></div>
      </div>
    </div>
  </section>

  <section class="section section--mist curvy" id="letter" aria-labelledby="letter-title">
    {decor(ghost("new chapter", "-0.1"))}
    <div class="wrap letter">
      <div class="letter__side">
        <p class="label" data-pop="chars">We&rsquo;re back</p>
      </div>
      <div>
        <h2 class="heading" id="letter-title" data-split style="margin-bottom:clamp(32px,4vw,56px)">Ready for a<br><em>new chapter.</em></h2>
        <div class="letter__cols" data-pop="items">
          <p>After a little over a year away, we&rsquo;re finally ready to return to what we love most &mdash; bringing fashion, style, and elegance to you.</p>
          <p>Shortly after taking the exciting step of rebranding, life took an unexpected turn. The space we were operating out of was sold and we had to evacuate the premises; then the daunting task of looking for a new production space began.</p>
          <p>What was meant to be a fresh start became an unforeseen pause &mdash; one that gave us time to reflect, regroup, and prepare for everything ahead.</p>
          <p>It hasn&rsquo;t been the easiest journey, but through it all, <strong>God has been faithful and his mercy has been evident every step of the way.</strong></p>
          <p>To everyone who continued to support us, check in on us, and patiently await our return, <strong>thank you for standing by us, even in our silence.</strong> Your love and loyalty mean more than words can express.</p>
          <p>We&rsquo;re back with renewed passion, fresh ideas, and an even stronger commitment to serving you better than ever.</p>
          <p>This is more than a comeback; it&rsquo;s the beginning of a beautiful new chapter, and we can&rsquo;t wait to share it with you.</p>
        </div>
      </div>
      <div class="letter__side">
        <blockquote class="pullquote" data-pop="words">&ldquo;Through it all, God has been faithful.&rdquo;</blockquote>
        <div class="signoff" data-pop="items">
          <span class="sig">Ada Beke</span>
          <span class="label">Chic &bull; relaxed &bull; Elegance</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="values" aria-labelledby="values-title">
    {decor(ghost("elegance", "0.12", "ghost--low"))}
    <div class="wrap">
      <div class="edit__head">
        <p class="label" data-pop="chars">What we stand for</p>
        <h2 class="heading" id="values-title" data-split>Three words,<br><em>one feeling.</em></h2>
      </div>
      <div class="values" data-pop="items">
        <article class="value">
          <h3 class="value__word">CHIC</h3>
          <div class="value__img"><img data-parallax="0.05" src="assets/img/hero-2-blue.webp" alt="Model in a royal blue pinstripe crop top and wide trousers" loading="lazy"></div>
          <p>Clean lines, rich colour and fabric that catches the light. Pieces that look considered without trying too hard.</p>
        </article>
        <article class="value">
          <h3 class="value__word is-relaxed">relaxed</h3>
          <div class="value__img arch"><img data-parallax="0.05" src="assets/img/hero-1-white-brown.webp" alt="Model in a white boubou with brown circle prints" loading="lazy"></div>
          <p>Wide, easy shapes you can sit, move and breathe in. Free size means no squeezing into a number.</p>
        </article>
        <article class="value">
          <h3 class="value__word">ELEGANCE</h3>
          <div class="value__img"><img data-parallax="0.05" src="assets/img/hero-3-black.webp" alt="Model standing in the Wifey boubou" loading="lazy"></div>
          <p>Flowing chiffon and graceful drape that carry you from a quiet day to a special evening.</p>
        </article>
      </div>
    </div>
  </section>

  <section class="section--tight section--mist curvy" id="made" aria-label="How we work">
    {decor(rings("rings--made"))}
    <div class="wrap"><div class="facts" data-pop="items">
      <div class="fact"><h3>Free <em>size</em></h3><p>Generous, flowing cuts designed to sit beautifully on a wide range of bodies.</p></div>
      <div class="fact"><h3>Made in <em>Nigeria</em></h3><p>Designed and produced in Nigeria, from our new production space.</p></div>
      <div class="fact"><h3>Delivered <em>worldwide</em></h3><p>Wherever you are, we deliver via DHL. Message us and we&rsquo;ll get your piece to you.</p></div>
    </div></div>
  </section>

  <section class="section" aria-labelledby="about-cta">
    <div class="wrap">
      <div class="banner" data-reveal>
        {decor(rings("rings--banner"), spark("86%", "14%", 20, 0.3))}
        <div class="banner__text">
          <h2 class="heading" id="about-cta" data-split>Find your<br><em>feel good piece.</em></h2>
          <div>
            <p class="small" data-pop="words">Start with our all-time bestseller, the Omalicha set, or the new Wifey boubou.</p>
            <div style="margin-top:22px">{pill("Shop the collection", "shop.html", "light")}</div>
          </div>
        </div>
        <div class="banner__media"><img data-parallax="0.05" src="assets/img/omalicha-mannequin.webp" alt="The Omalicha set with its scarf" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>
      </div>
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
     "Add pieces to your bag and choose &ldquo;Checkout on WhatsApp&rdquo;, or message us directly. We confirm your total and how to pay with you on WhatsApp.",
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
    "contact", "/contact.html", "og-contact.jpg", "Model in a royal blue pinstripe crop top and wide trousers",
    graph=[ORG,
           {"@type": "ContactPage", "@id": SITE + "/contact.html#page", "url": SITE + "/contact.html",
            "name": "Contact & ordering", "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": ORG_ID}},
           crumbs_ld("Contact", "/contact.html"),
           {"@type": "FAQPage", "@id": SITE + "/contact.html#faq",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": plain}} for q, _, plain in FAQ]}],
) + header("contact") + f"""
<main id="main">
  <section class="page-hero" aria-labelledby="contact-title">
    {LINES}
    {decor(rings("rings--hero"))}
    <div class="page-hero__inner">
      <p class="crumbs label" data-reveal data-reveal-load><a href="index.html">Home</a><span aria-hidden="true">/</span><span>Contact</span></p>
      <h1 class="display page-hero__title" id="contact-title" data-split="load">Let&rsquo;s get you<br><em>dressed.</em></h1>
      <div class="page-hero__aside" data-reveal data-reveal-load style="--d:700ms">
        <p class="label">{ICON["sparkle"]} We reply on WhatsApp</p>
        <p class="hero__desc">Orders, questions about fit, or help choosing a piece: send us a message and we&rsquo;ll take it from there.</p>
        <div>{pill("Message us on WhatsApp", WA, "light", "wa", ' target="_blank" rel="noopener"')}</div>
      </div>
    </div>
    {megamark()}
  </section>

  <section class="section" id="order" aria-labelledby="order-title">
    {decor(spark("92%", "10%", 18, 0.2))}
    <div class="wrap">
      <div class="edit__head">
        <p class="label" data-pop="chars">How to order</p>
        <h2 class="heading" id="order-title" data-split>Ordering is<br><em>a conversation.</em></h2>
      </div>
      <ol class="steps" data-pop="items">
        <li class="step"><h3>Choose your piece</h3><p>Browse the collection and add what you love to your bag.</p></li>
        <li class="step"><h3>Send it on WhatsApp</h3><p>Checkout opens WhatsApp with your order already written out.</p></li>
        <li class="step"><h3>Confirm the details</h3><p>We confirm your total, payment and delivery with you directly.</p></li>
        <li class="step"><h3>We deliver worldwide</h3><p>Your piece is on its way to you via DHL, wherever you are.</p></li>
      </ol>
    </div>
  </section>

  <section class="section section--mist curvy" aria-labelledby="write-title">
    {decor(rings("rings--write"))}
    <div class="wrap contact">
      <div>
        <h2 class="heading" id="write-title" data-split style="margin-bottom:clamp(28px,3vw,44px)">Write to<br><em>us.</em></h2>
        <form class="form" data-wa-form="contact" novalidate data-pop="items">
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
          <div><button class="pill pill--navy" type="submit"><span class="pill__text">Send on WhatsApp</span><span class="pill__icon">{ICON["wa"]}</span></button></div>
          <p class="small">Opens WhatsApp with your message ready to send. Nothing is sent until you press send there.</p>
        </form>
      </div>
      <div style="display:grid;gap:40px;align-content:start">
        <div class="channels" data-pop="items">
          <a class="channel" href="{WA}" target="_blank" rel="noopener"><span class="channel__icon">{ICON["wa"]}</span><span><span class="channel__name">WhatsApp</span><br><span class="channel__sub">+234 809 371 2578</span></span><span class="channel__arrow">{ICON["arrow"]}</span></a>
          <a class="channel" href="{IG}" target="_blank" rel="noopener"><span class="channel__icon">{ICON["ig"]}</span><span><span class="channel__name">Instagram</span><br><span class="channel__sub">@byadabeke</span></span><span class="channel__arrow">{ICON["arrow"]}</span></a>
          <a class="channel" href="{TH}" target="_blank" rel="noopener"><span class="channel__icon">{ICON["threads"]}</span><span><span class="channel__name">Threads</span><br><span class="channel__sub">@byadabeke</span></span><span class="channel__arrow">{ICON["arrow"]}</span></a>
        </div>
        <div class="helper" data-reveal style="background:var(--white)">
          <div class="lottie" data-lottie aria-hidden="true"></div>
          <div style="display:grid;gap:12px">
            <h3 data-split>Torn between two? <em>We&rsquo;ll help.</em></h3>
            <p data-pop="words">Pick &ldquo;Not sure yet&rdquo; in the form and tell us what you have in mind.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section" id="size" aria-labelledby="size-title">
    <div class="wrap">
      <div class="sizebox">
        {decor(rings("rings--size"))}
        <div style="position:relative">
          <p class="label" data-pop="chars" style="margin-bottom:18px">Size guide</p>
          <h2 class="heading" id="size-title" data-split>Free size,<br><em>explained.</em></h2>
          <p class="small" data-pop="words" style="margin-top:22px;max-width:40ch">Our pieces are cut generously, so one size is designed to flow on a wide range of bodies. Length and drape differ from piece to piece, so tell us a little about you and we&rsquo;ll tell you how a piece will sit.</p>
          <p class="small" data-reveal style="margin-top:14px">Our size chart is also in the <a class="text-link" href="{IG}" target="_blank" rel="noopener">Size chart highlight on Instagram</a>.</p>
        </div>
        <div style="position:relative">
          <table class="sizebox__table">
            <caption class="sr-only">What to send us for fit advice</caption>
            <thead><tr><th scope="col">Send us</th><th scope="col">Why it helps</th></tr></thead>
            <tbody data-pop="items">
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

  <section class="section section--mist curvy" id="faq" aria-labelledby="faq-title">
    {decor(ghost("good to know", "-0.1"))}
    <div class="wrap grid-3">
      <p class="label" data-pop="chars">Questions</p>
      <div>
        <h2 class="heading" id="faq-title" data-split style="margin-bottom:clamp(28px,3vw,48px)">Good to<br><em>know.</em></h2>
        <div class="faq" data-pop="items">
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
  <section class="page-hero page-hero--404" aria-labelledby="nf-title">
    {LINES}
    {decor(rings("rings--hero"), rings("rings--hero2"))}
    <div class="page-hero__inner">
      <p class="crumbs label" data-reveal data-reveal-load><span>404</span></p>
      <h1 class="display page-hero__title" id="nf-title" data-split="load">Lost your<br><em>way?</em></h1>
      <div class="page-hero__aside" data-reveal data-reveal-load style="--d:600ms">
        <p class="hero__desc">This page isn&rsquo;t here, but your feel good piece is.</p>
        <div class="nf-actions">{pill("Shop the collection", "shop.html", "light")}{pill("Back home", "index.html", "ghost")}</div>
      </div>
    </div>
    {megamark()}
  </section>
</main>
""" + FOOTER + SCRIPTS


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
                   ("contact.html", contact), ("404.html", absolutise(notfound))]:
    (OUT / name).write_text(html, encoding="utf-8")
    print("wrote", name, len(html))

(OUT / "robots.txt").write_text(f"""# ADA BEKE
User-agent: *
Allow: /

Sitemap: {SITE}/sitemap.xml
""", encoding="utf-8")


def img_tags(paths):
    return "".join(f"\n    <image:image><image:loc>{SITE}/{p}</image:loc></image:image>" for p in paths)


PAGES = [
    ("/", "1.0", ["assets/img/hero-1-white-brown.webp", "assets/img/hero-2-blue.webp",
                  "assets/img/hero-3-black.webp", "assets/img/hero-4-ash.webp"]),
    ("/shop.html", "0.9", ["assets/img/omalicha-mannequin.webp", "assets/img/wifey-seated.webp",
                           "assets/img/abira-front.webp", "assets/img/abira-set.webp"]),
    ("/about.html", "0.6", ["assets/img/omalicha-runway.webp"]),
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
    "headers": [
        {"source": "/assets/css/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        {"source": "/assets/js/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=31536000, immutable"}]},
        {"source": "/assets/(img|video|lottie|vendor)/(.*)", "headers": [{"key": "Cache-Control", "value": "public, max-age=86400, stale-while-revalidate=604800"}]},
        {"source": "/(.*)", "headers": [
            {"key": "X-Content-Type-Options", "value": "nosniff"},
            {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
        ]},
    ],
}, indent=2) + "\n", encoding="utf-8")
print("wrote robots.txt, sitemap.xml, site.webmanifest, vercel.json")
