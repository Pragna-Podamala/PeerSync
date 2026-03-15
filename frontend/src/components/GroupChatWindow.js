import { useEffect, useRef, useState } from "react";
import API from "../services/api";
import socket from "../services/socket";
import "./GroupChatWindow.css";

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

function formatTime(date) {
  return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function GroupChatWindow({ group, messages, setMessages, currentUser, typingUsers, onReply, onForward }) {
  const bottomRef = useRef(null);
  const [lightbox, setLightbox] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [reactionPicker, setReactionPicker] = useState(null);
  const editRef = useRef();

  const isAdmin = group?.members?.find(m => m.username === currentUser.username)?.role === "admin";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  useEffect(() => {
    socket.on("groupMessageEdited", ({ message }) => {
      setMessages(prev => prev.map(m => m._id === message._id ? message : m));
    });
    socket.on("groupMessageDeleted", ({ messageId, deleteFor, deletedBy }) => {
      setMessages(prev => prev.map(m => {
        if (m._id !== messageId) return m;
        if (deleteFor === "everyone") return { ...m, deletedForAll: true, text: "", mediaUrl: "" };
        if (deletedBy === currentUser.username) return { ...m, _deletedForMe: true };
        return m;
      }));
    });
    socket.on("groupMessageReaction", ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    });
    socket.on("groupMessagePinned", ({ messageId, isPinned }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned } : m));
    });
    socket.on("groupMessageRead", ({ messageId, readBy }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, readBy } : m));
    });
    return () => {
      socket.off("groupMessageEdited"); socket.off("groupMessageDeleted");
      socket.off("groupMessageReaction"); socket.off("groupMessagePinned"); socket.off("groupMessageRead");
    };
  }, []);

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({ msg, x: e.clientX, y: e.clientY });
    setReactionPicker(null);
  };

  const handleReact = (messageId, emoji) => {
    socket.emit("reactGroupMessage", { groupId: group._id, messageId, emoji, username: currentUser.username });
    setReactionPicker(null);
  };

  const handleRemoveReaction = (messageId) => {
    socket.emit("reactGroupMessage", { groupId: group._id, messageId, emoji: null, username: currentUser.username });
  };

  const handleEdit = (msg) => {
    setEditingId(msg._id); setEditText(msg.text);
    setContextMenu(null);
    setTimeout(() => editRef.current?.focus(), 100);
  };

  const submitEdit = (msg) => {
    if (!editText.trim()) return;
    socket.emit("editGroupMessage", { groupId: group._id, messageId: msg._id, text: editText, username: currentUser.username });
    setEditingId(null);
  };

  const handleDelete = (msg, deleteFor) => {
    socket.emit("deleteGroupMessage", { groupId: group._id, messageId: msg._id, username: currentUser.username, deleteFor });
    setContextMenu(null);
  };

  const handlePin = (msg) => {
    socket.emit("pinGroupMessage", { groupId: group._id, messageId: msg._id, username: currentUser.username });
    setContextMenu(null);
  };

  const handleViewOneTime = async (msg) => {
    try {
      const res = await API.post(`/groups/${group._id}/messages/${msg._id}/view`);
      setMessages(prev => prev.map(m => m._id === msg._id ? res.data : m));
    } catch (err) { console.log(err); }
  };

  const pinnedMsgs = messages.filter(m => m.isPinned && !m.deletedForAll && !m._deletedForMe);

  const grouped = [];
  let lastDate = null;
  (messages || []).forEach(msg => {
    if (msg._deletedForMe || msg.deletedFor?.includes(currentUser.username)) return;
    const d = formatDate(msg.createdAt || msg.time);
    if (d !== lastDate) { grouped.push({ type: "divider", label: d }); lastDate = d; }
    grouped.push({ type: "msg", data: msg });
  });

  const getMember = (username) => group?.members?.find(m => m.username === username);

  return (
    <div className="chat-window" onClick={() => setContextMenu(null)}>

      {/* Pinned banner */}
      {pinnedMsgs.length > 0 && (
        <div className="pinned-banner">
          <span>📌</span>
          <span className="pin-text">{pinnedMsgs[pinnedMsgs.length - 1]?.text || "📎 Media"}</span>
          <span className="pin-count">{pinnedMsgs.length} pinned</span>
        </div>
      )}

      {grouped.map((item, i) => {
        if (item.type === "divider") return (
          <div key={i} className="date-divider"><span>{item.label}</span></div>
        );

        const msg = item.data;
        const isMine = msg.sender === currentUser.username;
        const isDeleted = msg.deletedForAll;
        const member = getMember(msg.sender);
        const memberIsAdmin = member?.role === "admin";

        const allReactions = msg.reactions
          ? Object.entries(typeof msg.reactions === "object" && !(msg.reactions instanceof Map)
              ? msg.reactions : Object.fromEntries(msg.reactions))
          : [];
        const reactionGroups = {};
        allReactions.forEach(([user, emoji]) => {
          if (!reactionGroups[emoji]) reactionGroups[emoji] = [];
          reactionGroups[emoji].push(user);
        });

        return (
          <div key={msg._id || i} className={`msg-row ${isMine ? "mine" : "theirs"} ${msg.isPinned ? "pinned-msg" : ""}`}>
            {!isMine && (
              <div className="msg-avatar" title={msg.sender}>
                {member?.user?.profilePic
                  ? <img src={member.user.profilePic} alt="" />
                  : msg.sender[0].toUpperCase()
                }
              </div>
            )}

            <div className="bubble-wrap">
              {/* Sender name for group */}
              {!isMine && (
                <div className="group-sender-name">
                  {msg.sender}
                  {memberIsAdmin && <span className="admin-badge">Admin</span>}
                </div>
              )}

              {/* Reply preview */}
              {msg.replyTo?.messageId && !isDeleted && (
                <div className={`reply-preview ${isMine ? "mine" : ""}`}>
                  <span className="reply-sender">@{msg.replyTo.sender}</span>
                  <span className="reply-text">{msg.replyTo.text || "📎 Media"}</span>
                </div>
              )}

              {/* Forwarded */}
              {msg.isForwarded && !isDeleted && (
                <div className="forwarded-label">↪ Forwarded</div>
              )}

              {isDeleted ? (
                <div className={`bubble deleted-bubble ${isMine ? "b-mine" : "b-theirs"}`}>
                  🚫 {isMine ? "You deleted this message" : "This message was deleted"}
                </div>
              ) : (
                <>
                  {/* One-time message */}
                  {msg._oneTimeLocked ? (
                    <div className={`bubble b-theirs one-time-locked`} onClick={() => handleViewOneTime(msg)}>
                      🔒 Tap to view (once only)
                    </div>
                  ) : msg.isOneTime && !isMine && (
                    <div className="one-time-badge">👁️ View once</div>
                  )}

                  {/* Media */}
                  {msg.mediaUrl && msg.mediaType !== "audio" && (
                    <div className={`media-bubble ${isMine ? "mine" : ""}`} onClick={() => setLightbox(msg)}>
                      {msg.mediaType === "video"
                        ? <video src={msg.mediaUrl} className="msg-media" />
                        : <img src={msg.mediaUrl} alt="media" className="msg-media" />
                      }
                    </div>
                  )}

                  {/* Voice */}
                  {msg.mediaType === "audio" && (
                    <div className={`voice-bubble ${isMine ? "b-mine" : "b-theirs"}`}>
                      <span>🎤</span>
                      <audio src={msg.mediaUrl} controls className="voice-player" />
                    </div>
                  )}

                  {/* Text */}
                  {msg.text && (
                    editingId === msg._id ? (
                      <div className="edit-wrap">
                        <textarea ref={editRef} className="edit-input" value={editText}
                          onChange={e => setEditText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(msg); }
                            if (e.key === "Escape") setEditingId(null);
                          }}
                        />
                        <div className="edit-actions">
                          <button className="edit-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                          <button className="edit-save" onClick={() => submitEdit(msg)}>Save</button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`bubble ${isMine ? "b-mine" : "b-theirs"}`}
                        onContextMenu={e => handleContextMenu(e, msg)}
                        onDoubleClick={() => setReactionPicker(msg._id)}
                      >
                        {msg.text}
                        {msg.isEdited && <span className="edited-label"> (edited)</span>}
                      </div>
                    )
                  )}

                  {/* Reactions */}
                  {Object.keys(reactionGroups).length > 0 && (
                    <div className="reactions-row">
                      {Object.entries(reactionGroups).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          className={`reaction-chip ${users.includes(currentUser.username) ? "mine" : ""}`}
                          onClick={() => users.includes(currentUser.username) ? handleRemoveReaction(msg._id) : handleReact(msg._id, emoji)}
                          title={users.join(", ")}
                        >
                          {emoji} {users.length > 1 ? users.length : ""}
                        </button>
                      ))}
                    </div>
                  )}

                  {reactionPicker === msg._id && (
                    <div className={`reaction-picker ${isMine ? "left" : "right"}`} onClick={e => e.stopPropagation()}>
                      {REACTIONS.map(emoji => (
                        <button key={emoji} className="reaction-opt"
                          onClick={() => { handleReact(msg._id, emoji); setReactionPicker(null); }}>
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Meta */}
              {!isDeleted && (
                <div className={`msg-meta ${isMine ? "meta-right" : "meta-left"}`}>
                  {msg.isPinned && <span className="pin-badge">📌</span>}
                  <span className="msg-time">{formatTime(msg.createdAt || msg.time)}</span>
                  {isMine && msg.readBy && (
                    <span className="read-count" title={msg.readBy.filter(u => u !== currentUser.username).join(", ")}>
                      {msg.readBy.length > 1 ? `✓✓ ${msg.readBy.length - 1}` : "✓"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing indicators */}
      {typingUsers && typingUsers.length > 0 && (
        <div className="msg-row theirs">
          <div className="msg-avatar">{typingUsers[0][0]?.toUpperCase()}</div>
          <div className="bubble-wrap">
            <div className="group-sender-name">{typingUsers.join(", ")}</div>
            <div className="typing-bubble"><span /><span /><span /></div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Context menu */}
      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { setReactionPicker(contextMenu.msg._id); setContextMenu(null); }}>😊 React</button>
          <button onClick={() => { onReply && onReply(contextMenu.msg); setContextMenu(null); }}>↩ Reply</button>
          <button onClick={() => { onForward && onForward(contextMenu.msg); setContextMenu(null); }}>↪ Forward</button>
          {(isAdmin) && (
            <button onClick={() => handlePin(contextMenu.msg)}>
              {contextMenu.msg.isPinned ? "📌 Unpin" : "📌 Pin"}
            </button>
          )}
          {contextMenu.msg.sender === currentUser.username && (
            <>
              {(new Date() - new Date(contextMenu.msg.createdAt)) / 60000 <= 15 && (
                <button onClick={() => handleEdit(contextMenu.msg)}>✏️ Edit</button>
              )}
            </>
          )}
          {(contextMenu.msg.sender === currentUser.username || isAdmin) && (
            <button className="danger" onClick={() => handleDelete(contextMenu.msg, "everyone")}>🗑 Delete for everyone</button>
          )}
          <button className="danger" onClick={() => handleDelete(contextMenu.msg, "me")}>🗑 Delete for me</button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          {lightbox.mediaType === "video"
            ? <video src={lightbox.mediaUrl} controls className="lightbox-media" onClick={e => e.stopPropagation()} />
            : <img src={lightbox.mediaUrl} alt="" className="lightbox-media" />
          }
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}