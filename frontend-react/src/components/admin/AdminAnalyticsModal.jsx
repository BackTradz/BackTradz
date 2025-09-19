import { useEffect, useState } from "react";
import { API_BASE } from "../../sdk/apiClient";
/**
 * AdminAnalyticsModal
 * ------------------------------------------------------------------
 * 📊 Modale d’analytique “riches” (dont Heatmap jour×heure)
 * - `title`   : titre affiché dans la modale.
 * - `kind`    : type d’analyse (ex: "backtests_by_hour_heatmap", "revenue_by_day"...).
 * - `range`   : plage temporelle (day|week|month|all|custom) — défaut "day".
 * - `onClose` : callback fermeture.
 *
 * 🔌 API consommée
 * - GET /api/admin/metrics/breakdown?kind=...&range=...&start=YYYY-MM-DD&end=YYYY-MM-DD
 *   (start/end utilisés seulement si range=custom)
 *
 * 🧠 Points clés d’implémentation
 * - State "rows" : données tabulaires pour rendre le tableau principal.
 * - State "heatMeta" : calculs additionnels pour la heatmap (totaux colonnes & lignes, max, grand total).
 * - State "drill" : si heatmap, clic cellule => chargement liste de backtests ciblés via
 *                   /api/admin/metrics/details?kpi=backtests&range=... (filtrés en front par (jour,heure)).
 * - Helpers range custom : formattage dates & déclencheur `applyNow`.
 *
 * 🧩 Accessibilité / UX
 * - Table responsive simple.
 * - Heatmap : intensité par alpha CSS calculée via cellAlpha(v, max).
 * - Drilldown list affichée sous le tableau.
 *
 * ⚠️ [BTZ-DEPLOY]
 * - Requiert header "X-API-Key" avec token localStorage.apiKey.
 * - Les clés "kind" côté backend doivent correspondre à celles utilisées ici.
 * - Timezone UI/Back cohérente pour interpréter les "hours".
 */



export default function AdminAnalyticsModal({ title, kind, range = "day", onClose }) {
  const token = localStorage.getItem("apiKey");

  // Données / statut
  const [rows, setRows] = useState([]);   // ← contenu tabulaire principal
  const [msg, setMsg] = useState("");     // ← message d’erreur simple

  // Filtres période (UI) — "r" = range courant ; s/e = dates si custom ; custom = toggle
  const [r, setR] = useState(range);
  const [s, setS] = useState("");
  const [e, setE] = useState("");
  const [custom, setCustom] = useState(false);

  // META pour heatmap (totaux + max pour l’intensité visuelle)
  const [heatMeta, setHeatMeta] = useState({
    colTotals: Array(24).fill(0), // totaux par heure (0..23)
    rowTotals: [],                // totaux par jour (Lun..Dim)
    grand: 0,                     // grand total
    max: 0,                       // valeur max d’une cellule (pour normaliser alpha)
  });

  // Drilldown (ouverture + titre + liste des backtests ciblés)
  const [drill, setDrill] = useState({ open: false, title: "", list: [] });

  // map JS getDay() (0=Dim..6=Sam) -> index heatmap (0=Lun..6=Dim)
  // (on veut une heatmap qui commence par Lundi)
  const jsToHeatIdx = (jsDay) => (jsDay + 6) % 7;

  // Intensité d’une case (alpha 0..1) — ajoute un plancher minimal pour visibilité
  const cellAlpha = (v, max) => (max > 0 ? 0.08 + 0.42 * (v / max) : 0);

  // -------- API helpers --------
  function buildUrl(rr, ss, ee) {
    // Construit l’URL de breakdown selon range + dates custom
    const q = new URLSearchParams({ kind, range: rr });
    if (rr === "custom") {
      if (ss) q.append("start", ss);
      if (ee) q.append("end", ee);
    }
    return `${API_BASE}/api/admin/metrics/breakdown?${q.toString()}`;
  }

  async function fetchData(rr, ss, ee) {
    // Charge le breakdown principal et calcule la meta heatmap si besoin
    try {
      const res = await fetch(buildUrl(rr, ss, ee), { headers: { "X-API-Key": token } });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("API breakdown");

      setRows(data);
      setMsg("");

      // Calculs supplémentaires pour la heatmap jour×heure
      if (kind === "backtests_by_hour_heatmap") {
        const colTotals = Array(24).fill(0);
        const rowTotals = data.map((r) => {
          const t = (r.hours || []).reduce((a, b) => a + (b || 0), 0);
          (r.hours || []).forEach((v, h) => (colTotals[h] += v || 0));
          return t;
        });
        const grand = colTotals.reduce((a, b) => a + b, 0);
        const max = Math.max(0, ...data.flatMap((r) => r.hours || [0]));
        setHeatMeta({ colTotals, rowTotals, grand, max });
      } else {
        // Sinon, meta neutre
        setHeatMeta({ colTotals: Array(24).fill(0), rowTotals: [], grand: 0, max: 0 });
      }
    } catch (err) {
      console.error(err);
      setMsg("Erreur de chargement");
      setRows([]);
      setHeatMeta({ colTotals: Array(24).fill(0), rowTotals: [], grand: 0, max: 0 });
    }
  }

  // Drilldown: récupère la liste des backtests de la période, puis filtre client par (dow,hour)
  async function openDrill(dow, hour) {
    try {
      const rr = custom ? "custom" : r;
      const q = new URLSearchParams({ kpi: "backtests", range: rr });
      if (rr === "custom") {
        if (s) q.append("start", s);
        if (e) q.append("end", e);
      }
      const res = await fetch(`${API_BASE}/api/admin/metrics/details?${q.toString()}`, {
        headers: { "X-API-Key": token },
      });
      const data = await res.json();

      // Filtrage par cellule cliquée : Jour (dow 0..6, Lun..Dim) × Heure (0..23)
      const list = (Array.isArray(data) ? data : []).filter((row) => {
        if (!row.date) return false;
        const d = new Date(row.date.replace(" ", "T"));
        return jsToHeatIdx(d.getDay()) === dow && d.getHours() === hour;
      });

      setDrill({
        open: true,
        title: `Backtests — ${["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][dow]} ${String(hour).padStart(
          2,
          "0"
        )}h`,
        list,
      });
    } catch (e) {
      console.error(e);
      setDrill({ open: true, title: "Erreur de chargement", list: [] });
    }
  }

  // -------- Helpers période --------
  // Format "YYYY-MM-DD"
  const fmtDate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const todayStr = () => fmtDate(new Date());
  const daysAgoStr = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return fmtDate(d);
  };
  const applyNow = (rr, ss, ee) => fetchData(rr === "custom" ? "custom" : rr, ss, ee);

  // init: charge la vue initiale selon `range`
  useEffect(() => {
    fetchData(r, s, e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- Rendus d’entêtes (thead) selon `kind` --------
  const Thead = () => {
    switch (kind) {
      case "sales_by_method":
        return (
          <tr>
            <th>Méthode</th>
            <th>Nombre</th>
            <th>Total (€)</th>
          </tr>
        );
      case "credits_by_method":
        return (
          <tr>
            <th>Méthode</th>
            <th>Nombre</th>
            <th>Crédits</th>
          </tr>
        );
      case "revenue_by_day":
        return (
          <tr>
            <th>Jour</th>
            <th>Revenu (€)</th>
          </tr>
        );
      case "revenue_by_hour":
        return (
          <tr>
            <th>Heure</th>
            <th>Revenu (€)</th>
          </tr>
        );
      case "backtests_by_strategy":
      case "backtests_by_symbol":
      case "backtests_by_timeframe":
        return (
          <tr>
            <th>Clé</th>
            <th>Compte</th>
          </tr>
        );
      case "backtests_by_hour_heatmap":
        // Entête heatmap : colonnes 0..23 + total ligne
        return (
          <tr>
            <th>Jour \ Heure</th>
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h}>{h}</th>
            ))}
            <th>Total</th>
          </tr>
        );
      case "backtests_duration_histogram":
        return (
          <tr>
            <th>Bucket</th>
            <th>Count</th>
          </tr>
        );
      case "credits_flow":
        return (
          <tr>
            <th>Jour</th>
            <th>Entrants</th>
            <th>Sortants</th>
            <th>Net</th>
          </tr>
        );
      case "active_users_daily":
        return (
          <tr>
            <th>Jour</th>
            <th>Actifs</th>
          </tr>
        );
      case "dau_wau_mau":
        return (
          <tr>
            <th>Métrique</th>
            <th>Valeur</th>
          </tr>
        );
      case "top_customers":
        return (
          <tr>
            <th>Utilisateur</th>
            <th>Commandes</th>
            <th>Ventes (€)</th>
            <th>Crédits</th>
          </tr>
        );
      default:
        return (
          <tr>
            <th>Clé</th>
            <th>Valeur</th>
          </tr>
        );
    }
  };

  // -------- Rendu d’une ligne de tbody selon `kind` --------
  const Row = (r, i) => {
    switch (kind) {
      case "sales_by_method":
        return (
          <tr key={i}>
            <td>{r.method}</td>
            <td>{r.count}</td>
            <td>{Math.round(r.total_eur)}</td>
          </tr>
        );
      case "credits_by_method":
        return (
          <tr key={i}>
            <td>{r.method}</td>
            <td>{r.count}</td>
            <td>{r.credits}</td>
          </tr>
        );
      case "revenue_by_day":
        return (
          <tr key={i}>
            <td>{r.x}</td>
            <td>{Math.round(r.y)}</td>
          </tr>
        );
      case "revenue_by_hour":
        return (
          <tr key={i}>
            <td>{String(r.hour).padStart(2, "0")}h</td>
            <td>{Math.round(r.total_eur)}</td>
          </tr>
        );
      case "backtests_by_strategy":
      case "backtests_by_symbol":
      case "backtests_by_timeframe":
        return (
          <tr key={i}>
            <td>{r.key}</td>
            <td>{r.count}</td>
          </tr>
        );
      case "backtests_duration_histogram":
        return (
          <tr key={i}>
            <td>{r.bucket}</td>
            <td>{r.count}</td>
          </tr>
        );
      case "credits_flow":
        return (
          <tr key={i}>
            <td>{r.day}</td>
            <td>{r.in}</td>
            <td>{r.out}</td>
            <td>{r.net}</td>
          </tr>
        );
      case "active_users_daily":
        return (
          <tr key={i}>
            <td>{r.x}</td>
            <td>{r.y}</td>
          </tr>
        );
      case "dau_wau_mau":
        return (
          <tr key={i}>
            <td>{r.metric}</td>
            <td>{r.count}</td>
          </tr>
        );
      case "top_customers":
        return (
          <tr key={i}>
            <td>{r.user}</td>
            <td>{r.orders}</td>
            <td>{Math.round(r.sales_eur)}</td>
            <td>{r.credits}</td>
          </tr>
        );
      default:
        return (
          <tr key={i}>
            <td>—</td>
            <td>—</td>
          </tr>
        );
    }
  };

  return (
    <div className="adm-modal">
      {/* Backdrop cliquable pour fermer */}
      <div className="adm-modal__backdrop" onClick={onClose}></div>

      {/* Panneau principal */}
      <div className="adm-modal__panel">
        <div className="adm-modal__head">
          <h3>{title}</h3>

          {/* Toolbar de filtrage par période (range + custom) */}
          <div className="adm-toolbar">
            <button
              className={`btn ${!custom && r === "day" ? "btn-outline" : ""}`}
              onClick={() => {
                setCustom(false);
                setR("day");
                applyNow("day", s, e);
              }}
            >
              Jour
            </button>
            <button
              className={`btn ${!custom && r === "week" ? "btn-outline" : ""}`}
              onClick={() => {
                setCustom(false);
                setR("week");
                applyNow("week", s, e);
              }}
            >
              Semaine
            </button>
            <button
              className={`btn ${!custom && r === "month" ? "btn-outline" : ""}`}
              onClick={() => {
                setCustom(false);
                setR("month");
                applyNow("month", s, e);
              }}
            >
              Mois
            </button>
            <button
              className={`btn ${!custom && r === "all" ? "btn-outline" : ""}`}
              onClick={() => {
                setCustom(false);
                setR("all");
                applyNow("all", s, e);
              }}
            >
              Tout
            </button>

            {/* Mode "Custom" (saisie de dates + fetch auto) */}
            <button
              className={`btn ${custom ? "btn-outline" : ""}`}
              onClick={() => {
                const next = !custom;
                setCustom(next);
                if (next) {
                  const ns = s || daysAgoStr(30);
                  const ne = e || todayStr();
                  setS(ns);
                  setE(ne);
                  applyNow("custom", ns, ne);
                } else {
                  applyNow(r || "day", s, e);
                }
              }}
            >
              Custom
            </button>

            {/* Champs date lorsque custom actif */}
            {custom && (
              <>
                <label>Du</label>
                <input
                  type="date"
                  value={s}
                  onChange={(ev) => {
                    const ns = ev.target.value;
                    setS(ns);
                    applyNow("custom", ns, e);
                  }}
                />
                <label>Au</label>
                <input
                  type="date"
                  value={e}
                  onChange={(ev) => {
                    const ne = ev.target.value;
                    setE(ne);
                    applyNow("custom", s, ne);
                  }}
                />
              </>
            )}

            {/* Badge contexte (texte léger) */}
            <span style={{ marginLeft: 12, opacity: 0.8, fontSize: 12 }}>
              {custom
                ? s && e
                  ? `Du ${s} au ${e}`
                  : "Période personnalisée"
                : `Filtre: ${r === "day" ? "Jour" : r === "week" ? "Semaine" : r === "month" ? "Mois" : "Tout"}`}
            </span>
          </div>
        </div>

        {/* Message d’erreur éventuel */}
        {msg && <p className="text-red-400">{msg}</p>}

        {/* Tableau principal (ou heatmap selon `kind`) */}
        <div className="admin-table mt-3">
          <table className="table-clean">
            <thead>
              <Thead />
            </thead>
            <tbody>
              {/* Heatmap : grille 7×24 + totaux */}
              {kind === "backtests_by_hour_heatmap" ? (
                rows.length === 0 ? (
                  <tr>
                    <td colSpan="26" style={{ textAlign: "center", opacity: 0.7 }}>
                      Aucune donnée
                    </td>
                  </tr>
                ) : (
                  <>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{r.label}</td>
                        {(r.hours || []).map((v, h) => (
                          <td
                            key={h}
                            title={`${r.label} ${String(h).padStart(2, "0")}h : ${v} backtest(s)`}
                            onClick={() => v > 0 && openDrill(i, h)} // ← drilldown sur case non-vide
                            style={{
                              cursor: v > 0 ? "pointer" : "default",
                              background: `rgba(99,102,241, ${cellAlpha(v, heatMeta.max)})`,
                            }}
                          >
                            {v}
                          </td>
                        ))}
                        {/* total ligne (jour) */}
                        <td style={{ fontWeight: 600 }}>{heatMeta.rowTotals[i] || 0}</td>
                      </tr>
                    ))}
                    {/* totaux colonne + grand total */}
                    <tr>
                      <td style={{ fontWeight: 700 }}>Total</td>
                      {heatMeta.colTotals.map((c, h) => (
                        <td key={h} style={{ fontWeight: 600 }}>
                          {c}
                        </td>
                      ))}
                      <td style={{ fontWeight: 800 }}>{heatMeta.grand}</td>
                    </tr>
                  </>
                )
              ) : rows.length === 0 ? (
                // Tableau "classique" vide
                <tr>
                  <td colSpan="26" style={{ textAlign: "center", opacity: 0.7 }}>
                    Aucune donnée
                  </td>
                </tr>
              ) : (
                // Tableau "classique" rempli
                rows.map((r, i) => Row(r, i))
              )}
            </tbody>
          </table>
        </div>

        {/* Drilldown list (si ouvert via clic heatmap) */}
        {drill.open && (
          <div
            className="mt-4"
            style={{
              background: "rgba(255,255,255,.03)",
              borderRadius: 12,
              padding: 12,
              border: "1px solid rgba(255,255,255,.06)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong>{drill.title}</strong>
              <button className="btn" onClick={() => setDrill({ open: false, title: "", list: [] })}>
                Fermer
              </button>
            </div>
            <div className="admin-table">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Utilisateur</th>
                    <th>Symbole</th>
                    <th>TF</th>
                    <th>Stratégie</th>
                    <th>Période</th>
                  </tr>
                </thead>
                <tbody>
                  {drill.list.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", opacity: 0.7 }}>
                        Aucune donnée
                      </td>
                    </tr>
                  ) : (
                    drill.list.map((b, i) => (
                      <tr key={i}>
                        <td>{b.date}</td>
                        <td>{b.user}</td>
                        <td>{b.symbol || "—"}</td>
                        <td>{b.timeframe || "—"}</td>
                        <td>{b.strategy || "—"}</td>
                        <td>{b.period || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
