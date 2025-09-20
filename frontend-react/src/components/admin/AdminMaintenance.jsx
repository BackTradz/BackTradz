// AdminMaintenance.jsx
import { useEffect, useState } from "react";
import api from "../../sdk/apiClient"; // ton client axios/fetch déjà configuré

export default function AdminMaintenance() {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({});
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data } = await api.get("/api/admin/email-recreate");
      setCounts(data.counts || {});
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
      const { data } = await api.post("/api/admin/reset-email-recreate", {});
      setMsg("Compteur réinitialisé.");
      setCounts({});
    } catch (e) {
      setErr("Échec de la réinitialisation globale.");
    }
  };

  const resetOne = async (targetEmail) => {
    setErr(null); setMsg(null);
    try {
      const { data } = await api.post("/api/admin/reset-email-recreate", { email: targetEmail });
      setMsg(`Entrée supprimée pour ${targetEmail}.`);
      setCounts(data.left || {});
    } catch (e) {
      setErr("Échec de la suppression ciblée.");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">🧰 Maintenance</h1>

      <div className="bg-[#121a2b] border border-[#22304a] rounded-xl p-5 mb-8">
        <h2 className="text-lg font-semibold mb-2">
          Réinitialiser <code>email_recreate.json</code>
        </h2>
        <p className="text-sm opacity-80 mb-4">
          Remet à zéro le compteur de (re)création de comptes test pour rejouer le flow d’inscription.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button onClick={resetAll}
                  className="px-4 py-2 rounded-lg font-semibold
                             bg-gradient-to-r from-[#3aa2ff] to-[#5cc4ff] text-[#0b1220]">
            Réinitialiser maintenant (global)
          </button>

          <div className="flex items-center gap-2">
            <input value={email} onChange={(e)=>setEmail(e.target.value)}
                   placeholder="email à effacer..."
                   className="bg-[#0b1220] border border-[#22304a] rounded-lg px-3 py-2 text-sm outline-none w-72" />
            <button onClick={()=> email && resetOne(email)}
                    className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#22304a] hover:bg-[#2a3b5b]">
              Effacer cette entrée
            </button>
          </div>
        </div>

        {msg && <div className="text-green-400 text-sm">✔ {msg}</div>}
        {err && <div className="text-red-400 text-sm">✖ {err}</div>}
      </div>

      <div className="bg-[#121a2b] border border-[#22304a] rounded-xl p-5">
        <h3 className="text-lg font-semibold mb-3">Entrées actuelles</h3>
        {loading ? (
          <div className="opacity-70">Chargement…</div>
        ) : Object.keys(counts).length === 0 ? (
          <div className="opacity-70">Aucune entrée.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="opacity-70">
              <tr>
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Compteur</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts).map(([k,v]) => (
                <tr key={k} className="border-t border-[#22304a]">
                  <td className="py-2">{k}</td>
                  <td className="py-2">{String(v)}</td>
                  <td className="py-2">
                    <button onClick={()=>resetOne(k)}
                            className="px-3 py-1 rounded bg-[#22304a] hover:bg-[#2a3b5b]">
                      Effacer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
