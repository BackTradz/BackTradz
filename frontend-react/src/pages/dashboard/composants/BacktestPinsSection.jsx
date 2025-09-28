// src/components/dashboard/BacktestPinsSection.jsx
// Affiche les épingles locales associées à un dossier de backtest (folder).
import React, { useEffect, useState } from "react";

export default function BacktestPinsSection({ folder }) {
  const [pins, setPins] = useState([]);
  useEffect(() => {
    try {
      const all = JSON.parse(localStorage.getItem("btPins_v1") || "[]");
      setPins(all.filter(p => p.folder === folder));
    } catch { setPins([]); }
  }, [folder]);
  if (!pins.length) return null;
  return (
    <div className="dbt-pins">
      <div className="dbt-pins-title">Mes épingles</div>
      <div className="dbt-pins-grid">
        {pins.map((p,i)=>(
          <div key={i} className="dbt-pin">
            {/* ⬇️ ICI : on ajoute pin-scroll pour activer le scroll horizontal mobile */}
            <div className="line pin-scroll">
              <b>{p.type}</b> • <code>{p.key}</code>
            </div>
            <div className="val">
              {typeof p.value==="number" ? (Math.round(p.value*100)/100) : String(p.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
