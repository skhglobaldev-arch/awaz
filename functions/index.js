const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const { HttpsError, onCall, onRequest } = require('firebase-functions/v2/https');
const crypto = require('crypto');
const Stripe = require('stripe');

const adminApp = initializeApp();
const DATABASE_ID = 'ai-studio-4865eff7-c467-4382-bd96-9d2d6f0db131';
const REGION = 'europe-west2';
const db = getFirestore(adminApp, DATABASE_ID);

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

const AI_FREE_GRANT_VERSION = 1;
const AI_FREE_CREDITS = 10;
const AI_ACCOUNT_LIMIT_PER_SIGNAL = 2;
const AI_TASK_COST = {
  description: 1,
  analyzeLogo: 1,
  businessCard: 1,
  menuItems: 1,
  template: 1,
  backgroundImage: 5,
  logo: 5,
};
const AI_IMAGE_TASKS = new Set(['backgroundImage', 'logo']);
const AI_PLAN_LIMITS = {
  free: { dailyCredits: 5, dailyImages: 2 },
  starter: { dailyCredits: 40, dailyImages: 8 },
  pro: { dailyCredits: 120, dailyImages: 25 },
  business: { dailyCredits: 400, dailyImages: 80 },
  admin: { dailyCredits: 1000, dailyImages: 200 },
};

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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hashSignal(value) {
  const input = text(value, 240);
  return input ? crypto.createHash('sha256').update(input).digest('hex').slice(0, 32) : null;
}

function clientIpFromRequest(request) {
  const headers = request.rawRequest && request.rawRequest.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['fastly-client-ip'] || headers['cf-connecting-ip'] || '';
  const value = Array.isArray(forwarded) ? forwarded[0] : String(forwarded);
  return text(value.split(',')[0], 80) || text(request.rawRequest && request.rawRequest.ip, 80);
}

function aiPlan(userData, authToken) {
  const email = text(authToken.email, 200).toLowerCase();
  if (userData.role === 'admin' || email === 'adminawaz@gmail.com' || email === 'awarvandsara@gmail.com') {
    return 'admin';
  }
  const plan = text(userData.aiPlan, 40).toLowerCase() || 'free';
  return AI_PLAN_LIMITS[plan] ? plan : 'free';
}

function aiLimits(userData, plan) {
  const base = AI_PLAN_LIMITS[plan] || AI_PLAN_LIMITS.free;
  return {
    dailyCredits: Math.max(1, Math.floor(safeNumber(userData.aiDailyCreditLimit, base.dailyCredits))),
    dailyImages: Math.max(0, Math.floor(safeNumber(userData.aiDailyImageLimit, base.dailyImages))),
  };
}

function signalBlocked(snapshot, uid) {
  if (!snapshot || !snapshot.exists) return false;
  const accounts = Array.isArray(snapshot.data().accounts) ? snapshot.data().accounts : [];
  return !accounts.includes(uid) && accounts.length >= AI_ACCOUNT_LIMIT_PER_SIGNAL;
}

function nextSignalAccounts(snapshot, uid) {
  const accounts = snapshot && snapshot.exists && Array.isArray(snapshot.data().accounts) ? snapshot.data().accounts : [];
  return accounts.includes(uid) ? accounts : [...accounts, uid].slice(0, 25);
}

async function reserveAiCredits(request, task, input) {
  const cost = AI_TASK_COST[task];
  if (!cost) throw new HttpsError('invalid-argument', 'Unknown AI task.');

  const uid = request.auth.uid;
  const authToken = request.auth.token || {};
  const email = text(authToken.email, 200).toLowerCase() || null;
  const userRef = db.collection('users').doc(uid);
  const dailyRef = userRef.collection('aiUsageDaily').doc(todayKey());
  const usageRef = db.collection('aiUsage').doc();
  const deviceHash = hashSignal(input.deviceId);
  const ipHash = hashSignal(clientIpFromRequest(request));
  const deviceRef = deviceHash ? db.collection('aiAbuseKeys').doc(`device_${deviceHash}`) : null;
  const ipRef = ipHash ? db.collection('aiAbuseKeys').doc(`ip_${ipHash}`) : null;
  const isImageTask = AI_IMAGE_TASKS.has(task);
  let reservation = null;

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const dailySnapshot = await transaction.get(dailyRef);
    const deviceSnapshot = deviceRef ? await transaction.get(deviceRef) : null;
    const ipSnapshot = ipRef ? await transaction.get(ipRef) : null;

    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const plan = aiPlan(userData, authToken);
    const limits = aiLimits(userData, plan);
    let balance = Math.floor(safeNumber(userData.aiCreditsBalance, 0));
    let totalGranted = Math.floor(safeNumber(userData.aiCreditsTotalGranted, 0));
    const totalUsed = Math.floor(safeNumber(userData.aiCreditsTotalUsed, 0));
    const freeAlreadyGranted = Number(userData.aiFreeGrantVersion || 0) >= AI_FREE_GRANT_VERSION;
    const freeGrantBlocked = !freeAlreadyGranted && (signalBlocked(deviceSnapshot, uid) || signalBlocked(ipSnapshot, uid));

    if (!freeAlreadyGranted && !freeGrantBlocked) {
      balance += AI_FREE_CREDITS;
      totalGranted += AI_FREE_CREDITS;
    }
    if (plan === 'admin' && balance < 1000) {
      totalGranted += 1000 - balance;
      balance = 1000;
    }

    if (freeGrantBlocked && balance < cost) {
      transaction.set(userRef, {
        uid,
        email,
        customerCode: customerCodeFromUid(uid),
        aiPlan: plan === 'admin' ? 'admin' : text(userData.aiPlan, 40) || 'free',
        aiFreeGrantBlocked: true,
        aiFreeGrantBlockedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      throw new HttpsError('resource-exhausted', 'Free AI limit reached on this device or network.');
    }

    if (balance < cost) {
      throw new HttpsError('resource-exhausted', 'Not enough AI credits.');
    }

    const dailyData = dailySnapshot.exists ? dailySnapshot.data() : {};
    const dailyCreditsUsed = Math.floor(safeNumber(dailyData.creditsUsed, 0));
    const dailyImagesUsed = Math.floor(safeNumber(dailyData.imageGenerations, 0));
    if (dailyCreditsUsed + cost > limits.dailyCredits) {
      throw new HttpsError('resource-exhausted', 'Daily AI credit limit reached.');
    }
    if (isImageTask && dailyImagesUsed + 1 > limits.dailyImages) {
      throw new HttpsError('resource-exhausted', 'Daily AI image limit reached.');
    }

    balance -= cost;
    const userUpdate = {
      uid,
      email,
      customerCode: text(userData.customerCode, 30) || customerCodeFromUid(uid),
      aiPlan: plan === 'admin' ? 'admin' : text(userData.aiPlan, 40) || 'free',
      aiCreditsBalance: balance,
      aiCreditsTotalGranted: totalGranted,
      aiCreditsTotalUsed: totalUsed + cost,
      aiLastTask: task,
      aiLastUsedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(freeAlreadyGranted ? {} : {
        aiFreeGrantVersion: AI_FREE_GRANT_VERSION,
        aiFreeCreditsGranted: freeGrantBlocked ? 0 : AI_FREE_CREDITS,
        aiFreeGrantedAt: freeGrantBlocked ? null : FieldValue.serverTimestamp(),
        aiFreeGrantBlocked: freeGrantBlocked,
      }),
      ...(userSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp(), role: 'customer', status: 'active' }),
    };
    transaction.set(userRef, userUpdate, { merge: true });

    transaction.set(dailyRef, {
      date: todayKey(),
      userId: uid,
      creditsUsed: dailyCreditsUsed + cost,
      imageGenerations: dailyImagesUsed + (isImageTask ? 1 : 0),
      dailyCreditLimit: limits.dailyCredits,
      dailyImageLimit: limits.dailyImages,
      updatedAt: FieldValue.serverTimestamp(),
      ...(dailySnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });

    if (deviceRef) {
      const accounts = nextSignalAccounts(deviceSnapshot, uid);
      transaction.set(deviceRef, {
        type: 'device',
        hash: deviceHash,
        accounts,
        accountCount: accounts.length,
        updatedAt: FieldValue.serverTimestamp(),
        ...(deviceSnapshot && deviceSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
    }
    if (ipRef) {
      const accounts = nextSignalAccounts(ipSnapshot, uid);
      transaction.set(ipRef, {
        type: 'ip',
        hash: ipHash,
        accounts,
        accountCount: accounts.length,
        updatedAt: FieldValue.serverTimestamp(),
        ...(ipSnapshot && ipSnapshot.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      }, { merge: true });
    }

    const categoryId = text(input.initialCategoryId || input.categoryId, 80);
    transaction.set(usageRef, {
      userId: uid,
      userEmail: email,
      customerCode: customerCodeFromUid(uid),
      task,
      categoryId: categoryId || null,
      cost,
      plan,
      isImageTask,
      promptPreview: text(input.prompt || input.description || input.businessName || input.itemName, 240) || null,
      status: 'reserved',
      remainingCredits: balance,
      dailyCreditsUsed: dailyCreditsUsed + cost,
      dailyCreditLimit: limits.dailyCredits,
      deviceHash: deviceHash || null,
      ipHash: ipHash || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    reservation = {
      userRef,
      dailyRef,
      usageRef,
      uid,
      task,
      cost,
      isImageTask,
      remainingCredits: balance,
      dailyCreditsUsed: dailyCreditsUsed + cost,
      dailyCreditLimit: limits.dailyCredits,
      dailyImagesUsed: dailyImagesUsed + (isImageTask ? 1 : 0),
      dailyImageLimit: limits.dailyImages,
      plan,
    };
  });

  return reservation;
}

async function completeAiUsage(reservation, data) {
  await reservation.usageRef.update({
    status: 'succeeded',
    finishedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return {
    ...data,
    aiUsage: {
      cost: reservation.cost,
      creditsRemaining: reservation.remainingCredits,
      dailyCreditsUsed: reservation.dailyCreditsUsed,
      dailyCreditLimit: reservation.dailyCreditLimit,
      dailyImagesUsed: reservation.dailyImagesUsed,
      dailyImageLimit: reservation.dailyImageLimit,
      plan: reservation.plan,
    },
  };
}

async function refundAiCredits(reservation, error) {
  if (!reservation) return;
  await db.runTransaction(async (transaction) => {
    const [userSnapshot, dailySnapshot] = await Promise.all([
      transaction.get(reservation.userRef),
      transaction.get(reservation.dailyRef),
    ]);
    const userData = userSnapshot.exists ? userSnapshot.data() : {};
    const dailyData = dailySnapshot.exists ? dailySnapshot.data() : {};
    transaction.set(reservation.userRef, {
      aiCreditsBalance: Math.floor(safeNumber(userData.aiCreditsBalance, 0)) + reservation.cost,
      aiCreditsTotalUsed: Math.max(0, Math.floor(safeNumber(userData.aiCreditsTotalUsed, 0)) - reservation.cost),
      aiLastRefundAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(reservation.dailyRef, {
      creditsUsed: Math.max(0, Math.floor(safeNumber(dailyData.creditsUsed, 0)) - reservation.cost),
      imageGenerations: Math.max(0, Math.floor(safeNumber(dailyData.imageGenerations, 0)) - (reservation.isImageTask ? 1 : 0)),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(reservation.usageRef, {
      status: 'failed_refunded',
      error: text(error && error.message, 500) || 'AI generation failed.',
      refundedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
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

async function geminiClient() {
  const { GoogleGenAI } = await import('@google/genai');
  return new GoogleGenAI({ apiKey: geminiApiKey.value() });
}

function stripDataUrl(value) {
  const input = text(value, 8_000_000);
  const match = input.match(/^data:([^;]+);base64,(.+)$/);
  return {
    mimeType: match ? match[1] : 'image/jpeg',
    data: match ? match[2] : input,
  };
}

function parseJsonResponse(value, fallback) {
  const raw = text(value, 80_000)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    const firstObject = raw.indexOf('{');
    const lastObject = raw.lastIndexOf('}');
    if (firstObject >= 0 && lastObject > firstObject) {
      try {
        return JSON.parse(raw.slice(firstObject, lastObject + 1));
      } catch (_) {}
    }
    const firstArray = raw.indexOf('[');
    const lastArray = raw.lastIndexOf(']');
    if (firstArray >= 0 && lastArray > firstArray) {
      try {
        return JSON.parse(raw.slice(firstArray, lastArray + 1));
      } catch (_) {}
    }
    return fallback;
  }
}

const CATEGORY_IDS = new Set([
  'restaurant_menu', 'restaurant_card', 'restaurant_brochure', 'restaurant_logo',
  'cafe_menu', 'cafe_card', 'cafe_brochure', 'cafe_logo',
  'fastfood_menu', 'fastfood_card', 'fastfood_brochure', 'fastfood_logo',
  'medical_logo', 'medical_card', 'medical_brochure',
  'corporate_logo', 'corporate_card', 'corporate_brochure',
]);

function inferCategoryId(input) {
  let categoryId = CATEGORY_IDS.has(input.initialCategoryId) ? input.initialCategoryId : 'restaurant_menu';
  const industry = text(input.industry, 120);
  const subIndustry = text(input.subIndustry, 120);
  const itemType = text(input.itemType, 80).toLowerCase();

  const isRestaurant = subIndustry.includes('رستوران') || /restaurant/i.test(subIndustry);
  const isCafe = subIndustry.includes('کافی') || /cafe|coffee/i.test(subIndustry);
  const isFastfood = subIndustry.includes('فست') || /fast/i.test(subIndustry);
  const isMedical = industry.includes('پزشکی') || /medical|clinic/i.test(industry);
  const isCorporate = industry.includes('شرکتی') || /corporate|business/i.test(industry);

  const suffix = itemType.includes('منو') || itemType.includes('menu')
    ? 'menu'
    : itemType.includes('کارت') || itemType.includes('card')
      ? 'card'
      : itemType.includes('لوگو') || itemType.includes('logo')
        ? 'logo'
        : itemType.includes('بروشور') || itemType.includes('brochure')
          ? 'brochure'
          : '';
  if (!suffix) return categoryId;

  const prefix = isRestaurant ? 'restaurant' : isCafe ? 'cafe' : isFastfood ? 'fastfood' : isMedical ? 'medical' : isCorporate ? 'corporate' : '';
  const inferred = prefix ? `${prefix}_${suffix}` : categoryId;
  return CATEGORY_IDS.has(inferred) ? inferred : categoryId;
}

function designKindFromCategory(categoryId, itemType) {
  const hint = text(itemType, 80);
  if (hint) return hint;
  if (categoryId.includes('brochure')) return 'بروشور';
  if (categoryId.includes('card')) return 'کارت ویزیت';
  if (categoryId.includes('logo')) return 'لوگو';
  if (categoryId.includes('menu')) return 'منو';
  return 'طرح چاپی';
}

function fallbackTemplate(input, categoryId) {
  const businessName = text(input.businessName, 100) || 'نام کسب و کار';
  const designType = designKindFromCategory(categoryId, input.itemType);
  return {
    id: `custom-template-${Date.now()}`,
    categoryId,
    name: `${designType} ${businessName}`.slice(0, 99),
    description: 'طرح پیشنهادی آماده ویرایش برای چاپ حرفه‌ای',
    thumbnail: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?q=80&w=500&auto=format&fit=crop',
    thumbnailColor: 'linear-gradient(135deg, #2563eb 0%, #f97316 100%)',
    layoutType: 'modern',
    defaultData: {
      title: businessName,
      subtitle: 'طراحی حرفه‌ای، خوانا و آماده چاپ',
      contact: '۰۹۱۲ ۰۰۰ ۰۰۰۰ | info@example.com',
      colors: { primary: '#1e40af', accent: '#f97316', background: '#ffffff', text: '#111827' },
      fonts: { title: 'Lalezar', body: 'Vazirmatn' },
      customText: 'حاشیه امن، کنتراست مناسب و آماده‌سازی چاپ رعایت شود.',
      sections: [
        { id: 's1', title: 'معرفی', items: [{ id: 'i1', name: 'خدمت اصلی', price: '', description: 'توضیح کوتاه و قابل چاپ برای معرفی برند' }] },
        { id: 's2', title: 'مزیت‌ها', items: [{ id: 'i2', name: 'کیفیت چاپ', price: '', description: 'رنگ خوانا، چیدمان تمیز و خروجی حرفه‌ای' }] },
      ],
    },
  };
}

function normalizeTemplate(template, input, categoryId) {
  const fallback = fallbackTemplate(input, categoryId);
  const data = template && typeof template === 'object' ? template : {};
  const defaultData = data.defaultData && typeof data.defaultData === 'object' ? data.defaultData : fallback.defaultData;
  return {
    id: `custom-template-${Date.now()}`,
    categoryId,
    name: text(data.name, 99) || fallback.name,
    description: text(data.description, 999) || fallback.description,
    thumbnail: text(data.thumbnail, 600) || fallback.thumbnail,
    thumbnailColor: text(data.thumbnailColor, 99) || fallback.thumbnailColor,
    layoutType: ['classic', 'modern', 'colorful', 'minimal', 'typographic', 'elegant'].includes(data.layoutType)
      ? data.layoutType
      : 'modern',
    defaultData: {
      title: text(defaultData.title, 120) || fallback.defaultData.title,
      subtitle: text(defaultData.subtitle, 180) || fallback.defaultData.subtitle,
      contact: text(defaultData.contact, 180) || fallback.defaultData.contact,
      logo: text(defaultData.logo, 700_000) || undefined,
      backgroundImage: text(defaultData.backgroundImage, 700_000) || undefined,
      colors: {
        primary: text(defaultData.colors && defaultData.colors.primary, 24) || fallback.defaultData.colors.primary,
        accent: text(defaultData.colors && defaultData.colors.accent, 24) || fallback.defaultData.colors.accent,
        background: text(defaultData.colors && defaultData.colors.background, 24) || fallback.defaultData.colors.background,
        text: text(defaultData.colors && defaultData.colors.text, 24) || fallback.defaultData.colors.text,
      },
      fonts: {
        title: text(defaultData.fonts && defaultData.fonts.title, 60) || 'Lalezar',
        body: text(defaultData.fonts && defaultData.fonts.body, 60) || 'Vazirmatn',
      },
      customText: text(defaultData.customText, 500) || fallback.defaultData.customText,
      border: defaultData.border || undefined,
      sections: Array.isArray(defaultData.sections) && defaultData.sections.length
        ? defaultData.sections.slice(0, 6).map((section, sectionIndex) => ({
          id: text(section.id, 40) || `s${sectionIndex + 1}`,
          title: text(section.title, 80) || `بخش ${sectionIndex + 1}`,
          items: Array.isArray(section.items) ? section.items.slice(0, 8).map((item, itemIndex) => ({
            id: text(item.id, 40) || `i${sectionIndex + 1}-${itemIndex + 1}`,
            name: text(item.name, 100) || 'آیتم',
            price: text(item.price, 40),
            description: text(item.description, 180),
          })) : [],
        }))
        : fallback.defaultData.sections,
    },
  };
}

function buildPrintDesignStrategyPrompt(input, categoryId) {
  const businessName = text(input.businessName, 100) || 'نام کسب و کار';
  const industryName = text(input.industry, 120) || 'عمومی';
  const subIndustryName = text(input.subIndustry, 120);
  const designType = designKindFromCategory(categoryId, input.itemType);
  const userBrief = text(input.prompt, 2000);

  return `
You are the senior creative director and print-production strategist at Awaz Design & Print Studio.
Create a commercially usable, print-ready Persian/RTL concept for "${designType}".

Business:
- Name: ${businessName}
- Industry: ${industryName}${subIndustryName ? ` / ${subIndustryName}` : ''}
- Client brief: ${userBrief}
- Category ID: ${categoryId}

Design requirements:
- Use fluent Persian for all visible copy unless brand, URL, email, or phone.
- Respect print-safe hierarchy, bleed/crop safety, readable sizes, high contrast, and CMYK-friendly color choices.
- Business card: prioritize name, role, contact, memorable identity, minimal back-side information.
- Brochure: organize into clear panels/sections: معرفی، خدمات، مزیت‌ها، دعوت به اقدام.
- Menu: create logical categories, readable prices, appetite-driven short descriptions.
- Logo: create scalable, iconic, simple brand guidance suitable for signage, stamp, packaging, social media, embroidery and merch.

Return only valid JSON with this structure:
{
  "name": "نام فارسی طرح",
  "description": "توضیح کوتاه فارسی",
  "thumbnailColor": "linear-gradient(135deg, #color1 0%, #color2 100%)",
  "layoutType": "modern",
  "defaultData": {
    "title": "${businessName}",
    "subtitle": "شعار فارسی",
    "contact": "اطلاعات تماس",
    "colors": { "primary": "#hex", "accent": "#hex", "background": "#hex", "text": "#hex" },
    "fonts": { "title": "Lalezar", "body": "Vazirmatn" },
    "customText": "یادداشت کوتاه استراتژی چاپ یا CTA",
    "sections": [
      { "id": "s1", "title": "عنوان بخش", "items": [{ "id": "i1", "name": "نام", "price": "قیمت اختیاری", "description": "توضیح کوتاه" }] }
    ]
  }
}`;
}

async function generateImageDataUrl(client, prompt, aspectRatio) {
  const response = await client.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio, imageSize: '1K' } },
  });
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData?.data) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }
  return null;
}

exports.generateAiContent = onCall({ region: REGION, secrets: [geminiApiKey], timeoutSeconds: 180, memory: '512MiB' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in before using AI generation.');
  }

  const input = request.data || {};
  const task = text(input.task, 40);
  if (!AI_TASK_COST[task]) {
    throw new HttpsError('invalid-argument', 'Unknown AI task.');
  }

  const reservation = await reserveAiCredits(request, task, input);
  let client;
  try {
    client = await geminiClient();

    if (task === 'description') {
      const prompt = `برای آیتم منوی "${text(input.itemName, 120)}" در دسته "${text(input.categoryName, 120)}" یک توضیح فارسی کوتاه، اشتهابرانگیز و قابل چاپ بنویس. حداکثر ۱۵ کلمه.`;
      const response = await client.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      return completeAiUsage(reservation, { text: text(response.text, 500) || 'توضیحات یافت نشد.' });
    }

    if (task === 'analyzeLogo') {
      const image = stripDataUrl(input.image);
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { text: 'این لوگو را مثل طراح برند و کارشناس چاپ تحلیل کن: سبک بصری، رنگ، خوانایی در ابعاد کوچک، قابلیت چاپ روی هودی/ماگ/تیشرت، ریسک‌های چاپی و پیشنهاد اصلاحی. پاسخ فارسی و کاربردی باشد.' },
          { inlineData: { mimeType: image.mimeType, data: image.data } },
        ],
      });
      return completeAiUsage(reservation, { text: text(response.text, 3000) || 'تحلیل تصویر انجام نشد.' });
    }

    if (task === 'businessCard') {
      const prompt = `برای کارت ویزیت چاپی یک شعار کوتاه و یک توضیح یک‌خطی فارسی بساز. نام کسب‌وکار: "${text(input.businessName, 120)}". توضیح: "${text(input.description, 500)}". فقط JSON بده: { "slogan": "...", "description": "..." }`;
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const result = parseJsonResponse(response.text, {});
      return completeAiUsage(reservation, {
        slogan: text(result.slogan, 120) || 'خلاقیت در هر قدم',
        description: text(result.description, 220) || 'همراه شما در مسیر موفقیت',
      });
    }

    if (task === 'menuItems') {
      const prompt = `برای منوی چاپی یک "${text(input.businessType, 120)}" پنج آیتم محبوب و واقعی پیشنهاد بده. هر آیتم فارسی، خوانا و مناسب چاپ باشد. قیمت با فرمت تومان مثل "۱۵۰,۰۰۰ ت". فقط JSON array بده: [{ "name": "...", "price": "...", "description": "..." }]`;
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const items = parseJsonResponse(response.text, []);
      return completeAiUsage(reservation, {
        items: Array.isArray(items) ? items.slice(0, 8).map((item, index) => ({
          id: `ai-${index}-${Date.now()}`,
          name: text(item.name, 100) || 'آیتم پیشنهادی',
          price: text(item.price, 40),
          description: text(item.description, 180),
        })) : [],
      });
    }

    if (task === 'backgroundImage') {
      const image = await generateImageDataUrl(
        client,
        `Create a high-quality print-design background. Theme: ${text(input.prompt, 500)}. Must support readable Persian text overlay, calm negative space, CMYK-friendly colors, no busy details behind text, premium commercial look.`,
        ['1:1', '9:16', '16:9'].includes(input.aspectRatio) ? input.aspectRatio : '9:16'
      );
      return completeAiUsage(reservation, { image });
    }

    if (task === 'logo') {
      const image = await generateImageDataUrl(
        client,
        `A professional, minimalist, vector-like logo for a business named "${text(input.businessName, 120)}" in the ${text(input.industry, 120)} industry. Scalable, iconic, high contrast, suitable for print, signage, stamp, embroidery, packaging and social media. White background, centered, premium brand identity.`,
        '1:1'
      );
      return completeAiUsage(reservation, { image });
    }

    if (task === 'template') {
      const categoryId = inferCategoryId(input);
      const response = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Create a print-ready professional template. User prompt: ${text(input.prompt, 2000)}`,
        config: {
          systemInstruction: buildPrintDesignStrategyPrompt(input, categoryId),
          responseMimeType: 'application/json',
        },
      });
      const parsed = parseJsonResponse(response.text, null);
      const template = normalizeTemplate(parsed, input, categoryId);
      return completeAiUsage(reservation, { template });
    }

    throw new HttpsError('invalid-argument', 'Unknown AI task.');
  } catch (error) {
    await refundAiCredits(reservation, error);
    if (error instanceof HttpsError) throw error;
    logger.error('AI generation failed; credits refunded.', { task, uid: request.auth.uid, error });
    throw new HttpsError('internal', 'AI generation failed. Credits were refunded.');
  }
});

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
