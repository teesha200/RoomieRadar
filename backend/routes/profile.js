// backend/routes/profile.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { 
    getProfile, 
    updateProfile, 
    updatePreferences, 
    getMatches,
    swipe
} = require('../controllers/profileController');

// All routes here require authentication (protect middleware)

// Get current user profile and view a specific profile
router.get('/', protect, getProfile); 

// Update profile details (uses upload middleware for photo)
router.post('/update', protect, upload, updateProfile); 

// Update user preferences (survey)
router.post('/preferences', protect, updatePreferences); 

// Get list of potential matches
router.get('/matches', protect, getMatches);

// Handle swipe (left/right)
router.post('/swipe/:targetUserId', protect, swipe);

module.exports = router;