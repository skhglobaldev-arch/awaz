const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const { HttpsError, onCall, onRequest } = require('firebase-functions/v2/https');
const Stripe = require('stripe');

const adminApp = initializeApp();
const DATABASE_ID = 'ai-studio-4865eff7-c467-4382-bd96-9d2d6f0db131';
const REGION = 'europe-west2';
const db = getFirestore(adminApp, DATABASE_ID);

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

const UNIT_PRICE_CENTS = {
  retail: 4,
  wholesale: 2,
};
const MINIMUM_QUANTITY = {
  retail: 50,
  wholesale: 500,
};
const STRIPE_LOCALES = {
  fa: 'auto',
  en: 'en',
  de: 'de',
  fr: 'fr',
  ar: 'auto',
};
const MOCKUP_PRODUCT_NAMES = {
  tshirt: { fa: 'تیشرت پنبه‌ای', en: 'Cotton T-Shirt', de: 'Baumwoll-T-Shirt', fr: 'T-shirt en coton', ar: 'تيشيرت قطني' },
  mug: { fa: 'ماگ سرامیکی', en: 'Ceramic Mug', de: 'Keramikbecher', fr: 'Mug en céramique', ar: 'كوب سيراميك' },
  hoodie: { fa: 'هودی دورس', en: 'Fleece Hoodie', de: 'Fleece-Hoodie', fr: 'Sweat à capuche en polaire', ar: 'هودي صوف' },
};
const PRINT_MOCKUP_NAMES = {
  fa: 'چاپ موکاپ',
  en: 'Printed mockup',
  de: 'Bedrucktes Mockup',
  fr: 'Maquette imprimée',
  ar: 'طباعة النموذج',
};
const EDITOR_PRODUCT_NAMES = {
  restaurant_menu: { fa: 'رستوران - منو', en: 'Restaurant - Menu', de: 'Restaurant - Menü', fr: 'Restaurant - Menu', ar: 'مطعم - قائمة طعام' },
  restaurant_card: { fa: 'رستوران - کارت ویزیت', en: 'Restaurant - Business Card', de: 'Restaurant - Visitenkarte', fr: 'Restaurant - Carte de visite', ar: 'مطعم - بطاقة عمل' },
  restaurant_brochure: { fa: 'رستوران - بروشور', en: 'Restaurant - Brochure', de: 'Restaurant - Broschüre', fr: 'Restaurant - Brochure', ar: 'مطعم - كتيب' },
  restaurant_logo: { fa: 'رستوران - لوگو', en: 'Restaurant - Logo', de: 'Restaurant - Logo', fr: 'Restaurant - Logo', ar: 'مطعم - شعار' },
  cafe_menu: { fa: 'کافی شاپ - منو', en: 'Coffee Shop - Menu', de: 'Café - Menü', fr: 'Café - Menu', ar: 'مقهى - قائمة طعام' },
  cafe_card: { fa: 'کافی شاپ - کارت ویزیت', en: 'Coffee Shop - Business Card', de: 'Café - Visitenkarte', fr: 'Café - Carte de visite', ar: 'مقهى - بطاقة عمل' },
  cafe_brochure: { fa: 'کافی شاپ - بروشور', en: 'Coffee Shop - Brochure', de: 'Café - Broschüre', fr: 'Café - Brochure', ar: 'مقهى - كتيب' },
  cafe_logo: { fa: 'کافی شاپ - لوگو', en: 'Coffee Shop - Logo', de: 'Café - Logo', fr: 'Café - Logo', ar: 'مقهى - شعار' },
  fastfood_menu: { fa: 'فست فود - منو', en: 'Fast Food - Menu', de: 'Fast Food - Menü', fr: 'Fast Food - Menu', ar: 'وجبات سريعة - قائمة طعام' },
  fastfood_card: { fa: 'فست فود - کارت ویزیت', en: 'Fast Food - Business Card', de: 'Fast Food - Visitenkarte', fr: 'Fast Food - Carte de visite', ar: 'وجبات سريعة - بطاقة عمل' },
  fastfood_brochure: { fa: 'فست فود - بروشور', en: 'Fast Food - Brochure', de: 'Fast Food - Broschüre', fr: 'Fast Food - Brochure', ar: 'وجبات سريعة - كتيب' },
  fastfood_logo: { fa: 'فست فود - لوگو', en: 'Fast Food - Logo', de: 'Fast Food - Logo', fr: 'Fast Food - Logo', ar: 'وجبات سريعة - شعار' },
  medical_logo: { fa: 'خدمات پزشکی - لوگو', en: 'Medical Services - Logo', de: 'Medizinische Dienstleistungen - Logo', fr: 'Services médicaux - Logo', ar: 'خدمات طبية - شعار' },
  medical_card: { fa: 'خدمات پزشکی - کارت ویزیت', en: 'Medical Services - Business Card', de: 'Medizinische Dienstleistungen - Visitenkarte', fr: 'Services médicaux - Carte de visite', ar: 'خدمات طبية - بطاقة عمل' },
  medical_brochure: { fa: 'خدمات پزشکی - بروشور', en: 'Medical Services - Brochure', de: 'Medizinische Dienstleistungen - Broschüre', fr: 'Services médicaux - Brochure', ar: 'خدمات طبية - كتيب' },
  corporate_logo: { fa: 'خدمات شرکتی - لوگو', en: 'Corporate Services - Logo', de: 'Unternehmensdienstleistungen - Logo', fr: 'Services aux entreprises - Logo', ar: 'خدمات الشركات - شعار' },
  corporate_card: { fa: 'خدمات شرکتی - کارت ویزیت', en: 'Corporate Services - Business Card', de: 'Unternehmensdienstleistungen - Visitenkarte', fr: 'Services aux entreprises - Carte de visite', ar: 'خدمات الشركات - بطاقة عمل' },
  corporate_brochure: { fa: 'خدمات شرکتی - بروشور', en: 'Corporate Services - Brochure', de: 'Unternehmensdienstleistungen - Broschüre', fr: 'Services aux entreprises - Brochure', ar: 'خدمات الشركات - كتيب' },
};
const ALLOWED_RETURN_ORIGINS = new Set([
  'https://awaz-f518e.web.app',
  'https://awaz-f518e.firebaseapp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function text(value, maxLength = 240) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function customerCodeFromUid(uid) {
  return `AWZ-${uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;
}

function checkoutLanguage(value) {
  return Object.prototype.hasOwnProperty.call(STRIPE_LOCALES, value) ? value : 'en';
}

function localizedProductName(input, source, language) {
  const productKey = source === 'mockup' ? text(input.productId, 80) : text(input.productId, 120);
  const knownProduct = source === 'mockup' ? MOCKUP_PRODUCT_NAMES[productKey] : EDITOR_PRODUCT_NAMES[productKey];
  return knownProduct && knownProduct[language]
    ? knownProduct[language]
    : text(input.productName || input.templateName, 120) || 'Print order';
}

function safeReturnOrigin(value) {
  const origin = text(value, 120).replace(/\/+$/, '');
  if (!ALLOWED_RETURN_ORIGINS.has(origin)) {
    throw new HttpsError('invalid-argument', 'This checkout return URL is not allowed.');
  }
  return origin;
}

function safeNumber(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function safeMockup(input) {
  if (!input || typeof input !== 'object') return null;
  return {
    productId: text(input.productId, 80) || null,
    productName: text(input.productName, 120) || null,
    productCategory: text(input.productCategory, 120) || null,
    productImage: text(input.productImage, 500) || null,
    hasLogo: Boolean(input.hasLogo),
    textLayer: input.textLayer ? {
      text: text(input.textLayer.text, 240),
      x: safeNumber(input.textLayer.x),
      y: safeNumber(input.textLayer.y),
    } : null,
    settings: input.settings ? {
      scale: safeNumber(input.settings.scale, 1),
      x: safeNumber(input.settings.x),
      y: safeNumber(input.settings.y),
      rotate: safeNumber(input.settings.rotate),
      opacity: safeNumber(input.settings.opacity, 1),
    } : null,
  };
}

function stripeClient() {
  return new Stripe(stripeSecretKey.value());
}

async function markCheckoutPaid(session) {
  const orderId = session.metadata && session.metadata.orderId;
  if (!orderId || session.payment_status === 'unpaid') return false;

  const draftRef = db.collection('checkoutIntents').doc(orderId);
  const orderRef = db.collection('orders').doc(orderId);
  let orderRecorded = false;
  await db.runTransaction(async (transaction) => {
    const [draftSnapshot, orderSnapshot] = await Promise.all([
      transaction.get(draftRef),
      transaction.get(orderRef),
    ]);
    if (orderSnapshot.exists && orderSnapshot.data().paymentStatus === 'paid') {
      orderRecorded = true;
      return;
    }
    if (!draftSnapshot.exists) {
      logger.warn('Paid Stripe Checkout Session did not match an intent.', { orderId, sessionId: session.id });
      return;
    }

    const billing = session.customer_details && session.customer_details.address;
    const draft = draftSnapshot.data();
    const paidOrder = {
      ...draft,
      status: 'paid',
      paymentStatus: 'paid',
      paymentMethod: 'stripe',
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
      amountTotalCents: session.amount_total || draft.amountTotalCents,
      totalPrice: (session.amount_total || draft.amountTotalCents || 0) / 100,
      currency: (session.currency || 'eur').toUpperCase(),
      stripeCustomerEmail: session.customer_details && session.customer_details.email || null,
      billingAddress: billing ? {
        line1: billing.line1 || null,
        line2: billing.line2 || null,
        city: billing.city || null,
        postalCode: billing.postal_code || null,
        country: billing.country || null,
      } : null,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    transaction.set(orderRef, paidOrder, { merge: true });
    transaction.update(draftRef, {
      paymentStatus: 'paid',
      stripeCheckoutSessionId: session.id,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    orderRecorded = true;
  });
  return orderRecorded;
}

async function markCheckoutFailed(session) {
  const orderId = session.metadata && session.metadata.orderId;
  if (!orderId) return;
  const orderRef = db.collection('checkoutIntents').doc(orderId);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists || snapshot.data().paymentStatus === 'paid') return;
    transaction.update(orderRef, {
      paymentStatus: 'failed',
      status: 'cancelled',
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

exports.createCheckoutSession = onCall({ region: REGION, secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before starting checkout.');
  }

  const input = request.data || {};
  const orderType = input.orderType === 'wholesale' ? 'wholesale' : 'retail';
  const quantity = Math.floor(safeNumber(input.quantity));
  if (quantity < MINIMUM_QUANTITY[orderType] || quantity > 100000) {
    throw new HttpsError('invalid-argument', 'The order quantity is not valid.');
  }

  const fullName = text(input.fullName, 120);
  const phone = text(input.phone, 50);
  const address = text(input.address, 300);
  const city = text(input.city, 100);
  const postalCode = text(input.postalCode, 30);
  const country = text(input.country, 100);
  if (!fullName || !phone || !address || !city || !postalCode || !country) {
    throw new HttpsError('invalid-argument', 'Delivery name and address are required.');
  }

  const returnOrigin = safeReturnOrigin(input.returnUrl);
  const uid = request.auth.uid;
  const userEmail = text(request.auth.token.email, 200).toLowerCase() || null;
  const customerCode = customerCodeFromUid(uid);
  const language = checkoutLanguage(input.language);
  const unitPriceCents = UNIT_PRICE_CENTS[orderType];
  const amountTotalCents = unitPriceCents * quantity;
  const source = input.source === 'mockup' ? 'mockup' : 'editor';
  const productName = localizedProductName(input, source, language);
  const itemName = source === 'mockup' ? `${PRINT_MOCKUP_NAMES[language]} - ${productName}` : productName;
  const mockup = source === 'mockup' ? safeMockup(input.mockup) : null;
  if (mockup) mockup.productName = productName;
  const checkoutIntentRef = db.collection('checkoutIntents').doc();
  const orderNumber = `AWZ-${checkoutIntentRef.id.slice(0, 8).toUpperCase()}`;

  await db.collection('users').doc(uid).set({
    uid,
    email: userEmail,
    displayName: text(request.auth.token.name, 120) || fullName,
    customerCode,
    language,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await checkoutIntentRef.set({
    orderNumber,
    userId: uid,
    userEmail,
    userName: text(request.auth.token.name, 120) || fullName,
    customerCode,
    language,
    fullName,
    phone,
    address,
    city,
    postalCode,
    country,
    notes: text(input.notes, 1000) || null,
    source,
    orderType,
    quantity,
    templateId: text(input.templateId, 120) || null,
    templateName: text(input.templateName, 120) || null,
    productId: text(input.productId, 120) || null,
    productName,
    items: [{
      name: itemName,
      quantity,
      unitPrice: unitPriceCents / 100,
      currency: 'EUR',
      type: source === 'mockup' ? 'mockup-print' : 'design-print',
    }],
    mockup,
    totalPrice: amountTotalCents / 100,
    amountTotalCents,
    currency: 'EUR',
    status: 'awaiting_payment',
    supplierStatus: 'not_sent',
    paymentStatus: 'unpaid',
    paymentMethod: 'stripe',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const checkout = await stripeClient().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: checkoutIntentRef.id,
      customer_email: userEmail || undefined,
      billing_address_collection: 'required',
      phone_number_collection: { enabled: true },
      locale: STRIPE_LOCALES[language],
      line_items: [{
        quantity,
        price_data: {
          currency: 'eur',
          unit_amount: unitPriceCents,
          product_data: {
            name: itemName,
            metadata: { orderNumber, source },
          },
        },
      }],
      metadata: { orderId: checkoutIntentRef.id, orderNumber, userId: uid, customerCode, language },
      success_url: `${returnOrigin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnOrigin}/?payment=cancelled`,
    });

    await checkoutIntentRef.update({
      stripeCheckoutSessionId: checkout.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { url: checkout.url, orderId: checkoutIntentRef.id, orderNumber, customerCode };
  } catch (error) {
    logger.error('Stripe Checkout Session creation failed.', error);
    await checkoutIntentRef.update({
      status: 'cancelled',
      paymentStatus: 'failed',
      updatedAt: FieldValue.serverTimestamp(),
    });
    throw new HttpsError('internal', 'Could not open Stripe Checkout.');
  }
});

exports.getCheckoutStatus = onCall({ region: REGION, secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in to verify checkout.');
  }
  const sessionId = text(request.data && request.data.sessionId, 180);
  if (!sessionId) throw new HttpsError('invalid-argument', 'Missing Checkout Session.');

  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  if (!session.metadata || session.metadata.userId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'This checkout does not belong to the signed-in customer.');
  }
  const paid = await markCheckoutPaid(session);
  const snapshot = await db.collection('orders').doc(session.metadata.orderId).get();
  return {
    paid: paid && session.payment_status !== 'unpaid',
    orderId: session.metadata.orderId,
    orderNumber: snapshot.data() && snapshot.data().orderNumber || null,
    customerCode: session.metadata.customerCode || null,
  };
});

exports.stripeWebhook = onRequest({ region: REGION, secrets: [stripeSecretKey, stripeWebhookSecret] }, async (request, response) => {
  const signature = request.get('stripe-signature');
  if (!signature) {
    response.status(400).send('Missing Stripe signature.');
    return;
  }

  let event;
  try {
    event = stripeClient().webhooks.constructEvent(request.rawBody, signature, stripeWebhookSecret.value());
  } catch (error) {
    logger.warn('Rejected invalid Stripe webhook signature.', error);
    response.status(400).send('Invalid Stripe signature.');
    return;
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      await markCheckoutPaid(event.data.object);
    } else if (event.type === 'checkout.session.async_payment_failed' || event.type === 'checkout.session.expired') {
      await markCheckoutFailed(event.data.object);
    }
    response.status(200).json({ received: true });
  } catch (error) {
    logger.error('Stripe webhook handling failed.', error);
    response.status(500).send('Webhook handling failed.');
  }
});
