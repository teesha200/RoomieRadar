const User = require("../models/User");
const Profile = require("../models/Profile");
const Preferences = require("../models/Preferences");

// -----------------------------
// Convert multer file to Base64
// -----------------------------
function fileBufferToDataUrl(file) {
  if (!file || !file.mimetype || !file.buffer) return null;
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

// ------------------------------------------------------
// POST /api/profile/update
// ------------------------------------------------------
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user && (req.user._id || req.user.id);
    if (!userId) return res.status(401).json({ error: "Not authenticated" });

    const {
      fullName,
      birthDate,
      gender,
      course,
      yearOfStudy,
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
    if (yearOfStudy) updateData.yearOfStudy = yearOfStudy; 
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

    await User.findByIdAndUpdate(userId, { profile: profile._id });

    return res.redirect("/profile_view.html?updated=1");

  } catch (err) {
    console.error("Profile Update Error:", err);
    return res.status(500).json({ error: "Server Error during profile update." });
  }
};

// ------------------------------------------------------
// GET /api/profile/me
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
// ------------------------------------------------------
exports.savePreferences = async (req, res) => {
  try {
    const userId = req.user._id;

    const {
      lookingFor,
      currentHostel,
      hostelPreference,
      genderPreference,
      departmentPreference,
      yearPreference,
      seaterPreference,
      hobbyPreference
    } = req.body;

    let preferences = await Preferences.findOne({ user: userId });
    if (!preferences) {
      preferences = new Preferences({ user: userId });
    }

    preferences.lookingFor = lookingFor || "";
    preferences.currentHostel = currentHostel || "";
    preferences.hostelPreference = hostelPreference || "";
    preferences.preferredGender = genderPreference || "";
    preferences.department = departmentPreference || "";
    preferences.yearOfStudy = yearPreference || "";
    preferences.seaterType = seaterPreference || "";
    preferences.hobbies = hobbyPreference ? [hobbyPreference] : [];

    await preferences.save();
    await User.findByIdAndUpdate(userId, { preferences: preferences._id });

    return res.redirect("/matches.html");

  } catch (err) {
    console.error("Save Preferences Error:", err);
    return res.redirect("/preferences.html?error=1");
  }
};

// ------------------------------------------------------
// GET /api/profile/matches
// ------------------------------------------------------
exports.getMatches = async (req, res) => {
  try {
    const userId = req.user._id;

    const myProfile = await Profile.findOne({ user: userId }).lean();
    const myPref = await Preferences.findOne({ user: userId }).lean();

    const allProfiles = await Profile.find({ user: { $ne: userId } })
      .populate("user")
      .lean();

    const matches = [];

    // Helper to extract hobbies from bio
    function extractHobbiesFromBio(bio) {
      const keywords = ['reading','painting','drawing','dancing','writing','gossiping','editing','sleeping','resting','hiking','coding','coffee'];
      const found = [];
      const s = (bio||'').toLowerCase();
      keywords.forEach(k => { if (s.includes(k)) found.push(k.charAt(0).toUpperCase()+k.slice(1)); });
      return found;
    }

    for (const theirProfile of allProfiles) {
      const theirPref = await Preferences.findOne({ user: theirProfile.user._id }).lean() || {};

      let score = 0;

      if (myPref) {
        // Gender preference
        if (!myPref.preferredGender || myPref.preferredGender === theirProfile.gender) score += 20;

        // Department
        const theirDepartment = theirPref.department || theirProfile.course || "N/A";
        if (myPref.department && myPref.department === theirDepartment) score += 20;

        // Year of study
        const theirYear = theirPref.yearOfStudy || "N/A";
        if (myPref.yearOfStudy && myPref.yearOfStudy === theirYear) score += 15;

        // Seater type
        if (myPref.seaterType && myPref.seaterType === (theirPref.seaterType || theirProfile.seaterType)) score += 15;

        // Hobbies overlap
        const theirHobbies = (Array.isArray(theirPref.hobbies) && theirPref.hobbies.length)
          ? theirPref.hobbies
          : extractHobbiesFromBio(theirProfile.bio || "");
        if (Array.isArray(myPref.hobbies)) {
          const common = myPref.hobbies.filter(h => theirHobbies.includes(h));
          score += common.length * 5;
        }
      }

      matches.push({
        id: theirProfile.user._id,
        fullName: theirProfile.fullName || "Unknown",
        profilePicture: theirProfile.profilePicture || "",
        department: theirPref.department || theirProfile.course || "N/A",
        yearOfStudy: theirPref.yearOfStudy || theirProfile.yearOfStudy || "N/A",
        hobbies: (Array.isArray(theirPref.hobbies) && theirPref.hobbies.length)
          ? theirPref.hobbies
          : extractHobbiesFromBio(theirProfile.bio || ""),
        matchScore: Math.min(score, 100)
      });
    }

    return res.json({ matches });

  } catch (err) {
    console.error("Get Matches Error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
