const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mediaUrl:  { type: String, required: true },
  mediaType: { type: String, enum: ["image", "video"], required: true },
  caption:   { type: String, default: "" },
  viewers:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },

  // Privacy
  privacy:      { type: String, enum: ["everyone", "closeFriends", "nobody"], default: "everyone" },
  closeFriends: [{ type: String }], // usernames allowed to see (when privacy = closeFriends)
}, { timestamps: true });

module.exports = mongoose.model("Status", statusSchema);