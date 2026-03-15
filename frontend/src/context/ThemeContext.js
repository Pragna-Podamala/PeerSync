import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const getUsername = () => JSON.parse(localStorage.getItem("user"))?.username;
  const getKey = () => `theme_${getUsername() || "default"}`;

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(getKey()) || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(getKey(), theme);
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    // Save to backend so it persists across devices
    try {
      await API.put("/users/me/profile", { theme: newTheme });
    } catch {}
  };

  // Load theme from backend on login
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user?.settings?.theme) {
      setTheme(user.settings.theme);
      localStorage.setItem(getKey(), user.settings.theme);
    }
  }, [localStorage.getItem("user")]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
