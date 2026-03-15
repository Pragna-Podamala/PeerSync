import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [error, setError] = useState("");
  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handle = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) { setError("Please read and accept the terms first"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("https://peersync-api.onrender.com/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      login(data.user, data.token);
      navigate("/");
    } catch (err) { setError(err.message || "Registration failed"); }
    setLoading(false);
  };

  const RULES = [
    ["🚫", "No Inappropriate Content", "Do not send sexual, violent, hateful, or offensive messages, images, videos, or voice messages."],
    ["🔒", "Respect Privacy", "Do not share other people's personal information or private conversations without their consent."],
    ["🤝", "No Harassment", "Treat everyone with respect. Harassment, threats, and bullying will result in an immediate ban."],
    ["🛡️", "No Spam or Scams", "Do not send unsolicited messages, phishing links, or attempt to deceive other users."],
    ["👶", "Age Requirement", "You must be at least 13 years old to use PeerSync."],
    ["⚖️", "Legal Compliance", "Do not use PeerSync for any illegal activities."],
    ["✅", "Your Responsibility", "You are responsible for all activity on your account. Keep your password safe."],
    ["📸", "Media Rules", "Only share media you own or have permission to share. No explicit or harmful content."],
    ["🔐", "Account Security", "Use strong passwords. Do not share your account credentials with anyone."],
    ["📵", "No Impersonation", "Do not impersonate other users, celebrities, or organizations."],
  ];

  return (
    <>
      <div className="auth-page">
        <div className="cursor-glow" style={{ left: cursorPos.x, top: cursorPos.y }} />
        <div className="auth-bg">
          <div className="auth-orb orb1" />
          <div className="auth-orb orb2" />
          <div className="auth-orb orb3" />
          <div className="auth-grid" />
        </div>

        <div className="auth-container">
          <div className="auth-left">
            <div className="auth-logo-wrap">
              <div className="auth-logo">
                <svg viewBox="0 0 40 40" fill="none">
                  <circle cx="14" cy="13" r="7" fill="url(#rg1)"/>
                  <circle cx="26" cy="13" r="7" fill="url(#rg2)" opacity="0.9"/>
                  <circle cx="20" cy="26" r="7" fill="url(#rg3)" opacity="0.95"/>
                  <defs>
                    <linearGradient id="rg1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#34d399"/><stop offset="1" stopColor="#10b981"/></linearGradient>
                    <linearGradient id="rg2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6ee7b7"/><stop offset="1" stopColor="#059669"/></linearGradient>
                    <linearGradient id="rg3" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#34d399"/><stop offset="1" stopColor="#047857"/></linearGradient>
                  </defs>
                </svg>
              </div>
              <span className="auth-brand">PeerSync</span>
            </div>
            <h1 className="auth-hero-title">Join a new<br/><span>way to connect</span></h1>
            <p className="auth-hero-sub">Create your free account and start connecting with people who matter.</p>
            <div className="auth-features">
              {[
                ["⚡", "Instant setup, free forever"],
                ["🛡️", "Privacy-first by design"],
                ["🌍", "Connect with anyone, anywhere"],
                ["🎉", "Groups, polls, voice messages & more"],
              ].map(([icon, text]) => (
                <div className="auth-feature" key={text}>
                  <div className="auth-feature-icon">{icon}</div>
                  <span className="auth-feature-text">{text}</span>
                </div>
              ))}
            </div>
            <div className="auth-trust">
              <div className="auth-trust-item">🔒 End-to-end encrypted</div>
              <div className="auth-trust-item">⚡ &lt;100ms messaging</div>
              <div className="auth-trust-item">🌎 Free forever</div>
            </div>
          </div>

          <div className="auth-right">
            <div className="auth-card">
              <h2 className="auth-card-title">Create account ✨</h2>
              <p className="auth-card-sub">Join PeerSync — it's completely free</p>
              {error && <div className="auth-error">⚠️ {error}</div>}
              <form className="auth-form" onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label className="auth-label">Username</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">👤</span>
                    <input className="auth-input" type="text" placeholder="Pick a username"
                      value={username} onChange={e => setUsername(e.target.value)} required />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label">Email address</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">📧</span>
                    <input className="auth-input" type="email" placeholder="your@email.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <span className="auth-input-icon">🔒</span>
                    <input className="auth-input" type={showPwd ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    <button type="button" className="auth-eye" onClick={() => setShowPwd(!showPwd)}>
                      {showPwd ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>

                {/* Terms checkbox */}
                <div onClick={() => setShowTermsModal(true)} style={{
                  background: agreed ? "rgba(16,185,129,0.06)" : "rgba(0,0,0,0.03)",
                  border: `1.5px solid ${agreed ? "rgba(16,185,129,0.3)" : "#e5e7eb"}`,
                  borderRadius:"12px", padding:"12px 14px",
                  display:"flex", alignItems:"center", gap:"10px", cursor:"pointer",
                }}>
                  <div style={{
                    width:"20px", height:"20px", borderRadius:"6px", flexShrink:0,
                    border: agreed ? "none" : "2px solid #d1d5db",
                    background: agreed ? "#10b981" : "transparent",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#fff", fontSize:"13px", fontWeight:"800",
                  }}>{agreed ? "✓" : ""}</div>
                  <span style={{fontSize:"13px", color: agreed ? "#059669" : "#6b7280", fontWeight:"600"}}>
                    {agreed ? "✅ Terms accepted" : "I agree to PeerSync's Terms & Guidelines"}
                  </span>
                  <span style={{marginLeft:"auto", fontSize:"11px", color:"#10b981", fontWeight:"700"}}>
                    Read →
                  </span>
                </div>

                <button className="auth-btn" type="submit" disabled={loading || !agreed}
                  style={!agreed ? {opacity:0.5, cursor:"not-allowed"} : {}}>
                  {loading ? <><span className="auth-spinner" /> Creating account...</> : <>Create Account 🎉</>}
                </button>
              </form>

              <p className="auth-switch">Already have an account? <Link to="/login">Sign In</Link></p>
              <div className="auth-footer">
                © 2026 PeerSync &nbsp;
                <a href="/privacy">Privacy</a>
                <a href="/terms">Terms</a>
                <a href="/security-info">Security</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms Modal — OUTSIDE auth-page but INSIDE fragment */}
      {showTermsModal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
          backdropFilter:"blur(8px)", display:"flex",
          alignItems:"center", justifyContent:"center", zIndex:9999, padding:"20px"
        }}>
          <div style={{
            background:"#fff", borderRadius:"24px", padding:"36px 32px",
            maxWidth:"560px", width:"100%", maxHeight:"85vh",
            display:"flex", flexDirection:"column",
            boxShadow:"0 32px 80px rgba(0,0,0,0.4)"
          }}>
            <div style={{textAlign:"center", marginBottom:"20px"}}>
              <div style={{fontSize:"40px", marginBottom:"8px"}}>📋</div>
              <h2 style={{fontSize:"24px", fontWeight:"900", color:"#064e3b", margin:"0 0 6px"}}>Before You Join</h2>
              <p style={{fontSize:"13px", color:"#9ca3af", margin:0}}>Please read PeerSync's community guidelines</p>
            </div>

            <div style={{overflowY:"auto", flex:1, marginBottom:"20px", paddingRight:"6px"}}>
              {RULES.map(([icon, title, text], i) => (
                <div key={i} style={{display:"flex", gap:"12px", padding:"12px 0", borderBottom:"1px solid #f0fdf4"}}>
                  <span style={{fontSize:"20px", flexShrink:0, width:"28px"}}>{icon}</span>
                  <div>
                    <div style={{fontSize:"13px", fontWeight:"800", color:"#065f46", marginBottom:"3px"}}>{title}</div>
                    <div style={{fontSize:"12px", color:"#6b7280", lineHeight:"1.6"}}>{text}</div>
                  </div>
                </div>
              ))}
              <p style={{fontSize:"11px", color:"#9ca3af", textAlign:"center", padding:"12px 0"}}>
                Last updated: March 2026 · These guidelines are subject to change.
              </p>
            </div>

            <div style={{display:"flex", gap:"10px"}}>
              <button onClick={() => setShowTermsModal(false)} style={{
                flex:1, padding:"13px", background:"#f3f4f6", border:"none",
                borderRadius:"12px", fontSize:"14px", fontWeight:"700",
                cursor:"pointer", color:"#6b7280", fontFamily:"inherit"
              }}>Cancel</button>
              <button onClick={() => { setAgreed(true); setShowTermsModal(false); }} style={{
                flex:2, padding:"13px",
                background:"linear-gradient(135deg,#10b981,#059669)",
                border:"none", borderRadius:"12px", fontSize:"14px",
                fontWeight:"800", cursor:"pointer", color:"#fff",
                boxShadow:"0 4px 14px rgba(16,185,129,0.3)", fontFamily:"inherit"
              }}>✓ I Agree — Continue</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}