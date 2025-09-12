// src/components/dashboard/BacktestList.jsx
import { useEffect, useMemo, useState } from "react";
import { myBacktests } from "../../sdk/userApi";
import DashboardBacktestCard from "../dashboard/DashboardBacktestCard.jsx";

// composant reutilisable 
import Select from "../ui/select/Select";
import TopProgress from "../ui/progressbar/TopProgress";

// 🆕 helpers labels
import { pairsToOptions } from "../../lib/labels";

export default function BacktestList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [pairFilter, setPairFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("winrate_desc");
  const [q, setQ] = useState("");

  //affichage limite//
  const [limit, setLimit] = useState(9);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);          
        const data = await myBacktests(); // /api/user/backtests
        setItems(Array.isArray(data) ? data : data.items || []);
      } catch (e) {
        setErr(e.message || "Erreur de chargement des backtests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

   // reset la limite si les filtres changent
  useEffect(() => { setLimit(9); }, [pairFilter, q, sortBy]);

  const pairs = useMemo(
   () => Array.from(new Set(items.map((i) => i.symbol).filter(Boolean))),
   [items]
 );
 const pairOptions = useMemo(() => pairsToOptions(pairs), [pairs]);

  const sortOptions = useMemo(
    () => [
      { value: "winrate_desc", label: "Winrate ↓" },
      { value: "winrate_asc", label: "Winrate ↑" },
      { value: "trades_desc", label: "Trades ↓" },
      { value: "trades_asc", label: "Trades ↑" },
      { value: "symbol_az", label: "Paire A→Z" },
    ],
    []
  );

  const filtered = useMemo(() => {
    let arr = pairFilter === "ALL" ? items : items.filter((i) => i.symbol === pairFilter);
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      arr = arr.filter(
        (i) =>
          (i.symbol || "").toLowerCase().includes(s) ||
          (i.strategy || "").toLowerCase().includes(s) ||
          (i.timeframe || "").toLowerCase().includes(s)
      );
    }
    const parsePct = (v) =>
      typeof v === "string" ? parseFloat(v.replace("%", "").replace(",", ".")) : v || 0;
    const key = sortBy;
    arr = [...arr].sort((a, b) => {
      if (key === "winrate_desc") return parsePct(b.winrate) - parsePct(a.winrate);
      if (key === "winrate_asc") return parsePct(a.winrate) - parsePct(b.winrate);
      if (key === "trades_desc") return (b.trades || 0) - (a.trades || 0);
      if (key === "trades_asc") return (a.trades || 0) - (b.trades || 0);
      if (key === "symbol_az") return (a.symbol || "").localeCompare(b.symbol || "");
      return 0;
    });
    return arr;
  }, [items, pairFilter, q, sortBy]);


  if (err) return <div className="state error">❌ {err}</div>;

  const visible = filtered.slice(0, limit);
  const canShowMore = filtered.length > limit;

return (
  <>
    {/* Barre fixe en haut pendant le fetch */}
    <TopProgress active={loading} height={3} zIndex={10000} />

    {/* TOOLBAR + Filtres */}
    <div className="bt-toolbar">
      <div className="bt-ctrl">
        <label className="sr-only" htmlFor="bt-pair">Filtrer par paire</label>
        <Select
          id="bt-pair"
          value={pairFilter}
          onChange={setPairFilter}
          options={pairOptions}
          size="md"
          variant="solid"
          fullWidth
          data-inline-label="Paire"
        />
      </div>

      <div className="bt-ctrl bt-grow">
         <label className="sr-only" htmlFor="bt-search">Rechercher</label>
        <div className="bt-input-wrap">
          <span className="bt-input-ico">🔎</span>
          <input
            className="bt-input"
            placeholder="paire, stratégie, TF…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="bt-ctrl">
        <label className="sr-only" htmlFor="bt-sort">Trier</label>
        <Select
          id="bt-sort"
          value={sortBy}
          onChange={setSortBy}
          options={sortOptions}
          size="md"
          variant="solid"
          fullWidth
          data-inline-label="Tri"
        />
      </div>
    </div>

    {/* États d'affichage */}
    {loading ? null : !items.length ? (
      <div className="state">
        <p>Aucun backtest pour l’instant.</p>
        <ul>
          <li>Lance une analsye depuis la page <b>Backtest</b>.</li>
          <li>pour voir tes résultats détaillés (heures, sessions, paires, journées).</li>
        </ul>
      </div>
    ) : (
      <>
        <div className="cards-grid">
          {visible.map((bt, i) => (
            <DashboardBacktestCard
              key={bt.id || i}
              bt={bt}
              onDeleted={(folder) => setItems((prev) => prev.filter((x) => x.folder !== folder))}
            />
          ))}
        </div>

        {/* Bouton Afficher plus */}
        {canShowMore && (
          <div className="list-more reveal-in">
            <button
              className="dbt-btn dbt-neutral"
              onClick={() => setLimit((l) => l + 9)}
            >
              Afficher plus
            </button>
            <div className="list-more-meta">
              {visible.length} / {filtered.length}
            </div>
          </div>
        )}
      </>
    )}
  </>
);
}