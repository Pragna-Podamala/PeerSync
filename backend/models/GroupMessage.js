const mongoose = require("mongoose");

const groupMessageSchema = new mongoose.Schema({
  groupId:   { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  sender:    { type: String, required: true },
  text:      { type: String, default: "" },
  mediaUrl:  { type: String, default: "" },
  mediaType: { type: String, default: "" }, // image | video | audio
  isVoice:   { type: Boolean, default: false },

  // One-time view message
  isOneTime:    { type: Boolean, default: false },
  viewedBy:     [{ type: String }], // usernames who viewed
  oneTimeExpired: { type: Boolean, default: false },

  // Reply
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId },
    text:      { type: String, default: "" },
    sender:    { type: String, default: "" },
  },

  // Reactions — { username: emoji }
  reactions: { type: Map, of: String, default: {} },

  // Forwarded
  isForwarded: { type: Boolean, default: false },

  // Read by
  readBy: [{ type: String }],

  // Edit
  isEdited:  { type: Boolean, default: false },
  editedAt:  { type: Date },

  // Delete
  deletedFor: [{ type: String }], // usernames
  deletedForAll: { type: Boolean, default: false },

  // Pin
  isPinned: { type: Boolean, default: false },

}, { timestamps: true });

module.exports = mongoose.model("GroupMessage", groupMessageSchema);