// src/components/overlay/PublicInsightsOverlay.jsx
// -----------------------------------------------------------------------------
// Overlay PUBLIC (lecture seule) pour la Home.
// Corrigé : supporte meta.sheets = [string | {name,...}], clés uniques.
// -----------------------------------------------------------------------------

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PillTabs from "../ui/switchonglet/PillTabsOverlay";
import { xlsxMeta, xlsxSheet } from "../../sdk/backtestXlsxApi";
import { formatPair, formatStrategy } from "../../lib/labels";
import Select from "../ui/select/Select";               // ✅ même composant que le backtest


import "./insights.css";


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



// Formatage local de période
function formatPeriodPublic(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const [a, b] = s.split("to");
  if (a && b) {
    const d1 = new Date(a.trim());
    const d2 = new Date(b.trim());
    if (!Number.isNaN(d1) && !Number.isNaN(d2)) {
      const fmt = (d) => d.toLocaleDateString("fr-FR");
      return `${fmt(d1)} → ${fmt(d2)}`;
    }
    return `${a.trim()} → ${b.trim()}`;
  }
  return s.replace("to", " → ");
}

// --- Normalisation de la liste de feuilles ---
// Accepte: ["Global", "Sessions"] ou [{name:"Global"}, {name:"Sessions"}]
function normalizeSheetNames(sheets) {
  const arr = Array.isArray(sheets) ? sheets : [];
  const names = arr
    .map((s) => {
      if (typeof s === "string") return s.trim();
      if (s && typeof s === "object") {
        return String(s.name || s.sheet || s.title || s.id || "").trim();
      }
      return "";
    })
    .filter(Boolean);
  // dédup
  return Array.from(new Set(names));
}

export default function PublicInsightsOverlay({ open, onClose, item }) {
  const [meta, setMeta] = useState(null);
  const [tab, setTab] = useState("sheet:Global");
  const [isMobile, setIsMobile] = useState(false);

  const folder = (item?.folder || "").trim();

  // --- Fallback header via folder ---
  const folderMeta = useMemo(() => {
    const parts = String(folder || "").split("_");
    const pair = parts[0] || "";
    const tf = parts[1] || "";
    const periodIdx = parts.findIndex((p) => /\d{4}-\d{2}-\d{2}/.test(p));
    const slIdx = parts.findIndex((p) => /^s?l\d+$/i.test(p));
    const endIdx = periodIdx !== -1 ? periodIdx : slIdx !== -1 ? slIdx : parts.length;
    const strategy = parts.slice(2, endIdx).join("_") || "";
    const period =
      periodIdx !== -1
        ? parts.slice(periodIdx, slIdx !== -1 ? slIdx : undefined).join("_")
        : "";
    return { pair, tf, strategy, period };
  }, [folder]);

  const symbolLabel = (() => {
    const raw = (item?.symbol || folderMeta.pair || "").trim();
    if (!raw) return "";
    try { return formatPair(raw) || raw; } catch { return raw; }
  })();
  const tfLabel = (item?.timeframe || folderMeta.tf || "").trim();
  const strategyLabel = (() => {
    const raw = (item?.strategy || folderMeta.strategy || "").trim();
    if (!raw) return "";
    try { return formatStrategy(raw) || raw; } catch { return raw; }
  })();
  const periodLabel = formatPeriodPublic(item?.period || folderMeta.period || "");

  // responsive
  useEffect(() => {
    const onResize = () =>
      setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Charger meta uniquement si un folder est fourni
  useEffect(() => {
    if (!open || !folder) return;
    let abort = false;
    (async () => {
      try {
        const m = await xlsxMeta(folder);
        if (abort) return;
        setMeta(m || {});
        const names = normalizeSheetNames(m?.sheets);
        if (names.length) {
          setTab(names.includes("Global") ? "sheet:Global" : `sheet:${names[0]}`);
        } else {
          setTab("sheet:Empty");
        }
      } catch {
        setMeta({ sheets: [] });
        setTab("sheet:Empty");
      }
    })();
    return () => { abort = true; };
  }, [open, folder]);


  // Liste normalisée des feuilles
  const sheetNames = useMemo(() => normalizeSheetNames(meta?.sheets), [meta]);

  const noFolder = !folder;
  const noSheets = !noFolder && sheetNames.length === 0;
  const isSheetTab = (id) => typeof id === "string" && id.startsWith("sheet:");
  // juste au-dessus du useMemo de sheetItems
  const DESIRED_ORDER = ["Config", "Global", "Sessions", "Par_Heure", "Jour_Semaine", "TP2_Global"];

  const orderedSheetNames = useMemo(() => {
    const set = new Set(sheetNames);                 // ce que renvoie l’API publique
    // garde uniquement ce qui existe, mais dans l’ordre voulu
    return DESIRED_ORDER.filter(n => set.has(n));
  }, [sheetNames]);

  // remplace sheetItems pour utiliser orderedSheetNames
  const sheetItems = useMemo(
    () => orderedSheetNames.map(n => ({
      id: `sheet:${n}`,
      label: SHEET_LABEL_FR[n] || n,
      icon: "📄",
    })),
    [orderedSheetNames]
  );




// ✅ garde le même plan de pile que le Backtest (au-dessus navbar/footer)
 if (!open) return null;
  const node = (
    <div className="ins-root" role="dialog" aria-modal="true">
      <div className="ins-backdrop" onClick={onClose} />
      <div className="ins-panel">
        {/* HEADER */}
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



        {/* CONTENU */}
        <section className="ins-body">
          {noFolder && (
            <div className="muted" style={{ padding: 16 }}>
              Aucune donnée XLSX associée à cette stratégie (folder manquant).
            </div>
          )}
          {!noFolder && !noSheets && (
            <div className="ins-tabs">
              <PillTabs items={sheetItems} value={tab} onChange={setTab} />
            </div>
          )}

          {!noFolder && !noSheets && isSheetTab(tab) && (
            <PublicDataSheetView folder={folder} sheet={tab.slice(6)} />
          )}
        </section>
      </div>
    </div>
  );
  // 👉 aligne le public sur le backtest : rendu tout en haut du DOM
  return createPortal(node, document.body);
}

/* ============================================================================
   Vue de feuille publique (lecture seule, pas d'actions)
   → reprend le markup attendu par .ins-data pour réutiliser EXACTEMENT tes styles
   ========================================================================== */
function PublicDataSheetView({ folder, sheet }) {
  const [rows, setRows] = useState([]);
  const [headers, setHeads] = useState([]);

  useEffect(() => {
    if (!folder || !sheet) return;
    let abort = false;
    (async () => {
      try {
        const j = await xlsxSheet({ folder, sheet, offset: 0, limit: 500, use_header: 1 });
        if (abort) return;
        // Tolérance: {headers,rows} OU {columns,rows} OU {data}
        const r = Array.isArray(j?.rows)
          ? j.rows
          : Array.isArray(j?.data)
          ? j.data
          : [];
        const h = Array.isArray(j?.headers) && j.headers.length
          ? j.headers
          : Array.isArray(j?.columns) && j.columns.length
          ? j.columns
          : (r[0] ? Object.keys(r[0]) : []);
        setHeads(h);
        setRows(r);
      } catch {
        setHeads([]);
        setRows([]);
      }
    })();
    return () => { abort = true; };
  }, [folder, sheet]);

  // Alignement numérique à droite
  const isNumCol = (h) => /win|%|rate|tp|sl|total|value|count|avg|size/i.test(String(h));

  // Détection de colonne/ligne % (comme le privé)
  const isPercent = (h, row) => {
    const hh = String(h || "");
    const metric = String(row?.Metric || row?.metric || "");
    return /%|winrate/i.test(hh) || /%|winrate/i.test(metric);
  };

  // ===== Fuseau horaire (UTC) pour Par_Heure =====
  const isHourSheet = /par[_ ]?heure/i.test(String(sheet || ""));
  const [tzOffset, setTzOffset] = useState(0);           // offset dérivé ci-dessous
  const [tzZone, setTzZone]   = useState("Europe/Brussels"); // ✅ zone IANA, identique au backtest

  // calcule l’offset (heures) de la zone IANA sélectionnée
  function offsetFromZone(zone){
    try{
      const now   = new Date();
      const local = new Date(now.toLocaleString("en-US",{ timeZone: zone }));
      const utc   = new Date(now.toLocaleString("en-US",{ timeZone: "UTC" }));
      return Math.round((local - utc) / 36e5); // arrondi heure entière (00h→23h)
    }catch{ return 0; }
  }
  useEffect(()=>{ setTzOffset(offsetFromZone(tzZone)); }, [tzZone]);
  // Détecte la colonne "hour/heure" (00..23, "0h", "01", "01h", etc.)
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

  // Applique le décalage uniquement pour l'AFFICHAGE (winrates intacts)
  const viewRows = useMemo(() => {
    if (!isHourSheet || !hourCol) return rows;
    const mapped = rows.map(r => {
      const h0 = parseHour(r?.[hourCol]);
      if (h0 === null) return r;
      const h1 = (h0 + tzOffset) % 24;
      return { ...r, __displayHour__: h1 };
    });
    // trie 00h→23h selon l'heure affichée
    mapped.sort((a, b) => {
      const A = a.__displayHour__; const B = b.__displayHour__;
      if (A == null && B == null) return 0;
      if (A == null) return 1;
      if (B == null) return -1;
      return A - B;
    });
     return mapped;
  }, [rows, isHourSheet, hourCol, tzOffset]);
 

  const formatCell = (h, v, row) => {
    // Heure
    if (isHourSheet && /hour|heure/i.test(h) && row.__displayHour__ != null) {
      return fmtHour(row.__displayHour__);
    }
    if (v == null) return "";
    // Pourcentages : si la ligne/colonne indique un %/winrate
    if (typeof v === "number" && isPercent(h, row)) {
      // si c’est un ratio (0..1), on convertit → %
      const n = v >= 0 && v <= 1 ? v * 100 : v;
      return `${(Math.round(n * 100) / 100).toFixed(2)}%`;
    }
    return v;
  };
      // ✅ place ceci à l’intérieur de PublicDataSheetView, sous formatCell
  const displayCell = (h, v, row) => {
    const vv = translateCellValue(h, v);  // jours FR etc.
    return formatCell(h, vv, row);         // puis ton formatage num/%/heure
  };


  return (
    <div className="ins-data">
    {/* Toolbar : même Select que le backtest, visible seulement sur "Par_Heure" */}
      <div className={`pub-toolbar ${isHourSheet ? "has-left" : ""}`}>
        {isHourSheet && (
          <div className="tz-left">
            <label className="tz-label">Fuseau&nbsp;:</label>
            <Select
              id="tz-result"
              value={tzZone}
              onChange={(val)=>setTzZone(val)}
              options={[
                // Europe
                { value:"Europe/Brussels",    label:"Europe centrale (CET/CEST)" },
                { value:"Europe/Paris",       label:"France (CET/CEST)" },
                { value:"Europe/Berlin",      label:"Allemagne (CET/CEST)" },
                { value:"Europe/London",      label:"Royaume-Uni (UK)" },
                // Amériques
                { value:"America/New_York",   label:"États-Unis — Est (ET)" },
                { value:"America/Chicago",    label:"États-Unis — Centre (CT)" },
                { value:"America/Denver",     label:"États-Unis — Montagnes (MT)" },
                { value:"America/Los_Angeles",label:"États-Unis — Pacifique (PT)" },
                { value:"America/Sao_Paulo",  label:"Brésil (BRT)" },
                // Asie / Golfe
                { value:"Asia/Dubai",         label:"Golfe — Dubaï (GST)" },
                { value:"Asia/Singapore",     label:"Singapour (SGT)" },
                { value:"Asia/Tokyo",         label:"Japon (JST)" },
              ]}
              size="md"
              zStack="global"   // panel au-dessus de l’overlay
            />
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((h) => {
                const label = translateHeader(h);
                const isHourHeader = isHourSheet && /^(hour|heure|hr)$/i.test(String(h).trim());
                const tzLabel = tzOffset >= 0 ? `UTC+${tzOffset}` : `UTC${tzOffset}`;
                return (
                  <th key={h} className={isNumCol(h) ? "right" : ""}>
                    {isHourHeader ? `${label} (${tzLabel})` : label}
                  </th>
                );
              })}
            </tr>
          </thead>
            <tbody>
              {viewRows.map((r, i) => (
                <tr key={i}>
                  {headers.map((h) => (
                    <td key={h} className={isNumCol(h) ? "right" : ""}>
                      {displayCell(h, r[h], r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>

        </table>
      </div>
    </div>
  );
}
