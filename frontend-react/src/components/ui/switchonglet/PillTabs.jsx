// src/components/ui/PillTabs.jsx
import { useMemo } from "react";
import "./tabs.css"

export default function PillTabs({
  items = [],            // [{ id: 'dashboard', label: 'Mon dashboard', icon?: '🏷️' }]
  value,                 // id actif
  onChange,              // (id) => void
  size = "md",           // 'sm' | 'md' | 'lg'
  fullWidth = false,     // occupe toute la largeur
  className = "",
}) {
  const activeIdx = useMemo(
    () => Math.max(0, items.findIndex((t) => t.id === value)),
    [items, value]
  );

  const onKeyDown = (e) => {
    if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (activeIdx + dir + items.length) % items.length;
    onChange?.(items[next].id);
  };

  return (
    <div
      role="tablist"
      aria-label="Section switch"
      className={[
        "pill-tabs",
        `pill-tabs--${size}`,
        fullWidth ? "pill-tabs--block" : "",
        className,
      ].join(" ")}
      onKeyDown={onKeyDown}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            className={`pill-tab-btn ${active ? "active" : ""}`}
            onClick={() => onChange?.(t.id)}
            type="button"
          >
            {t.icon && <span className="pill-ic">{t.icon}</span>}
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
