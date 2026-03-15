import { useState, useEffect } from "react";
import API from "../services/api";
import "./UserProfileModal.css";

export default function UserProfileModal({ targetUsername, currentUser, onClose }) {
  const [user, setUser] = useState(null);
  const [followStatus, setFollowStatus] = useState("none");
  const [isBlocked, setIsBlocked] = useState(false);
  const [tab, setTab] = useState("followers");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [targetRes, meRes] = await Promise.all([
        API.get(`/users/${targetUsername}`),
        API.get(`/users/${currentUser.username}`),
      ]);
      setUser(targetRes.data);
      const me = meRes.data;
      const isFollowing = me.following?.some(f => f._id === targetRes.data._id || f === targetRes.data._id);
      const isRequested = me.sentRequests?.some(r => r._id === targetRes.data._id || r === targetRes.data._id);
      const blocked = me.blockedUsers?.some(b => b === targetRes.data._id || b._id === targetRes.data._id);
      setFollowStatus(isFollowing ? "following" : isRequested ? "requested" : "none");
      setIsBlocked(blocked);
    } catch (err) { console.log(err); }
    setLoading(false);
  };

  const handleFollow = async () => {
    setActing(true);
    try {
      if (followStatus === "following" || followStatus === "requested") {
        await API.post(`/users/${targetUsername}/unfollow`);
        setFollowStatus("none");
        setUser(u => ({ ...u, followers: u.followers?.filter(f => f.username !== currentUser.username) }));
      } else {
        const res = await API.post(`/users/${targetUsername}/follow`);
        setFollowStatus(res.data.status);
        if (res.data.status === "following") {
          setUser(u => ({ ...u, followers: [...(u.followers || []), { username: currentUser.username }] }));
        }
      }
    } catch (err) { console.log(err); }
    setActing(false);
  };

  const handleBlock = async () => {
    if (!window.confirm(`${isBlocked ? "Unblock" : "Block"} @${targetUsername}?`)) return;
    setActing(true);
    try {
      if (isBlocked) {
        await API.post(`/users/${targetUsername}/unblock`);
        setIsBlocked(false);
      } else {
        await API.post(`/users/${targetUsername}/block`);
        setIsBlocked(true);
        setFollowStatus("none");
      }
    } catch (err) { console.log(err); }
    setActing(false);
  };

  const followBtnLabel = () => {
    if (followStatus === "following") return "✓ Following";
    if (followStatus === "requested") return "⏳ Requested";
    return "+ Follow";
  };

  // List is locked for private accounts unless you follow them
  const canSeeList = !user?.isPrivate || followStatus === "following";

  if (loading) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="upm-modal"><div className="upm-loading">Loading...</div></div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="upm-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>

        <div className="upm-top">
          <div className="upm-avatar">
            {user?.profilePic
              ? <img src={user.profilePic} alt="" />
              : <span>{user?.username?.[0]?.toUpperCase()}</span>
            }
          </div>
          <h2 className="upm-uname">@{user?.username}</h2>
          <div className="upm-privacy">{user?.isPrivate ? "🔒 Private" : "🌐 Public"}</div>
          {user?.bio && <p className="upm-bio">{user.bio}</p>}

          <div className="pm-stats" style={{ marginBottom: "14px" }}>
            <div className="pm-stat" onClick={() => setTab("followers")}>
              <span className="pm-stat-n">{user?.followers?.length || 0}</span>
              <span className="pm-stat-l">Followers</span>
            </div>
            <div className="pm-divider" />
            <div className="pm-stat" onClick={() => setTab("following")}>
              <span className="pm-stat-n">{user?.following?.length || 0}</span>
              <span className="pm-stat-l">Following</span>
            </div>
          </div>

          <div className="upm-actions">
            <button
              className={`upm-follow-btn ${followStatus !== "none" ? "active" : ""}`}
              onClick={handleFollow}
              disabled={acting || isBlocked}
            >
              {followBtnLabel()}
            </button>
            <button
              className={`upm-block-btn ${isBlocked ? "blocked" : ""}`}
              onClick={handleBlock}
              disabled={acting}
            >
              {isBlocked ? "Unblock" : "Block"}
            </button>
          </div>

          {user?.isPrivate && followStatus !== "following" && (
            <p className="upm-private-note">🔒 This account is private. Follow to see their content.</p>
          )}
        </div>

        <div className="pm-tabs">
          <button className={`pm-tab ${tab === "followers" ? "active" : ""}`} onClick={() => setTab("followers")}>Followers</button>
          <button className={`pm-tab ${tab === "following" ? "active" : ""}`} onClick={() => setTab("following")}>Following</button>
        </div>

        <div className="pm-body">
          <div className="pm-user-list">
            {!canSeeList ? (
              <div className="pm-locked">
                <div className="pm-locked-icon">🔒</div>
                <p className="pm-locked-title">This account is private</p>
                <p className="pm-locked-sub">Follow @{user?.username} to see their followers and following list</p>
              </div>
            ) : (tab === "followers" ? user?.followers : user?.following)?.length === 0 ? (
              <p className="pm-empty">{tab === "followers" ? "No followers yet" : "Not following anyone"}</p>
            ) : (
              (tab === "followers" ? user?.followers : user?.following)?.map((u, i) => (
                <div key={u._id || i} className="pm-user-row">
                  <div className="pm-user-av">
                    {u.profilePic ? <img src={u.profilePic} alt="" /> : u.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="pm-user-name">@{u.username}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}