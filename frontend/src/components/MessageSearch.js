import { useState } from "react";
import "./MessageSearch.css";

export default function MessageSearch({ messages, currentUser, onClose, onJumpTo }) {
  const [query, setQuery] = useState("");

  const results = query.trim().length < 2 ? [] : messages.filter(m =>
    !m.deletedBySender && !m.deletedByReceiver &&
    m.text?.toLowerCase().includes(query.toLowerCase())
  );

  const formatTime = (date) => new Date(date).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="msg-search-panel">
      <div className="msg-search-header">
        <span className="msg-search-title">🔍 Search Messages</span>
        <button className="msg-search-close" onClick={onClose}>✕</button>
      </div>
      <input
        className="msg-search-input"
        placeholder="Type to search..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        autoFocus
      />
      <div className="msg-search-results">
        {query.length > 0 && results.length === 0 && (
          <p className="msg-search-empty">No messages found</p>
        )}
        {results.map(msg => (
          <div key={msg._id} className="msg-search-item" onClick={() => { onJumpTo(msg._id); onClose(); }}>
            <div className="msg-search-sender">
              {msg.sender === currentUser.username ? "You" : `@${msg.sender}`}
            </div>
            <div className="msg-search-text">
              {msg.text?.split(new RegExp(`(${query})`, "gi")).map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                  ? <mark key={i} className="msg-search-highlight">{part}</mark>
                  : part
              )}
            </div>
            <div className="msg-search-time">{formatTime(msg.time || msg.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}