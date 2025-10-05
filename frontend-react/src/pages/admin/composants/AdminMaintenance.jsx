// AdminMaintenance.jsx
import { useEffect, useState } from "react";
import { api } from "../../../sdk/apiClient";

export default function AdminMaintenance() {
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({});
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [factures, setFactures] = useState({ count: 0, bytes: 0 });
  const [invoiceFiles, setInvoiceFiles] = useState([]);

  // === Import mensuel output ===
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const [zipUrl, setZipUrl] = useState("");
  const [mode, setMode] = useState("skip");
  const [dryRun, setDryRun] = useState(false);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(null); // "simulate" | "execute" | null

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await api("/api/admin/email-recreate");
      setCounts(data?.counts || {});
      const f = await api("/api/admin/factures_info");
      setFactures({ count: f?.count || 0, bytes: f?.bytes || 0 });
      const l = await api("/api/admin/factures_list");
      setInvoiceFiles(Array.isArray(l?.items) ? l.items : []);
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
      const l = await api("/api/admin/factures_list");
      setInvoiceFiles(Array.isArray(l?.items) ? l.items : []);
    } catch (e) {
      setErr("Échec du nettoyage du dossier factures.");
    }
  };

  const fmtDate = (iso) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch { return iso; }
  };

  const downloadInvoice = async (rel, name) => {
    try {
      // token admin déjà stocké (même logique que api())
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const url = `/api/admin/factures_download?rel=${encodeURIComponent(rel)}${token ? `&apiKey=${encodeURIComponent(token)}` : ""}`;
      // Laisse le navigateur gérer le download (aucun header requis)
      const a = document.createElement("a");
      a.href = url;
      a.download = name || "facture";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setErr("Impossible de télécharger ce fichier.");
    }
  };



  // ✅ PATCH ciblé : on utilise le même client `api()` que partout en admin,
  // ce qui envoie déjà l'entête X-API-Key accepté par le backend.
  const deleteInvoice = async (rel) => {
    setErr(null);
    try {
      // POST tolérant: rel en body ET/OU en query (le backend supporte les 2)
      await api(`/api/admin/factures_delete?rel=${encodeURIComponent(rel)}`, {
        method: "POST",
        body: { rel },
      });

      // 🔄 Refresh liste + stats (comme avant)
      const f = await api("/api/admin/factures_info");
      setFactures({ count: f?.count || 0, bytes: f?.bytes || 0 });

      const l = await api("/api/admin/factures_list");
      setInvoiceFiles(Array.isArray(l?.items) ? l.items : []);
    } catch (e) {
      setErr("Échec de la suppression du fichier.");
    }
  };

  // === Import mensuel output (add-only) ===
  const runImport = async (simulate=false) => {
    if (!zipFile && !zipUrl.trim()) { setErr("Fournis un ZIP (fichier) ou une URL."); return; }
    setErr(null); setMsg(null); setReport(null);
    setLoading(simulate ? "simulate" : "execute");
    try {
      const fd = new FormData();
      if (zipFile) fd.append("file", zipFile);
      if (zipUrl.trim()) fd.append("source_url", zipUrl.trim());
      fd.append("target_month", month);
      fd.append("mode", mode);
      fd.append("dry_run", String(!!simulate));
      const res = await api("/api/admin/maintenance/import-output", { method: "POST", body: fd });
      setReport(res || {});
      setMsg(simulate ? "Simulation terminée." : "Import terminé.");
    } catch (e) {
      setErr(e?.message || "Échec de l'import.");
      } finally {
      setLoading(null);

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

      {/* ===== Importer un mois d’output (add-only, skip par défaut) ===== */}
      <div className="maint-card">
        <h2 className="maint-title">Importer un mois d’output</h2>
        <p className="maint-desc">
          Charge un ZIP de <code>output/&lt;PAIR&gt;/{'{'}YYYY-MM{'}'}/...</code>. Seuls les fichiers du mois
          <b> {month}</b> seront ajoutés. En mode <code>skip</code>, les fichiers existants sont ignorés.
        </p>
        <div className="maint-actions">
          <input
            type="month"
            value={month}
            onChange={(e)=>setMonth(e.target.value)}
            className="maint-input"
            disabled={!!loading}
          />
          <input
            type="file"
            accept=".zip"
            onChange={(e)=>setZipFile(e.target.files?.[0] || null)}
            className="maint-input"
            disabled={!!loading}
          />
          <input
            type="url"
            placeholder="URL ZIP (optionnel)"
            value={zipUrl}
            onChange={(e)=>setZipUrl(e.target.value)}
            className="maint-input"
            disabled={!!loading}
          />

          <label className="flex items-center gap-2">
            <span>Mode</span>
            <select
              value={mode}
              onChange={(e)=>setMode(e.target.value)}
              className="maint-input"
              disabled={!!loading}
            >
              <option value="skip">skip (ne pas écraser)</option>
              <option value="overwrite">overwrite (autoriser l’écrasement)</option>
            </select>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e)=>setDryRun(e.target.checked)}
              disabled={!!loading}
            />
            <span>Dry-run (simulation)</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={()=>runImport(true)}
              className="btn"
              disabled={!!loading}
            >
              {loading === "simulate" ? "Simulation…" : "Simuler"}
            </button>
            <button
              onClick={()=>runImport(false)}
              className="btn btn-primary"
              disabled={!!loading}
            >
              {loading === "execute" ? "Exécution…" : "Exécuter"}
            </button>
          </div>
        </div>
        {loading && (
          <div className="maint-msg" style={{marginTop:12}}>
            {loading === "simulate" ? "Simulation en cours…" : "Import en cours…"} Cela peut prendre un moment selon la taille du ZIP.
            <br />
            <small>Ne ferme pas la page.</small>
          </div>
        )}
        {report && (
          <div className="maint-msg" style={{marginTop:12}}>
            <div><b>Mois:</b> {report.target_month} — <b>mode:</b> {report.mode} — <b>dry_run:</b> {String(report.dry_run)}</div>
            <div><b>added:</b> {report.added} — <b>skipped:</b> {report.skipped} — <b>overwritten:</b> {report.overwritten}</div>
            {Array.isArray(report.errors) && report.errors.length > 0 && (
              <div className="maint-err" style={{marginTop:8}}>Erreurs: {report.errors.join(", ")}</div>
            )}
           </div>
        )}
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


      <div className="maint-card">
        <h3 className="text-lg font-semibold mb-3">Fichiers de facturation (disk)</h3>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={load} className="btn">Rafraîchir</button>
          <span className="opacity-70 ml-2">{invoiceFiles.length} fichier(s)</span>
        </div>
        {invoiceFiles.length === 0 ? (
          <div className="opacity-70">Aucun fichier.</div>
        ) : (
          <div className="maint-table admin-table">
            <table className="table-clean">
              <thead className="opacity-70">
                <tr>
                  <th className="text-left py-2">Nom</th>
                  <th className="text-left py-2">Taille</th>
                  <th className="text-left py-2">Modifié</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoiceFiles.map((it) => (
                  <tr key={it.rel}>
                    <td className="py-2">
                      <button className="link" onClick={() => downloadInvoice(it.rel, it.name)}>
                        {it.name}
                      </button>
                    </td>
                    <td className="py-2">{fmtBytes(it.bytes)}</td>
                    <td className="py-2">{fmtDate(it.mtime)}</td>
                    <td className="py-2">
                      <button className="btn btn-danger" onClick={() => deleteInvoice(it.rel)}>
                        Supprimer
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
