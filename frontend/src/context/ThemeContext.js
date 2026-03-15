import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children, username }) {
  const storageKey = username ? `theme_${username}` : "theme_default";

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(storageKey) || "light";
  });

  // When username changes (different user logs in), load their theme
  useEffect(() => {
    const saved = localStorage.getItem(storageKey) || "light";
    setTheme(saved);
  }, [storageKey]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
