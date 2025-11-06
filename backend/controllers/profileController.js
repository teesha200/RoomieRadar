const User = require('../models/User'); // Mongoose model for User
const { upload } = require('../middleware/upload'); // Middleware for handling photo uploads
const path = require('path'); // Standard Node.js path module

// Helper to calculate age from DOB
const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    // Check if birthday has occurred this year
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// @desc    Get current user profile OR another user's profile
// @route   GET /api/profile?id=:id
// @access  Private (checked by auth middleware)
const getProfile = async (req, res) => {
    try {
        // Get ID from query parameter (for viewing others) or current authenticated user
        const userId = req.query.id || req.user._id; 
        
        // Fetch user data, excluding sensitive or unnecessary fields for display
        const user = await User.findById(userId).select('-password -swipedLeft -swipedRight -matches -__v');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Calculate age dynamically if DOB is present
        let age = null;
        if (user.dateOfBirth) {
            age = calculateAge(user.dateOfBirth);
        }

        // Send back a clean user object with calculated age
        const profileData = {
            ...user.toObject(),
            age: age
        };

        res.json(profileData); 
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
};

// @desc    Update user profile details (Bio, Pronouns, Hobbies, Photo)
// @route   POST /api/profile/update
// @access  Private
const updateProfile = async (req, res) => {
    // The 'upload' middleware processes the file input named 'photoUpload' 
    // and calls this callback with the request/response objects.
    upload(req, res, async (err) => {
        if (err) {
            // Handle Multer errors (e.g., file size limit, invalid file type)
            console.error('Upload error:', err.message);
            return res.status(400).json({ error: `Upload failed: ${err.message}` });
        }

        const { dateOfBirth, description, bio, pronouns, hobbies, status, occupation } = req.body;
        
        // Ensure hobbies is an array for MongoDB; converts comma-separated string to array
        const hobbiesArray = Array.isArray(hobbies) 
            ? hobbies 
            : hobbies ? hobbies.split(',').map(h => h.trim()).filter(h => h.length > 0) : [];

        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ error: 'User not found.' });
            }

            // Update fields conditionally
            user.dateOfBirth = dateOfBirth || user.dateOfBirth;
            user.description = description || user.description;
            user.bio = bio || user.bio;
            user.pronouns = pronouns || user.pronouns;
            user.status = status || user.status;
            user.occupation = occupation || user.occupation;
            user.hobbies = hobbiesArray;
            
            // Mark profile as complete if required fields are present (simplified check here)
            if (user.dateOfBirth && user.bio) {
                user.isProfileComplete = true; 
            }

            // Update profile photo if a new file was uploaded
            if (req.file) {
                // Save relative path to the image, assuming the frontend serves /images/profiles
                user.profilePhoto = '/images/profiles/' + req.file.filename; 
            }

            await user.save();

            // *** IMPORTANT CHANGE: Sending JSON response for API call ***
            res.json({ message: '✅ Profile updated successfully!', user: user.toObject() });

        } catch (error) {
            console.error(error);
            // Handle database validation errors or general server errors
            res.status(500).json({ error: 'Server error saving profile.' });
        }
    });
};

// @desc    Get user preferences (for pre-filling the preferences form)
// @route   GET /api/profile/preferences
// @access  Private
const getPreferences = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select(
            'lookingFor genderPreference departmentPreference yearPreference seaterPreference hobbyPreference currentHostel'
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            lookingFor: user.lookingFor || '',
            genderPreference: user.genderPreference || '',
            departmentPreference: user.departmentPreference || '',
            yearPreference: user.yearPreference || '',
            seaterPreference: user.seaterPreference || '',
            hobbyPreference: user.hobbyPreference || [],
            currentHostel: user.currentHostel || '',
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching preferences.' });
    }
};

// @desc    Update user preferences (Survey form)
// @route   POST /api/profile/preferences
// @access  Private
const updatePreferences = async (req, res) => {
    const { lookingFor, genderPreference, departmentPreference, yearPreference, seaterPreference, hobbyPreference, currentHostel } = req.body;

    // Basic validation check
    if (!lookingFor || !genderPreference || !departmentPreference || !yearPreference || !seaterPreference) {
        // *** IMPORTANT CHANGE: Sending JSON error response for API call ***
        return res.status(400).json({ error: 'Missing required preference fields.' });
    }

    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        user.lookingFor = lookingFor;
        user.genderPreference = genderPreference;
        user.departmentPreference = departmentPreference;
        user.yearPreference = yearPreference;
        user.seaterPreference = seaterPreference;
        user.hobbyPreference = hobbyPreference;
        // Only save currentHostel if the purpose is 'Change Hostel'
        user.currentHostel = lookingFor === 'Change Hostel' ? currentHostel : undefined;

        await user.save();

        // *** IMPORTANT CHANGE: Sending JSON response for API call ***
        res.json({ message: '✅ Preferences updated successfully!', user: user.toObject() });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error saving preferences.' });
    }
};

// Helper: Calculate compatibility score (Simplified logic)
const calculateCompatibility = (userPrefs, matchProfile) => {
    let score = 0;
    let maxScore = 5;

    // 1. Gender Preference
    if (userPrefs.genderPreference === 'No Preference' || userPrefs.genderPreference === matchProfile.gender) {
        score += 1;
    }

    // 2. Department Preference
    if (userPrefs.departmentPreference === matchProfile.department) {
        score += 1;
    }

    // 3. Year Preference (Closer years score higher)
    const yearDiff = Math.abs(parseInt(userPrefs.yearPreference) - parseInt(matchProfile.year));
    if (yearDiff === 0) {
        score += 2;
        maxScore += 1; // Increase max score for better separation
    } else if (yearDiff === 1) {
        score += 1;
    }

    // 4. Seater Preference
    if (userPrefs.seaterPreference === matchProfile.seaterPreference) {
        score += 1;
    }
    
    // NOTE: Hobbies preference matching can be added here (e.g., checking for array intersections)

    // Convert to percentage
    const percentage = Math.round((score / maxScore) * 100);
    return Math.min(percentage, 100); // Ensure it doesn't exceed 100%
};

// @desc    Get potential matches
// @route   GET /api/profile/matches
// @access  Private
const getMatches = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user._id);
        if (!currentUser) return res.status(404).json({ message: 'User not found' });
        
        // Ensure user has completed profile and set preferences
        if (!currentUser.isProfileComplete || !currentUser.lookingFor) {
            return res.status(400).json({ message: 'Please complete your profile and preferences first.' });
        }

        // Users to exclude: current user, users already swiped, and users already matched with
        const excludedUserIds = [
            currentUser._id, 
            ...currentUser.swipedLeft, 
            ...currentUser.swipedRight, 
            ...currentUser.matches
        ];
        
        // Find users who are looking for the same thing and exclude those already processed
        let potentialMatches = await User.find({
            _id: { $nin: excludedUserIds },
            isProfileComplete: true,
            lookingFor: currentUser.lookingFor, // Simple initial filter
            // Add filtering for basic gender preference here if desired
        }).select('-password -swipedLeft -swipedRight -matches -dateOfBirth -__v');
        
        // Calculate compatibility for each match and sort
        const matchesWithScore = potentialMatches.map(match => {
            // Note: The compatibility calculation relies on fields like matchProfile.gender/department/year being set on the User model
            const compatibility = calculateCompatibility(currentUser, match); 
            return {
                ...match.toObject(),
                compatibilityPercentage: compatibility
            };
        });

        // Sort by compatibility (most compatible on top)
        matchesWithScore.sort((a, b) => b.compatibilityPercentage - a.compatibilityPercentage);

        res.json(matchesWithScore);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching matches.' });
    }
};

// @desc    Handle a swipe action (left or right)
// @route   POST /api/profile/swipe/:targetUserId
// @access  Private
const swipe = async (req, res) => {
    const { targetUserId } = req.params;
    const { direction } = req.body; // 'right' or 'left'
    const currentUserId = req.user._id;

    if (!['right', 'left'].includes(direction)) {
        return res.status(400).json({ message: 'Invalid swipe direction.' });
    }

    try {
        const currentUser = await User.findById(currentUserId);
        const targetUser = await User.findById(targetUserId);

        if (!currentUser || !targetUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // 1. Add target user to current user's swipe list
        if (direction === 'right') {
            // Check for mutual match (if target also swiped right on current user)
            if (targetUser.swipedRight.includes(currentUserId)) {
                // MUTUAL MATCH!
                currentUser.matches.addToSet(targetUserId);
                targetUser.matches.addToSet(currentUserId);
                await targetUser.save();
                await currentUser.save();
                return res.json({ message: 'Match!', isMatch: true, matchId: targetUserId });
            } else {
                currentUser.swipedRight.addToSet(targetUserId);
            }
        } else if (direction === 'left') {
            currentUser.swipedLeft.addToSet(targetUserId);
        }

        await currentUser.save();

        res.json({ message: 'Swipe successful.', isMatch: false });
        
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error processing swipe.' });
    }
};

module.exports = { 
    getProfile, 
    updateProfile, 
    getPreferences, // New function for fetching preferences
    updatePreferences, 
    getMatches,
    swipe 
};