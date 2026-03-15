import { useState } from "react";
import "./EmojiPicker.css";

const EMOJI_CATEGORIES = {
  "😀 Smileys": ["😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕"],
  "👋 Gestures": ["👋","🤚","🖐","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃"],
  "❤️ Hearts": ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉"],
  "🎉 Fun": ["🎉","🎊","🎈","🎁","🎀","🎗","🎟","🎫","🏆","🥇","🥈","🥉","🏅","🎖","🏵","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🎷","🎸","🎹","🎺","🎻","🥁","🪘"],
  "🍔 Food": ["🍕","🍔","🌮","🌯","🥗","🍜","🍝","🍛","🍣","🍱","🍤","🍙","🍚","🍘","🍥","🧆","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🦴","🌭","🍟","🧀","🥪","🥙","🫔","🌶","🥫","🧂"],
  "🐶 Animals": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🪲","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐟","🐠","🐬","🐳","🐋","🦈"],
};

export default function EmojiPicker({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState(Object.keys(EMOJI_CATEGORIES)[0]);
  const [search, setSearch] = useState("");

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const filtered = search
    ? allEmojis.filter(e => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory];

  return (
    <div className="emoji-picker" onClick={e => e.stopPropagation()}>
      <div className="emoji-search-wrap">
        <input
          className="emoji-search"
          placeholder="Search emoji..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      {!search && (
        <div className="emoji-categories">
          {Object.keys(EMOJI_CATEGORIES).map(cat => (
            <button
              key={cat}
              className={`emoji-cat-btn ${activeCategory === cat ? "active" : ""}`}
              onClick={() => setActiveCategory(cat)}
              title={cat}
            >
              {cat.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      <div className="emoji-grid">
        {filtered.map((emoji, i) => (
          <button key={i} className="emoji-btn" onClick={() => onSelect(emoji)}>
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}