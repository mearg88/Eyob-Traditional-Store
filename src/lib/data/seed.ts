import type {
  Category, CountryGroup, Design, DesignOption, DesignPrice, ExchangeRate,
  Review, StoreSettings,
} from '../types';

// ---------------------------------------------------------------------------
// Seed data for development and demonstration.
//
// The photographs are the shop's own — 41 real images, organised as
// design-01 to design-41 under public/media/designs. They are grouped here
// into plausible designs with PLACEHOLDER names, categories and prices.
//
// The owner replaces all of it through the admin. Nothing below should ever
// reach a real customer.
// ---------------------------------------------------------------------------

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'cat-bridal', slug: 'bridal', name: 'Bridal & Wedding',
    description: 'Gowns and wedding dresses, made to your measurements.',
    measurementTemplateId: 'tmpl-bridal', position: 1,
  },
  {
    id: 'cat-kemis', slug: 'habesha-kemis', name: 'Habesha Kemis',
    description: 'Handwoven dresses for holidays, church and celebration.',
    measurementTemplateId: 'tmpl-standard', position: 2,
  },
  {
    id: 'cat-netela', slug: 'netela-shash', name: 'Netela & Shash',
    description: 'Light shawls and headscarves in fine cotton.',
    measurementTemplateId: 'tmpl-wrap', position: 3,
  },
  {
    id: 'cat-gabi', slug: 'gabi-shemma', name: 'Gabi & Shemma',
    description: 'Heavier wraps, woven in layers for warmth.',
    measurementTemplateId: 'tmpl-wrap', position: 4,
  },
  {
    id: 'cat-mens', slug: 'mens-traditional', name: "Men's Traditional",
    description: 'Shirts, trousers, kuta and full sets.',
    measurementTemplateId: 'tmpl-mens', position: 5,
  },
  {
    id: 'cat-children', slug: 'childrens-wear', name: "Children's Wear",
    description: 'The same cloth, cut smaller.',
    measurementTemplateId: 'tmpl-children', position: 6,
  },
  {
    id: 'cat-accessories', slug: 'accessories', name: 'Accessories',
    description: 'Belts, jewellery and finishing pieces.',
    measurementTemplateId: 'tmpl-wrap', position: 7,
  },
];

const photo = (n: number) => `/media/designs/design-${String(n).padStart(2, '0')}.jpg`;

interface SeedSpec {
  name: string;
  categoryId: string;
  photos: number[];
  gender: Design['gender'];
  fabric: string;
  colour: string;
  embroidery: string;
  occasion: string[];
  productionDays: number;
  /** Local price in birr, major units. */
  etb: number;
  /** International price in dollars, major units. */
  usd: number;
  featured?: boolean;
  description: string;
}

// ---------------------------------------------------------------------------
// IMPORTANT: every one of the 41 photographs is a WOMEN'S dress or gown.
//
// An earlier version of this seed invented men's sets and children's wear and
// attached them to photographs of women's gowns, which looked absurd. The
// designs below only claim to be what the photographs actually show.
//
// The other categories (men's, children's, wraps, accessories) still exist in
// the category list, ready for the owner to add designs to — they simply have
// no seeded designs until there are photographs of them.
// ---------------------------------------------------------------------------
const SPECS: SeedSpec[] = [
  {
    name: 'Gold Bridal Gown', categoryId: 'cat-bridal', photos: [31, 32, 33],
    gender: 'women', fabric: 'Fine handspun cotton with chiffon overlay',
    colour: 'Ivory with gold and crimson', embroidery: 'Hand-beaded tibeb panels, gold and red',
    occasion: ['wedding'], productionDays: 28, etb: 28500, usd: 520, featured: true,
    description:
      'A halter-neck bridal gown with hand-beaded panels running from the neckline to the hem. The border work alone takes a weaver close to three weeks. Cut entirely to your own measurements.',
  },
  {
    name: 'Meskel Bridal Gown', categoryId: 'cat-bridal', photos: [40, 41, 39],
    gender: 'women', fabric: 'Fine cotton with silk thread',
    colour: 'Ivory with gold', embroidery: 'Wide gold tibeb at the hem',
    occasion: ['wedding'], productionDays: 28, etb: 26500, usd: 485, featured: true,
    description:
      'A full-skirted gown with a structured bodice and a deep band of gold work around the hem. Photographed outdoors because it deserves the light.',
  },
  {
    name: 'Blue Tibeb Gown', categoryId: 'cat-bridal', photos: [20, 21, 22],
    gender: 'women', fabric: 'Cotton tulle with printed panels',
    colour: 'White with blue and coral', embroidery: 'Printed and beaded tibeb',
    occasion: ['wedding', 'celebration'], productionDays: 24, etb: 22000, usd: 410, featured: true,
    description:
      'An unusual palette for a bridal piece — the border runs blue and coral rather than the traditional red and gold. Fitted bodice, full skirt.',
  },
  {
    name: 'Ceremonial Gown', categoryId: 'cat-bridal', photos: [23, 24, 25],
    gender: 'women', fabric: 'Handspun cotton with chiffon',
    colour: 'Ivory', embroidery: 'Fine silver and gold thread',
    occasion: ['wedding'], productionDays: 26, etb: 24000, usd: 445,
    description:
      'A quieter bridal gown for a wedding that does not want gold everywhere. The thread work sits at the bodice and hem only.',
  },
  {
    name: 'Evening Gown', categoryId: 'cat-bridal', photos: [26, 27, 28],
    gender: 'women', fabric: 'Chiffon over handwoven cotton',
    colour: 'Cream', embroidery: 'Beaded bodice',
    occasion: ['wedding', 'celebration'], productionDays: 21, etb: 19500, usd: 365,
    description: 'Lighter than a full bridal gown and easier to wear through a long evening.',
  },
  {
    name: 'Engagement Gown', categoryId: 'cat-bridal', photos: [29, 30],
    gender: 'women', fabric: 'Fine cotton with chiffon', colour: 'Ivory with red',
    embroidery: 'Red and gold tibeb', occasion: ['celebration', 'wedding'],
    productionDays: 21, etb: 18500, usd: 350,
    description: 'Made for engagements and the smaller ceremonies around a wedding.',
  },
  {
    name: 'Off-Shoulder Kemis', categoryId: 'cat-kemis', photos: [1, 2, 3],
    gender: 'women', fabric: 'Handspun cotton, fine shemma weave',
    colour: 'Natural with charcoal border', embroidery: 'Geometric tibeb in charcoal',
    occasion: ['wedding', 'celebration'], productionDays: 21, etb: 14500, usd: 285, featured: true,
    description:
      'A softly structured off-shoulder kemis with a repeating geometric border at the neckline and down the front. Woven on a traditional pit loom.',
  },
  {
    name: 'Sheer Sleeve Kemis', categoryId: 'cat-kemis', photos: [36, 37, 38],
    gender: 'women', fabric: 'Handspun cotton with chiffon sleeves',
    colour: 'Ivory with blush', embroidery: 'Beaded panel, blush and silver',
    occasion: ['celebration', 'holiday'], productionDays: 18, etb: 13500, usd: 265,
    description:
      'A beaded front panel with a sheer netela worn over the shoulder. One of our most-ordered pieces.',
  },
  {
    name: 'Meskel Celebration Kemis', categoryId: 'cat-kemis', photos: [4, 5, 6],
    gender: 'women', fabric: 'Handspun cotton, medium weight',
    colour: 'Natural with green and gold', embroidery: 'Narrow geometric tibeb',
    occasion: ['holiday', 'celebration'], productionDays: 18, etb: 11800, usd: 235,
    description: 'Woven for the Meskel season, with a narrow repeating border in green and ochre.',
  },
  {
    name: 'Everyday Kemis', categoryId: 'cat-kemis', photos: [7, 8, 9],
    gender: 'women', fabric: 'Handspun cotton, light shemma',
    colour: 'Undyed cream', embroidery: 'Deep indigo border',
    occasion: ['everyday', 'church'], productionDays: 14, etb: 8200, usd: 175,
    description:
      'A lighter kemis in undyed cotton with a restrained indigo border. Comfortable in heat, and it softens with every wash.',
  },
  {
    name: 'Gondar Kemis', categoryId: 'cat-kemis', photos: [10, 11, 12],
    gender: 'women', fabric: 'Handspun cotton, medium weight',
    colour: 'Cream with burgundy', embroidery: 'Repeating diamond tibeb',
    occasion: ['celebration', 'holiday'], productionDays: 21, etb: 13500, usd: 265,
    description: 'The diamond border is a Gondar pattern, worked in burgundy against undyed cotton.',
  },
  {
    name: 'Church Kemis', categoryId: 'cat-kemis', photos: [13, 14, 15],
    gender: 'women', fabric: 'Fine handspun cotton', colour: 'White with fine border',
    embroidery: 'Narrow woven edge', occasion: ['church', 'everyday'],
    productionDays: 14, etb: 9500, usd: 195,
    description: 'Plain and light, made for church rather than for a celebration.',
  },
  {
    name: 'Timkat Kemis', categoryId: 'cat-kemis', photos: [16, 17, 18],
    gender: 'women', fabric: 'Handspun cotton', colour: 'Cream with gold',
    embroidery: 'Gold thread at the hem', occasion: ['holiday'],
    productionDays: 18, etb: 12500, usd: 245,
    description: 'Woven for Timkat, with gold thread carried through the hem and cuffs.',
  },
  {
    name: 'Celebration Kemis', categoryId: 'cat-kemis', photos: [19, 34, 35],
    gender: 'women', fabric: 'Handspun cotton with chiffon',
    colour: 'Cream with multicolour tibeb', embroidery: 'Full-width woven border',
    occasion: ['celebration', 'wedding'], productionDays: 21, etb: 15500, usd: 300,
    description: 'The widest border we weave, carried right around the hem.',
  },
];

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const SEED_DESIGNS: Design[] = SPECS.map((s, i) => ({
  id: `dsn-${String(i + 1).padStart(3, '0')}`,
  slug: slugify(s.name),
  status: 'published',
  name: s.name,
  categoryId: s.categoryId,
  description: s.description,
  careInstructions:
    'Hand wash cold with mild soap. Do not bleach. Dry flat in shade — direct sun fades the border. Warm iron on the reverse.',
  fabric: s.fabric,
  colour: s.colour,
  embroidery: s.embroidery,
  occasion: s.occasion,
  gender: s.gender,
  productionDays: s.productionDays,
  photos: s.photos.map((n, idx) => ({
    id: `pho-${i}-${idx}`,
    key: photo(n),
    alt: `${s.name}${idx === 0 ? '' : ` — view ${idx + 1}`}`,
    position: idx,
    widths: [400, 800, 1200],
  })),
  featured: Boolean(s.featured),
  createdAt: new Date(Date.now() - (SPECS.length - i) * 86_400_000).toISOString(),
  updatedAt: new Date().toISOString(),
}));

export const SEED_PRICES: DesignPrice[] = SPECS.flatMap((s, i) => {
  const designId = `dsn-${String(i + 1).padStart(3, '0')}`;
  return [
    { designId, tier: 'local' as const, amount: s.etb * 100 },
    { designId, tier: 'international' as const, amount: s.usd * 100 },
  ];
});

/** A couple of designs carry options, to exercise the pricing path. */
export const SEED_OPTIONS: DesignOption[] = [
  {
    id: 'opt-sleeve', designId: 'dsn-007', name: 'Sleeve length', required: true, position: 0,
    choices: [
      { id: 'ch-short', label: 'Short (as photographed)', priceEffectLocal: 0, priceEffectUsd: 0, extraProductionDays: 0, position: 0 },
      { id: 'ch-elbow', label: 'To the elbow', priceEffectLocal: 40000, priceEffectUsd: 800, extraProductionDays: 2, position: 1 },
      { id: 'ch-full', label: 'Full length', priceEffectLocal: 70000, priceEffectUsd: 1500, extraProductionDays: 3, position: 2 },
    ],
  },
  {
    id: 'opt-border', designId: 'dsn-007', name: 'Border colour', required: true, position: 1,
    choices: [
      { id: 'ch-charcoal', label: 'Charcoal (as photographed)', priceEffectLocal: 0, priceEffectUsd: 0, extraProductionDays: 0, position: 0 },
      { id: 'ch-red', label: 'Deep red', priceEffectLocal: 0, priceEffectUsd: 0, extraProductionDays: 0, position: 1 },
      { id: 'ch-gold', label: 'Gold thread', priceEffectLocal: 120000, priceEffectUsd: 2500, extraProductionDays: 5, position: 2 },
    ],
  },
];

/**
 * Uplift covers delivery to each group, which is why an international price
 * differs by destination without any shipping line at checkout.
 * These are placeholders — the owner sets the real numbers.
 */
export const SEED_COUNTRY_GROUPS: CountryGroup[] = [
  {
    id: 'grp-et', name: 'Ethiopia', countries: ['ET'],
    upliftPercent: 0, deliveryDaysMin: 1, deliveryDaysMax: 5, position: 1,
  },
  {
    id: 'grp-na', name: 'USA & Canada', countries: ['US', 'CA'],
    upliftPercent: 0, deliveryDaysMin: 7, deliveryDaysMax: 14, position: 2,
  },
  {
    id: 'grp-eu', name: 'Europe & UK',
    countries: [
      'GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'GR',
      'SE', 'NO', 'DK', 'CH', 'PL', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SK', 'SI',
      'EE', 'LV', 'LT', 'LU', 'MT', 'CY', 'IS',
    ],
    upliftPercent: -3, deliveryDaysMin: 7, deliveryDaysMax: 14, position: 3,
  },
  {
    id: 'grp-me', name: 'Middle East',
    countries: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH', 'IL', 'JO', 'LB'],
    upliftPercent: -5, deliveryDaysMin: 5, deliveryDaysMax: 12, position: 4,
  },
  {
    id: 'grp-oc', name: 'Australia & New Zealand', countries: ['AU', 'NZ'],
    upliftPercent: 12, deliveryDaysMin: 10, deliveryDaysMax: 18, position: 5,
  },
  {
    id: 'grp-rest', name: 'Rest of world', countries: ['*'],
    upliftPercent: 15, deliveryDaysMin: 12, deliveryDaysMax: 25, position: 6,
  },
];

/**
 * Placeholder rates so demo mode works offline. Production refreshes these
 * daily from a rate API; the 2% margin is already applied here.
 */
export const SEED_RATES: ExchangeRate[] = [
  { currency: 'EUR', rateFromUsd: 0.94, marginPercent: 2, fetchedAt: new Date().toISOString() },
  { currency: 'GBP', rateFromUsd: 0.81, marginPercent: 2, fetchedAt: new Date().toISOString() },
  { currency: 'CAD', rateFromUsd: 1.39, marginPercent: 2, fetchedAt: new Date().toISOString() },
  { currency: 'AUD', rateFromUsd: 1.55, marginPercent: 2, fetchedAt: new Date().toISOString() },
  { currency: 'ILS', rateFromUsd: 3.75, marginPercent: 2, fetchedAt: new Date().toISOString() },
];

export const SEED_REVIEWS: Review[] = [
  {
    id: 'rev-1', designId: 'dsn-007', orderId: 'seed', customerId: 'seed',
    authorName: 'Hanna T.', rating: 5,
    body: 'Arrived in Washington in nine days, beautifully packed. The weave is far finer than I expected from the photographs, and the fit was exactly right.',
    photoKeys: [], approved: true,
    createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
  },
  {
    id: 'rev-2', designId: 'dsn-007', orderId: 'seed', customerId: 'seed',
    authorName: 'Selam G.', rating: 5,
    body: 'I wore this for Meskel and three people asked me where it was from. The tailor called to check my shoulder measurement before cutting, which I appreciated.',
    photoKeys: [], approved: true,
    createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  },
  {
    id: 'rev-3', designId: 'dsn-001', orderId: 'seed', customerId: 'seed',
    authorName: 'Marta A.', rating: 5,
    body: 'The measuring guide made it straightforward. Someone messaged me the next day to confirm two numbers and the dress fits perfectly.',
    photoKeys: [], approved: true,
    createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString(),
  },
];

export const SEED_SETTINGS: StoreSettings = {
  storeName: 'Eyob Traditional Store',
  supportEmail: 'orders@example.et',
  supportPhone: '+251 91 234 5678',
  whatsappNumber: '+251912345678',
  shopAddress: 'Bole Road, Addis Ababa, Ethiopia',
  pickupDiscountPercent: 8,
  forexMarginPercent: 2,
  // Placeholder until the Chapa dashboard confirms what can be received.
  chargeCurrencies: ['ETB', 'USD'],
  returnWindowDays: 14,
  customsDisclaimer:
    'Taxes, import duties and customs charges are set by your own country, are not included in the price, and are the responsibility of the buyer.',
};
