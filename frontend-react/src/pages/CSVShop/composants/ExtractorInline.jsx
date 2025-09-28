import React from "react";
import CTAButton from "../../../components/ui/button/CTAButton";

/**
 * ⛏ Extracteur inline
 * - Permet à l’utilisateur de générer une extraction CSV personnalisée
 * - Sélection de paire, TF, dates
 * - Utilisé si la période ou paire n’est pas encore listée
 */
export default function ExtractorInline({
  exSymbol, setExSymbol,
  exTimeframe, setExTimeframe,
  exStart, setExStart,
  exEnd, setExEnd,
  handleExtract,
  extractStatus,
}) {
  return (
    <div className="extractor">
      <h3 className="extractor__title">Extraction à la demande</h3>

      {/* Sous-titre explicatif */}
      <p className="extractor__subtitle">
        <b>Besoin d’une paire ou d’une période spécifique?</b> EUtilisez l’extraction à la demande : données
        <b> disponibles immédiatement</b><b>(jusqu’à 24 h en arrière).</b>.
        La librairie publique est <b>mise à jour chaque mois</b>.
      </p>

      {/* Presets rapides */}
      <div className="extractor__presets">
        {/* 7 jours */}
        <button type="button" className="chip" onClick={() => {
          const end = new Date();
          const start = new Date(); start.setDate(end.getDate() - 6);
          setExStart(start.toISOString().slice(0,10));
          setExEnd(end.toISOString().slice(0,10));
        }}>7 jours</button>

        {/* Ce mois-ci */}
        <button type="button" className="chip" onClick={() => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1);
          const end = new Date(now.getFullYear(), now.getMonth()+1, 0);
          setExStart(start.toISOString().slice(0,10));
          setExEnd(end.toISOString().slice(0,10));
        }}>Ce mois-ci</button>

        {/* Mois dernier */}
        <button type="button" className="chip" onClick={() => {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth()-1, 1);
          const end = new Date(now.getFullYear(), now.getMonth(), 0);
          setExStart(start.toISOString().slice(0,10));
          setExEnd(end.toISOString().slice(0,10));
        }}>Mois dernier</button>
      </div>

      {/* Formulaire extraction */}
      <form onSubmit={handleExtract} className="extractor__form" noValidate>
        {/* Paire */}
        <div className="extractor__field">
          <label>Paire</label>
          <input
            placeholder="ex : BTC-USD, ETH-USD, AUDUSD, XAUUSD"
            value={exSymbol}
            onChange={(e)=>setExSymbol(e.target.value.toUpperCase())}
          />
        </div>

        {/* TF */}
        <div className="extractor__field">
          <label>Timeframe</label>
          <div className="segmented">
            {["H4","H1","M30","M15","M5"].map(tf => (
              <button
                key={tf}
                type="button"
                className={`segmented__btn ${exTimeframe===tf ? "is-active":""}`}
                onClick={() => setExTimeframe(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="extractor__field">
          <label>Du</label>
          <input type="date" value={exStart} onChange={(e)=>setExStart(e.target.value)} />
        </div>
        <div className="extractor__field">
          <label>Au</label>
          <input type="date" value={exEnd} onChange={(e)=>setExEnd(e.target.value)} />
        </div>

        {/* CTA + erreurs */}
        <div className="extractor__actions">
          {(() => {
            const invalid = !exSymbol || !exTimeframe || !exStart || !exEnd || (exStart > exEnd);
            return (
              <>
                {exStart && exEnd && exStart > exEnd && (
                  <div className="extractor__error">La date de début doit être ≤ à la date de fin.</div>
                )}
                <CTAButton type="submit" disabled={invalid} fullWidth leftIcon="⛏">
                  Lancer
                </CTAButton>
              </>
            );
          })()}
        </div>
      </form>

      {/* Statut de l’extraction */}
      {extractStatus && <div className="csvshop-info" style={{ marginTop: 10 }}>{extractStatus}</div>}
    </div>
  );
}
