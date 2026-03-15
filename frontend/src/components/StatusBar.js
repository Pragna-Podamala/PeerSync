import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import "./StatusBar.css";

const PRIVACY_OPTIONS = [
  { value: "everyone",     label: "🌐 Everyone",      sub: "All your followers can see" },
  { value: "closeFriends", label: "👥 Close Friends", sub: "Only selected followers" },
  { value: "nobody",       label: "🚫 Only Me",       sub: "Nobody else can see" },
];

export default function StatusBar({ currentUser, onViewProfile }) {
  const [statuses, setStatuses] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [viewIndex, setViewIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewType, setPreviewType] = useState("");
  const [choiceFor, setChoiceFor] = useState(null);
  const [privacy, setPrivacy] = useState("everyone");
  const [closeFriends, setCloseFriends] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [showMyStatuses, setShowMyStatuses] = useState(false);
  const [duration, setDuration] = useState(24); // hours, default 24
  const [showViewers, setShowViewers] = useState(null);
  const [myStatuses, setMyStatuses] = useState([]);

  const fileRef = useRef();
  const timerRef = useRef();

  useEffect(() => { fetchStatuses(); fetchFollowers(); }, []);

  const fetchStatuses = async () => {
    try {
      const res = await API.get("/status");
      const grouped = {};
      res.data.forEach(s => {
        const uid = s.user._id;
        if (!grouped[uid]) grouped[uid] = { user: s.user, items: [] };
        grouped[uid].items.push(s);
      });
      setStatuses(Object.values(grouped));
    } catch (err) { console.log(err); }
  };

  const fetchFollowers = async () => {
    try {
      const res = await API.get(`/users/${currentUser.username}`);
      setFollowers(res.data.followers || []);
    } catch (err) { console.log(err); }
  };

  const fetchMyStatuses = async () => {
    try {
      const res = await API.get("/status/mine");
      setMyStatuses(res.data);
    } catch (err) { console.log(err); }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview({ file, url });
    setPreviewType(file.type.startsWith("video") ? "video" : "image");
    setShowUpload(true);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("media", preview.file);
    fd.append("caption", caption);
    fd.append("privacy", privacy);
    fd.append("closeFriends", JSON.stringify(closeFriends));
    fd.append("duration", duration);
    try {
      await API.post("/status", fd);
      setShowUpload(false);
      setPreview(null);
      setCaption("");
      setPrivacy("everyone");
      setCloseFriends([]);
      fetchStatuses();
    } catch (err) { console.log(err); }
    setUploading(false);
  };

  const handleDeleteStatus = async (id) => {
    try {
      await API.delete(`/status/${id}`);
      setMyStatuses(prev => prev.filter(s => s._id !== id));
      fetchStatuses();
    } catch (err) { console.log(err); }
  };

  const handleUpdatePrivacy = async (id, newPrivacy) => {
    try {
      await API.put(`/status/${id}/privacy`, { privacy: newPrivacy, closeFriends: [] });
      setMyStatuses(prev => prev.map(s => s._id === id ? { ...s, privacy: newPrivacy } : s));
    } catch (err) { console.log(err); }
  };

  const openStatus = (groupIndex) => {
    setViewing(groupIndex);
    setViewIndex(0);
    setChoiceFor(null);
    const group = statuses[groupIndex];
    if (group) API.post(`/status/${group.items[0]._id}/view`).catch(() => {});
  };

  const nextStatus = () => {
    const group = statuses[viewing];
    if (!group) return;
    if (viewIndex < group.items.length - 1) {
      const next = viewIndex + 1;
      setViewIndex(next);
      API.post(`/status/${group.items[next]._id}/view`).catch(() => {});
    } else if (viewing < statuses.length - 1) {
      setViewing(viewing + 1); setViewIndex(0);
    } else {
      setViewing(null);
    }
  };

  const prevStatus = () => {
    if (viewIndex > 0) setViewIndex(viewIndex - 1);
    else if (viewing > 0) { setViewing(viewing - 1); setViewIndex(0); }
  };

  useEffect(() => {
    if (viewing === null) return;
    const group = statuses[viewing];
    if (!group) return;
    const item = group.items[viewIndex];
    if (item?.mediaType === "image") {
      timerRef.current = setTimeout(nextStatus, 5000);
    }
    return () => clearTimeout(timerRef.current);
  }, [viewing, viewIndex]);

  const toggleCloseFriend = (username) => {
    setCloseFriends(prev =>
      prev.includes(username) ? prev.filter(u => u !== username) : [...prev, username]
    );
  };

  const myGroup = statuses.find(g => g.user.username === currentUser.username);
  const myGroupIndex = statuses.findIndex(g => g.user.username === currentUser.username);
  const hasMyStatus = !!myGroup;
  const viewingGroup = viewing !== null ? statuses[viewing] : null;
  const viewingItem = viewingGroup ? viewingGroup.items[viewIndex] : null;

  return (
    <>
      <div className="status-bar">
        {/* My Status */}
        <div className="status-item"
          onClick={() => hasMyStatus ? openStatus(myGroupIndex) : fileRef.current.click()}>
          <div className={`status-avatar ${hasMyStatus ? "has-status my-status" : "add-status"}`}>
            {currentUser.profilePic
              ? <img src={currentUser.profilePic} alt="" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0,borderRadius:"50%"}} />
              : <span>{(currentUser?.username?.[0] || "?").toUpperCase()}</span>
            }
          </div>
          <div className="status-add-overlay"
            onClick={e => { e.stopPropagation(); fileRef.current.click(); }}>+</div>
          <span className="status-name">My Status</span>
          {hasMyStatus && <span className="status-count-badge">{myGroup.items.length}</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleFileSelect} />

        {/* Manage */}
        {hasMyStatus && (
          <div className="status-item" onClick={() => { fetchMyStatuses(); setShowMyStatuses(true); }}>
            <div className="status-avatar manage-status">
              <span style={{fontSize:"22px"}}>📋</span>
            </div>
            <span className="status-name">Manage</span>
          </div>
        )}

        {/* Others */}
        {statuses.map((group, i) => {
          if (group.user.username === currentUser.username) return null;
          return (
            <div key={group.user._id} className="status-item"
              onClick={() => setChoiceFor({ group, index: i })}>
              <div className="status-avatar has-status">
                {group.user.profilePic
                  ? <img src={group.user.profilePic} alt="" style={{width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0,borderRadius:"50%"}} />
                  : (group?.user?.username?.[0] || "?").toUpperCase()
                }
              </div>
              <span className="status-name">{group.user.username}</span>
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      {showUpload && preview && (
        <div className="status-upload-overlay" onClick={() => setShowUpload(false)}>
          <div className="status-upload-modal" onClick={e => e.stopPropagation()}>
            <button className="pm-close" onClick={() => { setShowUpload(false); setPreview(null); }}>✕</button>
            <h3 className="upload-title">Add Status</h3>
            {previewType === "video"
              ? <video src={preview.url} className="upload-preview" controls />
              : <img src={preview.url} alt="" className="upload-preview" />
            }
            <input className="caption-input" placeholder="Add a caption..."
              value={caption} onChange={e => setCaption(e.target.value)} />
            <div className="privacy-section">
              <label className="privacy-label">👁️ Who can see this?</label>
              <div className="privacy-options">
                {PRIVACY_OPTIONS.map(opt => (
                  <button key={opt.value}
                    className={`privacy-opt ${privacy === opt.value ? "selected" : ""}`}
                    onClick={() => setPrivacy(opt.value)}>
                    <span className="privacy-opt-label">{opt.label}</span>
                    <span className="privacy-opt-sub">{opt.sub}</span>
                  </button>
                ))}
              </div>
              {privacy === "closeFriends" && (
                <div className="cf-picker">
                  <p className="cf-label">Select followers who can see:</p>
                  {followers.length === 0
                    ? <p className="cf-empty">No followers yet</p>
                    : followers.map(f => (
                      <div key={f._id}
                        className={`cf-row ${closeFriends.includes(f.username) ? "selected" : ""}`}
                        onClick={() => toggleCloseFriend(f.username)}>
                        <div className="cf-avatar">
                          {f.profilePic ? <img src={f.profilePic} alt="" /> : f.username[0].toUpperCase()}
                        </div>
                        <span className="cf-name">@{f.username}</span>
                        <div className={`cf-check ${closeFriends.includes(f.username) ? "on" : ""}`}>
                          {closeFriends.includes(f.username) && "✓"}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            {/* Duration picker */}
            <div className="privacy-section">
              <label className="privacy-label">⏱️ How long should this last?</label>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                {[1,3,6,12,24].map(h => (
                  <button key={h}
                    onClick={() => setDuration(h)}
                    style={{
                      padding:"7px 14px", borderRadius:"20px", border:"1.5px solid",
                      borderColor: duration === h ? "var(--accent)" : "var(--border2)",
                      background: duration === h ? "rgba(139,92,246,0.12)" : "var(--bg3)",
                      color: duration === h ? "var(--accent)" : "var(--text2)",
                      fontWeight: duration === h ? "700" : "500",
                      fontSize:"13px", cursor:"pointer",
                    }}>
                    {h === 24 ? "24h (default)" : `${h}h`}
                  </button>
                ))}
              </div>
            </div>

            <button className="pm-save" onClick={handleUpload}
              disabled={uploading || (privacy === "closeFriends" && closeFriends.length === 0)}>
              {uploading ? "Uploading..." : `Share Status (${duration}h)`}
            </button>
            {privacy === "closeFriends" && closeFriends.length === 0 && (
              <p className="cf-warn">Select at least 1 person</p>
            )}
          </div>
        </div>
      )}

      {/* My Statuses modal */}
      {showMyStatuses && (
        <div className="status-upload-overlay" onClick={() => setShowMyStatuses(false)}>
          <div className="status-upload-modal my-statuses-modal" onClick={e => e.stopPropagation()}>
            <button className="pm-close" onClick={() => setShowMyStatuses(false)}>✕</button>
            <h3 className="upload-title">📸 My Statuses</h3>
            <p className="my-statuses-sub">Your active status updates</p>
            {myStatuses.length === 0 ? (
              <div className="my-statuses-empty">
                <div className="my-statuses-empty-icon">📷</div>
                <p>No active statuses</p>
                <button className="pm-save" style={{marginTop:"8px"}}
                  onClick={() => { setShowMyStatuses(false); fileRef.current.click(); }}>
                  + Add Status
                </button>
              </div>
            ) : myStatuses.map(s => (
              <div key={s._id} className="my-status-card">
                <div className="my-status-card-thumb" onClick={() => {
                  const idx = statuses.findIndex(g => g.user.username === currentUser.username);
                  if (idx !== -1) { openStatus(idx); setShowMyStatuses(false); }
                }}>
                  {s.mediaType === "video"
                    ? <video src={s.mediaUrl} className="my-status-card-media" />
                    : <img src={s.mediaUrl} alt="" className="my-status-card-media" />
                  }
                  <div className="my-status-card-play">▶</div>
                </div>
                <div className="my-status-card-info">
                  <div className="my-status-card-privacy">
                    {s.privacy === "everyone" ? "🌐 Everyone" : s.privacy === "closeFriends" ? "👥 Close Friends" : "🚫 Only Me"}
                  </div>
                  <div className="my-status-card-viewers"
                    style={{cursor:"pointer",color:"var(--accent)",fontWeight:"600"}}
                    onClick={() => setShowViewers(showViewers === s._id ? null : s._id)}>
                    👁️ {s.viewers?.length || 0} view{s.viewers?.length !== 1 ? "s" : ""}
                    {showViewers === s._id ? " ▲" : " ▼"}
                  </div>
                  {showViewers === s._id && (
                    <div style={{marginTop:"6px",display:"flex",flexDirection:"column",gap:"4px"}}>
                      {!s.viewers || s.viewers.length === 0
                        ? <span style={{fontSize:"12px",color:"var(--text3)"}}>No views yet</span>
                        : s.viewers.map((v, i) => (
                          <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"6px 8px",background:"var(--bg3)",borderRadius:"10px"}}>
                            <div style={{width:"28px",height:"28px",borderRadius:"50%",background:"linear-gradient(135deg,var(--accent),var(--teal))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:"700",color:"#fff",overflow:"hidden",flexShrink:0}}>
                              {v.profilePic ? <img src={v.profilePic} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} /> : (v.username?.[0] || "?").toUpperCase()}
                            </div>
                            <span style={{fontSize:"13px",fontWeight:"500",color:"var(--text)"}}>@{v.username || "Unknown"}</span>
                          </div>
                        ))
                      }
                    </div>
                  )}
                  {s.caption && <div className="my-status-card-caption">"{s.caption}"</div>}
                  <div className="my-status-card-time">
                    {new Date(s.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {" · Expires "}
                    {new Date(s.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                <div className="my-status-card-actions">
                  <select className="my-status-privacy-select" value={s.privacy}
                    onChange={e => handleUpdatePrivacy(s._id, e.target.value)}>
                    <option value="everyone">🌐 Everyone</option>
                    <option value="closeFriends">👥 Close Friends</option>
                    <option value="nobody">🚫 Only Me</option>
                  </select>
                  <button className="my-status-card-delete" onClick={() => handleDeleteStatus(s._id)}>
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
            <button className="my-statuses-add-btn"
              onClick={() => { setShowMyStatuses(false); fileRef.current.click(); }}>
              + Add New Status
            </button>
          </div>
        </div>
      )}

      {/* Choice popup */}
      {choiceFor && (
        <div className="status-choice-overlay" onClick={() => setChoiceFor(null)}>
          <div className="status-choice-modal" onClick={e => e.stopPropagation()}>
            <div className="status-choice-avatar">
              {choiceFor.group.user.profilePic
                ? <img src={choiceFor.group.user.profilePic} alt="" />
                : (choiceFor?.group?.user?.username?.[0] || "?").toUpperCase()
              }
            </div>
            <h3 className="status-choice-name">@{choiceFor.group.user.username}</h3>
            <p className="status-choice-sub">What would you like to view?</p>
            <div className="status-choice-btns">
              <button className="status-choice-btn" onClick={() => openStatus(choiceFor.index)}>
                <span className="choice-icon">📸</span>
                <div>
                  <div className="choice-label">View Status</div>
                  <div className="choice-sub">{choiceFor.group.items.length} update{choiceFor.group.items.length > 1 ? "s" : ""}</div>
                </div>
              </button>
              <button className="status-choice-btn"
                onClick={() => { setChoiceFor(null); onViewProfile && onViewProfile(choiceFor.group.user.username); }}>
                <span className="choice-icon">👤</span>
                <div>
                  <div className="choice-label">View Profile</div>
                  <div className="choice-sub">See their full profile</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status viewer */}
      {viewing !== null && viewingItem && (
        <div className="status-viewer" onClick={nextStatus}>
          <div className="status-progress-bars">
            {viewingGroup.items.map((_, i) => (
              <div key={i} className={`progress-bar ${i < viewIndex ? "done" : i === viewIndex ? "active" : ""}`} />
            ))}
          </div>
          <div className="status-viewer-header" onClick={e => e.stopPropagation()}>
            <div className="sv-avatar">
              {viewingGroup.user.profilePic
                ? <img src={viewingGroup.user.profilePic} alt="" />
                : (viewingGroup?.user?.username?.[0] || "?").toUpperCase()
              }
            </div>
            <div className="sv-info">
              <span className="sv-name">{viewingGroup.user.username}</span>
              <span className="sv-time">
                {new Date(viewingItem.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <button className="sv-close" onClick={() => setViewing(null)}>✕</button>
          </div>
          <div className="sv-media-wrap">
            {viewingItem.mediaType === "video"
              ? <video src={viewingItem.mediaUrl} className="sv-media" autoPlay loop onClick={e => e.stopPropagation()} />
              : <img src={viewingItem.mediaUrl} alt="" className="sv-media" />
            }
          </div>
          {viewingGroup.user.username === currentUser.username && (
            <div className="sv-viewers" onClick={e => e.stopPropagation()}>
              👁️ {viewingItem.viewers?.length || 0} view{viewingItem.viewers?.length !== 1 ? "s" : ""}
            </div>
          )}
          {viewingItem.caption && (
            <div className="sv-caption" onClick={e => e.stopPropagation()}>{viewingItem.caption}</div>
          )}
          <div className="sv-nav-left" onClick={e => { e.stopPropagation(); prevStatus(); }} />
          <div className="sv-nav-right" onClick={e => { e.stopPropagation(); nextStatus(); }} />
        </div>
      )}
    </>
  );
}