import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import "./Terms.css";

export default function Terms() {
  const [scrolled, setScrolled] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const bodyRef = useRef();
  const navigate = useNavigate();

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setScrolled(true);
  };

  const handleAccept = async () => {
    setAccepting(true);
    localStorage.setItem("terms_accepted", "true");
    try { await API.put("/users/me/profile", { acceptedTerms: true }); } catch {}
    navigate("/");
    setAccepting(false);
  };

  const sections = [
    { icon: "🚫", title: "No Inappropriate Content", text: "Do not send sexual, violent, hateful, or offensive messages, images, videos, or voice messages." },
    { icon: "🔒", title: "Respect Privacy", text: "Do not share other people's personal information, photos, or private conversations without their consent." },
    { icon: "🤝", title: "No Harassment or Bullying", text: "Treat everyone with respect. Harassment, threats, and bullying of any kind will result in an immediate ban." },
    { icon: "🛡️", title: "No Spam or Scams", text: "Do not send unsolicited messages, phishing links, or attempt to deceive or defraud other users." },
    { icon: "👶", title: "Age Requirement", text: "You must be at least 13 years old to use PeerSync. Do not share content inappropriate for minors." },
    { icon: "⚖️", title: "Legal Compliance", text: "Do not use PeerSync for any illegal activities, including sharing copyrighted material without permission." },
    { icon: "✅", title: "Your Responsibility", text: "You are responsible for all activity on your account. Keep your password safe and do not share your account." },
    { icon: "🔧", title: "Enforcement", text: "Violations may result in content removal, account suspension, or permanent ban without prior notice." },
  ];

  return (
    <div className="terms-page">
      <div className="terms-card">
        {/* Header */}
        <div className="terms-header">
          <div className="terms-logo-wrap">
            <div className="terms-logo-icon">
              <svg viewBox="0 0 40 40" fill="none" width="32" height="32">
                <circle cx="14" cy="13" r="7" fill="url(#tg1)"/>
                <circle cx="26" cy="13" r="7" fill="url(#tg2)" opacity="0.9"/>
                <circle cx="20" cy="26" r="7" fill="url(#tg3)" opacity="0.95"/>
                <defs>
                  <linearGradient id="tg1" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#34d399"/><stop offset="1" stopColor="#10b981"/></linearGradient>
                  <linearGradient id="tg2" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6ee7b7"/><stop offset="1" stopColor="#059669"/></linearGradient>
                  <linearGradient id="tg3" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#34d399"/><stop offset="1" stopColor="#047857"/></linearGradient>
                </defs>
              </svg>
            </div>
            <span className="terms-brand">PeerSync</span>
          </div>
          <h1 className="terms-title">Community Guidelines</h1>
          <p className="terms-subtitle">Read and accept our terms before using PeerSync</p>
        </div>

        {/* Scrollable content */}
        <div className="terms-body" ref={bodyRef} onScroll={handleScroll}>
          {sections.map((s, i) => (
            <div className="terms-section" key={i}>
              <div className="terms-section-icon">{s.icon}</div>
              <div>
                <h2 className="terms-section-title">{s.title}</h2>
                <p className="terms-section-text">{s.text}</p>
              </div>
            </div>
          ))}
          <p className="terms-updated">Last updated: March 2026 · These guidelines are subject to change.</p>
        </div>

        {/* Footer */}
        {!scrolled && (
          <p className="terms-scroll-hint">↓ Scroll down to read all guidelines</p>
        )}

        <button
          className="terms-accept"
          onClick={handleAccept}
          disabled={!scrolled || accepting}
        >
          {accepting ? "Loading..." : scrolled ? "✓ I Agree — Enter PeerSync" : "Read all guidelines first"}
        </button>
      </div>
    </div>
  );
}
