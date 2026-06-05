
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CategorySection } from './components/CategorySection';
import { TemplateSelector } from './components/TemplateSelector';
import { PortfolioSection } from './components/PortfolioSection';
import { Editor } from './components/Editor';
import { OrderForm } from './components/OrderForm';
import { CustomOrderForm } from './components/CustomOrderForm';
import { MockupGenerator } from './components/MockupGenerator';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/admin/AdminPanel';
import { ViewState, CategoryId, Template, MenuData, OrderData } from './types';
import { Sparkles, CheckCircle2, Clock, Star, Eye, ArrowRight, Palette, Wand2, Layout, Key } from 'lucide-react';
import { motion } from 'motion/react';
import { useFavorites } from './src/hooks/useFavorites';
import { auth, functions } from './firebase';
import { httpsCallable } from 'firebase/functions';
import { useLanguage } from './LanguageContext';

import { ErrorBoundary } from './components/ErrorBoundary';

const isLocalDemo = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
const LOCAL_ORDERS_KEY = 'awazLocalOrders';

const saveLocalOrder = (order: any) => {
  try {
    const previous = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]');
    const next = [order, ...previous.filter((item: any) => item.id !== order.id)].slice(0, 40);
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('awaz:local-order-created', { detail: order }));
  } catch (error) {
    console.warn('Local order save failed', error);
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>({ type: 'HOME' });
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const [hasApiKey, setHasApiKey] = useState(true);
  const [showTemplatesOnLoad, setShowTemplatesOnLoad] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{ checking: boolean; paid?: boolean; orderId?: string; customerCode?: string; error?: string }>({ checking: false });
  const { t, isRtl, language } = useLanguage();

  useEffect(() => {
    console.log("Current process.env:", process.env);
    const checkApiKey = async () => {
      // @ts-ignore
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        // @ts-ignore
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');
    if (payment === 'success' && sessionId) {
      setView({ type: 'PAYMENT_RETURN', sessionId });
    } else if (payment === 'cancelled') {
      setView({ type: 'PAYMENT_CANCELLED' });
    }
  }, []);

  useEffect(() => {
    if (view.type !== 'PAYMENT_RETURN') return;
    const verifyCheckout = async () => {
      setPaymentResult({ checking: true });
      try {
        await auth.authStateReady();
        const getCheckoutStatus = httpsCallable<{ sessionId: string }, { paid: boolean; orderId?: string; customerCode?: string }>(functions, 'getCheckoutStatus');
        const result = await getCheckoutStatus({ sessionId: view.sessionId });
        setPaymentResult({ checking: false, ...result.data });
      } catch (error) {
        console.error('Could not verify Stripe checkout:', error);
        setPaymentResult({ checking: false, error: isRtl ? 'تایید پرداخت در حال حاضر ممکن نیست. وضعیت سفارش را در داشبورد بررسی کنید.' : 'Payment could not be verified yet. Check the dashboard for order status.' });
      }
    };
    verifyCheckout();
  }, [view, isRtl]);

  useEffect(() => {
    const syncRouteFromHash = () => {
      if (window.location.hash === '#admin') {
        setView({ type: 'ADMIN' });
      }
    };

    syncRouteFromHash();
    window.addEventListener('hashchange', syncRouteFromHash);
    return () => window.removeEventListener('hashchange', syncRouteFromHash);
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success to mitigate race condition
    }
  };

  if (!hasApiKey) {
    return (
      <div className={`min-h-screen bg-[#050505] text-white flex items-center justify-center ${isRtl ? "font-['Vazirmatn']" : "font-sans"}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="max-w-md w-full p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl text-center">
          <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Key className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-2xl font-black mb-4">{t('api_key_needed')}</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            {t('api_key_desc')}
            <br/><br/>
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
              {t('api_key_billing_guide')}
            </a>
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
          >
            {t('api_key_select')}
          </button>
        </div>
      </div>
    );
  }

  // --- Navigation Handlers ---
  const goToHome = () => {
    if (window.location.hash) {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    setShowTemplatesOnLoad(false);
    setView({ type: 'HOME' });
  };
  const goToMockup = () => setView({ type: 'MOCKUP_GENERATOR' });
  const goToDashboard = () => setView({ type: 'DASHBOARD' });
  const goToCustomOrder = () => setView({ type: 'CUSTOM_ORDER' });
  const selectCategory = (categoryId: CategoryId) => setView({ type: 'CATEGORY_SELECT', categoryId });
  const selectTemplate = (template: Template) => setView({ type: 'EDITOR', template });
  const goToAdmin = () => {
    if (window.location.hash !== '#admin') {
      window.location.hash = 'admin';
    }
    setView({ type: 'ADMIN' });
  };
  const handleOrder = (data: any, orderType: 'retail' | 'wholesale', template?: Template) => {
    if (view.type === 'EDITOR') {
      setView({ type: 'ORDER_FORM', template: view.template, data, orderType });
    } else if (view.type === 'MOCKUP_GENERATOR' && template) {
      setView({ type: 'ORDER_FORM', template, data, orderType });
    }
  };
  const handleOrderSubmit = async (order: OrderData) => {
    try {
      const user = auth.currentUser;
      if (!user && !isLocalDemo) {
        alert(t('editor_msg_login_required'));
        return;
      }

      if (isLocalDemo && !user) {
        const demoOrder = {
          ...order,
          userId: 'local-demo-customer',
          userEmail: 'local-demo@awaz.test',
          userName: order.fullName || 'مشتری تست',
          customerCode: 'AWZ-DEMO001',
          createdAt: new Date().toISOString(),
          id: `ORD-${Date.now()}`,
          status: 'awaiting_payment' as const,
          paymentStatus: 'unpaid' as const,
          localDemoOrder: true,
        };
        saveLocalOrder(demoOrder);
        setView({ type: 'ORDER_SUCCESS', order: demoOrder });
        return;
      }

      const createCheckoutSession = httpsCallable<any, { url: string }>(functions, 'createCheckoutSession');
      const checkoutOrder = {
        ...order,
        returnUrl: window.location.origin,
        mockup: order.mockup ? { ...order.mockup, logo: undefined } : undefined,
      };
      const checkout = await createCheckoutSession(checkoutOrder);
      if (!checkout.data.url) throw new Error('Stripe Checkout did not return a payment URL.');
      window.location.assign(checkout.data.url);
    } catch (error) {
      console.error('Error opening Stripe checkout:', error);
      alert(isRtl ? 'اتصال به پرداخت Stripe انجام نشد. لطفا دوباره تلاش کنید.' : 'Could not open Stripe Checkout. Please try again.');
    }
  };

  // --- Render Views ---
  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-[#050505] ${isRtl ? "font-['Vazirmatn']" : "font-sans"}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Show Navbar only on non-fullscreen editor pages */}
      {view.type !== 'EDITOR' && view.type !== 'MOCKUP_GENERATOR' && view.type !== 'DASHBOARD' && view.type !== 'ADMIN' && (
         <Navbar 
           onNavigateHome={goToHome} 
           onNavigateMockup={goToMockup} 
           onNavigateDashboard={goToDashboard}
           onNavigateAdmin={goToAdmin}
         />
      )}

      {view.type === 'HOME' && (
        <>
          {/* Vibrant Jame Jam Inspired Hero Section */}
          <div className="relative min-h-[100svh] flex flex-col overflow-hidden bg-[#050505] pt-20 md:pt-32 pb-12">
            {/* Dynamic Colorful Background (Jame Jam Inspiration) */}
            <div className="absolute inset-0 overflow-hidden">
               {/* Fan-like colorful blobs */}
               <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-red-600/30 rounded-full blur-[120px] animate-pulse"></div>
               <div className="absolute top-[-5%] left-[20%] w-[50%] h-[50%] bg-orange-500/30 rounded-full blur-[120px] animate-pulse delay-75"></div>
               <div className="absolute top-[0%] left-[40%] w-[40%] h-[40%] bg-yellow-400/30 rounded-full blur-[120px] animate-pulse delay-150"></div>
               <div className="absolute top-[10%] left-[60%] w-[40%] h-[40%] bg-green-500/30 rounded-full blur-[120px] animate-pulse delay-300"></div>
               <div className="absolute top-[30%] left-[75%] w-[40%] h-[40%] bg-blue-600/30 rounded-full blur-[120px] animate-pulse delay-500"></div>
               <div className="absolute top-[50%] left-[80%] w-[40%] h-[40%] bg-purple-600/30 rounded-full blur-[120px] animate-pulse delay-700"></div>
               
               <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/20 rounded-full blur-[150px]"></div>
               

               <div className="absolute inset-0 opacity-[0.1] bg-[url('https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?q=80&w=1920&auto=format&fit=crop')] bg-cover bg-center"></div>
               <div className="absolute inset-0 opacity-[0.1] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
               <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 w-full relative z-10 text-center mt-2 mb-auto md:my-auto">
              <div className="flex flex-col items-center">
                <div className="text-center">
                  <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3 bg-white/5 border border-white/10 backdrop-blur-2xl rounded-3xl sm:rounded-full px-4 sm:px-8 py-2 sm:py-3 text-white text-[10px] md:text-sm font-black mb-6 md:mb-12 tracking-[0.1em] sm:tracking-[0.2em] md:tracking-[0.3em] uppercase mx-auto max-w-full text-center"
                  >
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                      <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                      <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </div>
                    <span>{t('section3_title')}</span>
                  </motion.div>
                  
                  <motion.h1 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-4 md:mb-8 leading-tight tracking-tighter"
                    style={{
                      textShadow: '0 10px 30px rgba(0,0,0,0.5)',
                    }}
                  >
                    {t('hero_title').split(' ').map((word, i) => (
                      <span key={i} className={i % 2 !== 0 ? "text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500" : ""}>
                        {word}{' '}
                      </span>
                    ))}
                  </motion.h1>
                  
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-slate-200 text-base md:text-2xl max-w-3xl mx-auto mb-8 md:mb-12 leading-relaxed font-medium drop-shadow-lg"
                  >
                    {t('hero_subtitle')}
                  </motion.p>
                  
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-col sm:flex-row gap-6 justify-center items-center"
                  >
                    <button 
                      onClick={goToCustomOrder}
                      className="group relative px-8 py-3.5 bg-white text-black font-black text-base rounded-full overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] w-full sm:w-auto"
                    >
                      <span className="relative z-10">{t('hero_cta_custom')}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                    </button>
                    
                    <button 
                      onClick={() => selectCategory(CategoryId.GASTRONOMY)}
                      className="px-8 py-3.5 bg-white/5 border border-white/10 backdrop-blur-xl text-white font-black text-base rounded-full hover:bg-white/10 hover:scale-105 transition-all flex items-center justify-center gap-3 w-full sm:w-auto shadow-[0_0_20px_rgba(0,0,0,0.3)]"
                    >
                      <Layout size={20} className="text-white" />
                      <span>{t('hero_cta_catalog')}</span>
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#050505]">
            <CategorySection onSelect={selectCategory} onCustomOrder={goToCustomOrder} />
          </div>

          {/* Creative Design & Advertising Showcase Section (Section 3) */}
          <div className="py-32 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
              <div className={`flex flex-col md:flex-row items-center gap-20 ${isRtl ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className="flex-1 relative">
                  <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transform ${isRtl ? '-rotate-6' : 'rotate-6'} hover:rotate-0 transition-transform duration-1000`}>
                    <div className="h-[550px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                      <img src="https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop" alt="Vibrant Advertising" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="space-y-6">
                      <div className="h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                        <img src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1200&auto=format&fit=crop" alt="Colorful Media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div className="h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                        <img src="https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?q=80&w=1200&auto=format&fit=crop" alt="Creative Branding" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  </div>
                  {/* Decorative blobs */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-400/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
                </div>
                
                <div className={`flex-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="inline-flex items-center gap-2 text-red-600 font-black text-sm uppercase tracking-widest mb-6">
                    <Star className="fill-red-600" size={16} />
                    <span>{t('section3_title')}</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-tight">
                    {t('section3_h2')} <br/>
                    <span className="text-blue-600">{t('section3_h2_span')}</span> {t('section3_brand_suffix')}
                  </h2>
                  <p className="text-slate-600 text-xl leading-relaxed mb-10 font-light">
                    {t('section3_desc')}
                  </p>
                  <div className="space-y-6">
                    <div className={`flex items-center gap-4 ${isRtl ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                      <span className="text-slate-700 font-bold">{t('section3_feature1')}</span>
                      <div className="w-10 h-10 bg-red-100 text-red-600 rounded-xl flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                    <div className={`flex items-center gap-4 ${isRtl ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                      <span className="text-slate-700 font-bold">{t('section3_feature2')}</span>
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                    <div className={`flex items-center gap-4 ${isRtl ? 'justify-end' : 'justify-start flex-row-reverse'}`}>
                      <span className="text-slate-700 font-bold">{t('section3_feature3')}</span>
                      <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
                        <CheckCircle2 size={20} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#050505]">
            <PortfolioSection onSelect={selectTemplate} />
          </div>
          
          {/* Footer */}
          <footer className="bg-slate-900 text-white py-16 border-t-4 border-violet-600">
             <div className="max-w-7xl mx-auto px-4">
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 text-center ${isRtl ? 'md:text-right' : 'md:text-left'}`}>
                  <div>
                    <h3 className="text-2xl font-bold mb-4 text-violet-300">{t('app_name')}</h3>
                    <p className="text-slate-400 leading-loose">
                      {t('footer_desc')}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-4">{t('footer_quick_links')}</h3>
                    <ul className="space-y-2 text-slate-400">
                      <li><button onClick={goToHome} className="hover:text-white">{t('nav_home')}</button></li>
                      <li><button onClick={() => document.getElementById('portfolio')?.scrollIntoView()} className="hover:text-white">{t('nav_portfolio')}</button></li>
                      <li><button className="hover:text-white">{t('nav_services')}</button></li>
                    </ul>
                  </div>
                  <div>
                     <h3 className="text-xl font-bold mb-4">{t('footer_contact')}</h3>
                  </div>
                </div>
                <div className="text-center text-slate-600 text-sm pt-8 border-t border-slate-800">
                  <p>{t('footer_rights')}</p>
                </div>
             </div>
          </footer>
        </>
      )}

      {view.type === 'CATEGORY_SELECT' && (
        <TemplateSelector 
          initialCategory={view.categoryId} 
          onSelect={selectTemplate} 
          onBack={() => {
            setShowTemplatesOnLoad(false);
            setView({ type: 'HOME' });
          }}
          showTemplatesOnLoad={showTemplatesOnLoad}
        />
      )}

      {view.type === 'FAVORITES' && (
        <TemplateSelector 
          initialCategory="FAVORITES"
          onSelect={selectTemplate} 
          onBack={() => {
            setShowTemplatesOnLoad(false);
            setView({ type: 'HOME' });
          }}
          showTemplatesOnLoad={showTemplatesOnLoad}
        />
      )}

      {view.type === 'DASHBOARD' && (
        <Dashboard 
          onBack={goToHome} 
          onSelectTemplate={selectTemplate} 
        />
      )}

      {view.type === 'ADMIN' && (
        <AdminPanel 
          onBack={goToHome} 
        />
      )}


      {view.type === 'EDITOR' && (
        <Editor 
          template={view.template} 
          onBack={() => setView({ type: 'CATEGORY_SELECT', categoryId: view.template.categoryId })} 
          onOrder={handleOrder}
        />
      )}

      {view.type === 'ORDER_FORM' && (
        <OrderForm 
          template={view.template}
          data={view.data}
          orderType={view.orderType}
          onBack={() => setView({ type: 'EDITOR', template: view.template })}
          onSubmit={handleOrderSubmit}
        />
      )}

      {view.type === 'ORDER_SUCCESS' && (
        <div className={`min-h-screen bg-white flex items-center justify-center p-4 text-center`} dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="max-w-md space-y-8 animate-in zoom-in duration-700">
            <div className="w-32 h-32 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-100">
              <CheckCircle2 size={64} />
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-black text-slate-900">{isRtl ? 'سفارش آزمایشی ساخته شد' : 'Demo order created'}</h1>
              <p className="text-slate-500 text-lg">
                {isRtl ? 'در حالت محلی پرداخت واقعی انجام نمی شود. سفارش برای تست پنل با کد' : 'No real payment is taken in local demo mode. Test order code:'} <span className="font-bold text-blue-600">#{view.order.id}</span>
                <br/>
                {isRtl ? 'در پنل ادمین وضعیت پرداخت نشده را خواهید دید.' : 'The admin panel will show it as unpaid.'}
              </p>
            </div>
            <div className="pt-8">
              <button 
                onClick={goToHome}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xl hover:bg-slate-800 transition-all shadow-xl"
              >
                {t('order_success_back')}
              </button>
            </div>
          </div>
        </div>
      )}

      {view.type === 'PAYMENT_RETURN' && (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="max-w-lg space-y-7">
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto ${paymentResult.paid ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
              {paymentResult.checking ? <Clock size={52} className="animate-pulse" /> : <CheckCircle2 size={56} />}
            </div>
            {paymentResult.checking ? (
              <>
                <h1 className="text-3xl font-black text-slate-900">{isRtl ? 'در حال تایید پرداخت...' : 'Confirming your payment...'}</h1>
                <p className="text-slate-500">{isRtl ? 'پرداخت Stripe در حال بررسی و ثبت سفارش شماست.' : 'Stripe payment is being verified and your order is being recorded.'}</p>
              </>
            ) : paymentResult.paid ? (
              <>
                <h1 className="text-4xl font-black text-slate-900">{isRtl ? 'پرداخت موفق بود' : 'Payment successful'}</h1>
                <p className="text-slate-500 text-lg">{isRtl ? 'سفارش شما ثبت شد و در داشبورد قابل پیگیری است.' : 'Your order has been recorded and is now trackable in your dashboard.'}</p>
                {paymentResult.customerCode && <p className="rounded-xl bg-slate-50 p-4 font-bold text-slate-700">{isRtl ? 'کد مشتری:' : 'Customer code:'} {paymentResult.customerCode}</p>}
              </>
            ) : (
              <>
                <h1 className="text-3xl font-black text-slate-900">{isRtl ? 'وضعیت پرداخت در حال بررسی است' : 'Payment is still being checked'}</h1>
                <p className="text-slate-500">{paymentResult.error || (isRtl ? 'برای مشاهده وضعیت نهایی وارد داشبورد شوید.' : 'Open your dashboard to see the final status.')}</p>
              </>
            )}
            <button onClick={goToDashboard} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-slate-800 transition-all">
              {isRtl ? 'مشاهده داشبورد سفارش ها' : 'View order dashboard'}
            </button>
          </div>
        </div>
      )}

      {view.type === 'PAYMENT_CANCELLED' && (
        <div className="min-h-screen bg-white flex items-center justify-center p-4 text-center" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="max-w-md space-y-6">
            <h1 className="text-3xl font-black text-slate-900">{isRtl ? 'پرداخت لغو شد' : 'Payment cancelled'}</h1>
            <p className="text-slate-500">{isRtl ? 'هزینه ای دریافت نشد. می توانید سفارش را دوباره تکمیل کنید.' : 'No payment was taken. You can return and complete your order again.'}</p>
            <button onClick={goToHome} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg">{isRtl ? 'بازگشت به سایت' : 'Return to site'}</button>
          </div>
        </div>
      )}

      {view.type === 'MOCKUP_GENERATOR' && (
        <MockupGenerator onBack={goToHome} onOrder={handleOrder} />
      )}

      {view.type === 'CUSTOM_ORDER' && (
        <CustomOrderForm onBack={goToHome} />
      )}
    </div>
    </ErrorBoundary>
  );
};

export default App;
