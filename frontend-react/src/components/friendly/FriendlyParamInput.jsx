// [CHANGE: 2025-09-04 - input param qui affiche label user mais conserve la clé backend]
import {
  resolveParamLabel,
  resolveParamHelp,
  resolveParamType,
  resolveParamConstraints,
} from "../../lib/labels";

/**
 * strategyKey: string (clé backend de la stratégie) — pour afficher les overrides de labels
 * paramKey: string (clé backend du param, ex: "min_wait_candle")
 * value: any (valeur du param)
 * onChange: (newValue) => void
 */
// …imports inchangés…

export default function FriendlyParamInput({
  strategyKey,
  paramKey,
  value,
  onChange,
  label: labelProp,
  help: helpProp,
  required = false,
}) {
  // …tes résolutions de label/type/help…
  const type = resolveParamType(strategyKey, paramKey) || "text";
  const label = labelProp || resolveParamLabel(strategyKey, paramKey) || paramKey;
  const help  = helpProp  || resolveParamHelp(strategyKey, paramKey) || "";
  const constraints = resolveParamConstraints(strategyKey, paramKey) || {};

  // 👉 rendu conditionnel pour boolean
  if (type === "boolean") {
    const checked = Boolean(value);
    return (
      <div className="flex items-center gap-2">
        <input
          id={`bool-${paramKey}`}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange && onChange(e.target.checked)}
          className="h-4 w-4 accent-blue-600"
        />
        <label htmlFor={`bool-${paramKey}`} className="text-sm">{label}</label>
        {help && <p className="text-xs text-neutral-400 ml-2">{help}</p>}
      </div>
    );
  }

  // …rendu actuel pour number/text…
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm">{label}</label>
      <input
        type={type === "number" ? "number" : "text"}
        value={value ?? ""}
        required={required}
        onChange={(e) => {
          const v = type === "number" ? Number(e.target.value) : e.target.value;
          onChange && onChange(v);
        }}
        {...constraints}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
      />
      {help && <p className="text-xs text-neutral-400">{help}</p>}
    </div>
  );
}
