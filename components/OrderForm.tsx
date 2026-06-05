import React, { useState } from 'react';
import { Template, MenuData, OrderData, CategoryId } from '../types';
import { ArrowLeft, CreditCard, Truck, Package, CheckCircle2, ShoppingBag, LoaderCircle } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import { Language, TranslationKey } from '../translations';

interface OrderFormProps {
  template: Template;
  data: MenuData | any;
  orderType: 'retail' | 'wholesale';
  onBack: () => void;
  onSubmit: (order: OrderData) => void | Promise<void>;
}

const LOCALES: Record<Language, string> = {
  fa: 'fa-IR',
  en: 'en-IE',
  de: 'de-DE',
  fr: 'fr-FR',
  ar: 'ar-SA',
};

const MOCKUP_NAME_KEYS: Record<string, TranslationKey> = {
  tshirt: 'mockup_product_tshirt_name',
  mug: 'mockup_product_mug_name',
  hoodie: 'mockup_product_hoodie_name',
};

const MOCKUP_CATEGORY_KEYS: Record<string, TranslationKey> = {
  tshirt: 'mockup_product_tshirt_cat',
  mug: 'mockup_product_mug_cat',
  hoodie: 'mockup_product_hoodie_cat',
};

const EDITOR_PRODUCT_KEYS: Partial<Record<CategoryId, [TranslationKey, TranslationKey]>> = {
  [CategoryId.RESTAURANT_MENU]: ['category_restaurant', 'item_menu'],
  [CategoryId.RESTAURANT_CARD]: ['category_restaurant', 'item_card'],
  [CategoryId.RESTAURANT_BROCHURE]: ['category_restaurant', 'item_brochure'],
  [CategoryId.RESTAURANT_LOGO]: ['category_restaurant', 'item_logo'],
  [CategoryId.CAFE_MENU]: ['category_cafe', 'item_menu'],
  [CategoryId.CAFE_CARD]: ['category_cafe', 'item_card'],
  [CategoryId.CAFE_BROCHURE]: ['category_cafe', 'item_brochure'],
  [CategoryId.CAFE_LOGO]: ['category_cafe', 'item_logo'],
  [CategoryId.FASTFOOD_MENU]: ['category_fastfood', 'item_menu'],
  [CategoryId.FASTFOOD_CARD]: ['category_fastfood', 'item_card'],
  [CategoryId.FASTFOOD_BROCHURE]: ['category_fastfood', 'item_brochure'],
  [CategoryId.FASTFOOD_LOGO]: ['category_fastfood', 'item_logo'],
  [CategoryId.MEDICAL_LOGO]: ['category_medical', 'item_logo'],
  [CategoryId.MEDICAL_CARD]: ['category_medical', 'item_card'],
  [CategoryId.MEDICAL_BROCHURE]: ['category_medical', 'item_brochure'],
  [CategoryId.CORPORATE_LOGO]: ['category_corporate_services', 'item_logo'],
  [CategoryId.CORPORATE_CARD]: ['category_corporate_services', 'item_card'],
  [CategoryId.CORPORATE_BROCHURE]: ['category_corporate_services', 'item_brochure'],
};

const PRINT_MOCKUP_LABEL: Record<Language, string> = {
  fa: 'چاپ موکاپ',
  en: 'Printed mockup',
  de: 'Bedrucktes Mockup',
  fr: 'Maquette imprimée',
  ar: 'طباعة النموذج',
};

export const OrderForm: React.FC<OrderFormProps> = ({ template, data, orderType, onBack, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const { t, isRtl, language } = useLanguage();
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    quantity: orderType === 'wholesale' ? 500 : 50,
    notes: ''
  });

  // These are the existing tariffs represented in EUR; the backend calculates the charge again.
  const unitPrice = orderType === 'wholesale' ? 0.02 : 0.04;
  const totalPrice = Number((formData.quantity * unitPrice).toFixed(2));
  const formatEuro = (amount: number) => new Intl.NumberFormat(LOCALES[language], {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'name',
    minimumFractionDigits: 2,
  }).format(amount);
  const isMockupOrder = data?.orderSource === 'mockup' || template.id.startsWith('mockup-');
  const mockupNameKey = MOCKUP_NAME_KEYS[data?.productId];
  const productKeys = EDITOR_PRODUCT_KEYS[template.categoryId];
  const localizedProductName = isMockupOrder
    ? (mockupNameKey ? t(mockupNameKey) : data.productName || template.name)
    : (productKeys ? `${t(productKeys[0])} - ${t(productKeys[1])}` : template.name);
  const localizedItemName = isMockupOrder
    ? `${PRINT_MOCKUP_LABEL[language]} - ${localizedProductName}`
    : localizedProductName;
  const localizedMockupCategory = MOCKUP_CATEGORY_KEYS[data?.productId]
    ? t(MOCKUP_CATEGORY_KEYS[data.productId])
    : data?.productCategory;
  const shippingComplete = Boolean(
    formData.fullName && formData.phone && formData.address &&
    formData.city && formData.postalCode && formData.country
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'quantity' ? Number(value) : value }));
  };

  const handleNext = async () => {
    if (step < 3) setStep(step + 1);
    else {
      const order: OrderData = {
        ...formData,
        language,
        orderType,
        templateId: template.id,
        templateName: localizedProductName,
        source: isMockupOrder ? 'mockup' : 'editor',
        productId: isMockupOrder ? data.productId : template.categoryId,
        productName: localizedProductName,
        items: [{
          name: localizedItemName,
          quantity: formData.quantity,
          unitPrice,
          currency: 'EUR',
          type: isMockupOrder ? 'mockup-print' : 'design-print'
        }],
        mockup: isMockupOrder ? {
          productId: data.productId,
          productName: localizedProductName,
          productCategory: localizedMockupCategory,
          productImage: data.productImage || template.thumbnail,
          logo: data.logo || null,
          textLayer: data.textLayer || null,
          settings: data.settings || null,
          printArea: data.printArea || null,
          hasLogo: Boolean(data.logo)
        } : undefined,
        designData: isMockupOrder ? undefined : data,
        totalPrice,
        currency: 'EUR',
        amountTotalCents: Math.round(totalPrice * 100),
        status: 'awaiting_payment',
        createdAt: new Date().toISOString(),
        supplierStatus: 'not_sent',
        paymentStatus: 'unpaid',
        paymentMethod: 'stripe'
      };
      setSubmitting(true);
      try {
        await onSubmit(order);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={onBack}
          className={`flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors ${isRtl ? 'flex-row' : 'flex-row-reverse justify-end'}`}
        >
          <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
          <span>{t('order_back_editor')}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Progress Steps */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0 mx-12"></div>
              {[1, 2, 3].map((s) => (
                <div key={s} className="relative z-10 flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    step >= s ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {step > s ? <CheckCircle2 size={20} /> : s}
                  </div>
                  <span className={`text-xs font-bold ${step >= s ? 'text-blue-600' : 'text-slate-400'}`}>
                    {s === 1 ? t('order_step_shipping') : s === 2 ? t('order_step_payment') : t('order_step_confirm')}
                  </span>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className={`text-2xl font-black text-slate-800 flex items-center gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
                  <Truck className="text-blue-600" />
                  {t('order_shipping_title')}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={`space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-bold text-slate-600">{t('order_full_name')}</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder={t('order_full_name_placeholder')}
                    />
                  </div>
                  <div className={`space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-bold text-slate-600">{isRtl ? 'شماره تماس' : 'Phone number'}</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      placeholder="+49 ..."
                    />
                  </div>
                  <div className={`space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-bold text-slate-600">{t('order_quantity')}</label>
                    <input 
                      type="number" 
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      min={orderType === 'wholesale' ? 500 : 50}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-400">{t('order_min_qty')} {orderType === 'wholesale' ? '500' : '50'} {t('order_unit_pcs')}</p>
                  </div>
                  <div className={`space-y-2 md:col-span-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-bold text-slate-600">{isRtl ? 'آدرس ارسال' : 'Delivery address'}</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                      placeholder={isRtl ? 'خیابان، پلاک، واحد' : 'Street, building, unit'}
                    />
                  </div>
                  <div className={`space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-bold text-slate-600">{isRtl ? 'شهر' : 'City'}</label>
                    <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className={`space-y-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-bold text-slate-600">{isRtl ? 'کد پستی' : 'Postal code'}</label>
                    <input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div className={`space-y-2 md:col-span-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <label className="text-sm font-bold text-slate-600">{isRtl ? 'کشور' : 'Country'}</label>
                    <input type="text" name="country" value={formData.country} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className={`text-2xl font-black text-slate-800 flex items-center gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
                  <CreditCard className="text-blue-600" />
                  {t('order_payment_title')}
                </h2>
                
                <div className="space-y-4">
                  <div className={`p-4 border-2 border-blue-600 bg-blue-50 rounded-2xl flex items-center justify-between cursor-pointer ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`flex items-center gap-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <CreditCard className="text-blue-600" />
                      </div>
                      <div className={isRtl ? 'text-right' : 'text-left'}>
                        <p className="font-bold text-slate-800">Stripe Checkout</p>
                        <p className="text-xs text-slate-500">{isRtl ? 'پرداخت امن با کارت و تایید آدرس صورتحساب' : 'Secure card payment with billing address confirmation'}</p>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-4 border-blue-600 bg-white"></div>
                  </div>
                  
                  <div className={`p-4 border border-slate-200 rounded-2xl flex items-center justify-between opacity-50 cursor-not-allowed ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`flex items-center gap-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Truck className="text-slate-400" />
                      </div>
                      <div className={isRtl ? 'text-right' : 'text-left'}>
                        <p className="font-bold text-slate-800">{t('order_payment_cod')}</p>
                        <p className="text-xs text-slate-500">{t('order_payment_cod_desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`bg-amber-50 border border-amber-100 p-4 rounded-xl flex gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className="text-amber-600">⚠️</div>
                  <p className={`text-sm text-amber-800 leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'پس از تایید سفارش، به صفحه امن Stripe منتقل می شوید. سفارش فقط بعد از پرداخت موفق ثبت نهایی می شود.' : 'You will continue to secure Stripe Checkout. Your order is confirmed only after successful payment.'}
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6 animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-black text-slate-800">{t('order_confirm_ready')}</h2>
                <p className="text-slate-500 max-w-md mx-auto">
                  {t('order_confirm_desc')}
                </p>
                
                <div className={`bg-slate-50 p-6 rounded-2xl space-y-3 max-w-sm mx-auto ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className={`flex justify-between ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span className="text-slate-500">{t('order_confirm_receiver')}</span>
                    <span className="font-bold">{formData.fullName}</span>
                  </div>
                  <div className={`flex justify-between ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span className="text-slate-500">{t('order_confirm_qty')}</span>
                    <span className="font-bold">{formData.quantity} {t('order_unit_pcs')}</span>
                  </div>
                  <div className={`flex justify-between border-t pt-3 mt-3 border-slate-200 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span className="text-slate-800 font-bold">{t('order_confirm_total')}</span>
                    <span className="text-blue-600 font-black">{formatEuro(totalPrice)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className={`flex justify-between items-center pt-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
              {step > 1 && step < 3 && (
                <button 
                  onClick={() => setStep(step - 1)}
                  className="px-8 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  {t('order_prev_step')}
                </button>
              )}
              <button 
                onClick={handleNext}
                disabled={(step === 1 && !shippingComplete) || submitting}
                className={`px-12 py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center gap-2 ${
                  (step === 1 && !shippingComplete) || submitting
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 hover:-translate-y-1'
                } ${isRtl ? 'mr-auto' : 'ml-auto'}`}
              >
                {submitting
                  ? (isRtl ? 'در حال اتصال به پرداخت...' : 'Opening checkout...')
                  : step === 3
                    ? (isRtl ? 'پرداخت با Stripe' : 'Pay with Stripe')
                    : t('order_next_step')}
                {submitting ? <LoaderCircle size={20} className="animate-spin" /> : <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />}
              </button>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="space-y-6">
            <div className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
              <h3 className="font-black text-lg text-slate-800 border-b pb-3 border-slate-100">{t('order_summary_title')}</h3>
              
              <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden relative group">
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity z-10">
                  <ShoppingBag className="text-white" />
                </div>
                <div className="w-full h-full scale-50 origin-top-left" style={{ transform: 'scale(0.3)', transformOrigin: 'top left', width: '333%', height: '333%' }}>
                   {/* This is a simplified preview, in a real app we'd pass the rendered image */}
                   {data.colors ? (
                     <div className="w-full h-full p-8" style={{ backgroundColor: data.colors.background, color: data.colors.text }}>
                        <h1 className="text-6xl font-black">{data.title}</h1>
                        <p className="text-3xl">{data.subtitle}</p>
                     </div>
                   ) : (
                     <div className="w-full h-full flex items-center justify-center bg-slate-200 p-12">
                        {data.logo ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img src={template.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            <img src={data.logo} className="relative max-w-[60%] max-h-[60%] object-contain shadow-2xl" />
                          </div>
                        ) : (
                          <Package size={128} className="text-slate-400" />
                        )}
                     </div>
                   )}
                </div>
              </div>

              <div className="space-y-3">
                <div className={`flex justify-between text-sm ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                  <span className="text-slate-500">{t('order_summary_product')}</span>
                  <span className="font-bold text-slate-700">{localizedProductName}</span>
                </div>
                <div className={`flex justify-between text-sm ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                  <span className="text-slate-500">{t('order_summary_type')}</span>
                  <span className={`font-bold ${orderType === 'wholesale' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {orderType === 'wholesale' ? t('order_summary_wholesale') : t('order_summary_retail')}
                  </span>
                </div>
                <div className={`flex justify-between text-sm ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                  <span className="text-slate-500">{t('order_summary_unit_price')}</span>
                  <span className="font-bold text-slate-700">{formatEuro(unitPrice)}</span>
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <div className={`flex justify-between items-center ${isRtl ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span className="font-black text-slate-800">{t('order_summary_total')}</span>
                    <span className="text-xl font-black text-blue-600">{formatEuro(totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={`bg-blue-600 p-6 rounded-3xl text-white space-y-4 shadow-xl shadow-blue-100 ${isRtl ? 'text-right' : 'text-left'}`}>
              <div className={`flex items-center gap-3 ${isRtl ? 'flex-row' : 'flex-row-reverse justify-end'}`}>
                <Package size={24} />
                <h4 className="font-black">{t('order_benefits_title')}</h4>
              </div>
              <ul className="text-sm space-y-2 opacity-90">
                <li>• {t('order_benefit_1')}</li>
                <li>• {t('order_benefit_2')}</li>
                <li>• {t('order_benefit_3')}</li>
                <li>• {t('order_benefit_4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
