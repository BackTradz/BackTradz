import { useEffect, useState } from "react";
import { API_BASE } from "../../sdk/apiClient";

/**
 * AdminKpiModal
 * ------------------------------------------------------------------
 * 🧾 Détail d’un KPI (liste brute) selon la période choisie.
 * - KPIs gérés: "sales", "credits_bought", "credits_offered", "backtests",
 *               "new_users", "users_all", "user_events"
 * - "users_all" a une route dédiée et ignore les filtres de période (affiche tout).
 * - Pour "sales", fallback possible sur une route alt (compat backend).
 *
 * 🔌 API consommée
 * - GET /api/admin/metrics/details?kpi=...&range=... (&start/end si custom)
 * - Fallback/Alt : /api/admin/metrics/details/sales, /api/admin/metrics/details/offered
 * - Déd. users :  /api/admin/metrics/details/users_all
 *
 * ⚠️ [BTZ-DEPLOY]
 * - Nécessite X-API-Key depuis localStorage.apiKey.
 * - La table adapte ses colonnes selon `kpi` (colCount utilisé pour le colspan "Aucune donnée").
 */
export default function AdminKpiModal({ title, kpi, range, start, end, onClose }) {
  const token = localStorage.getItem("apiKey");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");

  // contrôles internes de période
  const [r, setR] = useState(range || "day");
  const [s, setS] = useState(start || "");
  const [e, setE] = useState(end || "");
  const [custom, setCustom] = useState(r==="custom");
  const isUsersAll = kpi === "users_all";

  // Construit les URLs primaire/alt selon kpi + période
  function buildDetailsUrls(k, rr, ss, ee) {
    // Modal "Tous les utilisateurs" → route dédiée (et range transmis)
    if (k === "users_all") {
      const q = new URLSearchParams({ range: rr });
      if (rr === "custom") {
        if (ss) q.append("start", ss);
        if (ee) q.append("end", ee);
      }
      return { primary: `${API_BASE}/api/admin/metrics/details/users_all?${q.toString()}`, alt: null };
    }

    // Autres KPIs (route générique + alt spécifiques)
    const q = new URLSearchParams({ kpi: k, range: rr });
    if (rr === "custom") {
      if (ss) q.append("start", ss);
      if (ee) q.append("end", ee);
    }
    return {
      primary: `${API_BASE}/api/admin/metrics/details?${q.toString()}`,
      alt: k === "sales" ? `${API_BASE}/api/admin/metrics/details/sales?${q.toString()}`
       : k === "credits_offered" ? `${API_BASE}/api/admin/metrics/details/offered?${q.toString()}`
          : null,
    };
  }

  // Fetch data (avec fallback alt si la primaire n’est pas OK)
  async function fetchData(rr, ss, ee) {
    try {
      const { primary, alt } = buildDetailsUrls(kpi, rr, ss, ee);
      let res = await fetch(primary, { headers: { "X-API-Key": token } });
      let data = await res.json();
      if (!res.ok || !Array.isArray(data)) {
        if (alt) {
          res = await fetch(alt, { headers: { "X-API-Key": token } });
          data = await res.json();
        }
      }
      if (!res.ok || !Array.isArray(data)) throw new Error("API details");
      if (kpi === "sales") data = data.map(r => ({ ...r, amount_eur: r.amount_eur ?? r.amount ?? 0 }));
      setRows(data);
      setMsg("");
    } catch (e) {
      console.error(e);
      setMsg("Erreur de chargement des détails");
    }
  }

  // Mount: users_all => "all", sinon range courant
  useEffect(() => {
    if (kpi === "users_all") fetchData("all", "", "");
    else fetchData(r, s, e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // nombre de colonnes selon le KPI (pour colspan de ligne vide)
  const colCount =
    kpi === "sales" ? 5 :
    kpi === "backtests" ? 7 :
    kpi === "users_all" ? 6 :
    kpi === "user_events" ? 3 :
    kpi === "failed_payments" ? 6 :   // 🆕
    4; // credits_bought, credits_offered, new_users

  // Lance le rechargement en tenant compte du mode "Custom"
  const apply = () => {
    // si "Custom" est actif → on envoie start/end ; sinon le range choisi
    const rr = custom ? "custom" : (r === "custom" ? "day" : r);
    fetchData(rr, s, e);
  };

  // Helpers dates "YYYY-MM-DD"
  const fmtDate = (d) => {
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };
  const todayStr = () => fmtDate(new Date());
  const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return fmtDate(d); };

  // Applique immédiatement (range ou custom explicite)
  const applyNow = (rr, ss, ee) => {
    const useRange = rr === "custom" ? "custom" : rr;
    fetchData(useRange, ss, ee);
  };

  return (
    <div className="adm-modal">
      {/* Backdrop modale */}
      <div className="adm-modal__backdrop" onClick={onClose}></div>
      {/* Panneau principal */}
      <div className="adm-modal__panel">
        <div className="adm-modal__head">
            <h3>{title}</h3>

            {/* Toolbar (sauf users_all) */}
            {kpi !== "users_all" && (
              <div className="adm-toolbar">
                <button className={`btn ${r==="day" && !custom ? "btn-outline":""}`}
                  onClick={() => { setCustom(false); setR("day"); applyNow("day", s, e); }}>
                  Jour
                </button>
                <button className={`btn ${r==="week" && !custom ? "btn-outline":""}`}
                  onClick={() => { setCustom(false); setR("week"); applyNow("week", s, e); }}>
                  Semaine
                </button>
                <button className={`btn ${r==="month" && !custom ? "btn-outline":""}`}
                  onClick={() => { setCustom(false); setR("month"); applyNow("month", s, e); }}>
                  Mois
                </button>
                <button className={`btn ${r==="all" && !custom ? "btn-outline":""}`}
                  onClick={() => { setCustom(false); setR("all"); applyNow("all", s, e); }}>
                  Tout
                </button>

                {/* Toggle Custom */}
                <button className={`btn ${custom ? "btn-outline":""}`}
                  onClick={() => {
                    const next = !custom;
                    setCustom(next);
                    if (next) {
                      // init auto si vide → [today-30, today] et fetch direct
                      const ns = s || daysAgoStr(30);
                      const ne = e || todayStr();
                      setS(ns); setE(ne);
                      applyNow("custom", ns, ne);
                    } else {
                      applyNow(r || "day", s, e);
                    }
                  }}>
                  Custom
                </button>

                {/* Dates custom (maintient start<=end) */}
                {custom && (
                  <>
                    <label>Du</label>
                    <input type="date" value={s}
                      onChange={(ev) => {
                        const ns = ev.target.value;
                        setS(ns);
                        const ne = e && e < ns ? ns : e;
                        if (ne !== e) setE(ne);
                        applyNow("custom", ns, ne);
                      }}/>
                    <label>Au</label>
                    <input type="date" value={e}
                      onChange={(ev) => {
                        const ne = ev.target.value;
                        setE(ne);
                        const ns = s && s > ne ? ne : s;
                        if (ns !== s) setS(ns);
                        applyNow("custom", ns, ne);
                      }}/>
                  </>
                )}
              </div>
            )}

            <button className="btn" onClick={onClose}>Fermer</button>
          </div>

        {/* Message d’erreur */}
        {msg && <p className="text-red-400">{msg}</p>}

        {/* Tableau détaillé selon KPI */}
        <div className="admin-table mt-3">
          <table className="table-clean">
            <thead>
              {kpi === "sales" && (<tr><th>Date</th><th>Utilisateur</th><th>Libellé</th><th>Méthode</th><th>Montant (€)</th></tr>)}
              {kpi === "credits_bought" && (<tr><th>Date</th><th>Utilisateur</th><th>Libellé</th><th>Crédits</th></tr>)}
              {kpi === "credits_offered" && (<tr><th>Date</th><th>Utilisateur</th><th>Libellé</th><th>Crédits</th></tr>)}
              {kpi === "backtests" && (<tr><th>Date</th><th>Utilisateur</th><th>Libellé</th><th>Symbole</th><th>TF</th><th>Stratégie</th><th>Période</th></tr>)}
              {kpi === "new_users" && (<tr><th>Date</th><th>Email</th><th>Username</th><th>Plan</th></tr>)}
              {kpi === "users_all" && (<tr><th>Date création</th><th>Email</th><th>Username</th><th>Plan</th><th>Crédits</th><th>Dernière activité</th></tr>)}
              {kpi === "user_events" && (<tr><th>Date</th><th>User ID</th><th>Événement</th></tr>)}
              { kpi === "failed_payments" && (<tr><th>Date</th><th>Utilisateur</th><th>Libellé</th><th>Méthode</th><th>Type</th><th>Montant (€)</th></tr>)}
            </thead>
            <tbody>
              {/* Ligne “Aucune donnée” générique */}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} style={{ textAlign: "center", opacity: .7 }}>
                    Aucune donnée
                  </td>
                </tr>
              )}

              {/* Lignes spécifiques au KPI */}
              {rows.map((r, i) => (
                kpi === "sales" ? (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.user}</td>
                    <td>{r.label}</td>
                    <td>{(r.method || "—").toUpperCase()}</td>
                    <td>{Math.round(r.amount_eur)}</td>
                  </tr>
                ) : kpi === "credits_bought" ? (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.user}</td>
                    <td>{r.label}</td>
                    <td>{r.credits}</td>
                  </tr>
                ) : kpi === "credits_offered" ? (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.user}</td>
                    <td>{r.label}</td>
                    <td>{r.credits}</td>
                  </tr>
                ) : kpi === "backtests" ? (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.user}</td>
                    <td>{r.label}</td>
                    <td>{r.symbol || "—"}</td>
                    <td>{r.timeframe || "—"}</td>
                    <td>{r.strategy || "—"}</td>
                    <td>{r.period || "—"}</td>
                  </tr>
                ) : kpi === "user_events" ? (
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.user_id}</td>
                    <td>{r.event}</td>
                  </tr>
                ) : kpi === "users_all" ? (
                  <tr key={i}>
                    <td>{r.date /* Date création */}</td>
                    <td>{r.email}</td>
                    <td>{r.username}</td>
                    <td>{r.plan}</td>
                    <td>{r.credits}</td>
                    <td>{r.last_seen || "—"}</td>
                  </tr>
                  // dans le map(rows) :
                  ) : kpi === "failed_payments" ? (
                    <tr key={i}>
                      <td>{r.date}</td>
                      <td>{r.user}</td>
                      <td>{r.label}</td>
                      <td>{(r.method || "—").toUpperCase()}</td>
                      <td>{(r.kind || "—").toUpperCase()}</td>
                      <td>{Math.round(r.amount_eur || 0)}</td>
                    </tr>
                ) : (
                  // new_users (par défaut)
                  <tr key={i}>
                    <td>{r.date}</td>
                    <td>{r.email}</td>
                    <td>{r.username}</td>
                    <td>{r.plan}</td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
