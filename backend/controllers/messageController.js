const Message = require("../models/Message");
const User = require("../models/User");

exports.getMessages = async (req, res) => {
  try {
    const me = req.user.username;
    const other = req.params.username;
    const messages = await Message.find({
      $or: [
        { sender: me, receiver: other },
        { sender: other, receiver: me },
      ],
      isScheduled: { $ne: true },
    }).sort({ time: 1 });

    // Filter deleted messages
    const filtered = messages.map(msg => {
      const m = msg.toObject();
      if (m.sender === me && m.deletedBySender) {
        return { ...m, text: "", mediaUrl: "", mediaType: "", _deleted: true };
      }
      if (m.receiver === me && m.deletedByReceiver) {
        return { ...m, text: "", mediaUrl: "", mediaType: "", _deleted: true };
      }
      return m;
    });

    res.json(filtered);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.canMessage = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const target = await User.findOne({ username: req.params.username });
    if (!target) return res.status(404).json({ message: "User not found" });
    const iFollow = me.following.some(id => id.toString() === target._id.toString());
    const theyFollow = target.following.some(id => id.toString() === me._id.toString());
    const mutualFollow = iFollow && theyFollow;
    const msgCount = await Message.countDocuments({ sender: me.username, receiver: target.username });
    res.json({ canMessage: mutualFollow || msgCount === 0, mutualFollow, msgCount, firstMessageAllowed: msgCount === 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Edit message (within 15 mins)
exports.editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    if (msg.sender !== req.user.username) return res.status(403).json({ message: "Not your message" });

    const now = new Date();
    const diff = (now - msg.time) / 1000 / 60; // minutes
    if (diff > 15) return res.status(400).json({ message: "Can only edit within 15 minutes" });

    msg.text = text;
    msg.isEdited = true;
    msg.editedAt = now;
    await msg.save();
    res.json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Delete message
exports.deleteMessage = async (req, res) => {
  try {
    const { deleteFor } = req.body; // "me" | "everyone"
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Not found" });
    if (msg.sender !== req.user.username && msg.receiver !== req.user.username)
      return res.status(403).json({ message: "Not your message" });

    if (deleteFor === "everyone" && msg.sender === req.user.username) {
      msg.deletedBySender = true;
      msg.deletedByReceiver = true;
      msg.text = "";
      msg.mediaUrl = "";
    } else if (msg.sender === req.user.username) {
      msg.deletedBySender = true;
    } else {
      msg.deletedByReceiver = true;
    }
    await msg.save();
    res.json({ success: true, msg });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// React to message
exports.reactToMessage = async (req, res) => {
  try {
    const { emoji } = req.body;
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Not found" });

    if (emoji) {
      msg.reactions.set(req.user.username, emoji);
    } else {
      msg.reactions.delete(req.user.username);
    }
    await msg.save();
    res.json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Pin message
exports.pinMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: "Not found" });
    msg.isPinned = !msg.isPinned;
    await msg.save();
    res.json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Schedule message
exports.scheduleMessage = async (req, res) => {
  try {
    const { receiver, text, mediaUrl, mediaType, scheduledAt } = req.body;
    const msg = await Message.create({
      sender: req.user.username,
      receiver,
      text: text || "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",
      scheduledAt: new Date(scheduledAt),
      isScheduled: true,
      isSent: false,
      status: "sent",
      time: new Date(scheduledAt),
    });
    res.status(201).json(msg);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Get scheduled messages
exports.getScheduled = async (req, res) => {
  try {
    const msgs = await Message.find({
      sender: req.user.username,
      isScheduled: true,
      isSent: false,
    }).sort({ scheduledAt: 1 });
    res.json(msgs);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// Delete scheduled message
exports.deleteScheduled = async (req, res) => {
  try {
    await Message.findOneAndDelete({ _id: req.params.id, sender: req.user.username, isScheduled: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
};