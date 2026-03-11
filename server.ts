import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import crypto from "crypto";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_EMAIL = 'marvelzain43@gmail.com';
const FIREBASE_PROJECT_ID = 'pak-islam-ef6c8';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT_ID,
  });
}
const firestore = admin.firestore();

const client = jwksClient({
  jwksUri: `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key: any) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Initialize SQLite
  const db = await open({
    filename: "./database.sqlite",
    driver: sqlite3.Database,
  });

  // Test database connection
  try {
    await db.get("SELECT 1");
    console.log("Database connection successful");
  } catch (e) {
    console.error("Database connection failed:", e);
  }

  // ... (tables creation remains the same)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT,
      email TEXT,
      name TEXT,
      whatsapp TEXT,
      cnic TEXT,
      address TEXT,
      caste TEXT,
      gender TEXT,
      dob TEXT,
      passport TEXT,
      emergencyName TEXT,
      emergencyNumber TEXT,
      senderName TEXT,
      senderNumber TEXT,
      paymentMethod TEXT,
      tid TEXT UNIQUE,
      slipImage TEXT,
      status TEXT DEFAULT 'pending',
      tokenNumber TEXT,
      deviceToken TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS winners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participantId INTEGER,
      roundDate DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(participantId) REFERENCES participants(id)
    );
  `);

  // Middleware to verify Firebase ID Token
  const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, getKey, {
      audience: FIREBASE_PROJECT_ID,
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      algorithms: ['RS256']
    }, (err: any, decoded: any) => {
      if (err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      req.user = decoded;
      next();
    });
  };

  // Middleware to check if user is Admin
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.user.email !== ADMIN_EMAIL) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
  };

  // Default settings
  const defaultSettings = {
    easyPaisa: "03178308476",
    easyPaisaTitle: "Pak Islam",
    jazzCash: "03047321935",
    jazzCashTitle: "Pak Islam",
    bankDetails: "Bank Alfalah: 1234-5678-9012",
    enableEasyPaisaDirect: true,
    winner: null
  };

  for (const [key, value] of Object.entries(defaultSettings)) {
    await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, JSON.stringify(value)]);
  }

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/stats", async (req, res) => {
    console.log("GET /api/stats hit");
    try {
      const total = await db.get("SELECT COUNT(*) as count FROM participants") || { count: 0 };
      const approved = await db.get("SELECT COUNT(*) as count FROM participants WHERE status = 'approved'") || { count: 0 };
      res.json({ total: total.count, approved: approved.count });
    } catch (e: any) {
      console.error("Stats error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/settings", async (req, res) => {
    const rows = await db.all("SELECT * FROM settings");
    const settings = rows.reduce((acc, row) => {
      acc[row.key] = JSON.parse(row.value);
      return acc;
    }, {});
    res.json(settings);
  });

  app.post("/api/settings", authenticate, requireAdmin, async (req, res) => {
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, JSON.stringify(value)]);
    }
    res.json({ success: true });
  });

  app.get("/api/participants/approved-tokens", async (req, res) => {
    const rows = await db.all("SELECT tokenNumber FROM participants WHERE status = 'approved' AND tokenNumber IS NOT NULL");
    res.json(rows.map((r: any) => r.tokenNumber));
  });

  app.get("/api/participants", authenticate, requireAdmin, async (req, res) => {
    const { status, search } = req.query;
    let queryStr = "SELECT * FROM participants WHERE 1=1";
    const params = [];

    if (status) {
      queryStr += " AND status = ?";
      params.push(status);
    }

    if (search) {
      queryStr += " AND (whatsapp LIKE ? OR tid LIKE ? OR name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    queryStr += " ORDER BY timestamp DESC";
    const rows = await db.all(queryStr, params);
    res.json(rows);
  });

  app.post("/api/participants", authenticate, async (req: any, res: any) => {
    const p = req.body;
    
    // Security: Ensure user is submitting for themselves
    if (p.uid !== req.user.user_id || p.email !== req.user.email) {
      return res.status(403).json({ error: "Forbidden: Identity mismatch" });
    }

    try {
      // Check if TID exists
      const existing = await db.get("SELECT id FROM participants WHERE tid = ?", [p.tid]);
      if (existing) {
        return res.status(400).json({ error: "TID already used" });
      }

      // Check device lock
      const deviceLock = await db.get("SELECT id FROM participants WHERE deviceToken = ? AND uid != ?", [p.deviceToken, p.uid]);
      if (deviceLock) {
        return res.status(400).json({ error: "Device locked to another account" });
      }

      const result = await db.run(`
        INSERT INTO participants (
          uid, email, name, whatsapp, cnic, address, caste, 
          gender, dob, passport, emergencyName, emergencyNumber,
          senderName, senderNumber, paymentMethod, tid, slipImage, 
          status, deviceToken
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.uid, p.email, p.name, p.whatsapp, p.cnic, p.address, p.caste,
        p.gender, p.dob, p.passport, p.emergencyName, p.emergencyNumber,
        p.senderName, p.senderNumber, p.paymentMethod, p.tid, p.slipImage,
        'pending', p.deviceToken
      ]);
      res.json({ id: result.lastID });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.patch("/api/participants/:id", authenticate, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status, tokenNumber } = req.body;
    await db.run("UPDATE participants SET status = ?, tokenNumber = ? WHERE id = ?", [status, tokenNumber, id]);
    res.json({ success: true });
  });

  app.post("/api/admin/reset", authenticate, requireAdmin, async (req, res) => {
    await db.run("DELETE FROM participants");
    await db.run("DELETE FROM winners");
    await db.run("UPDATE settings SET value = ? WHERE key = 'winner'", [JSON.stringify(null)]);
    res.json({ success: true });
  });

  app.get("/api/user/application", authenticate, async (req: any, res: any) => {
    const { uid } = req.query;
    
    // Security: Users can only see their own application
    if (uid !== req.user.user_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const row = await db.get("SELECT * FROM participants WHERE uid = ? ORDER BY timestamp DESC LIMIT 1", [uid]);
    res.json(row || null);
  });

  app.post("/api/payment/direct", authenticate, async (req: any, res: any) => {
    const p = req.body;
    
    // Security: Ensure user is submitting for themselves
    if (p.uid !== req.user.user_id || p.email !== req.user.email) {
      return res.status(403).json({ error: "Forbidden: Identity mismatch" });
    }

    try {
      // Check device lock
      const deviceLock = await db.get("SELECT id FROM participants WHERE deviceToken = ? AND uid != ?", [p.deviceToken, p.uid]);
      if (deviceLock) {
        return res.status(400).json({ error: "Device locked to another account" });
      }

      // Generate a simulated TID
      const tid = "MW-" + Date.now() + Math.random().toString(36).substring(7).toUpperCase();

      // Generate Token Number
      const lastToken = await db.get("SELECT tokenNumber FROM participants WHERE tokenNumber IS NOT NULL ORDER BY id DESC LIMIT 1");
      let nextToken = "PI-1001";
      if (lastToken) {
        const num = parseInt(lastToken.tokenNumber.split('-')[1]);
        nextToken = `PI-${num + 1}`;
      }

      const result = await db.run(`
        INSERT INTO participants (
          uid, email, name, whatsapp, cnic, address, caste, 
          gender, dob, passport, emergencyName, emergencyNumber,
          senderName, senderNumber, paymentMethod, tid, 
          status, tokenNumber, deviceToken
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.uid, p.email, p.name, p.whatsapp, p.cnic, p.address, p.caste,
        p.gender, p.dob, p.passport, p.emergencyName, p.emergencyNumber,
        p.name, p.walletNumber, p.paymentMethod, tid,
        'approved', nextToken, p.deviceToken
      ]);

      res.json({ id: result.lastID, tid, tokenNumber: nextToken });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // --- JazzCash Integration ---
  app.post("/api/payment/jazzcash-direct", authenticate, async (req: any, res: any) => {
    const { amount, mobileNumber, cnic, participantData } = req.body;
    
    const merchantId = process.env.JAZZCASH_MERCHANT_ID || "MC656746";
    const password = process.env.JAZZCASH_PASSWORD || "t42522c45t";
    const salt = process.env.JAZZCASH_INTEGERITY_SALT || "x51w84cg85";
    const apiUrl = "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction";
    const appUrl = process.env.APP_URL || `http://localhost:3000`;

    const pp_Amount = (amount * 100).toString();
    const pp_TxnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const pp_TxnExpiryDateTime = new Date(Date.now() + 3600000).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const pp_TxnRefNo = "T" + pp_TxnDateTime;

    const postData: any = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: merchantId,
      pp_SubMerchantID: "",
      pp_Password: password,
      pp_BankID: "",
      pp_ProductID: "",
      pp_TxnRefNo: pp_TxnRefNo,
      pp_Amount: pp_Amount,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: pp_TxnDateTime,
      pp_BillReference: "billref",
      pp_Description: "JazzCash Mobile Account Payment",
      pp_TxnExpiryDateTime: pp_TxnExpiryDateTime,
      pp_ReturnURL: `${appUrl}/api/payment/callback`,
      pp_SecureHash: "",
      ppmpf_1: mobileNumber || "",
      ppmpf_2: "",
      ppmpf_3: "",
      ppmpf_4: "",
      ppmpf_5: ""
    };

    // Calculate Hash
    const sortedKeys = Object.keys(postData).sort();
    let hashString = salt + "&";
    for (const key of sortedKeys) {
      if (postData[key] !== "" && key !== "pp_SecureHash") {
        hashString += postData[key] + "&";
      }
    }
    hashString = hashString.slice(0, -1);
    postData.pp_SecureHash = crypto.createHmac("sha256", salt).update(hashString).digest("hex").toUpperCase();

    try {
      // Save pending participant
      if (participantData) {
        await db.run(`
          INSERT INTO participants (
            uid, email, name, whatsapp, cnic, address, caste, 
            gender, dob, passport, emergencyName, emergencyNumber,
            senderName, senderNumber, paymentMethod, tid, status, deviceToken
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          req.user.user_id, req.user.email, participantData.name, participantData.whatsapp, 
          participantData.cnic, participantData.address, participantData.caste,
          participantData.gender, participantData.dob, participantData.passport, 
          participantData.emergencyName, participantData.emergencyNumber,
          participantData.senderName, participantData.senderNumber, 'jazzcash_direct', 
          pp_TxnRefNo, 'pending_payment', participantData.deviceToken
        ]);
      }

      console.log("Calling JazzCash API:", apiUrl);
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      const result = await response.json();
      console.log("JazzCash API Response:", result);
      res.json(result);
    } catch (e: any) {
      console.error("JazzCash Direct Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/payment/initiate", authenticate, async (req: any, res: any) => {
    const { amount, participantData } = req.body;
    
    const merchantId = process.env.JAZZCASH_MERCHANT_ID || "MC656746";
    const password = process.env.JAZZCASH_PASSWORD || "t42522c45t";
    const salt = process.env.JAZZCASH_INTEGERITY_SALT || "x51w84cg85";
    const apiUrl = process.env.JAZZCASH_API_URL || "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/";
    const appUrl = process.env.APP_URL || `http://localhost:3000`;

    if (!merchantId || !password || !salt) {
      return res.status(500).json({ error: "JazzCash credentials missing" });
    }

    const pp_Amount = (amount * 100).toString(); // In Paisas
    const pp_TxnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const pp_TxnExpiryDateTime = new Date(Date.now() + 3600000).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const pp_TxnRefNo = "T" + pp_TxnDateTime;
    const pp_ReturnURL = `${appUrl}/api/payment/callback`;

    const postData: any = {
      pp_Version: "1.1",
      pp_TxnType: "MWALLET",
      pp_Language: "EN",
      pp_MerchantID: merchantId,
      pp_SubMerchantID: "",
      pp_Password: password,
      pp_TxnRefNo: pp_TxnRefNo,
      pp_Amount: pp_Amount,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: pp_TxnDateTime,
      pp_BillReference: pp_TxnRefNo,
      pp_Description: "Hajj & Umrah Lottery Participation",
      pp_TxnExpiryDateTime: pp_TxnExpiryDateTime,
      pp_ReturnURL: pp_ReturnURL,
      pp_SecureHash: "",
      pp_MPay_Language: "EN",
      pp_MobileNumber: req.body.walletNumber || participantData.whatsapp,
      pp_CNIC: participantData.cnic.replace(/-/g, ""),
    };

    // Store temporary participant data to be saved on success
    // In a real app, you'd save this to a 'pending_payments' table
    // For simplicity, we'll pass it in the description or just rely on the callback
    // But better to save it now as 'pending'
    try {
      await db.run(`
        INSERT INTO participants (
          uid, email, name, whatsapp, cnic, address, caste, 
          gender, dob, passport, emergencyName, emergencyNumber,
          senderName, senderNumber, paymentMethod, tid, status, deviceToken
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        req.user.user_id, req.user.email, participantData.name, participantData.whatsapp, 
        participantData.cnic, participantData.address, participantData.caste,
        participantData.gender, participantData.dob, participantData.passport, 
        participantData.emergencyName, participantData.emergencyNumber,
        participantData.senderName, participantData.senderNumber, 'jazzcash', 
        pp_TxnRefNo, 'pending_payment', participantData.deviceToken
      ]);
    } catch (e) {
      console.error("Failed to save pending participant", e);
    }

    // Sort keys alphabetically for hash calculation
    const sortedKeys = Object.keys(postData).sort();
    let hashString = salt + "&";
    for (const key of sortedKeys) {
      if (postData[key] !== "" && key !== "pp_SecureHash") {
        hashString += postData[key] + "&";
      }
    }
    hashString = hashString.slice(0, -1); // Remove last &

    postData.pp_SecureHash = crypto.createHmac("sha256", salt).update(hashString).digest("hex").toUpperCase();

    res.json({ apiUrl, postData });
  });

  app.post("/api/payment/simulate-success", authenticate, async (req: any, res: any) => {
    const { txnRefNo } = req.body;
    
    try {
      const participant = await db.get("SELECT * FROM participants WHERE tid = ? AND status = 'pending_payment'", [txnRefNo]);
      if (!participant) {
        return res.status(404).json({ error: "Pending transaction not found" });
      }

      // Generate Token Number
      const lastToken = await db.get("SELECT tokenNumber FROM participants WHERE tokenNumber IS NOT NULL ORDER BY id DESC LIMIT 1");
      let nextToken = "PI-1001";
      if (lastToken) {
        const num = parseInt(lastToken.tokenNumber.split('-')[1]);
        nextToken = `PI-${num + 1}`;
      }

      await db.run(`
        UPDATE participants 
        SET status = 'approved', tokenNumber = ? 
        WHERE tid = ?
      `, [nextToken, txnRefNo]);

      res.json({ success: true, tokenNumber: nextToken });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/payment/callback", express.urlencoded({ extended: true }), async (req, res) => {
    const response = req.body;
    const salt = process.env.JAZZCASH_INTEGERITY_SALT;

    if (!salt) return res.status(500).send("Configuration error");

    // Verify Hash
    const sortedKeys = Object.keys(response).sort();
    let hashString = salt + "&";
    for (const key of sortedKeys) {
      if (response[key] !== "" && key !== "pp_SecureHash") {
        hashString += response[key] + "&";
      }
    }
    hashString = hashString.slice(0, -1);
    const calculatedHash = crypto.createHmac("sha256", salt).update(hashString).digest("hex").toUpperCase();

    if (calculatedHash !== response.pp_SecureHash) {
      return res.send("<h1>Invalid Signature</h1>");
    }

    if (response.pp_ResponseCode === "000") {
      // Success!
      const txnRefNo = response.pp_TxnRefNo;
      const tid = response.pp_RetreivalReferenceNo || txnRefNo;
      
      // Generate Token Number
      const lastToken = await db.get("SELECT tokenNumber FROM participants WHERE tokenNumber IS NOT NULL ORDER BY id DESC LIMIT 1");
      let nextToken = "PI-1001";
      if (lastToken) {
        const num = parseInt(lastToken.tokenNumber.split('-')[1]);
        nextToken = `PI-${num + 1}`;
      }

      await db.run(`
        UPDATE participants 
        SET status = 'approved', tid = ?, tokenNumber = ? 
        WHERE tid = ? AND status = 'pending_payment'
      `, [tid, nextToken, txnRefNo]);

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0fdf4;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;">
              <h1 style="color: #059669;">MashaAllah! Payment Successful</h1>
              <p>Your participation has been confirmed automatically.</p>
              <p>Token Number: <strong>${nextToken}</strong></p>
              <button onclick="window.location.href='/'" style="background: #059669; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; margin-top: 1rem;">Go to App</button>
            </div>
          </body>
        </html>
      `);
    } else {
      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #fef2f2;">
            <div style="background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center;">
              <h1 style="color: #dc2626;">Payment Failed</h1>
              <p>${response.pp_ResponseMessage}</p>
              <button onclick="window.location.href='/'" style="background: #dc2626; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer; font-weight: bold; margin-top: 1rem;">Try Again</button>
            </div>
          </body>
        </html>
      `);
    }
  });

  // --- Standalone Test Integration ---
  // --- Dedicated JazzCash API Tester ---
  app.get("/jazzcash-tester", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JazzCash API Testing - Zain Khalid</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #d32f2f; --bg: #f4f7f9; --text: #334155; --border: #e2e8f0; }
        body { font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 0; }
        
        /* Header */
        .header { background: #d32f2f; color: white; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
        .header-menu { cursor: pointer; }
        
        /* Main Content */
        .main-container { padding: 20px; max-width: 1200px; margin: 0 auto; }
        .section-title { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #64748b; margin-bottom: 20px; }
        .section-title i { font-style: normal; }
        
        .card { background: white; border: 1px solid var(--border); border-radius: 4px; margin-bottom: 20px; }
        .card-header { padding: 12px 20px; border-bottom: 1px solid var(--border); font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 8px; }
        .card-body { padding: 20px; }
        
        .info-box { background: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 4px; font-size: 12px; color: #92400e; margin-bottom: 20px; line-height: 1.5; }
        .info-box strong { color: #78350f; }
        
        .form-row { display: flex; gap: 20px; margin-bottom: 20px; }
        .form-group { flex: 1; }
        label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
        select, input { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 4px; font-size: 13px; color: #1e293b; background: #fcfcfc; }
        input::placeholder { color: #cbd5e1; }
        
        .txn-ref-container { position: relative; }
        .refresh-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #059669; font-size: 18px; }
        
        .btn-group { display: flex; gap: 10px; margin-top: 10px; }
        .btn { padding: 8px 24px; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
        .btn-update { background: #2dd4bf; color: white; }
        .btn-run { background: #2dd4bf; color: white; }
        .btn:hover { opacity: 0.9; }
        
        .json-area { background: #475569; color: #e2e8f0; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; min-height: 150px; white-space: pre-wrap; word-break: break-all; }
        .response-area { background: #475569; color: #e2e8f0; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 12px; min-height: 300px; white-space: pre-wrap; }
        
        .floating-btn { position: fixed; bottom: 20px; right: 20px; background: #0ea5e9; color: white; padding: 8px 16px; border-radius: 4px; font-size: 12px; font-weight: 700; cursor: pointer; border: none; display: flex; align-items: center; gap: 8px; }
        .floating-btn i { font-style: normal; font-size: 16px; }
        
        .go-live-badge { position: absolute; right: -10px; top: 10px; background: #94a3b8; color: white; padding: 4px 12px; font-size: 11px; font-weight: 700; transform: rotate(90deg); border-radius: 0 0 4px 4px; }
    </style>
</head>
<body>
    <div class="header">
        <span>Welcome Zain Khalid</span>
        <span class="header-menu">☰</span>
    </div>

    <div class="main-container">
        <div class="section-title">
            ⚙ API Testing
        </div>

        <div class="card" style="position: relative;">
            <div class="go-live-badge">GO LIVE</div>
            <div class="card-header">
                Getting started > API Testing
            </div>
            <div class="card-body">
                <div class="info-box">
                    <strong>ℹ Provide the unique request parameters and hit the 'Run' button to create the final JSON payload request to call the API. The received response will appear in the API response area at the right. For more information view <a href="#" style="color: #0369a1; text-decoration: none;">API Documentation</a></strong>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>Select API Operation</label>
                        <select id="api-op" onchange="toggleFields()">
                            <option value="MWALLET">Mobile Account - v1.1</option>
                            <option value="MPAY">Card Payment (Direct Pay) - v2.0</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>API URL</label>
                        <input type="text" id="api-url" value="https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoTransaction" readonly>
                    </div>
                </div>

                <div class="card" style="border-style: dashed; border-color: #cbd5e1; margin-bottom: 0;">
                    <div class="card-header" style="border-bottom: none; padding-bottom: 0;">
                        Random Request Parameters ℹ
                    </div>
                    <div class="card-body">
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label>pp_TxnRefNo (must be unique)</label>
                            <div class="txn-ref-container">
                                <input type="text" id="pp_TxnRefNo" value="">
                                <span class="refresh-btn" onclick="refreshTxnRef()">🔄</span>
                            </div>
                        </div>
                        <div class="form-group" style="margin-bottom: 15px;">
                            <label>pp_Amount</label>
                            <input type="text" id="pp_Amount" placeholder="Enter Amount (Format: 100.00 as 10000)">
                        </div>
                        
                        <!-- Mobile Wallet Fields -->
                        <div id="mwallet-fields">
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>pp_MobileNumber</label>
                                <input type="text" id="pp_MobileNumber" placeholder="Enter phone number">
                            </div>
                            <div class="form-group">
                                <label>pp_CNIC (Last 6 digits)</label>
                                <input type="text" id="pp_CNIC" placeholder="Enter 6 digits">
                            </div>
                        </div>

                        <!-- Card Fields -->
                        <div id="card-fields" style="display: none;">
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label>pp_CustomerCardNumber</label>
                                <input type="text" id="pp_CardNumber" placeholder="5123456789012346">
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>pp_CustomerCardExpiry (MM/YY)</label>
                                    <input type="text" id="pp_CardExpiry" placeholder="12/25">
                                </div>
                                <div class="form-group">
                                    <label>pp_CustomerCardCVV</label>
                                    <input type="text" id="pp_CardCVV" placeholder="123">
                                </div>
                            </div>
                        </div>
                        
                        <div class="btn-group">
                            <button class="btn btn-update" onclick="updatePayload()">UPDATE</button>
                            <button class="btn btn-run" onclick="runTest()">RUN</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                JSON Payload [POST] ℹ
            </div>
            <div class="card-body">
                <div id="payload-preview" class="json-area"></div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                API Response ℹ
            </div>
            <div class="card-body">
                <div id="response-preview" class="response-area">Awaiting Response ...</div>
            </div>
        </div>
    </div>

    <button class="floating-btn">
        GET IN TOUCH <i>↑</i>
    </button>

    <script>
        const Salt = "x51w84cg85";

        function toggleFields() {
            const op = document.getElementById('api-op').value;
            document.getElementById('mwallet-fields').style.display = op === 'MWALLET' ? 'block' : 'none';
            document.getElementById('card-fields').style.display = op === 'MPAY' ? 'block' : 'none';
            updatePayload();
        }

        function refreshTxnRef() {
            const date = new Date();
            const txnDateTime = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
            document.getElementById('pp_TxnRefNo').value = "T" + txnDateTime;
            updatePayload();
        }

        function updatePayload() {
            const date = new Date();
            const txnDateTime = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
            const expiryDate = new Date(date.getTime() + 3600000); // 1 hour later
            const txnExpiryDateTime = expiryDate.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
            const txnRefNo = document.getElementById('pp_TxnRefNo').value || ("T" + txnDateTime);
            if(!document.getElementById('pp_TxnRefNo').value) document.getElementById('pp_TxnRefNo').value = txnRefNo;

            const op = document.getElementById('api-op').value;
            let payload = {};

            if (op === 'MWALLET') {
                payload = {
                    pp_Version: "1.1",
                    pp_TxnType: "MWALLET",
                    pp_Language: "EN",
                    pp_MerchantID: "MC656746",
                    pp_SubMerchantID: "",
                    pp_Password: "t42522c45t",
                    pp_BankID: "",
                    pp_ProductID: "",
                    pp_TxnRefNo: txnRefNo,
                    pp_Amount: document.getElementById('pp_Amount').value || "100",
                    pp_TxnCurrency: "PKR",
                    pp_TxnDateTime: txnDateTime,
                    pp_BillReference: "billref",
                    pp_Description: "JazzCash Mobile Wallet Payment",
                    pp_TxnExpiryDateTime: txnExpiryDateTime,
                    pp_ReturnURL: window.location.origin + "/api/payment/callback",
                    pp_SecureHash: "",
                    pp_MobileNumber: document.getElementById('pp_MobileNumber').value || "03123456789",
                    pp_CNIC: document.getElementById('pp_CNIC').value || "345678",
                    ppmpf_1: document.getElementById('pp_MobileNumber').value || "03123456789",
                    ppmpf_2: "", ppmpf_3: "", ppmpf_4: "", ppmpf_5: ""
                };
            } else {
                payload = {
                    pp_Version: "2.0",
                    pp_TxnType: "MPAY",
                    pp_Language: "EN",
                    pp_MerchantID: "MC656746",
                    pp_Password: "t42522c45t",
                    pp_TxnRefNo: txnRefNo,
                    pp_Amount: document.getElementById('pp_Amount').value || "100",
                    pp_TxnCurrency: "PKR",
                    pp_TxnDateTime: txnDateTime,
                    pp_TxnExpiryDateTime: txnExpiryDateTime,
                    pp_BillReference: "billref",
                    pp_Description: "JazzCash Card Payment",
                    pp_CustomerID: "test_user",
                    pp_CustomerEmail: "test@example.com",
                    pp_CustomerMobile: "03123456789",
                    pp_CustomerCardNumber: document.getElementById('pp_CardNumber').value || "5123456789012346",
                    pp_CustomerCardCVV: document.getElementById('pp_CardCVV').value || "123",
                    pp_CustomerCardExpiry: document.getElementById('pp_CardExpiry').value || "12/25",
                    pp_IsRegisteredCustomer: "yes",
                    pp_ShouldTokenizeCardNumber: "no",
                    pp_UsageMode: "API",
                    pp_SecureHash: ""
                };
            }

            // Calculate Hash
            const sortedKeys = Object.keys(payload).sort();
            let hashString = Salt + "&";
            for (const key of sortedKeys) {
                if (payload[key] !== "" && key !== "pp_SecureHash") {
                    hashString += payload[key] + "&";
                }
            }
            hashString = hashString.slice(0, -1);
            payload.pp_SecureHash = CryptoJS.HmacSHA256(hashString, Salt).toString(CryptoJS.enc.Hex).toUpperCase();

            document.getElementById('payload-preview').innerText = JSON.stringify(payload, null, 2);
            return payload;
        }

        refreshTxnRef();

        async function runTest() {
            const responsePreview = document.getElementById('response-preview');
            responsePreview.innerText = "Sending Request ...";
            
            const payload = updatePayload();
            const op = document.getElementById('api-op').value;
            const endpoint = op === 'MWALLET' ? '/api/payment/ussd-push' : '/api/payment/card-pay';
            
            const body = op === 'MWALLET' ? {
                amount: payload.pp_Amount,
                mobileNumber: payload.pp_MobileNumber,
                cnic: payload.pp_CNIC,
                email: "test@example.com"
            } : {
                amount: payload.pp_Amount,
                cardNumber: payload.pp_CustomerCardNumber,
                expiry: payload.pp_CustomerCardExpiry,
                cvv: payload.pp_CustomerCardCVV,
                email: "test@example.com",
                mobile: "03123456789"
            };

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const result = await res.json();
                responsePreview.innerText = JSON.stringify(result, null, 2);
            } catch (err) {
                responsePreview.innerText = JSON.stringify({ error: err.message }, null, 2);
            }
        }
    </script>
</body>
</html>
    `);
  });

  app.post("/api/payment/test-jazzcash-direct", async (req: any, res: any) => {
    const { amount, mobileNumber, customPayload, salt: customSalt } = req.body;
    
    const merchantId = customPayload?.pp_MerchantID || "MC656746";
    const password = customPayload?.pp_Password || "t42522c45t";
    const salt = customSalt || "x51w84cg85";
    const apiUrl = "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/Payment/DoTransaction";
    const appUrl = process.env.APP_URL || `http://localhost:3000`;

    const pp_Amount = amount || customPayload?.pp_Amount || "10000";
    const pp_TxnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const pp_TxnExpiryDateTime = new Date(Date.now() + 3600000).toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const pp_TxnRefNo = "T" + pp_TxnDateTime;

    let postData: any;
    
    if (customPayload) {
      postData = { ...customPayload };
      // Ensure dynamic fields are fresh if not explicitly set to something else
      if (!postData.pp_TxnDateTime) postData.pp_TxnDateTime = pp_TxnDateTime;
      if (!postData.pp_TxnRefNo) postData.pp_TxnRefNo = pp_TxnRefNo;
    } else {
      postData = {
        pp_Version: "1.1",
        pp_TxnType: "MWALLET",
        pp_Language: "EN",
        pp_MerchantID: merchantId,
        pp_SubMerchantID: "",
        pp_Password: password,
        pp_BankID: "",
        pp_ProductID: "",
        pp_TxnRefNo: pp_TxnRefNo,
        pp_Amount: pp_Amount,
        pp_TxnCurrency: "PKR",
        pp_TxnDateTime: pp_TxnDateTime,
        pp_BillReference: "billref",
        pp_Description: "JazzCash Test Direct Payment",
        pp_TxnExpiryDateTime: pp_TxnExpiryDateTime,
        pp_ReturnURL: `${appUrl}/api/payment/test-callback`,
        pp_SecureHash: "",
        ppmpf_1: mobileNumber || "",
        ppmpf_2: "",
        ppmpf_3: "",
        ppmpf_4: "",
        ppmpf_5: ""
      };
    }

    const sortedKeys = Object.keys(postData).sort();
    let hashString = salt + "&";
    for (const key of sortedKeys) {
      if (postData[key] !== "" && key !== "pp_SecureHash") {
        hashString += postData[key] + "&";
      }
    }
    hashString = hashString.slice(0, -1);
    postData.pp_SecureHash = crypto.createHmac("sha256", salt).update(hashString).digest("hex").toUpperCase();

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const result = await response.json();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/test-checkout", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>JazzCash Checkout Test</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
    <style>
        body { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; margin: 0; padding: 20px; }
        .card { background: white; padding: 40px; border-radius: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.05); width: 100%; max-width: 450px; text-align: center; border: 1px solid #e2e8f0; }
        h2 { color: #d32f2f; margin: 0 0 8px; font-weight: 800; }
        .info { font-size: 14px; color: #64748b; margin-bottom: 24px; }
        .amount { font-size: 40px; font-weight: 900; color: #0f172a; margin: 24px 0; letter-spacing: -0.02em; }
        .btn-group { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
        button { width: 100%; padding: 18px; border-radius: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: none; font-size: 16px; }
        .btn-primary { background: #d32f2f; color: white; box-shadow: 0 4px 12px rgba(211, 47, 47, 0.2); }
        .btn-primary:hover { background: #b71c1c; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(211, 47, 47, 0.3); }
        .btn-secondary { background: #1e293b; color: white; }
        .btn-secondary:hover { background: #0f172a; transform: translateY(-2px); }
        
        .test-data { margin-top: 32px; text-align: left; background: #f1f5f9; padding: 20px; border-radius: 20px; border: 1px dashed #cbd5e1; }
        .test-data h4 { margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; }
        .data-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; cursor: pointer; padding: 4px 0; border-bottom: 1px solid #e2e8f0; }
        .data-row:last-child { border-bottom: none; }
        .data-row:hover { color: #d32f2f; }
        .label { color: #64748b; }
        .value { font-family: monospace; font-weight: bold; }
        .copy-hint { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <h2>JazzCash</h2>
        <p class="info">Sandbox Integration Test (Merchant: MC656746)</p>
        <div class="amount">PKR 100.00</div>
        
        <form id="jazzcash-form" method="POST" action="https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/">
            <div id="hidden-fields"></div>
            <div style="margin-bottom: 20px; text-align: left;">
                <label style="display: block; font-size: 12px; font-weight: bold; color: #475569; margin-bottom: 8px;">Mobile Number (for MWALLET)</label>
                <input type="text" id="wallet-number" placeholder="03XXXXXXXXX" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #cbd5e1; box-sizing: border-box;">
            </div>
            <div class="btn-group">
                <button type="button" class="btn-primary" onclick="submitForm('')">Hosted Payment Page</button>
                <button type="button" class="btn-secondary" onclick="submitForm('MWALLET')">Direct Mobile Account (API)</button>
            </div>
        </form>

        <div class="test-data">
            <h4>Test Credentials (Click to Copy)</h4>
            <div class="data-row" onclick="copy('03123456789')">
                <span class="label">Mobile Number:</span>
                <span class="value">03123456789</span>
            </div>
            <div class="data-row" onclick="copy('345678')">
                <span class="label">CNIC (Last 6):</span>
                <span class="value">345678</span>
            </div>
            <div class="data-row" onclick="copy('5123450000000008')">
                <span class="label">MasterCard:</span>
                <span class="value">5123450000000008</span>
            </div>
            <div class="data-row" onclick="copy('4508750015741019')">
                <span class="label">VISA Card:</span>
                <span class="value">4508750015741019</span>
            </div>
            <div class="data-row" onclick="copy('100')">
                <span class="label">CVV:</span>
                <span class="value">100</span>
            </div>
            <p class="copy-hint">Click any value to copy to clipboard</p>
        </div>
    </div>

    <script>
        const MerchantID = "MC656746";
        const Password = "t42522c45t";
        const Salt = "x51w84cg85";
        const ReturnURL = window.location.origin + "/api/payment/test-callback";

        function copy(text) {
            navigator.clipboard.writeText(text);
            alert("Copied: " + text);
        }

        async function submitForm(txnType) {
            const walletNumber = document.getElementById('wallet-number').value;
            
            if (txnType === 'MWALLET') {
                if (!walletNumber) {
                    alert("Please enter a mobile number for MWALLET");
                    return;
                }

                const btn = event.target;
                const originalText = btn.innerText;
                btn.innerText = "Processing...";
                btn.disabled = true;

                try {
                    const response = await fetch('/api/payment/test-jazzcash-direct', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: "10000",
                            mobileNumber: walletNumber
                        })
                    });

                    const result = await response.json();
                    alert("Response: " + result.pp_ResponseMessage + " (Code: " + result.pp_ResponseCode + ")");
                    console.log("Result:", result);
                } catch (err) {
                    alert("Error: " + err.message);
                } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
                return;
            }

            const date = new Date();
            const txnDateTime = date.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
            const expiryDate = new Date(date.getTime() + 3600000);
            const txnExpiryDateTime = expiryDate.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
            const txnRefNo = "TXN" + Date.now().toString().slice(-10);

            const postData = {
                pp_Version: "1.1",
                pp_TxnType: txnType,
                pp_Language: "EN",
                pp_MerchantID: MerchantID,
                pp_SubMerchantID: "",
                pp_Password: Password,
                pp_TxnRefNo: txnRefNo,
                pp_Amount: "10000",
                pp_TxnCurrency: "PKR",
                pp_TxnDateTime: txnDateTime,
                pp_BillReference: "bill123",
                pp_Description: "Test Transaction",
                pp_TxnExpiryDateTime: txnExpiryDateTime,
                pp_ReturnURL: ReturnURL,
                pp_SecureHash: ""
            };

            const sortedKeys = Object.keys(postData).sort();
            let hashString = Salt + "&";
            for (const key of sortedKeys) {
                if (postData[key] !== "" && key !== "pp_SecureHash") {
                    hashString += postData[key] + "&";
                }
            }
            hashString = hashString.slice(0, -1);
            postData.pp_SecureHash = CryptoJS.HmacSHA256(hashString, Salt).toString(CryptoJS.enc.Hex).toUpperCase();

            const container = document.getElementById('hidden-fields');
            container.innerHTML = "";
            for (const key in postData) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = postData[key];
                container.appendChild(input);
            }

            document.getElementById('jazzcash-form').submit();
        }
    </script>
</body>
</html>
    `);
  });

  app.post("/api/payment/test-callback", express.urlencoded({ extended: true }), (req, res) => {
    const response = req.body;
    const isSuccess = response.pp_ResponseCode === "000";

    res.send(`
        <html>
            <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; margin: 0;">
                <div style="background: white; padding: 40px; border-radius: 32px; box-shadow: 0 20px 50px rgba(0,0,0,0.05); text-align: center; max-width: 450px; width: 90%; border: 1px solid ${isSuccess ? '#bbf7d0' : '#fecaca'};">
                    <div style="width: 80px; height: 80px; background: ${isSuccess ? '#f0fdf4' : '#fef2f2'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px;">
                        <span style="font-size: 40px;">${isSuccess ? '✅' : '❌'}</span>
                    </div>
                    <h1 style="color: ${isSuccess ? '#166534' : '#991b1b'}; margin: 0 0 12px; font-size: 24px;">${isSuccess ? 'Payment Received' : 'Payment Failed'}</h1>
                    <p style="color: #64748b; margin-bottom: 32px; line-height: 1.6;">${response.pp_ResponseMessage}</p>
                    
                    ${isSuccess ? `
                        <div style="background: #f1f5f9; padding: 20px; border-radius: 16px; margin-bottom: 32px; text-align: left;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">Transaction ID</div>
                            <div style="font-family: monospace; font-size: 16px; font-weight: bold; color: #1e293b;">${response.pp_RetreivalReferenceNo || response.pp_TxnRefNo}</div>
                        </div>
                    ` : ''}
                    
                    <button onclick="window.location.href='/test-checkout'" style="width: 100%; background: #1e293b; color: white; border: none; padding: 16px; border-radius: 12px; font-weight: bold; cursor: pointer;">Back to Checkout</button>
                </div>
            </body>
        </html>
    `);
  });

  // JazzCash Implementation (Go-Live Ready)
  const JAZZCASH_MERCHANT_ID = process.env.JAZZCASH_MERCHANT_ID || "MC656746";
  const JAZZCASH_PASSWORD = process.env.JAZZCASH_PASSWORD || "t42522c45t";
  const JAZZCASH_INTEGRITY_SALT = process.env.JAZZCASH_INTEGRITY_SALT || "x51w84cg85";
  
  // Toggle between Sandbox and Production
  const JAZZCASH_API_URL = process.env.JAZZCASH_API_URL || "https://sandbox.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoTransaction";
  const APP_URL = process.env.APP_URL || "http://localhost:3000";

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

  async function updateParticipantStatus(uid: string, email: string, tid: string, method: string) {
    try {
      // 1. Update Firebase Firestore
      await firestore.collection("participants").doc(uid).set({
        Status: "Approved",
        email: email,
        paymentMethod: method,
        tid: tid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // 2. Update local SQLite
      await db.run("UPDATE participants SET status = 'approved', tid = ?, paymentMethod = ? WHERE uid = ?", [tid, method, uid]);
      
      console.log(`Successfully approved participant ${uid} via ${method}`);
    } catch (error) {
      console.error("Error updating participant status:", error);
    }
  }

  // 1. Mobile Wallet (MWALLET) - Version 1.1/2.0
  async function initiateUSSDPush(amount: string, mobileNumber: string, cnic: string, customerEmail: string, uid: string) {
    const txnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const expiryDate = new Date(Date.now() + 3600000); // 1 hour later
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
      pp_Amount: amount,
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

    if (result.pp_ResponseCode === "000") {
      await updateParticipantStatus(uid, customerEmail, txnRefNo, "JazzCash Mobile Wallet");
    }

    return result;
  }

  // 2. Card Payment (MPAY) - Version 2.0
  async function initiateCardPayment(amount: string, cardData: any, customerData: any, uid: string) {
    const txnDateTime = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const expiryDate = new Date(Date.now() + 3600000);
    const txnExpiryDateTime = expiryDate.toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
    const txnRefNo = "T" + txnDateTime;

    const payload: any = {
      pp_Version: "2.0",
      pp_TxnType: "MPAY",
      pp_Language: "EN",
      pp_MerchantID: JAZZCASH_MERCHANT_ID,
      pp_Password: JAZZCASH_PASSWORD,
      pp_TxnRefNo: txnRefNo,
      pp_Amount: amount,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: txnDateTime,
      pp_TxnExpiryDateTime: txnExpiryDateTime,
      pp_BillReference: uid,
      pp_Description: "JazzCash Card Payment",
      pp_CustomerID: uid,
      pp_CustomerEmail: customerData.email,
      pp_CustomerMobile: customerData.mobile,
      pp_CustomerCardNumber: cardData.number,
      pp_CustomerCardCVV: cardData.cvv,
      pp_CustomerCardExpiry: cardData.expiry, // Format: MM/YY
      pp_IsRegisteredCustomer: "yes",
      pp_ShouldTokenizeCardNumber: "no",
      pp_UsageMode: "API",
      pp_SecureHash: ""
    };

    payload.pp_SecureHash = calculateJazzCashHash(payload);

    const response = await fetch(JAZZCASH_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result: any = await response.json();

    if (result.pp_ResponseCode === "000") {
      await updateParticipantStatus(uid, customerData.email, txnRefNo, "JazzCash Card");
    }

    return result;
  }

  app.post("/api/payment/ussd-push", authenticate, async (req: any, res) => {
    const { amount, mobileNumber, cnic, email, participantData } = req.body;
    const uid = req.user.user_id;

    if (!amount || !mobileNumber) {
      return res.status(400).json({ error: "Amount and Mobile Number are required" });
    }

    try {
      // Save participant data as pending first
      if (participantData) {
        await db.run(`
          INSERT INTO participants (
            uid, email, name, whatsapp, cnic, address, caste, 
            gender, dob, passport, emergencyName, emergencyNumber,
            senderName, senderNumber, paymentMethod, tid, status, deviceToken
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(uid) DO UPDATE SET
            name=excluded.name, whatsapp=excluded.whatsapp, cnic=excluded.cnic,
            address=excluded.address, caste=excluded.caste, gender=excluded.gender,
            dob=excluded.dob, passport=excluded.passport, emergencyName=excluded.emergencyName,
            emergencyNumber=excluded.emergencyNumber, senderName=excluded.senderName,
            senderNumber=excluded.senderNumber, paymentMethod=excluded.paymentMethod,
            tid=excluded.tid, status=excluded.status, deviceToken=excluded.deviceToken
        `, [
          uid, req.user.email, participantData.name, participantData.whatsapp, 
          participantData.cnic, participantData.address, participantData.caste,
          participantData.gender, participantData.dob, participantData.passport,
          participantData.emergencyName, participantData.emergencyNumber,
          participantData.senderName, participantData.senderNumber, 'jazzcash', 
          'PENDING_JAZZCASH', 'pending', participantData.deviceToken
        ]);

        // Also save to Firestore
        await admin.firestore().collection('participants').doc(uid).set({
          uid,
          email: req.user.email,
          name: participantData.name,
          whatsapp: participantData.whatsapp,
          cnic: participantData.cnic,
          address: participantData.address,
          caste: participantData.caste,
          gender: participantData.gender,
          dob: participantData.dob,
          passport: participantData.passport,
          emergencyName: participantData.emergencyName,
          emergencyNumber: participantData.emergencyNumber,
          paymentMethod: 'jazzcash',
          status: 'pending',
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          deviceToken: participantData.deviceToken
        }, { merge: true });
      }

      const result = await initiateUSSDPush(amount, mobileNumber, cnic, email, uid);
      res.json(result);
    } catch (error: any) {
      console.error("JazzCash USSD Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payment/card-pay", authenticate, async (req: any, res) => {
    const { amount, cardNumber, expiry, cvv, email, mobile } = req.body;
    const uid = req.user.user_id;

    if (!amount || !cardNumber || !expiry || !cvv) {
      return res.status(400).json({ error: "Missing card details or amount" });
    }

    try {
      const result = await initiateCardPayment(
        amount, 
        { number: cardNumber, expiry, cvv }, 
        { email, mobile }, 
        uid
      );
      res.json(result);
    } catch (error: any) {
      console.error("JazzCash Card Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/payment/callback", express.urlencoded({ extended: true }), async (req, res) => {
    console.log("JazzCash Callback Received:", req.body);
    const response = req.body;
    
    if (response.pp_ResponseCode === "000") {
      const uid = response.pp_BillReference;
      const tid = response.pp_RetreivalReferenceNo || response.pp_TxnRefNo;
      const method = response.pp_TxnType === "MWALLET" ? "JazzCash Mobile Wallet" : "JazzCash Card";
      
      // We don't always have the email in the callback, so we fetch it if needed or use a placeholder
      await updateParticipantStatus(uid, "callback@jazzcash.com", tid, method);
      console.log(`Payment confirmed via callback for user ${uid}`);
    }
    
    res.json({ status: "received" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
