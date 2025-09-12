import React from "react";
import CTAButton from "../../components/ui/button/CTAButton";
import Select from "../../components/ui/select/select";

/**
 * 🎛️ Filtres de la boutique CSV
 * - Recherche textuelle
 * - Sélecteurs de paire et de mois
 * - Toggle vers l’extracteur
 */
export default function CSVShopFilters({
  q, setQ,
  pair, setPair, pairs,
  month, setMonth, months,
  showExtract, setShowExtract,
}) {
  return (
    <div className="csvshop-filters">
      {/* 🔍 Recherche texte libre */}
      <input
        placeholder="Rechercher (tf, fichier)…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* 📈 Sélecteur de paire */}
      <Select
        id="pair"
        value={pair}
        onChange={setPair}
        options={pairs}
        label={null}
        placeholder="Choisir une paire"
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
