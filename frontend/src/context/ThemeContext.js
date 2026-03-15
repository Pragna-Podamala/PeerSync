import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const getKey = () => {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.username ? `theme_${user.username}` : "theme_default";
  };

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(getKey()) || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(getKey(), theme);
  }, [theme]);

  // Listen for storage changes (when user logs in/out)
  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem(getKey()) || "light";
      setTheme(saved);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
