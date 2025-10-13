// src/components/profil/PasswordForm.jsx
import { useState } from "react";
import CTAButton from "../../../components/ui/button/CTAButton";

export default function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState("");

  const callSetPassword = async (url) => {
    const apiKey = localStorage.getItem("apiKey");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({
        current_password: currentPassword || null,
        new_password: newPassword,
      }),
    });
    return res;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    try {
      let res = await callSetPassword("/api/profile/set-password");
      if (res.status === 404) res = await callSetPassword("/profile/set-password");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.message || "Erreur serveur");
      setMsg("✅ Mot de passe mis à jour !");
      setCurrentPassword(""); setNewPassword("");
    } catch (err) {
      setMsg("❌ " + err.message);
    }
  };

  return (
    <form onSubmit={onSubmit} className="form-grid">
      <label htmlFor="newPwd">Mot de passe actuel</label>
      <input
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Optionnel"
      />
      <small id="pwd-hint" className="form-hint">
        optionnel ; laisser vide si jamais défini
      </small>

      <label htmlFor="newPwd">Nouveau mot de passe</label>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Au moins 8 caractères"
        required
      />
      <small id="pwd-hint" className="form-hint">
        Utilise au moins 8 caractères, mélange de lettres, chiffres et symboles recommandé.
      </small>

      <CTAButton type="submit">Enregistrer le mot de passe</CTAButton>
      {msg && <p className="muted" style={{ marginTop: 6 }}>{msg}</p>}
    </form>
  );
}
