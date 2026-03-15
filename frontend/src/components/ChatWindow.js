import { useEffect, useRef, useState } from "react";
import socket from "../services/socket";
import API from "../services/api";
import "./ChatWindow.css";

const REACTIONS = ["❤️","😂","😮","😢","😡","👍","🔥","🥰","😍","🤣","😭","🙏","💯","😎","🤩","😘","🥳","😱","🤯","👏","🫶","💪","✅","🎉","💀","😴","🤔","👀","💅","🫠"];

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

export default function ChatWindow({ messages, setMessages, currentUser, selectedFriend, typingUser, onReply, onForward, onStarMessage, jumpToMsgId }) {
  const bottomRef = useRef(null);
  const msgRefs = useRef({});
  const [lightbox, setLightbox] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [reactionPicker, setReactionPicker] = useState(null);
  const editRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  useEffect(() => {
    if (jumpToMsgId && msgRefs.current[jumpToMsgId]) {
      msgRefs.current[jumpToMsgId].scrollIntoView({ behavior: "smooth", block: "center" });
      msgRefs.current[jumpToMsgId].classList.add("highlight-msg");
      setTimeout(() => msgRefs.current[jumpToMsgId]?.classList.remove("highlight-msg"), 2000);
    }
  }, [jumpToMsgId]);

  // Auto-remove disappearing messages
  useEffect(() => {
    if (!messages?.length) return;
    messages.forEach(msg => {
      if (msg.disappearsAt && !msg._deleted) {
        const msLeft = new Date(msg.disappearsAt) - Date.now();
        if (msLeft <= 0) {
          setMessages(prev => prev.filter(m => m._id !== msg._id));
        } else {
          const t = setTimeout(() => {
            setMessages(prev => prev.filter(m => m._id !== msg._id));
          }, Math.min(msLeft, 2147483647));
          return () => clearTimeout(t);
        }
      }
    });
  }, [messages?.length]);

  useEffect(() => {
    socket.on("messageEdited", (msg) => setMessages(prev => prev.map(m => m._id === msg._id ? msg : m)));
    socket.on("messageDeleted", ({ messageId, deleteFor }) => {
      setMessages(prev => prev.map(m => {
        if (m._id !== messageId) return m;
        if (deleteFor === "everyone") return { ...m, _deleted: true, text: "", mediaUrl: "" };
        if (m.sender === currentUser.username) return { ...m, _deletedForMe: true };
        return { ...m, _deleted: true };
      }));
    });
    socket.on("messageReaction", ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, reactions } : m));
    });
    socket.on("messagePinned", ({ messageId, isPinned }) => {
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isPinned } : m));
    });
    return () => {
      socket.off("messageEdited"); socket.off("messageDeleted");
      socket.off("messageReaction"); socket.off("messagePinned");
    };
  }, [currentUser.username]);

  const openContextMenu = (e, msg) => {
    e.preventDefault();
    const menuW = 200, menuH = 320;
    const x = e.clientX + menuW > window.innerWidth ? e.clientX - menuW : e.clientX;
    const y = e.clientY + menuH > window.innerHeight ? e.clientY - menuH : e.clientY;
    setContextMenu({ msg, x, y });
    setReactionPicker(null);
  };

  const handleReact = (messageId, emoji) => {
    socket.emit("reactMessage", { messageId, emoji, username: currentUser.username });
    setReactionPicker(null); setContextMenu(null);
  };

  const handleRemoveReaction = (messageId) => {
    socket.emit("reactMessage", { messageId, emoji: null, username: currentUser.username });
  };

  const handleEdit = (msg) => {
    setEditingId(msg._id); setEditText(msg.text);
    setContextMenu(null);
    setTimeout(() => editRef.current?.focus(), 100);
  };

  const submitEdit = (msg) => {
    if (!editText.trim()) return;
    socket.emit("editMessage", { messageId: msg._id, text: editText, username: currentUser.username });
    setEditingId(null);
  };

  const handleDelete = (msg, deleteFor) => {
    socket.emit("deleteMessage", { messageId: msg._id, username: currentUser.username, deleteFor });
    setContextMenu(null);
  };

  const handlePin = (msg) => {
    socket.emit("pinMessage", { messageId: msg._id, username: currentUser.username });
    setContextMenu(null);
  };

  const handleStar = async (msg) => {
    setContextMenu(null);
    onStarMessage && await onStarMessage(msg._id);
  };

  const handleDownload = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename || "download";
      a.click();
    } catch {
      window.open(url, "_blank");
    }
  };

  const pinnedMsgs = messages.filter(m => m.isPinned && !m._deleted && !m._deletedForMe);

  // Group by date
  const grouped = [];
  let lastDate = null;
  messages.forEach(msg => {
    if (msg._deletedForMe || msg.deletedByReceiver) return;
    const d = formatDate(msg.time || msg.createdAt);
    if (d !== lastDate) { grouped.push({ type: "divider", label: d }); lastDate = d; }
    grouped.push({ type: "msg", data: msg });
  });

  return (
    <div className="chat-window" onClick={() => { setContextMenu(null); setReactionPicker(null); }}>

      {/* Pinned banner */}
      {pinnedMsgs.length > 0 && (
        <div className="pinned-banner">
          <span>📌</span>
          <span className="pin-text">{pinnedMsgs[pinnedMsgs.length-1]?.text || "📎 Media"}</span>
          <span className="pin-count">{pinnedMsgs.length} pinned</span>
        </div>
      )}

      {grouped.map((item, i) => {
        if (item.type === "divider") return (
          <div key={i} className="date-divider"><span>{item.label}</span></div>
        );

        const msg = item.data;
        const isMine = msg.sender === currentUser.username;
        const isDeleted = msg._deleted || msg.deletedBySender || msg.deletedByReceiver;

        // System messages — centered
        if (msg.isSystem) return (
          <div key={msg._id || i} className="msg-row" style={{justifyContent:"center",margin:"8px 0"}}>
            <div style={{
              background:"rgba(139,92,246,0.08)", border:"1px solid rgba(139,92,246,0.15)",
              borderRadius:"20px", padding:"6px 18px", fontSize:"12px",
              color:"var(--text3)", textAlign:"center", maxWidth:"80%", fontStyle:"italic"
            }}>{msg.text}</div>
          </div>
        );

        const allReactions = msg.reactions
          ? typeof msg.reactions === "object" && !(msg.reactions instanceof Map)
            ? Object.entries(msg.reactions)
            : Object.entries(Object.fromEntries(msg.reactions))
          : [];
        const reactionGroups = {};
        allReactions.forEach(([user, emoji]) => {
          if (!reactionGroups[emoji]) reactionGroups[emoji] = [];
          reactionGroups[emoji].push(user);
        });

        const filename = msg.mediaUrl?.split("/").pop() || "download";

        return (
          <div
            key={msg._id || i}
            ref={el => { if (el) msgRefs.current[msg._id] = el; }}
            className={`msg-row ${isMine ? "mine" : "theirs"} ${msg.isPinned ? "pinned-msg" : ""}`}
          >
            {!isMine && (
              <div className="msg-avatar">
                {selectedFriend?.profilePic
                  ? <img src={selectedFriend.profilePic} alt="" />
                  : selectedFriend?.username?.[0]?.toUpperCase()
                }
              </div>
            )}

            <div className="bubble-wrap">
              {/* Reply preview */}
              {msg.replyTo?.messageId && !isDeleted && (
                <div className={`reply-preview ${isMine ? "mine" : ""}`}>
                  <span className="reply-sender">@{msg.replyTo.sender}</span>
                  <span className="reply-text">{msg.replyTo.text || "📎 Media"}</span>
                </div>
              )}

              {msg.isForwarded && !isDeleted && (
                <div className="forwarded-label">↪ Forwarded</div>
              )}

              {isDeleted ? (
                <div className={`bubble deleted-bubble ${isMine ? "b-mine" : "b-theirs"}`}>
                  🚫 {isMine ? "You deleted this message" : "This message was deleted"}
                </div>
              ) : (
                <>
                  {/* Image/Video with download */}
                  {msg.mediaUrl && msg.mediaType !== "audio" && (
                    <div className="media-bubble-wrap">
                      <div className={`media-bubble ${isMine ? "mine" : ""}`}
                        onClick={() => setLightbox(msg)}>
                        {msg.mediaType === "video"
                          ? <video src={msg.mediaUrl} className="msg-media" />
                          : <img src={msg.mediaUrl} alt="media" className="msg-media" />
                        }
                      </div>
                      <button
                        className="media-dl-btn"
                        onClick={e => { e.stopPropagation(); handleDownload(msg.mediaUrl, filename); }}
                        title="Download">
                        ⬇
                      </button>
                    </div>
                  )}

                  {/* Voice */}
                  {msg.mediaType === "audio" && (
                    <div className={`voice-bubble ${isMine ? "b-mine" : "b-theirs"}`}>
                      <span>🎤</span>
                      <audio src={msg.mediaUrl} controls className="voice-player" />
                      <button
                        className="voice-dl-btn"
                        onClick={() => handleDownload(msg.mediaUrl, "voice.webm")}
                        title="Download">⬇</button>
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
                        onContextMenu={e => openContextMenu(e, msg)}
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
                          onClick={() => users.includes(currentUser.username)
                            ? handleRemoveReaction(msg._id)
                            : handleReact(msg._id, emoji)
                          }
                          title={users.join(", ")}
                        >
                          {emoji} {users.length > 1 ? users.length : ""}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Reaction picker */}
                  {reactionPicker === msg._id && (
                    <div className={`reaction-picker ${isMine ? "left" : "right"}`} onClick={e => e.stopPropagation()}>
                      {REACTIONS.map(emoji => (
                        <button key={emoji} className="reaction-opt"
                          onClick={() => handleReact(msg._id, emoji)}>
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
                  {msg.disappearsAt && <span title={`Disappears at ${new Date(msg.disappearsAt).toLocaleTimeString()}`}>⏳</span>}
                  <span className="msg-time">{formatTime(msg.time || msg.createdAt)}</span>
                  {isMine && (
                    <span className={`msg-status ${msg.status === "seen" ? "seen" : ""}`}>
                      {msg.status === "sent" ? "✓" : msg.status === "delivered" ? "✓✓" : "✓✓"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Typing */}
      {typingUser && (
        <div className="msg-row theirs">
          <div className="msg-avatar">
            {selectedFriend?.profilePic
              ? <img src={selectedFriend.profilePic} alt="" />
              : selectedFriend?.username?.[0]?.toUpperCase()
            }
          </div>
          <div className="bubble-wrap">
            <div className="typing-bubble"><span /><span /><span /></div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Context menu */}
      {contextMenu && (
        <div className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x, position: "fixed" }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { setReactionPicker(contextMenu.msg._id); setContextMenu(null); }}>😊 React</button>
          <button onClick={() => { onReply && onReply(contextMenu.msg); setContextMenu(null); }}>↩ Reply</button>
          <button onClick={() => { onForward && onForward(contextMenu.msg); setContextMenu(null); }}>↪ Forward</button>
          <button onClick={() => handlePin(contextMenu.msg)}>
            {contextMenu.msg.isPinned ? "📌 Unpin" : "📌 Pin"}
          </button>
          <button onClick={() => handleStar(contextMenu.msg)}>⭐ Star</button>
          {contextMenu.msg.mediaUrl && (
            <button onClick={() => { handleDownload(contextMenu.msg.mediaUrl, contextMenu.msg.mediaUrl.split("/").pop()); setContextMenu(null); }}>
              ⬇ Download
            </button>
          )}
          {contextMenu.msg.sender === currentUser.username && (
            <>
              {(new Date() - new Date(contextMenu.msg.time || contextMenu.msg.createdAt)) / 60000 <= 15 && (
                <button onClick={() => handleEdit(contextMenu.msg)}>✏️ Edit</button>
              )}
              <button className="danger" onClick={() => handleDelete(contextMenu.msg, "everyone")}>🗑 Delete for everyone</button>
            </>
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
          <button
            className="lightbox-dl"
            onClick={e => { e.stopPropagation(); handleDownload(lightbox.mediaUrl, lightbox.mediaUrl.split("/").pop()); }}
          >⬇ Download</button>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>✕</button>
        </div>
      )}
    </div>
  );
}