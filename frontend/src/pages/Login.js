import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [cursorPos, setCursorPos] = useState({ x: -999, y: -999 });
  const { login } = useAuth();
  const navigate = useNavigate();

  // Cursor glow effect
  useEffect(() => {
    setError(""); // Clear any stale errors on mount
    const handle = (e) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handle);
    return () => window.removeEventListener("mousemove", handle);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("https://peersync-x3m0.onrender.com/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid credentials");
      login(data.user, data.token);
      navigate("/");
    } catch (err) { setError(err.message || "Invalid credentials"); }
    setLoading(false);
  };



  return (
    <div className="auth-page">
      {/* Cursor glow */}
      <div className="cursor-glow" style={{ left: cursorPos.x, top: cursorPos.y }} />

      <div className="auth-bg">
        <div className="auth-orb orb1" />
        <div className="auth-orb orb2" />
        <div className="auth-orb orb3" />
        <div className="auth-grid" />
      </div>

      <div className="auth-container">
        {/* Left hero */}
        <div className="auth-left">
          <div className="auth-logo-wrap">
            <div className="auth-logo">
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="14" cy="13" r="7" fill="url(#lg1)"/>
                <circle cx="26" cy="13" r="7" fill="url(#lg2)" opacity="0.9"/>
                <circle cx="20" cy="26" r="7" fill="url(#lg3)" opacity="0.95"/>
                <defs>
                  <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a78bfa"/><stop offset="1" stopColor="#7c3aed"/></linearGradient>
                  <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#60a5fa"/><stop offset="1" stopColor="#2563eb"/></linearGradient>
                  <linearGradient id="lg3" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#4f46e5"/></linearGradient>
                </defs>
              </svg>
            </div>
            <span className="auth-brand">PeerSync</span>
          </div>

          <h1 className="auth-hero-title">
            Chat that<br/><span>syncs with you</span>
          </h1>
          <p className="auth-hero-sub">
            Real-time messaging, status updates, groups and more — all in one place. Private. Fast. Free.
          </p>

          <div className="auth-features">
            {[
              ["💬", "Real-time messaging with reactions"],
              ["📸", "Status updates like stories"],
              ["👥", "Group chats with polls"],
              ["🔒", "Privacy controls for everything"],
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

        {/* Right card */}
        <div className="auth-right">
          <div className="auth-card">
            <h2 className="auth-card-title">Welcome back 👋</h2>
            <p className="auth-card-sub">Sign in to your PeerSync account</p>

            {error && <div className="auth-error">⚠️ {error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
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
                    placeholder="Enter your password"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" className="auth-eye" onClick={() => setShowPwd(!showPwd)}>
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? <><span className="auth-spinner" /> Signing in...</> : <>Sign In →</>}
              </button>
              <div style={{textAlign:"center",marginTop:"8px"}}>
                <a href="mailto:peersync.system@gmail.com?subject=Forgot Password&body=Hi, I forgot my password. My registered email is: "
                  style={{fontSize:"13px",color:"#10b981",fontWeight:"600",textDecoration:"none"}}>
                  🔑 Forgot password? Contact support
                </a>
              </div>
            </form>
                        <p className="auth-switch">
              Don't have an account? <Link to="/register">Create one free</Link>
            </p>

            <div className="auth-footer">
              © 2026 PeerSync &nbsp;
              <a href="/privacy" onClick={e=>{e.preventDefault();window.location.href='/privacy'}}>Privacy</a>
              <a href="/terms" onClick={e=>{e.preventDefault();window.location.href='/terms'}}>Terms</a>
              <a href="/security-info" onClick={e=>{e.preventDefault();window.location.href='/security-info'}}>Security</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}