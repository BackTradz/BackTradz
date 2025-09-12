// src/components/profil/ProfileForm.jsx
import { useEffect, useState } from "react";

/* util: split "Full Name" -> { first, last } */
function splitName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export default function ProfileForm({ user, onSubmit, saving }) {
  const initial = splitName(user?.name || user?.full_name || "");
  const [firstName, setFirstName] = useState(user?.first_name ?? initial.first);
  const [lastName,  setLastName]  = useState(user?.last_name  ?? initial.last);
  const [email,     setEmail]     = useState(user?.email || "");

  // 🔄 Sync quand le user prop est rafraîchi (après /api/me qui suit la maj)
  useEffect(() => {
    const n = splitName(user?.name || user?.full_name || "");
    setFirstName(user?.first_name ?? n.first);
    setLastName(user?.last_name ?? n.last);
    setEmail(user?.email || "");
  }, [user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // on passe toujours le <form> à onSubmit (ton SDK lit FormData dessus)
    onSubmit(e.currentTarget);
  };

  const handleReset = (e) => {
    e.preventDefault();
    const n = splitName(user?.name || user?.full_name || "");
    setFirstName(user?.first_name ?? n.first);
    setLastName(user?.last_name ?? n.last);
    setEmail(user?.email || "");
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <label>Prénom</label>
      <input
        name="first_name"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        placeholder="Ton prénom"
      />

      <label>Nom</label>
      <input
        name="last_name"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
        placeholder="Ton nom"
      />

      <label>Email</label>
      <input
        type="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email@exemple.com"
      />

      <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
        <button className="btn btn-ghost" onClick={handleReset}>
          Réinitialiser
        </button>
      </div>
    </form>
  );
}
