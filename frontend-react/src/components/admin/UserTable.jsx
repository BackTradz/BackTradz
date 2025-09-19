// components/admin/UserTable.jsx
// ------------------------------------------------------------
// 👥 Admin > Utilisateurs (style only, routes inchangées)
// ------------------------------------------------------------
import { useEffect, useState } from "react";
import SectionTitle from "../ui/SectionTitle";
import { API_BASE } from "../../sdk/apiClient";

export default function UserTable() {
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState(null);

  const token = localStorage.getItem("apiKey");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
       const res = await fetch(`${API_BASE}/api/admin/get_users`, { headers: { "X-API-Key": token } });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("Erreur API");
      setUsers(data);
    } catch (err) {
      console.error("❌ Erreur get_users:", err);
      setMsg("Erreur de chargement des utilisateurs");
    }
  };

  const loadHistory = async (user_id) => {
    const res = await fetch(`${API_BASE}/api/admin/user_history/${user_id}`, { headers: { "X-API-Key": token } });
    const data = await res.json();
    setHistory({ user_id, entries: data });
  };

  const action = async (route, user_id, amount = 1) => {
    const res = await fetch(`${API_BASE}/api/admin/${route}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": token,
      },
      body: JSON.stringify({ user_id, amount }),
    });
    const data = await res.json();
    setMsg(data?.detail || "Action effectuée");
    fetchUsers();
  };

  return (
    <div className="mb-10">
      <SectionTitle>👥 Utilisateurs</SectionTitle>
      {msg && <p className="text-emerald-400 mb-3">{msg}</p>}

      {/* ===== TABLE WRAPPER — plus de grosses bordures blanches ===== */}
      <div className="admin-table">
        <table className="table-clean">
          <thead>
            <tr>
              <th>Email</th>
              <th>Username</th>
              <th>Plan</th>
              <th>Crédits</th>
              <th>Bloqué</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              // ... dans <tbody> pour chaque user
              <tr key={u.id}>
                <td className="text-slate-100">{u.email}</td>
                <td className="text-slate-300">{u.username || "—"}</td>
                <td><span className="chip chip-blue">{u.plan || "free"}</span></td>
                <td><span className="chip chip-slate">{u.credits ?? 0}</span></td>

                {/* Bloqué */}
                <td>
                  {u.is_blocked ? (
                    <span className="chip chip-red">Oui</span>
                  ) : (
                    <span className="chip chip-green">Non</span>
                  )}
                </td>

                {/* Actions (dernière colonne → alignée à droite) */}
                <td className="text-right">
                  <div className="action-row justify-end">
                    <button onClick={() => action("add_credit", u.id)} className="btn btn-ghost">+1 💰</button>
                    <button onClick={() => action("remove_credit", u.id)} className="btn btn-ghost">-1 💰</button>
                    <button
                      onClick={() => { if (!confirm(`Supprimer ${u.email} ?`)) return; action("delete_user", u.id); }}
                      className="btn btn-danger" title="Supprimer l’utilisateur"
                    >🗑️</button>
                    <button onClick={() => loadHistory(u.id)} className="btn btn-ghost" title="Historique">📜</button>
                  </div>
                </td>
              </tr>

            ))}

            {users.length === 0 && (
              <tr><td colSpan={6} className="empty-cell">Aucun utilisateur pour le moment.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== HISTORIQUE (carte propre) ===== */}
      {history && (
        <div className="history-card">
          <SectionTitle>📜 Historique de : <span className="text-blue-400">{history.user_id}</span></SectionTitle>

          {history.entries.length === 0 ? (
            <p className="text-slate-400">Aucun achat enregistré.</p>
          ) : (
            <div className="history-list">
              <div className="history-head">
                <span>Date</span><span>Label</span><span className="text-right">Montant</span><span className="text-right">Méthode</span>
              </div>

              {history.entries.map((h, i) => {
                const price = Number(h.price_paid || 0);
                const positive = price > 0;
                const method = (h.method || "inconnu").toLowerCase();

                return (
                  <div key={i} className="history-row">
                    <span className="history-date">{h.date}</span>
                    <span className="history-label" title={h.label}>{h.label}</span>
                    <span className={`history-amount ${positive ? "pos" : "neg"}`}>
                      {positive ? "+" : ""}{price} €
                    </span>
                    <span className={`history-method ${method}`}>
                      {method === "stripe" ? "Stripe" : method === "paypal" ? "PayPal" : method === "crypto" ? "Crypto" : h.method}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
