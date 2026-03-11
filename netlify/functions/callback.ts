import { Handler } from "@netlify/functions";
import admin from "firebase-admin";
import crypto from "crypto";

const FIREBASE_PROJECT_ID = 'pak-islam-ef6c8';
const JAZZCASH_INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || "x51w84cg85";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firestore = admin.firestore();

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

export const handler: Handler = async (event) => {
  // JazzCash sends callback as POST with form-encoded data or JSON
  let data: any = {};
  try {
    if (event.httpMethod === "POST") {
      if (event.headers["content-type"] === "application/x-www-form-urlencoded") {
        const params = new URLSearchParams(event.body || "");
        data = Object.fromEntries(params.entries());
      } else {
        data = JSON.parse(event.body || "{}");
      }
    } else {
      data = event.queryStringParameters || {};
    }

    console.log("JazzCash Callback Received:", data);

    if (!verifyJazzCashHash(data)) {
      console.error("Hash verification failed");
      return { statusCode: 400, body: "Invalid Hash" };
    }

    const responseCode = data.pp_ResponseCode;
    const responseMessage = data.pp_ResponseMessage;
    const txnRefNo = data.pp_TxnRefNo;
    const uid = data.pp_BillReference; // We stored UID in BillReference

    if (responseCode === "000") {
      // Success! Update Firestore
      if (uid) {
        await firestore.collection("participants").doc(uid).set({
          status: "Approved",
          paymentMethod: "JazzCash Mobile Wallet",
          tid: txnRefNo,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`Participant ${uid} approved via callback`);
      }
    } else {
      console.log(`Payment failed for ${uid}: ${responseMessage}`);
    }

    // Redirect user back to the app or show success
    const APP_URL = process.env.APP_URL || "";
    return {
      statusCode: 302,
      headers: {
        Location: `${APP_URL}/?payment=success&tid=${txnRefNo}`,
      },
      body: "",
    };
  } catch (error: any) {
    console.error("Callback Error:", error);
    return { statusCode: 500, body: error.message };
  }
};
