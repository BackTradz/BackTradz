// components/admin/Stats.jsx
// ------------------------------------------------------------
// 📈 Statistiques globales + filtres + overlay de détails
// - Charge /metrics/overview pour la période sélectionnée (range).
// - Fallback sur /global_stats si l’endpoint principal échoue (compat).
// - KPIs cliquables -> AdminKpiModal (liste détaillée).
// - "Analyses" -> AdminBreakdownModal & AdminAnalyticsModal.
// ------------------------------------------------------------
import { useEffect, useState } from "react";
import SectionTitle from "../ui/SectionTitle";
import AdminKpiModal from "./AdminKpiModal";
import AdminBreakdownModal from "./AdminBreakdownModal";
import AdminAnalyticsModal from "./AdminAnalyticsModal";

// Formatters FR
const nfInt  = new Intl.NumberFormat("fr-FR");
const nfEuro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export default function Stats() {
  const [range, setRange] = useState("day"); // range courant (Jour/Semaine/Mois/Tout)
  const [stats, setStats] = useState(null);  // overview courant
  const [overviewAll, setOverviewAll] = useState(null); // total all-time (pour la tuile "Ventes")
  const [fallback, setFallback] = useState(null);       // compat ancien endpoint
  const [msg, setMsg] = useState("");      // message d’erreur
  const [modal, setModal] = useState({ open:false, kpi:null, title:"" }); // KPI modal
  const [ana, setAna] = useState({ open:false, kind:null, title:"" });    // analytics modal
  const [breakdown, setBreakdown] = useState({ open:false, kind:"revenue_by_day", title:"Analyses avancées" }); // breakdown
  // en haut du fichier (après les imports existants)
  const token = typeof window !== "undefined" ? localStorage.getItem("apiKey") : null;


  // Charge overview pour un range donné (avec fallback legacy)
  async function load(rangeKey) {
    try {
      const res = await fetch(`/api/admin/metrics/overview?range=${rangeKey}`, {
        headers: { "X-API-Key": token },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "metrics/overview");
      setStats(data);
      setMsg("");
    } catch (err) {
      // fallback ancien endpoint
      try {
        const r2 = await fetch("/api/admin/global_stats", { headers: { "X-API-Key": token }});
        const d2 = await r2.json();
        if (!r2.ok) throw new Error(d2?.detail || "global_stats");
        setFallback(d2);
        setMsg("");
      } catch (e2) {
        console.error("❌ Erreur API stats:", e2);
        setMsg("Erreur de connexion ou réponse invalide");
      }
    }
  }

  // Rechargement quand range change
  useEffect(() => { load(range); }, [range]);

  // one-shot: récupère overview all-time pour afficher le "total ventes" absolu sur la tuile "Ventes"
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/metrics/overview?range=all`, {
          headers: { "X-API-Key": token },
        });
        const data = await res.json();
        if (res.ok) setOverviewAll(data);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // une seule fois au montage

  // Merge fallback si nécessaire
  const s = stats || fallback;
  if (msg) return <p className="text-red-500 mt-4">{msg}</p>;
  if (!s) return null;

  // Liste des tuiles KPI
  const items = [
    { key:"sales", label:"Ventes",value: nfEuro.format((overviewAll?.total_sales_eur ?? s.total_sales_eur ?? 0)),icon:"💶", hint:"Somme € (achats)" },
    { key:"credits_bought",   label:"Crédits achetés",  value:nfInt.format(s.total_credits_bought || 0), icon:"🪙", hint:"Hors offerts" },
    { key:"credits_offered",  label:"Crédits offerts",  value:nfInt.format(s.credits_offered || 0), icon:"🎁", hint:"Bonus/mensuel" },
    { key:"backtests",        label:"Backtests",        value:nfInt.format(s.backtests_count || 0), icon:"📊", hint:"Exécutés" },
    { key:"total_users",      label:"Utilisateurs",     value:nfInt.format(s.total_users || 0), icon:"👥", hint:"Total base" },
    { key:"new_users",        label:"Nouveaux",         value:nfInt.format(s.new_users || 0), icon:"✨", hint:"Sur la période" },
    { key:"active_now",       label:"Connectés",        value:nfInt.format(s.active_now || 0), icon:"🟢", hint:"Dernières minutes" },
    // 🆕 TUILE CHURN : suppression compte + désabonnement
    { key:"user_events",      label:"Churn",            value:nfInt.format((s.deleted_users||0) + (s.unsubscribed_users||0)), icon:"⚠️", hint:"Suppr. comptes & désabonnements" },
    { key:"failed_payments", label:"Paiements échoués",value:nfInt.format(s.failed_payments || 0), icon:"⛔",hint:"Nb d'échecs de paiement" },

  ];

  // Ouvre la modale détail selon KPI (titre mapping)
  const openDetails = (key) => {
    const mapTitle = {
      purchases_count: "Détail des ventes",
      total_sales_eur: "Détail des ventes",
      total_credits_bought: "Crédits achetés",
      credits_offered: "Crédits offerts",
      backtests_count: "Backtests",
      new_users: "Nouveaux utilisateurs",
      total_users: "Tous les utilisateurs",
      active_now: "Utilisateurs actifs",
      user_events: "Désabonnements & suppressions",
      failed_payments: "Paiements échoués",
    };

    setModal({
      open: true,
      kpi: key,
      title: mapTitle[key] || "Détails",
    });
  };

async function resetStats() {
  if (!window.confirm("Confirmer le reset des stats ? (aucun abonnement ne sera supprimé)")) return;
  const res = await fetch("/api/admin/metrics/reset", {
    method: "POST",
    headers: { "X-API-Key": token }
  });
  const data = await res.json();
  if (!res.ok) return alert(data?.detail || "Reset KO");
  alert("✅ Stats remises à zéro (ledger purgé)");
  load(range); // recharge l’overview courant
}

async function rebuildStats() {
  if (!window.confirm("Reconstruire le ledger depuis users.json ?")) return;
  const res = await fetch("/api/admin/metrics/rebuild_from_users", {
    method: "POST",
    headers: { "X-API-Key": token }
  });
  const data = await res.json();
  if (!res.ok) return alert(data?.detail || "Rebuild KO");
  alert("✅ Ledger reconstruit depuis users.json");
  load(range);
}
  
  return (
    <div className="mb-10">
      {/* En-tête + bouton Analyses globales */}
      <div className="flex items-center justify-between">
        <SectionTitle>📈 Statistiques globales</SectionTitle>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={() => setBreakdown({ open:true, kind:"revenue_by_day", title:"Analyses avancées" })}
          >
            Global
          </button>
            <button className="btn btn-warning" onClick={resetStats}>Reset stats</button>
            <button className="btn btn-secondary" onClick={rebuildStats}>Rebuild</button>
        </div>
      </div>

      {/* Grille de KPI (cliquables) */}
      <div className="kpi-grid">
         {items.map(it => (
            <button key={it.key} className="kpi-card" onClick={() => openDetails(it.key)}>
            <div className="kpi-icon">{it.icon}</div>
            <div className="kpi-meta">
              <div className="kpi-label">{it.label}</div>
              <div className="kpi-value">{it.value}</div>
              <div className="kpi-hint">{it.hint}</div>
            </div>
          </button>
        ))}
      </div>

      {/* -------- Analyses (cartes au style KPI) -------- */}
      <div className="mt-10">
        <h3 style={{fontSize:20, fontWeight:600, marginBottom:12}}>Analyses</h3>

        <div className="kpi-grid">
          {[
            { kind:"revenue_by_day",              title:"€ par jour",              icon:"📈", accent:"kpi--primary" },
            { kind:"revenue_by_hour",             title:"€ par heure",             icon:"🕒", accent:"kpi--blue" },
            { kind:"sales_by_method",             title:"Paiements par méthode",   icon:"💳", accent:"kpi--slate" },
            { kind:"credits_by_method",           title:"Crédits par méthode",     icon:"🪙", accent:"kpi--amber" },
            { kind:"backtests_by_hour_heatmap",   title:"Backtests Heatmap",       icon:"🔥", accent:"kpi--violet" },
            { kind:"backtests_duration_histogram",title:"Durée Backtests",         icon:"⏱️", accent:"kpi--green" },
            { kind:"active_users_daily",          title:"Utilisateurs actifs",     icon:"👥", accent:"kpi--slate" },
            { kind:"dau_wau_mau",                 title:"DAU / WAU / MAU",         icon:"📊", accent:"kpi--primary" },
            { kind:"top_customers",               title:"Top clients",             icon:"🏆", accent:"kpi--amber" },
            { kind:"backtests_by_strategy",       title:"Backtests / Stratégie",   icon:"🧠", accent:"kpi--violet" },
            { kind:"backtests_by_symbol",         title:"Backtests / Symbole",     icon:"🔣", accent:"kpi--blue" },
            { kind:"backtests_by_timeframe",      title:"Backtests / TF",          icon:"🧭", accent:"kpi--slate" },
          ].map(card => (
            <button
              key={card.kind}
              className={`kpi-card ${card.accent}`}
              onClick={() => setAna({ open:true, kind:card.kind, title:card.title })}
              style={{ textAlign:"left" }}
            >
              <div className="kpi-icon">{card.icon}</div>
              <div className="kpi-content">
                <div className="kpi-label">{card.title}</div>
                <div className="kpi-hint">Cliquer pour détailler</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Modales (détails / breakdown / analytics) */}
      {modal.open && (
        <AdminKpiModal open={modal.open} kpi={modal.kpi} title={modal.title} onClose={()=>setModal({open:false})} />
      )}
      {breakdown.open && (
        <AdminBreakdownModal
          title={breakdown.title}
          kind={breakdown.kind}
          range={range}
          onClose={() => setBreakdown({ ...breakdown, open:false })}
        />
      )}
      {ana.open && (
        <AdminAnalyticsModal
          title={ana.title}
          kind={ana.kind}
          range={range}
          onClose={() => setAna({ open:false, kind:null, title:"" })}
        />
      )}
    </div>
  );
}
