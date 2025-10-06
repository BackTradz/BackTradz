// src/pages/CSVShop.jsx
// -----------------------------------------------------------------------------
// Boutique CSV Stratify (refactor composants + Select réutilisable)
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { listCsvLibrary, downloadCsvByPathUrl } from "../../sdk/catalogApi";
import { API_BASE } from "../../sdk/apiClient";
import "./CSVShop.css";
import CsvCard from "../../components/ui/CSVcard/CSVCard";
import CSVShopFilters from "./composants/CSVShopFilters";
import ExtractorInline from "./composants/ExtractorInline";
import PrivateExtraction from "./composants/PrivateExtraction";
import CSVInfoBanner from "./composants/CSVInfoBanner";
import TopProgress from "../../components/ui/progressbar/TopProgress";
import MsgConnexionOverlay from "../../components/overlay/MsgConnexionOverlay";
import DetailButton from "../../components/ui/button/DetailButton";
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
  const [q, setQ] = useState("");           // (conservé mais non affiché)
  const [tf, setTf] = useState("");         // TF (optionnel)

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


  // Pagination visuelle (éviter la surcharge à l’écran)
  // ✅ Mobile aligné sur le CSS: ≤640px → 10 ; sinon 20
  const initialStepRef = useRef(16);
  const [visibleCount, setVisibleCount] = useState(initialStepRef.current);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => {
      const step = mq.matches ? 10 : 16;
      initialStepRef.current = step;
      setVisibleCount(step);
    };
    apply(); // init
    // met à jour si l’utilisateur change d’orientation / redimensionne
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

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

  // TF dispo pour la paire sélectionnée
  const tfs = useMemo(() => {
    if (!pair) return [];
    const s = new Set();
    items.forEach((it) => {
      if (it.pair === pair && it.timeframe) s.add(it.timeframe);
    });
    return Array.from(s).sort();
  }, [items, pair]);


  // Init paire par défaut + préremplir le symbole d’extraction
  useEffect(() => {
    if (!pair && pairs.length > 0) {
      const chosen = pickPreferredPair(pairs);
      setPair(chosen);
      setExSymbol(chosen);
    }
  }, [pairs, pair]);

  // Quand la paire change manuellement → reset mois & TF pour éviter confusions
  useEffect(() => {
    setMonth("");
    setTf("");
    // Réinitialise aussi la pagination visuelle
    setVisibleCount(initialStepRef.current);
  }, [pair]);

  // Si TF / mois / recherche changent → reset pagination
  useEffect(() => {
    setVisibleCount(initialStepRef.current);
  }, [tf, month, q]);


  // Recharge les extractions récentes (persistance côté backend)
  useEffect(() => {
    (async () => {
      try {
        const token = getApiTokenSafe();
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
      const okTf = tf ? it.timeframe === tf : true;
      const ym = it.year && it.month ? `${it.year}-${it.month}` : "";
      const okMonth = month ? ym === month : true;
      const text = `${it.name} ${it.pair} ${ym} ${it.timeframe} ${it.path}`.toLowerCase();
      const okQ = q ? text.includes(q.toLowerCase()) : true;
      return okPair && okTf && okMonth && okQ;
    });
  }, [items, pair, tf, month, q]);

  // 🔒 Tri stable en amont, puis découpage (doit être déclaré AVANT tout usage)
  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const ymA = `${a.year}-${a.month}`;
      const ymB = `${b.year}-${b.month}`;
      if (ymA !== ymB) return ymA < ymB ? 1 : -1; // récents d’abord
      return a.timeframe.localeCompare(b.timeframe);
    });
    return arr;
  }, [filtered]);

  // Liste à rendre = cap dur (20 desktop / 10 mobile)
  const toRender = useMemo(
    () => sortedFiltered.slice(0, visibleCount),
    [sortedFiltered, visibleCount]
  );



  // 🧱 Garde-fou : si la liste devient plus courte, on borne le visibleCount
  useEffect(() => {
    setVisibleCount((c) => Math.min(c, sortedFiltered.length || initialStepRef.current));
  }, [sortedFiltered]);


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

  // BTZ-PATCH (CSVShop.jsx) : token robuste + conserver f.path
  function getApiTokenSafe() {
    try {
      return localStorage.getItem("apiKey")
          || (JSON.parse(localStorage.getItem("user")||"{}")?.token)
          || "";
    } catch { return localStorage.getItem("apiKey") || ""; }
  }

  function withToken(url) {
    const t = getApiTokenSafe();
    if (!t) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}token=${encodeURIComponent(t)}`;
  }

  // v1.2 — visiteur vs connecté (simple, sans appel réseau)
  const isLoggedIn = !!getApiTokenSafe();
  const [publicNotice, setPublicNotice] = useState(""); // petit message au clic en public
  const [showLoginOverlay, setShowLoginOverlay] = useState(false); // v1.2 — overlay connexion

  // Intercepte les clics sur un bouton de download en mode public
  const handlePublicClick = (e) => {
    if (isLoggedIn) return;
    const a = e.target.closest("a");
    if (!a) return;
    // si c'est le CTA de téléchargement (href = "#" côté public)
    if (a.getAttribute("href") === "#") {
      e.preventDefault();
      e.stopPropagation();
      // v1.2 — on ouvre l'overlay de connexion (on garde le message en backup, sans suppression)
      setShowLoginOverlay(true);
      setPublicNotice("Inscrivez-vous pour télécharger votre CSV — /login?next=/csv-shop");
    }
  };


  async function handleExtract(e) {
    e.preventDefault();
    setExtractStatus("⛏ Extraction en cours…");
    try {
      if (!exSymbol || !exTimeframe || !exStart || !exEnd) {
        setExtractStatus("❌ Renseigne paire, TF, dates.");
        return;
      }
      const token = getApiTokenSafe();  // ✅ token robuste (apiKey/user.token)
      // v1.2 — Public: on ne bloque pas l’UI, on remplace juste l'erreur "token invalide"
      if (!token) {
        // 👉 Ouvre l'overlay de connexion au lieu du petit message HTML
        setShowLoginOverlay(true);
        // (On garde un fallback minimal si jamais l’overlay ne se monte pas)
        setExtractStatus("");
        setPublicNotice("Inscrivez-vous pour lancer une extraction — /login?next=/csv-shop");
        return;
      }
      const res = await fetch(
        `/api/extract_to_output_live?symbol=${encodeURIComponent(exSymbol)}&timeframe=${encodeURIComponent(exTimeframe)}&start_date=${encodeURIComponent(exStart)}&end_date=${encodeURIComponent(exEnd)}`,
        { headers: { "X-API-Key": token || "" } }
      );
      const js = await res.json();
      if (!res.ok || js?.error) {
        // v1.2 — Si 401 / token invalide → message friendly + lien login
        const raw = (js?.detail || js?.error || "").toLowerCase();
        if (res.status === 401 || raw.includes("token")) {
          setExtractStatus(
            <>
              ❌ Inscrivez-vous pour lancer une extraction.{" "}
              <a className="bt-link" href="/login?next=/csv-shop">Se connecter</a>
            </>
          );
        } else {
          setExtractStatus(`❌ ${js?.detail || js?.error || "Erreur extraction"}`);
        }
      } else {
        setExtractStatus("✅ Extraction OK. Fichiers prêts à être téléchargés.");
        const files = Array.isArray(js.files) ? js.files : [];
        const mapped = files.map(f => ({
          pair: (f.symbol || exSymbol).toUpperCase(),
          timeframe: (f.timeframe || exTimeframe).toUpperCase(),
          year: String(f.year || "").padStart(4, "0"),
          month: String(f.month || "").padStart(2, "0"),
          // ✅ garder les deux formes
          path: (f.relative_path || f.path || ""),
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
          tf={tf} setTf={setTf} tfs={tfs}
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
              <>
              <div className="csvshop-grid" style={{ marginTop: "1.5rem" }} onClick={handlePublicClick}>
              {toRender.map((it, i) => (
                  <CsvCard
                    key={i}
                    source="Librairie BackTradz"
                    symbol={it.pair}
                    timeframe={it.timeframe}
                    period={`${it.year}-${it.month}`}
                    // v1.2 — en public : on passe "#" pour que le bouton soit visible,
                    // et on intercepte le clic plus haut pour afficher le message + lien.
                    downloadUrl={
                      !isLoggedIn
                        ? "#"
                        : (it.path ? withToken(downloadCsvByPathUrl(it.path)) : "")
                    }
                    className="csvshop-card"
                    downloadLabel="Télécharger(–1 crédit)"   // ← piloté par la page
                    downloadTitle="Télécharger(–1 crédit))"
                    downloadIcon="⬇️"
                  />
                ))}
            </div>
            {sortedFiltered.length > toRender.length && (
                <div className="csvshop-loadmore">
                  <DetailButton
                    onClick={() => setVisibleCount((c) => c + initialStepRef.current)}
                    title="Afficher plus de fichiers"
                  >
                    Afficher plus
                  </DetailButton>
                </div>
              )}
            </>
          
          )
        )}
      </div>

      {/* v1.2 — Overlay de connexion (affiché quand visiteur clique Download/Extract) */}
      {showLoginOverlay && (
        <MsgConnexionOverlay
          open
          onClose={() => setShowLoginOverlay(false)}
        />
      )}
    </>
  );
}