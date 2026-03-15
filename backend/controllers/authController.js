const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "chatapp_secret_key_2024";

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email is already registered" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { _id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio, isPrivate: user.isPrivate, settings: user.settings } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Email not found" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { _id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio, isPrivate: user.isPrivate, settings: user.settings } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};