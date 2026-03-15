import { useState, useEffect } from "react";
import API from "../services/api";
import "./GroupPollModal.css";

export default function GroupPollModal({ group, currentUser, onClose, onPollCreated }) {
  const [tab, setTab] = useState("view");
  const [polls, setPolls] = useState([]);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [multiVote, setMultiVote] = useState(false);
  const [expiresIn, setExpiresIn] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPolls(); }, []);

  const fetchPolls = async () => {
    try {
      const res = await API.get(`/groups/${group._id}/polls`);
      setPolls(res.data);
    } catch (err) { console.log(err); }
  };

  const handleVote = async (pollId, optionIndex) => {
    try {
      const res = await API.post(`/groups/${group._id}/polls/${pollId}/vote`, { optionIndex });
      setPolls(prev => prev.map(p => p._id === pollId ? res.data : p));
    } catch (err) { console.log(err); }
  };

  const handleCreate = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return;
    setCreating(true);
    try {
      const res = await API.post(`/groups/${group._id}/polls`, {
        question, options: JSON.stringify(options.filter(o => o.trim())),
        multiVote, expiresIn: expiresIn || "",
      });
      setPolls(prev => [res.data, ...prev]);
      setTab("view");
      setQuestion(""); setOptions(["", ""]); setMultiVote(false); setExpiresIn("");
      onPollCreated && onPollCreated(res.data);
    } catch (err) { console.log(err); }
    setCreating(false);
  };

  const getTotalVotes = (poll) => poll.options.reduce((sum, o) => sum + o.votes.length, 0);
  const getPercent = (votes, total) => total === 0 ? 0 : Math.round((votes / total) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="poll-modal" onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>
        <h2 className="poll-title">📊 Group Polls</h2>

        <div className="pm-tabs">
          <button className={`pm-tab ${tab === "view" ? "active" : ""}`} onClick={() => setTab("view")}>View Polls</button>
          <button className={`pm-tab ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>Create Poll</button>
        </div>

        <div className="poll-body">
          {tab === "view" && (
            <>
              {polls.length === 0 ? (
                <p className="poll-empty">No polls yet. Create the first one!</p>
              ) : polls.map(poll => {
                const total = getTotalVotes(poll);
                const isExpired = poll.expiresAt && new Date() > new Date(poll.expiresAt);
                const myVotes = poll.options.reduce((acc, opt, i) => opt.votes.includes(currentUser.username) ? [...acc, i] : acc, []);
                return (
                  <div key={poll._id} className="poll-card">
                    <div className="poll-question">{poll.question}</div>
                    <div className="poll-meta">
                      by @{poll.createdBy} • {total} vote{total !== 1 ? "s" : ""}
                      {poll.multiVote && " • Multi-vote"}
                      {isExpired && " • Expired"}
                      {poll.isClosed && " • Closed"}
                    </div>
                    <div className="poll-options">
                      {poll.options.map((opt, i) => {
                        const pct = getPercent(opt.votes.length, total);
                        const voted = myVotes.includes(i);
                        return (
                          <button
                            key={i}
                            className={`poll-option ${voted ? "voted" : ""}`}
                            onClick={() => !isExpired && !poll.isClosed && handleVote(poll._id, i)}
                            disabled={isExpired || poll.isClosed}
                          >
                            <div className="poll-option-bar" style={{ width: `${pct}%` }} />
                            <span className="poll-option-text">{opt.text}</span>
                            <span className="poll-option-pct">{pct}%</span>
                            {voted && <span className="poll-voted-check">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === "create" && (
            <div className="poll-create">
              <label className="pm-label">QUESTION</label>
              <input
                className="poll-input"
                placeholder="Ask something..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
              />

              <label className="pm-label" style={{marginTop:"12px"}}>OPTIONS</label>
              {options.map((opt, i) => (
                <div key={i} className="poll-opt-row">
                  <input
                    className="poll-input"
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                  />
                  {options.length > 2 && (
                    <button className="poll-remove-opt" onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button className="poll-add-opt" onClick={() => setOptions(prev => [...prev, ""])}>+ Add Option</button>
              )}

              <div className="poll-settings">
                <label className="poll-check-row">
                  <input type="checkbox" checked={multiVote} onChange={e => setMultiVote(e.target.checked)} />
                  Allow multiple votes
                </label>
                <div className="poll-expires">
                  <label className="pm-label">EXPIRES IN (hours, optional)</label>
                  <input className="poll-input" type="number" placeholder="e.g. 24"
                    value={expiresIn} onChange={e => setExpiresIn(e.target.value)} min="1" />
                </div>
              </div>

              <button className="pm-save" onClick={handleCreate}
                disabled={creating || !question.trim() || options.filter(o => o.trim()).length < 2}>
                {creating ? "Creating..." : "Create Poll"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}