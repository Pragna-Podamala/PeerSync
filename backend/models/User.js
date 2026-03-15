const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username:    { type: String, required: true, trim: true },
  email:       { type: String, required: true, unique: true, trim: true },
  password:    { type: String, required: true },
  profilePic:  { type: String, default: "" },
  bio:         { type: String, default: "", maxlength: 150 },
  isPrivate:   { type: Boolean, default: false },
  isVerified:  { type: Boolean, default: false },
  verificationRequested: { type: Boolean, default: false },

  // Profile views
  profileViews: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  followers:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  followRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  sentRequests:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  blockedUsers:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  // Starred/bookmarked messages
  starredMessages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],

  // Pinned chats
  pinnedChats: [{ type: String }], // usernames

  // Chat wallpapers { username: wallpaperUrl }
  chatWallpapers: { type: Map, of: String, default: {} },

  // Notification settings
  notificationSettings: {
    sound:          { type: Boolean, default: true },
    pushEnabled:    { type: Boolean, default: true },
    dndEnabled:     { type: Boolean, default: false },
    dndStart:       { type: String, default: "22:00" },
    dndEnd:         { type: String, default: "08:00" },
  },

  // Security
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret:  { type: String, default: "" },
  activeSessions:   [{
    sessionId:  { type: String },
    device:     { type: String },
    ip:         { type: String },
    createdAt:  { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now },
  }],

  settings: {
    showReadReceipts:       { type: Boolean, default: true },
    profilePicPrivacy:      { type: String, default: "everyone" },
    lastSeenPrivacy:        { type: String, default: "everyone" },
    onlinePrivacy:          { type: String, default: "everyone" },
    profilePicCloseFriends: [{ type: String }],
    lastSeenCloseFriends:   [{ type: String }],
    onlineCloseFriends:     [{ type: String }],
  },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);