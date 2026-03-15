const mongoose = require("mongoose");

const pollOptionSchema = new mongoose.Schema({
  text:  { type: String, required: true },
  votes: [{ type: String }], // usernames who voted
});

const pollSchema = new mongoose.Schema({
  groupId:    { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true },
  createdBy:  { type: String, required: true },
  question:   { type: String, required: true },
  options:    [pollOptionSchema],
  multiVote:  { type: Boolean, default: false },
  expiresAt:  { type: Date },
  isClosed:   { type: Boolean, default: false },
}, { timestamps: true });

const groupSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  description:      { type: String, default: "", maxlength: 200 },
  groupPic:         { type: String, default: "" },
  inviteLink:       { type: String, unique: true },
  maxMembers:       { type: Number, default: 50 },
  announcementMode: { type: Boolean, default: false }, // only admins can send

  members: [{
    user:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    role:     { type: String, enum: ["admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  }],

  joinRequests: [{ // for private groups
    user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    username:  { type: String },
    requestedAt: { type: Date, default: Date.now },
  }],

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

exports.Group = mongoose.model("Group", groupSchema);
exports.Poll  = mongoose.model("Poll", pollSchema);