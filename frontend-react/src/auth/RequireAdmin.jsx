// ============================================================
// RequireAdmin.jsx — Version ping serveur (anti-stale, no hardcode)
// - Vérifie le droit admin via /api/admin/ping (X-API-Key).
// - Si pas de token -> /login
// - Si ping=403 -> /dashboard
// - Sinon -> <Outlet />
// ============================================================
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { API_BASE } from "../sdk/apiClient"; // 

export default function RequireAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const apiKey = localStorage.getItem("apiKey");
    if (!apiKey) {
      setReady(true); // pas de token -> on laissera rediriger /login
      return;
    }
     fetch(`${API_BASE}/api/admin/ping`, { headers: { "X-API-Key": apiKey } })
      .then(r => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div style={{ padding: 20 }}>Chargement…</div>;
  }

  const token = localStorage.getItem("apiKey");
  if (!token) return <Navigate to="/login" replace />;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

