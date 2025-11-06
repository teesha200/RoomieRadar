// backend/models/User.js

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    profilePhoto: {
        type: String, // Path to the image file
        default: '/images/default-avatar.png' 
    },
    dateOfBirth: {
        type: Date,
    },
    pronouns: String,
    bio: String,
    description: String,
    isProfileComplete: {
        type: Boolean,
        default: false,
    },
    // Matching and Swiping fields
    swipedLeft: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    swipedRight: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    matches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    // Preference Fields
    lookingFor: String, 
    genderPreference: String,
    departmentPreference: String,
    yearPreference: String,
    seaterPreference: String,
    hobbyPreference: String,
    currentHostel: String,
}, { timestamps: true });

// NOTE: You'll typically add pre-save hooks here for password hashing (using bcrypt)

module.exports = mongoose.model('User', UserSchema);