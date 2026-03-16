import { useState, useRef, useEffect } from "react";
import API from "../services/api";
import { useTheme } from "../context/ThemeContext";
import PrivacyPicker from "./PrivacyPicker";
import "./ProfileModal.css";

export default function ProfileModal({ currentUser, onClose, onProfileUpdate, onLogout }) {
  const [tab, setTab] = useState("profile");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [profilePic, setProfilePic] = useState(currentUser?.profilePic || "");
  const [isPrivate, setIsPrivate] = useState(currentUser?.isPrivate || false);
  const [settings, setSettings] = useState(currentUser?.settings || {
    showReadReceipts: true,
    profilePicPrivacy: "everyone",
    lastSeenPrivacy: "everyone",
    onlinePrivacy: "everyone",
  });
  const [notifSettings, setNotifSettings] = useState(currentUser?.notificationSettings || {
    sound: true, pushEnabled: true, dndEnabled: false, dndStart: "22:00", dndEnd: "08:00"
  });
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [requests, setRequests] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [securityTab, setSecurityTab] = useState("password");
  const [sessions, setSessions] = useState([]);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [deletePwd, setDeletePwd] = useState("");
  const [secMsg, setSecMsg] = useState({ text: "", type: "" });
  const [notifSaved, setNotifSaved] = useState(false);
  const [mobileView, setMobileView] = useState("sidebar"); // "sidebar" or "content" 

  const fileRef = useRef();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await API.get(`/users/${currentUser.username}`);
      setFollowers(res.data.followers || []);
      setFollowing(res.data.following || []);
      setRequests(res.data.followRequests || []);
      setBlocked(res.data.blockedUsers || []);
      setProfilePic(res.data.profilePic || "");
      setBio(res.data.bio || "");
      setIsPrivate(res.data.isPrivate || false);
      if (res.data.settings) setSettings(res.data.settings);
      if (res.data.notificationSettings) setNotifSettings(res.data.notificationSettings);
    } catch (err) { console.log(err); }
  };

  const fetchSessions = async () => {
    try { const res = await API.get("/users/me/sessions"); setSessions(res.data); } catch {}
  };

  const handlePicUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("profilePic", file);
    try {
      const res = await API.post("/users/me/pic", fd);
      setProfilePic(res.data.profilePic);
      onProfileUpdate?.({ ...currentUser, profilePic: res.data.profilePic });
    } catch {}
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put("/users/me/profile", { bio, isPrivate });
      onProfileUpdate?.({ ...currentUser, bio, isPrivate });
    } catch {}
    setSaving(false);
  };

  const handleToggle = async (key) => {
    const newVal = !settings[key];
    const newSettings = { ...settings, [key]: newVal };
    setSettings(newSettings);
    try { await API.put("/users/me/settings", { [key]: newVal }); } catch {}
  };

  const handlePrivacyChange = async (key, cfKey, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try { await API.put("/users/me/settings", { [key]: value }); } catch {}
  };

  const handleSaveNotif = async () => {
    try {
      await API.put("/users/me/settings", notifSettings);
      onProfileUpdate?.({ ...currentUser, notificationSettings: notifSettings });
      setNotifSaved(true); setTimeout(() => setNotifSaved(false), 2000);
    } catch {}
  };

  const handleAccept = async (username) => {
    setRequests(r => r.filter(u => u.username !== username));
    try { await API.post(`/users/${username}/accept`); fetchData(); } catch (err) {
      fetchData();
    }
  };
  const handleDecline = async (username) => {
    try { await API.post(`/users/${username}/decline`); setRequests(r => r.filter(u => u.username !== username)); } catch {}
  };
  const handleUnblock = async (username) => {
    try { await API.post(`/users/${username}/unblock`); setBlocked(b => b.filter(u => (u.username || u) !== username)); } catch {}
  };
  const handleUnfollow = async (username) => {
    setFollowing(f => f.filter(u => u.username !== username));
    try { await API.post(`/users/${username}/unfollow`); } catch {}
  };
  const handleRemoveFollower = async (username) => {
    setFollowers(f => f.filter(u => u.username !== username));
    try { await API.post(`/users/${username}/remove-follower`); } catch {}
  };

  const handleChangePwd = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) return setSecMsg({ text: "Fill all fields", type: "error" });
    if (newPwd !== confirmPwd) return setSecMsg({ text: "Passwords don't match", type: "error" });
    if (newPwd.length < 6) return setSecMsg({ text: "Min 6 characters", type: "error" });
    try {
      await API.post("/users/me/change-password", { currentPassword: currentPwd, newPassword: newPwd });
      setSecMsg({ text: "✅ Password changed!", type: "success" });
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) { setSecMsg({ text: err.response?.data?.message || "Failed", type: "error" }); }
    setTimeout(() => setSecMsg({ text: "", type: "" }), 3000);
  };

  const handleDeleteAccount = async () => {
    if (!deletePwd) return setSecMsg({ text: "Enter your password", type: "error" });
    if (!window.confirm("⚠️ Permanently delete your account?")) return;
    try { await API.post("/users/me/delete-account", { password: deletePwd }); onLogout?.(); }
    catch (err) { setSecMsg({ text: err.response?.data?.message || "Failed", type: "error" }); }
  };

  const navItems = [
    { id: "profile",   icon: "👤", label: "Profile" },
    { id: "followers", icon: "👥", label: "Followers", badge: followers.length || null },
    { id: "following", icon: "➕", label: "Following", badge: following.length || null },
    { id: "requests",  icon: "📩", label: "Requests",  badge: requests.length || null },
    { id: "blocked",   icon: "🚫", label: "Blocked",   badge: blocked.length || null },
    null, // divider
    { id: "privacy",       icon: "🔏", label: "Privacy" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
    { id: "security",      icon: "🔐", label: "Security" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>

        {/* Left sidebar */}
        <div className={`pm-sidebar${mobileView === "content" ? " pm-hide-mobile" : ""}`}>
          <div className="pm-profile-header">
            <div className="pm-avatar-wrap" onClick={() => fileRef.current.click()}>
              {profilePic
                ? <img src={profilePic} alt="" className="pm-avatar-img" />
                : <div className="pm-avatar-letter">{currentUser?.username?.[0]?.toUpperCase()}</div>
              }
              <div className="pm-avatar-hover">{uploading ? "⏳" : "📷"}</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePicUpload} />
            <h2 className="pm-uname">@{currentUser?.username}</h2>
            <div className="pm-privacy-badge">{isPrivate ? "🔒 Private" : "🌐 Public"}</div>
            <div className="pm-stats">
              <div className="pm-stat" onClick={() => setTab("followers")}>
                <span className="pm-stat-n">{followers.length}</span>
                <span className="pm-stat-l">Followers</span>
              </div>
              <div className="pm-divider" />
              <div className="pm-stat" onClick={() => setTab("following")}>
                <span className="pm-stat-n">{following.length}</span>
                <span className="pm-stat-l">Following</span>
              </div>
            </div>
          </div>

          <div className="pm-nav">
            {navItems.map((item, i) =>
              item === null ? (
                <div key={i} className="pm-nav-section">SETTINGS</div>
              ) : (
                <button key={item.id}
                  className={`pm-nav-item ${tab === item.id ? "active" : ""}`}
                  onClick={() => { setTab(item.id); if (item.id === "security") fetchSessions(); setMobileView("content"); }}>
                  <span className="pm-nav-icon">{item.icon}</span>
                  <span className="pm-nav-label">{item.label}</span>
                  {item.badge > 0 && <span className="pm-nav-badge">{item.badge}</span>}
                </button>
              )
            )}
          </div>
        </div>

        {/* Right content */}
        <div className={`pm-content${mobileView === "sidebar" ? " pm-hide-mobile" : ""}`}>
          <button className="pm-back-btn" onClick={() => setMobileView("sidebar")}>← Back</button>
          {/* Mobile back button */}
          <button className="pm-mobile-back" onClick={() => setTab("profile")} style={{
            display:"none", alignItems:"center", gap:"6px",
            background:"none", border:"none", color:"var(--accent)",
            fontSize:"13px", fontWeight:"600", cursor:"pointer",
            marginBottom:"12px", padding:"0"
          }}>← Back</button>

          {/* Profile */}
          {tab === "profile" && <>
            <div>
              <h2 className="pm-section-title">Your Profile</h2>
              <p className="pm-section-sub">Update your bio and appearance</p>
            </div>
            <div>
              <label className="pm-label">BIO</label>
              <textarea className="pm-bio" placeholder="Write something about yourself..."
                value={bio} onChange={e => setBio(e.target.value)} maxLength={150} />
              <span className="pm-count">{bio.length}/150</span>
            </div>
            <div className="pm-toggle-row">
              <div>
                <div className="pm-toggle-title">{isPrivate ? "🔒 Private Account" : "🌐 Public Account"}</div>
                <div className="pm-toggle-sub">{isPrivate ? "Only approved followers can follow you" : "Anyone can follow you"}</div>
              </div>
              <button className={`toggle-btn ${isPrivate ? "on" : ""}`} onClick={() => setIsPrivate(!isPrivate)}>
                <span className="toggle-thumb" />
              </button>
            </div>
            <div className="pm-toggle-row">
              <div>
                <div className="pm-toggle-title">{theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}</div>
                <div className="pm-toggle-sub">Switch theme</div>
              </div>
              <button className={`toggle-btn ${theme === "dark" ? "on" : ""}`} onClick={toggleTheme}>
                <span className="toggle-thumb" />
              </button>
            </div>
            <button className="pm-save" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          </>}

          {/* Followers */}
          {tab === "followers" && <>
            <div>
              <h2 className="pm-section-title">Followers</h2>
              <p className="pm-section-sub">{followers.length} people follow you</p>
            </div>
            <div className="pm-user-list">
              {followers.length === 0 ? <p className="pm-empty">No followers yet</p>
                : followers.map(u => (
                  <div key={u._id} className="pm-user-row">
                    <div className="pm-user-av">{u.profilePic ? <img src={u.profilePic} alt="" /> : u.username?.[0]?.toUpperCase()}</div>
                    <span className="pm-user-name" style={{cursor:"pointer"}} onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("openChat", {detail: u.username})); }}>@{u.username}</span>
                    <button className="pm-unblock-btn" onClick={() => handleRemoveFollower(u.username)}>Remove</button>
                  </div>
                ))
              }
            </div>
          </>}

          {/* Following */}
          {tab === "following" && <>
            <div>
              <h2 className="pm-section-title">Following</h2>
              <p className="pm-section-sub">You follow {following.length} people</p>
            </div>
            <div className="pm-user-list">
              {following.length === 0 ? <p className="pm-empty">Not following anyone yet</p>
                : following.map(u => (
                  <div key={u._id} className="pm-user-row">
                    <div className="pm-user-av">{u.profilePic ? <img src={u.profilePic} alt="" /> : u.username?.[0]?.toUpperCase()}</div>
                    <span className="pm-user-name" style={{cursor:"pointer"}} onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("openChat", {detail: u.username})); }}>@{u.username}</span>
                    <button className="decline-btn" onClick={() => handleUnfollow(u.username)}>Unfollow</button>
                  </div>
                ))
              }
            </div>
          </>}

          {/* Requests */}
          {tab === "requests" && <>
            <div>
              <h2 className="pm-section-title">Follow Requests</h2>
              <p className="pm-section-sub">{requests.length} pending request{requests.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="pm-user-list">
              {requests.length === 0 ? <p className="pm-empty">No pending requests</p>
                : requests.map(u => (
                  <div key={u._id} className="pm-request-row">
                    <div className="pm-user-av">{u.profilePic ? <img src={u.profilePic} alt="" /> : u.username?.[0]?.toUpperCase()}</div>
                    <span className="pm-user-name">@{u.username}</span>
                    <div className="pm-request-btns">
                      <button className="accept-btn" onClick={() => handleAccept(u.username)}>✓ Accept</button>
                      <button className="decline-btn" onClick={() => handleDecline(u.username)}>✕</button>
                    </div>
                  </div>
                ))
              }
            </div>
          </>}

          {/* Blocked */}
          {tab === "blocked" && <>
            <div>
              <h2 className="pm-section-title">Blocked Users</h2>
              <p className="pm-section-sub">People you've blocked</p>
            </div>
            <div className="pm-user-list">
              {blocked.length === 0 ? <p className="pm-empty">No blocked users</p>
                : blocked.map((u, i) => {
                  const username = u.username || u;
                  return (
                    <div key={u._id || i} className="pm-blocked-row">
                      <div className="pm-user-av">{u.profilePic ? <img src={u.profilePic} alt="" /> : (username?.[0] || "?").toUpperCase()}</div>
                      <span className="pm-user-name">@{username}</span>
                      <button className="pm-unblock-btn" onClick={() => handleUnblock(username)}>Unblock</button>
                    </div>
                  );
                })
              }
            </div>
          </>}

          {/* Privacy */}
          {tab === "privacy" && <>
            <div>
              <h2 className="pm-section-title">Privacy Settings</h2>
              <p className="pm-section-sub">Control who sees your info</p>
            </div>
            <div className="pm-toggle-row">
              <div>
                <div className="pm-toggle-title">🔵 Read Receipts</div>
                <div className="pm-toggle-sub">Show blue ticks when you read messages</div>
              </div>
              <button className={`toggle-btn ${settings.showReadReceipts ? "on" : ""}`} onClick={() => handleToggle("showReadReceipts")}>
                <span className="toggle-thumb" />
              </button>
            </div>
            <div>
              <label className="pm-label">PROFILE PICTURE</label>
              <PrivacyPicker label="Who can see your profile picture?"
                value={settings.profilePicPrivacy || "everyone"}
                onChange={v => handlePrivacyChange("profilePicPrivacy", "profilePicCloseFriends", v)}
                followers={followers} />
            </div>
            <div>
              <label className="pm-label">LAST SEEN</label>
              <PrivacyPicker label="Who can see your last seen?"
                value={settings.lastSeenPrivacy || "everyone"}
                onChange={v => handlePrivacyChange("lastSeenPrivacy", "lastSeenCloseFriends", v)}
                followers={followers} />
            </div>
            <div>
              <label className="pm-label">ONLINE STATUS</label>
              <PrivacyPicker label="Who can see when you're online?"
                value={settings.onlinePrivacy || "everyone"}
                onChange={v => handlePrivacyChange("onlinePrivacy", "onlineCloseFriends", v)}
                followers={followers} />
            </div>
          </>}

          {/* Notifications */}
          {tab === "notifications" && <>
            <div>
              <h2 className="pm-section-title">Notifications</h2>
              <p className="pm-section-sub">Manage how you get notified</p>
            </div>
            <div className="pm-toggle-row">
              <div>
                <div className="pm-toggle-title">🔊 Message Sound</div>
                <div className="pm-toggle-sub">Play sound on new messages</div>
              </div>
              <button className={`toggle-btn ${notifSettings.sound ? "on" : ""}`}
                onClick={() => setNotifSettings(p => ({ ...p, sound: !p.sound }))}>
                <span className="toggle-thumb" />
              </button>
            </div>
            <div className="pm-toggle-row">
              <div>
                <div className="pm-toggle-title">📱 Push Notifications</div>
                <div className="pm-toggle-sub">{Notification.permission === "granted" ? "✅ Enabled" : "Click to enable"}</div>
              </div>
              <button className={`toggle-btn ${notifSettings.pushEnabled && Notification.permission === "granted" ? "on" : ""}`}
                onClick={() => Notification.permission !== "granted"
                  ? Notification.requestPermission().then(p => p === "granted" && setNotifSettings(prev => ({ ...prev, pushEnabled: true })))
                  : setNotifSettings(p => ({ ...p, pushEnabled: !p.pushEnabled }))
                }>
                <span className="toggle-thumb" />
              </button>
            </div>
            <div className="pm-toggle-row">
              <div>
                <div className="pm-toggle-title">🌙 Do Not Disturb</div>
                <div className="pm-toggle-sub">Mute notifications during set hours</div>
              </div>
              <button className={`toggle-btn ${notifSettings.dndEnabled ? "on" : ""}`}
                onClick={() => setNotifSettings(p => ({ ...p, dndEnabled: !p.dndEnabled }))}>
                <span className="toggle-thumb" />
              </button>
            </div>
            {notifSettings.dndEnabled && (
              <div className="dnd-schedule">
                <div className="dnd-row">
                  <label className="dnd-label">From</label>
                  <input type="time" className="dnd-input" value={notifSettings.dndStart}
                    onChange={e => setNotifSettings(p => ({ ...p, dndStart: e.target.value }))} />
                </div>
                <div className="dnd-row">
                  <label className="dnd-label">To</label>
                  <input type="time" className="dnd-input" value={notifSettings.dndEnd}
                    onChange={e => setNotifSettings(p => ({ ...p, dndEnd: e.target.value }))} />
                </div>
              </div>
            )}
            <button className="pm-save" onClick={handleSaveNotif}>
              {notifSaved ? "✅ Saved!" : "Save Notification Settings"}
            </button>
          </>}

          {/* Security */}
          {tab === "security" && <>
            <div>
              <h2 className="pm-section-title">Security</h2>
              <p className="pm-section-sub">Password, sessions & account</p>
            </div>
            <div className="pm-sub-tabs">
              {["password","sessions","delete"].map(t => (
                <button key={t} className={`pm-sub-tab ${securityTab === t ? "active" : ""}`}
                  onClick={() => { setSecurityTab(t); if(t === "sessions") fetchSessions(); }}>
                  {t === "password" ? "🔑 Password" : t === "sessions" ? "📱 Sessions" : "🗑 Delete"}
                </button>
              ))}
            </div>
            {secMsg.text && (
              <div style={{padding:"10px 14px",borderRadius:"10px",fontSize:"13px",
                background: secMsg.type === "error" ? "rgba(224,85,85,0.1)" : "rgba(16,185,129,0.1)",
                color: secMsg.type === "error" ? "var(--danger)" : "var(--teal)"}}>
                {secMsg.text}
              </div>
            )}
            {securityTab === "password" && (
              <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                {[["Current Password", currentPwd, setCurrentPwd], ["New Password", newPwd, setNewPwd], ["Confirm New Password", confirmPwd, setConfirmPwd]].map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="pm-label">{label.toUpperCase()}</label>
                    <input type="password" className="pm-bio" style={{minHeight:"unset",padding:"11px 14px"}}
                      placeholder={label} value={val} onChange={e => setter(e.target.value)} />
                  </div>
                ))}
                <button className="pm-save" onClick={handleChangePwd}>Change Password</button>
              </div>
            )}
            {securityTab === "sessions" && (
              <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                {sessions.length === 0 ? <p className="pm-empty">No active sessions</p>
                  : sessions.map(s => (
                    <div key={s.sessionId} style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",background:"var(--bg3)",borderRadius:"14px",border:"1px solid var(--border2)"}}>
                      <span style={{fontSize:"24px"}}>📱</span>
                      <div style={{flex:1}}>
                        <div style={{fontSize:"13px",fontWeight:"600",color:"var(--text)"}}>{s.device || "Unknown device"}</div>
                        <div style={{fontSize:"11px",color:"var(--text3)"}}>{s.ip} · {new Date(s.lastActive).toLocaleDateString()}</div>
                      </div>
                      <button onClick={async () => { await API.delete(`/users/me/sessions/${s.sessionId}`); fetchSessions(); }}
                        style={{padding:"6px 12px",background:"rgba(224,85,85,0.1)",border:"1px solid rgba(224,85,85,0.2)",borderRadius:"8px",color:"var(--danger)",fontSize:"12px",fontWeight:"600",cursor:"pointer"}}>
                        Revoke
                      </button>
                    </div>
                  ))
                }
              </div>
            )}
            {securityTab === "delete" && (
              <div style={{display:"flex",flexDirection:"column",gap:"12px"}}>
                <div style={{background:"rgba(224,85,85,0.08)",border:"1px solid rgba(224,85,85,0.2)",borderRadius:"14px",padding:"20px",textAlign:"center"}}>
                  <div style={{fontSize:"36px",marginBottom:"8px"}}>⚠️</div>
                  <h3 style={{fontSize:"16px",fontWeight:"700",color:"var(--danger)",margin:"0 0 8px"}}>Delete Account</h3>
                  <p style={{fontSize:"13px",color:"var(--text2)",margin:0,lineHeight:"1.5"}}>Permanently deletes all your data. Cannot be undone.</p>
                </div>
                <input type="password" className="pm-bio" style={{minHeight:"unset",padding:"11px 14px"}}
                  placeholder="Enter your password to confirm" value={deletePwd} onChange={e => setDeletePwd(e.target.value)} />
                <button onClick={handleDeleteAccount} disabled={!deletePwd}
                  style={{padding:"13px",background:"rgba(224,85,85,0.15)",border:"1.5px solid rgba(224,85,85,0.3)",borderRadius:"14px",color:"var(--danger)",fontSize:"14px",fontWeight:"700",cursor:"pointer",opacity:deletePwd?1:0.5}}>
                  🗑 Delete My Account
                </button>
              </div>
            )}
          </>}

        </div>
      </div>
    </div>
  );
}