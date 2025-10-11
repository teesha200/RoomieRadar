import User from "../models/User.js";

export const getProfile = async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  if (!user) return res.redirect("/login");
  // EJS template will use "user" (with virtual age)
  res.render("profile", { user });
};
