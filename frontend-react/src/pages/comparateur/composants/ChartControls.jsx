// Composant contrôles du comparateur (type de graph + métrique)
// - Réutilise ton Select custom
// - Garde EXACTEMENT la même structure CSS (.cmp-box .cmp-tools .cmp-selects .cmp-select)
// - Aucune logique métier modifiée : on passe les valeurs/handlers en props

import React from "react";
import Select from "../../../components/ui/select/Select"; // <-- même Select que tu utilises ailleurs

export default function ChartControls({
  chartType,
  setChartType,
  metric,
  setMetric,
  CHART_TYPES,
  METRICS,
}) {
  return (
    <div className="cmp-box cmp-tools">
      <div className="cmp-selects">
        <div className="cmp-select">
          <label>Type</label>
          <Select
            id="cmp-chart-type"
            value={chartType}
            onChange={setChartType}
            options={CHART_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            placeholder="Type de graphique"
            size="md"
            variant="solid"
            fullWidth={false}
            zStack="global"
          />
        </div>

        <div className="cmp-select">
          <label>Métrique</label>
          <Select
            id="cmp-metric"
            value={metric}
            onChange={setMetric}
            options={METRICS.map((m) => ({ value: m.value, label: m.label }))}
            placeholder="Choisir une métrique"
            size="md"
            variant="solid"
            fullWidth={false}
            zStack="global"
          />
        </div>
      </div>
    </div>
  );
}
