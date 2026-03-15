import "./PrivacyPicker.css";

const OPTIONS = [
  { value: "everyone",     icon: "🌐", label: "Everyone",      sub: "All followers can see" },
  { value: "closeFriends", icon: "👥", label: "Close Friends", sub: "Only selected people" },
  { value: "nobody",       icon: "🚫", label: "Only Me",       sub: "Nobody else can see" },
];

export default function PrivacyPicker({
  label, value, onChange,
  showCloseFriends, closeFriends, onToggleCloseFriend,
  followers,
}) {
  return (
    <div className="privacy-picker">
      <div className="pp-label">{label}</div>
      <div className="pp-options">
        {OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`pp-opt ${value === opt.value ? "selected" : ""}`}
            onClick={() => onChange(opt.value)}
          >
            <span className="pp-icon">{opt.icon}</span>
            <div className="pp-text">
              <span className="pp-name">{opt.label}</span>
              <span className="pp-sub">{opt.sub}</span>
            </div>
            <div className={`pp-radio ${value === opt.value ? "on" : ""}`} />
          </button>
        ))}
      </div>
      {value === "closeFriends" && showCloseFriends && (
        <div className="pp-cf-list">
          <p className="pp-cf-title">Select who can see:</p>
          {followers.length === 0
            ? <p className="pp-cf-empty">No followers yet</p>
            : followers.map(f => (
              <div
                key={f._id || f.username}
                className={`pp-cf-row ${closeFriends.includes(f.username) ? "selected" : ""}`}
                onClick={() => onToggleCloseFriend(f.username)}
              >
                <div className="pp-cf-av">
                  {f.profilePic ? <img src={f.profilePic} alt="" /> : f.username?.[0]?.toUpperCase()}
                </div>
                <span className="pp-cf-name">@{f.username}</span>
                <div className={`pp-cf-check ${closeFriends.includes(f.username) ? "on" : ""}`}>
                  {closeFriends.includes(f.username) && "✓"}
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
