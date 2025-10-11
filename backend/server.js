// inside server.js
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
