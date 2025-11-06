// backend/controllers/authController.js
const User = require('../models/User'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /auth/signup
const registerUser = async (req, res) => {
  const { username, email, password, confirm_password } = req.body;

  if (!username || !email || !password || !confirm_password) {
    // Simple redirect with an error query param
    return res.redirect('/signup.html?error=missing');
  }

  if (password !== confirm_password) {
    return res.redirect('/signup.html?error=mismatch');
  }

  try {
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.redirect('/signup.html?error=exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Automatically log in the user after registration
    const token = generateToken(user._id);

    // Set token in cookie and redirect to login (or dashboard)
    res.cookie('token', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
    }).redirect('/login.html?registered=true');

  } catch (error) {
    console.error(error);
    res.redirect('/signup.html?error=server');
  }
};

// @desc    Authenticate user & get token
// @route   POST /auth/login
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // User matched, generate token
      const token = generateToken(user._id);

      // Set token in cookie and redirect to dashboard
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
      }).redirect('/dashboard.html');
    } else {
      // Invalid credentials
      res.redirect('/login.html?error=invalid');
    }
  } catch (error) {
    console.error(error);
    res.redirect('/login.html?error=server');
  }
};

// @desc    Logout user / clear cookie
// @route   GET /auth/logout
const logoutUser = (req, res) => {
    res.clearCookie('token');
    res.redirect('/login.html');
};


module.exports = { registerUser, loginUser, logoutUser };