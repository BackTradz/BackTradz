import React from "react";
import CTAButton from "../../../components/ui/button/CTAButton";
import Select from "../../../components/ui/select/Select";
import { formatPair } from "../../../lib/labels";

/**
 * 🎛️ Filtres de la boutique CSV
 * - Sélecteurs de paire, timeframe et mois
 * - Toggle vers l’extracteur
 */
export default function CSVShopFilters({
  q, setQ,                      // (la page conserve l’état mais on ne l’affiche plus)
  pair, setPair, pairs,
  tf, setTf, tfs,
  month, setMonth, months,
  showExtract, setShowExtract,
}) {

  // 🧭 Paires → options {value,label} (sans "Toutes")
  const pairOptions = Array.from(new Set(pairs || []))
    .filter(Boolean)
    .map((p) => ({ value: p, label: formatPair(p) }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  // ⏱️ Timeframes dispo pour la paire sélectionnée
  const tfOptions = Array.from(new Set(tfs || []))
    .filter(Boolean)
    .map((t) => ({ value: t, label: t }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return (
    <div className="csvshop-filters">

      {/* 📈 Sélecteur de paire */}
      <Select
        id="pair"
        value={pair}
        onChange={setPair}
        options={pairOptions}
        label={null}
        placeholder="Choisir une paire"
        size="md"
        variant="solid"
        className="min-w-[160px]"
      />
      
      {/* ⏱️ Sélecteur de timeframe */}
      <Select
        id="timeframe"
        value={tf}
        onChange={setTf}
        options={tfOptions}
        label={null}
        placeholder="Tous les TF"
        size="md"
        variant="solid"
        className="min-w-[160px]"
      />


      {/* 🗓️ Sélecteur de mois */}
      <Select
        id="month"
        value={month}
        onChange={setMonth}
        options={months}
        label={null}
        placeholder="Tous les mois"
        size="md"
        variant="solid"
        className="min-w-[160px]"
      />

      {/* 🪓 Bouton "extracteur inline" */}
      <CTAButton
        variant="primary"
        leftIcon="⛏"
        onClick={() => setShowExtract(v => !v)}
        className="csvshop-cta-filters"
      >
        {showExtract ? "Fermer l’extracteur" : "Extraction à la demande"}
      </CTAButton>
    </div>
  );
}
