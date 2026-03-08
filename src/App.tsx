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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
import { GoogleGenAI, Type } from "@google/genai";
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
  AlertCircle,
  FileDigit,
  MapPin,
  Users,
  FileText,
  Camera,
  Upload,
  Info,
  AlertTriangle,
  Heart,
  Star,
  ShieldCheck,
  Zap,
  Gift
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
  cnicLabel: string;
  addressLabel: string;
  casteLabel: string;
  privacyPolicyLabel: string;
  privacyPolicyAgree: string;
  uploadSlip: string;
  detectingTid: string;
  tidDetected: string;
  tidDetectionError: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  senderInfo: string;
  senderNameLabel: string;
  senderNumberLabel: string;
  invalidSlipError: string;
  transactionTimeLabel: string;
  casteOptional: string;
  paymentNotice: string;
  amountLabel: string;
  lowAmountError: string;
  paymentWarning: string;
  purposeTitle: string;
  purposeDesc: string;
  advantagesTitle: string;
  advantage1: string;
  advantage1Desc: string;
  advantage2: string;
  advantage2Desc: string;
  advantage3: string;
  advantage3Desc: string;
  howToTitle: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  persuasionTitle: string;
  persuasionDesc: string;
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
    adminUpdateAccounts: "Update Payment Accounts",
    cnicLabel: "CNIC Number (00000-0000000-0)",
    addressLabel: "Current Address",
    casteLabel: "Caste / Tribe",
    privacyPolicyLabel: "Privacy Policy",
    privacyPolicyAgree: "I agree to the terms and privacy policy of Pak-Islam Lottery.",
    uploadSlip: "Upload Payment Slip Screenshot",
    detectingTid: "Saving slip...",
    tidDetected: "Slip Uploaded Successfully!",
    tidDetectionError: "Please upload a clear screenshot of your payment.",
    step1: "Personal Info",
    step2: "Additional Details",
    step3: "Sender Info",
    step4: "Payment & Verification",
    senderInfo: "Your Payment Details",
    senderNameLabel: "Sender Account Name",
    senderNumberLabel: "Sender Account Number",
    invalidSlipError: "Invalid payment slip. Please upload a clear screenshot of your transaction.",
    transactionTimeLabel: "Transaction Time",
    casteOptional: "(Optional)",
    paymentNotice: "Please transfer exactly 50 RS to the account below.",
    amountLabel: "Amount Detected",
    lowAmountError: "The detected amount is less than 50 RS. Please transfer the full amount and upload the correct slip.",
    paymentWarning: "Warning: Applications with payments less than 50 RS will be automatically rejected.",
    purposeTitle: "Our Purpose",
    purposeDesc: "Pak-Islam Lottery is dedicated to making the dream of Hajj and Umrah accessible to everyone. We believe that financial constraints should not stand in the way of your spiritual journey.",
    advantagesTitle: "Why Choose Us?",
    advantage1: "100% Transparent",
    advantage1Desc: "Every draw is conducted randomly and shared publicly for complete trust.",
    advantage2: "Secure & Verified",
    advantage2Desc: "Advanced AI verification ensures only legitimate entries are accepted.",
    advantage3: "Life Changing",
    advantage3Desc: "A small contribution of 50 RS can lead to a life-changing spiritual experience.",
    howToTitle: "How to Participate",
    step1Title: "Register",
    step1Desc: "Sign in with Google and fill in your personal details accurately.",
    step2Title: "Payment",
    step2Desc: "Transfer exactly 50 RS to our official accounts provided in the form.",
    step3Title: "Verification",
    step3Desc: "Upload your payment slip. Our AI will verify it instantly.",
    persuasionTitle: "Fulfill Your Umrah Desires",
    persuasionDesc: "Imagine standing in front of the Holy Kaaba. For just 50 RS, you could be the next one chosen for this blessed journey. Don't let this chance slip away!"
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
    adminUpdateAccounts: "ادائیگی کے اکاؤنٹس اپ ڈیٹ کریں",
    cnicLabel: "شناختی کارڈ نمبر (00000-0000000-0)",
    addressLabel: "موجودہ پتہ",
    casteLabel: "قوم / قبیلہ",
    privacyPolicyLabel: "پرائیویسی پالیسی",
    privacyPolicyAgree: "میں پاک اسلام قرعہ اندازی کی شرائط اور پرائیویسی پالیسی سے اتفاق کرتا ہوں۔",
    uploadSlip: "ادائیگی کی رسید کا اسکرین شاٹ اپ لوڈ کریں",
    detectingTid: "رسید محفوظ کی جا رہی ہے...",
    tidDetected: "رسید کامیابی سے اپ لوڈ ہو گئی!",
    tidDetectionError: "براہ کرم اپنی ادائیگی کا واضح اسکرین شاٹ اپ لوڈ کریں۔",
    step1: "ذاتی معلومات",
    step2: "مزید تفصیلات",
    step3: "آپ کی معلومات",
    step4: "ادائیگی اور تصدیق",
    senderInfo: "آپ کی ادائیگی کی تفصیلات",
    senderNameLabel: "بھیجنے والے کا نام",
    senderNumberLabel: "بھیجنے والے کا نمبر",
    invalidSlipError: "غلط رسید۔ براہ کرم اپنی ٹرانزیکشن کا واضح اسکرین شاٹ اپ لوڈ کریں۔",
    transactionTimeLabel: "ٹرانزیکشن کا وقت",
    casteOptional: "(اختیاری)",
    paymentNotice: "براہ کرم نیچے دیے گئے اکاؤنٹ میں ٹھیک 50 روپے منتقل کریں۔",
    amountLabel: "پتہ چلا رقم",
    lowAmountError: "پتہ چلا رقم 50 روپے سے کم ہے۔ براہ کرم پوری رقم منتقل کریں اور صحیح رسید اپ لوڈ کریں۔",
    paymentWarning: "انتباہ: 50 روپے سے کم ادائیگی والی درخواستیں خود بخود مسترد کر دی جائیں گی۔",
    purposeTitle: "ہمارا مقصد",
    purposeDesc: "پاک اسلام قرعہ اندازی کا مقصد حج اور عمرہ کے خواب کو ہر ایک کے لیے ممکن بنانا ہے۔ ہمارا ماننا ہے کہ مالی مشکلات آپ کے روحانی سفر کی راہ میں رکاوٹ نہیں ہونی چاہئیں۔",
    advantagesTitle: "ہمیں کیوں منتخب کریں؟",
    advantage1: "100٪ شفاف",
    advantage1Desc: "ہر قرعہ اندازی مکمل اعتماد کے لیے رینڈم طریقے سے کی جاتی ہے اور عوامی طور پر شیئر کی جاتی ہے۔",
    advantage2: "محفوظ اور تصدیق شدہ",
    advantage2Desc: "جدید AI تصدیق اس بات کو یقینی بناتی ہے کہ صرف جائز اندراجات ہی قبول کیے جائیں۔",
    advantage3: "زندگی بدل دینے والا",
    advantage3Desc: "صرف 50 روپے کا چھوٹا سا تعاون ایک زندگی بدل دینے والے روحانی تجربے کا باعث بن سکتا ہے۔",
    howToTitle: "شرکت کیسے کریں",
    step1Title: "رجسٹریشن",
    step1Desc: "گوگل کے ساتھ سائن ان کریں اور اپنی ذاتی تفصیلات درست طریقے سے پُر کریں۔",
    step2Title: "ادائیگی",
    step2Desc: "فارم میں فراہم کردہ ہمارے آفیشل اکاؤنٹس میں ٹھیک 50 روپے منتقل کریں۔",
    step3Title: "تصدیق",
    step3Desc: "اپنی ادائیگی کی رسید اپ لوڈ کریں۔ ہمارا AI فوری طور پر اس کی تصدیق کرے گا۔",
    persuasionTitle: "اپنی عمرہ کی خواہشات پوری کریں",
    persuasionDesc: "خانہ کعبہ کے سامنے کھڑے ہونے کا تصور کریں۔ صرف 50 روپے میں، آپ اس بابرکت سفر کے لیے منتخب ہونے والے اگلے فرد ہو سکتے ہیں۔ اس موقع کو ہاتھ سے نہ جانے دیں!"
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
    bankDetails: 'Bank Alfalah: 1234-5678-9012',
    enableEasyPaisa: true,
    enableJazzCash: true,
    enableBank: true
  });
  const [winner, setWinner] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0 });
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [autoDrawTime, setAutoDrawTime] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [showTransparencyLog, setShowTransparencyLog] = useState(false);
  const [approvedTokens, setApprovedTokens] = useState<string[]>([]);

  const t = translations[lang];

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const q = query(collection(db, 'participants'));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => d.data());
      const approvedCount = all.filter((p: any) => p.status === 'approved').length;
      setStats({
        total: all.length + 2000 + (approvedCount * 10), // Increase total by 10 for every approval
        approved: approvedCount
      });
      setApprovedTokens(all.filter((p: any) => p.status === 'approved').map((p: any) => p.tokenNumber));
    } catch (error) {
      console.error("Fetch stats error:", error);
    }
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
    // Safety timeout: if auth doesn't respond in 8 seconds, stop loading
    const timer = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
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
      } catch (error) {
        console.error("Auth listener error:", error);
      } finally {
        clearTimeout(timer);
        setLoading(false);
      }
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
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
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Popup was blocked by your browser. Please allow popups for this site.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("This domain is not authorized in Firebase. Please add your Netlify URL to 'Authorized Domains' in Firebase Console.");
      } else {
        setAuthError(error.message);
        alert("Login failed: " + error.message);
      }
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (adminEmail !== ADMIN_EMAIL) {
        alert("Invalid Admin Email");
        return;
      }
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setShowAdminLogin(false);
      setAdminEmail('');
      setAdminPassword('');
    } catch (error: any) {
      console.error("Admin login failed", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // Attempt to create the admin user if it doesn't exist (only for the specific email)
        if (adminEmail === ADMIN_EMAIL && adminPassword === 'zain@zain123') {
          try {
            await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
            setShowAdminLogin(false);
            return;
          } catch (e: any) {
            setAuthError(e.message);
          }
        }
      }
      setAuthError("Invalid credentials. Please use the correct admin password.");
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

            {/* Purpose & Persuasion Section */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Heart className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-emerald-900">{t.purposeTitle}</h3>
                  <p className="text-slate-600 leading-relaxed">{t.purposeDesc}</p>
                </div>

                <div className="bg-emerald-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <div className="relative z-10 space-y-4">
                    <h3 className="text-2xl font-bold">{t.persuasionTitle}</h3>
                    <p className="text-emerald-100/80 leading-relaxed">{t.persuasionDesc}</p>
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <Star className="w-5 h-5 fill-current" />
                      <span>Just 50 RS can change your life!</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <h3 className="text-2xl font-bold text-emerald-900 px-2">{t.advantagesTitle}</h3>
                <div className="space-y-4">
                  {[
                    { title: t.advantage1, desc: t.advantage1Desc, icon: ShieldCheck },
                    { title: t.advantage2, desc: t.advantage2Desc, icon: Zap },
                    { title: t.advantage3, desc: t.advantage3Desc, icon: Gift },
                  ].map((adv, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-emerald-50 hover:border-emerald-200 transition-colors">
                      <div className="shrink-0 w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                        <adv.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-emerald-900">{adv.title}</h4>
                        <p className="text-xs text-slate-500">{adv.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </section>

            {/* How to Participate Section */}
            <section className="bg-white rounded-3xl p-8 border border-emerald-100 shadow-sm space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-emerald-900">{t.howToTitle}</h3>
                <div className="w-20 h-1 bg-emerald-500 mx-auto rounded-full" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                {[
                  { step: "01", title: t.step1Title, desc: t.step1Desc, icon: UserIcon },
                  { step: "02", title: t.step2Title, desc: t.step2Desc, icon: CreditCard },
                  { step: "03", title: t.step3Title, desc: t.step3Desc, icon: Camera },
                ].map((step, i) => (
                  <div key={i} className="relative space-y-4 text-center">
                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto relative">
                      <step.icon className="w-8 h-8" />
                      <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">
                        {step.step}
                      </span>
                    </div>
                    <h4 className="font-bold text-emerald-900">{step.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                    {i < 2 && (
                      <div className="hidden sm:block absolute top-8 -right-4 w-8 h-px bg-emerald-100" />
                    )}
                  </div>
                ))}
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
          {!user && (
            <button 
              onClick={() => setShowAdminLogin(true)}
              className="text-slate-400 text-[10px] hover:text-emerald-600 transition-colors mt-4"
            >
              Admin Access
            </button>
          )}
        </div>
      </footer>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <ShieldAlert className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="text-2xl font-bold text-slate-900">Admin Portal</h3>
                <p className="text-slate-500 text-sm">Authorized personnel only</p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</label>
                  <input 
                    type="email" 
                    value={adminEmail}
                    onChange={e => setAdminEmail(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="admin@example.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Password</label>
                  <input 
                    type="password" 
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
                {authError && <p className="text-red-500 text-xs font-medium">{authError}</p>}
                <button 
                  type="submit"
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-5 h-5" />
                  Login to Dashboard
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAdminLogin(false)}
                  className="w-full text-slate-400 text-sm font-medium hover:text-slate-600"
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
    cnic: '',
    address: '',
    caste: '',
    senderName: '',
    senderNumber: '',
    paymentMethod: 'easypaisa',
    tid: '',
    amount: '',
    slipImage: '',
    agreedToPrivacy: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, slipImage: base64 }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error(error);
      alert("Image upload failed.");
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    
    if (!formData.agreedToPrivacy) {
      alert("Please agree to the privacy policy.");
      return;
    }

    if (!formData.slipImage) {
      alert("Please upload your payment slip screenshot.");
      return;
    }

    if (!formData.amount || Number(formData.amount) < 50) {
      alert(t.lowAmountError);
      return;
    }

    if (!formData.tid || formData.tid.length < 5) {
      alert("Please enter a valid Transaction ID.");
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

  const steps = [
    { id: 1, label: t.step1, icon: UserIcon },
    { id: 2, label: t.step2, icon: FileText },
    { id: 3, label: t.step3, icon: UserIcon },
    { id: 4, label: t.step4, icon: CreditCard }
  ];

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="flex items-center justify-between relative px-2">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
        {steps.map((s) => (
          <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
              step >= s.id ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "bg-white border-2 border-slate-200 text-slate-400"
            )}>
              <s.icon className="w-5 h-5" />
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-wider", step >= s.id ? "text-emerald-700" : "text-slate-400")}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
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
            <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100">
              {t.step2}
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <FileDigit className="w-4 h-4 text-emerald-600" />
                {t.cnicLabel}
              </label>
              <input 
                required
                type="text" 
                placeholder="00000-0000000-0"
                value={formData.cnic}
                onChange={e => {
                  let val = e.target.value.replace(/\D/g, '');
                  if (val.length > 13) val = val.slice(0, 13);
                  let formatted = val;
                  if (val.length > 5) formatted = val.slice(0, 5) + '-' + val.slice(5);
                  if (val.length > 12) formatted = formatted.slice(0, 13) + '-' + formatted.slice(13);
                  setFormData({...formData, cnic: formatted});
                }}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                {t.addressLabel}
              </label>
              <textarea 
                required
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                {t.casteLabel} <span className="text-slate-400 font-normal text-xs">{t.casteOptional}</span>
              </label>
              <input 
                type="text" 
                value={formData.caste}
                onChange={e => setFormData({...formData, caste: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 border border-slate-200 py-4 rounded-xl font-bold hover:bg-slate-50">Back</button>
              <button type="submit" className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
                {t.step3}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-6">
              <p className="text-sm text-emerald-800 font-medium flex items-center gap-2">
                <Info className="w-4 h-4" />
                Please provide your account details from which you will send the payment.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-emerald-600" />
                {t.senderNameLabel}
              </label>
              <input 
                required
                type="text" 
                value={formData.senderName}
                onChange={e => setFormData({...formData, senderName: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-600" />
                {t.senderNumberLabel}
              </label>
              <input 
                required
                type="text" 
                value={formData.senderNumber}
                onChange={e => setFormData({...formData, senderNumber: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(2)} className="flex-1 border border-slate-200 py-4 rounded-xl font-bold hover:bg-slate-50">Back</button>
              <button type="submit" className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2">
                {t.step4}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Warning Banner */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-900">{t.paymentWarning}</p>
                <p className="text-xs text-amber-700">{t.paymentNotice}</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700">{t.paymentMethod}</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'easypaisa', label: t.easyPaisa, icon: CreditCard, enabled: settings.enableEasyPaisa !== false },
                  { id: 'jazzcash', label: t.jazzCash, icon: CreditCard, enabled: settings.enableJazzCash !== false },
                  { id: 'bank', label: t.bankTransfer, icon: CreditCard, enabled: settings.enableBank !== false }
                ].filter(m => m.enabled).map(method => (
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

            <div className="bg-emerald-900 text-white p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">{t.accountDetails}</p>
                  <div className="bg-amber-500 text-white px-2 py-1 rounded-lg text-[10px] font-black animate-pulse">
                    REQUIRED: 50 RS
                  </div>
                </div>
                {formData.paymentMethod === 'easypaisa' && (
                  <div>
                    <p className="text-2xl font-bold tracking-tight">{settings.easyPaisa}</p>
                    <p className="text-sm text-emerald-200 opacity-80">{settings.easyPaisaTitle}</p>
                  </div>
                )}
                {formData.paymentMethod === 'jazzcash' && (
                  <div>
                    <p className="text-2xl font-bold tracking-tight">{settings.jazzCash}</p>
                    <p className="text-sm text-emerald-200 opacity-80">{settings.jazzCashTitle}</p>
                  </div>
                )}
                {formData.paymentMethod === 'bank' && (
                  <p className="text-sm font-medium leading-relaxed">{settings.bankDetails}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                {t.amountLabel}
              </label>
              <input 
                required
                type="number" 
                placeholder="Enter amount sent (e.g. 50)"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                className="w-full border border-slate-200 rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-lg"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Hash className="w-4 h-4 text-emerald-600" />
                  {t.tidLabel}
                </label>
                <label className="cursor-pointer bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-emerald-200 transition-colors flex items-center gap-1">
                  <Camera className="w-3 h-3" />
                  {formData.slipImage ? "Slip Uploaded" : t.uploadSlip}
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              
              <div className="relative">
                <input 
                  required
                  type="text" 
                  placeholder="Enter TID manually"
                  value={formData.tid}
                  onChange={e => setFormData({...formData, tid: e.target.value})}
                  className={cn(
                    "w-full border rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-lg",
                    formData.slipImage ? "border-emerald-500 bg-emerald-50" : "border-slate-200"
                  )}
                />
                {uploading && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-emerald-600 font-bold">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                )}
              </div>
              
              {formData.slipImage && (
                <div className="space-y-2">
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3 h-3" /> Slip uploaded successfully!</p>
                  <div className="w-full h-32 rounded-xl overflow-hidden border border-emerald-100 bg-emerald-50 relative">
                    <img src={formData.slipImage} alt="Slip Preview" className="w-full h-full object-cover opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-white/80 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-700 shadow-sm">Preview Saved</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={formData.agreedToPrivacy}
                  onChange={e => setFormData({...formData, agreedToPrivacy: e.target.checked})}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                    {t.privacyPolicyAgree}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <Info className="w-3 h-3" />
                    Your data is encrypted and secure
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(3)} className="flex-1 border border-slate-200 py-4 rounded-xl font-bold hover:bg-slate-50">Back</button>
              <button 
                type="submit" 
                disabled={submitting || uploading}
                className="flex-[2] bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
              >
                {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                {t.submit}
              </button>
            </div>
          </motion.div>
        )}
      </form>
    </div>
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
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase">EasyPaisa</label>
                  <input 
                    type="checkbox" 
                    checked={settings.enableEasyPaisa !== false}
                    onChange={e => setSettings({...settings, enableEasyPaisa: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
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
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase">JazzCash</label>
                  <input 
                    type="checkbox" 
                    checked={settings.enableJazzCash !== false}
                    onChange={e => setSettings({...settings, enableJazzCash: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
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
              <div className="space-y-2 border-b pb-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 uppercase">Bank Details</label>
                  <input 
                    type="checkbox" 
                    checked={settings.enableBank !== false}
                    onChange={e => setSettings({...settings, enableBank: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <textarea 
                  value={settings.bankDetails}
                  onChange={e => setSettings({...settings, bankDetails: e.target.value})}
                  className="w-full border rounded-xl px-3 py-2 text-sm min-h-[60px]"
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
                {selected.slipImage && (
                  <div className="space-y-2 py-2 border-b">
                    <span className="text-xs font-bold text-slate-500 uppercase">Payment Slip</span>
                    <div className="w-full rounded-xl overflow-hidden border border-slate-200">
                      <img 
                        src={selected.slipImage} 
                        alt="Slip" 
                        className="w-full h-auto cursor-pointer hover:scale-105 transition-transform" 
                        onClick={() => window.open(selected.slipImage)}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 text-center italic">Click image to open full size</p>
                  </div>
                )}
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
                  <span className="text-slate-500">CNIC</span>
                  <span className="font-bold font-mono">{selected.cnic}</span>
                </div>
                <div className="flex flex-col py-2 border-b gap-1">
                  <span className="text-slate-500">Address</span>
                  <span className="font-medium text-sm">{selected.address}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Caste</span>
                  <span className="font-bold">{selected.caste}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Sender Name</span>
                  <span className="font-bold">{selected.senderName}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">Sender Number</span>
                  <span className="font-bold font-mono">{selected.senderNumber}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-slate-500">TID</span>
                  <span className="font-bold text-emerald-600">{selected.tid}</span>
                </div>
                {selected.amount > 0 && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Detected Amount</span>
                    <span className={cn("font-bold", selected.amount >= 50 ? "text-emerald-600" : "text-red-500")}>
                      {selected.amount} RS
                    </span>
                  </div>
                )}
                {selected.transactionTime && (
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Transaction Time</span>
                    <span className="font-medium text-xs">{selected.transactionTime}</span>
                  </div>
                )}
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
