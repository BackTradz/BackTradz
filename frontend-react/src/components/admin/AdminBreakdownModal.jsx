import { useEffect, useState } from "react";
import { API_BASE } from "../../sdk/apiClient";

/**
 * AdminBreakdownModal
 * ------------------------------------------------------------------
 * 📊 Modale d’analyses “classiques” (breakdown switchable via select)
 * - Propose un <select> pour choisir le `kind` (revenue_by_day, ...).
 * - Gère un filtre de période (range standard + custom).
 * - Table unique dont thead/tbody varient selon `k`.
 *
 * 🔌 API consommée
 * - GET /api/admin/metrics/breakdown?kind=...&range=...(&start, &end pour custom)
 *
 * ⚠️ [BTZ-DEPLOY]
 * - Header "X-API-Key" requis (localStorage.apiKey).
 * - La liste des <option> doit correspondre aux kinds supportés par le backend.
 */
export default function AdminBreakdownModal({ title, kind = "revenue_by_day", range = "day", onClose }) {
  const token = localStorage.getItem("apiKey");

  // Données / message
  const [rows, setRows] = useState([]);   // tableau principal
  const [msg, setMsg] = useState("");     // message erreur

  // Contrôles (k = kind courant, r = range ; s/e dates custom)
  const [k, setK] = useState(kind);
  const [r, setR] = useState(range);
  const [s, setS] = useState("");
  const [e, setE] = useState("");
  const [custom, setCustom] = useState(false); // toggle "custom"

  // Construit l’URL selon kind/range + dates custom
  function buildUrl(kind, rr, ss, ee) {
    const q = new URLSearchParams({ kind, range: rr });
    if (rr === "custom") {
      if (ss) q.append("start", ss);
      if (ee) q.append("end", ee);
    }
     return `${API_BASE}/api/admin/metrics/breakdown?${q.toString()}`;
  }

  // Fetch breakdown (avec garde d’erreur)
  async function fetchData(kind, rr, ss, ee) {
    try {
      const url = buildUrl(kind, rr, ss, ee);
      const res = await fetch(url, { headers: { "X-API-Key": token } });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error("API breakdown");
      setRows(data);
      setMsg("");
    } catch (err) {
      console.error(err);
      setMsg("Erreur de chargement");
    }
  }

  // Helpers dates (format YYYY-MM-DD) + lanceur applyNow
  const fmtDate = d => {
    const z = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
  };
  const todayStr   = () => fmtDate(new Date());
  const daysAgoStr = n => { const d = new Date(); d.setDate(d.getDate()-n); return fmtDate(d); };
  const applyNow   = (rr, ss, ee) => fetchData(k, rr, ss, ee);

  // Montée initiale : charge le kind/range initiaux
  useEffect(() => { fetchData(k, r, s, e); /* mount */ }, []); // eslint-disable-line

  return (
    <div className="adm-modal">
      {/* Backdrop modale */}
      <div className="adm-modal__backdrop" onClick={onClose}></div>

      {/* Panneau principal */}
      <div className="adm-modal__panel">
        <div className="adm-modal__head">
          <h3>{title}</h3>

          {/* Toolbar : select kind + filtres période */}
          <div className="adm-toolbar">
            <select className="select" value={k}
              onChange={e => { const nk = e.target.value; setK(nk); fetchData(nk, r, s, e); }}>
              <option value="sales_by_method">€ par méthode</option>
              <option value="credits_by_method">Crédits par méthode</option>
              <option value="revenue_by_day">€ par jour</option>
              <option value="revenue_by_hour">€ par heure</option>
              <option value="backtests_by_strategy">Backtests par stratégie</option>
              <option value="backtests_by_symbol">Backtests par symbole</option>
              <option value="backtests_by_timeframe">Backtests par TF</option>
              <option value="backtests_by_hour_heatmap">Backtests heatmap (jour×heure)</option>
              <option value="backtests_duration_histogram">Durée backtests (histo)</option>
              <option value="credits_flow">Flux de crédits (in/out/net)</option>
              <option value="active_users_daily">Utilisateurs actifs (jour)</option>
              <option value="dau_wau_mau">DAU/WAU/MAU</option>
              <option value="top_customers">Top clients</option>
            </select>

            {/* Raccourcis range */}
            <button className={`btn ${!custom && r==="day"   ? "btn-outline":""}`} onClick={()=>{setCustom(false); setR("day");   applyNow("day",   s, e);}}>Jour</button>
            <button className={`btn ${!custom && r==="week"  ? "btn-outline":""}`} onClick={()=>{setCustom(false); setR("week");  applyNow("week",  s, e);}}>Semaine</button>
            <button className={`btn ${!custom && r==="month" ? "btn-outline":""}`} onClick={()=>{setCustom(false); setR("month"); applyNow("month", s, e);}}>Mois</button>
            <button className={`btn ${!custom && r==="all"   ? "btn-outline":""}`} onClick={()=>{setCustom(false); setR("all");   applyNow("all",   s, e);}}>Tout</button>

            {/* Toggle custom + initialisation dates si vide */}
            <button className={`btn ${custom ? "btn-outline":""}`} onClick={()=>{
              const next = !custom; setCustom(next);
              if (next) {
                const ns = s || daysAgoStr(30);
                const ne = e || todayStr();
                setS(ns); setE(ne); applyNow("custom", ns, ne);
              } else {
                applyNow(r || "day", s, e);
              }
            }}>Custom</button>

            {/* Saisie des dates en mode custom (avec invariant start<=end) */}
            {custom && (
              <>
                <label>Du</label>
                <input type="date" value={s} onChange={ev=>{
                  const ns = ev.target.value; setS(ns);
                  const ne = e && e<ns ? ns : e; if (ne!==e) setE(ne);
                  applyNow("custom", ns, ne);
                }}/>
                <label>Au</label>
                <input type="date" value={e} onChange={ev=>{
                  const ne = ev.target.value; setE(ne);
                  const ns = s && s>ne ? ne : s; if (ns!==s) setS(ns);
                  applyNow("custom", ns, ne);
                }}/>
              </>
            )}
          </div>
        </div>

        {/* Message d’erreur éventuel */}
        {msg && <p className="text-red-400">{msg}</p>}

        {/* Tableau polymorphe selon `k` */}
        <div className="admin-table mt-3">
          <table className="table-clean">
            <thead>
              {k === "sales_by_method" && (<tr><th>Méthode</th><th>Nombre</th><th>Total (€)</th></tr>)}
              {k === "credits_by_method" && (<tr><th>Méthode</th><th>Nombre</th><th>Crédits</th></tr>)}
              {k === "revenue_by_day" && (<tr><th>Jour</th><th>Revenu (€)</th></tr>)}
              {k === "revenue_by_hour" && (<tr><th>Heure</th><th>Revenu (€)</th></tr>)}
              {(k === "backtests_by_strategy" || k==="backtests_by_symbol" || k==="backtests_by_timeframe") && (<tr><th>Clé</th><th>Compte</th></tr>)}
              {k === "backtests_by_hour_heatmap" && (
                <tr>
                  <th>Jour \ Heure</th>
                  {Array.from({length:24}, (_,h)=><th key={h}>{h}</th>)}
                </tr>
              )}
              {k === "backtests_duration_histogram" && (<tr><th>Bucket</th><th>Count</th></tr>)}
              {k === "credits_flow" && (<tr><th>Jour</th><th>Entrants</th><th>Sortants</th><th>Net</th></tr>)}
              {k === "active_users_daily" && (<tr><th>Jour</th><th>Actifs</th></tr>)}
              {k === "dau_wau_mau" && (<tr><th>Métrique</th><th>Valeur</th></tr>)}
              {k === "top_customers" && (<tr><th>Utilisateur</th><th>Commandes</th><th>Ventes (€)</th><th>Crédits</th></tr>)}
            </thead>
            <tbody>
              {rows.length === 0 && (<tr><td colSpan="26" style={{textAlign:"center", opacity:.7}}>Aucune donnée</td></tr>)}
              {rows.map((r, i) => (
                k === "sales_by_method" ? (
                  <tr key={i}><td>{r.method}</td><td>{r.count}</td><td>{Math.round(r.total_eur)}</td></tr>
                ) : k === "credits_by_method" ? (
                  <tr key={i}><td>{r.method}</td><td>{r.count}</td><td>{r.credits}</td></tr>
                ) : k === "revenue_by_day" ? (
                  <tr key={i}><td>{r.x}</td><td>{Math.round(r.y)}</td></tr>
                ) : k === "revenue_by_hour" ? (
                  <tr key={i}><td>{String(r.hour).padStart(2,"0")}h</td><td>{Math.round(r.total_eur)}</td></tr>
                ) : (k === "backtests_by_strategy" || k==="backtests_by_symbol" || k==="backtests_by_timeframe") ? (
                  <tr key={i}><td>{r.key}</td><td>{r.count}</td></tr>
                ) : k === "backtests_by_hour_heatmap" ? (
                  <tr key={i}><td>{r.label}</td>{r.hours.map((v, h) => <td key={h}>{v}</td>)}</tr>
                ) : k === "backtests_duration_histogram" ? (
                  <tr key={i}><td>{r.bucket}</td><td>{r.count}</td></tr>
                ) : k === "credits_flow" ? (
                  <tr key={i}><td>{r.day}</td><td>{r.in}</td><td>{r.out}</td><td>{r.net}</td></tr>
                ) : k === "active_users_daily" ? (
                  <tr key={i}><td>{r.x}</td><td>{r.y}</td></tr>
                ) : k === "dau_wau_mau" ? (
                  <tr key={i}><td>{r.metric}</td><td>{r.count}</td></tr>
                ) : k === "top_customers" ? (
                  <tr key={i}><td>{r.user}</td><td>{r.orders}</td><td>{Math.round(r.sales_eur)}</td><td>{r.credits}</td></tr>
                ) : null
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
