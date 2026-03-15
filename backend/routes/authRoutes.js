const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const OTP = require("../models/OTP");
const { sendOTP } = require("../utils/mailer");

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "All fields required" });
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: "Email or username already taken" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hashed });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: { _id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio, isPrivate: user.isPrivate, isVerified: user.isVerified, settings: user.settings }, token });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "No account found with this email" });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect password" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: { _id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio, isPrivate: user.isPrivate, isVerified: user.isVerified, settings: user.settings }, token });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account found with this email" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await OTP.deleteMany({ email });
    await OTP.create({ email, otp });
    await sendOTP(email, otp);
    res.json({ message: "OTP sent to your email!" });
  } catch (err) {
    console.log("OTP error:", err);
    res.status(500).json({ message: "Failed to send OTP. Check Gmail credentials." });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const record = await OTP.findOne({ email, otp, used: false });
    if (!record) return res.status(400).json({ message: "Invalid or expired OTP" });
    if (record.expiresAt < new Date()) return res.status(400).json({ message: "OTP expired. Request a new one." });
    await OTP.updateOne({ _id: record._id }, { used: true });
    const user = await User.findOne({ email });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ user: { _id: user._id, username: user.username, email: user.email, profilePic: user.profilePic, bio: user.bio, isPrivate: user.isPrivate, isVerified: user.isVerified, settings: user.settings }, token });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
