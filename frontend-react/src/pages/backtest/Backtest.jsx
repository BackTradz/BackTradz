// ============================================================
// Backtest.jsx — Refonte UI SaaS Pro (zéro régression)
// ------------------------------------------------------------
// ✅ On garde ta logique existante : mêmes states, mêmes appels API.
// ✅ On ne touche PAS aux routes ni à la collecte des paramètres.
// ✅ On ajoute uniquement du layout & du style (Tailwind + Backtest.css).
// ✅ Plus "SaaS" : titre propre, tabs, grille 2 colonnes, aside sticky.
// ============================================================
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import {
   listStrategies,
   strategyParams,
   runBacktestOfficial,   // on le garde pour compat si utilisé ailleurs
   runBacktestCustom,
   runBacktestMapped,     // 👈 ajoute ça
   listOutputBacktestFiles
 } from "../../sdk/runApi";

import { API_BASE } from "../../sdk/apiClient";

import TopProgress from "../../components/ui/progressbar/TopProgress";
import "./Backtest.css"; // Styles non intrusifs
import { downloadXlsxUrl } from "../../sdk/userApi";
// Composants existants 
import TFSegment from "../../components/backtest/TFSegment";
import DatePresets from "../../components/backtest/DatePresets";
import ParamInput from "../../components/backtest/ParamInput";
// import BacktestCard from "../../components/backtest/BacktestCard"; // optionnel
import TopProgressBar from "../../components/backtest/TopProgressBar";
import InlineProgress from "../../components/backtest/InlineProgress";

// ✅ Switch réutilisable
import PillTabs from "../../components/ui/switchonglet/PillTabs";
import CTAButton from "../../components/ui/button/CTAButton";
import Select from "../../components/ui/select/Select";
import { pairsToOptions, formatParam, formatStrategy } from "../../lib/labels";
import STRATEGIES_MAP from "../../config/labels/strategies.map";
import usePip from "../../hooks/usePip"; // ✅ nouveau hook
import { getUiParamsSpec } from "../../config/labels/params.map"; // 🔥 on utilise la spec UI
import DetailButton from "../../components/ui/button/DetailButton";
import ResultInsightsOverlay from "../../components/overlay/ResultInsightsOverlay";


export default function Backtest() {
  // ───────────────────────── Onglet actif ─────────────────────────
  const [tab, setTab] = useState("official"); // "official" | "custom"

  // ─────────── Stratégies & paramètres dynamiques par stratégie ───────────
  const [strategies, setStrategies] = useState([]);
  const [selectedStratOfficial, setSelectedStratOfficial] = useState("");
  const [selectedStratCustom, setSelectedStratCustom] = useState("");
  const [paramsOfficial, setParamsOfficial] = useState([]); // [{name, default}]
  const [paramsCustom, setParamsCustom] = useState([]);

  // ─────────────────────────── Inputs OFFICIEL ───────────────────────────
  const [symbol, setSymbol] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // SL/TP communs (réutilisés aussi par le custom, comme dans tes handlers)
  const [sl, setSL] = useState("");
  const [tp1, setTP1] = useState("");
  const [tp2, setTP2] = useState("");

  // 🔎 Pip dynamique selon la paire sélectionnée
  const { pip, loading: pipLoading } = usePip(symbol);

  // ─────────────────────────── Inputs CUSTOM ───────────────────────────
  const [csvFile, setCsvFile] = useState(null);
  const [customSymbol, setCustomSymbol] = useState("CUSTOM");
  const [customTF, setCustomTF] = useState("CUSTOM");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // ─────────── Aide utilisateur : paires/TF disponibles (indicatif) ───────────
  const [pairs, setPairs] = useState([]);
  const [tfs, setTfs] = useState([]);

  // ────────────────────────────── État UI ──────────────────────────────
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);   // (tu l’as déjà)
  const [overlayFolder, setOverlayFolder] = useState("");  // 👈 nouveau
  const [overlayPeriod, setOverlayPeriod] = useState("");  // 👈 nouveau


  // ===== Dates helpers (FR + ISO) =====
  // Parse "DD-MM-YYYY" / "DD/MM/YYYY" / "YYYY-MM-DD" en Date locale minuit
  const parseDateInput = (s) => {
    if (!s) return null;
    const str = String(s).trim();

    // DD-MM-YYYY ou DD/MM/YYYY
    const m = str.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
    if (m) {
      const [, dd, mm, yyyy] = m;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    // YYYY-MM-DD
    const m2 = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m2) {
      const [, yyyy, mm, dd] = m2;
      return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    }

    // Fallback (évite Invalid Date si navigateur parse autre format)
    const d = new Date(str);
    return isNaN(d) ? null : d;
  };

  // Diff inclusif en jours, robuste DST (UTC)
  const daysBetweenIncl = (a, b) => {
    const d1 = parseDateInput(a), d2 = parseDateInput(b);
    if (!d1 || !d2) return 0;
    const t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((t2 - t1) / 86400000) + 1;
  };

  // ===== Détection admin (serveur only) =====
  const [isAdmin, setIsAdmin] = useState(false);

  // util pour lire la clé actuelle proprement
  const readApiKey = () =>
    localStorage.getItem("X-API-Key") ||
    localStorage.getItem("apiKey") ||
    localStorage.getItem("token") || "";

  // ping serveur pour confirmer admin via /admin/ping
 useEffect(() => {
  const apiKey = readApiKey();
  if (!apiKey) { setIsAdmin(false); return; }

  const tryPing = async (url) => {
    try {
      const r = await fetch(url, { headers: { "X-API-Key": apiKey } });
      return r.ok;
    } catch { return false; }
  };

  (async () => {
    const ok = await tryPing("/api/admin/ping");       // chemin correct
    setIsAdmin(ok);
  })();
}, []);



  // ===== Guards 31j (front) =====
  const daysOfficial   = daysBetweenIncl(startDate, endDate);
  const tooLongOfficial = !isAdmin && daysOfficial > 31;
  const daysCustom     = daysBetweenIncl(customStart, customEnd);
  const tooLongCustom  = !isAdmin && daysCustom > 31;


  // ─────────────────── Chargement des stratégies & sorties ───────────────────
  useEffect(() => {
    let mounted = true;
    const start = Date.now();
    (async () => {
      try {
        const ls = await listStrategies();
        setStrategies(ls?.strategies || []);
        if (ls?.strategies?.length) {
          setSelectedStratOfficial(ls.strategies[0]);
          setSelectedStratCustom(ls.strategies[0]);
        }

        const out = await listOutputBacktestFiles();
        // out attendu : { "XAUUSD": { "M5": [...], "M15": [...] }, ... }
        const seenPairs = Object.keys(out || {});
        const seenTFs = new Set();
        for (const p of seenPairs) {
          Object.keys(out[p] || {}).forEach(tf => seenTFs.add(tf));
        }
        setPairs(seenPairs);
        setTfs([...seenTFs]);
      } catch (e) {
        console.error(e);

      } finally {
        const elapsed = Date.now() - start;
       const remain = Math.max(0, 450 - elapsed);
        setTimeout(() => { if (mounted) setPageLoading(false); }, remain);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ─────────────── Params dynamiques selon stratégie sélectionnée ───────────────
  useEffect(() => {
    (async () => {
      if (!selectedStratOfficial) return;
      try {
        const data = await strategyParams(selectedStratOfficial);
        setParamsOfficial(data?.params || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedStratOfficial]);

  useEffect(() => {
    (async () => {
      if (!selectedStratCustom) return;
      try {
        const data = await strategyParams(selectedStratCustom);
        setParamsCustom(data?.params || []);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [selectedStratCustom]);


  // ➜ À coller ici (après le useEffect qui set paramsCustom)

    // Options friendly pour STRATÉGIES (depuis l’API)
    const strategyOptions = useMemo(() => {
      const arr = (strategies || []).map(s => ({ value: s, label: formatStrategy(s) }));
      arr.sort((a, b) => a.label.localeCompare(b.label, "fr"));
      return arr;
    }, [strategies]);

    // Options friendly pour PAIRES (depuis listOutputBacktestFiles)
    const pairOptionsOfficial = useMemo(() => {
      // pairsToOptions() ajoute "ALL" en tête → on la retire pour le formulaire
      return pairsToOptions(pairs).filter(o => o.value !== "ALL");
    }, [pairs]);


  // ─────────────── Collecte params dynamiques (utilise data-key pour friendly keys) ───────────────
  const collectParams = (scope) => {
    const nodes = document.querySelectorAll(`[data-scope='${scope}'][data-param='1']`);
    const obj = {};
    nodes.forEach((el) => {
      const key = el.name;
      if (!key) return;
      if (el.type === "checkbox") {
        obj[key] = el.checked;
      } else {
        if (el.value !== "") {
          // on laisse string; runBacktestMapped normalisera/castera
          obj[key] = el.value;
        }
      }
    });
    return obj;
  };

  // ───────────────────────────── Run OFFICIEL ─────────────────────────────
  const onRunOfficial = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    beginProgress();
    try {
      const paramsUI = collectParams("official");
      const payload = {
        strategy: selectedStratOfficial,
        params: paramsUI, // ⚠️ c’est runBacktestMapped qui fera le remap interne
        sl_pips: parseFloat(sl),
        tp1_pips: parseFloat(tp1),
        tp2_pips: parseFloat(tp2),
        symbol,
        timeframe,
        start_date: startDate,
        end_date: endDate,
        auto_analyze: true
      };
      const res = await runBacktestMapped(payload); // 🔥 utilise la version corrigée
      setResult(res);
    } catch (err) {
      setError(err.message || "Erreur backtest officiel");
    } finally {
      setLoading(false);
      finishProgress();
    }
  };

  // ───────────────────────────── Run CUSTOM ─────────────────────────────
  const onRunCustom = async (e) => {
    e.preventDefault();
    setError(""); setResult(null);
    if (!csvFile) { setError("Aucun fichier CSV sélectionné"); return; }
    setError(""); setResult(null); setLoading(true);
    beginProgress();
    try {
      const fd = new FormData();
      fd.append("strategy", selectedStratCustom);
      fd.append("sl_pips", parseFloat(sl));
      fd.append("tp1_pips", parseFloat(tp1));
      fd.append("tp2_pips", parseFloat(tp2));
      fd.append("csv_file", csvFile);
      fd.append("symbol", customSymbol || "CUSTOM");
      fd.append("timeframe", customTF || "CUSTOM");
      fd.append("start_date", customStart);
      fd.append("end_date", customEnd);

      const res = await runBacktestCustom(fd);
      setResult(res);
    } catch (err) {
      setError(err.message || "Erreur backtest custom");
    } finally {
      setLoading(false);
      finishProgress();
    }
  };

  // ─────────────── Sélection du fichier CSV custom ───────────────
  const onPickCustomFile = (e) => {
    const f = e.target.files?.[0] || null;
    setCsvFile(f);
  };

    // états + helpers (courts)
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  const beginProgress = () => {
    setShowProgress(true); setProgress(5);
    if (window.__btTimer) clearInterval(window.__btTimer);
    window.__btTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = p < 30 ? 3 : p < 60 ? 2 : 1;
        return Math.min(p + step, 90);
      });
    }, 120);
  };
  const finishProgress = () => {
    if (window.__btTimer) clearInterval(window.__btTimer);
    setProgress(100);
    setTimeout(() => { setShowProgress(false); setProgress(0); }, 450);
  };

  // ─────────────────────────── Rendu résultat (résumé) ───────────────────────────
  const resultView = useMemo(() => {
    if (!result) return null;
    if (result.error) return <div className="bt-error">❌ {result.error}</div>;

    return (
      <div className="space-y-4">
        {result.credits_remaining !== undefined && (
          <div className="text-slate-300">🎫 Crédits restants : <b>{result.credits_remaining}</b></div>
        )}

          <div>
            {result.xlsx_result && (() => {
              const p = String(result.xlsx_result).replaceAll("\\","/");
              const parts = p.split("/");
              const filename = parts.pop();
              const folder = parts.pop();

              if (!folder || !filename) return null;

              const token = (localStorage.getItem("apiKey") || localStorage.getItem("token") || "");
              const url = `${API_BASE}/api/download/${encodeURIComponent(filename)}?folder=${encodeURIComponent(folder)}&apiKey=${encodeURIComponent(token)}`;

              const handleDownload = (e) => {
                e.preventDefault();
                const a = document.createElement("a");
                a.href = url;
                a.download = "";          // hint navigateur
                a.target = "_blank";
                a.rel = "noopener";
                document.body.appendChild(a);
                a.click();
                a.remove();
              };

              return (
                <div className="flex gap-3 flex-wrap">
                  <DetailButton as="button" onClick={handleDownload}>
                    📥 Télécharger le rapport (.xlsx)
                  </DetailButton>
                  <DetailButton as="button" onClick={(e) => {
                    e.preventDefault();
                    setOverlayFolder(folder);
                    setOverlayPeriod(""); // si tu n’as pas de période
                    setShowOverlay(true);
                  }}>
                    👁️ Voir les résultats
                  </DetailButton>
                </div>


              );
            })()}

          </div>
        

        {result.golden_hours && (
          <div className="bt-card">
            <h4 className="bt-section-title">📊 Résumé</h4>
            <p className="text-sm text-slate-300">
              TP1 : {result.golden_hours.winrate_global?.TP1 ?? "-"}% &nbsp;|&nbsp;
              TP2 : {result.golden_hours.winrate_global?.TP2 ?? "-"}%
            </p>

            <div className="mt-3">
              <h5 className="font-medium text-slate-200 mb-2">🔥 Golden Hours</h5>
              <div className="grid grid-cols-2 gap-2">
                {result.golden_hours.golden_hours?.map((h, i) => (
                  <div key={i} className="bg-slate-800/60 p-2 rounded-md text-xs">
                    <div className="font-semibold text-sky-400">{h.hour}h</div>
                    <div>TP1 : {h.TP1}%</div>
                    {h.TP2 != null && <div>TP2 : {h.TP2}%</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [result]);

  // ──────────────────────────────── Rendu page ────────────────────────────────
  return (
    <main className="bt-page">
      <TopProgress active={pageLoading} />
      <TopProgressBar show={showProgress} progress={progress} />

      {/* Tabs via PillTabs (même style que dashboard) */}
      <div className="bt-pills">
        <PillTabs
          items={[
            { id: "official", label: "Données officielles", icon: "" },
            { id: "custom",   label: "CSV personnalisé",   icon: "" },
          ]}
          value={tab}
          onChange={setTab}
          size="md"
        />
      </div>
            {/* Titre + sous-texte */}
      <header className="bt-header">
        <h1 className="text-3xl font-bold text-sky-400 tracking-wide">Backtest de stratégies</h1>
        <p className="bt-muted">Lance des analyses détaillées sur nos données officielles ou sur ton CSV personnalisé.</p>
      </header>


        {/* Grille principale : conteneur uniforme */}
        <div className="bt-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
            {/* Colonne gauche — plein conteneur (même largeur que le bloc dessous) */}
            <div className="lg:col-span-12 space-y-6">
          {/* OFFICIEL */}
          {tab === "official" && (
            <form onSubmit={onRunOfficial} className="bt-form">


              {/* Stratégie */}
               <div className="bt-field">
                  <label>Stratégie</label>
                  <Select
                    value={selectedStratOfficial}
                    onChange={setSelectedStratOfficial}
                    options={strategyOptions}
                    size="md"
                    variant="solid"
                    fullWidth
                    data-inline-label="Stratégie"
                  />
                    <p className="bt-hint mt-1">
                      {STRATEGIES_MAP[selectedStratOfficial]?.description || "Sélectionne une stratégie pour voir son descriptif."}
                    </p>
                </div>

              {/* Paire + Timeframe (desktop côte à côte, mobile empilé) */}
              <div className="bt-grid-2 bt-pair-tf">
                <div className="bt-field">
                  <label>Paire</label>
                  <Select
                    value={symbol}
                    onChange={setSymbol}
                    options={pairOptionsOfficial}
                    size="md"
                    variant="solid"
                    fullWidth
                    data-inline-label="Paire"
                  />
                  <span className="bt-hint">
                    {pipLoading ? "Calcul du pip…" : (pip != null
                      ? `1 pip = ${pip}`
                      : "Conseil : commence par XAUUSD / BTC-USD si dispo.")}
                  </span>
                </div>

                <div className="bt-field tf-field">
                  <label>Timeframe</label>
                  <TFSegment value={timeframe} onChange={setTimeframe} />
                </div>
              </div>

              

              {/* Dates */}
              <div className="bt-grid">
                <div className="bt-field">
                  <label>Start date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div className="bt-field">
                  <label>End date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>

              {startDate && endDate && tooLongOfficial && (
                <div className="bt-error"> Période trop longue ({daysOfficial} jours). Maximum: 31 jours.</div>
              )}


              {/* Presets */}
              <DatePresets onRange={(s, e) => { setStartDate(s); setEndDate(e); }} />

              {/* SL/TP */}
                <div className="bt-grid-3">
                  <div className="bt-field">
                    <label>Stop Loss (SL) [pips]</label>
                    <input value={sl} onChange={e=>setSL(e.target.value)} />
                  </div>
                  <div className="bt-field">
                    <label>Take Profit 1 (TP1) [pips]</label>
                    <input value={tp1} onChange={e=>setTP1(e.target.value)} />
                  </div>
                  <div className="bt-field">
                    <label>Take Profit 2 (TP2) [pips]</label>
                    <input value={tp2} onChange={e=>setTP2(e.target.value)} />
                  </div>
                </div>
                <p className="bt-hint mt-1">
                  Unités en <b>pips</b> — conversion automatique selon la paire choisie. {pip != null && (
                    <>Pour <b>{symbol || "la paire sélectionnée"}</b>, <b>1 pip = {pip}</b>.</>
                  )}
                </p>

              
                  {/* Paramètres dynamiques OFFICIEL */}
                  <div className="bt-params">
                    <h4 className="bt-section-title">
                      Paramètres de la stratégie 
                      <span className="bt-badge">{paramsOfficial?.length || 0}</span>
                    </h4>
                    <div className="bt-grid">
                      {paramsOfficial.map(p => (
                        <ParamInput
                          key={p.name}
                          id={`param_official_${p.name}`}
                          name={p.name}                     // 👈 clé backend exacte
                          scope="official"                  // 👈 pour la collecte
                          label={`${formatParam(p.name, { strategyKey: selectedStratOfficial })} (${p.default ?? "obligatoire"})`}
                          defaultValue={p.default ?? ""}
                          type={p.type || (typeof p.default === "number" ? "number" : (typeof p.default === "boolean" ? "boolean" : "text"))}
                          onChange={() => {}}
                        />
                      ))}
                    </div>
                  </div>


              {/* Validation + action */}
              {startDate && endDate && startDate > endDate && (
                <div className="bt-error">La date de début doit être ≤ à la date de fin.</div>
              )}

              <div className="bt-sticky-actions">
                <CTAButton
                  type="submit"                 // ✅ soumet le form
                  variant="primary"
                  fullWidth
                  disabled={
                      loading ||
                      !symbol || !timeframe || !startDate || !endDate ||
                      (startDate > endDate) || tooLongOfficial
                    }
                >
                  {loading ? " En cours..." : "Lancer le backtest"}
                </CTAButton>
                <InlineProgress show={showProgress} progress={progress} />
              </div>

              </form>
          )}


          {/* CUSTOM */}
          {tab === "custom" && (
            <form onSubmit={onRunCustom} className="bt-form">
              <div className="bt-field">
                  <label>CSV (custom)</label>
                  <input
                    className="bt-file"                // ⬅️ important
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={onPickCustomFile}
                  />
                  {csvFile && (
                    <div className="bt-file-name">📄 {csvFile.name}
                      <span className="size">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                  <span className="bt-hint">
                    Structure attendue : <code>time, open, high, low, close, volume…</code>{" "}
                    <Link to="/a-savoir#upload-csv" className="bt-link">
                      Guide d’upload CSV
                    </Link>
                  </span>
                </div>


               { /* Stratégie */}
               <div className="bt-field">
                <label>Stratégie</label>
                <Select
                  value={selectedStratCustom}
                  onChange={setSelectedStratCustom}
                  options={strategyOptions}
                  size="md"
                  variant="solid"
                  fullWidth
                  data-inline-label="Stratégie"
                />
                 <p className="bt-hint mt-1">
                  {STRATEGIES_MAP[selectedStratCustom]?.description || "Sélectionne une stratégie pour voir son descriptif."}
                </p>
              </div>

              <div className="bt-grid">
                <div className="bt-field">
                  <label>Symbol</label>
                  <input
                    value={customSymbol}
                    onChange={e => setCustomSymbol(e.target.value.toUpperCase())}
                    placeholder="ex: BTC-USD"
                  />
                </div>
                <div className="bt-field">
                  <label>Timeframe</label>
                  <TFSegment value={customTF} onChange={setCustomTF} />
                </div>
              </div>

              <div className="bt-grid">
                <div className="bt-field">
                  <label>Start date</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} />
                </div>
                <div className="bt-field">
                  <label>End date</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                </div>
              </div>

              {customStart && customEnd && tooLongCustom && (
                <div className="bt-error"> Période trop longue ({daysCustom} jours). Maximum: 31 jours.</div>
              )}


              <DatePresets onRange={(s, e) => { setCustomStart(s); setCustomEnd(e); }} />

              {/* SL/TP */}
                <div className="bt-grid-3">
                  <div className="bt-field">
                    <label>SL (pips)</label>
                    <input value={sl} onChange={e=>setSL(e.target.value)} />
                  </div>
                  <div className="bt-field">
                    <label>TP1 (pips)</label>
                    <input value={tp1} onChange={e=>setTP1(e.target.value)} />
                  </div>
                  <div className="bt-field">
                    <label>TP2 (pips)</label>
                    <input value={tp2} onChange={e=>setTP2(e.target.value)} />
                  </div>
                </div>
                  <p className="bt-hint mt-1">
                    Unités en <b>pips</b> — conversion auto selon la paire (aucun calcul à faire).
                  </p>

              {/*parametres dynamique*/}
              <div className="bt-params">
                 <h4 className="bt-section-title">
                     Paramètres stratégie
                  <span className="bt-badge">{paramsCustom?.length || 0}</span>
                </h4>
                <div className="bt-grid">
                  {paramsCustom.map(p => (
                    <ParamInput
                      key={p.name}
                      id={`param_custom_${p.name}`}
                      label={`${formatParam(p.name, { strategyKey: selectedStratCustom })} (${p.default ?? "obligatoire"})`}
                      defaultValue={p.default ?? ""}
                      onChange={() => {}}
                    />
                  ))}
                  </div>
                {paramsCustom.map(p => (
                  <input
                    key={`hid_cus_${p.name}`}
                    type="hidden"
                    name={p.name}
                    data-scope="custom"
                    data-param="1"
                    defaultValue={p.default ?? ""}
                  />
                ))}
              </div>
                
              {/* Validation + action */}
              {customStart && customEnd && customStart > customEnd && (
                <div className="bt-error">La date de début doit être ≤ à la date de fin.</div>
              )}

              <div className="bt-actions">
                <CTAButton
                  type="submit"                 // ✅ soumet le form
                  variant="primary"
                  fullWidth
                  disabled={
                      loading ||
                      !csvFile || !customSymbol || !customTF ||
                      !customStart || !customEnd ||
                      (customStart > customEnd) || tooLongCustom
                    }
                >
                  {loading ? " En cours..." : " Lancer (CSV perso)"}
                </CTAButton>

                <InlineProgress show={showProgress} progress={progress} />
              </div>

            </form>
          )}

          </div>
            {/* Colonne droite — on la met aussi pleine largeur pour uniformiser */}
            <aside className="lg:col-span-12">
              <div className="bt-aside sticky top-24 space-y-6">

            {/* Bloc infos */}
            <section className="bt-alert info">
              <div className="font-semibold mb-1">Conseils rapides</div>
              <div className="text-slate-300 space-y-1 text-sm">
                <p>• Choisis la paire et l’unité de temps en cohérence avec tes données CSV.</p>
                <p>• Utilise les presets de dates pour gagner du temps.</p>
                <p>• SL/TP en pips → la conversion pips ce fait automatiquement.</p>
                <p>• Résultats disponibles : taux de réussite global, <b>par heure</b>, <b>par session</b> et <b>par jour</b></p>
                <p className="mt-2 text-sky-400">
                  ℹ️ Besoin d’en savoir plus sur les stratégies ?{" "}
                  <a href="/a-savoir" className="underline hover:text-sky-300">
                    Consultez la page “À savoir”
                  </a>.
                </p>
              </div>
            </section>



            {/* Bloc erreurs */}
            {error && (
              <section className="bt-card">
                <h3 className="bt-section-title">❌ Erreur</h3>
                <div className="bt-error">{error}</div>
              </section>
            )}

            {/* Bloc résultats */}
            {result && (
              <section className="bt-card">
                <h3 className="bt-section-title">Résultats</h3>
                {resultView}

                <ResultInsightsOverlay
                  open={showOverlay}
                  onClose={() => setShowOverlay(false)}
                  item={{
                    folder: overlayFolder,                      // ✅ depuis l’état
                    symbol,                                     // inchangé
                    timeframe,                                  // inchangé
                    strategy: selectedStratOfficial || selectedStratCustom,
                    period: overlayPeriod                       // ✅ valeur concrète (même vide)
                  }}
                />

              </section>
            )}
            </div>
           </aside>
        </div>
      </div>
    </main>
  );
}
