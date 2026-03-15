import { useState } from "react";
import API from "../services/api";
import "./NotificationSettings.css";

export default function NotificationSettings({ currentUser, onClose, onUpdate }) {
  const ns = currentUser?.notificationSettings || {};
  const [sound, setSound] = useState(ns.sound !== false);
  const [push, setPush] = useState(ns.pushEnabled !== false);
  const [dnd, setDnd] = useState(ns.dndEnabled || false);
  const [dndStart, setDndStart] = useState(ns.dndStart || "22:00");
  const [dndEnd, setDndEnd] = useState(ns.dndEnd || "08:00");
  const [saved, setSaved] = useState(false);

  const requestPushPermission = async () => {
    if (!("Notification" in window)) return alert("Browser doesn't support notifications");
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      setPush(true);
      new Notification("ChatApp", { body: "Push notifications enabled! 🎉", icon: "/favicon.ico" });
    } else {
      setPush(false);
      alert("Permission denied. Enable in browser settings.");
    }
  };

  const handleSave = async () => {
    try {
      await API.put("/users/me/settings", {
        sound, pushEnabled: push, dndEnabled: dnd, dndStart, dndEnd
      });
      onUpdate && onUpdate({ ...currentUser, notificationSettings: { sound, pushEnabled: push, dndEnabled: dnd, dndStart, dndEnd } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { console.log(err); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="notif-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>
        <h2 className="notif-title">🔔 Notifications</h2>

        <div className="notif-body">
          {/* Sound */}
          <div className="pm-toggle-row">
            <div>
              <div className="pm-toggle-title">🔊 Message Sound</div>
              <div className="pm-toggle-sub">Play sound when a message arrives</div>
            </div>
            <button className={`toggle-btn ${sound ? "on" : ""}`} onClick={() => setSound(!sound)}>
              <span className="toggle-thumb" />
            </button>
          </div>

          {/* Push */}
          <div className="pm-toggle-row">
            <div>
              <div className="pm-toggle-title">📱 Push Notifications</div>
              <div className="pm-toggle-sub">
                {Notification.permission === "granted" ? "Browser notifications enabled" : "Click to enable browser notifications"}
              </div>
            </div>
            <button className={`toggle-btn ${push && Notification.permission === "granted" ? "on" : ""}`}
              onClick={() => Notification.permission !== "granted" ? requestPushPermission() : setPush(!push)}>
              <span className="toggle-thumb" />
            </button>
          </div>

          {/* DND */}
          <div className="pm-toggle-row">
            <div>
              <div className="pm-toggle-title">🌙 Do Not Disturb</div>
              <div className="pm-toggle-sub">Mute notifications during set hours</div>
            </div>
            <button className={`toggle-btn ${dnd ? "on" : ""}`} onClick={() => setDnd(!dnd)}>
              <span className="toggle-thumb" />
            </button>
          </div>

          {dnd && (
            <div className="dnd-schedule">
              <div className="dnd-row">
                <label className="dnd-label">From</label>
                <input type="time" className="dnd-input" value={dndStart} onChange={e => setDndStart(e.target.value)} />
              </div>
              <div className="dnd-row">
                <label className="dnd-label">To</label>
                <input type="time" className="dnd-input" value={dndEnd} onChange={e => setDndEnd(e.target.value)} />
              </div>
              <p className="dnd-note">No sound or popups during these hours</p>
            </div>
          )}

          <button className="pm-save" onClick={handleSave}>
            {saved ? "✅ Saved!" : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}