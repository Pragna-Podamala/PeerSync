import { useState } from "react";
import API from "../services/api";
import "./Sidebar.css";

export default function Sidebar({
  currentUser, friends, selectedFriend, onSelectFriend,
  onlineUsers, onLogout, onOpenProfile, allMessages, typingUser,
  groups, selectedGroup, onSelectGroup, onCreateGroup, className,
}) {
  const [tab, setTab] = useState("chats");
  const [search, setSearch] = useState("");
  const [pinnedChats, setPinnedChats] = useState(currentUser?.pinnedChats || []);
  const [archivedChats, setArchivedChats] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [sidebarCtx, setSidebarCtx] = useState(null);

  const handlePinChat = async (username) => {
    setSidebarCtx(null);
    setPinnedChats(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [username, ...prev]
    );
    try { await API.post("/users/me/pin-chat", { username }); } catch {}
  };

  const handleArchive = (username) => {
    setSidebarCtx(null);
    setArchivedChats(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
    if (selectedFriend?.username === username) onSelectFriend(null);
  };

  const getUnread = (username) => {
    const msgs = allMessages?.[username] || [];
    if (!msgs.length) return 0;
    // If last message was sent by ME, I've seen everything
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.sender === currentUser.username) return 0;
    // Count only unread messages from them after my last message
    let lastMyMsgIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].sender === currentUser.username) { lastMyMsgIdx = i; break; }
    }
    return msgs.slice(lastMyMsgIdx + 1).filter(m =>
      m.sender !== currentUser.username && m.status !== "seen"
    ).length;
  };

  const getLastMessage = (username) => {
    const msgs = allMessages?.[username] || [];
    return msgs[msgs.length - 1];
  };

  const formatLastMsg = (msg) => {
    if (!msg) return "";
    if (msg._deleted || msg.deletedBySender) return "🚫 Deleted";
    if (msg.mediaType === "audio") return "🎤 Voice message";
    if (msg.gifUrl) return "GIF";
    if (msg.mediaUrl) return msg.mediaType === "video" ? "🎥 Video" : "📷 Photo";
    return msg.text?.slice(0, 32) || "";
  };

  const formatTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const activeFriends = friends.filter(f => !archivedChats.includes(f.username));
  const archivedFriends = friends.filter(f => archivedChats.includes(f.username));

  const totalArchivedUnread = archivedFriends.reduce((sum, f) => sum + getUnread(f.username), 0);

  const sortedFriends = [...activeFriends]
    .filter(f => f.username.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const ap = pinnedChats.includes(a.username);
      const bp = pinnedChats.includes(b.username);
      if (ap && !bp) return -1;
      if (!ap && bp) return 1;
      const al = getLastMessage(a.username);
      const bl = getLastMessage(b.username);
      if (!al && !bl) return 0;
      if (!al) return 1;
      if (!bl) return -1;
      return new Date(bl.time || bl.createdAt) - new Date(al.time || al.createdAt);
    });

  const filteredGroups = (groups || []).filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderFriendItem = (friend, isArchived = false) => {
    const isOnline = onlineUsers.includes(friend.username);
    const isSelected = selectedFriend?.username === friend.username;
    const unread = getUnread(friend.username);
    const lastMsg = getLastMessage(friend.username);
    const isPinned = pinnedChats.includes(friend.username);
    const isTyping = typingUser === friend.username;

    return (
      <li key={friend._id}
        className={`friend-item ${isSelected ? "active" : ""}`}
        onClick={() => onSelectFriend(friend)}
      >
        <div className="friend-avatar-wrap">
          <div className="friend-avatar">
            {friend.profilePic ? <img src={friend.profilePic} alt="" /> : (friend?.username?.[0] || "?").toUpperCase()}
          </div>
          <span className={`online-dot ${isOnline ? "on" : "off"}`} />
        </div>
        <div className="friend-info">
          <div className="friend-row-top">
            <span className="friend-name">
              {isPinned && <span className="pin-indicator">📌 </span>}
              {friend.username}
              {friend.isVerified && <span className="verified-badge">✓</span>}
            </span>
            <span className="last-msg-time">{formatTime(lastMsg?.time || lastMsg?.createdAt)}</span>
          </div>
          <div className="friend-row-bottom">
            <span className="last-msg-preview">
              {isTyping
                ? <span className="typing-text">typing...</span>
                : <span>{lastMsg?.sender === currentUser.username ? "You: " : ""}{formatLastMsg(lastMsg)}</span>
              }
            </span>
            {unread > 0 && !isSelected && (
              <span className="unread-badge">{unread > 99 ? "99+" : unread}</span>
            )}
          </div>
        </div>
        <button
          className="friend-dots-btn"
          onClick={e => {
            e.stopPropagation();
            const x = e.clientX + 210 > window.innerWidth ? e.clientX - 210 : e.clientX;
            const y = e.clientY + 180 > window.innerHeight ? e.clientY - 180 : e.clientY;
            setSidebarCtx({ friend, x, y, isArchived });
          }}
        >⋮</button>
      </li>
    );
  };

  return (
    <div className={`sidebar ${className || ""}`} onClick={() => setSidebarCtx(null)}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="brand-dot" />
          <h1 className="brand-name">PeerSync</h1>
        </div>
        <button className="my-avatar-btn" onClick={onOpenProfile} style={{position:"relative"}}>
          <div className="my-avatar">
            {currentUser.profilePic
              ? <img src={currentUser.profilePic} alt="" />
              : (currentUser?.username?.[0] || "?").toUpperCase()
            }
          </div>
          {currentUser?.pendingRequestsCount > 0 && (
            <span style={{
              position:"absolute", top:"-4px", right:"-4px",
              background:"#e05555", color:"#fff",
              fontSize:"10px", fontWeight:"700",
              minWidth:"18px", height:"18px",
              borderRadius:"9px", display:"flex",
              alignItems:"center", justifyContent:"center",
              padding:"0 4px", border:"2px solid var(--bg)"
            }}>
              {currentUser.pendingRequestsCount > 9 ? "9+" : currentUser.pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      <div className="sidebar-tabs">
        <button className={`sidebar-tab ${tab === "chats" ? "active" : ""}`} onClick={() => setTab("chats")}>💬 Chats</button>
        <button className={`sidebar-tab ${tab === "groups" ? "active" : ""}`} onClick={() => setTab("groups")}>👥 Groups</button>
      </div>

      <div className="search-wrap">
        <span className="search-icon">🔍</span>
        <input className="search-input"
          placeholder={tab === "chats" ? "Search people..." : "Search groups..."}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {tab === "chats" && (
        <>
          {/* Archived banner */}
          {archivedFriends.length > 0 && !showArchived && (
            <div className="archived-banner" onClick={() => setShowArchived(true)}>
              <div className="archived-banner-left">
                <span className="archived-icon">📁</span>
                <div>
                  <div className="archived-title">Archived</div>
                  <div className="archived-sub">{archivedFriends.length} chat{archivedFriends.length > 1 ? "s" : ""}</div>
                </div>
              </div>
              {totalArchivedUnread > 0 && (
                <span className="unread-badge">{totalArchivedUnread}</span>
              )}
            </div>
          )}

          {/* Archived chats expanded */}
          {showArchived && (
            <div className="archived-section">
              <div className="archived-section-header" onClick={() => setShowArchived(false)}>
                <span>📁 Archived Chats</span>
                <span className="archived-close">✕</span>
              </div>
              <ul className="friend-list">
                {archivedFriends.map(f => renderFriendItem(f, true))}
              </ul>
              <div className="archived-divider">── Active Chats ──</div>
            </div>
          )}

          <div className="section-label">PEOPLE</div>
          <ul className="friend-list">
            {sortedFriends.length === 0 && <li className="no-results">No users found</li>}
            {sortedFriends.map(f => renderFriendItem(f, false))}
          </ul>
        </>
      )}

      {tab === "groups" && (
        <>
          <div className="section-label-row">
            <span className="section-label" style={{padding:0}}>GROUPS</span>
            <button className="new-group-btn" onClick={onCreateGroup}>+ New</button>
          </div>
          <ul className="friend-list">
            {filteredGroups.length === 0 && <li className="no-results">No groups yet</li>}
            {filteredGroups.map(group => {
              const isSelected = selectedGroup?._id === group._id;
              const myRole = group.members?.find(m => m.username === currentUser.username)?.role;
              return (
                <li key={group._id} className={`friend-item ${isSelected ? "active" : ""}`}
                  onClick={() => onSelectGroup(group)}>
                  <div className="friend-avatar-wrap">
                    <div className="friend-avatar group-avatar">
                      {group.groupPic ? <img src={group.groupPic} alt="" /> : (group?.name?.[0] || "?").toUpperCase()}
                    </div>
                  </div>
                  <div className="friend-info">
                    <div className="friend-row-top">
                      <span className="friend-name">{group.name}</span>
                      {myRole === "admin" && <span className="my-admin-badge">Admin</span>}
                    </div>
                    <span className="friend-sub">{group.members?.length} members</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <button className="logout-btn" onClick={onLogout}><span>⏻</span> Logout</button>

      {/* Context menu */}
      {sidebarCtx && (
        <div className="sidebar-context-menu"
          style={{ top: sidebarCtx.y, left: sidebarCtx.x }}
          onClick={e => e.stopPropagation()}>
          <button className="sidebar-ctx-btn" onClick={() => handlePinChat(sidebarCtx.friend.username)}>
            📌 {pinnedChats.includes(sidebarCtx.friend.username) ? "Unpin Chat" : "Pin Chat"}
          </button>
          <button className="sidebar-ctx-btn" onClick={() => { onSelectFriend(sidebarCtx.friend); setSidebarCtx(null); }}>
            💬 Open Chat
          </button>
          <button className="sidebar-ctx-btn" onClick={() => handleArchive(sidebarCtx.friend.username)}>
            {sidebarCtx.isArchived ? "📂 Unarchive Chat" : "📁 Archive Chat"}
          </button>
          <button className="sidebar-ctx-btn danger" onClick={() => {
            setSidebarCtx(null);
            if (window.confirm(`Delete chat with @${sidebarCtx.friend.username}?`)) {}
          }}>
            🗑 Delete Chat
          </button>
        </div>
      )}
    </div>
  );
}