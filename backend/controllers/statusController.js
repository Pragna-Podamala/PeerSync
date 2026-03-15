const Status = require("../models/Status");
const User = require("../models/User");
const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/status";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
exports.uploadStatusMiddleware = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Create status with privacy
exports.createStatus = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const mediaUrl = `${req.protocol}://${req.get("host")}/uploads/status/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    const { caption, privacy, closeFriends } = req.body;

    const status = await Status.create({
      user: req.user.id,
      mediaUrl,
      mediaType,
      caption: caption || "",
      privacy: privacy || "everyone",
      closeFriends: closeFriends ? JSON.parse(closeFriends) : [],
    });
    await status.populate("user", "username profilePic");
    res.status(201).json(status);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Get statuses — filter by privacy
exports.getStatuses = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const myUsername = me.username;
    const following = [...me.following, me._id];

    const allStatuses = await Status.find({
      user: { $in: following },
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePic")
      .sort({ createdAt: -1 });

    // Filter based on privacy rules
    const visible = allStatuses.filter(s => {
      // Always show own statuses
      if (s.user._id.toString() === me._id.toString()) return true;
      if (s.privacy === "nobody") return false;
      if (s.privacy === "everyone") return true;
      if (s.privacy === "closeFriends") return s.closeFriends.includes(myUsername);
      return false;
    });

    res.json(visible);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.viewStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ message: "Not found" });
    if (!status.viewers.includes(req.user.id)) {
      status.viewers.push(req.user.id);
      await status.save();
    }
    res.json({ message: "Viewed" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteStatus = async (req, res) => {
  try {
    await Status.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Update status privacy
exports.updatePrivacy = async (req, res) => {
  try {
    const { privacy, closeFriends } = req.body;
    const status = await Status.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { privacy, closeFriends: closeFriends || [] },
      { new: true }
    );
    if (!status) return res.status(404).json({ message: "Not found" });
    res.json(status);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Get my statuses with viewer details
exports.getMyStatuses = async (req, res) => {
  try {
    const statuses = await Status.find({
      user: req.user.id,
      expiresAt: { $gt: new Date() },
    })
      .populate("viewers", "username profilePic")
      .sort({ createdAt: -1 });
    res.json(statuses);
  } catch (err) { res.status(500).json({ message: err.message }); }
};