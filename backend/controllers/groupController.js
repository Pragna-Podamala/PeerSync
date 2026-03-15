const { Group, Poll } = require("../models/Group");
const User = require("../models/User");
const crypto = require("crypto");
const multer = require("multer");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/groups";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
exports.uploadMiddleware = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const genInviteLink = () => crypto.randomBytes(8).toString("hex");

exports.createGroup = async (req, res) => {
  try {
    const { name, description, memberUsernames, maxMembers } = req.body;
    const me = await User.findById(req.user.id);
    const members = [{ user: me._id, username: me.username, role: "admin" }];
    if (memberUsernames) {
      const names = JSON.parse(memberUsernames);
      for (const username of names) {
        const u = await User.findOne({ username });
        if (!u) continue;
        const iFollow = me.following.some(id => id.toString() === u._id.toString());
        const theyFollow = u.following.some(id => id.toString() === me._id.toString());
        if (iFollow && theyFollow) members.push({ user: u._id, username: u.username, role: "member" });
      }
    }
    const max = Math.min(parseInt(maxMembers) || 50, 256);
    const group = await Group.create({
      name, description: description || "",
      groupPic: req.file ? `${req.protocol}://${req.get("host")}/uploads/groups/${req.file.filename}` : "",
      inviteLink: genInviteLink(), maxMembers: max, members, createdBy: me._id,
    });
    await group.populate("members.user", "username profilePic");
    res.status(201).json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getMyGroups = async (req, res) => {
  try {
    const groups = await Group.find({ "members.username": req.user.username })
      .populate("members.user", "username profilePic");
    res.json(groups);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate("members.user", "username profilePic");
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (!group.members.some(m => m.username === req.user.username)) return res.status(403).json({ message: "Not a member" });
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.joinByLink = async (req, res) => {
  try {
    const group = await Group.findOne({ inviteLink: req.params.link });
    if (!group) return res.status(404).json({ message: "Invalid invite link" });
    if (group.members.length >= group.maxMembers) return res.status(400).json({ message: "Group is full" });
    const me = await User.findById(req.user.id);
    if (group.members.some(m => m.username === me.username)) return res.json({ message: "Already a member", group });
    group.members.push({ user: me._id, username: me.username, role: "member" });
    await group.save();
    await group.populate("members.user", "username profilePic");
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.addMember = async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const me = group.members.find(m => m.username === req.user.username);
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Admins only" });
    if (group.members.length >= group.maxMembers) return res.status(400).json({ message: "Group is full" });
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (group.members.some(m => m.username === username)) return res.status(400).json({ message: "Already a member" });
    group.members.push({ user: user._id, username: user.username, role: "member" });
    await group.save();
    await group.populate("members.user", "username profilePic");
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.removeMember = async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const me = group.members.find(m => m.username === req.user.username);
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Admins only" });
    group.members = group.members.filter(m => m.username !== username);
    await group.save();
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.makeAdmin = async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const me = group.members.find(m => m.username === req.user.username);
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const target = group.members.find(m => m.username === username);
    if (!target) return res.status(404).json({ message: "Member not found" });
    target.role = target.role === "admin" ? "member" : "admin";
    await group.save();
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    group.members = group.members.filter(m => m.username !== req.user.username);
    if (!group.members.some(m => m.role === "admin") && group.members.length > 0) group.members[0].role = "admin";
    if (group.members.length === 0) { await Group.findByIdAndDelete(group._id); return res.json({ message: "Group deleted" }); }
    await group.save();
    res.json({ message: "Left group" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const me = group.members.find(m => m.username === req.user.username);
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const { name, description, announcementMode } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (announcementMode !== undefined) group.announcementMode = announcementMode === "true" || announcementMode === true;
    if (req.file) group.groupPic = `${req.protocol}://${req.get("host")}/uploads/groups/${req.file.filename}`;
    await group.save();
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.regenLink = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    const me = group.members.find(m => m.username === req.user.username);
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Admins only" });
    group.inviteLink = genInviteLink();
    await group.save();
    res.json({ inviteLink: group.inviteLink });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Join requests
exports.requestJoin = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: "Group not found" });
    if (group.members.some(m => m.username === req.user.username)) return res.status(400).json({ message: "Already a member" });
    if (group.joinRequests.some(r => r.username === req.user.username)) return res.json({ message: "Already requested" });
    group.joinRequests.push({ user: req.user.id, username: req.user.username });
    await group.save();
    res.json({ message: "Join request sent" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.approveJoin = async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    const me = group?.members.find(m => m.username === req.user.username);
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Admins only" });
    const request = group.joinRequests.find(r => r.username === username);
    if (!request) return res.status(404).json({ message: "Request not found" });
    group.joinRequests = group.joinRequests.filter(r => r.username !== username);
    group.members.push({ user: request.user, username, role: "member" });
    await group.save();
    res.json(group);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.declineJoin = async (req, res) => {
  try {
    const { username } = req.body;
    const group = await Group.findById(req.params.id);
    const me = group?.members.find(m => m.username === req.user.username);
    if (!me || me.role !== "admin") return res.status(403).json({ message: "Admins only" });
    group.joinRequests = group.joinRequests.filter(r => r.username !== username);
    await group.save();
    res.json({ message: "Declined" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Polls
exports.createPoll = async (req, res) => {
  try {
    const { question, options, multiVote, expiresIn } = req.body;
    const group = await Group.findById(req.params.id);
    if (!group?.members.some(m => m.username === req.user.username)) return res.status(403).json({ message: "Not a member" });
    const poll = await Poll.create({
      groupId: req.params.id,
      createdBy: req.user.username,
      question,
      options: JSON.parse(options).map(text => ({ text, votes: [] })),
      multiVote: multiVote === "true",
      expiresAt: expiresIn ? new Date(Date.now() + parseInt(expiresIn) * 3600000) : null,
    });
    res.status(201).json(poll);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.votePoll = async (req, res) => {
  try {
    const { optionIndex } = req.body;
    const poll = await Poll.findById(req.params.pollId);
    if (!poll || poll.isClosed) return res.status(400).json({ message: "Poll closed or not found" });
    if (poll.expiresAt && new Date() > poll.expiresAt) { poll.isClosed = true; await poll.save(); return res.status(400).json({ message: "Poll expired" }); }
    const username = req.user.username;
    if (!poll.multiVote) {
      poll.options.forEach(opt => { opt.votes = opt.votes.filter(u => u !== username); });
    }
    const opt = poll.options[optionIndex];
    if (!opt) return res.status(400).json({ message: "Invalid option" });
    if (opt.votes.includes(username)) {
      opt.votes = opt.votes.filter(u => u !== username); // unvote
    } else {
      opt.votes.push(username);
    }
    await poll.save();
    res.json(poll);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ groupId: req.params.id }).sort({ createdAt: -1 });
    res.json(polls);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const GroupMessage = require("../models/GroupMessage");
    const group = await Group.findById(req.params.id);
    if (!group?.members.some(m => m.username === req.user.username)) return res.status(403).json({ message: "Not a member" });
    const messages = await GroupMessage.find({
      groupId: req.params.id, deletedForAll: false, deletedFor: { $ne: req.user.username }
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteGroupMsg = async (req, res) => {
  try {
    const GroupMessage = require("../models/GroupMessage");
    const { deleteFor } = req.body;
    const group = await Group.findById(req.params.groupId);
    const me = group?.members.find(m => m.username === req.user.username);
    const msg = await GroupMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (me?.role !== "admin" && msg.sender !== req.user.username) return res.status(403).json({ message: "Not allowed" });
    if (deleteFor === "everyone") { msg.deletedForAll = true; msg.text = ""; msg.mediaUrl = ""; }
    else { if (!msg.deletedFor.includes(req.user.username)) msg.deletedFor.push(req.user.username); }
    await msg.save();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.viewOneTime = async (req, res) => {
  try {
    const GroupMessage = require("../models/GroupMessage");
    const msg = await GroupMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (!msg.viewedBy.includes(req.user.username)) msg.viewedBy.push(req.user.username);
    const group = await Group.findById(msg.groupId);
    if (group?.members.every(m => msg.viewedBy.includes(m.username))) msg.oneTimeExpired = true;
    await msg.save();
    res.json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
};