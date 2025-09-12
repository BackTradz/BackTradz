// components/admin/GlobalHistory.jsx
// ------------------------------------------------------------
// 📜 Historique global (style carte, identique à l'historique user)
// - Route conservée : GET /api/admin/global_history
// - Ajout : limiter à 5 entrées par défaut + bouton "Tout afficher"
// ------------------------------------------------------------
import { useEffect, useState, useMemo } from "react";
import SectionTitle from "../ui/SectionTitle";

export default function GlobalHistory() {
  const [history, setHistory] = useState([]); // liste d’achats (déjà triée desc côté back)
  const [msg, setMsg] = useState("");         // message erreur
  const [showAll, setShowAll] = useState(false); // toggle "Tout afficher"

  const token = localStorage.getItem("apiKey");

  // Chargement (montée initiale)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/global_history", {
          headers: { "X-API-Key": token },
        });
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) throw new Error("Erreur API");
        setHistory(data); // déjà trié desc côté backend
      } catch (err) {
        console.error("❌ Erreur API global_history:", err);
        setMsg("Erreur chargement de l’historique global");
      }
    })();
  }, []);

  // Liste visible selon toggle
  const visible = useMemo(() => (showAll ? history : history.slice(0, 5)), [showAll, history]);

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between">
        <SectionTitle>📜 Historique global des achats</SectionTitle>
        <button
            className="btn btn-warning"
            onClick={async () => {
              if (!confirm("Confirmer le reset de l’historique ? (abos/credits intacts)")) return;
              const res = await fetch("/api/admin/history/reset", {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-API-Key": token },
                body: JSON.stringify({ scope: "all" }) // ou "sales" / "backtests"
              });
              const data = await res.json();
              if (!res.ok) return alert(data?.detail || "Reset KO");
              alert("Historique réinitialisé");
              // recharger la liste
              const r = await fetch("/api/admin/global_history", { headers: { "X-API-Key": token }});
              setHistory(await r.json());
            }}
          >
            Reset historique
          </button>


        {/* Toggle 5 derniers / tout */}
        {history.length > 5 && (
          <button className="btn btn-ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Masquer" : "Tout afficher"} ({history.length})
          </button>
        )}
      </div>

      {msg && <p className="text-red-500 mb-3">{msg}</p>}

      {/* Carte historique (mêmes classes que côté user) */}
      <div className="history-card">
        {history.length === 0 ? (
          <p className="text-slate-400">Aucune transaction pour le moment.</p>
        ) : (
          <div className="history-list">
            <div className="history-head">
              <span>Username</span>
              <span>Date</span>
              <span className="text-right">Montant</span>
              <span className="text-right">Méthode</span>
              <span className="text-right">Label</span>
            </div>

            {visible.map((item, i) => {
            const method = (item.method || "inconnu").toLowerCase();
            const isBacktest = (item.type || "").toLowerCase() === "backtest" || method === "credits";
            const euros = Number(item.price_eur ?? item.price_paid ?? 0);
            const creditsDelta = Number(item.credits_delta ?? (euros < 0 ? euros : 0));

            return (
              <div key={i} className="history-row">
                <span className="history-label" title={item.username}>{item.username}</span>
                <span className="history-date">{item.date}</span>

                <span className={`history-amount ${ (isBacktest || euros < 0) ? "neg" : "pos"}`}>
                  {isBacktest
                    ? `${creditsDelta || -2} crédits`
                    : `${euros > 0 ? "+" : ""}${euros} €`}
                </span>

                <span className={`history-method ${method}`}>
                  {method === "stripe" ? "Stripe" :
                  method === "paypal" ? "PayPal" :
                  method === "crypto" ? "Crypto" : item.method}
                </span>

                <span className="history-label text-right" title={item.label}>
                  {item.label}
                </span>
              </div>
            );
          })}

          </div>
        )}
      </div>
    </div>
  );
}
