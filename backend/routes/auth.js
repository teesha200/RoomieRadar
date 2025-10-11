import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.redirect("/signup.html?error=missing");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.redirect("/signup.html?error=exists");
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username,
      email,
      passwordHash
    });

    await newUser.save();

    // Redirect to login after successful signup
    return res.redirect("/login.html?success=1");
  } catch (err) {
    console.error(err);
    return res.redirect("/signup.html?error=server");
  }
});

// Login route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.redirect("/login.html?error=missing");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect("/login.html?error=invalid");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.redirect("/login.html?error=invalid");
    }

    // Save session
    req.session.userId = user._id;
    return res.redirect("/dashboard.html");
  } catch (err) {
    console.error(err);
    return res.redirect("/login.html?error=server");
  }
});

export default router;
