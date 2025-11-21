// backend/controllers/profileController.js
const User = require("../models/User");
const Profile = require("../models/Profile");
const Preferences = require("../models/Preferences");

// -----------------------------
// Helper: convert multer file buffer to Base64
// -----------------------------
function fileBufferToDataUrl(file) {
  if (!file || !file.mimetype || !file.buffer) return null;
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

// ------------------------------------------------------
// POST /api/profile/update
// Create or update profile
// ------------------------------------------------------
exports.updateProfile = async (req, res) => {
  console.log("FILE RECEIVED:", req.file);
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const {
      fullName,
      birthDate,
      gender,
      course,
      permanentAddress,
      contactNumber,
      instagramLink,
      linkedinLink,
      bio
    } = req.body;

    const updateData = {};

    if (fullName) updateData.fullName = fullName;
    if (birthDate) updateData.birthDate = new Date(birthDate);
    if (gender) updateData.gender = gender;
    if (course) updateData.course = course;
    if (permanentAddress) updateData.permanentAddress = permanentAddress;
    if (contactNumber) updateData.contactNumber = contactNumber;
    if (bio) updateData.bio = bio;

    updateData.socialLinks = {
      instagram: instagramLink?.trim() || "",
      linkedin: linkedinLink?.trim() || ""
    };

    const uploadedImage = fileBufferToDataUrl(req.file);
    if (uploadedImage) {
      updateData.profilePicture = uploadedImage;
    }

    const profile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Update User model reference
    await User.findByIdAndUpdate(userId, { profile: profile._id }).catch(err => {
      console.error("Warning: Failed to update User.profile reference:", err);
    });

    // 🔥 Redirect to profile_view instead of showing JSON
    return res.redirect("/profile_view.html?updated=1");

  } catch (err) {
    console.error("Profile Update Error:", err);
    return res.status(500).json({ error: "Server Error during profile update." });
  }
};

// ------------------------------------------------------
// GET /api/profile/me
// Fetch logged-in user's profile
// ------------------------------------------------------
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const profile = await Profile.findOne({ user: userId }).lean();

    if (!profile) {
      return res.json({
        user: userId,
        fullName: "",
        birthDate: null,
        gender: "",
        course: "",
        permanentAddress: "",
        contactNumber: "",
        socialLinks: { instagram: "", linkedin: "" },
        bio: "",
        profilePicture: ""
      });
    }

    return res.json(profile);
  } catch (err) {
    console.error("Fetch Profile Error:", err);
    res.status(500).json({ error: "Server Error fetching profile." });
  }
};

// ------------------------------------------------------
// POST /api/profile/preferences
// Save user preferences
// ------------------------------------------------------
exports.savePreferences = async (req, res) => {
  try {
    const userId = req.user._id;
    const data = req.body;

    let preferences = await Preferences.findOne({ user: userId });

    if (!preferences) {
      preferences = new Preferences({ user: userId });
    }

    Object.assign(preferences, data);
    await preferences.save();

    await User.findByIdAndUpdate(userId, { preferences: preferences._id });

    return res.redirect("/dashboard.html?preferencesSaved=1");

  } catch (err) {
    console.error("Save Preferences Error:", err);
    return res.redirect("/preferences.html?error=1");
  }
};

// ------------------------------------------------------
// GET /api/profile/matches
// Matching algorithm
// ------------------------------------------------------
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;

    const myProfile = await Profile.findOne({ user: userId }).lean();
    const myPreferences = await Preferences.findOne({ user: userId }).lean();

    if (!myPreferences) return res.json({ matches: [] });

    const allProfiles = await Profile.find({ user: { $ne: userId } }).populate("user").lean();

    const matches = [];

    for (const profile of allProfiles) {
      const pref = await Preferences.findOne({ user: profile.user._id }).lean();
      if (!pref) continue;

      let score = 0;

      if (myPreferences.preferredGender && profile.gender === myPreferences.preferredGender) score += 20;
      if (myPreferences.department && pref.department === myPreferences.department) score += 10;
      if (myPreferences.yearOfStudy && pref.yearOfStudy === myPreferences.yearOfStudy) score += 8;
      if (myPreferences.seaterType && pref.seaterType === myPreferences.seaterType) score += 6;

      if (Array.isArray(myPreferences.hobbies) && Array.isArray(pref.hobbies)) {
        const common = myPreferences.hobbies.filter(h => pref.hobbies.includes(h));
        score += common.length * 5;
      }

      if (score >= 20) matches.push(profile);
    }

    return res.json({ matches });

  } catch (err) {
    console.error("Get Matches Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
