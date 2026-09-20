import type {
  Category,
  Order,
  Product,
  ProductPrice,
  PromoCode,
  Review,
  ShippingRate,
  ShippingZone,
  StoreSettings,
} from '../types';

// ---------------------------------------------------------------------------
// Demo catalogue.
//
// Photography is placeholder: these are stock textile and fashion images, NOT
// the shop's own garments. Every one must be replaced before launch — the
// whole proposition is that these are real handmade pieces, and borrowed
// photos would undermine exactly the trust the site is built to create.
//
// Each product below carries plausible measurements and a hand-set price in
// every supported currency, so the demo exercises the real code paths rather
// than a happy-path stub.
// ---------------------------------------------------------------------------

export const SEED_CATEGORIES: Category[] = [
  { id: 'cat-kemis', slug: 'habesha-kemis', name: 'Habesha Kemis', description: 'Handwoven dresses for weddings, holidays and celebration.', position: 1 },
  { id: 'cat-netela', slug: 'netela-shash', name: 'Netela & Shash', description: 'Light shawls and headscarves in fine cotton.', position: 2 },
  { id: 'cat-gabi', slug: 'gabi-shemma', name: 'Gabi & Shemma', description: 'Heavier wraps woven in layers for warmth.', position: 3 },
  { id: 'cat-kuta', slug: 'kuta', name: 'Kuta', description: "Men's wraps in handspun cotton.", position: 4 },
  { id: 'cat-mens', slug: 'mens-traditional', name: "Men's Traditional", description: 'Shirts, trousers and full sets.', position: 5 },
  { id: 'cat-children', slug: 'childrens-wear', name: "Children's Wear", description: 'Smaller pieces woven in the same cloth.', position: 6 },
  { id: 'cat-accessories', slug: 'accessories', name: 'Accessories', description: 'Belts, jewellery and finishing pieces.', position: 7 },
];

const IMG = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=70`;

// Stock photo ids used as stand-ins. Swap for real product photography.
const PHOTOS = [
  'photo-1595777457583-95e059d581b8', 'photo-1583391733956-6c78276477e2',
  'photo-1490481651871-ab68de25d43d', 'photo-1594633312681-425c7b97ccd1',
  'photo-1539109136881-3be0616acf4b', 'photo-1551232864-3f0890e580d9',
  'photo-1445205170230-053b83016050', 'photo-1558769132-cb1aea458c5e',
  'photo-1469334031218-e382a71b716b', 'photo-1483985988355-763728e1935b',
  'photo-1487222477894-8943e31ef7b2', 'photo-1525507119028-ed4c629a60a3',
  'photo-1441984904996-e0b6ba687e04', 'photo-1560243563-062bfc001d68',
  'photo-1591369822096-ffd140ec948f', 'photo-1567401893414-76b7b1e5a7a5',
  'photo-1503342217505-b0a15ec3261c', 'photo-1512436991641-6745cdb1723f',
  'photo-1529903384028-929ae5dccdf1', 'photo-1534126511673-b6899657816a',
];

interface SeedSpec {
  name: string;
  categoryId: string;
  kind: 'one_of_a_kind' | 'made_to_order';
  gender: Product['gender'];
  fabric: string;
  colour: string;
  tibeb: string;
  occasion: string[];
  etb: number;
  usd: number;
  bust?: number;
  waist?: number;
  hips?: number;
  sts?: number;
  stw?: number;
  arm?: number;
  len?: number;
  lead?: number;
  featured?: boolean;
  desc: string;
}

const SPECS: SeedSpec[] = [
  { name: 'Aster Wedding Kemis', categoryId: 'cat-kemis', kind: 'made_to_order', gender: 'women', fabric: 'Handspun cotton, fine shemma weave', colour: 'Ivory with crimson border', tibeb: 'Broad crimson and gold tibeb', occasion: ['wedding', 'holiday'], etb: 1850000, usd: 32000, bust: 96, waist: 78, hips: 102, sts: 38, stw: 42, arm: 56, len: 148, lead: 21, featured: true, desc: 'A full-length wedding kemis woven over three weeks on a traditional pit loom. The tibeb border runs the full hem and is repeated at the cuffs and neckline. Woven to your measurements.' },
  { name: 'Meskel Celebration Kemis', categoryId: 'cat-kemis', kind: 'one_of_a_kind', gender: 'women', fabric: 'Handspun cotton, medium weight', colour: 'Natural with green and gold border', tibeb: 'Narrow geometric tibeb', occasion: ['holiday', 'celebration'], etb: 980000, usd: 17500, bust: 98, waist: 82, hips: 104, sts: 39, stw: 43, arm: 55, len: 145, featured: true, desc: 'Woven for the Meskel season, with a narrow repeating tibeb in forest green and ochre. A single piece — once it is gone there is not another exactly like it.' },
  { name: 'Lalibela Kemis', categoryId: 'cat-kemis', kind: 'one_of_a_kind', gender: 'women', fabric: 'Handspun cotton, light shemma', colour: 'Undyed cream', tibeb: 'Deep indigo border', occasion: ['everyday', 'church'], etb: 720000, usd: 13000, bust: 92, waist: 74, hips: 98, sts: 37, stw: 41, arm: 54, len: 142, desc: 'A lighter everyday kemis in undyed cotton, finished with a restrained indigo border. Comfortable in heat and softens with each wash.' },
  { name: 'Axum Bridal Kemis', categoryId: 'cat-kemis', kind: 'made_to_order', gender: 'women', fabric: 'Fine handspun cotton with silk thread', colour: 'Ivory with gold', tibeb: 'Wide gold tibeb, hand-threaded', occasion: ['wedding'], etb: 2650000, usd: 46000, bust: 94, waist: 76, hips: 100, sts: 38, stw: 42, arm: 57, len: 150, lead: 28, featured: true, desc: 'Our most elaborate bridal piece. The gold tibeb is threaded by hand and takes a weaver close to four weeks. Woven entirely to your measurements.' },
  { name: 'Gondar Kemis', categoryId: 'cat-kemis', kind: 'one_of_a_kind', gender: 'women', fabric: 'Handspun cotton, medium weight', colour: 'Cream with burgundy', tibeb: 'Repeating diamond tibeb', occasion: ['celebration', 'holiday'], etb: 1150000, usd: 20000, bust: 102, waist: 86, hips: 108, sts: 40, stw: 44, arm: 56, len: 147, desc: 'The diamond tibeb on this piece is a Gondar pattern, worked in burgundy against undyed cotton.' },
  { name: 'Classic Netela', categoryId: 'cat-netela', kind: 'one_of_a_kind', gender: 'women', fabric: 'Fine cotton gauze', colour: 'White with red border', tibeb: 'Thin red tibeb', occasion: ['church', 'everyday'], etb: 185000, usd: 3500, len: 200, featured: true, desc: 'The everyday netela — light enough to see through, worn over the shoulders or drawn over the head for church.' },
  { name: 'Wedding Netela', categoryId: 'cat-netela', kind: 'one_of_a_kind', gender: 'women', fabric: 'Fine cotton gauze with gold thread', colour: 'White with gold', tibeb: 'Gold-threaded border', occasion: ['wedding'], etb: 420000, usd: 7500, len: 220, desc: 'A heavier-bordered netela for weddings, with gold thread worked through the tibeb.' },
  { name: 'Shash Headscarf', categoryId: 'cat-netela', kind: 'one_of_a_kind', gender: 'women', fabric: 'Fine cotton', colour: 'Cream with black border', tibeb: 'Simple black edging', occasion: ['everyday', 'church'], etb: 95000, usd: 1800, len: 150, desc: 'A simple cotton shash, worn as a headscarf. Lightweight and easy to pack.' },
  { name: 'Green Border Netela', categoryId: 'cat-netela', kind: 'one_of_a_kind', gender: 'women', fabric: 'Fine cotton gauze', colour: 'Cream with forest green', tibeb: 'Wide green tibeb', occasion: ['holiday'], etb: 240000, usd: 4500, len: 210, desc: 'A netela with an unusually wide green border — a bolder piece for holidays.' },
  { name: 'Traditional Gabi', categoryId: 'cat-gabi', kind: 'one_of_a_kind', gender: 'unisex', fabric: 'Four-layer handspun cotton', colour: 'Natural undyed', tibeb: 'Plain, undyed', occasion: ['everyday'], etb: 480000, usd: 8500, len: 250, featured: true, desc: 'A four-layer gabi, heavy and warm. Used as a wrap in cool highland evenings and as a blanket. Undyed and unbleached.' },
  { name: 'Bordered Gabi', categoryId: 'cat-gabi', kind: 'one_of_a_kind', gender: 'unisex', fabric: 'Four-layer handspun cotton', colour: 'Natural with red border', tibeb: 'Red and black tibeb', occasion: ['celebration'], etb: 620000, usd: 11000, len: 250, desc: 'The same heavy four-layer weave, finished with a red and black tibeb along both long edges.' },
  { name: 'Fine Shemma Wrap', categoryId: 'cat-gabi', kind: 'one_of_a_kind', gender: 'unisex', fabric: 'Two-layer shemma', colour: 'Natural', tibeb: 'Narrow indigo edge', occasion: ['everyday'], etb: 320000, usd: 5800, len: 230, desc: 'Lighter than a gabi and easier to wear indoors. Two layers rather than four.' },
  { name: "Men's Kuta", categoryId: 'cat-kuta', kind: 'one_of_a_kind', gender: 'men', fabric: 'Handspun cotton, two-layer', colour: 'Natural undyed', tibeb: 'Narrow black border', occasion: ['church', 'everyday'], etb: 280000, usd: 5200, len: 240, desc: 'A two-layer kuta worn draped over the shoulder. The standard wrap for men at church and at ceremonies.' },
  { name: 'Bordered Kuta', categoryId: 'cat-kuta', kind: 'one_of_a_kind', gender: 'men', fabric: 'Handspun cotton, two-layer', colour: 'Cream with gold border', tibeb: 'Gold tibeb', occasion: ['wedding', 'celebration'], etb: 450000, usd: 8000, len: 240, desc: 'A dressier kuta with a gold tibeb, for weddings and formal occasions.' },
  { name: "Men's Traditional Shirt", categoryId: 'cat-mens', kind: 'made_to_order', gender: 'men', fabric: 'Handspun cotton', colour: 'Cream', tibeb: 'Embroidered collar and cuffs', occasion: ['celebration', 'everyday'], etb: 560000, usd: 9800, bust: 104, waist: 92, sts: 46, arm: 62, len: 78, lead: 14, desc: 'A collarless traditional shirt with hand-embroidered detail at the neck and cuffs. Woven and cut to your measurements.' },
  { name: "Men's Full Set", categoryId: 'cat-mens', kind: 'made_to_order', gender: 'men', fabric: 'Handspun cotton', colour: 'Cream with burgundy trim', tibeb: 'Burgundy embroidery', occasion: ['wedding', 'celebration'], etb: 1250000, usd: 22000, bust: 106, waist: 94, sts: 47, arm: 63, len: 80, lead: 21, featured: true, desc: 'Shirt and trousers woven as a matching set, with burgundy embroidery at collar, cuffs and hem.' },
  { name: "Boy's Kemis Set", categoryId: 'cat-children', kind: 'one_of_a_kind', gender: 'children', fabric: 'Soft handspun cotton', colour: 'Cream with green trim', tibeb: 'Narrow green tibeb', occasion: ['holiday'], etb: 320000, usd: 5800, bust: 66, waist: 60, sts: 30, arm: 40, len: 92, desc: 'A small set in the same cloth as the adult pieces, softened for children.' },
  { name: "Girl's Holiday Kemis", categoryId: 'cat-children', kind: 'one_of_a_kind', gender: 'children', fabric: 'Soft handspun cotton', colour: 'Cream with red tibeb', tibeb: 'Red and gold tibeb', occasion: ['holiday', 'wedding'], etb: 380000, usd: 6800, bust: 68, waist: 62, hips: 72, sts: 31, stw: 30, arm: 42, len: 98, desc: "A child's kemis with a full red and gold border, made for holidays." },
  { name: 'Woven Belt', categoryId: 'cat-accessories', kind: 'one_of_a_kind', gender: 'unisex', fabric: 'Handwoven cotton', colour: 'Red, gold and green', tibeb: 'Full tibeb weave', occasion: ['celebration'], etb: 68000, usd: 1400, len: 180, desc: 'A narrow woven belt in full tibeb pattern, worn at the waist over a kemis.' },
  { name: 'Silver Cross Pendant', categoryId: 'cat-accessories', kind: 'one_of_a_kind', gender: 'unisex', fabric: 'Silver on cotton cord', colour: 'Silver', tibeb: 'n/a', occasion: ['church', 'everyday'], etb: 145000, usd: 2800, desc: 'A traditional Ethiopian cross in silver, hung on a handwoven cotton cord.' },
];

// International prices are set above the local ETB price by design; each is a
// hand-picked round number rather than a conversion.
const INTL_MULTIPLIERS: Record<string, number> = {
  EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.52,
  AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.307, OMR: 0.385, BHD: 0.377,
};

/** Round to a price that reads like a price: 145, not 137.42. */
function tidy(amount: number, decimals: number): number {
  const major = amount / 10 ** decimals;
  if (major >= 100) return Math.round(major / 5) * 5 * 10 ** decimals;
  if (major >= 20) return Math.round(major) * 10 ** decimals;
  return Math.round(major * 2) / 2 * 10 ** decimals;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const SEED_PRODUCTS: Product[] = SPECS.map((s, i) => ({
  id: `prod-${String(i + 1).padStart(3, '0')}`,
  slug: slugify(s.name),
  kind: s.kind,
  status: 'available',
  name: s.name,
  categoryId: s.categoryId,
  description: s.desc,
  careInstructions:
    'Hand wash cold with mild soap. Do not bleach. Dry flat in shade — direct sun will fade the tibeb. Warm iron on the reverse.',
  fabric: s.fabric,
  colour: s.colour,
  tibebPattern: s.tibeb,
  occasion: s.occasion,
  gender: s.gender,
  measurements: {
    bust: s.bust, waist: s.waist, hips: s.hips,
    shoulderToShoulder: s.sts, shoulderToWaist: s.stw,
    armLength: s.arm, totalLength: s.len,
  },
  nominalSize: s.bust
    ? s.bust < 94 ? 'fits approx. S' : s.bust < 102 ? 'fits approx. M' : s.bust < 112 ? 'fits approx. L' : 'fits approx. XL'
    : 'One size',
  leadTimeDays: s.lead,
  images: [
    { id: `img-${i}-0`, key: IMG(PHOTOS[i % PHOTOS.length]), alt: `${s.name} — full view`, position: 0, widths: [400, 800, 1200] },
    { id: `img-${i}-1`, key: IMG(PHOTOS[(i + 7) % PHOTOS.length]), alt: `${s.name} — detail of the ${s.tibeb}`, position: 1, widths: [400, 800, 1200] },
    { id: `img-${i}-2`, key: IMG(PHOTOS[(i + 13) % PHOTOS.length]), alt: `${s.name} — worn`, position: 2, widths: [400, 800, 1200] },
  ],
  featured: Boolean(s.featured),
  createdAt: new Date(Date.now() - (SPECS.length - i) * 86_400_000).toISOString(),
}));

export const SEED_PRICES: ProductPrice[] = SPECS.flatMap((s, i) => {
  const productId = `prod-${String(i + 1).padStart(3, '0')}`;
  const rows: ProductPrice[] = [
    { productId, currency: 'ETB', tier: 'local', amount: s.etb },
    // Local customers paying in ETB get the local price; an ETB price also
    // exists at the international tier for completeness, set higher.
    { productId, currency: 'ETB', tier: 'international', amount: tidy(s.etb * 1.25, 2) },
    { productId, currency: 'USD', tier: 'international', amount: s.usd },
  ];
  for (const [code, mult] of Object.entries(INTL_MULTIPLIERS)) {
    const decimals = ['KWD', 'OMR', 'BHD'].includes(code) ? 3 : 2;
    const raw = (s.usd / 100) * mult * 10 ** decimals;
    rows.push({
      productId,
      currency: code as ProductPrice['currency'],
      tier: 'international',
      amount: tidy(raw, decimals),
    });
  }
  return rows;
});

export const SEED_ZONES: ShippingZone[] = [
  { id: 'zone-addis', name: 'Addis Ababa', countries: ['ET-AA'], position: 1 },
  { id: 'zone-ethiopia', name: 'Rest of Ethiopia', countries: ['ET'], position: 2 },
  { id: 'zone-namerica', name: 'USA & Canada', countries: ['US', 'CA'], position: 3 },
  { id: 'zone-europe', name: 'Europe & UK', countries: ['GB', 'IE', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'GR', 'SE', 'NO', 'DK', 'CH', 'PL', 'CZ'], position: 4 },
  { id: 'zone-mideast', name: 'Middle East', countries: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH', 'JO', 'LB'], position: 5 },
  { id: 'zone-oceania', name: 'Australia & New Zealand', countries: ['AU', 'NZ'], position: 6 },
  { id: 'zone-rest', name: 'Rest of world', countries: ['*'], position: 7 },
];

// Placeholder rates. The owner edits these in the admin; they are not quotes
// from any carrier.
export const SEED_RATES: ShippingRate[] = [
  { id: 'rate-addis', zoneId: 'zone-addis', name: 'Addis delivery', currency: 'ETB', baseAmount: 15000, perExtraItemAmount: 5000, estimatedDaysMin: 1, estimatedDaysMax: 2 },
  { id: 'rate-eth', zoneId: 'zone-ethiopia', name: 'Ethiopian Postal Service', currency: 'ETB', baseAmount: 30000, perExtraItemAmount: 8000, estimatedDaysMin: 3, estimatedDaysMax: 7 },
  { id: 'rate-na', zoneId: 'zone-namerica', name: 'International tracked', currency: 'USD', baseAmount: 3500, perExtraItemAmount: 1000, estimatedDaysMin: 7, estimatedDaysMax: 14 },
  { id: 'rate-eu', zoneId: 'zone-europe', name: 'International tracked', currency: 'EUR', baseAmount: 3000, perExtraItemAmount: 900, estimatedDaysMin: 7, estimatedDaysMax: 14 },
  { id: 'rate-me', zoneId: 'zone-mideast', name: 'International tracked', currency: 'AED', baseAmount: 9000, perExtraItemAmount: 2500, estimatedDaysMin: 5, estimatedDaysMax: 10 },
  { id: 'rate-oc', zoneId: 'zone-oceania', name: 'International tracked', currency: 'AUD', baseAmount: 5500, perExtraItemAmount: 1500, estimatedDaysMin: 10, estimatedDaysMax: 18 },
  { id: 'rate-rest', zoneId: 'zone-rest', name: 'International tracked', currency: 'USD', baseAmount: 4500, perExtraItemAmount: 1200, estimatedDaysMin: 10, estimatedDaysMax: 21 },
];

export const SEED_PROMOS: PromoCode[] = [
  { id: 'promo-1', code: 'WELCOME10', kind: 'percentage', value: 10, minOrderAmount: 0, timesRedeemed: 4, active: true },
  { id: 'promo-2', code: 'MESKEL25', kind: 'percentage', value: 25, expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), maxRedemptions: 50, timesRedeemed: 12, active: true },
];

export const SEED_REVIEWS: Review[] = [
  { id: 'rev-1', productId: 'prod-002', authorName: 'Hanna T.', rating: 5, body: 'Arrived in Washington in nine days, beautifully packed. The weave is far finer than I expected from the photographs.', approved: true, createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString() },
  { id: 'rev-2', productId: 'prod-002', authorName: 'Selam G.', rating: 5, body: 'I wore this for Meskel and three people asked me where it was from.', approved: true, createdAt: new Date(Date.now() - 30 * 86_400_000).toISOString() },
  { id: 'rev-3', productId: 'prod-006', authorName: 'Marta A.', rating: 4, body: 'Lovely and light. Slightly shorter than I imagined but the measurements were listed correctly — my mistake, not theirs.', approved: true, createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
  { id: 'rev-4', productId: 'prod-010', authorName: 'Dawit M.', rating: 5, body: 'Heavy and warm, exactly like the gabi my grandmother had. Worth every dollar.', approved: true, createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
];

export const SEED_SETTINGS: StoreSettings = {
  storeName: 'Eyob Traditional Store',
  supportEmail: 'orders@eyobtraditional.et',
  supportPhone: '+251 91 234 5678',
  whatsappNumber: '+251912345678',
  defaultCurrency: 'USD',
  enabledCurrencies: ['ETB', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD'],
  returnWindowDays: 14,
  customsDisclaimer:
    'Import duties and customs charges are set by your own country and are not included in the price. They are the responsibility of the buyer.',
};

export const SEED_ORDERS: Order[] = [];
