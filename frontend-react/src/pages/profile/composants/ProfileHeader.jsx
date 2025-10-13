// src/components/profil/ProfileHeader.jsx
import { useState } from "react";                // ⬅️ ajout
import UserAvatar from "../../../components/ui/useravatar/UserAvatar";
import AvatarColorPicker from "../../../components/ui/useravatar/AvatarColorPicker";

export default function ProfileHeader({ user }) {
  const [showEmail, setShowEmail] = useState(false);   // ⬅️ popover mobile

  // 🗓️ Date de renouvellement (inchangé)
  const rawRenewal =
    user?.subscription?.renew_date || user?.renew_date || user?.next_renewal || null;
  let renewalLabel = null;
  if (rawRenewal) {
    try {
      const d = new Date(rawRenewal);
      if (!isNaN(d.getTime())) {
        renewalLabel = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
      }
    } catch {}
  }

  // 📋 copier l’e-mail (utile dans le popover)
  const copyEmail = async () => {
    try { await navigator.clipboard?.writeText(user?.email || ""); } catch {}
  };


  return (
  <div className="card slide-up" style={{ animationDelay: "20ms" }}>
    <div className="profile-hero-row">
      {/* Avatar */}
      <UserAvatar user={user} size="lg" className="user-bubble" />

      {/* ===== Desktop : bloc infos complet ===== */}
      <div className="profile-hero-infos desktop-only">
        <div className="user-name">{user?.name || user?.full_name || user?.email}</div>
        <div className="user-email" title={user?.email}>{user?.email}</div>
        <div className="user-meta">
          Plan: <b>{user?.plan ?? "free"}</b> — Crédits: <b>{user?.credits ?? 0}</b>
          {renewalLabel && <> — Renouvellement: <b>{renewalLabel}</b></>}
        </div>
      </div>

  

      {/* ===== Mobile : liste propre (ligne 2) ===== */}
      <ul className="mobile-list mobile-only">
        <li><span className="label">Plan</span><b className="value">{user?.plan ?? "free"}</b></li>
        <li><span className="label">Crédits</span><b className="value">{user?.credits ?? 0}</b></li>
        {renewalLabel && (
          <li><span className="label">Renouvellement</span><b className="value">{renewalLabel}</b></li>
        )}
      </ul>

      {/* V1.3 — Color picker unique (desktop & mobile) */}
      <div className="unified-picker">
        <AvatarColorPicker />
      </div>
    </div>
  </div>
);
}
