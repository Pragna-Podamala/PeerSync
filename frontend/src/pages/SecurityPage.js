import { useNavigate } from "react-router-dom";
import "./Terms.css";

export default function SecurityPage() {
  const navigate = useNavigate();
  return (
    <div className="terms-page">
      <div className="terms-card">
        <button className="terms-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="terms-logo">🛡️</div>
        <h1 className="terms-title">Security</h1>
        <p className="terms-date">How we keep PeerSync safe</p>

        <div className="terms-section">
          <h2>🔐 Authentication</h2>
          <p>PeerSync uses JWT tokens for secure authentication. Passwords are hashed using bcrypt and never stored in plain text.</p>
        </div>
        <div className="terms-section">
          <h2>📱 Active Sessions</h2>
          <p>You can view and revoke all active sessions from your Security settings. If you notice suspicious activity, revoke all sessions immediately and change your password.</p>
        </div>
        <div className="terms-section">
          <h2>🔒 Message Security</h2>
          <p>All messages are transmitted over secure connections. Disappearing messages are permanently deleted from our servers after the set duration.</p>
        </div>
        <div className="terms-section">
          <h2>👥 Account Control</h2>
          <p>You control who can message you through follow settings. Block unwanted users at any time from their profile.</p>
        </div>
        <div className="terms-section">
          <h2>⚠️ Report Issues</h2>
          <p>If you discover a security vulnerability, please report it immediately through PeerSync settings. We take all security reports seriously.</p>
        </div>

        <button className="terms-accept" onClick={() => navigate(-1)}>Got it ✓</button>
      </div>
    </div>
  );
}