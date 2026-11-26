/* ==========================================================================
   ADA BEKE — starting product list
   --------------------------------------------------------------------------
   Once the database is connected, pieces are managed in the admin dashboard
   (/admin) and this list is only:
     - what the database starts with the very first time, and
     - the backup the shop shows if the database can't be reached.
   Before the database is connected, edit pieces here.

   id        short unique name, used in links (shop.html?p=omalicha)
   name      shown in the shop, e.g. "Omalicha set"
   price     a number in naira (45000), or null to show "Price on request"
   status    "available", "soon", "sold_out" or "hidden"
   collection the id of one of the collections below, or "" for none
   fitNote   an optional note on fit or length, e.g. "Falls to the ankle on 5'6\""
   images    paths to photos (first one is the main photo). Leave the list
             empty [] and the card shows a coloured placeholder instead.
             Photos in assets/img/shoot/ also have a light -800 copy that
             phones and thumbnails use automatically.
   ========================================================================== */
(function (root) {
root.ADA_PRODUCTS = [
  {
    id: "omalicha",
    name: "Omalicha set",
    colour: "Royal navy shimmer chiffon",
    price: 45000,
    status: "available",
    collection: "sets",
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
    name: "Wifey boubou",
    colour: "Black",
    price: 50000,
    status: "available",
    collection: "boubous",
    badge: "New",
    includes: "Sold with the co-ord set",
    fabric: "Sheer dotted chiffon",
    fit: "Free size",
    description:
      "A sheer, softly dotted black boubou with wide, floating sleeves. Sold with its co-ord set.",
    images: ["assets/img/shoot/wifey-seated.webp", "assets/img/shoot/wifey-gaze.webp", "assets/img/shoot/wifey-standing.webp"],
  },
  {
    id: "abira",
    name: "Abira hoodie set",
    colour: "Rust & cobalt leaf print",
    price: 50000,
    status: "available",
    collection: "sets",
    badge: "Restocked",
    includes: "Abira hoodie boubou & pants set",
    fabric: null, // add the fabric name when known
    fit: "Free size",
    description:
      "For that woman who loves to show up in relaxed elegance. The Abira hoodie boubou with matching pants, available for immediate delivery.",
    images: [
      "assets/img/shoot/abira-front.webp",
      "assets/img/shoot/abira-set.webp",
      "assets/img/shoot/abira-pose.webp",
      "assets/img/shoot/abira-turn.webp",
      "assets/img/shoot/abira-back.webp",
    ],
  },
  {
    id: "something-soft",
    name: "Something soft",
    colour: "Dropping soon",
    price: null,
    status: "soon",
    collection: "",
    badge: "Dropping soon",
    includes: "Details coming soon",
    fabric: "To be revealed",
    fit: "Free size",
    description:
      "Something soft for our beautiful, stylish ladies is on the way. Message us on WhatsApp to hear the moment it drops.",
    images: ["assets/img/bags-bag.webp", "assets/img/bags-glass.webp"],
  },
];

// Collections group pieces on the home page and in the shop filters.
root.ADA_COLLECTIONS = [
  { id: "sets", name: "Sets", tagline: "Boubou and trouser sets, ready to wear", image: "assets/img/shoot/abira-set.webp" },
  { id: "boubous", name: "Boubous", tagline: "Wide, flowing and free size", image: "assets/img/shoot/wifey-gaze.webp" },
];

root.ADA_CONTACT = {
  whatsapp: "2348093712578",
  whatsappDisplay: "+234 809 371 2578",
  instagram: "https://www.instagram.com/byadabeke/",
  threads: "https://www.threads.net/@byadabeke",
};
})(typeof window !== "undefined" ? window : module.exports);
