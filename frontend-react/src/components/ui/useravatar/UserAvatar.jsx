// src/components/ui/useravatar/UserAvatar.jsx
import React, { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function getApiKey() {
  try { return localStorage.getItem("apiKey") || ""; } catch { return ""; }
}
function readScopedAvatarColor() {
  try {
    const apiKey = getApiKey();
    const nsKey = apiKey ? `avatarColor:${apiKey}` : null;
    // priorité à la clé namespacée
    if (nsKey) {
      const v = localStorage.getItem(nsKey);
      if (isHex(v)) return v;
    }
    // fallback legacy
    const old = localStorage.getItem("avatarColor");
    if (isHex(old)) return old;
  } catch {}
  return null;
}
function isHex(v){ return typeof v === "string" && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v); }

export default function UserAvatar({ user = {}, size = "md", className = "" }) {
  const navigate = useNavigate();

  const initials = useMemo(() => {
    const full =
      user?.name ||
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
      user?.email || "";
    if (!full) return "U";
    const parts = full.trim().split(/\s+/);
    const a = parts[0]?.[0] || "";
    const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (a + b).toUpperCase();
  }, [user]);

  // 🔄 “version” qui force la relecture du localStorage quand la couleur change
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onLs = (e) => {
      // on écoute la clé namespacée du user courant + l'ancienne clé
      const apiKey = getApiKey();
      const myKey = apiKey ? `avatarColor:${apiKey}` : null;
      if (!e || e.key === "avatarColor" || (myKey && e.key === myKey)) {
        setVersion(v => v + 1);
      }
    };
    const onCustom = () => setVersion(v => v + 1);
    window.addEventListener("storage", onLs);
    window.addEventListener("avatarColorChanged", onCustom);
    return () => {
      window.removeEventListener("storage", onLs);
      window.removeEventListener("avatarColorChanged", onCustom);
    };
  }, []);

  const bgColor = useMemo(() => {
    // 1) scope par user → 2) fallback legacy → 3) palette à partir du seed
    const scoped = readScopedAvatarColor();
    if (scoped) return scoped;
    return pickColor(user?.email || user?.name || "default");
  }, [user, version]);

  // ✅ texte auto-contrasté (blanc sur fond sombre, noir sur fond clair)
  const fgColor = useMemo(() => pickTextColor(bgColor, "#0b1220", "#ffffff"), [bgColor]);
  const dims = sizeMap(size);

  return (
    <button
      type="button"
      onClick={() => navigate("/profile")}
      title={user?.name || user?.email || "Profil"}
      className={[
        "inline-flex items-center justify-center",
        "rounded-full aspect-square",
        "p-0 m-0 border-0 outline-none",
        "leading-none select-none font-semibold uppercase",
        "shadow-none",
        dims.wrapper,
        dims.text,
        className,               // ⬅️ on laissera la navbar injecter .user-bubble (hover)
      ].join(" ")}
      style={{
        backgroundColor: bgColor,
        color: fgColor,
        textShadow: fgColor === "#ffffff"
          ? "0 0 1px rgba(0,0,0,.35)"
          : "0 0 1px rgba(255,255,255,.35)",
      }}
    >
      {initials}
    </button>
  );
}

/* --- Utils --- */
function pickColor(seed) {
  const palette = ["#1E3A8A","#2563EB","#1E40AF","#3B82F6","#0F172A","#334155","#4F46E5","#1D4ED8","#312E81"];
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = (h << 5) - h + seed.charCodeAt(i); h |= 0; }
  return palette[Math.abs(h) % palette.length];
}
function sizeMap(size) {
  switch (size) {
    case "sm": return { wrapper: "h-8 w-8",  text: "text-[11px]" };
    case "lg": return { wrapper: "h-12 w-12", text: "text-[16px]" };
    case "md":
    default:   return { wrapper: "h-10 w-10", text: "text-[13px]" };
  }
}
function pickTextColor(bgHex, dark = "#0b1220", light = "#ffffff") {
  const rgb = hexToRgb(bgHex);
  if (!rgb) return light;
  const Lbg = relLuminance(rgb.r, rgb.g, rgb.b);
  const Llight = 1;
  const Ldark  = relLuminance(11, 18, 32);
  const contrastLight = contrastRatio(Llight, Lbg);
  const contrastDark  = contrastRatio(Lbg, Ldark);
  return contrastLight >= contrastDark ? light : dark;
}
function hexToRgb(hex){ if(!hex) return null; let h=hex.replace("#",""); if(h.length===3) h=h.split("").map(c=>c+c).join(""); if(h.length!==6) return null; const n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:(n>>0)&255}; }
function srgbToLin(c){ c/=255; return c<=0.04045? c/12.92 : Math.pow((c+0.055)/1.055,2.4); }
function relLuminance(r,g,b){ return 0.2126*srgbToLin(r)+0.7152*srgbToLin(g)+0.0722*srgbToLin(b); }
function contrastRatio(L1,L2){ const [a,b]=L1>=L2?[L1,L2]:[L2,L1]; return (a+0.05)/(b+0.05); }
