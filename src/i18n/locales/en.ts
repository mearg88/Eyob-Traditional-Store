// ---------------------------------------------------------------------------
// English. The source of truth for every other language.
//
// Rules for anything added here:
//   - Write for a customer spending $250 on a garment they have only seen in
//     photographs. Warm, plain, never chatty.
//   - Errors say what to do next, not what went wrong internally.
//   - Never concatenate sentences in code; use {placeholders} so translators
//     can reorder them.
// ---------------------------------------------------------------------------

export default {
  common: {
    loading: 'Loading…',
    tryAgain: 'Try again',
    back: 'Back',
    save: 'Save',
    cancel: 'Cancel',
    remove: 'Remove',
    close: 'Close',
    required: 'Required',
    optional: 'Optional',
    search: 'Search',
    somethingWentWrong: 'Something went wrong on our side',
    somethingWentWrongBody:
      'This page could not be loaded. It is not something you did. Try again in a moment, or go back to the collection.',
  },

  nav: {
    collection: 'Collection',
    all: 'All designs',
    sizeGuide: 'How to measure',
    trackOrder: 'Track an order',
    account: 'My account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    cart: 'Basket',
    menu: 'Menu',
  },

  home: {
    eyebrow: 'Made to measure in Addis Ababa',
    headline: 'Woven for you,',
    headlineAccent: 'and for no one else.',
    intro:
      'Every garment is cut to your own measurements by hand. Choose a design, send us your measurements, and we make it.',
    browse: 'See the collection',
    howItWorks: 'How it works',
    trustSecure: 'Secure payment',
    trustWorldwide: 'Delivered worldwide',
    trustMeasured: 'Made to your measurements',
    trustIncluded: 'Delivery included in the price',
  },

  design: {
    madeToOrder: 'Made to order',
    readyIn: 'Ready in about {weeks} weeks',
    readyInDays: 'Ready in about {days} days',
    deliveryIncluded: 'Delivery included',
    taxNote: 'Taxes and import duties are not included and are the buyer’s responsibility.',
    chooseOptions: 'Choose your options',
    specialRequest: 'Anything you would like changed?',
    specialRequestHint:
      'Tell us here and we will discuss it when we check your measurements. There is no extra charge for asking.',
    addToBasket: 'Add to basket',
    inBasket: 'In your basket',
    fabric: 'Fabric',
    colour: 'Colour',
    embroidery: 'Embroidery',
    occasion: 'Occasion',
    care: 'Care instructions',
    enquire: 'Ask about this design',
  },

  measure: {
    title: 'Your measurements',
    subtitle:
      'Take these with a soft tape, with someone helping you. The weaver adds the ease, so do not add any yourself.',
    unitCm: 'Centimetres',
    unitIn: 'Inches',
    saved: 'Saved measurements',
    useSaved: 'Use these',
    newSet: 'Take new measurements',
    nameThisSet: 'Name this set',
    nameHint: 'So you recognise it next time — for example, “Mine” or “For Selam”.',
    helperNeeded: 'You will need someone to help with this one',
    commonMistake: 'Common mistake',
    next: 'Next measurement',
    finish: 'Done',
    cannotMeasure: 'I cannot measure right now',
    cannotMeasureBody:
      'Send us your height and the dress size you usually wear, and we will work from that and check with you before anything is cut.',
    height: 'Your height',
    usualSize: 'The size you usually wear',
    verifyNote:
      'One of our tailors checks every set of measurements before we cut anything. If something looks wrong, we will message you.',
  },

  cart: {
    title: 'Your basket',
    empty: 'Your basket is empty',
    emptyBody: 'Nothing chosen yet. Every piece is made to your measurements once you order.',
    browse: 'Browse the collection',
    subtotal: 'Subtotal',
    checkout: 'Continue to checkout',
    keepLooking: 'Keep looking',
    measurementsNeeded: 'Measurements needed',
    addMeasurements: 'Add your measurements',
  },

  checkout: {
    title: 'Checkout',
    delivery: 'Where should it go?',
    deliverToAddress: 'Deliver to my address',
    collectFromShop: 'Collect from the shop',
    collectSaving: 'Save {amount} by collecting',
    collectAddress: 'You will collect from our shop in Addis Ababa. We will message you when it is ready.',
    email: 'Email',
    emailHint: 'We send your order confirmation and updates here.',
    fullName: 'Full name',
    phone: 'Phone number',
    phoneHint:
      'Our tailor may message or call you about your measurements, so please give a number that reaches you.',
    address: 'Address',
    city: 'City',
    country: 'Country',
    postcode: 'Postcode',
    readyBy: 'Ready by about {date}',
    priceChanged: 'Prices have been updated for delivery to {country}.',
    priceChangedLocal: 'Local pricing now applies.',
    priceChangedIntl: 'International pricing applies to orders delivered outside Ethiopia.',
    payNow: 'Pay securely',
    paying: 'Please wait…',
    securedBy: 'Payment is handled by Chapa. We never see your card.',
    chargeCurrencyNote:
      'You will be charged in {chargeCurrency}. The {displayCurrency} price shown is a guide, and your bank sets the final rate.',
  },

  order: {
    reference: 'Order reference',
    placed: 'Order placed',
    thankYou: 'Thank you — we have your order',
    thankYouBody: 'Our tailor will check your measurements and be in touch if anything needs confirming.',
    statusPendingPayment: 'Waiting for payment',
    statusPaid: 'Payment received',
    statusUnderReview: 'Checking your measurements',
    statusAwaitingConfirmation: 'Waiting for you to confirm',
    statusVerified: 'Measurements confirmed',
    statusInProduction: 'Being made',
    statusReady: 'Ready',
    statusDispatched: 'On its way',
    statusDelivered: 'Delivered',
    statusCancelled: 'Cancelled',
    statusRefunded: 'Refunded',
    timeline: 'Progress',
    confirmMeasurements: 'Please confirm your measurements',
    confirmMeasurementsBody:
      'Our tailor has suggested changes to the measurements you sent. Nothing is cut until you approve them.',
    confirmChanges: 'These are correct — go ahead',
    queryChanges: 'I am not sure — contact me',
    whatChanged: 'What changed',
    yourValue: 'You sent',
    ourValue: 'Our tailor suggests',
  },

  account: {
    title: 'My account',
    orders: 'My orders',
    measurements: 'My measurements',
    details: 'My details',
    noOrders: 'You have not ordered anything yet',
    signInTitle: 'Sign in',
    signUpTitle: 'Create an account',
    signInPrompt: 'Already have an account?',
    signUpPrompt: 'New here?',
    password: 'Password',
    passwordHint: 'At least 8 characters.',
    whyAccount:
      'An account lets you follow your order, approve your measurements, and reuse them next time.',
  },

  errors: {
    signInFailed: 'That email and password did not match. Please try again.',
    emailInUse: 'There is already an account with that email. Try signing in instead.',
    networkLost:
      'We lost connection. Nothing has been charged. Please check your connection and try again.',
    paymentLost:
      'We lost connection to the payment provider. If money has left your account, quote order {reference} and we will sort it out immediately. Please do not pay twice.',
    notFound: 'We could not find that',
    designGone: 'That design is no longer available',
    measurementsIncomplete: 'Some measurements are still missing',
  },

  footer: {
    tagline:
      'Handwoven Ethiopian clothing, made to measure in Addis Ababa and delivered worldwide.',
    shop: 'Shop',
    help: 'Help',
    visitUs: 'Visit us',
    customsDisclaimer:
      'Taxes, import duties and customs charges are set by your own country, are not included in the price, and are the responsibility of the buyer.',
  },

  admin: {
    signIn: 'Sign in',
    dashboard: 'Dashboard',
    orders: 'Orders',
    designs: 'Designs',
    verification: 'Measurements',
    customers: 'Customers',
    settings: 'Settings',
    today: 'Today',
    nothingNeedsAttention: 'Nothing needs your attention right now.',
    needsAttention: '{count} orders need attention.',
    addDesign: 'Add a design',
    noAccess: 'That account does not have access to the admin area.',
  },
} as const;
