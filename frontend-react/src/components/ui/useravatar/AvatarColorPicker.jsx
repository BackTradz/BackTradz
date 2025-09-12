// src/components/ui/useravatar/AvatarColorPicker.jsx
import React, { useEffect, useState } from "react";

/**
 * Stockage SANS régression:
 *  - Nouveau: localStorage["avatarColor:<apiKey>"]
 *  - Ancien:  localStorage["avatarColor"] (fallback + migration automatique)
 */
function getApiKey() {
  try { return localStorage.getItem("apiKey") || ""; } catch { return ""; }
}
function getNsKey() {
  const apiKey = getApiKey();
  return apiKey ? `avatarColor:${apiKey}` : "avatarColor";
}
function readColor() {
  try {
    const apiKey = getApiKey();
    const nsKey = apiKey ? `avatarColor:${apiKey}` : null;
    // 1) priorité à la clé namespacée
    if (nsKey) {
      const v = localStorage.getItem(nsKey);
      if (v) return v;
    }
    // 2) fallback legacy
    const old = localStorage.getItem("avatarColor");
    // 3) migration douce: si on a un old mais pas de ns → on copie
    if (old && nsKey && !localStorage.getItem(nsKey)) {
      localStorage.setItem(nsKey, old);
    }
    return old || "#223C66";
  } catch {
    return "#223C66";
  }
}
function writeColor(value) {
  try {
    const nsKey = getNsKey();
    localStorage.setItem(nsKey, value);     // nouvelle clé (scopée user)
    localStorage.setItem("avatarColor", value); // compat héritée (aucune régression)
  } catch {}
}

export default function AvatarColorPicker({ onChange }) {
  const [color, setColor] = useState("#223C66");

  useEffect(() => {
    setColor(readColor());
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setColor(value);
    writeColor(value);
    // notifie l’app pour mettre à jour l’avatar sans reload
    window.dispatchEvent(new Event("avatarColorChanged"));
    onChange?.(value);
  };

  return (
    <div className="color-picker-wrapper">
      <input
        id="bubbleColor"
        type="color"
        value={color}
        onChange={handleChange}
        className="color-input"
      />
      <label
        htmlFor="bubbleColor"
        className="color-bubble"
        style={{ backgroundColor: color }}
      />
      <span className="color-label">Couleur de l’avatar</span>
    </div>
  );
}
