import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import SecurityPage from "./pages/SecurityPage";
import AdminPanel from "./pages/AdminPanel";
import "./App.css";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const accepted = localStorage.getItem("terms_accepted");
  if (!accepted) return <Navigate to="/terms" />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" />;
}

function TermsRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const accepted = localStorage.getItem("terms_accepted");
  if (accepted) return <Navigate to="/" />;
  return <Terms />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"         element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register"      element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/terms"         element={<Terms />} />
      <Route path="/privacy"       element={<Privacy />} />
      <Route path="/security-info" element={<SecurityPage />} />
      <Route path="/admin"         element={<AdminPanel />} />
      <Route path="/"              element={<PrivateRoute><Chat /></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider username={JSON.parse(localStorage.getItem("user"))?.username}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}