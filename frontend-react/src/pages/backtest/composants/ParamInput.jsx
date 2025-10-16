// components/backtest/ParamInput.jsx
import { useState } from "react"; // ✅ nécessaire pour l'UI min_overlap_ratio


// 🧩 Champ d’entrée dynamique pour les paramètres d’une stratégie
// - Peut être input texte/numérique ou case à cocher (booléen)

export default function ParamInput({
  id,
  name,          // 👈 nom exact côté backend
  scope,         // 👈 "official" ou "custom"
  label,
  defaultValue,
  type = "text",
  onChange,
}) {
  // ⛑️ Garde-fou: si pas de nom, on ne rend rien (évite crash)
  if (!name) return null;

  // ────────────────────────────────────────────────────────────────────────────
  // 🎛 Cas spécial : min_overlap_ratio
  // - Par défaut: "Entrée à la touche" (case cochée) ⇒ on n'envoie PAS de valeur
  //   et le backend garde son défaut (OB=0.01, FVG=0.00).
  // - Si décoché: l'utilisateur sélectionne un pourcentage (10/25/50) ou sa valeur.
  // - Le tout reste AU MÊME ENDROIT que les autres paramètres.
  // - On expose un <input type="hidden" name="min_overlap_ratio" data-param="1">
  //   dont la value est "" (vide) en mode "touche" OU (pct/100) sinon.
  // - Aucune dépendance au collector: un champ vide sera ignoré par collectParams().
  // ────────────────────────────────────────────────────────────────────────────
  if (name === "min_overlap_ratio") {
    // UI states locaux (indépendants de la valeur par défaut backend pour simplifier l'UX)
    // 👉 Par défaut on COCHE "Entrée à la touche".
    const [touch, setTouch] = useState(true);
    const [pct, setPct] = useState(10); // valeur % par défaut si décoché

   // Quick-select handlers
    const setQuick = (v) => setPct(v);

    // Valeur envoyée au backend lorsque "touche" est DÉcoché : ratio décimal
    const ratio = touch ? "" : String(Math.max(0, Number(pct)) / 100);

    return (
      <div className="bt-field">
        <label htmlFor={`${id}_touch`} className="text-sm">{label}</label>
       {/* Hidden réel envoyé au collector */}
        <input
          id={id}
          name={name}
          type="hidden"
          data-scope={scope}
          data-param="1"
          value={ratio}
          readOnly
        />

        {/* Ligne 1 : toggle "Entrée à la touche" (par défaut cochée) */}
        <div className="flex items-center mt-1">
          <input
            id={`${id}_touch`}
            type="checkbox"
            className="bt-check"          
            checked={touch}
            onChange={(e) => {
              const v = e.target.checked;
              setTouch(v);
              // remonte une info au parent si besoin
              onChange?.(name, v ? "" : (Number(pct) / 100));
            }}
          />
          <label htmlFor={`${id}_touch`} className="text-sm">
            Entrée à la touche <span className="text-slate-400">(recommandé)</span>
          </label>
        </div>

        {/* Ligne 2 : préréglages + input (%) — visibles seulement si décoché */}
        {!touch && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <button type="button" className="bt-chip bt-chip--solid text-xs"
                onClick={() => { setQuick(10); onChange?.(name, 0.10); }}>
                10%
              </button>
              <button type="button" className="bt-chip bt-chip--solid text-xs"
                onClick={() => { setQuick(25); onChange?.(name, 0.25); }}>
                25%
              </button>
              <button type="button" className="bt-chip bt-chip--solid text-xs"
                onClick={() => { setQuick(50); onChange?.(name, 0.50); }}>
                50%
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0.1" max="100" step="0.1"
                value={pct}
                onChange={(e) => {
                  const val = e.target.value;
                  setPct(val);
                  const dec = Math.max(0, Number(val)) / 100;
                  onChange?.(name, dec);
                }}
                className="w-28 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
                aria-label="Profondeur minimale (%)"
              />
              <span className="text-sm text-slate-400">Profondeur min (%)</span>
            </div>
          </div>
        )}
      </div>
    );
  }
 // ☑️ Mode booléen → checkbox
  if (type === "boolean" || type === "bool") {
    const checked = Boolean(defaultValue);
    return (
      <div className="bt-field bt-field--inline">
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={checked}
          data-scope={scope}
          data-param="1"
          onChange={(e) => onChange?.(name, e.target.checked)}
          className="bt-check"
        />
        <label htmlFor={id}>{label}</label>
      </div>
    );
  }

  // 📝 Mode texte/numérique
  return (
    <div className="bt-field">
      <label htmlFor={id} className="text-sm">{label}</label>
      <input
        id={id}
        name={name}
        type={type === "number" ? "number" : "text"}
        defaultValue={defaultValue ?? ""}
        data-scope={scope}
        data-param="1"
        onChange={(e) => {
          const v = type === "number" ? Number(e.target.value) : e.target.value;
          onChange?.(name, v);
        }}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
      />
    </div>
  );
}
