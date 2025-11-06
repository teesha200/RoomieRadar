// backend/routes/profileRoutes.js

const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/auth'); // Assuming 'protect' middleware checks login status
const { uploadPhoto } = require('../middleware/upload'); // Assuming 'uploadPhoto' handles photo upload

// Route for fetching the current user's profile details
// GET /profile/me
// Protected: Requires user to be logged in
router.get('/me', protect, profileController.getProfile);

// Route for updating the current user's profile details
// POST /profile/update
// Protected: Requires user to be logged in
// Uses the uploadPhoto middleware for image upload
router.post('/update', protect, uploadPhoto, profileController.updateProfile); 

module.exports = router;