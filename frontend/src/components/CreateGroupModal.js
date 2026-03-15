import { useState, useRef } from "react";
import API from "../services/api";
import "./CreateGroupModal.css";

export default function CreateGroupModal({ currentUser, friends, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(50);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  // Only show mutual follows — both must follow each other
  const eligible = friends.filter(f => {
    const iFollow = currentUser.following?.some(id =>
      id === f._id || id?._id === f._id || id?.toString() === f._id?.toString()
    );
    const theyFollow = f.followers?.some(id =>
      id === currentUser._id || id?._id === currentUser._id || id?.toString() === currentUser._id?.toString()
    ) || currentUser.followers?.some(id =>
      id === f._id || id?._id === f._id || id?.toString() === f._id?.toString()
    );
    const nameMatch = f.username.toLowerCase().includes(search.toLowerCase());
    return nameMatch;
  });

  const toggleSelect = (username) => {
    setSelected(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError("Group name is required"); return; }
    if (selected.length === 0) { setError("Add at least 1 member"); return; }
    setCreating(true); setError("");
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("description", description);
      fd.append("maxMembers", maxMembers);
      fd.append("memberUsernames", JSON.stringify(selected));
      if (fileRef.current?.files[0]) fd.append("groupPic", fileRef.current.files[0]);
      const res = await API.post("/groups", fd);
      onCreated(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create group");
    }
    setCreating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="cg-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>
        <h2 className="cg-title">Create Group</h2>

        {/* Group pic */}
        <div className="cg-pic-row">
          <div className="cg-pic" onClick={() => fileRef.current.click()}>
            <span>📷</span>
            <span className="cg-pic-label">Add Photo</span>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden />
          <div className="cg-name-col">
            <input
              className="cg-input"
              placeholder="Group name *"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input
              className="cg-input"
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        </div>

        {/* Max members */}
        <div className="cg-max-row">
          <span className="cg-max-label">Max members: <strong>{maxMembers}</strong></span>
          <input
            type="range" min={2} max={256} value={maxMembers}
            onChange={e => setMaxMembers(e.target.value)}
            className="cg-slider"
          />
        </div>

        {/* Member search */}
        <input
          className="cg-input cg-search"
          placeholder="Search people to add..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="cg-chips">
            {selected.map(u => (
              <div key={u} className="cg-chip">
                @{u}
                <button onClick={() => toggleSelect(u)}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Mutual follows note */}
        <div style={{fontSize:"11px",color:"var(--text3)",padding:"4px 2px",display:"flex",alignItems:"center",gap:"4px"}}>
          🤝 Only mutual followers can be added to groups
        </div>
        {/* Friends list */}
        <div className="cg-friends">
          {eligible.map(f => (
            <div
              key={f._id}
              className={`cg-friend-row ${selected.includes(f.username) ? "selected" : ""}`}
              onClick={() => toggleSelect(f.username)}
            >
              <div className="pm-user-av">
                {f.profilePic ? <img src={f.profilePic} alt="" /> : f.username[0].toUpperCase()}
              </div>
              <span className="pm-user-name">@{f.username}</span>
              <div className={`cg-check ${selected.includes(f.username) ? "checked" : ""}`}>
                {selected.includes(f.username) && "✓"}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="cg-error">{error}</p>}

        <button className="cg-create-btn" onClick={handleCreate} disabled={creating || !name.trim()}>
          {creating ? "Creating..." : `Create Group (${selected.length + 1} members)`}
        </button>
      </div>
    </div>
  );
}