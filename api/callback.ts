import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import crypto from "crypto";

const firebaseConfig = {
  apiKey: "AIzaSyBASkTgAJ7FvM0T9qZUeXOcchgniXCSSGM",
  authDomain: "pak-islam-ef6c8.firebaseapp.com",
  projectId: "pak-islam-ef6c8",
  storageBucket: "pak-islam-ef6c8.firebasestorage.app",
  messagingSenderId: "142412601649",
  appId: "1:142412601649:web:92b052ba6f744508263810"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const JAZZCASH_INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || "x51w84cg85";

function verifyJazzCashHash(payload: any) {
  const receivedHash = payload.pp_SecureHash;
  const sortedKeys = Object.keys(payload).sort();
  let hashString = JAZZCASH_INTEGRITY_SALT;
  for (const key of sortedKeys) {
    if (payload[key] !== "" && key !== "pp_SecureHash") {
      hashString += "&" + payload[key];
    }
  }
  const calculatedHash = crypto
    .createHmac("sha256", JAZZCASH_INTEGRITY_SALT)
    .update(hashString)
    .digest("hex")
    .toUpperCase();
  
  return calculatedHash === receivedHash;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let data: any = {};
  try {
    if (req.method === "POST") {
      if (req.headers["content-type"] === "application/x-www-form-urlencoded") {
        data = req.body;
      } else {
        data = req.body;
      }
    } else {
      data = req.query;
    }

    console.log("JazzCash Callback Received:", data);

    if (!verifyJazzCashHash(data)) {
      console.error("Hash verification failed");
      return res.status(400).send("Invalid Hash");
    }

    const responseCode = data.pp_ResponseCode;
    const responseMessage = data.pp_ResponseMessage;
    const txnRefNo = data.pp_TxnRefNo;
    const uid = data.pp_BillReference;

    if (responseCode === "000") {
      if (uid) {
        await setDoc(doc(db, 'participants', uid), {
          status: "Approved",
          paymentMethod: "JazzCash Mobile Wallet",
          tid: txnRefNo,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        console.log(`Participant ${uid} approved via callback`);
      }
    } else {
      console.log(`Payment failed for ${uid}: ${responseMessage}`);
    }

    const APP_URL = process.env.APP_URL || "";
    return res.redirect(`${APP_URL}/?payment=success&tid=${txnRefNo}`);
  } catch (error: any) {
    console.error("Callback Error:", error);
    return res.status(500).send(error.message);
  }
}
