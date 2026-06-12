
import React, { useState, useEffect } from 'react';
import { Home, Palette, Shirt, LogIn, LogOut, Layout, Globe, ChevronDown, Shield, Sparkles } from 'lucide-react';
import { Logo2 } from './Logo2';
import { auth, db } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { useLanguage } from '../LanguageContext';
import { Language } from '../translations';
import { refreshAiCreditStatus } from '../services/creditService';

interface NavbarProps {
  onNavigateHome: () => void;
  onNavigateMockup?: () => void;
  onNavigateDashboard: () => void;
  onNavigateAdmin?: () => void;
}

const ROOT_ADMIN_EMAIL = 'awarvandsara@gmail.com';
const PASSWORD_ADMIN_EMAILS = ['adminawaz@gmail.com'];
const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';
const customerCodeFromUid = (uid: string) => `AWZ-${uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`;

const ensureCustomerProfile = async (user: FirebaseUser) => {
  const userRef = doc(db, 'users', user.uid);
  const existingUser = await getDoc(userRef);
  const email = normalizeEmail(user.email);
  const providerIds = user.providerData.map((provider) => provider.providerId);

  await setDoc(userRef, {
    uid: user.uid,
    email,
    displayName: user.displayName || email || 'مشتری آواز',
    photoURL: user.photoURL || null,
    phoneNumber: user.phoneNumber || null,
    providerIds,
    authProvider: providerIds.includes('google.com') ? 'google.com' : providerIds[0] || 'unknown',
    emailVerified: user.emailVerified,
    customerCode: existingUser.exists() && existingUser.data().customerCode
      ? existingUser.data().customerCode
      : customerCodeFromUid(user.uid),
    role: existingUser.exists() ? (existingUser.data().role || 'customer') : 'customer',
    status: existingUser.exists() ? (existingUser.data().status || 'active') : 'active',
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...(existingUser.exists() ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true });
};

export const Navbar: React.FC<NavbarProps> = ({ onNavigateHome, onNavigateMockup, onNavigateDashboard, onNavigateAdmin }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [aiCredits, setAiCredits] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const { language, setLanguage, t, isRtl } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    
    let unsubscribeProfile = () => {};
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribeProfile();
      setUser(user);
      setIsAdmin(false);
      setAiCredits(null);
      if (!user) return;

      try {
        await ensureCustomerProfile(user);
        refreshAiCreditStatus().catch((creditError) => {
          console.warn('AI credit status refresh failed', creditError);
        });
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
          const value = snapshot.data()?.aiCreditsBalance;
          setAiCredits(typeof value === 'number' ? value : null);
        });
        const email = normalizeEmail(user.email);
        const [adminByUid, adminByEmail, userDoc] = await Promise.all([
          getDoc(doc(db, 'admins', user.uid)),
          email ? getDoc(doc(db, 'admins', email)) : Promise.resolve(null),
          getDoc(doc(db, 'users', user.uid)),
        ]);
        setIsAdmin(Boolean(
          email === ROOT_ADMIN_EMAIL ||
          PASSWORD_ADMIN_EMAILS.includes(email) ||
          adminByUid.exists() ||
          adminByEmail?.exists() ||
          (userDoc.exists() && userDoc.data().role === 'admin')
        ));
      } catch (error) {
        console.warn('Admin navbar check failed', error);
      }
    });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      unsubscribe();
      unsubscribeProfile();
    };
  }, []);

  const handleLogin = async () => {
    try {
      console.log("Starting login...");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      try {
        await ensureCustomerProfile(result.user);
      } catch (profileError) {
        console.warn('Signed in, but customer profile setup failed', profileError);
      }
      console.log("Login successful:", result.user);
      onNavigateDashboard();
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        const readableError = error.code === 'auth/popup-blocked'
          ? 'پنجره ورود توسط مرورگر مسدود شد. لطفا اجازه Pop-up را فعال کنید و دوباره امتحان کنید.'
          : error.code === 'auth/unauthorized-domain'
            ? 'دامنه سایت برای ورود Firebase مجاز نشده است.'
            : t('nav_login_error');
        alert(readableError);
      } else {
        console.log("User canceled the login popup.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const scrollToSection = (id: string) => {
    onNavigateHome();
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'fa', label: t('lang_fa') },
    { code: 'en', label: t('lang_en') },
    { code: 'de', label: t('lang_de') },
    { code: 'fr', label: t('lang_fr') },
    { code: 'ar', label: t('lang_ar') },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      isScrolled 
        ? 'bg-black/80 backdrop-blur-2xl border-b border-white/10 py-1 md:py-2' 
        : 'bg-black/40 backdrop-blur-md border-b border-transparent py-2 md:py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 md:h-20 items-center">
          {/* Logo */}
          <div className={`flex items-center cursor-pointer gap-4 ${isRtl ? 'flex-row' : 'flex-row-reverse'}`} onClick={onNavigateHome}>
            <Logo2 className="h-10 w-10 md:h-12 md:w-12" />
          </div>

          {/* Links */}
          <div className="flex items-center gap-3 md:gap-6">
            {/* Language Switcher */}
            <div className="relative">
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-all text-sm font-bold border border-white/10"
              >
                <Globe size={18} />
                <span className="hidden sm:inline uppercase">{language}</span>
                <ChevronDown size={14} className={`transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isLangOpen && (
                <div className={`absolute top-full mt-2 w-40 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-50 ${isRtl ? 'left-0' : 'right-0'}`}>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        setIsLangOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-sm font-bold text-right hover:bg-white/10 transition-colors flex items-center justify-between ${language === lang.code ? 'text-blue-400 bg-white/5' : 'text-slate-300'}`}
                      dir={lang.code === 'fa' || lang.code === 'ar' ? 'rtl' : 'ltr'}
                    >
                      <span>{lang.label}</span>
                      {language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={onNavigateHome}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-all text-sm font-bold group"
            >
              <Home size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline">{t('nav_home')}</span>
            </button>
            
            <button 
              onClick={onNavigateMockup}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-all text-sm font-bold group"
            >
              <Shirt size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline">{t('nav_mockup')}</span>
            </button>

            <button 
              onClick={() => scrollToSection('portfolio')}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-all text-sm font-bold group"
            >
              <Palette size={18} className="group-hover:scale-110 transition-transform" />
              <span className="hidden md:inline">{t('nav_portfolio')}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-4">
                {isAdmin && onNavigateAdmin && (
                  <button
                    onClick={onNavigateAdmin}
                    className="p-2.5 bg-blue-600/15 hover:bg-blue-600/25 rounded-xl text-blue-200 transition-all"
                    title="Admin"
                  >
                    <Shield size={20} />
                  </button>
                )}
                <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-black text-cyan-100">
                  <Sparkles size={14} />
                  <span>{aiCredits ?? '-'}</span>
                </div>
                <button 
                  onClick={onNavigateDashboard}
                  className="relative group flex items-center gap-3"
                  title={t('nav_dashboard')}
                >
                  <div className="relative">
                    <img 
                      src={user.photoURL || ''} 
                      alt={user.displayName || ''} 
                      className="w-10 h-10 rounded-full border-2 border-white/20 group-hover:border-blue-500 transition-all"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-white/20">
                      <Layout size={10} className="text-white" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-300 group-hover:text-white hidden lg:block transition-colors">
                    {t('nav_dashboard')}
                  </span>
                </button>
                <button 
                  onClick={handleLogout}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-all"
                  title={t('nav_logout')}
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-blue-600/20"
              >
                <LogIn size={18} />
                <span className="hidden md:inline">{t('nav_login')}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
