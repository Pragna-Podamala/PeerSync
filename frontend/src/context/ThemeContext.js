import { createContext, useContext, useState, useEffect } from "react";
import API from "../services/api";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const getUsername = () => JSON.parse(localStorage.getItem("user"))?.username;
  const getKey = (u) => `theme_${u || getUsername() || "default"}`;

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(getKey()) || "light";
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Listen for login/logout — reload theme for new user
  useEffect(() => {
    const handleStorageChange = () => {
      const user = JSON.parse(localStorage.getItem("user"));
      const username = user?.username;
      const key = getKey(username);
      // Load this user's saved theme
      const savedTheme = localStorage.getItem(key) || "light";
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    };

    // Check on mount
    handleStorageChange();

    // Listen for changes (login/logout from other tabs)
    window.addEventListener("storage", handleStorageChange);
    // Also listen for custom event we'll fire on login/logout
    window.addEventListener("userChanged", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userChanged", handleStorageChange);
    };
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    const key = getKey();
    setTheme(newTheme);
    localStorage.setItem(key, newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    try {
      await API.put("/users/me/profile", { theme: newTheme });
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
