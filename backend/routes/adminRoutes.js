const router = require("express").Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const auth = require("../middleware/auth");

const ADMIN_USERNAME = "Pragna";

// Admin middleware - checks by ID lookup
const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.username !== ADMIN_USERNAME) {
      return res.status(403).json({ message: "Admin only" });
    }
    next();
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Get all users
router.get("/users", auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find({})
      .select("username email profilePic bio isPrivate isVerified followers following createdAt")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Reset password
router.post("/reset-password", auth, adminOnly, async (req, res) => {
  try {
    const { username, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Min 6 characters" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ username }, { password: hashed });
    res.json({ message: `Password reset for @${username}` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Delete user
router.delete("/users/:username", auth, adminOnly, async (req, res) => {
  try {
    const { username } = req.params;
    if (username === ADMIN_USERNAME)
      return res.status(400).json({ message: "Cannot delete admin account" });
    const result = await User.deleteOne({ username });
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "User not found" });
    res.json({ message: `@${username} deleted` });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
