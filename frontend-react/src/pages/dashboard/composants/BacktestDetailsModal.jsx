// BacktestDetailsModal.jsx
// Modal de détails backtest (portal + layout compact + métriques Buy/Sell)
// Affiche les métriques renvoyées par /api/user/backtests (clé "metrics")
// Pas de dépendance CSS externe autre que .dbt-modal* (voir section CSS plus bas)

import { useEffect } from "react";
import { createPortal } from "react-dom";

function Line({ label, value }) {
  return (
    <div className="dbt-kpi">
      <div className="dbt-kpi-label">{label}</div>
      <div className="dbt-kpi-value">{value ?? "—"}</div>
    </div>
  );
}
{/*affichage RR 1:1,1:2 etc*/}
function fmtRR(v) {
  if (v === null || v === undefined) return "—";
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `1:${n}`;
}


export default function BacktestDetailsModal({ open, onClose, item = {} }) {
  if (!open) return null; // <<< on n'annule que si fermé
  const {
    symbol,
    timeframe,
    strategy,
    winrate,
    trades,
    metrics = {},
  } = item;

  // Fallbacks sûrs
  const wrGlobal = metrics.winrate_global || winrate || "—";

  const content = (
    <div className="dbt-modal-overlay" onClick={onClose}>
      <div
        className="dbt-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dbt-modal-header">
          <div className="dbt-modal-title">
            <span className="dbt-tag">{symbol}</span>
            <span className="dbt-tag">{timeframe}</span>
            <span className="dbt-title-strategy">{strategy}</span>
          </div>
          <button className="dbt-modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="dbt-modal-grid">
          <Line label="Winrate TP1"   value={wrGlobal} />
          <Line label="Trades"        value={trades ?? "—"} />
          <Line label="Winrate Buy"   value={metrics.buy_winrate} />
          <Line label="Winrate Sell"  value={metrics.sell_winrate} />

          <Line label="% Buy"         value={metrics.pct_buy} />
          <Line label="% Sell"        value={metrics.pct_sell} />
          <Line label="RR TP1 (avg)"  value={fmtRR(metrics.rr_tp1)} />
          <Line label="RR TP2 (avg)"  value={fmtRR(metrics.rr_tp2)} />


          <Line label="SL (count)"    value={metrics.sl ?? "—"} />
          <Line label="TP1 (count)"   value={metrics.tp1 ?? "—"} />
          <Line label="SL Size (avg)" value={metrics.sl_size ?? "—"} />
          <Line label="TP1 Size (avg)" value={metrics.tp1_size ?? "—"} />
        </div>
      </div>
    </div>
  );

  let portalTarget = document.getElementById("dbt-modal-portal");
  if (!portalTarget) {
    portalTarget = document.createElement("div");
    portalTarget.id = "dbt-modal-portal";
    document.body.appendChild(portalTarget);
  }
  return createPortal(content, portalTarget);
}

