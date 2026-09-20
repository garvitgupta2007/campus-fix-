const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const UPLOAD_DIR = path.join(ROOT, "uploads");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const COMPLAINTS_FILE = path.join(DATA_DIR, "complaints.json");

for (const dir of [DATA_DIR, UPLOAD_DIR]) fs.mkdirSync(dir, { recursive: true });

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let users = readJson(USERS_FILE, []);
let complaints = readJson(COMPLAINTS_FILE, []);

async function seed() {
  if (!users.length) {
    users = [
      {
        id: crypto.randomUUID(),
        name: "Campus Admin",
        email: "admin@sit.edu",
        passwordHash: await bcrypt.hash("Admin@123", 10),
        role: "admin",
        createdAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: "Demo Student",
        email: "student@sit.edu",
        passwordHash: await bcrypt.hash("Student@123", 10),
        role: "student",
        createdAt: new Date().toISOString()
      }
    ];
    writeJson(USERS_FILE, users);
  }
}
seed();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "campusfix-local-secret-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 8 }
}));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(ROOT, "public")));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (/^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed."));
  }
});

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
function currentUser(req) {
  return users.find(u => u.id === req.session.userId);
}
function requireAuth(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Please log in." });
  req.user = user;
  next();
}
function requireAdmin(req, res, next) {
  const user = currentUser(req);
  if (!user) return res.status(401).json({ error: "Please log in." });
  if (user.role !== "admin") return res.status(403).json({ error: "Admin access required." });
  req.user = user;
  next();
}

app.get("/api/health", (_, res) => res.json({ ok: true, app: "CampusFix" }));

app.get("/api/me", (req, res) => {
  const user = currentUser(req);
  res.json({ user: user ? safeUser(user) : null });
});

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (name.length < 2) return res.status(400).json({ error: "Enter your full name." });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email." });
  if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
  if (users.some(u => u.email === email)) return res.status(409).json({ error: "An account with this email already exists." });

  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: "student",
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeJson(USERS_FILE, users);
  req.session.userId = user.id;
  res.status(201).json({ user: safeUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = users.find(u => u.email === email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "Incorrect email or password." });
  }

  req.session.userId = user.id;
  res.json({ user: safeUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/complaints", requireAuth, (req, res) => {
  let result = complaints.slice();
  if (req.user.role !== "admin") result = result.filter(c => c.studentId === req.user.id);

  const q = String(req.query.q || "").toLowerCase().trim();
  const status = String(req.query.status || "All Status");
  if (q) {
    result = result.filter(c =>
      `${c.title} ${c.category} ${c.location} ${c.description}`.toLowerCase().includes(q)
    );
  }
  if (status !== "All Status") result = result.filter(c => c.status === status);

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ complaints: result });
});

app.get("/api/complaints/:id", requireAuth, (req, res) => {
  const c = complaints.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Complaint not found." });
  if (req.user.role !== "admin" && c.studentId !== req.user.id) {
    return res.status(403).json({ error: "You cannot view this complaint." });
  }
  res.json({ complaint: c });
});

app.post("/api/complaints", requireAuth, upload.single("photo"), (req, res) => {
  const title = String(req.body.title || "").trim();
  const category = String(req.body.category || "").trim();
  const location = String(req.body.location || "").trim();
  const priority = String(req.body.priority || "Normal");
  const description = String(req.body.description || "").trim();

  if (!title || !category || !location || !description) {
    return res.status(400).json({ error: "Title, category, location and description are required." });
  }

  const complaint = {
    id: `CF-${Date.now().toString().slice(-8)}`,
    studentId: req.user.id,
    studentName: req.user.name,
    title,
    category,
    location,
    priority: ["Normal", "High", "Urgent"].includes(priority) ? priority : "Normal",
    description,
    status: "Submitted",
    assignedTo: null,
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{
      id: crypto.randomUUID(),
      status: "Submitted",
      comment: "Complaint submitted.",
      by: req.user.name,
      at: new Date().toISOString()
    }]
  };

  complaints.push(complaint);
  writeJson(COMPLAINTS_FILE, complaints);
  res.status(201).json({ complaint });
});

app.patch("/api/complaints/:id", requireAdmin, (req, res) => {
  const c = complaints.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: "Complaint not found." });

  const allowedStatuses = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved", "Closed"];
  const newStatus = req.body.status;
  const comment = String(req.body.comment || "").trim();
  const assignedTo = req.body.assignedTo === "" ? null : (req.body.assignedTo ?? c.assignedTo);

  if (newStatus && !allowedStatuses.includes(newStatus)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  const oldStatus = c.status;
  if (newStatus && newStatus !== oldStatus) {
    c.status = newStatus;
    c.history.push({
      id: crypto.randomUUID(),
      status: newStatus,
      comment: comment || `Status changed from ${oldStatus} to ${newStatus}.`,
      by: req.user.name,
      at: new Date().toISOString()
    });
  } else if (comment) {
    c.history.push({
      id: crypto.randomUUID(),
      status: c.status,
      comment,
      by: req.user.name,
      at: new Date().toISOString()
    });
  }

  c.assignedTo = assignedTo;
  c.updatedAt = new Date().toISOString();
  writeJson(COMPLAINTS_FILE, complaints);
  res.json({ complaint: c });
});

app.get("/api/stats", requireAuth, (req, res) => {
  const data = req.user.role === "admin" ? complaints : complaints.filter(c => c.studentId === req.user.id);
  const stats = {
    total: data.length,
    submitted: data.filter(c => c.status === "Submitted").length,
    inProgress: data.filter(c => ["Under Review", "Assigned", "In Progress"].includes(c.status)).length,
    resolved: data.filter(c => ["Resolved", "Closed"].includes(c.status)).length,
    highPriority: data.filter(c => ["High", "Urgent"].includes(c.priority)).length
  };
  const categories = {};
  data.forEach(c => categories[c.category] = (categories[c.category] || 0) + 1);
  res.json({ stats, categories });
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  res.json({ users: users.map(safeUser) });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ error: err.message || "Upload failed." });
  }
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

app.listen(PORT, () => {
  console.log(`CampusFix running at http://localhost:${PORT}`);
});
