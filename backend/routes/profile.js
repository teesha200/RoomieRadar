import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs-extra";

const router = express.Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const username = req.session.username; // get logged-in user's username
    const uploadPath = path.join(process.cwd(), "frontend/static/uploads", username);
    await fs.ensureDir(uploadPath); // create folder if not exists
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  }
});

const upload = multer({ storage });

// In-memory user store (replace with MongoDB in production)
const users = {};

// Get current user profile
router.get("/me", (req, res) => {
  const username = req.session.username;
  if (!username) return res.status(401).json({ error: "Not logged in" });

  if (!users[username]) {
    return res.json({ username, email: req.session.email });
  }
  res.json(users[username]);
});

// Update profile
router.post("/update", upload.fields([
  { name: "photo", maxCount: 1 },
  { name: "photos", maxCount: 4 }
]), (req, res) => {
  const username = req.session.username;
  if (!username) return res.status(401).json({ error: "Not logged in" });

  if (!users[username]) {
    users[username] = { username, email: req.session.email };
  }

  const user = users[username];

  // Save text fields
  user.phone = req.body.phone || "";
  user.dob = req.body.dob || "";
  user.description = req.body.description || "";
  user.bio = req.body.bio || "";
  user.pronouns = req.body.pronouns || "";
  user.hobbies = req.body.hobbies || "";

  // Save main profile photo
  if (req.files["photo"]?.length > 0) {
    user.photo = `/uploads/${username}/${req.files["photo"][0].filename}`;
  }

  // Save gallery photos
  if (req.files["photos"]?.length > 0) {
    user.photos = req.files["photos"].map(f => `/uploads/${username}/${f.filename}`);
  }

  res.json({ success: true, user });
});

export default router; // ✅ default export
