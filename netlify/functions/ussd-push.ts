import { Handler } from "@netlify/functions";
import crypto from "crypto";
import fetch from "node-fetch";
import admin from "firebase-admin";

const FIREBASE_PROJECT_ID = 'pak-islam-ef6c8';
const JAZZCASH_MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || "MC656746";
const JAZZCASH_PASSWORD = process.env.JAZZCASH_PASSWORD || "t42522c45t";
const JAZZCASH_INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || "x51w84cg85";
const JAZZCASH_API_URL = process.env.JAZZCASH_API_URL || "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoTransaction";
const APP_URL = process.env.APP_URL || "";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firestore = admin.firestore();

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

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { amount, mobileNumber, cnic, email, uid, participantData } = JSON.parse(event.body || "{}");

    if (!amount || !mobileNumber || !uid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Amount, Mobile Number, and UID are required" }),
      };
    }

    // Save participant data as pending first
    if (participantData) {
      await firestore.collection('participants').doc(uid).set({
        ...participantData,
        uid,
        email,
        paymentMethod: 'jazzcash',
        status: 'pending',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
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
      pp_ReturnURL: `${APP_URL}/api/payment/callback`,
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

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error("USSD Push Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
