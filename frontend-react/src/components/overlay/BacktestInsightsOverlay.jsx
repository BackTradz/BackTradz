// src/components/overlay/BacktestInsightsOverlay.jsx
// ------------------------------------------------------------------
// BackTradz — Insights Overlay
// Objectif: SUPPRIMER les onglets fixes (Aperçu/Heures/Sessions/Jours)
// et n'afficher QUE les feuilles XLSX + l'onglet "Épingles".
// - Lecture des métadonnées et feuilles via xlsxMeta/xlsxSheet
// - Sélection onglet par défaut = 1ʳᵉ feuille existante
// - Épingles locales (localStorage: btPins_v1) + "Mur d’épingles" externe
// ------------------------------------------------------------------
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PillTabs from "../ui/switchonglet/PillTabsOverlay";
import { xlsxMeta, xlsxSheet } from "../../sdk/backtestXlsxApi";
import { formatPair, formatStrategy } from "../../lib/labels";
import Select from "../ui/select/Select";

// ---- Libellés FR (affichage uniquement) ----
const SHEET_LABEL_FR = {
  "Config": "Configuration",
  "Global": "Résumé global",
  "Sessions": "Par session",
  "Par_Heure": "Par heure",
  "Jour_Semaine": "Par jour",
  "TP2_Global": "TP2 global",
};

// --- Dictionnaires d'affichage (UI only) ---
const DAY_FR = {
  Monday:"Lundi", Tuesday:"Mardi", Wednesday:"Mercredi",
  Thursday:"Jeudi", Friday:"Vendredi", Saturday:"Samedi", Sunday:"Dimanche",
};

const HEADER_FR = {
  "Winrate Global":"Winrate global",
  "% Buy":"% Achat",
  "% Sell":"% Vente",
  "Buy Winrate":"Winrate achat",
  "Sell Winrate":"Winrate vente",
  "SL Size (pips)":"Taille SL (pips)",
  "TP1 Size (pips)":"Taille TP1 (pips)",
  "RR TP1":"RR TP1",
  "RR TP2":"RR TP2",
};

const cleanLabel = (s) =>
  String(s || "")
    .replaceAll(" (avg, pips)", " (pips)")
    .replaceAll(" (avg)", "")
    .replaceAll("_", " ")
    .trim();

const translateHeader = (h) => { 
  const key = String(h).toLowerCase();

  if (key === "day_name") return "Jour";
  if (key === "hour") return "Heure";   // ✅ ajout traduction

  const cleaned = cleanLabel(h);
  return HEADER_FR[cleaned] || cleaned;
};

const translateCellValue = (h, v) => {
  const key = String(h).toLowerCase();

  if (key === "day_name") return DAY_FR[v] || v;
  if (key === "hour") return v;   // on garde "00h", "01h", etc.

  return v;
};



// ------------------------------------------------------------------
// Hook local "pins": stocke/retire des épingles en localStorage
// Format pin: { folder, type, key, value }
// ------------------------------------------------------------------
function usePins() {
  const [pins, setPins] = useState(() => {
    try { return JSON.parse(localStorage.getItem("btPins_v1") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("btPins_v1", JSON.stringify(pins)); } catch {}
  }, [pins]);

  const toggle = (pin) => {
    const key = JSON.stringify(pin);
    setPins((arr) => {
      const exists = arr.some((p) => JSON.stringify(p) === key);
      return exists ? arr.filter((p) => JSON.stringify(p) !== key) : [...arr, pin];
    });
  };
  return { pins, toggle };
}
// Format "2025-07-01to2025-07-30" -> "2025-07-01 → 2025-07-30"
function formatPeriod(per) {
  const m = String(per || "").match(/(\d{4}-\d{2}-\d{2})to(\d{4}-\d{2}-\d{2})/);
  return m ? `${m[1]} → ${m[2]}` : (per || "");
}

// ------------------------------------------------------------------
// Composant principal
// ------------------------------------------------------------------
export default function BacktestInsightsOverlay({ open, onClose, item }) {

  // ---------- état principal ----------
  const folder = item?.folder || "";
  const [tab, setTab] = useState("");          // id d’onglet sélectionné (ex: "sheet:global" ou "pins")
  const [meta, setMeta] = useState(null);      // { sheets:[{name, rows,...}], columns: {sheetName:[...]} } si dispo
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [err, setErr] = useState(null);

  const { pins } = usePins();


  // ---------- fetch métadonnées XLSX ----------
  useEffect(() => {
    if (!open || !folder) return;         // STOP si l'overlay est fermer
    let off = false;
    (async () => {
      setLoadingMeta(true); setErr(null);
      try {
        const m = await xlsxMeta(folder);
        if (!off) setMeta(m);
      } catch (e) {
        if (!off) setErr(e);
      } finally {
        if (!off) setLoadingMeta(false);
      }
    })();
    return () => { off = true; };
  }, [open, folder]);

  // ---------- helpers ----------
  const isSheetTab = (id) => typeof id === "string" && id.startsWith("sheet:");

  // ---------- détection mobile (affichage <select>) ----------
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 900px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // ---------- Construction des onglets FEUILLES ----------
  // IMPORTANT: on NE filtre PAS "global/sessions/par_heure/jour_semaine/config".
  // On garde TOUTES les feuilles qui ont au moins 1 ligne.
  const sheetItems = useMemo(() => {
    const sheets = meta?.sheets || [];
    const seen = new Set();
    return sheets
      .filter(s => (s?.rows ?? 0) > 0)
      .map(s => String(s.name || "").trim())
      .filter(name => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;        // dédup au cas où
        seen.add(key);
        return !!name;
      })
      .map(name => ({
        id: `sheet:${name}`,
        label: SHEET_LABEL_FR[name] || name,
        icon: "📄",
      }));
  }, [meta]);

  // --- Onglet par défaut :
  //     - si des feuilles existent → "Global" si présente, sinon 1ʳᵉ feuille
  //     - s'il n'y a AUCUNE feuille (après chargement) → "pins"
  useEffect(() => {
    if (!open) return;                         // uniquement overlay ouvert
    if (sheetItems.length > 0) {
      const prefer =
        sheetItems.find(s => s.id.toLowerCase() === "sheet:global") ||
        sheetItems.find(s => /^sheet:tp2[_ ]?global$/i.test(s.id));
      setTab(prev => {
        // si on était sur "pins" en attendant le chargement, on corrige
        if (!prev || prev === "pins" || !prev.startsWith("sheet:")) {
          return prefer ? prefer.id : sheetItems[0].id;
        }
        return prev; // ne pas écraser un choix manuel
      });
    } else if (!loadingMeta) {
      // pas de feuilles une fois le chargement terminé → épingles
      setTab("pins");
    }
  }, [open, sheetItems, loadingMeta]);
    // reset du tab quand on change de dossier (évite de rester sur l’ancien onglet)
  useEffect(() => { if (open) setTab(""); }, [open, folder]); // reset tab seulement si ouvert


  // ---------- Liste finale des onglets : FEUILLES + ÉPINGLES ----------
  const items = useMemo(() => ([
    ...sheetItems,
    { id: "pins", label: "Épingles", icon: "📌" },
  ]), [sheetItems]);



  // ---------- parse pour le format de la période + pair/tf/stratégie (fallback header) ----------
  const folderMeta = useMemo(() => {
    const parts = String(folder || "").split("_");
    const pair = parts[0] || "";
    const tf = parts[1] || "";

    const periodIdx = parts.findIndex(p => /\d{4}-\d{2}-\d{2}/.test(p));
    const slIdx = parts.findIndex(p => /^s?l\d+$/i.test(p));
    const endIdx = periodIdx !== -1 ? periodIdx : (slIdx !== -1 ? slIdx : parts.length);

    const strategy = parts.slice(2, endIdx).join("_") || "";
    const period = periodIdx !== -1
      ? parts.slice(periodIdx, slIdx !== -1 ? slIdx : undefined).join("_")
      : "";

    return { pair, tf, strategy, period };
  }, [folder]);

  // ---------- header (fallback si ouvert depuis "Mes épingles") ----------

  // libellés header (fallback “Détails” via folderMeta)
  const symbolLabel = (() => {
    const candidates = [item?.symbol, folderMeta.pair].filter(Boolean); // item.d’abord, sinon folder
    for (const raw of candidates) {
      try {
        const label = typeof formatPair === "function" ? (formatPair(raw) || "") : "";
        if (label) return label;
        if (raw) return raw; // valeur brute si formatPair ne mappe pas
      } catch {}
    }
    return "";
  })();

  const tfLabel = (item?.timeframe || folderMeta.tf || "").trim();

  const strategyLabel = (() => {
    const raw = (item?.strategy || folderMeta.strategy || "").trim();
    if (!raw) return "";
    try {
      const lab = typeof formatStrategy === "function" ? (formatStrategy(raw) || "") : "";
      return lab || raw;
    } catch { return raw; }
  })();

  const periodLabel = (() => {
    const raw = (item?.period || folderMeta.period || "").trim();
    if (!raw) return "";
    try { return formatPeriod ? formatPeriod(raw) : raw.replace("to", " → "); }
    catch { return raw.replace("to", " → "); }
  })();


  // ---------- RENDER ----------
  if (!open) {
    // 🔒 Si overlay fermé → on ne rend rien
    return null;
  }

  // Contenu de l’overlay
  const node = (
    <div className="ins-root">
      {/* Fond sombre qui ferme la modale au clic */}
      <div className="ins-backdrop" onClick={onClose} />

      {/* Panneau principal, toujours centré en plein écran */}
      <section className="ins-panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {/* ---- Header ---- */}
        <header className="ins-header">
          <div className="mh">
            <div className="title">Statistiques — {[symbolLabel, tfLabel].filter(Boolean).join(" ")}</div>
            {(strategyLabel || periodLabel) && (
              <div className="sub">
                {[strategyLabel, periodLabel].filter(Boolean).join(" • ")}
              </div>
            )}
          </div>
          <button className="x" onClick={onClose} aria-label="Fermer">✕</button>
        </header>



        {/* ---- Tabs ---- */}
        <div className="ins-tabs">
          <PillTabs items={items} value={tab} onChange={setTab} size="md" />
        </div>

        {/* ---- Body ---- */}
        <div className="ins-body">
          {loadingMeta && <div className="skeleton">Chargement des métadonnées…</div>}
          {err && <div className="error">Impossible de charger : {String(err?.message ?? err)}</div>}

          {!loadingMeta && !err && (
            <>
              {/* Vue d’une FEUILLE XLSX */}
              {isSheetTab(tab) && (
                <DataSheetView
                  active={open}                 // 👈 passe l’état d’ouverture
                  folder={folder}
                  sheet={tab.slice(6)}              // "sheet:<name>" → <name>
                  meta={meta}
                  isMobile={isMobile}
                  onSelectSheet={(name) => setTab(`sheet:${name}`)}
                />
              )}
              {/* Vue "Épingles" */}
              {tab === "pins" && <Pins folder={folder} />}
            </>
          )}
        </div>
      </section>
    </div>
  );
  
  // 🔥 Rend l’overlay directement dans <body>
 return createPortal(node, document.body);
}

// ------------------------------------------------------------------
// Vue FEUILLE XLSX (table paginée "+ charger plus")
// ------------------------------------------------------------------
function DataSheetView({ active, folder, sheet, meta, isMobile, onSelectSheet }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const limit = 200;

  // fetch page
  useEffect(() => {
    if (!active) return;                       // ⛔ pas de fetch si overlay fermé
    let off = false;
    (async () => {
      try {
        const j = await xlsxSheet({ folder, sheet, offset: page * limit, limit });
        if (!off) {
          const newRows = Array.isArray(j?.rows) ? j.rows : [];
          setRows(prev => page === 0 ? newRows : prev.concat(newRows));
        }
      } catch (e) {
        // on log seulement, le reste du layout reste stable
        console.error("xlsxSheet error:", e);
      }
    })();
    return () => { off = true; };
  }, [active, folder, sheet, page]);

  const more = () => setPage(p => p + 1);

  // colonnes: meta.columns[sheet] si dispo sinon clés du 1er row
  const headers = useMemo(() => {
    const metaCols = meta?.columns?.[sheet];
    if (Array.isArray(metaCols) && metaCols.length) return metaCols;
    const first = rows[0] || {};
    return Object.keys(first);
  }, [meta, sheet, rows]);

    // --- Pins: état local + helpers (toggle) ---
    const [pins, setPins] = useState(() => {
      try { return JSON.parse(localStorage.getItem("btPins_v1") || "[]"); } catch { return []; }
    });
    function savePins(next){
      try {
        localStorage.setItem("btPins_v1", JSON.stringify(next));
        setPins(next);
        // notifie le reste de l'app (mur / autres cartes)
        window.dispatchEvent(new StorageEvent("storage", { key: "btPins_v1" }));
      } catch {}
    }
    // écoute les modifs externes (autres overlays/cartes)
    useEffect(() => {
      const onStorage = (e) => {
        if (e.key && e.key !== "btPins_v1") return;
        try { setPins(JSON.parse(localStorage.getItem("btPins_v1") || "[]")); } catch {}
      };
      window.addEventListener("storage", onStorage);
      return () => window.removeEventListener("storage", onStorage);
    }, []);

    const keyCol = useMemo(() => {
      const pref = headers.find(h => /day|jour|session|hour|heure|name/i.test(String(h)));
      return pref || headers[0];
    }, [headers]);

    const valueCol = useMemo(() => {
      const prio = headers.find(h => /winrate|expectancy|profit.?factor|value/i.test(String(h)));
      if (prio) return prio;
      const numeric = headers.find(h => typeof (rows?.[0]?.[h]) === "number");
      return numeric || headers[headers.length - 1] || headers[0];
    }, [headers, rows]);

    const makePin = (row) => ({
      folder,
      type: sheet,
      key: String(
        keyColForPin === "__displayHour__"
          ? fmtHour(row?.__displayHour__)
          : (row?.[keyColForPin] ?? keyColForPin)
      ),
      value: row?.[valueCol],
      tz: isHourSheet ? tzOffset : undefined,   // ➕ stocke l’offset courant
    });

    const samePin = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const isPinned = (row) => {
      const p = makePin(row);
      return pins.some((x) => samePin(x, p));
    };
    const togglePin = (row) => {
      const p = makePin(row);
      const exists = pins.some((x) => samePin(x, p));
      const next = exists ? pins.filter((x) => !samePin(x, p)) : [...pins, p];
      savePins(next);
    };

    // ----- Heures (Par_Heure) : sélecteur de fuseau + transformation d'affichage -----
    const isHourSheet = /par[_ ]?heure/i.test(String(sheet || ""));
    // Fuseau : offset dérivé d'une zone IANA sélectionnée (par défaut Europe/Brussels)
    const [tzOffset, setTzOffset] = useState(0);         // offset (heures)
    const [tzZone, setTzZone]   = useState("Europe/Brussels");

    // calcule l'offset (heures) d'une zone IANA "zone" par rapport à l'UTC à la date courante
    function offsetFromZone(zone){
      try{
        const now = new Date();
        const local = new Date(now.toLocaleString("en-US",{ timeZone: zone }));
        const utc   = new Date(now.toLocaleString("en-US",{ timeZone: "UTC" }));
        const diffH = (local - utc) / 36e5; // peut être décimal selon la zone
        return Math.round(diffH);           // ⬅️ arrondi heure entière (cohérent avec nos 24 lignes)
      }catch{ return 0; }
    }
    useEffect(()=>{ setTzOffset(offsetFromZone(tzZone)); }, [tzZone]);
    // détecte la colonne qui contient l'heure (0..23, "0h", "01", "01h", etc.)
    const hourCol = useMemo(() => {
      const byName = headers.find(h => /^(hour|heure|hr)$/i.test(String(h).trim()));
      if (byName) return byName;
      // fallback: si 1ʳᵉ colonne ressemble à une heure
      const h0 = headers[0];
      const v = rows?.[0]?.[h0];
      const as = String(v ?? "").trim();
      if (/^\d{1,2}h?$/.test(as) || (!isNaN(Number(as)) && Number(as) >= 0 && Number(as) <= 23)) {
        return h0;
      }
      return null;
    }, [headers, rows]);

    function parseHour(raw) {
      const s = String(raw ?? "").trim().replace(/h$/i, "");
      const n = Number(s);
      return isFinite(n) ? ((n % 24) + 24) % 24 : null;
    }
    function fmtHour(n) {
      const h = ((n % 24) + 24) % 24;
      return String(h).padStart(2, "0") + "h";
    }

    // --- helpers % pour Global / TP2_Global ---
    const sheetIsGlobalish = /^(global|tp2[_ ]?global)$/i.test(String(sheet || ""));

    // Les libellés sur lesquels on veut forcer l'affichage en pourcentage
    function isPercentMetricLabel(name) {
      const m = String(name || "").trim().toLowerCase();
      // ajoute/retire ici si besoin
      return (
        m === "winrate global" ||
        m === "buy winrate"    ||
        m === "sell winrate"   ||
        m === "winrate tp2"    ||
        m === "% buy"          ||
        m === "% sell"
      );
    }


    // applique le décalage uniquement pour l'affichage
    const tzRows = useMemo(() => {
      if (!isHourSheet || !hourCol) return rows;
      const mapped = rows.map(r => {
        const h0 = parseHour(r?.[hourCol]);
        if (h0 === null) return r;
        const h1 = (h0 + tzOffset) % 24;
        return { ...r, __displayHour__: h1 };
      });
      // tri par heure affichée (pour garder l'ordre 00h→23h)
      mapped.sort((a, b) => {
        const A = a.__displayHour__; const B = b.__displayHour__;
        if (A == null && B == null) return 0;
        if (A == null) return 1;
        if (B == null) return -1;
        return A - B;
      });
      return mapped;
    }, [rows, isHourSheet, hourCol, tzOffset]);

    // pour l’épingle : si la key est l’heure, on prend l’heure affichée
    const keyColForPin = useMemo(() => {
      if (hourCol && keyCol === hourCol && isHourSheet) return "__displayHour__";
      return keyCol;
    }, [keyCol, hourCol, isHourSheet]);

    // ------- Alignements & formats (garde l’existant + cible Global/TP2) -------

    // normalise une étiquette ("Buy Winrate" -> "buywinrate")
    const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/[\s_]+/g, "");

    // feuille courante (normalisée)
    const sheetKey = norm(sheet);

    // 1) règle générique (ce que tu as déjà : winrate partout → %)
    const isGenericWinrate = (h) => /winrate/i.test(String(h || ""));

    // 2) cibles supplémentaires : Global + TP2
    function shouldFormatPercent(h) {
      // garde le comportement existant (Par_Heure etc.)
      if (isGenericWinrate(h)) return true;

      const col = norm(h);

      // Global : Winrate Global, Buy Winrate, Sell Winrate
      if (sheetKey === "global") {
        if (["winrateglobal", "buywinrate", "sellwinrate"].includes(col)) return true;
      }

      // TP2_* : Winrate / Winrate TP2
      if (sheetKey.startsWith("tp2")) {
        if (col === "winrate" || col === "winratetp2") return true;
      }

      return false;
    }

    // colonne numérique ?
    const isNumericCol = (h) => typeof (rows?.[0]?.[h]) === "number";

    // alignements (TH + TD)
    const colAlignClass = (h) =>
      (shouldFormatPercent(h) || isNumericCol(h) || /^(tp1|sl|total|trades)$/i.test(String(h ?? "")))
        ? "right"
        : "";

    // colonne "winrate" ? (déjà présent chez toi)
    const isWinrateCol = (h) => /winrate/i.test(String(h || ""));

    function fmtCell(h, v, row) {
      // Cas 1 : colonnes "winrate" -> % comme avant
      if (isWinrateCol(h) && typeof v === "number") {
        return `${Math.round(v * 10) / 10}%`;
      }

      // Cas 2 : feuilles Global / TP2_Global, colonne "Value" (ou équivalent)
      // on regarde la ligne (métrique) pour savoir si on force le pourcentage
      if (sheetIsGlobalish) {
        const metricName = row?.Metric ?? row?.metric ?? row?.[headers[0]]; // robuste : récupère le libellé
        const headerName = String(h || "").trim().toLowerCase();
        const isValueCol = headerName === "value" || typeof v === "number"; // souple si la colonne s'appelle autrement
        if (isValueCol && isPercentMetricLabel(metricName) && typeof v === "number") {
          return `${Math.round(v * 100) / 100}%`;
        }
      }

      // fallback
      return String(v ?? "").trim();
    }

  return (
    <div className="ins-data">
      {/* Switch rapide de feuille en mobile */}
      <div className="toolbar">


        {/* Sélecteur de fuseau - visible seulement sur Par_Heure */}
        {isHourSheet && (
         <div className="tz-switch">
            <label className="tz-label">Fuseau&nbsp;:</label>
            <Select
              id="tz-switch"
              value={tzZone}
              onChange={(val)=>setTzZone(val)}
              options={[
                { value:"Europe/Brussels",   label:"Europe centrale (CET/CEST)" },
                { value:"Europe/London",     label:"Royaume-Uni (UK)" },
                { value:"Europe/Berlin",     label:"Allemagne (CET/CEST)" },
                { value:"Europe/Paris",      label:"France (CET/CEST)" },
                { value:"America/New_York",  label:"États-Unis — Est (ET)" },
                { value:"America/Chicago",   label:"États-Unis — Centre (CT)" },
                { value:"America/Denver",    label:"États-Unis — Montagnes (MT)" },
                { value:"America/Los_Angeles",label:"États-Unis — Pacifique (PT)" },
                { value:"America/Sao_Paulo", label:"Brésil (BRT)" },
                { value:"Asia/Dubai",        label:"Golfe — Dubaï (GST)" },
                { value:"Asia/Singapore",    label:"Singapour (SGT)" },
                { value:"Asia/Tokyo",        label:"Japon (JST)" },
              ]}
              size="md"
              zStack="global"
            />
          </div>
        )}
      </div>


      {/* Table — style unifié (verre) géré en CSS global sans classe conditionnelle */}
        <div className="table-wrap">
          <table role="table">
            <thead role="rowgroup">
              <tr role="row">
                {headers.map((h) => {
                  const label = translateHeader(h);
                  const isHourHeader = isHourSheet && hourCol === h;
                  const tzLabel = tzOffset >= 0 ? `UTC+${tzOffset}` : `UTC${tzOffset}`;
                  return (
                    <th role="columnheader" key={h} className={colAlignClass(h)}>
                      {isHourHeader ? `${label} (${tzLabel})` : label}
                    </th>
                  );
                })}

                <th role="columnheader" className="right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tzRows.map((r, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h} className={colAlignClass(h)}>
                      {isHourSheet && hourCol === h && r.__displayHour__ != null
                        ? fmtHour(r.__displayHour__)
                        : fmtCell(h, translateCellValue(h, r[h]), r)}
                    </td>
                  ))}
                  <td className="right">
                    <button
                      className="pin"
                      onClick={() => togglePin(r)}
                      aria-label={`${isPinned(r) ? "Désépingler" : "Épingler"} ${
                        String((keyColForPin === "__displayHour__" ? fmtHour(r.__displayHour__) : r?.[keyCol]) ?? "")
                      }`}
                      title={isPinned(r) ? "Désépingler" : "Épingler"}
                    >
                      {isPinned(r) ? "❌" : "📌"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
    </div>
  );
}
// -- parse nom de dossier -> { pair, tf, strategy, sl }
function parseFolderMeta(folder) {
    const parts = String(folder || "").split("_");
    const pair = parts[0] || "";
    const tf = parts[1] || "";
    const periodIdx = parts.findIndex(p => /\d{4}-\d{2}-\d{2}/.test(p));
    const slIdx = parts.findIndex(p => /^s?l\d+$/i.test(p));
    const slRaw = slIdx !== -1 ? parts[slIdx] : null;
    const sl = slRaw ? slRaw.replace(/^[a-z]+/i, "") : null;
    const endIdx = periodIdx !== -1 ? periodIdx : (slIdx !== -1 ? slIdx : parts.length);
    const strategy = parts.slice(2, endIdx).join("_") || "";
    return { pair, tf, strategy, sl };
  }

// -- libellé de métrique affiché (keyDisplay > key)
 const metricLabelOf = (pin) => String(pin?.keyDisplay ?? pin?.key ?? "").trim();


// ------------------------------------------------------------------
// Vue "Épingles" (affichage read-only, le pin/unpin se fait ailleurs)
// ------------------------------------------------------------------
function Pins({ folder }) {
  const [pins, setPins] = useState([]);

  function readAll() {
    try { return JSON.parse(localStorage.getItem("btPins_v1") || "[]"); }
    catch { return []; }
  }

  // Affiche un nombre avec ou sans % selon le type/clé
  function formatPinValue(p) {
    const keyStr = String(p?.key || "");
    const typeStr = String(p?.type || "");

    // ✅ cas 1 : clés explicitement "winrate" / "% buy|sell"
    const isWinKey =
      /\bwinrate\b/i.test(keyStr) ||                // "Winrate", "Winrate TP2", "Buy Winrate", …
      /^% ?(buy|sell)$/i.test(keyStr);

    // ✅ cas 2 : feuilles où la valeur épinglée est un winrate par construction
    // (Par_Heure → winrate par heure, Sessions → winrate par session, Jour_Semaine → winrate par jour)
    const isPercentByType = /par[_ ]?heure|sessions|jour[_ ]?_?semaine/i.test(typeStr);

    if (typeof p?.value === "number") {
      const n = Math.round(p.value * 100) / 100;
      return (isWinKey || isPercentByType) ? `${n}%` : `${n}`;
    }
    // fallback texte
    return String(p?.value ?? "");
  }


  // ➕ retirer une épingle depuis l’overlay (MAJ localStorage + refresh local + notify)
  function unpin(p) {
    try {
      const K = "btPins_v1";
      const arr = readAll();
      const next = arr.filter(x => JSON.stringify(x) !== JSON.stringify(p));
      localStorage.setItem(K, JSON.stringify(next));
      window.dispatchEvent(new StorageEvent("storage", { key: K })); // synchro autres vues
      setPins(next.filter(x => x.folder === folder));                 // refresh local
    } catch {}
  }

  useEffect(() => { setPins(readAll().filter(p => p.folder === folder)); }, [folder]);
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && e.key !== "btPins_v1") return;
      setPins(readAll().filter(p => p.folder === folder));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [folder]);

  if (!pins.length) return <div className="muted">Aucune épingle pour le moment.</div>;


  return (
  <div className="pins" style={{ gridTemplateColumns: "1fr" }}>
    {pins.map((p, i) => {
      const m = parseFolderMeta(p.folder);
      const metricLabel = metricLabelOf(p);
      const isHour = /par[_ ]?heure/i.test(String(p.type || ""));

      return (
        <div key={i} className="pin-card">
          <div className="pin-head">
            <div className="pin-meta">
              <span>{formatPair(m.pair) || m.pair}</span>
              <span className="pin-sep" />
              <span>{m.tf || "—"}</span>
              {m.sl && (
                <>
                  <span className="pin-sep" />
                  <span>SL{m.sl}</span>
                </>
              )}
              {m.strategy && (
                <>
                  <span className="pin-sep" />
                  <span>{formatStrategy(m.strategy)}</span>
                </>
              )}
              <span className="pin-sep" />
              <span>{p.type}</span>
              <span className="pin-sep" />
              <span>{metricLabel}</span>
              {isHour && typeof p.tz === "number" && (
                <span className="pin-tz">UTC{p.tz >= 0 ? `+${p.tz}` : p.tz}</span>
              )}
            </div>

            {/* valeur AVANT bouton */}
            <div className="pin-right">
              <div className="pin-value">{formatPinValue(p)}</div>
              <button
                className="pin-remove"
                onClick={() => unpin(p)}
                aria-label="Retirer cette épingle"
                title="Retirer"
              >
                Retirer
              </button>
            </div>
          </div>

          {/* NOTE: on ne montre plus "Dossier : <code>{p.folder}</code>" */}
        </div>
      );
    })}
  </div>
);
}