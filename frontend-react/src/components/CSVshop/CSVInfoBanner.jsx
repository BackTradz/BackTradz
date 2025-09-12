import React, { useEffect, useRef, useState } from "react";
import DetailButton from "../ui/button/DetailButton";

/**
 * ℹ️ Bandeau d’information sur le contenu des fichiers CSV vendus
 * - Affiche une ligne condensée (colonnes obligatoires/facultatives)
 * - Affiche un popover au clic ou au hover
 * - Utilisé dans la boutique CSV pour rassurer/éduquer l'utilisateur
 */
export default function CSVInfoBanner({
  pair, // facultatif : sert uniquement dans l’exemple
  columns = [
    { name: "Datetime", type: "ISO 8601 (UTC)", required: true,  desc: "Horodatage d’OUVERTURE de la bougie (ex. M15 = pas de 15 min)." },
    { name: "Open",     type: "number",         required: true,  desc: "Prix d’ouverture." },
    { name: "High",     type: "number",         required: true,  desc: "Plus haut de la bougie." },
    { name: "Low",      type: "number",         required: true,  desc: "Plus bas de la bougie." },
    { name: "Close",    type: "number",         required: true,  desc: "Prix de clôture." },
    { name: "Volume",   type: "number",         required: true,  desc: "Volume (ou 0 si indispo)." },
    { name: "RSI_14",   type: "number",         required: false, desc: "RSI (14) calculé par notre pipeline." },
  ],
  sample = "2025-05-01 03:15:00+00:00,1809.45,1812.07,1808.98,1812.07,653917184,25.89",
  secondHeaderNote = "Une 2ᵉ ligne d’en-tête indique le symbole sous les colonnes prix/volume (ex. ETH-USD) : elle peut être ignorée lors du chargement.",
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  // 🔐 Clic hors composant / touche ESC pour fermer le popover
  useEffect(() => {
    function onDoc(e){ if(!rootRef.current?.contains(e.target)) setOpen(false); }
    function onKey(e){ if(e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // 🖱️ Hover (fermeture auto sur desktop)
  const isDesktop = typeof window !== "undefined" && window.matchMedia?.("(pointer:fine)")?.matches;
  const hoverTimer = useRef(null);
  function leave(){ if(!isDesktop || !open) return; clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(()=>setOpen(false), 150); }
  function enter(){ clearTimeout(hoverTimer.current); }

  const required = columns.filter(c => c.required);
  const optional = columns.filter(c => !c.required);

  return (
    <div className="csvshop-infobar infobar--strip" ref={rootRef} onMouseLeave={leave} onMouseEnter={enter}>
      {/* Texte de gauche */}
      <div className="infobar-strip-left">
        <span className="infobar-icon" aria-hidden>ℹ️</span>
        <div className="infobar-strip-text">
          <strong>Ce que vous achetez</strong>
          <span className="muted">Fichiers CSV standardisés : données OHLCV + indicateurs, prêts à l’emploi pour vos backtests, votre trading algorithmique et l’IA.</span>
        </div>
      </div>

      {/* Badges + bouton Détails */}
      <div className="infobar-strip-right">
        <div className="infobar-chips">
          {required.map(c => <span key={c.name} className="chip chip--xs chip--required">{c.name}</span>)}
          {optional.length > 0 && <span className="chip chip--xs chip--divider">•</span>}
          {optional.map(c => <span key={c.name} className="chip chip--xs chip--optional">{c.name}</span>)}
        </div>
        <DetailButton onClick={() => setOpen(v => !v)} aria-expanded={open}>
          Détails
        </DetailButton>
      </div>

      {/* Popover détaillé */}
      {open && (
        <div className="infobar-popover" role="dialog" aria-label="Détails des colonnes CSV">
          <div className="popover-head">
            <div className="title">Détails des colonnes</div>
            <button className="dbt-btn btn-ghost" onClick={() => setOpen(false)}>Fermer</button>
          </div>

          <div className="cols-table cols-table--compact">
            <div className="cols-head">Colonne</div>
            <div className="cols-head">Type</div>
            <div className="cols-head">Oblig.</div>
            <div className="cols-head cols-desc">Description</div>

            {columns.map(col => (
              <React.Fragment key={col.name}>
                <div className="cols-cell"><code>{col.name}</code></div>
                <div className="cols-cell">{col.type}</div>
                <div className="cols-cell">{col.required ? "Oui" : "Non"}</div>
                <div className="cols-cell cols-desc">{col.desc}</div>
              </React.Fragment>
            ))}
          </div>

          {/* Exemple de ligne */}
          <div className="sample sample--compact">
            <div className="sample-caption">Exemple de ligne {pair ? `(${pair})` : ""}</div>
            <code className="sample-code">{sample}</code>
            <ul className="notes">
              <li>Fuseau horaire : <b>UTC</b> (<code>+00:00</code>).</li>
              <li>{secondHeaderNote}</li>
              <li>Séparateur : virgule, encodage : <b>UTF-8</b>.</li>
              <li><code>pd.read_csv(..., skiprows=[1], parse_dates=["Datetime"])</code> pour pandas.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
