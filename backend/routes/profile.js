import express from "express";
import User from "../models/User.js";
import Profile from "../models/Profile.js";

const router = express.Router();

// ✅ Get logged-in user's profile (User + Profile merged)
router.get("/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    // Fetch user basic info
    const user = await User.findById(req.session.userId).select("username email");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Fetch profile details
    const profile = await Profile.findOne({ userId: req.session.userId });

    res.json({
      username: user.username,
      email: user.email,
      phone: profile?.phone || "",
      dob: profile?.dob || "",
      description: profile?.description || "",
      bio: profile?.bio || "",
      pronouns: profile?.pronouns || "",
      hobbies: profile?.hobbies || "",
      photo: profile?.photo || "",
      photos: profile?.photos || [],
    });
  } catch (err) {
    console.error("❌ Error in GET /me:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update profile (editable fields only)
router.post("/update", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not logged in" });
    }

    const { phone, dob, description, bio, pronouns, hobbies, photo, photos } = req.body;

    const profile = await Profile.findOneAndUpdate(
      { userId: req.session.userId },
      {
        phone,
        dob,
        description,
        bio,
        pronouns,
        hobbies,
        photo,
        photos,
      },
      { new: true, upsert: true } // create new if not exists
    );

    res.json(profile);
  } catch (err) {
    console.error("❌ Error in POST /update:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

export default router;
