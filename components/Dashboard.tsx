
import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Layout, Package, Star, Trash2, ExternalLink, Clock, CheckCircle2, Truck, ShoppingBag, Wand2, LogOut, Sparkles, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OrderData, Template, CategoryId } from '../types';
import { useLanguage } from '../LanguageContext';
import { AiCreditStatus, createCreditCheckout, refreshAiCreditStatus } from '../services/creditService';

import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface DashboardProps {
  onBack: () => void;
  onSelectTemplate: (template: Template) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onBack, onSelectTemplate }) => {
  const [activeTab, setActiveTab] = useState<'designs' | 'orders' | 'favorites'>('designs');
  const [designs, setDesigns] = useState<any[]>([]);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [customerCode, setCustomerCode] = useState('');
  const [aiCreditStatus, setAiCreditStatus] = useState<AiCreditStatus | null>(null);
  const [buyingPackId, setBuyingPackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t, isRtl, language } = useLanguage();
  const numberLocale = { fa: 'fa-IR', en: 'en-IE', de: 'de-DE', fr: 'fr-FR', ar: 'ar-SA' }[language];
  const formatEuro = (amount: number) => new Intl.NumberFormat(numberLocale, {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'name',
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Fetch User Designs
    const designsQuery = query(
      collection(db, 'designs'),
      where('authorUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeDesigns = onSnapshot(designsQuery, (snapshot) => {
      setDesigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'designs');
    });

    // Fetch User Orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const profile = snapshot.data();
      setCustomerCode(profile?.customerCode || '');
      setAiCreditStatus((current) => ({
        creditsBalance: Number(profile?.aiCreditsBalance ?? current?.creditsBalance ?? 0),
        creditsTotalUsed: Number(profile?.aiCreditsTotalUsed ?? current?.creditsTotalUsed ?? 0),
        creditsTotalGranted: Number(profile?.aiCreditsTotalGranted ?? current?.creditsTotalGranted ?? 0),
        creditsPurchased: Number(profile?.aiCreditsPurchased ?? current?.creditsPurchased ?? 0),
        freeCreditsGranted: Number(profile?.aiFreeCreditsGranted ?? current?.freeCreditsGranted ?? 0),
        dailyCreditsUsed: current?.dailyCreditsUsed ?? 0,
        dailyImageGenerations: current?.dailyImageGenerations ?? 0,
        dailyCreditLimit: current?.dailyCreditLimit ?? 12,
        dailyImageLimit: current?.dailyImageLimit ?? 3,
        plan: profile?.aiPlan || current?.plan || 'free',
        freeCredits: current?.freeCredits ?? 30,
        costs: current?.costs || {},
        packs: current?.packs || {},
      }));
    });

    refreshAiCreditStatus()
      .then(setAiCreditStatus)
      .catch((error) => console.warn('AI credit status failed', error));

    // Fetch User Favorites
    const favoritesQuery = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid),
      orderBy('savedAt', 'desc')
    );

    const unsubscribeFavorites = onSnapshot(favoritesQuery, (snapshot) => {
      setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'favorites');
      setLoading(false);
    });

    return () => {
      unsubscribeDesigns();
      unsubscribeOrders();
      unsubscribeFavorites();
      unsubscribeProfile();
    };
  }, [user]);

  const handleDeleteDesign = async (id: string) => {
    if (window.confirm(t('dashboard_delete_confirm'))) {
      try {
        await deleteDoc(doc(db, 'designs', id));
      } catch (error) {
        console.error("Error deleting design:", error);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      onBack();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleBuyCredits = async (packId: string) => {
    try {
      setBuyingPackId(packId);
      const checkout = await createCreditCheckout(packId, language);
      if (!checkout.url) throw new Error('Credit checkout did not return a URL.');
      window.location.assign(checkout.url);
    } catch (error) {
      console.error('Could not open credit checkout:', error);
      alert(t('ai_credit_checkout_error'));
    } finally {
      setBuyingPackId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-amber-500" size={18} />;
      case 'awaiting_payment': return <Clock className="text-amber-500" size={18} />;
      case 'paid': return <CheckCircle2 className="text-blue-500" size={18} />;
      case 'shipped': return <Truck className="text-purple-500" size={18} />;
      case 'delivered': return <CheckCircle2 className="text-emerald-500" size={18} />;
      default: return <Clock className="text-slate-400" size={18} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return t('dashboard_status_pending');
      case 'awaiting_payment': return isRtl ? 'در انتظار پرداخت' : 'Awaiting payment';
      case 'paid': return t('dashboard_status_paid');
      case 'shipped': return t('dashboard_status_shipped');
      case 'delivered': return t('dashboard_status_delivered');
      default: return t('dashboard_status_unknown');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-600">
            <ShoppingBag size={40} />
          </div>
          <h2 className="text-2xl font-black text-white">{t('login_needed')}</h2>
          <button onClick={onBack} className="text-blue-400 font-bold hover:underline">{t('order_success_back')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] font-sans pb-20 text-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <img src={user.photoURL || ''} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-white/20" />
            <div className={isRtl ? 'text-right' : 'text-left'}>
              <h1 className="font-black text-white text-xs sm:text-base">{user.displayName}</h1>
              <p className="text-[8px] sm:text-xs text-slate-400">{user.email}</p>
              {customerCode && <p className="text-[8px] sm:text-xs text-blue-300">{isRtl ? 'کد مشتری:' : 'Customer code:'} {customerCode}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={onBack}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] sm:text-sm font-bold transition-all"
            >
              {t('dashboard_back_home')}
            </button>
            <button 
              onClick={handleLogout}
              className="p-1.5 sm:p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-12">
        {/* AI Credit */}
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div className={isRtl ? 'text-right' : 'text-left'}>
                <p className="text-xs font-black uppercase tracking-widest text-cyan-200">{t('ai_credit_label')}</p>
                <p className="mt-2 text-4xl font-black text-white">{aiCreditStatus?.creditsBalance ?? '-'}</p>
                <p className="mt-1 text-xs font-bold text-cyan-100/80">
                  {t('ai_credit_daily')}: {aiCreditStatus?.dailyCreditsUsed ?? 0}/{aiCreditStatus?.dailyCreditLimit ?? 12}
                </p>
              </div>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
                <Sparkles size={30} />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-white">{t('ai_credit_add_title')}</h2>
              <CreditCard className="text-slate-400" size={20} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Object.entries(aiCreditStatus?.packs || {
                starter: { credits: 50, amountCents: 299 },
                creator: { credits: 150, amountCents: 699 },
                studio: { credits: 400, amountCents: 1499 },
              }).map(([packId, pack]) => (
                <button
                  key={packId}
                  onClick={() => handleBuyCredits(packId)}
                  disabled={buyingPackId === packId}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition hover:border-cyan-300/40 hover:bg-white/10 disabled:opacity-60"
                >
                  <p className="text-xl font-black text-white">{pack.credits}</p>
                  <p className="text-xs font-bold text-slate-400">{t('ai_credit_unit')}</p>
                  <p className="mt-2 text-sm font-black text-cyan-200">{formatEuro(pack.amountCents / 100)}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mb-8 sm:mb-12">
          {[
            { label: t('dashboard_stats_designs'), value: designs.length, icon: Layout, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            { label: t('dashboard_stats_orders'), value: orders.length, icon: Package, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            { label: t('dashboard_stats_favorites'), value: favorites.length, icon: Star, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          ].map((stat, i) => (
            <div key={i} className={`bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-8 text-center ${isRtl ? 'sm:text-right' : 'sm:text-left'}`}>
              <div className={`w-8 h-8 sm:w-12 sm:h-12 ${stat.bg} rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 mx-auto ${isRtl ? 'sm:mr-0' : 'sm:ml-0'}`}>
                <stat.icon className={stat.color} size={16} />
              </div>
              <p className="text-[8px] sm:text-sm text-slate-400 font-bold mb-0.5 sm:mb-1">{stat.label}</p>
              <p className="text-base sm:text-3xl font-black text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 sm:gap-2 mb-6 sm:mb-8 bg-white/5 p-1 sm:p-1.5 rounded-2xl sm:rounded-3xl w-full sm:w-fit">
          {[
            { id: 'designs', label: t('dashboard_stats_designs'), icon: Layout },
            { id: 'orders', label: t('dashboard_stats_orders'), icon: Package },
            { id: 'favorites', label: t('dashboard_stats_favorites'), icon: Star },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-3 px-3 sm:px-8 py-2 sm:py-3.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-sm font-black transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'designs' && (
            <motion.div 
              key="designs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            >
              {designs.length === 0 ? (
                <div className="col-span-full py-12 sm:py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Wand2 className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-slate-400 font-bold">{t('dashboard_no_orders')}</p>
                </div>
              ) : (
                designs.map((design) => (
                  <div key={design.id} className="bg-white/5 rounded-[2rem] overflow-hidden border border-white/10 group hover:border-blue-500/50 transition-all">
                    <div className="aspect-[4/3] relative overflow-hidden bg-white/5">
                      <img src={design.thumbnail} alt={design.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button 
                          onClick={() => onSelectTemplate(design)}
                          className="p-3 bg-white rounded-2xl text-blue-600 hover:scale-110 transition-transform"
                          title="ویرایش مجدد"
                        >
                          <ExternalLink size={20} />
                        </button>
                        <button 
                          onClick={() => handleDeleteDesign(design.id)}
                          className="p-3 bg-white rounded-2xl text-red-600 hover:scale-110 transition-transform"
                          title="حذف"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className={`p-5 sm:p-6 ${isRtl ? 'text-right' : 'text-left'}`}>
                      <h3 className="font-black text-white mb-1 text-sm sm:text-base">{design.name}</h3>
                      <p className={`text-[10px] sm:text-xs text-slate-400 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <Clock size={12} />
                        {design.createdAt?.toDate ? design.createdAt.toDate().toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : new Date(design.createdAt || Date.now()).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 sm:space-y-6"
            >
              {orders.length === 0 ? (
                <div className="py-12 sm:py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Package className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-slate-400 font-bold">{t('dashboard_no_orders')}</p>
                </div>
              ) : (
                orders.map((order: any) => (
                  <div key={order.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
                    <div className={`p-5 sm:p-8 flex flex-col sm:flex-row ${isRtl ? 'sm:flex-row-reverse' : ''} sm:items-center justify-between gap-6`}>
                      <div className={`flex items-center gap-4 sm:gap-6 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden">
                          {order.items?.[0]?.thumbnail ? (
                            <img src={order.items[0].thumbnail} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ShoppingBag className="text-white/20" size={32} />
                          )}
                        </div>
                        <div className={isRtl ? 'text-right' : 'text-left'}>
                          <div className={`flex items-center gap-3 mb-1 sm:mb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-wider">{t('dashboard_order_id')}{order.id.slice(-6)}</span>
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-full border border-white/10 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              {getStatusIcon(order.status)}
                              <span className="text-[9px] sm:text-[11px] font-black text-white">{getStatusText(order.status)}</span>
                            </div>
                          </div>
                          <h3 className="text-sm sm:text-xl font-black text-white mb-1 sm:mb-2">{order.items?.[0]?.name || 'سفارش چاپی'}</h3>
                          <p className={`mb-1 text-[10px] font-bold ${order.paymentStatus === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {order.paymentStatus === 'paid'
                              ? (isRtl ? 'پرداخت Stripe تایید شده' : 'Stripe payment confirmed')
                              : (isRtl ? 'در انتظار پرداخت' : 'Awaiting payment')}
                          </p>
                          <p className={`text-[10px] sm:text-xs text-slate-400 flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <Clock size={12} />
                            {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString(isRtl ? 'fa-IR' : 'en-US') : new Date(order.createdAt || Date.now()).toLocaleDateString(isRtl ? 'fa-IR' : 'en-US')}
                          </p>
                        </div>
                      </div>
                      <div className={`flex items-center justify-between sm:justify-end gap-4 sm:gap-12 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <div className={isRtl ? 'text-right' : 'text-left'}>
                          <p className="text-[10px] sm:text-xs text-slate-400 font-bold mb-1">{t('dashboard_order_total')}</p>
                          <p className="text-sm sm:text-2xl font-black text-white">
                            {formatEuro(order.totalPrice || 0)}
                          </p>
                        </div>
                        <button className="px-5 sm:px-8 py-2.5 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] sm:text-sm font-black transition-all">
                          {t('dashboard_order_details')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'favorites' && (
            <motion.div 
              key="favorites"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
            >
              {favorites.length === 0 ? (
                <div className="col-span-full py-12 sm:py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Star className="mx-auto text-white/10 mb-4" size={48} />
                  <p className="text-slate-400 font-bold">{t('dashboard_no_favorites')}</p>
                </div>
              ) : (
                favorites.map((fav: any) => (
                  <div key={fav.id} className="bg-white/5 rounded-[2rem] overflow-hidden border border-white/10 group hover:border-amber-500/50 transition-all p-5 sm:p-6">
                    <div className={`flex items-center justify-between mb-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
                       <div className="w-10 h-10 bg-amber-400/10 text-amber-400 rounded-xl flex items-center justify-center">
                          <Star size={20} fill="currentColor" />
                       </div>
                       <button 
                        onClick={async () => await deleteDoc(doc(db, 'favorites', fav.id))}
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                       >
                          <Trash2 size={18} />
                       </button>
                    </div>
                    <div className={isRtl ? 'text-right' : 'text-left'}>
                      <h3 className="font-black text-white text-sm sm:text-base mb-1">طرح مورد علاقه</h3>
                      <p className="text-[10px] sm:text-xs text-slate-400 mb-4">{t('dashboard_fav_template')} {fav.templateId}</p>
                    </div>
                    <button 
                      onClick={() => onSelectTemplate({ id: fav.templateId } as any)}
                      className="w-full py-2.5 sm:py-3 bg-white/10 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-white/20 transition-colors"
                    >
                      {t('dashboard_fav_edit')}
                    </button>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
