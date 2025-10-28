import Profile from "../models/Profile.js";
// Note: Imports for path, fs, etc., are usually not needed here, 
// as Multer handles file system actions, and we only store the path in the DB.

// =========================================================================
// GET Profile: Fetches existing profile or creates a default one
// =========================================================================
export const getProfile = async (req, res) => {
    // 1. Authentication Check (req.user must be set by requireAuth middleware)
    if (!req.user || !req.user._id) {
        return res.status(401).json({ error: "Unauthorized: User not logged in." });
    }

    try {
        const userId = req.user._id; 
        
        let profile = await Profile.findOne({ userId }); 

        // 2. CRITICAL FIX for "Error Loading": If profile doesn't exist, create it.
        if (!profile) {
            profile = new Profile({
                userId: userId,
                // These fields are necessary for the initial profile creation
                username: req.user.username || 'New User',
                email: req.user.email || 'user@example.com',
                // Initialize all required fields to prevent null/undefined errors on the frontend
                pronouns: "",
                bio: "",
                description: "",
                hobbies: "",
                status: "",
                occupation: "",
            });
            await profile.save();
        }

        // 3. Send the profile data with status 200 (Success!)
        return res.status(200).json(profile);

    } catch (error) {
        console.error("Profile load error:", error);
        return res.status(500).json({ error: "Server error fetching profile." });
    }
};

// =========================================================================
// POST Update Profile: Updates existing profile fields
// =========================================================================
export const updateProfile = async (req, res) => {
    if (!req.user || !req.user._id) {
        return res.status(401).json({ error: "Unauthorized: User not logged in." });
    }

    try {
        const userId = req.user._id;

        // 1. Find the existing profile FIRST
        let profile = await Profile.findOne({ userId });

        if (!profile) {
            // Should be rare if getProfile is called, but essential for safety
            return res.status(404).json({ error: "Profile not found. Cannot update." });
        }
        
        // 2. Prepare updates from request body (Apply new text fields directly)
        profile.pronouns = req.body.pronouns || "";
        profile.bio = req.body.bio || "";
        profile.description = req.body.description || "";
        profile.hobbies = req.body.hobbies || "";
        profile.status = req.body.status || "";
        profile.occupation = req.body.occupation || "";

        // 3. Handle file uploads: ONLY update photo if a new file is uploaded
        const username = req.user.username; 

        if (req.files && req.files["photo"] && req.files["photo"].length > 0) {
            // Helper function logic for photo path
            const getPhotoPath = (user, filename) => `/uploads/${user}/${filename}`;
            profile.photo = getPhotoPath(username, req.files["photo"][0].filename);
        }
        // NOTE: If no new photo is uploaded, profile.photo retains its previous value!
        
        // 4. Save the merged profile document
        const updatedProfile = await profile.save();
        
        // 5. Send the updated document
        res.json({ success: true, profile: updatedProfile });

    } catch (error) {
        console.error("Profile update error:", error);
        return res.status(500).json({ error: "Server error during profile update." });
    }
};
