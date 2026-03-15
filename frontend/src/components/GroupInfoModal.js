import { useState, useRef } from "react";
import API from "../services/api";
import "./GroupInfoModal.css";

export default function GroupInfoModal({ group, currentUser, onClose, onGroupUpdate, onLeave }) {
  const [tab, setTab] = useState("members");
  const [addUsername, setAddUsername] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [copied, setCopied] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editDesc, setEditDesc] = useState(group.description || "");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const me = group.members.find(m => m.username === currentUser.username);
  const isAdmin = me?.role === "admin";
  const inviteUrl = `${window.location.origin}/join/${group.inviteLink}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenLink = async () => {
    if (!window.confirm("Regenerate invite link? Old link will stop working.")) return;
    try {
      const res = await API.post(`/groups/${group._id}/regen-link`);
      onGroupUpdate({ ...group, inviteLink: res.data.inviteLink });
    } catch (err) { console.log(err); }
  };

  const handleAddMember = async () => {
    if (!addUsername.trim()) return;
    setAdding(true); setAddError("");
    try {
      const res = await API.post(`/groups/${group._id}/add`, { username: addUsername.trim() });
      onGroupUpdate(res.data);
      setAddUsername("");
    } catch (err) {
      setAddError(err.response?.data?.message || "Failed to add");
    }
    setAdding(false);
  };

  const handleRemove = async (username) => {
    if (!window.confirm(`Remove @${username} from group?`)) return;
    try {
      const res = await API.post(`/groups/${group._id}/remove`, { username });
      onGroupUpdate(res.data);
    } catch (err) { console.log(err); }
  };

  const handleMakeAdmin = async (username) => {
    const member = group.members.find(m => m.username === username);
    const isCurrentAdmin = member?.role === "admin";
    if (!window.confirm(`${isCurrentAdmin ? "Remove admin from" : "Make"} @${username} ${isCurrentAdmin ? "" : "an admin"}?`)) return;
    try {
      const res = await API.post(`/groups/${group._id}/make-admin`, { username });
      onGroupUpdate(res.data);
    } catch (err) { console.log(err); }
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", editName);
      fd.append("description", editDesc);
      if (fileRef.current?.files[0]) fd.append("groupPic", fileRef.current.files[0]);
      const res = await API.put(`/groups/${group._id}`, fd);
      onGroupUpdate(res.data);
    } catch (err) { console.log(err); }
    setSaving(false);
  };

  const handleLeave = async () => {
    if (!window.confirm("Leave this group?")) return;
    try {
      await API.post(`/groups/${group._id}/leave`);
      onLeave();
      onClose();
    } catch (err) { console.log(err); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="gi-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>

        <div className="gi-header">
          <div className="gi-avatar" onClick={() => isAdmin && fileRef.current?.click()}>
            {group.groupPic
              ? <img src={group.groupPic} alt="" />
              : <span>{group.name[0].toUpperCase()}</span>
            }
            {isAdmin && <div className="gi-avatar-overlay">📷</div>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleSaveInfo} />

          {isAdmin ? (
            <input className="gi-name-input" value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleSaveInfo} />
          ) : (
            <h2 className="gi-name">{group.name}</h2>
          )}
          <p className="gi-count">{group.members.length}/{group.maxMembers} members</p>
        </div>

        <div className="pm-tabs">
          <button className={`pm-tab ${tab === "members" ? "active" : ""}`} onClick={() => setTab("members")}>Members</button>
          {isAdmin && <button className={`pm-tab ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>Settings</button>}
          <button className={`pm-tab ${tab === "link" ? "active" : ""}`} onClick={() => setTab("link")}>Invite</button>
        </div>

        <div className="gi-body">
          {tab === "members" && (
            <>
              {isAdmin && (
                <div className="gi-add-row">
                  <input
                    className="gi-add-input"
                    placeholder="Add by username..."
                    value={addUsername}
                    onChange={e => setAddUsername(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddMember()}
                  />
                  <button className="gi-add-btn" onClick={handleAddMember} disabled={adding}>
                    {adding ? "..." : "+ Add"}
                  </button>
                </div>
              )}
              {addError && <p className="gi-error">{addError}</p>}

              <div className="gi-members">
                {group.members.map(m => (
                  <div key={m.username} className="gi-member-row">
                    <div className="pm-user-av">
                      {m.user?.profilePic
                        ? <img src={m.user.profilePic} alt="" />
                        : m.username[0].toUpperCase()
                      }
                    </div>
                    <div className="gi-member-info">
                      <span className="gi-member-name">@{m.username}</span>
                      {m.role === "admin" && <span className="admin-badge-sm">Admin</span>}
                    </div>
                    {isAdmin && m.username !== currentUser.username && (
                      <div className="gi-member-actions">
                        <button
                          className={`gi-action-btn ${m.role === "admin" ? "demote" : "promote"}`}
                          onClick={() => handleMakeAdmin(m.username)}
                          title={m.role === "admin" ? "Remove admin" : "Make admin"}
                        >
                          {m.role === "admin" ? "👑 Remove" : "👑 Admin"}
                        </button>
                        <button className="gi-action-btn remove" onClick={() => handleRemove(m.username)}>
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button className="gi-leave-btn" onClick={handleLeave}>
                🚪 Leave Group
              </button>
            </>
          )}

          {tab === "settings" && isAdmin && (
            <div className="gi-settings">
              <label className="pm-label">GROUP NAME</label>
              <input className="gi-settings-input" value={editName} onChange={e => setEditName(e.target.value)} />
              <label className="pm-label" style={{marginTop:"12px"}}>DESCRIPTION</label>
              <textarea className="gi-settings-textarea" value={editDesc} onChange={e => setEditDesc(e.target.value)} maxLength={200} />
              <button className="pm-save" onClick={handleSaveInfo} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {tab === "link" && (
            <div className="gi-link-tab">
              <div className="gi-link-box">
                <span className="gi-link-url">{inviteUrl}</span>
              </div>
              <div className="gi-link-actions">
                <button className="gi-copy-btn" onClick={handleCopyLink}>
                  {copied ? "✅ Copied!" : "📋 Copy Link"}
                </button>
                {isAdmin && (
                  <button className="gi-regen-btn" onClick={handleRegenLink}>
                    🔄 New Link
                  </button>
                )}
              </div>
              <p className="gi-link-note">
                Anyone with this link can join the group (up to {group.maxMembers} members)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}