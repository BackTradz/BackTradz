// src/components/dashboard/PinnedInsightsWall.jsx
// ------------------------------------------------------------
// Section “Mes épingles” (dashboard)
// - Lecture pins depuis localStorage
// - Barre de filtres (compacte + avancés)
// - Liste des cartes (même rendu que l’overlay, + bouton Détails)
// - Mobile friendly (métadonnées repliées)
// ------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { formatPair, formatStrategy } from "../../../lib/labels";
import Select from "../../../components/ui/select/Select";
import BacktestInsightsOverlay from "../../../components/overlay/BacktestInsightsOverlay";
import DetailButton from "../../../components/ui/button/DetailButton.jsx"; 

// ------- Helpers de formatage
const STORAGE_KEY = "btPins_v1";
const metricLabelOf = (pin) => String(pin?.keyDisplay ?? pin?.key ?? "").trim();

// Parse un nom de dossier en métadonnées
function parseFolderMeta(folder) {
  const parts = String(folder || "").split("_");
  const pair = parts[0] || "";
  const tf = parts[1] || "";

  const periodIdx = parts.findIndex((p) => /\d{4}-\d{2}-\d{2}/.test(p));
  const slIdx = parts.findIndex((p) => /^s?l\d+$/i.test(p));
  const slRaw = slIdx !== -1 ? parts[slIdx] : null;
  const sl = slRaw ? slRaw.replace(/^[a-z]+/i, "") : null;

  const endIdx =
    periodIdx !== -1 ? periodIdx : slIdx !== -1 ? slIdx : parts.length;
  const strategy = parts.slice(2, endIdx).join("_") || "";

  const period =
    periodIdx !== -1
      ? parts.slice(periodIdx, slIdx !== -1 ? slIdx : undefined).join("_")
      : "";

  return { pair, tf, strategy, sl, period };
}

// Affichage valeur (%, nombres)
function formatPinValue(p) {
  const keyStr = String(p?.key || "");
  const typeStr = String(p?.type || "");
  const isWinKey =
    /\bwinrate\b/i.test(keyStr) || /^% ?(buy|sell)$/i.test(keyStr);
  const isPercentByType =
    /par[_ ]?heure|sessions|jour[_ ]?_?semaine/i.test(typeStr);

  if (typeof p?.value === "number") {
    const n = Math.round(p.value * 100) / 100;
    return isWinKey || isPercentByType ? `${n}%` : `${n}`;
  }
  return String(p?.value ?? "");
}

export default function PinnedInsightsWall({ embedded = false }) {
  // ============================================================
  // STATE
  // ============================================================
  const [pins, setPins] = useState([]);
  const [q, setQ] = useState("");

  // Filtres barre compacte
  const [metricSel, setMetricSel] = useState("ALL");
  const [typeSel, setTypeSel] = useState("ALL");
  const [periodSel, setPeriodSel] = useState("ALL");

  // Filtres contextuels (affichés selon le type)
  const [hourSel, setHourSel] = useState("ALL"); // Par_Heure
  const [sessionSel, setSessionSel] = useState("ALL"); // Sessions
  const [daySel, setDaySel] = useState("ALL"); // Jour_Semaine

  // Filtres avancés
  const [pairSel, setPairSel] = useState("ALL");
  const [strategySel, setStrategySel] = useState("ALL");
  const [sortBy, setSortBy] = useState("winrate");

  // Détails overlay + “…” mobile
  const [overlayItem, setOverlayItem] = useState(null); // { folder }
  const [expanded, setExpanded] = useState(new Set());
  const toggleExpand = (idx) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(idx) ? n.delete(idx) : n.add(idx);
      return n;
    });

  // ============================================================
  // INIT + LISTENERS
  // ============================================================
  useEffect(() => {
    const read = () => {
      try {
        setPins(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
      } catch {
        setPins([]);
      }
    };
    read();
    const onStorage = (e) => {
      if (!e.key || e.key === STORAGE_KEY) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ============================================================
  // OPTIONS des Select (dérivées des pins)
  // ============================================================
  const typeOptions = useMemo(() => {
    const set = new Set(pins.map((p) => p?.type).filter(Boolean));
    return [
      { value: "ALL", label: "Tous les types" },
      ...Array.from(set).map((v) => ({ value: v, label: v })),
    ];
  }, [pins]);

  const pairOptions = useMemo(() => {
    const set = new Set(
      pins.map((p) => String(p?.folder || "").split("_")[0]).filter(Boolean)
    );
    return [
      { value: "ALL", label: "Toutes les paires" },
      ...Array.from(set).map((v) => ({ value: v, label: formatPair(v) || v })),
    ];
  }, [pins]);

  const strategyOptions = useMemo(() => {
    const set = new Set(
      pins.map((p) => parseFolderMeta(p?.folder)?.strategy).filter(Boolean)
    );
    return [
      { value: "ALL", label: "Toutes les stratégies" },
      ...Array.from(set).map((v) => ({ value: v, label: formatStrategy(v) })),
    ];
  }, [pins]);

  const periodOptions = useMemo(() => {
    const set = new Set(
      pins.map((p) => parseFolderMeta(p?.folder)?.period).filter(Boolean)
    );
    return [
      { value: "ALL", label: "Toutes les périodes" },
      ...Array.from(set).map((v) => ({
        value: v,
        label: String(v).replace("to", " → "),
      })),
    ];
  }, [pins]);

  const hourOptions = useMemo(() => {
    const list = pins
      .filter((p) => /par[_ ]?heure/i.test(String(p?.type || "")))
      .map((p) => String(p?.key));
    const set = new Set(list);
    return [
      { value: "ALL", label: "Toutes heures" },
      ...Array.from(set).map((v) => ({ value: v, label: v })),
    ];
  }, [pins]);

  const sessionOptions = useMemo(() => {
    const list = pins
      .filter((p) => /sessions/i.test(String(p?.type || "")))
      .map((p) => String(p?.key));
    const set = new Set(list);
    return [
      { value: "ALL", label: "Toutes sessions" },
      ...Array.from(set).map((v) => ({ value: v, label: v })),
    ];
  }, [pins]);

  const dayOptions = useMemo(() => {
    const list = pins
      .filter((p) => /jour[_ ]?_?semaine/i.test(String(p?.type || "")))
      .map((p) => String(p?.key));
    const set = new Set(list);
    return [
      { value: "ALL", label: "Tous les jours" },
      ...Array.from(set).map((v) => ({ value: v, label: v })),
    ];
  }, [pins]);

  const metricOptions = useMemo(() => {
    const uniq = Array.from(new Set(pins.map(metricLabelOf).filter(Boolean)));
    return [
      { value: "ALL", label: "Toutes les métriques" },
      ...uniq.map((m) => ({ value: m, label: m })),
    ];
  }, [pins]);

  // ============================================================
  // ACTIONS
  // ============================================================
  const removePin = (pin) => {
    try {
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const next = pins.filter((p) => !same(p, pin));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setPins(next);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
    } catch {}
  };

  // ============================================================
  // FILTER + SORT
  // ============================================================
  const filtered = useMemo(() => {
    let arr = pins.slice();

    // texte libre
    const qq = q.trim().toLowerCase();
    if (qq) {
      arr = arr.filter((p) =>
        JSON.stringify(p).toLowerCase().includes(qq)
      );
    }

    // métrique
    if (metricSel !== "ALL") {
      arr = arr.filter((p) => metricLabelOf(p) === metricSel);
    }

    // type
    if (typeSel !== "ALL") {
      arr = arr.filter((p) => p.type === typeSel);
    }

    // paire (préfixe du folder)
    if (pairSel !== "ALL") {
      arr = arr.filter((p) =>
        String(p.folder || "").startsWith(pairSel + "_")
      );
    }

    // stratégie
    if (strategySel !== "ALL") {
      arr = arr.filter(
        (p) => parseFolderMeta(p.folder).strategy === strategySel
      );
    }

    // période
    if (periodSel !== "ALL") {
      arr = arr.filter(
        (p) => parseFolderMeta(p.folder).period === periodSel
      );
    }

    // contextuels
    if (/par[_ ]?heure/i.test(typeSel) && hourSel !== "ALL") {
      arr = arr.filter(
        (p) => /par[_ ]?heure/i.test(p.type) && String(p.key) === String(hourSel)
      );
    }
    if (/sessions/i.test(typeSel) && sessionSel !== "ALL") {
      arr = arr.filter(
        (p) => /sessions/i.test(p.type) && String(p.key) === String(sessionSel)
      );
    }
    if (/jour[_ ]?_?semaine/i.test(typeSel) && daySel !== "ALL") {
      arr = arr.filter(
        (p) =>
          /jour[_ ]?_?semaine/i.test(p.type) && String(p.key) === String(daySel)
      );
    }

    // tri
    arr.sort((a, b) => {
      const av = Number(a.value);
      const bv = Number(b.value);
      switch (sortBy) {
        case "value_asc":
          return av - bv;
        case "alpha":
          return String(a.key).localeCompare(String(b.key));
        case "winrate":
        case "value_desc":
        default:
          return bv - av;
      }
    });

    return arr;
  }, [
    pins,
    q,
    sortBy,
    metricSel,
    typeSel,
    pairSel,
    strategySel,
    periodSel,
    hourSel,
    sessionSel,
    daySel,
  ]);

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <section className="pins-wall" style={{ margin: embedded ? "0" : "12px 0 18px" }}>
      {!embedded && <h2 className="panel-title">Mes épingles</h2>}

      {/* ----- BARRE COMPACTE ----- */}
      <div
        className="bt-toolbar pins-toolbar"
        style={{ marginTop: 8, gap: 12 }}
      >

        <Select
          id="pin-metric"
          zStack="global"
          value={metricSel}
          onChange={setMetricSel}
          options={metricOptions}
          fullWidth
          data-inline-label="Métrique"
        />

        <Select
          id="pin-type"
          zStack="global"
          value={typeSel}
          onChange={setTypeSel}
          options={typeOptions}
          fullWidth
          data-inline-label="Type"
        />

        <Select
          id="pin-period"
          zStack="global"
          value={periodSel}
          onChange={setPeriodSel}
          options={periodOptions}
          fullWidth
          data-inline-label="Période"
        />

        {/* Contexte dynamique */}
        {/par[_ ]?heure/i.test(typeSel) && (
          <Select
            id="pin-hour"
            zStack="global"
            value={hourSel}
            onChange={setHourSel}
            options={hourOptions}
            fullWidth
            data-inline-label="Heure"
          />
        )}
        {/sessions/i.test(typeSel) && (
          <Select
            id="pin-session"
            zStack="global"
            value={sessionSel}
            onChange={setSessionSel}
            options={sessionOptions}
            fullWidth
            data-inline-label="Session"
          />
        )}
        {/jour[_ ]?_?semaine/i.test(typeSel) && (
          <Select
            id="pin-day"
            zStack="global"
            value={daySel}
            onChange={setDaySel}
            options={dayOptions}
            fullWidth
            data-inline-label="Jour"
          />
        )}
      </div>

      {/* ----- FILTRES AVANCÉS ----- */}
      <details className="pins-adv" style={{ marginTop: 4 }}>
        <summary
          className="pins-adv-summary"
          style={{ cursor: "pointer", opacity: 0.8 }}
        >
          Filtres avancés
        </summary>

        <div
          className="bt-toolbar pins-adv-grid"
          style={{ marginTop: 0, gap: 12, alignItems: "center" }}
        >
          
          <Select
            id="pin-pair"
            value={pairSel}
            onChange={setPairSel}
            options={pairOptions}
            fullWidth
            data-inline-label="Paire"
            zStack="global"
          />

          <Select
            id="pin-strat"
            value={strategySel}
            onChange={setStrategySel}
            options={strategyOptions}
            fullWidth
            data-inline-label="Stratégie"
            zStack="global"
          />

          <Select
            id="pin-sort"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "winrate", label: "Winrate ↓" },
              { value: "value_desc", label: "Valeur ↓" },
              { value: "value_asc", label: "Valeur ↑" },
              { value: "alpha", label: "A→Z (clé)" },
            ]}
            fullWidth
            data-inline-label="Tri"
            zStack="global"
          />

          {/* Recherche (sans label) */}
          <div className="pins-search">
            <div className="bt-input-wrap">
              <span className="bt-input-ico">🔎</span>
              <input
                className="bt-input"
                placeholder="Filtrer par dossier / type / clé…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>
      </details>

      {/* ----- LISTE ----- */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm" style={{ marginTop: 12 }}>
          Aucune épingle pour le moment.
        </p>
      ) : (
        <ul
          className="pins-list"
          style={{
            marginTop: 12,
            display: "grid",
            gap: 12,
            gridTemplateColumns: "1fr",
            listStyle: "none",
            padding: 0,
          }}
        >
          {filtered.map((p, i) => {
            const m = parseFolderMeta(p.folder);
            const metricLabel = metricLabelOf(p);
            const isHour = /par[_ ]?heure/i.test(String(p.type || ""));

            return (
              <li
                key={`${p.type}-${p.key}-${i}`}
                className={`pin-card ${expanded.has(i) ? "is-expanded" : ""}`}
              >
                <div className="pin-head">
                  <div className="pin-meta">

                    <span>{formatPair(m.pair) || m.pair}</span>
                    <span className="pin-sep" />
                    <span>{m.tf || "—"}</span>

                    {/* EXTRA (replié sur mobile) */}
                    {m.sl && (
                      <>
                        <span className="pin-sep" />
                        <span className="pin-extra">SL{m.sl}</span>
                      </>
                    )}
                    {m.strategy && (
                      <>
                        <span className="pin-sep" />
                        <span className="pin-extra">
                          {formatStrategy(m.strategy)}
                        </span>
                      </>
                    )}
                    {m.period && (
                      <>
                        <span className="pin-sep" />
                        <span className="pin-extra">
                          {String(m.period).replace("to", " → ")}
                        </span>
                      </>
                    )}

                    <span className="pin-sep" />
                    <span>{p.type}</span>
                    <span className="pin-sep" />
                    <span>{metricLabel}</span>

                    {isHour && typeof p.tz === "number" && (
                      <span className="pin-tz">
                        UTC{p.tz >= 0 ? `+${p.tz}` : p.tz}
                      </span>
                    )}

                    </div>
                  </div>

                  <div className="pin-right">
                    <div className="pin-value">{formatPinValue(p)}</div>

                    
                    <DetailButton
                      onClick={() => setOverlayItem({ folder: p.folder })}
                      title="Voir les détails dans l’overlay"
                    >
                      Détails
                    </DetailButton>

                    <button
                      className="pin-remove"
                      onClick={() => removePin(p)}
                      aria-label="Retirer cette épingle"
                      title="Retirer"
                    >
                      Retirer
                    </button>
                  </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ----- OVERLAY ----- */}
      {overlayItem && (
        <BacktestInsightsOverlay
          open={true}
          onClose={() => setOverlayItem(null)}
          item={overlayItem} // { folder }
        />
      )}
    </section>
  );
}
