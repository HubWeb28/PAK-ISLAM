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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_EMAIL = 'marvelzain43@gmail.com';
const FIREBASE_PROJECT_ID = 'pak-islam-ef6c8';

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
  app.get("/api/stats", async (req, res) => {
    const total = await db.get("SELECT COUNT(*) as count FROM participants");
    const approved = await db.get("SELECT COUNT(*) as count FROM participants WHERE status = 'approved'");
    res.json({ total: total.count, approved: approved.count });
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
  app.post("/api/payment/initiate", authenticate, async (req: any, res: any) => {
    const { amount, participantData } = req.body;
    
    const merchantId = process.env.JAZZCASH_MERCHANT_ID;
    const password = process.env.JAZZCASH_PASSWORD;
    const salt = process.env.JAZZCASH_INTEGERITY_SALT;
    const apiUrl = process.env.JAZZCASH_API_URL;
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
      pp_BankID: "TBANK",
      pp_ProductID: "RE_12345",
      pp_TxnRefNo: pp_TxnRefNo,
      pp_Amount: pp_Amount,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime: pp_TxnDateTime,
      pp_BillReference: "bill123",
      pp_Description: "Hajj & Umrah Lottery Participation",
      pp_TxnExpiryDateTime: pp_TxnExpiryDateTime,
      pp_ReturnURL: pp_ReturnURL,
      pp_SecureHash: "",
      pp_MPay_Language: "EN",
      pp_MobileNumber: participantData.whatsapp,
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
