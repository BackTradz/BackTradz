// AdminMaintenance.jsx
import { useEffect, useState } from "react";
import { api } from "../../sdk/apiClient";

export default function AdminMaintenance() {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({});
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [factures, setFactures] = useState({ count: 0, bytes: 0 });

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await api("/api/admin/email-recreate");
      setCounts(data?.counts || {});
      const f = await api("/api/admin/factures_info");
      setFactures({ count: f?.count || 0, bytes: f?.bytes || 0 });
    } catch (e) {
      setErr("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetAll = async () => {
    setErr(null); setMsg(null);
    try {
      const data = await api("/api/admin/reset-email-recreate", { method: "POST", body: {} });
      setMsg("Compteur réinitialisé.");
      setCounts({});
    } catch (e) {
      setErr("Échec de la réinitialisation globale.");
    }
  };

  const resetOne = async (targetEmail) => {
    setErr(null); setMsg(null);
    try {
      const data = await api("/api/admin/reset-email-recreate", { method: "POST", body: { email: targetEmail } });
      setMsg(`Entrée supprimée pour ${targetEmail}.`);
      setCounts(data?.left || {});
    } catch (e) {
      setErr("Échec de la suppression ciblée.");
    }
  };

  const fmtBytes = (n=0) => {
    if (n < 1024) return `${n} o`;
    if (n < 1024*1024) return `${(n/1024).toFixed(1)} ko`;
    if (n < 1024*1024*1024) return `${(n/1024/1024).toFixed(1)} Mo`;
    return `${(n/1024/1024/1024).toFixed(1)} Go`;
  };

  const resetFactures = async () => {
    setErr(null); setMsg(null);
    try {
      const res = await api("/api/admin/reset-factures", { method: "POST", body: {} });
      setMsg(`Dossier factures vidé (${res?.deleted_files || 0} fichiers supprimés).`);
      const f = await api("/api/admin/factures_info");
      setFactures({ count: f?.count || 0, bytes: f?.bytes || 0 });
    } catch (e) {
      setErr("Échec du nettoyage du dossier factures.");
    }
  };

  return (
    <div className="p-6 maint">
      <h1 className="text-2xl font-bold mb-6">🧰 Maintenance</h1>

      <div className="maint-card">
        <h2 className="maint-title">
          Réinitialiser <code>email_recreate.json</code>
        </h2>
        <p className="maint-desc">
          Remet à zéro le compteur de (re)création de comptes test pour rejouer le flow d’inscription.
        </p>

        <div className="maint-actions">
          <button onClick={resetAll} className="btn btn-primary">
            Réinitialiser maintenant (global)
          </button>

          <div className="flex items-center gap-2">
            <input
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              placeholder="email à effacer..."
              className="maint-input w-72"
            />
            <button onClick={()=> email && resetOne(email)} className="btn">
              Effacer cette entrée
            </button>
          </div>
        </div>

        {msg && <div className="maint-msg">✔ {msg}</div>}
        {err && <div className="maint-err">✖ {err}</div>}
      </div>

      <div className="maint-card">
        <h2 className="maint-title">
          Vider le dossier <code>factures</code> (disk)
        </h2>
        <p className="maint-desc">
          Supprime tous les fichiers générés de facturation sur le disque Render.
        </p>
        <div className="maint-stats opacity-80 mb-3">
          <span>Fichiers : <b>{factures.count}</b></span>
          <span className="mx-3">•</span>
          <span>Taille totale : <b>{fmtBytes(factures.bytes)}</b></span>
        </div>
        <div className="maint-actions">
          <button onClick={resetFactures} className="btn btn-danger">
            Vider maintenant
          </button>
        </div>
      </div>

      <div className="maint-card">
        <h3 className="text-lg font-semibold mb-3">Entrées actuelles</h3>
        {loading ? (
          <div className="opacity-70">Chargement…</div>
        ) : Object.keys(counts).length === 0 ? (
          <div className="opacity-70">Aucune entrée.</div>
        ) : (
          <div className="maint-table admin-table">
            <table className="table-clean">
            <thead className="opacity-70">
              <tr>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Compteur</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts).map(([k,v]) => (
                <tr key={k}>
                  <td className="py-2">{k}</td>
                  <td className="py-2">{String(v)}</td>
                  <td className="py-2">
                    <button onClick={()=>resetOne(k)} className="btn btn-danger">
                      Effacer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
