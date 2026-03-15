import { useState, useEffect } from "react";
import API from "../services/api";
import "./SecuritySettings.css";

export default function SecuritySettings({ currentUser, onClose, onLogout }) {
  const [tab, setTab] = useState("password");
  const [sessions, setSessions] = useState([]);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [deletePwd, setDeletePwd] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);

  useEffect(() => {
    if (tab === "sessions") fetchSessions();
  }, [tab]);

  const fetchSessions = async () => {
    try {
      const res = await API.get("/users/me/sessions");
      setSessions(res.data);
    } catch (err) { console.log(err); }
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) return showMsg("Fill all fields", "error");
    if (newPwd !== confirmPwd) return showMsg("Passwords don't match", "error");
    if (newPwd.length < 6) return showMsg("Min 6 characters", "error");
    setLoading(true);
    try {
      await API.post("/users/me/change-password", { currentPassword: currentPwd, newPassword: newPwd });
      showMsg("✅ Password changed successfully!");
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed", "error");
    }
    setLoading(false);
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await API.delete(`/users/me/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    } catch (err) { console.log(err); }
  };

  const handleDeleteAccount = async () => {
    if (!deletePwd) return showMsg("Enter your password", "error");
    if (!window.confirm("⚠️ This will permanently delete your account and all data. Are you sure?")) return;
    setLoading(true);
    try {
      await API.post("/users/me/delete-account", { password: deletePwd });
      onLogout && onLogout();
    } catch (err) {
      showMsg(err.response?.data?.message || "Failed", "error");
    }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="sec-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>
        <h2 className="sec-title">🔐 Security</h2>

        <div className="pm-tabs">
          <button className={`pm-tab ${tab === "password" ? "active" : ""}`} onClick={() => setTab("password")}>Password</button>
          <button className={`pm-tab ${tab === "sessions" ? "active" : ""}`} onClick={() => setTab("sessions")}>Sessions</button>
          <button className={`pm-tab ${tab === "delete" ? "active" : ""}`} onClick={() => setTab("delete")}>Delete Account</button>
        </div>

        {msg.text && (
          <div className={`sec-msg ${msg.type === "error" ? "error" : "success"}`}>{msg.text}</div>
        )}

        <div className="sec-body">
          {tab === "password" && (
            <div className="sec-form">
              <label className="pm-label">CURRENT PASSWORD</label>
              <div className="pass-wrap">
                <input type={showCurrentPwd ? "text" : "password"} className="sec-input"
                  placeholder="Enter current password" value={currentPwd}
                  onChange={e => setCurrentPwd(e.target.value)} />
                <button className="eye-btn" type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)}>
                  {showCurrentPwd ? "🙈" : "👁️"}
                </button>
              </div>

              <label className="pm-label" style={{marginTop:"12px"}}>NEW PASSWORD</label>
              <div className="pass-wrap">
                <input type={showNewPwd ? "text" : "password"} className="sec-input"
                  placeholder="Min 6 characters" value={newPwd}
                  onChange={e => setNewPwd(e.target.value)} />
                <button className="eye-btn" type="button" onClick={() => setShowNewPwd(!showNewPwd)}>
                  {showNewPwd ? "🙈" : "👁️"}
                </button>
              </div>

              <label className="pm-label" style={{marginTop:"12px"}}>CONFIRM NEW PASSWORD</label>
              <input type="password" className="sec-input" placeholder="Repeat new password"
                value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />

              <button className="pm-save" style={{marginTop:"16px"}}
                onClick={handleChangePassword} disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </button>
            </div>
          )}

          {tab === "sessions" && (
            <div className="sec-sessions">
              <p className="sec-sessions-note">These are all devices currently logged into your account.</p>
              {sessions.length === 0
                ? <p className="pm-empty">No active sessions found</p>
                : sessions.map(s => (
                  <div key={s.sessionId} className="session-row">
                    <div className="session-icon">📱</div>
                    <div className="session-info">
                      <div className="session-device">{s.device || "Unknown device"}</div>
                      <div className="session-meta">{s.ip || "Unknown IP"} • {new Date(s.lastActive).toLocaleDateString()}</div>
                    </div>
                    <button className="session-revoke" onClick={() => handleRevokeSession(s.sessionId)}>
                      Revoke
                    </button>
                  </div>
                ))
              }
            </div>
          )}

          {tab === "delete" && (
            <div className="sec-form">
              <div className="delete-warning">
                <div className="delete-warning-icon">⚠️</div>
                <h3>Delete Account</h3>
                <p>This will permanently delete your account, all messages, followers, and data. This cannot be undone.</p>
              </div>
              <label className="pm-label">CONFIRM WITH YOUR PASSWORD</label>
              <input type="password" className="sec-input" placeholder="Enter your password"
                value={deletePwd} onChange={e => setDeletePwd(e.target.value)} />
              <button className="delete-btn" onClick={handleDeleteAccount} disabled={loading || !deletePwd}>
                {loading ? "Deleting..." : "🗑 Delete My Account"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}