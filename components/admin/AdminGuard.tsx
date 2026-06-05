import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { ArrowRight, LogIn, LogOut, Shield } from 'lucide-react';

const ROOT_ADMIN_EMAIL = 'awarvandsara@gmail.com';
const PASSWORD_ADMIN_EMAILS = ['adminawaz@gmail.com'];

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';

export const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [authError, setAuthError] = useState('');
  const [emailLogin, setEmailLogin] = useState({ email: 'adminawaz@gmail.com', password: '' });
  const [isEmailSigningIn, setIsEmailSigningIn] = useState(false);

  useEffect(() => {
    const checkAdmin = async (activeUser: FirebaseUser | null) => {
      setUser(activeUser);
      if (!activeUser) {
        setIsAdmin(false);
        return;
      }
      try {
        const email = normalizeEmail(activeUser.email);
        if ((email === ROOT_ADMIN_EMAIL && activeUser.emailVerified) || PASSWORD_ADMIN_EMAILS.includes(email)) {
          setIsAdmin(true);
          return;
        }
        const [adminByUid, adminByEmail, userDoc] = await Promise.all([
          getDoc(doc(db, 'admins', activeUser.uid)),
          email ? getDoc(doc(db, 'admins', email)) : Promise.resolve(null),
          getDoc(doc(db, 'users', activeUser.uid)),
        ]);
        const hasUserRole = userDoc.exists() && userDoc.data().role === 'admin';
        setIsAdmin(Boolean(adminByUid.exists() || adminByEmail?.exists() || hasUserRole));
      } catch (error) {
        console.error("Admin check failed", error);
        setIsAdmin(false);
      }
    };

    return onAuthStateChanged(auth, checkAdmin);
  }, []);

  const signInWithPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setAuthError('');
      setIsEmailSigningIn(true);
      await signInWithEmailAndPassword(auth, normalizeEmail(emailLogin.email), emailLogin.password);
    } catch (error: any) {
      console.error('Admin password login failed', error);
      const message = error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found'
        ? 'ایمیل یا رمز عبور ادمین درست نیست.'
        : error.code === 'auth/operation-not-allowed'
          ? 'ورود با Email/Password در Firebase فعال نیست.'
          : 'ورود با ایمیل انجام نشد. دوباره امتحان کنید.';
      setAuthError(message);
    } finally {
      setIsEmailSigningIn(false);
    }
  };

  if (isAdmin === null) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading admin access...</div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 px-4 text-white flex items-center justify-center" dir="rtl">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/15 text-blue-300">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-black">ورود به پنل مدیریت</h1>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {user ? 'این حساب دسترسی ادمین ندارد.' : 'برای مدیریت سفارش ها با حساب ادمین وارد شوید.'}
          </p>
          {authError && <p className="mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{authError}</p>}
          {user ? (
            <button onClick={() => signOut(auth)} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 font-black hover:bg-white/15">
              <LogOut size={18} /> خروج از حساب
            </button>
          ) : (
            <form onSubmit={signInWithPassword} className="mt-7 space-y-3 text-right">
              <label className="block">
                <span className="text-xs font-bold text-slate-400">ایمیل ادمین</span>
                <input
                  type="email"
                  value={emailLogin.email}
                  onChange={(event) => setEmailLogin((current) => ({ ...current, email: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white outline-none focus:border-blue-400"
                  dir="ltr"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-400">رمز عبور</span>
                <input
                  type="password"
                  value={emailLogin.password}
                  onChange={(event) => setEmailLogin((current) => ({ ...current, password: event.target.value }))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-white outline-none focus:border-blue-400"
                  dir="ltr"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button disabled={isEmailSigningIn} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-black hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-slate-700">
                <LogIn size={18} /> {isEmailSigningIn ? 'در حال ورود...' : 'ورود با ایمیل'}
              </button>
            </form>
          )}
          <a href="/" className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
            <ArrowRight size={16} /> بازگشت به سایت
          </a>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};
