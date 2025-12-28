require("dotenv").config();

const express = require("express");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { files: 3, fileSize: 5 * 1024 * 1024 }
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "jimenez_motors",
  waitForConnections: true,
  connectionLimit: 10
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const jwtSecret = process.env.JWT_SECRET || "change-this-secret";

function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Hiányzó token" });
  }
  try {
    const payload = jwt.verify(token, jwtSecret);
    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Nincs jogosultság" });
    }
    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Érvénytelen token" });
  }
}

function generateMockTuning(files) {
  const base = ["sport kipufogó", "verseny futómű", "turbó feltöltés", "chiptuning", "könnyített felnik"];
  const count = Math.min(3, files.length + 1);
  return base.slice(0, count).join(", ");
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body || {};
  const adminUser = process.env.ADMIN_USER || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  if (username === adminUser && password === adminPassword) {
    const token = jwt.sign({ role: "admin", username }, jwtSecret, { expiresIn: "8h" });
    return res.json({ token });
  }
  return res.status(401).json({ message: "Hibás belépési adatok" });
});

app.post("/api/analyze", upload.array("images", 3), async (req, res) => {
  try {
    const { seller, price } = req.body || {};
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "Tölts fel legalább 1 képet." });
    }

    const tuning = generateMockTuning(req.files);
    const formattedPrice = price ? Number(price) : null;

    const imageNames = req.files.map((file) => file.filename);

    const [result] = await pool.execute(
      "INSERT INTO analyses (seller, price, tuning, images) VALUES (?, ?, ?, ?)",
      [seller || "Ismeretlen", formattedPrice, tuning, JSON.stringify(imageNames)]
    );

    return res.json({
      id: result.insertId,
      seller: seller || "Ismeretlen",
      price: formattedPrice,
      tuning,
      images: imageNames
    });
  } catch (error) {
    return res.status(500).json({ message: "Hiba történt a feldolgozáskor." });
  }
});

app.get("/api/vehicles", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT id, name, price FROM vehicles ORDER BY id DESC");
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Hiba a járművek lekérdezésekor." });
  }
});

app.post("/api/vehicles", requireAdmin, async (req, res) => {
  try {
    const { name, price } = req.body || {};
    if (!name || !price) {
      return res.status(400).json({ message: "Név és ár megadása kötelező." });
    }
    const [result] = await pool.execute(
      "INSERT INTO vehicles (name, price) VALUES (?, ?)",
      [name, Number(price)]
    );
    return res.status(201).json({ id: result.insertId, name, price: Number(price) });
  } catch (error) {
    return res.status(500).json({ message: "Hiba a mentéskor." });
  }
});

app.get("/api/analyses", requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, seller, price, tuning, created_at FROM analyses ORDER BY created_at DESC"
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Hiba a lekérdezéskor." });
  }
});

app.listen(PORT, () => {
  console.log(`Szerver fut: http://localhost:${PORT}`);
});
