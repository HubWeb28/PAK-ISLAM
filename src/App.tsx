/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc,
  orderBy,
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  Moon, 
  Sun, 
  Languages, 
  LogOut, 
  LayoutDashboard, 
  User as UserIcon, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  Search, 
  ShieldAlert, 
  Trophy, 
  Trash2, 
  Ban, 
  Check, 
  X,
  RefreshCw,
  Phone,
  Hash,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyBASkTgAJ7FvM0T9qZUeXOcchgniXCSSGM",
  authDomain: "pak-islam-ef6c8.firebaseapp.com",
  projectId: "pak-islam-ef6c8",
  storageBucket: "pak-islam-ef6c8.firebasestorage.app",
  messagingSenderId: "142412601649",
  appId: "1:142412601649:web:92b052ba6f744508263810"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// --- Constants ---
const ADMIN_EMAIL = 'marvelzain43@gmail.com';
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// --- Types ---
type Language = 'en' | 'ur';

interface Translation {
  title: string;
  subtitle: string;
  applyNow: string;
  adminPanel: string;
  logout: string;
  loginWithGoogle: string;
  statusTracker: string;
  searchPlaceholder: string;
  searchButton: string;
  paymentMethod: string;
  tidLabel: string;
  submit: string;
  pending: string;
  approved: string;
  rejected: string;
  blacklisted: string;
  tokenNumber: string;
  whatsappLabel: string;
  nameLabel: string;
  countdownLabel: string;
  sessionExpired: string;
  usedTidError: string;
  deviceLockError: string;
  successMessage: string;
  winnerTitle: string;
  noWinnerYet: string;
  easyPaisa: string;
  jazzCash: string;
  bankTransfer: string;
  accountDetails: string;
  adminPending: string;
  adminApproved: string;
  adminRejected: string;
  adminBlacklist: string;
  adminSettings: string;
  adminReset: string;
  adminPickWinner: string;
  adminUpdateAccounts: string;
}

const translations: Record<Language, Translation> = {
  en: {
    title: "Pak-Islam Hajj & Umrah Lottery",
    subtitle: "Your journey to the holy lands starts here. Secure, transparent, and blessed.",
    applyNow: "Apply for Lottery",
    adminPanel: "Admin Dashboard",
    logout: "Logout",
    loginWithGoogle: "Sign in with Google",
    statusTracker: "Track Your Application",
    searchPlaceholder: "Enter your WhatsApp or TID",
    searchButton: "Search",
    paymentMethod: "Select Payment Method",
    tidLabel: "Transaction ID (TID)",
    submit: "Submit Application",
    pending: "Pending Verification",
    approved: "Approved",
    rejected: "Rejected",
    blacklisted: "Device/Email Blacklisted",
    tokenNumber: "Token Number",
    whatsappLabel: "WhatsApp Number",
    nameLabel: "Full Name",
    countdownLabel: "Session expires in:",
    sessionExpired: "Session expired. Please restart your application.",
    usedTidError: "This TID has already been used.",
    deviceLockError: "This device is already linked to another account.",
    successMessage: "Application submitted successfully! Please wait for approval.",
    winnerTitle: "Current Round Winner",
    noWinnerYet: "The winner for this round will be announced soon.",
    easyPaisa: "EasyPaisa",
    jazzCash: "JazzCash",
    bankTransfer: "Bank Transfer",
    accountDetails: "Send payment to:",
    adminPending: "Pending Queue",
    adminApproved: "Approved Participants",
    adminRejected: "Rejected Entries",
    adminBlacklist: "Blacklisted Users",
    adminSettings: "Account Settings",
    adminReset: "Nuclear Reset (Clear All Data)",
    adminPickWinner: "Pick Random Winner",
    adminUpdateAccounts: "Update Payment Accounts"
  },
  ur: {
    title: "پاک اسلام حج و عمرہ قرعہ اندازی",
    subtitle: "مقدس مقامات کا آپ کا سفر یہاں سے شروع ہوتا ہے۔ محفوظ، شفاف اور بابرکت۔",
    applyNow: "قرعہ اندازی کے لیے اپلائی کریں",
    adminPanel: "ایڈمن ڈیش بورڈ",
    logout: "لاگ آؤٹ",
    loginWithGoogle: "گوگل کے ساتھ سائن ان کریں",
    statusTracker: "اپنی درخواست ٹریک کریں",
    searchPlaceholder: "اپنا واٹس ایپ یا TID درج کریں",
    searchButton: "تلاش کریں",
    paymentMethod: "ادائیگی کا طریقہ منتخب کریں",
    tidLabel: "ٹرانزیکشن آئی ڈی (TID)",
    submit: "درخواست جمع کروائیں",
    pending: "تصدیق کے منتظر",
    approved: "منظور شدہ",
    rejected: "مسترد شدہ",
    blacklisted: "ڈیوائس/ای میل بلیک لسٹ کر دی گئی ہے",
    tokenNumber: "ٹوکن نمبر",
    whatsappLabel: "واٹس ایپ نمبر",
    nameLabel: "پورا نام",
    countdownLabel: "سیشن ختم ہونے میں وقت:",
    sessionExpired: "سیشن ختم ہو گیا ہے۔ براہ کرم اپنی درخواست دوبارہ شروع کریں۔",
    usedTidError: "یہ TID پہلے ہی استعمال ہو چکی ہے۔",
    deviceLockError: "یہ ڈیوائس پہلے ہی دوسرے اکاؤنٹ سے منسلک ہے۔",
    successMessage: "درخواست کامیابی کے ساتھ جمع ہو گئی! براہ کرم منظوری کا انتظار کریں۔",
    winnerTitle: "موجودہ راؤنڈ کا فاتح",
    noWinnerYet: "اس راؤنڈ کے فاتح کا اعلان جلد کیا جائے گا۔",
    easyPaisa: "ایزی پیسہ",
    jazzCash: "جاز کیش",
    bankTransfer: "بینک ٹرانسفر",
    accountDetails: "ادائیگی اس پر بھیجیں:",
    adminPending: "زیر التواء فہرست",
    adminApproved: "منظور شدہ شرکاء",
    adminRejected: "مسترد شدہ اندراجات",
    adminBlacklist: "بلیک لسٹ صارفین",
    adminSettings: "اکاؤنٹ کی ترتیبات",
    adminReset: "نیوکلیئر ری سیٹ (تمام ڈیٹا صاف کریں)",
    adminPickWinner: "رینڈم فاتح منتخب کریں",
    adminUpdateAccounts: "ادائیگی کے اکاؤنٹس اپ ڈیٹ کریں"
  }
};

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<Language>('en');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    easyPaisa: '03178308476',
    easyPaisaTitle: 'Pak Islam',
    jazzCash: '03047321935',
    jazzCashTitle: 'Pak Islam',
    bankDetails: 'Bank Alfalah: 1234-5678-9012'
  });
  const [winner, setWinner] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0 });
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [autoDrawTime, setAutoDrawTime] = useState<string>('');

  const [showTransparencyLog, setShowTransparencyLog] = useState(false);
  const [approvedTokens, setApprovedTokens] = useState<string[]>([]);

  const t = translations[lang];

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    const q = query(collection(db, 'participants'));
    const snap = await getDocs(q);
    const all = snap.docs.map(d => d.data());
    setStats({
      total: all.length + 2000,
      approved: all.filter((p: any) => p.status === 'approved').length
    });
    setApprovedTokens(all.filter((p: any) => p.status === 'approved').map((p: any) => p.tokenNumber));
  }, []);

  // Initialize Device Token
  useEffect(() => {
    let token = localStorage.getItem('deviceToken');
    if (!token) {
      token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('deviceToken', token);
    }
    setDeviceToken(token);
    fetchStats();
  }, [fetchStats]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setIsAdmin(u.email === ADMIN_EMAIL);
        // Check device lock
        if (deviceToken) {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          if (userDoc.exists()) {
            if (userDoc.data().deviceToken !== deviceToken) {
              // Device mismatch - but only if not admin
              if (u.email !== ADMIN_EMAIL) {
                alert(t.deviceLockError);
                signOut(auth);
              }
            }
          } else {
            await setDoc(doc(db, 'users', u.uid), {
              email: u.email,
              deviceToken: deviceToken,
              createdAt: serverTimestamp()
            });
          }
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [deviceToken, lang, t.deviceLockError]);

  // Fetch Settings & Winner
  useEffect(() => {
    const fetchData = async () => {
      const settingsDoc = await getDoc(doc(db, 'settings', 'accounts'));
      if (settingsDoc.exists()) {
        const data = settingsDoc.data() as any;
        setSettings(data);
        if (data.autoDrawTime) setAutoDrawTime(data.autoDrawTime);
      }
      const winnerDoc = await getDoc(doc(db, 'winners', 'current'));
      if (winnerDoc.exists()) {
        setWinner(winnerDoc.data());
      }
    };
    fetchData();
  }, []);

  // Auto-Draw Check
  useEffect(() => {
    if (autoDrawTime) {
      const timer = setInterval(async () => {
        const now = new Date().getTime();
        const drawDate = new Date(autoDrawTime).getTime();
        if (now >= drawDate) {
          // Trigger draw if admin is online or next time admin opens app
          // For true automation, this would usually be a Cloud Function, 
          // but we can trigger it here for the admin.
          if (isAdmin && !winner) {
            console.log("Auto-draw triggered");
            // Logic to pick winner would go here
          }
        }
      }, 60000);
      return () => clearInterval(timer);
    }
  }, [autoDrawTime, isAdmin, winner]);

  // Countdown Logic
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setInterval(() => setCountdown(c => (c ? c - 1 : 0)), 1000);
      return () => clearInterval(timer);
    } else if (countdown === 0) {
      setShowApply(false);
      setCountdown(null);
      alert(t.sessionExpired);
    }
  }, [countdown, lang]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleApply = () => {
    if (!user) {
      handleLogin();
      return;
    }
    setShowApply(true);
    setCountdown(SESSION_TIMEOUT_MS / 1000);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'participants'),
        where('whatsapp', '==', searchQuery)
      );
      const q2 = query(
        collection(db, 'participants'),
        where('tid', '==', searchQuery)
      );
      
      const [snap1, snap2] = await Promise.all([getDocs(q), getDocs(q2)]);
      const results = [...snap1.docs, ...snap2.docs];
      
      if (results.length > 0) {
        setSearchResult(results[0].data());
      } else {
        setSearchResult(null);
        alert("No application found.");
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-emerald-50 font-sans text-slate-900", lang === 'ur' && "text-right rtl")}>
      {/* Header */}
      <header className="bg-white border-b border-emerald-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <Moon className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-emerald-800 hidden sm:block">{t.title}</h1>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLang(l => l === 'en' ? 'ur' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-50 transition-colors text-sm font-medium"
            >
              <Languages className="w-4 h-4" />
              {lang === 'en' ? 'اردو' : 'English'}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                {isAdmin && (
                  <button 
                    onClick={() => setShowAdmin(!showAdmin)}
                    className="p-2 rounded-full hover:bg-emerald-50 text-emerald-700 transition-colors"
                    title={t.adminPanel}
                  >
                    <LayoutDashboard className="w-5 h-5" />
                  </button>
                )}
                <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-emerald-200" />
                <button onClick={() => signOut(auth)} className="p-2 rounded-full hover:bg-red-50 text-red-600 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-sm"
              >
                <UserIcon className="w-4 h-4" />
                {t.loginWithGoogle}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {showAdmin && isAdmin ? (
          <AdminDashboard 
            t={t} 
            lang={lang} 
            settings={settings} 
            setSettings={setSettings} 
            onClose={() => setShowAdmin(false)} 
          />
        ) : (
          <>
            {/* Hero Section */}
            <section className="text-center py-12 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h2 className="text-4xl sm:text-5xl font-extrabold text-emerald-900 tracking-tight">
                  {t.title}
                </h2>
                <p className="text-lg text-emerald-700 max-w-2xl mx-auto">
                  {t.subtitle}
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button 
                  onClick={handleApply}
                  className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-emerald-700 hover:scale-105 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-6 h-6" />
                  {t.applyNow}
                </button>
              </div>
            </section>

            {/* Transparency Section */}
            <section className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Total Entries", value: stats.total, icon: UserIcon },
                  { label: "Approved", value: stats.approved, icon: CheckCircle },
                  { label: "Transparency", value: "100%", icon: ShieldAlert },
                  { label: "Status", value: "Active", icon: RefreshCw },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl border border-emerald-100 text-center space-y-1">
                    <stat.icon className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-emerald-900">{stat.value}</p>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">{stat.label}</p>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowTransparencyLog(true)}
                className="w-full bg-white border border-emerald-200 text-emerald-700 py-3 rounded-xl font-bold text-sm hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                View Public Transparency Log
              </button>
            </section>

            {/* Transparency Log Modal */}
            <AnimatePresence>
              {showTransparencyLog && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                  >
                    <div className="p-6 border-b flex justify-between items-center bg-emerald-600 text-white">
                      <h3 className="text-xl font-bold">Approved Tokens</h3>
                      <button onClick={() => setShowTransparencyLog(false)}><X /></button>
                    </div>
                    <div className="p-6 max-h-[60vh] overflow-y-auto">
                      <p className="text-sm text-slate-500 mb-4">This log shows all approved tokens for the current round. For privacy, only the token numbers are displayed.</p>
                      <div className="grid grid-cols-2 gap-2">
                        {approvedTokens.length > 0 ? approvedTokens.map((token, i) => (
                          <div key={i} className="bg-emerald-50 border border-emerald-100 p-2 rounded-lg text-center font-mono font-bold text-emerald-800">
                            {token}
                          </div>
                        )) : (
                          <p className="col-span-2 text-center text-slate-400 italic">No approved tokens yet.</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Winner Display */}
            <section className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-32 h-32 text-emerald-600" />
              </div>
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <div className="bg-emerald-100 text-emerald-700 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                  {t.winnerTitle}
                </div>
                {winner ? (
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-emerald-900">{winner.name}</h3>
                    <p className="text-emerald-600 font-mono text-xl">{winner.tokenNumber}</p>
                  </div>
                ) : (
                  <p className="text-slate-500 italic">{t.noWinnerYet}</p>
                )}
              </div>
            </section>

            {/* Status Tracker */}
            {user && (
              <section className="bg-emerald-900 text-white rounded-3xl p-8 shadow-xl">
                <div className="max-w-xl mx-auto space-y-6">
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-bold">{t.statusTracker}</h3>
                    <p className="text-emerald-300">{t.searchPlaceholder}</p>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-white placeholder:text-white/40"
                    />
                    <button 
                      onClick={handleSearch}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
                    >
                      <Search className="w-5 h-5" />
                      <span className="hidden sm:inline">{t.searchButton}</span>
                    </button>
                  </div>

                  {searchResult && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white text-slate-900 rounded-2xl p-6 space-y-4"
                    >
                      <div className="flex justify-between items-center border-b pb-4">
                        <span className="text-slate-500">{t.nameLabel}</span>
                        <span className="font-bold">{searchResult.name}</span>
                      </div>
                      <div className="flex justify-between items-center border-b pb-4">
                        <span className="text-slate-500">Status</span>
                        <StatusBadge status={searchResult.status} t={t} />
                      </div>
                      {searchResult.tokenNumber && (
                        <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-xl">
                          <span className="text-emerald-700 font-medium">{t.tokenNumber}</span>
                          <span className="text-2xl font-mono font-bold text-emerald-900">{searchResult.tokenNumber}</span>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Apply Modal */}
      <AnimatePresence>
        {showApply && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={cn("bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden", lang === 'ur' && "rtl")}
            >
              <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 animate-pulse" />
                  <div>
                    <p className="text-xs text-emerald-100 uppercase font-bold tracking-widest">{t.countdownLabel}</p>
                    <p className="text-2xl font-mono font-bold">{formatTime(countdown || 0)}</p>
                  </div>
                </div>
                <button onClick={() => setShowApply(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8">
                <ApplyForm 
                  t={t} 
                  lang={lang} 
                  user={user!} 
                  deviceToken={deviceToken!} 
                  settings={settings}
                  onSuccess={() => {
                    setShowApply(false);
                    setCountdown(null);
                    alert(t.successMessage);
                  }} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-white border-t border-emerald-100 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <div className="flex justify-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <p className="text-slate-500 text-sm">© 2026 Pak-Islam Lottery. All rights reserved.</p>
          <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest">Authorized & Secure Platform</p>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-Components ---

function StatusBadge({ status, t }: { status: string, t: Translation }) {
  const styles: any = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    blacklisted: "bg-slate-900 text-white"
  };
  const labels: any = {
    pending: t.pending,
    approved: t.approved,
    rejected: t.rejected,
    blacklisted: t.blacklisted
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-xs font-bold uppercase", styles[status])}>
      {labels[status]}
    </span>
  );
}

function ApplyForm({ t, lang, user, deviceToken, settings, onSuccess }: any) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: user.displayName || '',
    whatsapp: '',
    paymentMethod: 'easypaisa',
    tid: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    
    setSubmitting(true);
    try {
      // Check if TID exists
      const q = query(collection(db, 'participants'), where('tid', '==', formData.tid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        alert(t.usedTidError);
        setSubmitting(false);
        return;
      }

      // Check if user already applied
      const qUser = query(collection(db, 'participants'), where('email', '==', user.email));
      const snapUser = await getDocs(qUser);
      if (!snapUser.empty) {
        alert("You have already submitted an application.");
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, 'participants'), {
        ...formData,
        email: user.email,
        uid: user.uid,
        deviceToken,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      onSuccess();
    } catch (e) {
      console.error(e);
      alert("Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-emerald-600" />
              {t.nameLabel}
            </label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" />
              {t.whatsappLabel}
            </label>
            <input 
              required
              type="tel" 
              placeholder="03xx-xxxxxxx"
              value={formData.whatsapp}
              onChange={e => setFormData({...formData, whatsapp: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
            Next
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-700">{t.paymentMethod}</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'easypaisa', label: t.easyPaisa, icon: CreditCard },
                { id: 'jazzcash', label: t.jazzCash, icon: CreditCard },
                { id: 'bank', label: t.bankTransfer, icon: CreditCard }
              ].map(method => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: method.id})}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                    formData.paymentMethod === method.id ? "border-emerald-600 bg-emerald-50" : "border-slate-100 hover:border-emerald-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <method.icon className={cn("w-5 h-5", formData.paymentMethod === method.id ? "text-emerald-600" : "text-slate-400")} />
                    <span className="font-bold">{method.label}</span>
                  </div>
                  {formData.paymentMethod === method.id && <Check className="w-5 h-5 text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.accountDetails}</p>
            {formData.paymentMethod === 'easypaisa' && (
              <div>
                <p className="text-lg font-bold text-emerald-800">{settings.easyPaisa}</p>
                <p className="text-sm text-slate-600">{settings.easyPaisaTitle}</p>
              </div>
            )}
            {formData.paymentMethod === 'jazzcash' && (
              <div>
                <p className="text-lg font-bold text-emerald-800">{settings.jazzCash}</p>
                <p className="text-sm text-slate-600">{settings.jazzCashTitle}</p>
              </div>
            )}
            {formData.paymentMethod === 'bank' && (
              <p className="text-sm font-medium text-slate-700">{settings.bankDetails}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Hash className="w-4 h-4 text-emerald-600" />
              {t.tidLabel}
            </label>
            <input 
              required
              type="text" 
              placeholder="e.g. 123456789"
              value={formData.tid}
              onChange={e => setFormData({...formData, tid: e.target.value})}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="flex-1 border border-slate-200 py-4 rounded-xl font-bold hover:bg-slate-50">Back</button>
            <button 
              type="submit" 
              disabled={submitting}
              className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {t.submit}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function AdminDashboard({ t, lang, settings, setSettings, onClose }: any) {
  const [participants, setParticipants] = useState<any[]>([]);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    const q = query(collection(db, 'participants'), orderBy('timestamp', 'desc'));
    const snap = await getDocs(q);
    setParticipants(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  const handleAction = async (id: string, action: string) => {
    const p = participants.find(x => x.id === id);
    if (!p) return;

    try {
      if (action === 'approve') {
        const tokenNumber = `PK-${Math.floor(100 + Math.random() * 900)}`;
        await updateDoc(doc(db, 'participants', id), { status: 'approved', tokenNumber });
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'participants', id), { status: 'rejected' });
      } else if (action === 'blacklist') {
        await updateDoc(doc(db, 'participants', id), { status: 'blacklisted' });
        await setDoc(doc(db, 'blacklist', p.email), { email: p.email, deviceToken: p.deviceToken, timestamp: serverTimestamp() });
      }
      fetchParticipants();
      setSelected(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'accounts'), settings);
      alert("Settings updated!");
    } catch (e) {
      console.error(e);
    }
  };

  const pickWinner = async () => {
    const approved = participants.filter(p => p.status === 'approved');
    if (approved.length === 0) {
      alert("No approved participants to pick from.");
      return;
    }
    const winner = approved[Math.floor(Math.random() * approved.length)];
    await setDoc(doc(db, 'winners', 'current'), {
      name: winner.name,
      tokenNumber: winner.tokenNumber,
      timestamp: serverTimestamp()
    });
    alert(`Winner picked: ${winner.name}`);
    window.location.reload();
  };

  const nuclearReset = async () => {
    if (!confirm("ARE YOU SURE? This will delete ALL participant data!")) return;
    try {
      const batch = writeBatch(db);
      participants.forEach(p => {
        batch.delete(doc(db, 'participants', p.id));
      });
      await batch.commit();
      alert("All data cleared.");
      fetchParticipants();
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = participants.filter(p => p.status === tab);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-emerald-900">{t.adminPanel}</h2>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-900"><X /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['pending', 'approved', 'rejected', 'blacklisted'].map(s => (
              <button 
                key={s}
                onClick={() => setTab(s)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all",
                  tab === s ? "bg-emerald-600 text-white shadow-md" : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
                )}
              >
                {s.toUpperCase()} ({participants.filter(p => p.status === s).length})
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-emerald-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-emerald-50 text-emerald-800 text-xs uppercase font-bold">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">WhatsApp</th>
                    <th className="px-6 py-4">TID</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center"><RefreshCw className="animate-spin mx-auto" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400 italic">No entries found.</td></tr>
                  ) : filtered.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
                      <td className="px-6 py-4 font-medium">{p.name}</td>
                      <td className="px-6 py-4 font-mono text-sm">{p.whatsapp}</td>
                      <td className="px-6 py-4 font-mono text-sm text-emerald-600">{p.tid}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"><Search className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-6">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
              {t.adminSettings}
            </h3>
            <form onSubmit={handleUpdateAccounts} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Auto-Draw Date/Time</label>
                <input 
                  type="datetime-local" 
                  value={settings.autoDrawTime || ''}
                  onChange={e => setSettings({...settings, autoDrawTime: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">EasyPaisa</label>
                <input 
                  type="text" 
                  value={settings.easyPaisa}
                  onChange={e => setSettings({...settings, easyPaisa: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
                <input 
                  type="text" 
                  value={settings.easyPaisaTitle}
                  onChange={e => setSettings({...settings, easyPaisaTitle: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="Account Title"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">JazzCash</label>
                <input 
                  type="text" 
                  value={settings.jazzCash}
                  onChange={e => setSettings({...settings, jazzCash: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                />
                <input 
                  type="text" 
                  value={settings.jazzCashTitle}
                  onChange={e => setSettings({...settings, jazzCashTitle: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="Account Title"
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700">
                Update Settings
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
            <button 
              onClick={pickWinner}
              className="w-full bg-amber-500 text-white py-4 rounded-xl font-bold hover:bg-amber-600 flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
            >
              <Trophy className="w-5 h-5" />
              {t.adminPickWinner}
            </button>
            <button 
              onClick={nuclearReset}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-bold hover:bg-red-700 flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              {t.adminReset}
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-bold">Participant Details</h3>
                <button onClick={() => setSelected(null)}><X /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Name</span>
                  <span className="font-bold">{selected.name}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Email</span>
                  <span className="font-bold text-sm">{selected.email}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">WhatsApp</span>
                  <span className="font-bold">{selected.whatsapp}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">TID</span>
                  <span className="font-bold text-emerald-600">{selected.tid}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Device Token</span>
                  <span className="font-mono text-[10px] bg-slate-100 p-1 rounded">{selected.deviceToken}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Status</span>
                  <StatusBadge status={selected.status} t={t} />
                </div>
                
                <div className="pt-4 flex gap-2">
                  {selected.status === 'pending' && (
                    <>
                      <button onClick={() => handleAction(selected.id, 'approve')} className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold">Approve</button>
                      <button onClick={() => handleAction(selected.id, 'reject')} className="flex-1 bg-red-100 text-red-600 py-3 rounded-xl font-bold">Reject</button>
                    </>
                  )}
                  <button onClick={() => handleAction(selected.id, 'blacklist')} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold">Blacklist</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
