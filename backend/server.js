const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const { Server } = require("socket.io");
const Message = require("./models/Message");
const GroupMessage = require("./models/GroupMessage");
const { Group } = require("./models/Group");
const User = require("./models/User");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/auth",     require("./routes/authRoutes"));
app.use("/api/users",    require("./routes/userRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/status",   require("./routes/statusRoutes"));
app.use("/api/groups",   require("./routes/groupRoutes"));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const onlineUsers = {}; // username -> socketId

// Helper: check if user allows viewer to see their online status
const canSeeOnline = async (targetUsername, viewerUsername) => {
  try {
    const target = await User.findOne({ username: targetUsername });
    if (!target) return false;
    const privacy = target.settings?.onlinePrivacy || "everyone";
    if (privacy === "everyone") return true;
    if (privacy === "nobody") return false;
    if (privacy === "closeFriends") {
      const list = target.settings?.onlineCloseFriends || [];
      return list.includes(viewerUsername);
    }
    return true;
  } catch { return false; }
};

// Build filtered online users list for a specific viewer
const getOnlineUsersFor = async (viewerUsername) => {
  const visible = [];
  for (const username of Object.keys(onlineUsers)) {
    if (username === viewerUsername) { visible.push(username); continue; }
    const allowed = await canSeeOnline(username, viewerUsername);
    if (allowed) visible.push(username);
  }
  return visible;
};

io.on("connection", (socket) => {

  socket.on("userOnline", async (username) => {
    onlineUsers[username] = socket.id;
    // Send each user their own filtered online list
    for (const [viewer, sid] of Object.entries(onlineUsers)) {
      const list = await getOnlineUsersFor(viewer);
      io.to(sid).emit("onlineUsers", list);
    }
  });

  socket.on("joinGroups", async (username) => {
    try {
      const groups = await Group.find({ "members.username": username });
      groups.forEach(g => socket.join(`group:${g._id}`));
    } catch (err) { console.log(err); }
  });

  socket.on("sendMessage", async (data) => {
    try {
      const sender = await User.findOne({ username: data.sender });
      const receiver = await User.findOne({ username: data.receiver });
      if (!sender || !receiver) return;
      const iFollow = sender.following.some(id => id.toString() === receiver._id.toString());
      const theyFollow = receiver.following.some(id => id.toString() === sender._id.toString());
      const msgCount = await Message.countDocuments({ sender: data.sender, receiver: data.receiver });
      if (!iFollow && !theyFollow && msgCount >= 1) {
        socket.emit("messageError", { message: "You can only send 1 message until they follow you back" });
        return;
      }
      const isReceiverOnline = !!onlineUsers[data.receiver];
      const message = await Message.create({
        sender: data.sender, receiver: data.receiver,
        text: data.text || "", mediaUrl: data.mediaUrl || "", mediaType: data.mediaType || "",
        status: isReceiverOnline ? "delivered" : "sent",
        time: new Date(), replyTo: data.replyTo || null, isForwarded: data.isForwarded || false,
      });
      const receiverSocket = onlineUsers[data.receiver];
      if (receiverSocket) io.to(receiverSocket).emit("receiveMessage", message);
      socket.emit("messageSent", message);
    } catch (err) { console.log(err); }
  });

  socket.on("messageSeen", async (messageId) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      const sender = await User.findOne({ username: msg.sender });
      const newStatus = sender?.settings?.showReadReceipts ? "seen" : "delivered";
      await Message.findByIdAndUpdate(messageId, { status: newStatus });
      const senderSocket = onlineUsers[msg.sender];
      if (senderSocket) io.to(senderSocket).emit("messageStatus", { messageId, status: newStatus });
    } catch (err) { console.log(err); }
  });

  socket.on("markAllSeen", async ({ sender, receiver }) => {
    try {
      const senderUser = await User.findOne({ username: sender });
      const newStatus = senderUser?.settings?.showReadReceipts ? "seen" : "delivered";
      await Message.updateMany({ sender, receiver, status: { $ne: "seen" } }, { status: newStatus });
      const senderSocket = onlineUsers[sender];
      if (senderSocket) io.to(senderSocket).emit("allMessagesSeen", { from: receiver });
    } catch (err) { console.log(err); }
  });

  socket.on("editMessage", async ({ messageId, text, username }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg || msg.sender !== username) return;
      const diff = (new Date() - msg.time) / 1000 / 60;
      if (diff > 15) { socket.emit("editError", { message: "Can only edit within 15 minutes" }); return; }
      msg.text = text; msg.isEdited = true; msg.editedAt = new Date();
      await msg.save();
      const receiverSocket = onlineUsers[msg.receiver];
      if (receiverSocket) io.to(receiverSocket).emit("messageEdited", msg);
      socket.emit("messageEdited", msg);
    } catch (err) { console.log(err); }
  });

  socket.on("deleteMessage", async ({ messageId, username, deleteFor }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (deleteFor === "everyone" && msg.sender === username) {
        msg.deletedBySender = true; msg.deletedByReceiver = true;
        msg.text = ""; msg.mediaUrl = "";
      } else if (msg.sender === username) {
        msg.deletedBySender = true;
      } else { msg.deletedByReceiver = true; }
      await msg.save();
      [onlineUsers[msg.receiver], onlineUsers[msg.sender]].forEach(s => {
        if (s) io.to(s).emit("messageDeleted", { messageId, deleteFor });
      });
    } catch (err) { console.log(err); }
  });

  socket.on("reactMessage", async ({ messageId, emoji, username }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (emoji) msg.reactions.set(username, emoji); else msg.reactions.delete(username);
      await msg.save();
      const reactionsObj = Object.fromEntries(msg.reactions);
      [onlineUsers[msg.receiver], onlineUsers[msg.sender]].forEach(s => {
        if (s) io.to(s).emit("messageReaction", { messageId, reactions: reactionsObj });
      });
    } catch (err) { console.log(err); }
  });

  socket.on("pinMessage", async ({ messageId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      msg.isPinned = !msg.isPinned; await msg.save();
      [onlineUsers[msg.receiver], onlineUsers[msg.sender]].forEach(s => {
        if (s) io.to(s).emit("messagePinned", { messageId, isPinned: msg.isPinned });
      });
    } catch (err) { console.log(err); }
  });

  socket.on("typing", ({ receiver, sender }) => {
    const receiverSocket = onlineUsers[receiver];
    if (receiverSocket) io.to(receiverSocket).emit("typing", sender);
  });
  socket.on("stopTyping", ({ receiver }) => {
    const receiverSocket = onlineUsers[receiver];
    if (receiverSocket) io.to(receiverSocket).emit("stopTyping");
  });

  // Group events
  socket.on("sendGroupMessage", async (data) => {
    try {
      const { groupId, sender, text, mediaUrl, mediaType, replyTo, isForwarded, isOneTime, isVoice } = data;
      const group = await Group.findById(groupId);
      if (!group) return;
      if (!group.members.some(m => m.username === sender)) return;
      const msg = await GroupMessage.create({
        groupId, sender, text: text || "", mediaUrl: mediaUrl || "", mediaType: mediaType || "",
        replyTo: replyTo || null, isForwarded: isForwarded || false,
        isOneTime: isOneTime || false, isVoice: isVoice || false, readBy: [sender],
      });
      io.to(`group:${groupId}`).emit("receiveGroupMessage", { groupId, message: msg });
    } catch (err) { console.log(err); }
  });

  socket.on("groupMessageSeen", async ({ groupId, messageId, username }) => {
    try {
      const msg = await GroupMessage.findById(messageId);
      if (!msg || msg.readBy.includes(username)) return;
      msg.readBy.push(username); await msg.save();
      io.to(`group:${groupId}`).emit("groupMessageRead", { messageId, readBy: msg.readBy });
    } catch (err) { console.log(err); }
  });

  socket.on("reactGroupMessage", async ({ groupId, messageId, emoji, username }) => {
    try {
      const msg = await GroupMessage.findById(messageId);
      if (!msg) return;
      if (emoji) msg.reactions.set(username, emoji); else msg.reactions.delete(username);
      await msg.save();
      io.to(`group:${groupId}`).emit("groupMessageReaction", { messageId, reactions: Object.fromEntries(msg.reactions) });
    } catch (err) { console.log(err); }
  });

  socket.on("editGroupMessage", async ({ groupId, messageId, text, username }) => {
    try {
      const msg = await GroupMessage.findById(messageId);
      if (!msg || msg.sender !== username) return;
      const diff = (new Date() - msg.createdAt) / 1000 / 60;
      if (diff > 15) { socket.emit("editError", { message: "Can only edit within 15 minutes" }); return; }
      msg.text = text; msg.isEdited = true; msg.editedAt = new Date(); await msg.save();
      io.to(`group:${groupId}`).emit("groupMessageEdited", { groupId, message: msg });
    } catch (err) { console.log(err); }
  });

  socket.on("deleteGroupMessage", async ({ groupId, messageId, username, deleteFor }) => {
    try {
      const group = await Group.findById(groupId);
      const me = group?.members.find(m => m.username === username);
      const msg = await GroupMessage.findById(messageId);
      if (!msg) return;
      if (me?.role !== "admin" && msg.sender !== username) return;
      if (deleteFor === "everyone") { msg.deletedForAll = true; msg.text = ""; msg.mediaUrl = ""; }
      else { if (!msg.deletedFor.includes(username)) msg.deletedFor.push(username); }
      await msg.save();
      io.to(`group:${groupId}`).emit("groupMessageDeleted", { groupId, messageId, deleteFor, deletedBy: username });
    } catch (err) { console.log(err); }
  });

  socket.on("pinGroupMessage", async ({ groupId, messageId, username }) => {
    try {
      const group = await Group.findById(groupId);
      const me = group?.members.find(m => m.username === username);
      if (!me || me.role !== "admin") return;
      const msg = await GroupMessage.findById(messageId);
      if (!msg) return;
      msg.isPinned = !msg.isPinned; await msg.save();
      io.to(`group:${groupId}`).emit("groupMessagePinned", { groupId, messageId, isPinned: msg.isPinned });
    } catch (err) { console.log(err); }
  });

  socket.on("groupTyping", ({ groupId, sender }) => {
    socket.to(`group:${groupId}`).emit("groupTyping", { groupId, sender });
  });
  socket.on("groupStopTyping", ({ groupId, sender }) => {
    socket.to(`group:${groupId}`).emit("groupStopTyping", { groupId, sender });
  });

  socket.on("disconnect", async () => {
    let disconnectedUser = null;
    for (let user in onlineUsers) {
      if (onlineUsers[user] === socket.id) { disconnectedUser = user; delete onlineUsers[user]; break; }
    }
    if (disconnectedUser) {
      for (const [viewer, sid] of Object.entries(onlineUsers)) {
        const list = await getOnlineUsersFor(viewer);
        io.to(sid).emit("onlineUsers", list);
      }
    }
  });
});

// Scheduled messages
setInterval(async () => {
  try {
    const now = new Date();
    const due = await Message.find({ isScheduled: true, isSent: false, scheduledAt: { $lte: now } });
    for (const msg of due) {
      msg.isScheduled = false; msg.isSent = true; await msg.save();
      const receiverSocket = onlineUsers[msg.receiver];
      if (receiverSocket) io.to(receiverSocket).emit("receiveMessage", msg);
      const senderSocket = onlineUsers[msg.sender];
      if (senderSocket) io.to(senderSocket).emit("messageSent", msg);
    }
  } catch (err) { console.log("Scheduler error:", err); }
}, 30000);

mongoose.connect("mongodb://127.0.0.1:27017/chatapp")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log(err));

server.listen(5782, () => console.log("✅ Server running on port 5782"));