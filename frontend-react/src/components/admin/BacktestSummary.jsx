// components/admin/BacktestSummary.jsx
// ------------------------------------------------------------
// 📑 Résumé des backtests (cartes compactes + bouton Détails)
// - Route conservée : GET /api/admin/stats/backtest_summary
// - Filtre par paire + tri
// - Bouton "Détails" (overlay à brancher plus tard)
// ------------------------------------------------------------
import { useEffect, useMemo, useState } from "react";
import SectionTitle from "../ui/SectionTitle";
import CTAButton from "../ui/button/CTAButton";
import AdminInsightsOverlay from "./AdminInsightsOverlay";

// Helpers affichage
function pct(v) {
  if (v === null || v === undefined) return "N/A";
  const n = typeof v === "string" ? parseFloat(v.replace(",", ".")) : Number(v);
  if (!Number.isFinite(n)) return "N/A";
  return `${Math.round(n)}%`;
}
const wrClass = (n) =>
  (n ?? 0) >= 60 ? "wr-good" : (n ?? 0) >= 40 ? "wr-mid" : "wr-bad";

function fmtDateFR(iso) {
  if (!iso || typeof iso !== "string") return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
function fmtPeriod(p) {
  if (!p) return "—";
  const m = String(p).match(/(20\d{2}-\d{2}-\d{2})\s*to\s*(20\d{2}-\d{2}-\d{2})/i);
  return m ? `${fmtDateFR(m[1])} → ${fmtDateFR(m[2])}` : p;
}

export default function BacktestSummary() {
  const [rows, setRows] = useState([]);          // données brutes
  const [err, setErr] = useState("");            // msg erreur
  const [pair, setPair] = useState("ALL");       // filtre symbol
  const [sortKey, setSortKey] = useState("wr_desc"); // tri
  const [open, setOpen] = useState(false);       // état overlay
  const [selected, setSelected] = useState(null);// item sélectionné

  // --- Masquage front-only (persisté localStorage)
  const HKEY = "admin_hidden_backtests_v1";
  const [hidden, setHidden] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(HKEY) || "[]")); } catch { return new Set(); }
  });
  function hideItem(uid) {
    setHidden(prev => {
      const next = new Set(prev);
      next.add(uid);
      try { localStorage.setItem(HKEY, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }

  // --- Pagination front: 20 puis "Afficher plus"
  const [visibleCount, setVisibleCount] = useState(20);
  const showMore = () => setVisibleCount(c => c + 20);

  const token = localStorage.getItem("apiKey");

  // Chargement initial
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats/backtest_summary", {
          headers: { "X-API-Key": token },
        });
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Réponse invalide");
        setRows(data);
      } catch (e) {
        console.error(e);
        setErr("Impossible de charger le résumé des backtests");
      }
    })();
  }, []);

  // Ensemble des paires présentes
  const pairs = useMemo(
    () => Array.from(new Set(rows.map(r => r.symbol).filter(Boolean))),
    [rows]
  );

  // Filtrage + tri + retrait des éléments masqués
  const filtered = useMemo(() => {
    let list = pair === "ALL" ? rows : rows.filter(r => r.symbol === pair);
    switch (sortKey) {
      case "wr_desc": list = [...list].sort((a,b)=>(b.winrate_tp1||0)-(a.winrate_tp1||0)); break;
      case "wr_asc":  list = [...list].sort((a,b)=>(a.winrate_tp1||0)-(b.winrate_tp1||0)); break;
      case "trades_desc": list = [...list].sort((a,b)=>(b.total||0)-(a.total||0)); break;
      case "trades_asc":  list = [...list].sort((a,b)=>(a.total||0)-(b.total||0)); break;
    }
    const computeUid = (bt) =>
      bt?.id || bt?.folder || [bt?.symbol, bt?.timeframe, bt?.strategy, bt?.period].join("|");
    list = list.filter(bt => !hidden.has(computeUid(bt)));
    return list;
   }, [rows, pair, sortKey, hidden]);

  return (
    <div className="mb-10">
      <SectionTitle>📑 Résumé des backtests</SectionTitle>

      {/* Filtres (paire + tri) */}
      <div className="filter-bar">
        <div className="select-group">
          <label className="select-label">Filtrer par paire</label>
          <div className="select-wrap">
            <select
              value={pair}
              onChange={(e) => setPair(e.target.value)}
              className="select-control"
            >
              <option value="ALL">Toutes</option>
              {pairs.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span className="select-caret">▾</span>
          </div>
        </div>

        <div className="select-group">
          <label className="select-label">Trier</label>
          <div className="select-wrap">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
              className="select-control"
            >
              <option value="wr_desc">Winrate ↓</option>
              <option value="wr_asc">Winrate ↑</option>
              <option value="trades_desc">Trades ↓</option>
              <option value="trades_asc">Trades ↑</option>
            </select>
            <span className="select-caret">▾</span>
          </div>
        </div>
      </div>

      {err && <p className="text-red-500">{err}</p>}

      {/* Grid de cartes compactes */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">Aucun backtest trouvé.</p>
      ) : (
        <>
          <div className="dbt-grid">
            {filtered.slice(0, visibleCount).map((bt, i) => (
              <div key={i} className="dbt-card dbt-compact">
                {/* middle (métriques principales) */}
                <div className="dbt-meta dbt-meta-2cols">
                  <div className="dbt-row">
                    <span className="dbt-label">Stratégie</span>
                    <span className="dbt-val dbt-strategy">{bt.strategy || "—"}</span>
                  </div>
                  <div className="dbt-row">
                    <span className="dbt-label">Winrate TP1</span>
                    <span className={`dbt-val ${wrClass(bt.winrate_tp1)}`}>{pct(bt.winrate_tp1)}</span>
                  </div>
                  <div className="dbt-row">
                    <span className="dbt-label">Trades</span>
                    <span className="dbt-val">{bt.total ?? "N/A"}</span>
                  </div>
                </div>

                {/* chips (TP1/TP2/SL counts) */}
                <div className="dbt-stats">
                  <span className="chip chip-green">TP1: {bt.tp1 ?? 0}</span>
                  <span className="chip chip-indigo">TP2: {bt.tp2 ?? 0}</span>
                  <span className="chip chip-red">SL: {bt.sl ?? 0}</span>
                </div>

                {/* footer actions */}
                <div className="dbt-actions">
                  <div className="flex-1">
                    <CTAButton
                      variant="secondary"
                      fullWidth
                      onClick={() => { setSelected(bt); setOpen(true); }}
                    >
                      Détails
                    </CTAButton>
                  </div>
                  <div className="flex-1">
                    {(() => {
                      const m = String(bt.period || "")
                        .replaceAll("_", " ")
                        .match(/(20\d{2}-\d{2}-\d{2})\s*to\s*(20\d{2}-\d{2}-\d{2})/i);
                      const cleanPeriod = m ? `${m[1]}to${m[2]}` : (bt.period || "");
                      const slVal = (bt?.params?.sl_pips ?? bt?.params?.sl ?? 100);
                      const apiKey = localStorage.getItem("apiKey") || "";
                      const dlUrl =
                        `/api/admin/download_xlsx` +
                        `?symbol=${encodeURIComponent(bt.symbol || "")}` +
                        `&timeframe=${encodeURIComponent(bt.timeframe || "")}` +
                        `&strategy=${encodeURIComponent(bt.strategy || "")}` +
                        `&period=${encodeURIComponent(cleanPeriod)}` +
                        `&sl=${encodeURIComponent(slVal)}` +
                        `&apiKey=${encodeURIComponent(apiKey)}`;
                      return (
                        <div className="flex gap-2">
                          <CTAButton href={dlUrl} download variant="primary" fullWidth>
                            📥 XLSX
                          </CTAButton>
                          <CTAButton
                            variant="danger"
                            fullWidth
                            onClick={() =>
                              hideItem(
                                bt.id || bt.folder || [bt.symbol, bt.timeframe, bt.strategy, bt.period].join("|")
                              )
                            }
                            title="Masquer cette carte (front-only)"
                          >
                            🗑️ Masquer
                          </CTAButton>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overlay de détails (porté par AdminInsightsOverlay) */}
          <AdminInsightsOverlay
            open={open && !!selected}
            onClose={() => { setOpen(false); setSelected(null); }}
            item={selected}
          />

          {/* Pagination front (Afficher plus) */}
          {filtered.length > visibleCount && (
            <div className="mt-4 flex justify-center">
              <CTAButton variant="secondary" onClick={showMore}>
                Afficher plus (+20)
              </CTAButton>
            </div>
          )}
        </>
      )}
  </div>
)}
