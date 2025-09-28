// src/components/profil/PurchaseHistory.jsx
import React, { useMemo, useState, useCallback } from "react";

export default function PurchaseHistory({ history }) {
  const [expanded, setExpanded] = useState(false);
  const [openGroups, setOpenGroups] = useState({}); // { "sept. 2025": true, ... }

  // Toujours les mêmes hooks, peu importe l'état :
  const items = useMemo(() => {
    if (!Array.isArray(history)) return [];
    const copy = history.slice();
    copy.sort((a, b) => (new Date(b?.date || 0)) - (new Date(a?.date || 0)));
    return copy;
  }, [history]);

  // On calcule toujours les groupes (même si on ne les affiche pas)
  const groups = useMemo(() => groupByMonth(items), [items]);
  const groupEntries = useMemo(() => Object.entries(groups), [groups]);

  const toggleGroup = useCallback((label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }, []);

  if (!items.length) {
    return <p className="muted">Aucun achat pour l’instant.</p>;
  }

  if (!expanded) {
    const top5 = items.slice(0, 5);
    return (
      <div className="purchase-compact">
        {top5.map((p, i) => (
          <PurchaseRow key={`${p?.date || "d"}-${i}`} item={p} />
        ))}
        {items.length > 5 && (
          <button className="btn btn-outline mt-10" onClick={() => setExpanded(true)}>
            Afficher tout ({items.length - 5} de plus)
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="purchase-full">
      <button className="btn btn-ghost mb-10" onClick={() => setExpanded(false)}>
        ⟵ Revenir aux 5 derniers
      </button>

      <div className="accordion">
        {groupEntries.map(([label, rows]) => {
          const isOpen = openGroups[label] !== false; // ouvert par défaut
          return (
            <div key={label} className="accordion-item slide-up">
              <button
                type="button"
                className="accordion-summary"
                onClick={() => toggleGroup(label)}
                aria-expanded={isOpen}
              >
                <span className="acc-title">{label}</span>
                <span className="acc-count">{rows.length} achats</span>
                <span className={`acc-chevron ${isOpen ? "rot" : ""}`} aria-hidden>▾</span>
              </button>

              <div
                className={`accordion-content ${isOpen ? "open" : ""}`}
                /* ✅ laisse toute la hauteur dispo quand ouvert (transition OK) */
                style={{ maxHeight: isOpen ? 9999 : 0 }}
              >
                {rows.map((p, i) => (
                  <PurchaseRow key={`${p?.date || "d"}-${i}`} item={p} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Helpers ---------- */

function PurchaseRow({ item }) {
  const raw = item?.offer_id || item?.label || "Téléchargement CSV";
  const title = normalizeLabel(raw);   // ✅ corrige l'encodage si besoin
  const date = safeDateLabel(item?.date);
  return (
    <div className="purchase-row" aria-label="transaction">
      <div className="purchase-main">
        <div className="purchase-title">{title}</div>
        <div className="purchase-meta">
          {date} {item?.amount ? `— ${item.amount}` : ""}
        </div>
      </div>
      {item?.txid ? <div className="purchase-tx">TX: {item.txid}</div> : null}
    </div>
  );
}
/* Répare les labels UTF-8 mal décodés en Latin-1 (ex: "CrÃ©dits" -> "Crédits") */
function normalizeLabel(s) {
  if (!s || typeof s !== "string") return s;
  try {
    // Heuristique rapide: si on voit des séquences Ã© Ã¨ Ãª … on tente la réparation
    if (/[ÃÂ][©¨ª«±¢¤®¯°¼½¾µ§×÷]/.test(s)) {
      const bytes = Uint8Array.from([...s].map(c => c.charCodeAt(0) & 0xFF));
      return new TextDecoder("utf-8").decode(bytes);
    }
    return s;
  } catch {
    // Fallback minimal pour quelques cas connus
    return s
      .replaceAll("CrÃ©", "Cré")
      .replaceAll("Ã©", "é")
      .replaceAll("Ã¨", "è")
      .replaceAll("Ãª", "ê")
      .replaceAll("Ã ", "à")
      .replaceAll("Ã´", "ô");
  }
}

function groupByMonth(items) {
  const map = {};
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const d = new Date(it?.date || Date.now());
    const label = monthLabel(d);
    if (!map[label]) map[label] = [];
    map[label].push(it);
  }
  return map;
}

function monthLabel(d) {
  try {
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  } catch {
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${m}/${d.getFullYear()}`;
  }
}

function safeDateLabel(s) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  try {
    return d.toLocaleString();
  } catch {
    return d.toISOString();
  }
}
