import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import socket from "../services/socket";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import GroupChatWindow from "../components/GroupChatWindow";
import StatusBar from "../components/StatusBar";
import ProfileModal from "../components/ProfileModal";
import UserProfileModal from "../components/UserProfileModal";
import GroupInfoModal from "../components/GroupInfoModal";
import CreateGroupModal from "../components/CreateGroupModal";
import GroupPollModal from "../components/GroupPollModal";
import EmojiPicker from "../components/EmojiPicker";
import MessageSearch from "../components/MessageSearch";
import WallpaperPicker from "../components/WallpaperPicker";
import "./Chat.css";

export default function Chat() {
  const { user, logout, updateUser } = useAuth();
  const [friends, setFriends] = useState([]);

  // Listen for openChat event from ProfileModal
  useEffect(() => {
    const handler = (e) => {
      const username = e.detail;
      // Try friends list first
      const friend = friends.find(f => f.username === username);
      if (friend) {
        setSelectedFriend(friend);
        setSelectedGroup(null);
      } else {
        // Friend not in list yet, fetch their info and open chat
        API.get(`/users/${username}`).then(res => {
          setSelectedFriend(res.data);
          setSelectedGroup(null);
        }).catch(() => {});
      }
    };
    window.addEventListener("openChat", handler);
    return () => window.removeEventListener("openChat", handler);
  }, [friends]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [viewProfileUsername, setViewProfileUsername] = useState(null);
  const [allMessages, setAllMessages] = useState({});
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);
  const [text, setText] = useState("");
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [canMsg, setCanMsg] = useState({ canMessage: true, mutualFollow: false, msgCount: 0 });
  const [msgError, setMsgError] = useState("");
  const [mediaPreview, setMediaPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [recording, setRecording] = useState(false);
  const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [isOneTime, setIsOneTime] = useState(false);
  const [disappearingHours, setDisappearingHours] = useState(0);
  const [showDisappearing, setShowDisappearing] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupTypingUsers, setGroupTypingUsers] = useState([]);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupReplyTo, setGroupReplyTo] = useState(null);
  const [groupForwardMsg, setGroupForwardMsg] = useState(null);
  const [showGroupForwardPicker, setShowGroupForwardPicker] = useState(false);
  const [showGroupPolls, setShowGroupPolls] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [chatWallpapers, setChatWallpapers] = useState({});
  const [jumpToMsgId, setJumpToMsgId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const typingTimer = useRef(null);
  const selectedFriendRef = useRef(selectedFriend);
  const selectedGroupRef = useRef(selectedGroup);
  const mediaRef = useRef();
  const mediaRecorderRef = useRef();
  const audioChunks = useRef([]);
  const textareaRef = useRef();

  useEffect(() => { selectedFriendRef.current = selectedFriend; }, [selectedFriend]);
  useEffect(() => { selectedGroupRef.current = selectedGroup; }, [selectedGroup]);

  const sendPushNotif = useCallback((title, body) => {
    if (Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  }, []);

  useEffect(() => {
    socket.connect();
    socket.emit("userOnline", user.username);
    socket.emit("joinGroups", user.username);
    socket.on("onlineUsers", setOnlineUsers);
    socket.on("receiveMessage", (msg) => {
      const chatUser = msg.sender === user.username ? msg.receiver : msg.sender;
      // Always update allMessages for unread badge
      setAllMessages(prev => ({ ...prev, [chatUser]: [...(prev[chatUser] || []), msg] }));
      const sf = selectedFriendRef.current;
      if (sf && (msg.sender === sf.username || msg.receiver === sf.username)) {
        setMessages(prev => [...prev, msg]);
        socket.emit("messageSeen", msg._id);
      } else if (msg.sender !== user.username) {
        // Message arrived in background — keep status as "delivered" for badge
        sendPushNotif(`@${msg.sender}`, msg.text || "📎 Media");
      }
    });
    socket.on("messageSent", (msg) => {
      setAllMessages(prev => ({ ...prev, [msg.receiver]: [...(prev[msg.receiver] || []), msg] }));
      setMessages(prev => [...prev, msg]);
    });
    socket.on("messageStatus", ({ messageId, status }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, status } : m));
    });
    socket.on("allMessagesSeen", ({ from }) => {
      if (selectedFriendRef.current?.username === from)
        setMessages(prev => prev.map(m => ({ ...m, status: "seen" })));
    });
    socket.on("typing", (sender) => {
      if (selectedFriendRef.current?.username === sender) setTypingUser(sender);
    });
    socket.on("stopTyping", () => setTypingUser(null));
    socket.on("messageError", ({ message }) => { setMsgError(message); setTimeout(() => setMsgError(""), 4000); });
    socket.on("editError", ({ message }) => { setMsgError(message); setTimeout(() => setMsgError(""), 3000); });
    socket.on("messageEdited", (msg) => setMessages(prev => prev.map(m => m._id === msg._id ? msg : m)));
    socket.on("messageDeleted", ({ messageId, deleteFor }) => {
      setMessages(prev => prev.map(m => {
        if (m._id !== messageId) return m;
        if (deleteFor === "everyone") return { ...m, _deleted: true, text: "", mediaUrl: "" };
        if (m.sender === user.username) return { ...m, _deletedForMe: true };
        return { ...m, _deleted: true, text: "", mediaUrl: "" };
      }));
    });
    socket.on("messageReaction", ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    });
    socket.on("messagePinned", ({ messageId, isPinned }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned } : m));
    });
    socket.on("receiveGroupMessage", ({ groupId, message }) => {
      if (selectedGroupRef.current?._id === groupId) {
        setGroupMessages(prev => [...prev, message]);
        socket.emit("groupMessageSeen", { groupId, messageId: message._id, username: user.username });
      } else if (message.sender !== user.username) {
        sendPushNotif("Group message", `${message.sender}: ${message.text || "📎"}`);
      }
    });
    socket.on("groupTyping", ({ groupId, sender }) => {
      if (selectedGroupRef.current?._id === groupId)
        setGroupTypingUsers(prev => prev.includes(sender) ? prev : [...prev, sender]);
    });
    socket.on("groupStopTyping", ({ groupId, sender }) => {
      if (selectedGroupRef.current?._id === groupId)
        setGroupTypingUsers(prev => prev.filter(u => u !== sender));
    });
    return () => {
      ["onlineUsers","receiveMessage","messageSent","messageStatus","allMessagesSeen",
       "typing","stopTyping","messageError","editError","messageEdited","messageDeleted",
       "messageReaction","messagePinned","receiveGroupMessage","groupTyping","groupStopTyping"
      ].forEach(e => socket.off(e));
      socket.disconnect();
    };
  }, []);

  // Fetch pending requests count for badge
  useEffect(() => {
    const fetchRequestCount = async () => {
      try {
        const res = await API.get(`/users/${user.username}`);
        const count = res.data.followRequests?.length || 0;
        updateUser({ ...user, pendingRequestsCount: count });
      } catch {}
    };
    fetchRequestCount();
    const interval = setInterval(fetchRequestCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    API.get("/users").then(res => {
      setFriends(res.data);
      // Preload recent messages for unread badges
      res.data.forEach(async (friend) => {
        try {
          const msgRes = await API.get(`/messages/${friend.username}`);
          if (Array.isArray(msgRes.data)) {
            setAllMessages(prev => ({ ...prev, [friend.username]: msgRes.data }));
          }
        } catch {}
      });
    }).catch(() => {});
    API.get("/groups").then(res => setGroups(res.data)).catch(console.log);
    if (user?.chatWallpapers) {
      try { setChatWallpapers(Object.fromEntries(Object.entries(user.chatWallpapers))); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!selectedFriend) return;
    setSelectedGroup(null);
    API.get(`/messages/${selectedFriend.username}`).then(res => {
      setMessages(res.data);
      // Mark ALL as seen locally so badge clears immediately
      const seenMsgs = res.data.map(m =>
        m.sender === selectedFriend.username ? { ...m, status: "seen" } : m
      );
      setAllMessages(prev => ({ ...prev, [selectedFriend.username]: seenMsgs }));
      socket.emit("markAllSeen", { sender: selectedFriend.username, receiver: user.username });
    }).catch(console.log);
    API.get(`/messages/${selectedFriend.username}/can`).then(res => setCanMsg(res.data)).catch(console.log);
  }, [selectedFriend]);

  useEffect(() => {
    if (!selectedGroup) return;
    setSelectedFriend(null);
    API.get(`/groups/${selectedGroup._id}/messages`).then(res => setGroupMessages(res.data)).catch(console.log);
  }, [selectedGroup]);

  const handleSend = (isScheduled = false) => {
    if (selectedGroup) { handleGroupSend(); return; }
    if ((!text.trim() && !mediaPreview) || !selectedFriend) return;
    if (!canMsg.canMessage) { setMsgError("1 message limit until mutual follow"); return; }
    const msgData = {
      sender: user.username, receiver: selectedFriend.username,
      text: text.trim(), mediaUrl: mediaPreview?.url || "", mediaType: mediaPreview?.type || "",
      replyTo: replyTo ? { messageId: replyTo._id, text: replyTo.text, sender: replyTo.sender } : null,
      disappearingHours: disappearingHours || 0,
    };
    if (isScheduled && scheduleTime) {
      if (new Date(scheduleTime) < new Date(Date.now() + 5 * 60000)) {
        setMsgError("⚠️ Schedule at least 5 minutes from now");
        setTimeout(() => setMsgError(""), 3000); return;
      }
      API.post("/messages/schedule", { ...msgData, scheduledAt: scheduleTime })
        .then(() => { setMsgError("✅ Message scheduled!"); setTimeout(() => setMsgError(""), 3000); })
        .catch(console.log);
      setShowSchedule(false); setScheduleTime("");
    } else {
      socket.emit("sendMessage", msgData);
    }
    setText(""); setMediaPreview(null); setReplyTo(null);
    socket.emit("stopTyping", { receiver: selectedFriend.username });
  };

  const handleGroupSend = () => {
    if (!text.trim() && !mediaPreview) return;
    socket.emit("sendGroupMessage", {
      groupId: selectedGroup._id, sender: user.username,
      text: text.trim(), mediaUrl: mediaPreview?.url || "", mediaType: mediaPreview?.type || "",
      replyTo: groupReplyTo ? { messageId: groupReplyTo._id, text: groupReplyTo.text, sender: groupReplyTo.sender } : null,
      isOneTime,
    });
    setText(""); setMediaPreview(null); setGroupReplyTo(null); setIsOneTime(false);
    socket.emit("groupStopTyping", { groupId: selectedGroup._id, sender: user.username });
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTyping = () => {
    if (selectedGroup) {
      socket.emit("groupTyping", { groupId: selectedGroup._id, sender: user.username });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socket.emit("groupStopTyping", { groupId: selectedGroup._id, sender: user.username }), 1500);
    } else if (selectedFriend) {
      socket.emit("typing", { receiver: selectedFriend.username, sender: user.username });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => socket.emit("stopTyping", { receiver: selectedFriend.username }), 1500);
    }
  };

  const handleMediaSelect = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("media", file);
    try {
      const res = await API.post("/users/me/media", fd);
      setMediaPreview({ url: res.data.mediaUrl, type: res.data.mediaType });
    } catch (err) { console.log(err); }
    setUploading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorderRef.current.ondataavailable = e => audioChunks.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const fd = new FormData(); fd.append("media", blob, "voice.webm");
        try {
          const res = await API.post("/users/me/media", fd);
          if (selectedGroup) {
            socket.emit("sendGroupMessage", { groupId: selectedGroup._id, sender: user.username, text: "", mediaUrl: res.data.mediaUrl, mediaType: "audio", isVoice: true });
          } else {
            socket.emit("sendMessage", { sender: user.username, receiver: selectedFriend.username, text: "", mediaUrl: res.data.mediaUrl, mediaType: "audio" });
          }
        } catch (err) { console.log(err); }
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current.start(); setRecording(true);
    } catch (err) { console.log("Mic error:", err); }
  };

  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const handleForwardTo = (friend) => {
    socket.emit("sendMessage", { sender: user.username, receiver: friend.username, text: forwardMsg.text, mediaUrl: forwardMsg.mediaUrl || "", mediaType: forwardMsg.mediaType || "", isForwarded: true });
    setForwardMsg(null); setShowForwardPicker(false);
    setMsgError(`✅ Forwarded to @${friend.username}`);
    setTimeout(() => setMsgError(""), 3000);
  };

  const handlePrivateReply = (msg) => {
    const friend = friends.find(f => f.username === msg.sender);
    if (friend) {
      setSelectedFriend(friend);
      setReplyTo({ _id: msg._id, text: `[Group: ${selectedGroup?.name}] ${msg.text}`, sender: msg.sender });
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji);
    textareaRef.current?.focus();
    setShowEmojiPicker(false);
  };

  const handleSetWallpaper = (value) => {
    if (selectedFriend) setChatWallpapers(prev => ({ ...prev, [selectedFriend.username]: value }));
    setShowWallpaper(false);
  };

  const handleViewProfileFromStatus = (username) => {
    setViewProfileUsername(username);
    setShowUserProfile(true);
  };

  const handleSelectFriend = (f) => {
    setSelectedFriend(f); setSelectedGroup(null);
    setShowMsgSearch(false); setSidebarOpen(false);
  };
  const handleSelectGroup = (g) => {
    setSelectedGroup(g); setSelectedFriend(null); setSidebarOpen(false);
  };

  const isOnline = onlineUsers.includes(selectedFriend?.username);
  const activeReply = selectedGroup ? groupReplyTo : replyTo;
  const setActiveReply = selectedGroup ? setGroupReplyTo : setReplyTo;
  const currentWallpaper = selectedFriend ? (chatWallpapers[selectedFriend.username] || "") : "";
  const isLimited = !canMsg.mutualFollow && canMsg.msgCount >= 1;

  return (
    <div className="chat-page" onClick={() => { setShowEmojiPicker(false); setShowMsgSearch(false); }}>

      <div className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`} onClick={() => setSidebarOpen(false)} />

      <Sidebar
        currentUser={user} friends={friends}
        selectedFriend={selectedFriend} onSelectFriend={handleSelectFriend}
        onlineUsers={onlineUsers} onLogout={logout}
        onOpenProfile={() => { setShowMyProfile(true); setSidebarOpen(false); }}
        currentUser={{...user, pendingRequestsCount: user?.pendingRequestsCount || 0}}
        allMessages={allMessages} typingUser={typingUser}
        groups={groups} selectedGroup={selectedGroup}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={() => { setShowCreateGroup(true); setSidebarOpen(false); }}
        className={sidebarOpen ? "mobile-open" : ""}
      />

      <div className="chat-main">
        {!(selectedFriend || selectedGroup) && <StatusBar currentUser={user} onViewProfile={handleViewProfileFromStatus} />}

        {(selectedFriend || selectedGroup) ? (
          <>
            {/* Header */}
            <div className="chat-header" onClick={() => selectedGroup ? setShowGroupInfo(true) : setShowUserProfile(true)}>
              <div className="chat-header-left">
                <button className="mobile-menu-btn" onClick={e => { e.stopPropagation(); setSidebarOpen(true); }}>☰</button>
                <div className="header-avatar">
                  {selectedGroup
                    ? (selectedGroup.groupPic ? <img src={selectedGroup.groupPic} alt="" /> : selectedGroup.name[0].toUpperCase())
                    : (selectedFriend.profilePic ? <img src={selectedFriend.profilePic} alt="" /> : selectedFriend.username[0].toUpperCase())
                  }
                </div>
                <div className="header-info">
                  <span className="header-name">
                    {selectedGroup ? selectedGroup.name : selectedFriend.username}
                    {selectedFriend?.isVerified && <span className="verified-inline">✓</span>}
                  </span>
                  <span className={`header-status ${!selectedGroup && isOnline ? "online" : ""}`}>
                    {selectedGroup
                      ? `${selectedGroup.members?.length} members`
                      : <><span className="status-dot-sm" />{typingUser ? "typing..." : isOnline ? "Active now" : "Offline"}</>
                    }
                  </span>
                </div>
              </div>
              <div className="header-actions" onClick={e => e.stopPropagation()}>
                <button className="icon-btn" onClick={() => setShowMsgSearch(v => !v)}>🔍</button>
                {!selectedGroup && <button className="icon-btn" onClick={() => setShowWallpaper(true)}>🖼</button>}
                {selectedGroup && <button className="icon-btn" onClick={() => setShowGroupPolls(true)}>📊</button>}
                {selectedGroup && <button className="icon-btn" onClick={() => setShowGroupInfo(true)}>⚙️</button>}
              </div>
            </div>

            {/* Message search */}
            {showMsgSearch && (
              <MessageSearch
                messages={selectedGroup ? groupMessages : messages}
                currentUser={user}
                onClose={() => setShowMsgSearch(false)}
                onJumpTo={(id) => setJumpToMsgId(id)}
              />
            )}

            {/* Not following banner */}
            {!selectedGroup && !canMsg.mutualFollow && (
              <div className="msg-limit-banner">
                {canMsg.msgCount === 0 ? (
                  <div className="not-following-banner">
                    <span className="not-following-icon">👋</span>
                    <div className="not-following-info">
                      <strong>You don't follow each other yet</strong>
                      <span>You can send 1 free message. Follow each other to chat freely.</span>
                    </div>
                    <button className="msg-limit-follow-btn" onClick={() => setShowUserProfile(true)}>
                      👤 View Profile
                    </button>
                  </div>
                ) : (
                  <div className="not-following-banner">
                    <span className="not-following-icon">💬</span>
                    <div className="not-following-info">
                      <strong>@{selectedFriend.username} sent you a message</strong>
                      <span>Follow each other to keep chatting freely.</span>
                    </div>
                    <div style={{display:"flex",gap:"6px",flexShrink:0}}>
                      <button className="msg-limit-follow-btn" onClick={() => setShowUserProfile(true)}>
                        👤 View Profile
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Chat window */}
            <div className="chat-window-wrap" style={currentWallpaper ? {
              background: currentWallpaper.startsWith("http") ? `url(${currentWallpaper}) center/cover no-repeat` : currentWallpaper,
              backgroundSize: "cover"
            } : {}}>
              {selectedGroup ? (
                <GroupChatWindow
                  group={selectedGroup} messages={groupMessages} setMessages={setGroupMessages}
                  currentUser={user} typingUsers={groupTypingUsers}
                  onReply={(msg) => setGroupReplyTo(msg)}
                  onForward={(msg) => { setGroupForwardMsg(msg); setShowGroupForwardPicker(true); }}
                  onPrivateReply={handlePrivateReply}
                  jumpToMsgId={jumpToMsgId}
                />
              ) : (
                <ChatWindow
                  messages={messages} setMessages={setMessages}
                  currentUser={user} selectedFriend={selectedFriend} typingUser={typingUser}
                  onReply={(msg) => setReplyTo(msg)}
                  onForward={(msg) => { setForwardMsg(msg); setShowForwardPicker(true); }}
                  onStarMessage={async (msgId) => {
                    await API.post(`/users/me/star/${msgId}`);
                    setMsgError("⭐ Starred!"); setTimeout(() => setMsgError(""), 2000);
                  }}
                  jumpToMsgId={jumpToMsgId}
                />
              )}
            </div>

            {/* Reply bar */}
            {activeReply && (
              <div className="reply-bar">
                <div className="reply-bar-content">
                  <span className="reply-bar-label">↩ @{activeReply.sender}</span>
                  <span className="reply-bar-text">{activeReply.text || "📎 Media"}</span>
                </div>
                <button className="reply-bar-close" onClick={() => setActiveReply(null)}>✕</button>
              </div>
            )}

            {/* Media preview */}
            {mediaPreview && (
              <div className="media-preview-bar">
                {mediaPreview.type === "video"
                  ? <video src={mediaPreview.url} className="media-preview-thumb" />
                  : <img src={mediaPreview.url} alt="" className="media-preview-thumb" />
                }
                <button className="media-preview-remove" onClick={() => setMediaPreview(null)}>✕</button>
              </div>
            )}

            {/* One-time toggle */}
            {selectedGroup && (
              <div className="one-time-bar">
                <button className={`one-time-toggle ${isOneTime ? "active" : ""}`} onClick={() => setIsOneTime(!isOneTime)}>
                  {isOneTime ? "🔒 One-time ON" : "👁️ One-time"}
                </button>
              </div>
            )}

            {/* Schedule bar */}
            {!selectedGroup && canMsg.mutualFollow && showSchedule && (
              <div className="schedule-bar">
                <span className="schedule-label">🕐</span>
                <input type="datetime-local" className="schedule-input" value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)} />
                <button className="schedule-send" onClick={() => handleSend(true)} disabled={!scheduleTime}>Send</button>
                <button className="schedule-cancel" onClick={() => setShowSchedule(false)}>✕</button>
              </div>
            )}

            {/* Disappearing bar */}
            {!selectedGroup && canMsg.mutualFollow && showDisappearing && (
              <div className="schedule-bar">
                <span className="schedule-label">⏳</span>
                {[1, 6, 24, 72, 168, 0].map(h => (
                  <button key={h} className={`disappear-opt ${disappearingHours === h ? "active" : ""}`}
                    onClick={() => {
                      setDisappearingHours(h);
                      setShowDisappearing(false);
                      const label = h === 0 ? "Off" : h < 24 ? h+"h" : h/24+"d";
                      setMsgError(h > 0 ? `⏳ Disappearing messages set to ${label}` : "✅ Disappearing messages turned off");
                      setTimeout(() => setMsgError(""), 3000);
                      // Notify the other person via a system message
                      if (selectedFriend) {
                        socket.emit("sendMessage", {
                          sender: user.username,
                          receiver: selectedFriend.username,
                          text: h > 0
                            ? `⏳ ${user.username} turned on disappearing messages (${label}). New messages will disappear after ${label}.`
                            : `✅ ${user.username} turned off disappearing messages.`,
                          isSystem: true,
                        });
                      }
                    }}>
                    {h === 0 ? "Off" : h < 24 ? `${h}h` : `${h/24}d`}
                  </button>
                ))}
              </div>
            )}

            {msgError && <div className={`msg-error-bar ${msgError.startsWith("✅") || msgError.startsWith("⭐") ? "success" : ""}`}>{msgError}</div>}

            {/* Input bar */}
            <div className="input-bar" onClick={e => e.stopPropagation()}>
              <input ref={mediaRef} type="file" accept="image/*,video/*" hidden onChange={handleMediaSelect} />
              <button className="attach-btn" onClick={() => mediaRef.current.click()} disabled={uploading}>
                {uploading ? "⏳" : "📎"}
              </button>
              <button className={`voice-btn ${recording ? "recording" : ""}`}
                onMouseDown={startRecording} onMouseUp={stopRecording}
                onTouchStart={startRecording} onTouchEnd={stopRecording}>
                {recording ? "🔴" : "🎤"}
              </button>
              <div className="emoji-btn-wrap" onClick={e => e.stopPropagation()}>
                <button className="attach-btn" onClick={() => setShowEmojiPicker(v => !v)}>😊</button>
                {showEmojiPicker && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmojiPicker(false)} />}
              </div>
              <textarea ref={textareaRef} className="msg-input"
                placeholder="Message..."
                value={text}
                onChange={e => { setText(e.target.value); handleTyping(); }}
                onKeyDown={handleKey} rows={1}
                disabled={isLimited && !selectedGroup}
              />
              {!selectedGroup && (
                <>
                  <button className="icon-btn schedule-btn"
                    onClick={() => {
                      if (!canMsg.mutualFollow) {
                        setMsgError("🤝 Only mutual followers can schedule messages");
                        setTimeout(() => setMsgError(""), 3000);
                      } else setShowSchedule(v => !v);
                    }}>🕐</button>
                  <button className="icon-btn"
                    style={disappearingHours > 0 && canMsg.mutualFollow ? {color:"var(--teal)",background:"rgba(16,185,129,0.1)",borderRadius:"10px"} : {}}
                    onClick={() => {
                      if (!canMsg.mutualFollow) {
                        setMsgError("🤝 Only mutual followers can use disappearing messages");
                        setTimeout(() => setMsgError(""), 3000);
                      } else setShowDisappearing(v => !v);
                    }}>⏳</button>
                </>
              )}
              <button className={`send-btn ${(text.trim() || mediaPreview) ? "active" : ""}`}
                onClick={() => handleSend()} disabled={!text.trim() && !mediaPreview}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <button className="mobile-menu-btn" style={{position:"absolute",top:16,left:16}}
              onClick={() => setSidebarOpen(true)}>☰</button>
            <div className="empty-icon">💬</div>
            <h2>Select a conversation</h2>
            <p>Pick a chat or group from the sidebar</p>
            <button style={{marginTop:"20px",padding:"12px 24px",background:"var(--accent)",border:"none",borderRadius:"14px",color:"#fff",fontSize:"14px",fontWeight:"700",cursor:"pointer"}}
              className="mobile-open-sidebar-btn"
              onClick={() => setSidebarOpen(true)}>
              Open Chats ☰
            </button>
          </div>
        )}
      </div>

      {/* DM Forward */}
      {showForwardPicker && (
        <div className="modal-overlay" onClick={() => setShowForwardPicker(false)}>
          <div className="forward-modal" onClick={e => e.stopPropagation()}>
            <h3 className="forward-title">↪ Forward to...</h3>
            <div className="forward-list">
              {friends.map(f => (
                <div key={f._id} className="forward-item" onClick={() => handleForwardTo(f)}>
                  <div className="pm-user-av">{f.profilePic ? <img src={f.profilePic} alt="" /> : f.username[0].toUpperCase()}</div>
                  <span className="pm-user-name">@{f.username}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Group Forward */}
      {showGroupForwardPicker && (
        <div className="modal-overlay" onClick={() => setShowGroupForwardPicker(false)}>
          <div className="forward-modal" onClick={e => e.stopPropagation()}>
            <h3 className="forward-title">↪ Forward to...</h3>
            <p className="forward-sub">DMs</p>
            <div className="forward-list">
              {friends.map(f => (
                <div key={f._id} className="forward-item" onClick={() => {
                  socket.emit("sendMessage", { sender: user.username, receiver: f.username, text: groupForwardMsg?.text || "", mediaUrl: groupForwardMsg?.mediaUrl || "", mediaType: groupForwardMsg?.mediaType || "", isForwarded: true });
                  setShowGroupForwardPicker(false);
                  setMsgError(`✅ Forwarded to @${f.username}`); setTimeout(() => setMsgError(""), 3000);
                }}>
                  <div className="pm-user-av">{f.profilePic ? <img src={f.profilePic} alt="" /> : f.username[0].toUpperCase()}</div>
                  <span className="pm-user-name">@{f.username}</span>
                </div>
              ))}
            </div>
            <p className="forward-sub">Groups</p>
            <div className="forward-list">
              {groups.map(g => (
                <div key={g._id} className="forward-item" onClick={() => {
                  socket.emit("sendGroupMessage", { groupId: g._id, sender: user.username, text: groupForwardMsg?.text || "", mediaUrl: groupForwardMsg?.mediaUrl || "", mediaType: groupForwardMsg?.mediaType || "", isForwarded: true });
                  setShowGroupForwardPicker(false);
                  setMsgError(`✅ Forwarded to ${g.name}`); setTimeout(() => setMsgError(""), 3000);
                }}>
                  <div className="pm-user-av">{g.groupPic ? <img src={g.groupPic} alt="" /> : g.name[0].toUpperCase()}</div>
                  <span className="pm-user-name">{g.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showMyProfile && (
        <ProfileModal currentUser={user} onClose={() => setShowMyProfile(false)}
          onProfileUpdate={updateUser} onLogout={logout} />
      )}
      {showUserProfile && (
        <UserProfileModal
          targetUsername={viewProfileUsername || selectedFriend?.username}
          currentUser={user}
          onClose={() => { setShowUserProfile(false); setViewProfileUsername(null); }}
        />
      )}
      {showGroupInfo && selectedGroup && (
        <GroupInfoModal group={selectedGroup} currentUser={user}
          onClose={() => setShowGroupInfo(false)}
          onGroupUpdate={(g) => { setSelectedGroup(g); setGroups(prev => prev.map(gr => gr._id === g._id ? g : gr)); }}
          onLeave={() => { setSelectedGroup(null); setGroups(prev => prev.filter(g => g._id !== selectedGroup._id)); }} />
      )}
      {showCreateGroup && (
        <CreateGroupModal currentUser={user} friends={friends.filter(f => f.isMutual)}
          onClose={() => setShowCreateGroup(false)}
          onCreated={(g) => { setGroups(prev => [...prev, g]); setSelectedGroup(g); setShowCreateGroup(false); }} />
      )}
      {showGroupPolls && selectedGroup && (
        <GroupPollModal group={selectedGroup} currentUser={user}
          onClose={() => setShowGroupPolls(false)} onPollCreated={() => {}} />
      )}
      {showWallpaper && selectedFriend && (
        <WallpaperPicker chatUsername={selectedFriend.username} currentWallpaper={currentWallpaper}
          onSet={handleSetWallpaper} onClose={() => setShowWallpaper(false)} />
      )}
    </div>
  );
}