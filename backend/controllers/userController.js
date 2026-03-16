const User = require("../models/User");
const Message = require("../models/Message");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/profiles";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
exports.uploadProfilePicMiddleware = multer({ storage: profileStorage, limits: { fileSize: 5 * 1024 * 1024 } });

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/media";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
exports.uploadMediaMiddleware = multer({ storage: mediaStorage, limits: { fileSize: 50 * 1024 * 1024 } });

const wallpaperStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/wallpapers";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
exports.uploadWallpaperMiddleware = multer({ storage: wallpaperStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const canSee = (targetUser, viewerUsername, privacyKey, closeFriendsKey) => {
  const privacy = targetUser.settings?.[privacyKey] || "everyone";
  if (privacy === "everyone") return true;
  if (privacy === "nobody") return false;
  if (privacy === "closeFriends") return (targetUser.settings?.[closeFriendsKey] || []).includes(viewerUsername);
  return true;
};

exports.getAllUsers = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const users = await User.find({ _id: { $ne: req.user.id, $nin: me.blockedUsers } })
      .select("username profilePic bio isPrivate isVerified settings followers following");
    const filtered = users.map(u => {
      const obj = u.toObject();
      if (!canSee(u, me.username, "profilePicPrivacy", "profilePicCloseFriends")) obj.profilePic = "";
      // Add mutual follow flag
      const iFollow = me.following.some(id => id.toString() === u._id.toString());
      const theyFollow = u.followers.some(id => id.toString() === me._id.toString());
      obj.isMutual = iFollow && theyFollow;
      obj.iFollow = iFollow;
      obj.followsMe = theyFollow;
      return obj;
    });
    res.json(filtered);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getUser = async (req, res) => {
  try {
    const viewer = await User.findById(req.user.id);
    const user = await User.findOne({ username: req.params.username })
      .select("-password -twoFactorSecret")
      .populate("followers", "username profilePic")
      .populate("following", "username profilePic")
      .populate("followRequests", "username profilePic")
      .populate("sentRequests", "username profilePic")
      .populate("blockedUsers", "username profilePic");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Track profile view
    if (user._id.toString() !== viewer._id.toString() && !user.profileViews.includes(viewer._id)) {
      user.profileViews.push(viewer._id);
      await user.save();
    }

    const obj = user.toObject();
    const vn = viewer.username;
    if (!canSee(user, vn, "profilePicPrivacy", "profilePicCloseFriends")) { obj.profilePic = ""; obj._profilePicHidden = true; }
    if (!canSee(user, vn, "lastSeenPrivacy", "lastSeenCloseFriends")) obj._lastSeenHidden = true;
    if (!canSee(user, vn, "onlinePrivacy", "onlineCloseFriends")) obj._onlineHidden = true;

    // Mutual followers
    const myFollowing = viewer.following.map(id => id.toString());
    obj.mutualFollowers = (user.followers || []).filter(f => myFollowing.includes(f._id?.toString())).map(f => f.username);

    res.json(obj);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const { bio, isPrivate, username } = req.body;
    const update = {};
    if (bio !== undefined) update.bio = bio;
    if (isPrivate !== undefined) update.isPrivate = isPrivate;
    if (username !== undefined) {
      // Username change — check uniqueness
      const existing = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ message: "Username already taken" });
      update.username = username;
    }
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateSettings = async (req, res) => {
  try {
    const allowed = [
      "showReadReceipts","profilePicPrivacy","lastSeenPrivacy","onlinePrivacy",
      "profilePicCloseFriends","lastSeenCloseFriends","onlineCloseFriends",
    ];
    const update = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) update[`settings.${k}`] = req.body[k]; });

    // Notification settings
    const notifKeys = ["sound","pushEnabled","dndEnabled","dndStart","dndEnd"];
    notifKeys.forEach(k => { if (req.body[k] !== undefined) update[`notificationSettings.${k}`] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select("-password");
    res.json(user);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.uploadProfilePic = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const picUrl = `${req.protocol}://${req.get("host")}/uploads/profiles/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(req.user.id, { profilePic: picUrl }, { new: true }).select("-password");
    res.json({ profilePic: user.profilePic });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const mediaUrl = `${req.protocol}://${req.get("host")}/uploads/media/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith("video") ? "video" : "image";
    res.json({ mediaUrl, mediaType });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Chat wallpaper
exports.setChatWallpaper = async (req, res) => {
  try {
    const { chatUsername } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file" });
    const url = `${req.protocol}://${req.get("host")}/uploads/wallpapers/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { [`chatWallpapers.${chatUsername}`]: url });
    res.json({ wallpaper: url });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.removeChatWallpaper = async (req, res) => {
  try {
    const { chatUsername } = req.params;
    await User.findByIdAndUpdate(req.user.id, { $unset: { [`chatWallpapers.${chatUsername}`]: "" } });
    res.json({ message: "Removed" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Star message
exports.starMessage = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const msgId = req.params.id;
    const isStarred = me.starredMessages.includes(msgId);
    if (isStarred) {
      me.starredMessages = me.starredMessages.filter(id => id.toString() !== msgId);
    } else {
      me.starredMessages.push(msgId);
    }
    await me.save();
    res.json({ starred: !isStarred });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getStarredMessages = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate("starredMessages");
    res.json(me.starredMessages || []);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Pin chat
exports.pinChat = async (req, res) => {
  try {
    const { username } = req.body;
    const me = await User.findById(req.user.id);
    if (me.pinnedChats.includes(username)) {
      me.pinnedChats = me.pinnedChats.filter(u => u !== username);
    } else {
      me.pinnedChats.unshift(username);
    }
    await me.save();
    res.json({ pinnedChats: me.pinnedChats });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Profile view count
exports.getProfileViews = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("profileViews", "username profilePic");
    res.json({ count: user.profileViews.length, viewers: user.profileViews });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Request verification badge
exports.requestVerification = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { verificationRequested: true });
    res.json({ message: "Verification request submitted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: "Current password is incorrect" });
    if (newPassword.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Incorrect password" });
    await User.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Active sessions
exports.getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.activeSessions || []);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.revokeSession = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { activeSessions: { sessionId: req.params.sessionId } }
    });
    res.json({ message: "Session revoked" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Disappearing messages setting per chat
exports.setDisappearing = async (req, res) => {
  try {
    const { chatUsername, duration } = req.body; // duration in hours, 0 = off
    await User.findByIdAndUpdate(req.user.id, {
      [`disappearingSettings.${chatUsername}`]: duration
    });
    res.json({ message: "Disappearing messages updated" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Follow/unfollow/block etc (same as before)
exports.followUser = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (target.blockedUsers.includes(me._id)) return res.status(403).json({ message: "You are blocked" });
    if (me.following.includes(target._id)) return res.json({ message: "Already following", status: "following" });
    if (target.isPrivate) {
      if (!target.followRequests.includes(me._id)) {
        target.followRequests.push(me._id); me.sentRequests.push(target._id);
        await target.save(); await me.save();
      }
      return res.json({ message: "Follow request sent", status: "requested" });
    } else {
      me.following.push(target._id); target.followers.push(me._id);
      me.sentRequests = me.sentRequests.filter(id => id.toString() !== target._id.toString());
      await me.save(); await target.save();
      return res.json({ message: "Followed", status: "following" });
    }
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.unfollowUser = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ message: "User not found" });
    me.following = me.following.filter(id => id.toString() !== target._id.toString());
    me.sentRequests = me.sentRequests.filter(id => id.toString() !== target._id.toString());
    target.followers = target.followers.filter(id => id.toString() !== me._id.toString());
    target.followRequests = target.followRequests.filter(id => id.toString() !== me._id.toString());
    await me.save(); await target.save();
    res.json({ message: "Unfollowed", status: "none" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.acceptRequest = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const requester = await User.findOne({ username: req.params.username });
    if (!requester) return res.status(404).json({ message: "User not found" });
    me.followRequests = me.followRequests.filter(id => id.toString() !== requester._id.toString());
    // Only add if not already a follower
    if (!me.followers.map(id => id.toString()).includes(requester._id.toString())) {
      me.followers.push(requester._id);
    }
    requester.sentRequests = requester.sentRequests.filter(id => id.toString() !== me._id.toString());
    // Only add if not already following
    if (!requester.following.map(id => id.toString()).includes(me._id.toString())) {
      requester.following.push(me._id);
    }
    await me.save(); await requester.save();
    res.json({ message: "Request accepted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.declineRequest = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const requester = await User.findOne({ username: req.params.username });
    if (!requester) return res.status(404).json({ message: "User not found" });
    me.followRequests = me.followRequests.filter(id => id.toString() !== requester._id.toString());
    requester.sentRequests = requester.sentRequests.filter(id => id.toString() !== me._id.toString());
    await me.save(); await requester.save();
    res.json({ message: "Request declined" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.blockUser = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ message: "User not found" });
    if (!me.blockedUsers.includes(target._id)) {
      me.blockedUsers.push(target._id);
      me.following = me.following.filter(id => id.toString() !== target._id.toString());
      target.followers = target.followers.filter(id => id.toString() !== me._id.toString());
      await me.save(); await target.save();
    }
    res.json({ message: "Blocked" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.unblockUser = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ message: "User not found" });
    me.blockedUsers = me.blockedUsers.filter(id => id.toString() !== target._id.toString());
    await me.save();
    res.json({ message: "Unblocked" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
exports.removeFollower = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ message: "User not found" });
    me.followers = me.followers.filter(id => id.toString() !== target._id.toString());
    target.following = target.following.filter(id => id.toString() !== me._id.toString());
    await me.save(); await target.save();
    res.json({ message: "Follower removed" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
