import { useNavigate } from "react-router-dom";
import "./Terms.css";

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="terms-page">
      <div className="terms-card">
        <button className="terms-back" onClick={() => navigate(-1)}>← Back</button>
        <div className="terms-logo">🔒</div>
        <h1 className="terms-title">Privacy Policy</h1>
        <p className="terms-date">Last updated: March 2026</p>

        <div className="terms-section">
          <h2>1. What We Collect</h2>
          <p>PeerSync collects only what's necessary: your username, email address, and messages you send. We do not sell your data to anyone.</p>
        </div>
        <div className="terms-section">
          <h2>2. How We Use Your Data</h2>
          <p>Your data is used solely to provide the PeerSync messaging service — delivering messages, storing your profile, and enabling features like status updates and groups.</p>
        </div>
        <div className="terms-section">
          <h2>3. Message Privacy</h2>
          <p>Messages are stored securely on our servers. Disappearing messages are automatically deleted after the set duration. You can delete your messages at any time.</p>
        </div>
        <div className="terms-section">
          <h2>4. Profile Privacy</h2>
          <p>You control who sees your profile picture, last seen, and online status. You can set these to Everyone, Close Friends, or Only Me in your privacy settings.</p>
        </div>
        <div className="terms-section">
          <h2>5. Data Deletion</h2>
          <p>You can delete your account at any time from Security settings. All your data including messages, media, and profile will be permanently deleted.</p>
        </div>
        <div className="terms-section">
          <h2>6. Contact</h2>
          <p>For privacy concerns, reach out through PeerSync. We take your privacy seriously.</p>
        </div>

        <button className="terms-accept" onClick={() => navigate(-1)}>Got it ✓</button>
      </div>
    </div>
  );
}