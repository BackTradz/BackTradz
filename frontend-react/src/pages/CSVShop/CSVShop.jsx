// src/pages/CSVShop.jsx
// -----------------------------------------------------------------------------
// Boutique CSV Stratify (refactor composants + Select réutilisable)
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { listCsvLibrary, downloadCsvByPathUrl } from "../../sdk/catalogApi";
import { API_BASE } from "../../sdk/apiClient";
import "./CSVShop.css";
import CsvCard from "../../components/ui/CSVcard/CSVCard";
import CSVShopFilters from "../../components/CSVshop/CSVShopFilters";
import ExtractorInline from "../../components/CSVshop/ExtractorInline";
import PrivateExtraction from "../../components/CSVshop/PrivateExtraction";
import CSVInfoBanner from "../../components/CSVshop/CSVInfoBanner";
import TopProgress from "../../components/ui/progressbar/TopProgress";

// TF à masquer côté front
const EXCLUDED_TF = new Set(["M1", "D", "D1"]);

// Helper: choix intelligent de la paire par défaut
function pickPreferredPair(candidates) {
  if (!candidates || candidates.length === 0) return "";
  const set = new Set(candidates.map((p) => p.toUpperCase()));
  if (set.has("BTCUSD")) return "BTCUSD";
  const btcish = candidates.find((p) => /BTC|XBT/i.test(p));
  if (btcish) return btcish;
  return candidates[0];
}

export default function CSVShop() {
  // Librairie publique (items) et états globaux
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filtres UI
  const [pair, setPair] = useState("");     // PAIRE (toujours requise)
  const [month, setMonth] = useState("");   // YYYY-MM (optionnel)
  const [q, setQ] = useState("");           // recherche libre

  // Extraction inline
  const [showExtract, setShowExtract] = useState(false);
  const [exSymbol, setExSymbol] = useState("");
  const [exTimeframe, setExTimeframe] = useState("M5");
  const [exStart, setExStart] = useState("");
  const [exEnd, setExEnd] = useState("");
  const [extractStatus, setExtractStatus] = useState("");

  // Bloc privé “Votre extraction”
  const [extractedFiles, setExtractedFiles] = useState([]); // [{pair,timeframe,year,month,path,source}]
  const [showExtractSection, setShowExtractSection] = useState(true);

  // Chargement initial de la librairie (normalise + filtre TF instables)
  useEffect(() => {
    (async () => {
      try {
        const data = await listCsvLibrary();
        let rows = Array.isArray(data) ? data : (Array.isArray(data?.files) ? data.files : []);
        rows = rows.map((it) => ({
          pair: (it.pair || it.symbol || "").toUpperCase(),
          timeframe: (it.timeframe || it.tf || "").toUpperCase(),
          name: it.name || it.filename || "",
          path: it.path || it.relative_path || "",
          year: String(it.year || "").padStart(4, "0"),
          month: String(it.month || "").padStart(2, "0"),
          source: it.source || "output",
        }));
        rows = rows.filter((it) => !EXCLUDED_TF.has(it.timeframe));
        setItems(rows);
      } catch (e) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Paires dispo
  const pairs = useMemo(() => {
    const s = new Set();
    items.forEach((it) => it.pair && s.add(it.pair));
    return Array.from(s).sort();
  }, [items]);

  // Init paire par défaut + préremplir le symbole d’extraction
  useEffect(() => {
    if (!pair && pairs.length > 0) {
      const chosen = pickPreferredPair(pairs);
      setPair(chosen);
      setExSymbol(chosen);
    }
  }, [pairs, pair]);

  // Recharge les extractions récentes (persistance côté backend)
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("apiKey");
        const res = await fetch("/api/my_recent_extractions", {
          headers: { "X-API-Key": token || "" },
        });
        if (!res.ok) return;
        const js = await res.json();
        const files = Array.isArray(js.files) ? js.files : [];
        const mapped = files.map(f => ({
          pair: (f.symbol || "").toUpperCase(),
          timeframe: (f.timeframe || "").toUpperCase(),
          year: String(f.year || "").padStart(4, "0"),
          month: String(f.month || "").padStart(2, "0"),
          path: f.relative_path || f.path || "",
          source: f.source || "live",
          start: f.start_date || "",
          end: f.end_date || "",
        }));
        setExtractedFiles(mapped.slice(0, 3)); // cap visuel
        if (mapped.length > 0) setShowExtractSection(true);
      } catch {/* no-op */}
    })();
  }, []);

  // Mois dispo (YYYY-MM) pour la paire sélectionnée
  const months = useMemo(() => {
    const s = new Set();
    items
      .filter((it) => pair && it.pair === pair)
      .forEach((it) => {
        const ym = it.year && it.month ? `${it.year}-${it.month}` : "";
        if (ym) s.add(ym);
      });
    return Array.from(s).sort().reverse(); // récents d’abord
  }, [items, pair]);

  // Filtrage final des cartes (grille publique)
  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (!pair) return false;
      const okPair = it.pair === pair;
      const ym = it.year && it.month ? `${it.year}-${it.month}` : "";
      const okMonth = month ? ym === month : true;
      const text = `${it.name} ${it.pair} ${ym} ${it.timeframe} ${it.path}`.toLowerCase();
      const okQ = q ? text.includes(q.toLowerCase()) : true;
      return okPair && okMonth && okQ;
    });
  }, [items, pair, month, q]);

  // Rafraîchir la liste (ne touche pas output_live)
  async function refreshList() {
    setLoading(true);
    setError("");
    try {
      const data = await listCsvLibrary();
      let rows = Array.isArray(data) ? data : (Array.isArray(data?.files) ? data.files : []);
      rows = rows.map((it) => ({
        pair: (it.pair || it.symbol || "").toUpperCase(),
        timeframe: (it.timeframe || it.tf || "").toUpperCase(),
        name: it.name || it.filename || "",
        path: it.path || it.relative_path || "",
        year: String(it.year || "").padStart(4, "0"),
        month: String(it.month || "").padStart(2, "0"),
        source: it.source || "output",
      }));
      rows = rows.filter((it) => !EXCLUDED_TF.has(it.timeframe));
      setItems(rows);
    } catch (e) {
      setError(e?.message || "Erreur de rafraîchissement");
    } finally {
      setLoading(false);
    }
  }

  // Extraction “light”
  async function handleExtract(e) {
    e.preventDefault();
    setExtractStatus("⛏ Extraction en cours…");
    try {
      if (!exSymbol || !exTimeframe || !exStart || !exEnd) {
        setExtractStatus("❌ Renseigne paire, TF, dates.");
        return;
      }
      const token = localStorage.getItem("apiKey");
      const res = await fetch(
        `/api/extract_to_output_live?symbol=${encodeURIComponent(exSymbol)}&timeframe=${encodeURIComponent(exTimeframe)}&start_date=${encodeURIComponent(exStart)}&end_date=${encodeURIComponent(exEnd)}`,
        { headers: { "X-API-Key": token || "" } }
      );
      const js = await res.json();
      if (!res.ok || js?.error) {
        setExtractStatus(`❌ ${js?.detail || js?.error || "Erreur extraction"}`);
      } else {
        setExtractStatus("✅ Extraction OK. Fichiers prêts à être téléchargés.");
        const files = Array.isArray(js.files) ? js.files : [];
        const mapped = files.map(f => ({
          pair: (f.symbol || exSymbol).toUpperCase(),
          timeframe: (f.timeframe || exTimeframe).toUpperCase(),
          year: String(f.year || "").padStart(4, "0"),
          month: String(f.month || "").padStart(2, "0"),
          path: f.relative_path || "",
          source: f.source || "live",
          start: f.start_date || exStart,
          end: f.end_date || exEnd,
        }));
        setExtractedFiles(mapped);
        setShowExtractSection(true);
        await refreshList();
      }
    } catch (err) {
      setExtractStatus(`❌ ${err?.message || "Erreur réseau"}`);
    }
  }

 
  if (error)   return <div className="csvshop-error">❌ {error}</div>;

    return (
    <>
      {/* Barre de chargement globale */}
      <TopProgress active={loading} />
      {/* ⛳ Garde anti-sursaut : réserve ~60vh pendant le chargement */}
      <div className="csvshop-container page-skeleton-guard">
        <h2 className="csvshop-title">CSV de trading disponibles</h2>
        <p className="csvshop-description">
          Données CSV <b>propres</b> et <b>normalisés</b> (OHLCV + indicateurs), prêts à l’emploi pour vos
          <b> backtests</b>, votre <b>trading algorithmique</b> et l’<b>vos modèles IA</b>.
        </p>
        <CSVInfoBanner />

        <CSVShopFilters
          q={q} setQ={setQ}
          pair={pair} setPair={setPair} pairs={pairs}
          month={month} setMonth={setMonth} months={months}
          showExtract={showExtract} setShowExtract={setShowExtract}
        />

        {showExtract && (
          <ExtractorInline
            exSymbol={exSymbol} setExSymbol={setExSymbol}
            exTimeframe={exTimeframe} setExTimeframe={setExTimeframe}
            exStart={exStart} setExStart={setExStart}
            exEnd={exEnd} setExEnd={setExEnd}
            handleExtract={handleExtract}
            extractStatus={extractStatus}
          />
        )}

        <PrivateExtraction
          extractedFiles={extractedFiles}
          showExtractSection={showExtractSection}
          setShowExtractSection={setShowExtractSection}
          downloadCsvByPathUrl={downloadCsvByPathUrl}
        />

        {/* Grille : n’affiche qu’après chargement */}
        {loading ? null : (
          filtered.length === 0 ? (
            <div className="csvshop-empty" style={{ marginTop: "1.5rem" }}>
              Aucun fichier trouvé.
            </div>
          ) : (
            <div className="csvshop-grid" style={{ marginTop: "1.5rem" }}>
              {filtered
                .slice()
                .sort((a, b) => {
                  const ymA = `${a.year}-${a.month}`, ymB = `${b.year}-${b.month}`;
                  if (ymA !== ymB) return ymA < ymB ? 1 : -1;
                  return a.timeframe.localeCompare(b.timeframe);
                })
                .map((it, i) => (
                  <CsvCard
                    key={i}
                    source="Librairie BackTradz"
                    symbol={it.pair}
                    timeframe={it.timeframe}
                    period={`${it.year}-${it.month}`}
                    downloadUrl={ it.path ? downloadCsvByPathUrl(it.path) : "" }
                    className="csvshop-card"
                    downloadLabel="Télécharger(–1 crédit)"   // ← piloté par la page
                    downloadTitle="Télécharger(–1 crédit))"
                    downloadIcon="⬇️"
                  />
                ))}
            </div>
          
          )
        )}
      </div>
    </>
  );
}