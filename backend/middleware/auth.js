// backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes (ensure user is authenticated)
const protect = async (req, res, next) => {
    let token;

    // Assuming JWT is stored in a cookie named 'token'
    if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token.' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET); 

        // Attach the user object (excluding password) to the request
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
            return res.status(401).json({ message: 'Not authorized, user not found.' });
        }

        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        res.status(401).json({ message: 'Not authorized, token failed.' });
    }
};

module.exports = { protect };