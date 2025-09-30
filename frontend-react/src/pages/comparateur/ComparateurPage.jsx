// frontend-react/src/pages/comparateur/ComparateurPage.jsx
import { useEffect, useMemo, useState } from "react";
import { fetchCompareOptions, fetchCompareData } from "../../sdk/compareApi";
import "./comparateur.css";
import { useLocation } from "react-router-dom";
import CompareChart from "./composants/CompareChart";
import ListeAnalyses from "./composants/ListeAnalyses";

const METRICS = [
  { value: "session", label: "Sessions (Asia/London/NY)" },
  { value: "day", label: "Jours (Mon..Sun)" },
  { value: "hour", label: "Heures (00..23)" },
  { value: "winrate_tp1", label: "Winrate TP1 (global)" },
  { value: "winrate_tp2", label: "Winrate TP2 (global)" },
  { value: "trades_count", label: "Nb de trades (global)" },
  { value: "sl_rate", label: "Taux de SL (global)" },
];

const CHART_TYPES = [
  { value: "bar", label: "Barres" },
  { value: "line", label: "Linéaire" },
  { value: "radar", label: "Radar" },
];

export default function ComparateurPage() {
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState([]); // [{id,label,pair,period,...}]
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]); // [ids]
  const [metric, setMetric] = useState("session");
  const [chartType, setChartType] = useState("bar");
  const [data, setData] = useState(null); // { metric, buckets, series, ...}
  const [error, setError] = useState("");
  const location = useLocation();

  // Charger les options (analyses de l'user)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchCompareOptions();
        if (!mounted) return;
        setOptions(res?.items || []);
        // Pré-sélection par query ?ids=a,b,c
        const params = new URLSearchParams(location.search);
        const idsStr = params.get("ids");
        if (idsStr) {
          const want = idsStr.split(",").map((s) => s.trim()).filter(Boolean);
          const exist = new Set((res?.items || []).map((o) => o.id));
          const picked = want.filter((id) => exist.has(id)).slice(0, 4);
          if (picked.length) setSelected(picked);
        }
      } catch (e) {
        setError("Impossible de charger vos analyses.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // Filtre textuel simple (pair, label, période)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      [o.label, o.pair, o.period].some((x) =>
        String(x || "").toLowerCase().includes(q)
      )
    );
  }, [options, query]);

  const canSelectMore = selected.length < 4;

  function toggle(id) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
    } else if (canSelectMore) {
      setSelected([...selected, id]);
    }
  }

  // Charger les séries quand sélection/metric changent
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      setError("");
      setData(null);
      if (selected.length === 0) return;

      try {
        const res = await fetchCompareData({
          analysis_ids: selected,
          metric,
          normalize: false,
        });
        if (!mounted) return;
        setData(res);
      } catch (e) {
        setError("Erreur lors du chargement des données.");
      }
    }
    loadData();
    return () => (mounted = false);
  }, [selected, metric]);

  return (
    <div className="cmp-page">
      <div className="cmp-header">
        <div>
          <h1 className="cmp-title">Comparateur</h1>
          <p className="cmp-sub">
            Sélectionne jusqu’à 4 analyses depuis ton dashboard pour les comparer
            sur une métrique (sessions, jours, heures ou global).
          </p>
        </div>
        <div className="cmp-counter">
          <span>{selected.length}</span>/<span>4</span> sélectionnées
        </div>
      </div>

      <div className="cmp-content">
        {/* Colonne gauche : sélecteur */}
        <section className="cmp-left">
          <ListeAnalyses
            loading={loading}
            options={filtered}
            selected={selected}
            canSelectMore={canSelectMore}
            query={query}
            setQuery={setQuery}
            onToggle={toggle}
          />
        </section>

        {/* Colonne droite : contrôles + graphe */}
        <section className="cmp-right">
          <div className="cmp-box cmp-tools">
            <div className="cmp-selects">
              <div className="cmp-select">
                <label>Type</label>
                <select value={chartType} onChange={(e) => setChartType(e.target.value)}>
                  {CHART_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="cmp-select">
                <label>Métrique</label>
                <select value={metric} onChange={(e) => setMetric(e.target.value)}>
                  {METRICS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="cmp-box cmp-chart">
            {!data && !error && selected.length === 0 && (
              <div className="cmp-empty">Sélectionne 1 à 4 analyses pour afficher le graphique.</div>
            )}
            {!data && error && <div className="cmp-error">{error}</div>}

            {/* Placeholder graphique: table lisible (remplaçable par ton composant chart) */}
            {data && (
              <>
                <div className="cmp-chart-head">
                  <div className="cmp-chart-title">
                    {data.metric === "session" && "Comparaison par session"}
                    {data.metric === "day" && "Comparaison par jour"}
                    {data.metric === "hour" && "Comparaison par heure"}
                    {["winrate_tp1","winrate_tp2","trades_count","sl_rate"].includes(data.metric) && "Comparaison globale"}
                  </div>
                  <div className="cmp-legend">
                    {data.series.map((s, i) => (
                      <span key={s.analysis_id} className={`cmp-legend-pill c${(i % 6) + 1}`}>
                        {s.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="cmp-table-wrap">
                  <table className="cmp-table">
                    <thead>
                      <tr>
                        <th>{data.metric}</th>
                        {data.series.map((s) => (
                          <th key={s.analysis_id}>{s.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.buckets.map((b, rowIdx) => (
                        <tr key={b}>
                          <td className="cmp-bucket">{b}</td>
                          {data.series.map((s) => {
                            const v = s.values[rowIdx];
                            return (
                              <td key={s.analysis_id + "_" + rowIdx}>
                                {v == null
                                  ? "—"
                                  : data.value_type === "percentage"
                                  ? `${Math.round(v * 100)}%`
                                  : Math.round(v)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  {/*Chart*/}
                <div className="cmp-chart-canvas">
                  <CompareChart
                    type={chartType}
                    buckets={data.buckets}
                    series={data.series.map((s) => ({
                      label: s.label,
                      values: s.values,
                    }))}
                    valueType={data.value_type}
                    precision={data.precision}
                    height={360}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
