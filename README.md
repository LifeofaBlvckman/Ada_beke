# ADA BEKE — website

*Chic • relaxed • Elegance.* A four-page static website for **ADA BEKE**, the free-size fashion brand (Instagram [@byadabeke](https://www.instagram.com/byadabeke/)).

| Page | File | What's on it |
| --- | --- | --- |
| Home | `index.html` | Full-screen shopping-bag film with the headline on top, the brand story, "Free size, perfect fit", featured pieces, a note from Ada Beke, and a "made in Nigeria" banner |
| Shop | `shop.html` | All pieces with filters, a product details panel, and the bag |
| About | `about.html` | Brand story, the full "We're back" letter, Chic / relaxed / Elegance |
| Contact | `contact.html` | How to order, a WhatsApp contact form, the free-size guide and questions |

There's no build step: it's plain HTML, CSS and JavaScript. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## How ordering works

Shoppers add pieces to the **bag**. "Checkout on WhatsApp" then opens WhatsApp (+234 809 371 2578) with the order already written out: each piece, quantity, price and subtotal. The contact form and the footer box work the same way. The bag is saved in the visitor's browser, so it's still there when they move between pages.

## Adding or editing products

Everything lives in **`assets/js/products.js`**. Add a new block to the list and the Home and Shop pages update automatically:

```js
{
  id: "new-piece",                 // used in links: shop.html?p=new-piece
  name: "*Name* boubou",           // *stars* = italic
  colour: "Ivory",
  price: 55000,                    // or null for "Price on request"
  status: "available",             // or "soon" for "Dropping soon"
  badge: "New",
  includes: "Sold with the scarf",
  fabric: "Chiffon",               // or null if you'd rather not say
  fit: "Free size",
  description: "One or two sentences.",
  images: ["assets/img/new-piece-1.webp", "assets/img/new-piece-2.webp"],
},
```

Photos go in `assets/img/`. Portrait photos (4:5) look best, and the second photo shows when the shopper hovers. A piece with `images: []` shows a coloured "Photo coming soon" card, which is what the **Abira** set uses until its photo is added.

## Design

- **Colours:** brand aqua `#58DADC` (taken from the ADA BEKE bags and end card), navy `#0F2A4A` (from the Omalicha fabric), and a pale aqua mist `#EAF8F8`.
- **Type:** Cinzel for the ADA BEKE wordmark, Inter Tight for headlines and text, and Playfair Display italic for the emphasised words.
- **Motion:** words appear one by one, sections fade up as you scroll, the story paragraph lights up word by word, and pages fade through an aqua ADA BEKE curtain. All motion is switched off for visitors who have "reduce motion" turned on.
- **Lottie:** the "choosing a dress" animation appears when the bag is empty, on the Shop page, and on the Contact page. It's served from this site (`assets/lottie/choosing.js`), played with [lottie-web](https://github.com/airbnb/lottie-web) (MIT, `assets/vendor/`), and only loads when it's needed.

## Putting it online (GitHub Pages)

In the repository go to **Settings → Pages**, choose "Deploy from a branch", pick the branch and the `/ (root)` folder, and save. The site will appear at `https://<username>.github.io/Ada_beke/`.

## Still to add

- The Abira photo and price
- Photos for the other pieces on Instagram (silver boubou, ivory set, gingham set, tee & gingham), with names and prices
- The size chart values, if you want them on the Contact page instead of linking to the Instagram highlight
