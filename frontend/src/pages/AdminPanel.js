import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./AdminPanel.css";

const ADMIN_USERNAME = "Pragna"; // Change to your username

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("users");
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!currentUser || currentUser.username !== ADMIN_USERNAME) {
      navigate("/");
      return;
    }
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/admin/users");
      setUsers(res.data);
    } catch {
      // fallback — use regular users endpoint
      const res = await API.get("/users");
      setUsers(res.data);
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (!newPwd || newPwd.length < 6) { setMsg("❌ Min 6 characters"); return; }
    try {
      await API.post(`/admin/reset-password`, { username: selected.username, newPassword: newPwd });
      setMsg(`✅ Password reset for @${selected.username}`);
      setNewPwd("");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.message || "Failed"));
    }
  };

  const handleDeleteUser = async (username) => {
    if (!window.confirm(`Delete account @${username}? This cannot be undone.`)) return;
    try {
      await API.delete(`/admin/users/${username}`);
      setUsers(prev => prev.filter(u => u.username !== username));
      setSelected(null);
      setMsg(`✅ @${username} deleted`);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("❌ Failed to delete");
    }
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-icon">⚡</div>
          <div>
            <div className="admin-brand-title">PeerSync Admin</div>
            <div className="admin-brand-sub">@{currentUser?.username}</div>
          </div>
        </div>

        <div className="admin-nav">
          {[
            ["👥", "Users", "users"],
            ["📊", "Stats", "stats"],
          ].map(([icon, label, id]) => (
            <button key={id} className={`admin-nav-btn ${tab === id ? "active" : ""}`}
              onClick={() => setTab(id)}>
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        <button className="admin-back-btn" onClick={() => navigate("/")}>
          ← Back to PeerSync
        </button>
      </div>

      {/* Main content */}
      <div className="admin-main">
        {tab === "users" && (
          <>
            <div className="admin-header">
              <div>
                <h1 className="admin-title">All Users</h1>
                <p className="admin-sub">{users.length} registered accounts</p>
              </div>
              <input className="admin-search" placeholder="🔍 Search users..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {msg && (
              <div className={`admin-msg ${msg.startsWith("✅") ? "success" : "error"}`}>
                {msg}
              </div>
            )}

            <div className="admin-content">
              {/* Users table */}
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Email</th>
                      <th>Type</th>
                      <th>Followers</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" style={{textAlign:"center",padding:"32px",color:"#9ca3af"}}>Loading...</td></tr>
                    ) : filtered.map(u => (
                      <tr key={u._id} className={selected?._id === u._id ? "selected" : ""}
                        onClick={() => setSelected(u)}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-user-av">
                              {u.profilePic
                                ? <img src={u.profilePic} alt="" />
                                : u.username?.[0]?.toUpperCase()
                              }
                            </div>
                            <div>
                              <div className="admin-user-name">@{u.username}</div>
                              {u.isVerified && <span className="admin-verified">✓ Verified</span>}
                            </div>
                          </div>
                        </td>
                        <td className="admin-email">{u.email}</td>
                        <td>
                          <span className={`admin-badge ${u.isPrivate ? "private" : "public"}`}>
                            {u.isPrivate ? "🔒 Private" : "🌐 Public"}
                          </span>
                        </td>
                        <td className="admin-count">{u.followers?.length || 0}</td>
                        <td>
                          <button className="admin-del-btn"
                            onClick={e => { e.stopPropagation(); handleDeleteUser(u.username); }}>
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Selected user panel */}
              {selected && (
                <div className="admin-user-panel">
                  <h3 className="admin-panel-title">@{selected.username}</h3>
                  <div className="admin-panel-av">
                    {selected.profilePic
                      ? <img src={selected.profilePic} alt="" />
                      : selected.username?.[0]?.toUpperCase()
                    }
                  </div>
                  <div className="admin-panel-info">
                    <div className="admin-info-row"><span>📧 Email</span><span>{selected.email}</span></div>
                    <div className="admin-info-row"><span>👥 Followers</span><span>{selected.followers?.length || 0}</span></div>
                    <div className="admin-info-row"><span>➕ Following</span><span>{selected.following?.length || 0}</span></div>
                    <div className="admin-info-row"><span>🔒 Account</span><span>{selected.isPrivate ? "Private" : "Public"}</span></div>
                    <div className="admin-info-row"><span>✓ Verified</span><span>{selected.isVerified ? "Yes" : "No"}</span></div>
                  </div>

                  <div className="admin-reset-section">
                    <label className="admin-reset-label">🔑 Reset Password</label>
                    <input className="admin-reset-input" type="password"
                      placeholder="New password (min 6 chars)"
                      value={newPwd} onChange={e => setNewPwd(e.target.value)} />
                    <button className="admin-reset-btn" onClick={handleResetPassword}>
                      Reset Password
                    </button>
                  </div>

                  <button className="admin-delete-user-btn"
                    onClick={() => handleDeleteUser(selected.username)}>
                    🗑 Delete This Account
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "stats" && (
          <div className="admin-stats">
            <h1 className="admin-title">Platform Stats</h1>
            <p className="admin-sub">Overview of PeerSync activity</p>
            <div className="admin-stats-grid">
              {[
                ["👥", "Total Users", users.length],
                ["🔒", "Private Accounts", users.filter(u => u.isPrivate).length],
                ["🌐", "Public Accounts", users.filter(u => !u.isPrivate).length],
                ["✓", "Verified Users", users.filter(u => u.isVerified).length],
              ].map(([icon, label, value]) => (
                <div key={label} className="admin-stat-card">
                  <div className="admin-stat-icon">{icon}</div>
                  <div className="admin-stat-value">{value}</div>
                  <div className="admin-stat-label">{label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}