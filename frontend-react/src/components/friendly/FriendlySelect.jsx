// [CHANGE: 2025-09-04 - select générique supportant strategies/pairs/...]
// Utilisation : <FriendlySelect mapping="strategies" value="ob_pullback..." onChange={(v)=>...} />

import { strategyOptions, pairOptions } from "../../lib/labels";

/**
 * mapping: "strategies" | "pairs"
 * value: string (clé backend)
 * onChange: (backendKey) => void
 * disabled?: bool
 * label?: string (texte au-dessus)
 * help?: string (petit texte explicatif)
 */
export default function FriendlySelect({
  mapping = "strategies",
  value,
  onChange,
  disabled = false,
  label,
  help,
  name, // optionnel: name html
  className = "",
}) {
  const opts =
    mapping === "pairs"
      ? pairOptions()
      : strategyOptions(); // default strategies

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <select
        name={name}
        value={value || ""}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
      >
        <option value="" disabled>— Sélectionner —</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {help && <p className="text-xs text-neutral-400">{help}</p>}
    </div>
  );
}
