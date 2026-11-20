/* ==========================================================================
   ADA BEKE — starting product list
   --------------------------------------------------------------------------
   Once the database is connected, pieces are managed in the admin dashboard
   (/admin) and this list is only:
     - what the database starts with the very first time, and
     - the backup the shop shows if the database can't be reached.
   Before the database is connected, edit pieces here.

   id        short unique name, used in links (shop.html?p=omalicha)
   name      shown in the shop. Wrap a word in *stars* to set it in italics.
   price     a number in naira (45000), or null to show "Price on request"
   status    "available", "soon", "sold_out" or "hidden"
   images    paths to photos (first one is the main photo). Leave the list
             empty [] and the card shows a coloured placeholder instead.
   ========================================================================== */
(function (root) {
root.ADA_PRODUCTS = [
  {
    id: "omalicha",
    name: "*Omalicha* set",
    colour: "Royal navy shimmer chiffon",
    price: 45000,
    status: "available",
    badge: "Bestseller",
    includes: "Sold with the scarf only",
    fabric: "Flowy shimmer chiffon",
    fit: "Free size",
    description:
      "Our all-time bestseller, now in a flowy shimmer chiffon. A wide, free-size boubou over matching wide-leg trousers, finished with its scarf.",
    images: ["assets/img/omalicha-mannequin.webp", "assets/img/omalicha-runway.webp"],
  },
  {
    id: "wifey",
    name: "*Wifey* boubou",
    colour: "Black",
    price: 50000,
    status: "available",
    badge: "New",
    includes: "Sold with the co-ord set",
    fabric: "Sheer dotted chiffon",
    fit: "Free size",
    description:
      "A sheer, softly dotted black boubou with wide, floating sleeves. Sold with its co-ord set.",
    images: ["assets/img/wifey-seated.webp", "assets/img/hero-3-black.webp", "assets/img/wifey-standing.webp"],
  },
  {
    id: "abira",
    name: "*Abira* hoodie set",
    colour: "Rust & cobalt leaf print",
    price: 50000,
    status: "available",
    badge: "Restocked",
    includes: "Abira hoodie boubou & pants set",
    fabric: null, // add the fabric name when known
    fit: "Free size",
    description:
      "For that woman who loves to show up in relaxed elegance. The Abira hoodie boubou with matching pants, available for immediate delivery.",
    images: ["assets/img/abira-front.webp", "assets/img/abira-set.webp", "assets/img/abira-back.webp"],
  },
  {
    id: "something-soft",
    name: "Something *soft*",
    colour: "Dropping soon",
    price: null,
    status: "soon",
    badge: "Dropping soon",
    includes: "Details coming soon",
    fabric: "To be revealed",
    fit: "Free size",
    description:
      "Something soft for our beautiful, stylish ladies is on the way. Message us on WhatsApp to hear the moment it drops.",
    images: ["assets/img/bags-bag.webp", "assets/img/bags-glass.webp"],
  },
];

root.ADA_CONTACT = {
  whatsapp: "2348093712578",
  whatsappDisplay: "+234 809 371 2578",
  instagram: "https://www.instagram.com/byadabeke/",
  threads: "https://www.threads.net/@byadabeke",
};
})(typeof window !== "undefined" ? window : module.exports);
