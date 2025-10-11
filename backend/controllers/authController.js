import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

export const postSignup = async (req, res) => {
  try {
    // Ensure exactly 4 photos uploaded
    if (!req.files || req.files.length !== 4) {
      return res.status(400).send("Exactly 4 photos are required.");
    }

    const {
      username,
      name,
      email,
      password,
      confirm_password,
      dob,
      pronouns,
      hobbies,
      bio,
      description
    } = req.body;

    if (password !== confirm_password) {
      return res.status(400).send("Passwords do not match.");
    }

    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(409).send("Email or username already in use.");

    const passwordHash = await bcrypt.hash(password, 12);

    const photos = req.files.map(f => ({
      filename: f.filename,
      url: `/uploads/${f.filename}`
    }));

    const hobbiesArray = Array.isArray(hobbies)
      ? hobbies
      : (hobbies || "")
          .split(",")
          .map(h => h.trim())
          .filter(Boolean);

    const user = await User.create({
      username,
      name,
      email,
      passwordHash,
      dob: new Date(dob),
      pronouns,
      hobbies: hobbiesArray,
      bio,
      description,
      photos
    });

    req.session.userId = user._id.toString();

    // After signup, you can either redirect to /profile directly or to /login then /profile
    return res.redirect("/profile");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Signup failed.");
  }
};

export const postLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });
    if (!user) return res.status(400).send("Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).send("Invalid credentials");

    req.session.userId = user._id.toString();
    return res.redirect("/profile");
  } catch (err) {
    console.error(err);
    return res.status(500).send("Login failed.");
  }
};

export const getLogout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
};
