// inside server.js
import multer from "multer";
import fs from "fs-extra";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import session from "express-session";
import MongoStore from "connect-mongo";
import morgan from "morgan";

import { connectDB } from "./config/db.js";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profile.js";

// 🔒 Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.redirect("/login.html"); // redirect to login page if not logged in
};

dotenv.config();
await connectDB();

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan("dev"));

// sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
  })
);

// 👉 Serve frontend files (HTML/CSS)
app.use(express.static(path.join(__dirname, "../frontend/static")));
app.use("/", express.static(path.join(__dirname, "../frontend/templates")));

// ✅ Serve login.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/templates/login.html"));
});

// ✅ Protect profile.html
app.get("/profile.html", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/templates/profile.html"));
});

// routes
app.use("/auth", authRoutes);
app.use("/profile", requireAuth, profileRoutes);

// health
app.get("/health", (_, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const username = req.session.username; // get logged-in username from session
    const uploadPath = path.join(__dirname, "../frontend/static/uploads", username);
    await fs.ensureDir(uploadPath); // create folder if not exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

// Replace with your real MongoDB model
const users = {}; // key = username

app.post("/profile/update", requireAuth, upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "photos", maxCount: 4 }
]), (req, res) => {
  const username = req.session.username;
  if (!users[username]) users[username] = { username, email: req.session.email };

  const user = users[username];

  // Save text fields
  user.phone = req.body.phone;
  user.dob = req.body.dob;
  user.description = req.body.description;
  user.bio = req.body.bio;
  user.pronouns = req.body.pronouns;
  user.hobbies = req.body.hobbies;

  // Save main profile photo
  if (req.files["photo"]) {
    user.photo = `/uploads/${username}/${req.files["photo"][0].filename}`;
  }

  // Save gallery photos
  if (req.files["photos"]) {
    user.photos = req.files["photos"].map(f => `/uploads/${username}/${f.filename}`);
  }

  res.json({ success: true, user });
});


app.get("/profile/me", requireAuth, (req, res) => {
  const username = req.session.username;
  if (!users[username]) {
    return res.json({ username, email: req.session.email });
  }
  res.json(users[username]);
});
