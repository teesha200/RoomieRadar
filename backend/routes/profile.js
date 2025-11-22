// backend/routes/profile.js

const express = require("express");
const router = express.Router();

// always use your auth.js file
const auth = require("../middleware/auth");

const multer = require("multer");

// Controllers
const {
  updateProfile,
  getMyProfile,
  savePreferences,
  getMatches
} = require("../controllers/profileController");

// Multer memory storage for Base64 image conversion
const upload = multer({
    storage: multer.memoryStorage()
});

// -----------------------------------
// ROUTES
// -----------------------------------

// Update or create profile (with image upload)
router.post(
  "/update",
  auth,
  upload.single("profilePicture"),
  updateProfile
);

// Get logged-in user's profile
router.get("/me", auth, getMyProfile);

// Save user preferences
router.post("/preferences", auth, savePreferences);

// Load matches
router.get("/matches", auth, getMatches);

module.exports = router;
