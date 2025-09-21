// src/components/dashboard/CsvList.jsx
import { useEffect, useState, useMemo } from "react";
import CsvCard from "../ui/CSVcard/CSVCard";


import { myPurchasedCSVs } from "../../sdk/userApi";
import { me } from "../../sdk/authApi";
import { myRecentExtractions, downloadOwnedCsvByPathUrl } from "../../sdk/catalogApi";
//import reutilisable//
import Select from "../ui/select/Select";
import TopProgress from "../ui/progressbar/TopProgress";

// 🆕 helpers labels
import { pairsToOptions } from "../../lib/labels";

/* ---------- Utils ---------- */

// normalise une paire (BTC-USD / btc/usd / btcusd → BTC-USD)
function canonPair(s) {
  const x = String(s || "").toUpperCase().trim();
  const letters = x.replace(/[^A-Z]/g, "");
  if (letters.length === 6) return `${letters.slice(0, 3)}-${letters.slice(3)}`;
  return x.replace(/[\/_]/g, "-").replace(/-+/g, "-");
}

// lit la valeur d’un <Select> (objet {value}, event natif, ou string)
function readValue(v, fallback = "ALL") {
  if (v && typeof v === "object") {
    if ("value" in v) return v.value ?? fallback;      // react-select like
    if (v.target && typeof v.target.value === "string") return v.target.value; // <select>
  }
  if (typeof v === "string") return v;
  return fallback;
}

function normDownloadPathFromUrl(u) {
  const raw = baseUrl(u);
  const idx = raw.indexOf("/api/download_csv_by_path/");
  if (idx === -1) return raw;
  // extrait la partie après le prefix API, ex:
  // /api/download_csv_by_path/output/BTC-USD/2025-08/xxx.csv -> output/BTC-USD/2025-08/xxx.csv
  let rel = raw.slice(idx + "/api/download_csv_by_path/".length);
  rel = rel.replace(/^backend\//i, "");
  rel = rel.replace(/^output_live\//i, "");
  rel = rel.replace(/^output\//i, "");
  return rel.toLowerCase(); // clé insensitive à la casse/préfixes
}


// clé stable pour dédup : priorité au chemin ou à l’URL sans ?token
function baseUrl(u) { return String(u || "").split("?")[0]; }
function keyForItem(it) {
  // 1) priorité au chemin "delete_path" (déjà relatif côté live)
  if (it.delete_path) {
    return String(it.delete_path)
      .replace(/^backend\//i, "")
      .replace(/^output_live\//i, "")
      .replace(/^output\//i, "")
      .toLowerCase();
  }
  // 2) sinon, URL de download normalisée (sans host, sans ?token, sans output/)
  if (it.downloadUrl) return normDownloadPathFromUrl(it.downloadUrl);

  // 3) fallback : triplet canonisé
  return `${canonPair(it.symbol)}|${String(it.timeframe || "").toUpperCase()}|${(it.period || "").toLowerCase()}`;
}


// Parse nom de fichier d'achat (mensuel/range/xlsx analyse)
function parsePurchaseFilename(filename) {
  const f = String(filename || "");
  const parts = f.split("_");
  let symbol = parts[0] || "—";
  let timeframe = parts[1] || "—";
  let period = "";

  const csvMonthly = /_(\d{4}-\d{2})\.csv$/i.exec(f);
  if (csvMonthly) {
    period = csvMonthly[1];
    return { symbol, timeframe, period, ext: "csv", kind: "csv_month" };
  }
  const csvRange = /_(\d{8})_to_(\d{8})\.csv$/i.exec(f);
  if (csvRange) {
    const p1 = csvRange[1], p2 = csvRange[2];
    period = `${p1.slice(0,4)}-${p1.slice(4,6)}-${p1.slice(6,8)}→${p2.slice(0,4)}-${p2.slice(4,6)}-${p2.slice(6,8)}`;
    return { symbol, timeframe, period, ext: "csv", kind: "csv_range" };
  }
  const xlsxAnal = /analyse_.*?_([A-Z\-]+)_SL\d+_([\d-]{10})\s+to\s+([\d-]{10})_resultats\.xlsx$/i.exec(f);
  if (xlsxAnal) {
    symbol = xlsxAnal[1]; timeframe = "—";
    const d1 = xlsxAnal[2], d2 = xlsxAnal[3];
    period = `${d1}→${d2}`;
    return { symbol, timeframe, period, ext: "xlsx", kind: "xlsx_analysis" };
  }
  return { symbol, timeframe, period: "", ext: (/\.(\w+)$/i.exec(f)?.[1] || "").toLowerCase(), kind: "unknown" };
}

// “backend/…” -> “…”
function stripBackendPrefix(p) {
  let x = String(p || "").replaceAll("\\", "/");
  return x.toLowerCase().startsWith("backend/") ? x.slice(8) : x;
}


 // 🔐 Récupère la clé API stockée (même logique que le reste du site)
function getApiToken() {
  try {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : {};
    return localStorage.getItem("apiKey") || user?.token || "";
  } catch {
    return localStorage.getItem("apiKey") || "";
  }
}

// Build final download URL à partir d’un chemin RELATIF donné par l’API
function buildSignedUrlFromPath(relPath) {
  if (!relPath) return "";
  const raw = downloadOwnedCsvByPathUrl(stripBackendPrefix(relPath));  // ✅ 0 crédit
  // Ajoute ?token=… uniquement si absent (Shop peut déjà l’ajouter)
  if (/\btoken=/.test(raw)) return raw;
  const token = getApiToken();
  return `${raw}${raw.includes("?") ? "&" : "?"}token=${encodeURIComponent(token)}`;
}

// ====== BUILDERS D’URL (toujours avec ?token=...) ======
function buildDownloadUrlFromRelativePath(relativePath) {
  return buildSignedUrlFromPath(relativePath);
}

/* ---------- Component ---------- */

export default function CsvList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

   // filtre & pagination
  const [pairFilter, setPairFilter] = useState("ALL");
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);

        // 1) Essaie la route dédiée (plus fiable)
        let purchased = [];
        try {
          const res = await myPurchasedCSVs();         // /api/user/csvs
          // tolérance: on accepte plusieurs shapes
          purchased = Array.isArray(res) ? res : (res.items || []);
        } catch {
          // 2) Fallback rétrocompatible via /api/me
          const u = await me();
          const ph = Array.isArray(u?.purchase_history) ? u.purchase_history : [];
          purchased = ph
            .filter(p => {
              const t = String(p?.type || p?.category || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
              // accepte "téléchargement", "telechargement", "download"
              return t.includes("telechargement") || t.includes("telechargement csv") || t.includes("download");
            })
            .map(p => ({
              filename: p.filename || p.file || "",
              purchased_at: p.date || p.purchased_at || p.created_at,
            }));
        }

        // Normalise achats -> items (PRIORITÉ au 'path' renvoyé par l’API)
        const libItems = purchased.map(p => {
          const filename = p.filename || p.name || "";
          const meta = parsePurchaseFilename(filename);
          const pathFromApi = p.path || p.relative_path || p.rel || ""; // ← si dispo, identique au Shop
          const downloadUrl = pathFromApi
            ? buildSignedUrlFromPath(pathFromApi)
            : buildSignedUrlFromPath(
                // ✅ Fallback SANS préfixe "output/" (le serveur le rajoute déjà)
                meta.kind === "csv_month"
                  ? `${meta.symbol}/${meta.period}/${filename}`
                  : `${meta.symbol}/${meta.timeframe}/${filename}` // (rare ici; on garde propre)
              );
          return {
            source: "library",
            symbol: p.symbol || meta.symbol,
            timeframe: p.timeframe || meta.timeframe,
            period: p.period || meta.period,
            purchased_at: p.purchased_at || p.date || null,
            id: filename || `lib_${p.purchased_at || Date.now()}`,
            downloadUrl,
          };
        });

        // 3) Extractions live (toujours)
        const recent = await myRecentExtractions();     // { files: [...] }
        const liveItems = (recent?.files || []).map(f => ({
          source: "live",
          symbol: f.symbol || "—",
          timeframe: f.timeframe || "—",
          period: f.start_date && f.end_date ? `${f.start_date}→${f.end_date}` : "",
          purchased_at: f.created_at || null,
          downloadUrl: buildSignedUrlFromPath(f.relative_path || f.path || ""),  // ✅ même logique que Shop
          id: f.relative_path || `${f.symbol}_${f.created_at}`,
          delete_path: String(f.relative_path || "")
            .replaceAll("\\", "/")
            .replace(/^.*\/backend\//i, "backend/"),
        }));

        if (!alive) return;
        // 🔁 fusion + dédup (même fichier = 1 carte)
        const merged = [...libItems, ...liveItems];
        const seen = new Set();
        const uniq = merged.filter(it => {
          const k = keyForItem(it);      // utilise delete_path || URL sans ?token || (pair|tf|period)
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        setItems(uniq);

      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Erreur de chargement");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

    // 🆕 options de paires friendly
  const pairOptions = useMemo(() => {
    const uniq = Array.from(new Set(items.map(i => i.symbol).filter(Boolean)));
    return pairsToOptions(uniq);
  }, [items]);

  // NEW: filtre + pagination
  const filtered = useMemo(() => {
    const sel = readValue(pairFilter, "ALL");
    if (sel === "ALL") return items;
    const target = canonPair(sel);
    return items.filter(i => canonPair(i.symbol) === target);
  }, [items, pairFilter]);

  const visible = filtered.slice(0, limit);
  // Afficher le bouton dès que le filtre courant a plus d'items que la limite
  const canShowMore = filtered.length > limit;

  // reset pagination si on change le filtre
  useEffect(() => { setLimit(10); }, [pairFilter]);


  if (err) return <div className="state error">❌ {err}</div>;

  
  return (
    <>
      <TopProgress active={loading} />



      {/* NEW: Toolbar CSV (uniquement si plusieurs paires) */}
      {!loading && pairOptions.length > 1 && (
        <div className="csv-toolbar">
          <div className="csv-ctrl">
            <label className="sr-only" htmlFor="csv-pair">Filtrer par paire</label>
            <Select
              id="csv-pair"
              value={pairFilter}
              onChange={(v) => setPairFilter(readValue(v))}
              options={pairOptions}
              size="md"
              variant="solid"
              fullWidth
              data-inline-label="Paires"
            />
          </div>
        </div>
      )}

      {loading ? null : items.length === 0 ? (
        <div className="state">
          <p>Aucun CSV téléchargé pour l’instant.</p>
          <p>
            Rendez-vous dans le CSV Shop pour obtenir des données propres, triées par paire et période,
            prêtes à être backtestées (–1 crédit).”
          </p>
        </div>
      ) : (
        <>
          <div className="csv-page">
            <div className="csv-grid">
              {visible.map((it, i) => (
                <CsvCard
                  key={it.id || i}
                  source={it.source === "library" ? "Librairie BackTradz" : "Extraction privée"}
                  symbol={it.symbol}
                  timeframe={it.timeframe}
                  period={it.period}
                  downloadUrl={it.downloadUrl}   // ✅ comme dans CSVShop
                  downloadLabel="Télécharger"
                />
              ))}
            </div>
          </div>

          {/* NEW: Afficher plus seulement si 20+ CSV au total */}
          {canShowMore && (
            <div className="list-more reveal-in">
              <button className="dbt-btn dbt-neutral" onClick={() => setLimit(l => l + 10)}>
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