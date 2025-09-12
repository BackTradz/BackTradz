// components/admin/AdminDetailsModal.jsx
// ======================================================================
// Overlay Backtest (Admin) — version enrichie, alignée Dashboard
//
// Affiche :
//   - Winrate TP1, Trades, TP1/TP2/SL (counts)
//   - Répartition "TP2 / TP1 seul / SL" (somme = 100, évite double-compte)
//   - RR moyens (TP1 / TP2)
//   - Tailles moyennes (SL, TP1, TP2) en pips
//   - Split Buy/Sell (winrates + volumes)
// Robustesse :
//   - Tolère que les métriques soient au 1er niveau du JSON OU dans item.metrics
//   - Tolère des clés "exotiques" issues d'Excel : "SL Size (avg, pips)", "TP Size (avg,pips)"
//     (et variantes proches). Si TP global uniquement, on l’utilise pour TP1/TP2 moyens.
//   - Aucune requête API ici : le composant affiche ce que BacktestSummary lui passe.
// ======================================================================

import { createPortal } from "react-dom";


// ---------- Helpers de formatage ----------
// [BTZ] pct : parse une valeur numérique tolérante (ex: "76,3") -> nombre ou null.
function pct(v) {
  if (v === null || v === undefined) return null;
  const n = typeof v === "string" ? parseFloat(String(v).replace(",", ".")) : Number(v);
  return Number.isFinite(n) ? n : null;
}
// [BTZ] pctText : affichage lisible en pourcentage (ou tiret).
const pctText = (n, dash = "—") => (n == null ? dash : `${Math.round(n)}%`);

// [BTZ] firstKey : renvoie la première valeur définie parmi une liste de clés possibles
const firstKey = (obj, keys) => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return null;
};

// [BTZ] fmtPips : formate une valeur (numérique ou chaîne) en "XXX pips" ; sinon "—"
const fmtPips = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return `${Math.round(v)} pips`;
  const s = String(v).trim().replace(",", ".");
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return "—";
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? `${Math.round(n)} pips` : "—";
};

// ---------- Petite carte KPI ----------
function Line({ label, value }) {
  return (
    <div className="dbt-kpi">
      <div className="dbt-kpi-label">{label}</div>
      <div className="dbt-kpi-value">{value ?? "—"}</div>
    </div>
  );
}

export default function AdminDetailsModal({ open, onClose, item = {} }) {
  if (!open) return null;

  // 1) Déstructure les champs "simples" (toujours présents côté admin summary)
  const {
    symbol,
    timeframe,
    strategy,
    period,

    // principaux
    winrate_tp1,
    winrate, // fallback éventuel si le nom diffère
    total,
    tp1,
    tp2,
    sl,

    // si l'API fournit déjà des % (on ne s’en sert qu’en fallback)
    tp1_rate,
    tp2_rate,
    sl_rate,

    // métriques éventuelles au 1er niveau (certains exports les mettent là)
    rr_tp1: rr_tp1_top,
    rr_tp2: rr_tp2_top,
    tp1_size: tp1_size_top,
    tp2_size: tp2_size_top,
    sl_size: sl_size_top,
    buy_winrate: buy_winrate_top,
    sell_winrate: sell_winrate_top,
    pct_buy: pct_buy_top,
    pct_sell: pct_sell_top,

    // conteneur optionnel des métriques
    metrics = {},
  } = item;

  // 2) Winrate principal (priorise winrate_tp1 sinon winrate)
  const wr = pct(winrate_tp1) ?? pct(winrate);

  // 3) Tailles moyennes en pips : robustesse nommage (haut de JSON, metrics, colonnes Excel)
  const sl_size_raw = firstKey(
    { ...metrics, ...item },
    [
      "sl_size",
      "sl_pips",
      "sl_points",
      "sl_size_avg",
      "SL Size (avg, pips)",
      "SL Size (avg,pips)",
      "avg_sl",
      "avg_sl_pips",
      "mean_sl_pips",
    ]
  );

  const tp_size_global_raw = firstKey(
    { ...metrics, ...item },
    [
      "TP Size (avg, pips)",
      "TP Size (avg,pips)",
      "tp_size",
      "tp_pips",
      "tp_points",
      "tp_size_avg",
      "avg_tp",
      "avg_tp_pips",
      "mean_tp_pips",
    ]
  );

  const tp1_size_raw =
    firstKey(
      { ...metrics, ...item },
      ["tp1_size", "tp1_pips", "tp1_points", "tp1_size_avg", "avg_tp1", "avg_tp1_pips", "mean_tp1_pips"]
    ) ?? tp_size_global_raw;

  // 4) Risk/Reward (moyennes)
  const rr_tp1 = rr_tp1_top ?? metrics.rr_tp1 ?? null;
  const rr_tp2 = rr_tp2_top ?? metrics.rr_tp2 ?? null;

  // 5) Split Buy/Sell
  const buy_wr = pct(buy_winrate_top ?? metrics.buy_winrate);
  const sell_wr = pct(sell_winrate_top ?? metrics.sell_winrate);
  const pct_buy = pct(pct_buy_top ?? metrics.pct_buy);
  const pct_sell =
    pct_sell_top ?? metrics.pct_sell ?? (pct_buy != null ? Math.max(0, 100 - pct_buy) : null);

  // 6) Répartition résultats — somme = 100 (TP2, TP1 seul, SL)
  let rTP2 = null,
    rTP1_only = null,
    rSL = null;

  const T = Number(total || 0);
  if (T > 0) {
    const tp1Count = Number(tp1 || 0);
    const tp2Count = Number(tp2 || 0);
    const slCount = Number(sl || 0);

    const tp1Only = Math.max(0, tp1Count - tp2Count); // enlève la part TP2 de TP1

    rTP2 = Math.round((tp2Count / T) * 100);
    rTP1_only = Math.round((tp1Only / T) * 100);
    rSL = Math.max(0, 100 - rTP2 - rTP1_only); // ferme à 100 pour éviter dérive
  } else {
    // Fallback : affiche directement les % s’ils sont fournis
    rTP1_only = pct(tp1_rate);
    rTP2 = pct(tp2_rate);
    rSL = pct(sl_rate);
  }

  // 7) Prépare/assure la cible Portal (div dédiée montée dans body)
  const portalId = "admin-dbt-modal-portal";
  let portalTarget = document.getElementById(portalId);
  if (!portalTarget) {
    portalTarget = document.createElement("div");
    portalTarget.id = portalId;
    document.body.appendChild(portalTarget);
  }

  // 8) Rendu overlay (fermeture par clic backdrop ou bouton)
  return createPortal(
    <div className="dbt-modal-overlay" onClick={onClose}>
      <div
        className="dbt-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (tags) */}
        <div className="dbt-modal-header">
          <div className="dbt-modal-title">
            <span className="dbt-tag">{symbol || "—"}</span>
            <span className="dbt-tag">{timeframe || "—"}</span>
            {strategy && <span className="dbt-title-strategy">{strategy}</span>}
          </div>
          <button className="dbt-modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {period && <div className="dbt-modal-period">{period}</div>}

        {/* KPIs principaux */}
        <div className="dbt-modal-grid">
          <Line label="Winrate TP1" value={pctText(wr)} />
          <Line label="Trades" value={total ?? "—"} />
          <Line label="TP1 (count)" value={tp1 ?? metrics.tp1 ?? "—"} />
          <Line label="TP2 (count)" value={tp2 ?? metrics.tp2 ?? "—"} />
          <Line label="SL (count)" value={sl ?? metrics.sl ?? "—"} />
          <Line label="RR TP1 (moy.)" value={rr_tp1 ? `1:${rr_tp1}` : "—"} />
          <Line label="RR TP2 (moy.)" value={rr_tp2 ? `1:${rr_tp2}` : "—"} />
          {/* Tailles en pips (formatage robuste) */}
          <Line label="SL Size (avg)"  value={fmtPips(sl_size_raw)} />
          <Line label="TP1 Size (avg)" value={fmtPips(tp1_size_raw)} />
        </div>

        {/* Répartition (chips) */}
        <div className="dbt-modal-sections">
          <div className="dbt-section" style={{gridColumn: "1 / -1"}}>
            <div className="dbt-section-title">Répartition résultats</div>
            <div className="dbt-distrib">
              <span className="chip chip-indigo">TP2: {rTP2 != null ? `${rTP2}%` : "—"}</span>
              <span className="chip chip-green">TP1 seul: {rTP1_only != null ? `${rTP1_only}%` : "—"}</span>
              <span className="chip chip-red">SL: {rSL != null ? `${rSL}%` : "—"}</span>
            </div>
          </div>
        </div>

      </div>
    </div>,
    portalTarget
  );
}
