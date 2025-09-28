// components/backtest/ParamInput.jsx

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
  // ☑️ Mode booléen → checkbox
  if (type === "boolean" || type === "bool") {
    const checked = Boolean(defaultValue);
    return (
      <div className="bt-field">
        <label htmlFor={id} className="text-sm">{label}</label>
        <input
          id={id}
          name={name}
          type="checkbox"
          defaultChecked={checked}
          data-scope={scope}
          data-param="1"
          onChange={(e) => onChange?.(name, e.target.checked)}
          className="h-4 w-4 accent-blue-600 ml-1"
        />
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
