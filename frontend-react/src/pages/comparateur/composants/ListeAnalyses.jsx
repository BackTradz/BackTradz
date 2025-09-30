// frontend-react/src/pages/comparateur/composants/ListeAnalyses.jsx
import React from "react";
import { formatPair, formatStrategy } from "../../../lib/labels";


export default function ListeAnalyses({
  loading,
  options,
  selected,
  canSelectMore,
  query,
  setQuery,
  onToggle,
}) {
  const formatTP1 = (v) => {
    if (v == null) return null;
    // Accepte 0.65 OU 65
    const n = Number(v);
    if (Number.isNaN(n)) return null;
    const pct = n <= 1 ? Math.round(n * 100) : Math.round(n);
    return `${pct}%`;
  };

  return (
    <div className="cmp-box">
      <div className="cmp-left-header">
        <input
          className="cmp-search"
          placeholder="🔎 paire, stratégie, TF..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cmp-pill">Mes analyses</div>
      </div>

      {loading ? (
        <div className="cmp-empty">Chargement…</div>
      ) : options.length === 0 ? (
        <div className="cmp-empty">Aucune analyse trouvée.</div>
      ) : (
        <ul className="cmp-list">
          {options.map((o) => {
            const checked = selected.includes(o.id);
            const disabled = !checked && !canSelectMore;

            const trades =
              o.trades_count != null ? o.trades_count :
              o.trades != null ? o.trades : null;

            const tp1 = formatTP1(
              typeof o.winrate_tp1 === "number" ? o.winrate_tp1 :
              typeof o.tp1_winrate === "number" ? o.tp1_winrate :
              o.winrate // au cas où
            );

            const pairLabel = formatPair(o.symbol || o.pair || "");
            const periodUC = (o.timeframe || o.period)
              ? String(o.timeframe || o.period).toUpperCase()
              : null;
            const strategyLabel = o.strategy ? formatStrategy(o.strategy) : null;
 
            return (
              <li
                key={o.id}
                className={`cmp-item ${checked ? "is-checked" : ""} ${disabled ? "is-disabled" : ""}`}
              >
                <label className="cmp-item-row">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => onToggle(o.id)}
                  />

                  <div className="cmp-item-main">
                    <div className="cmp-item-top">
                      <span className="cmp-item-title">
                        {[pairLabel, periodUC, strategyLabel].filter(Boolean).join(" · ")}
                      </span>
                      {trades != null && <span className="cmp-badge">{trades} trades</span>}
                    </div>

                    <div className="cmp-item-sub">
                      <span className="cmp-mono">{pairLabel}</span>
                      {periodUC && <span className="cmp-dot">•</span>}
                      {periodUC && <span className="cmp-mono">{periodUC}</span>}
                      {tp1 && (
                        <>
                          <span className="cmp-dot">•</span>
                          <span>TP1 {tp1}</span>
                        </>
                      )}
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
