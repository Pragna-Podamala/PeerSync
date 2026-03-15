const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender:    { type: String, required: true },
  receiver:  { type: String, required: true },
  text:      { type: String, default: "" },
  mediaUrl:  { type: String, default: "" },
  mediaType: { type: String, default: "" },
  status:    { type: String, enum: ["sent", "delivered", "seen"], default: "sent" },
  time:      { type: Date, default: Date.now },

  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
    text:      { type: String, default: "" },
    sender:    { type: String, default: "" },
    mediaType: { type: String, default: "" },
  },

  reactions:    { type: Map, of: String, default: {} },
  isPinned:     { type: Boolean, default: false },
  isEdited:     { type: Boolean, default: false },
  editedAt:     { type: Date },
  isForwarded:  { type: Boolean, default: false },

  deletedBySender:   { type: Boolean, default: false },
  deletedByReceiver: { type: Boolean, default: false },

  // Disappearing
  disappearsAt: { type: Date },

  // Scheduled
  scheduledAt: { type: Date },
  isScheduled: { type: Boolean, default: false },
  isSent:      { type: Boolean, default: true },

  // GIF
  gifUrl: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);