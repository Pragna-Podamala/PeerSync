import { useRef } from "react";
import API from "../services/api";
import "./WallpaperPicker.css";

const PRESETS = [
  { label: "None", value: "", color: "transparent", border: true },
  { label: "Dark", value: "#0f0f13", color: "#0f0f13" },
  { label: "Navy", value: "#0a1628", color: "#0a1628" },
  { label: "Forest", value: "#0d1f0d", color: "#0d1f0d" },
  { label: "Maroon", value: "#1a0a0a", color: "#1a0a0a" },
  { label: "Purple", value: "#120a1f", color: "#120a1f" },
  { label: "Gradient 1", value: "linear-gradient(135deg,#1a1a2e,#16213e)", color: null, gradient: "linear-gradient(135deg,#1a1a2e,#16213e)" },
  { label: "Gradient 2", value: "linear-gradient(135deg,#0d1b2a,#1b2838)", color: null, gradient: "linear-gradient(135deg,#0d1b2a,#1b2838)" },
  { label: "Gradient 3", value: "linear-gradient(135deg,#1a0533,#0d1b2a)", color: null, gradient: "linear-gradient(135deg,#1a0533,#0d1b2a)" },
  { label: "Gradient 4", value: "linear-gradient(135deg,#0a2e1a,#0d2b0d)", color: null, gradient: "linear-gradient(135deg,#0a2e1a,#0d2b0d)" },
];

export default function WallpaperPicker({ chatUsername, currentWallpaper, onSet, onClose }) {
  const fileRef = useRef();

  const handlePreset = (preset) => {
    onSet(preset.value, false);
    onClose();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData();
    fd.append("wallpaper", file);
    fd.append("chatUsername", chatUsername);
    try {
      const res = await API.post("/users/me/wallpaper", fd);
      onSet(res.data.wallpaper, true);
      onClose();
    } catch (err) { console.log(err); }
  };

  const handleRemove = async () => {
    try {
      await API.delete(`/users/me/wallpaper/${chatUsername}`);
      onSet("", false);
      onClose();
    } catch (err) { console.log(err); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="wallpaper-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>
        <h3 className="wallpaper-title">🖼 Chat Wallpaper</h3>
        <p className="wallpaper-sub">Choose a background for this chat</p>

        <div className="wallpaper-grid">
          {PRESETS.map(p => (
            <button
              key={p.label}
              className={`wallpaper-preset ${currentWallpaper === p.value ? "selected" : ""}`}
              onClick={() => handlePreset(p)}
              style={{ background: p.gradient || p.color || "var(--bg3)", border: p.border ? "2px dashed var(--border2)" : undefined }}
            >
              {p.border && <span className="wallpaper-none-label">✕</span>}
              {currentWallpaper === p.value && <span className="wallpaper-check">✓</span>}
            </button>
          ))}

          <button className="wallpaper-preset upload-preset" onClick={() => fileRef.current.click()}>
            <span>📷</span>
            <span className="wallpaper-upload-label">Upload</span>
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />

        {currentWallpaper && (
          <button className="wallpaper-remove" onClick={handleRemove}>Remove Wallpaper</button>
        )}
      </div>
    </div>
  );
}