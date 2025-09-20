// components/admin/AdminMaintenance.jsx
// ------------------------------------------------------------
// Bloc Maintenance Admin
// - Réinitialise le compteur email_recreate.json
// - Code tolérant : si l'endpoint d'état n'existe pas, on continue
// ------------------------------------------------------------
import { useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export default function AdminMaintenance() {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(null); // { total, byEmail } si dispo

  async function fetchStatus() {
    // Optionnel : si tu as un endpoint d'état, on l’affiche
    // GET /api/admin/recreate/status (ignorer si 404)
    try {
      const res = await fetch(`${API_BASE}/admin/recreate/status`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // silencieux : l’endpoint peut ne pas exister et ce n’est pas bloquant
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  async function handleReset() {
    setBusy(true);
    setMessage("");
    try {
      // ⚠️ adapte le chemin si nécessaire :
      // j’utilise POST /api/admin/reset-recreate (celui que tu as ajouté)
      const res = await fetch(`${API_BASE}/admin/reset-recreate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `HTTP ${res.status}`);
      }
      setMessage("✅ Réinitialisation effectuée.");
      await fetchStatus();
    } catch (e) {
      setMessage("❌ Échec : " + (e?.message || "erreur inconnue"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-section">
      <h2 className="admin-section-title">🧰 Maintenance</h2>

      <div
        style={{
          background: "#121a2b",
          border: "1px solid #22304a",
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8 }}>
          Réinitialiser <code>email_recreate.json</code>
        </h3>
        <p style={{ opacity: 0.8, marginTop: 0 }}>
          Remet à zéro le compteur de (re)création de comptes test pour pouvoir
          rejouer les étapes d’inscription.
        </p>

        {stats && (
          <div
            style={{
              background: "#0b1220",
              border: "1px solid #22304a",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 12,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              État actuel (si exposé par l’API)
            </div>
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Total: <b>{stats.total ?? "-"}</b>
            </div>
            {stats.byEmail && (
              <div style={{ fontSize: 13, marginTop: 6 }}>
                {Object.entries(stats.byEmail).map(([email, n]) => (
                  <div key={email}>
                    <code>{email}</code> → {n}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleReset}
          disabled={busy}
          style={{
            display: "inline-block",
            background: "linear-gradient(90deg,#3aa2ff,#5cc4ff)",
            color: "#0b1220",
            fontWeight: 700,
            borderRadius: 12,
            padding: "10px 18px",
            border: "none",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Réinitialisation…" : "Réinitialiser maintenant"}
        </button>

        {message && (
          <div style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
