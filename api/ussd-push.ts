import { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from "crypto";
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBASkTgAJ7FvM0T9qZUeXOcchgniXCSSGM",
  authDomain: "pak-islam-ef6c8.firebaseapp.com",
  projectId: "pak-islam-ef6c8",
  storageBucket: "pak-islam-ef6c8.firebasestorage.app",
  messagingSenderId: "142412601649",
  appId: "1:142412601649:web:92b052ba6f744508263810"
};

// Initialize Firebase once
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const JAZZCASH_MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || "MC656746";
const JAZZCASH_PASSWORD = process.env.JAZZCASH_PASSWORD || "t42522c45t";
const JAZZCASH_INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || "x51w84cg85";
const JAZZCASH_API_URL = process.env.JAZZCASH_API_URL || "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoTransaction";
const APP_URL = process.env.APP_URL || "";

function calculateJazzCashHash(payload: any) {
  const sortedKeys = Object.keys(payload).sort();
  let hashString = JAZZCASH_INTEGRITY_SALT;
  for (const key of sortedKeys) {
    if (payload[key] !== "" && key !== "pp_SecureHash") {
      hashString += "&" + payload[key];
    }
  }
  return crypto
    .createHmac("sha256", JAZZCASH_INTEGRITY_SALT)
    .update(hashString)
    .digest("hex")
    .toUpperCase();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { amount, mobileNumber, cnic, email, uid, participantData } = req.body;

    if (!amount || !mobileNumber || !uid) {
      return res.status(400).json({ error: "Amount, Mobile Number, and UID are required" });
    }

    // Save participant data as pending first
    if (participantData) {
      try {
        await setDoc(doc(db, 'participants', uid), {
          ...participantData,
          uid,
          email,
          paymentMethod: 'jazzcash',
          status: 'pending',
          timestamp: serverTimestamp(),
        }, { merge: true });
      } catch (fsError: any) {
        console.error("Firestore Error:", fsError);
        // Continue even if firestore fails, or return error?
        // Let's return error to be safe
        return res.status(500).json({ error: "Failed to save participant data: " + fsError.message });
      }
    }

    const txnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const expiryDate = new Date(Date.now() + 3600000);
    const txnExpiryDateTime = expiryDate.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const txnRefNo = "T" + txnDateTime;

    const payload: any = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: JAZZCASH_MERCHANT_ID,
      pp_SubMerchantID: "",
      pp_Password: JAZZCASH_PASSWORD,
      pp_BankID: "",
      pp_ProductID: "",
      pp_TxnRefNo: txnRefNo,
      pp_Amount: (parseInt(amount) * 100).toString(),
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: txnDateTime,
      pp_BillReference: uid,
      pp_Description: "JazzCash Mobile Wallet Payment",
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_ReturnURL: `${APP_URL}/api/callback`,
      pp_MobileNumber: mobileNumber,
      pp_CNIC: cnic || "",
      ppmpf_1: mobileNumber,
      ppmpf_2: "",
      ppmpf_3: "",
      ppmpf_4: "",
      ppmpf_5: ""
    };

    payload.pp_SecureHash = calculateJazzCashHash(payload);

    const response = await fetch(JAZZCASH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result: any = await response.json();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("USSD Push Error:", error);
    return res.status(500).json({ error: error.message });
  }
}
