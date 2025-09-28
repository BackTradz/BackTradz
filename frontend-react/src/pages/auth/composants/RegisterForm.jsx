import React, { useState } from "react";
import GoogleLoginButton from "../../../components/ui/GoogleLoginButton";
import CTAButton from "../../../components/ui/button/CTAButton";

// ✅ Formulaire d'inscription utilisateur
// - Demande prénom, nom, pseudo, e-mail, mot de passe
// - Déclenche `onRegister(formData)` en props
// - Comporte également un bouton de connexion Google

export default function RegisterForm({ onRegister }) {
  // Stocke tous les champs du formulaire dans un seul objet
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: "",
  });

  // Mise à jour d’un champ quand l'utilisateur tape
  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Soumission du formulaire
  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof onRegister === "function") onRegister(formData);
  };

  return (
    <form className="auth-form-inner" onSubmit={handleSubmit}>
      <h2 className="form-title">Créer un compte</h2>

      {/* Champ prénom */}
      <input
        type="text"
        name="firstName"
        placeholder="Prénom"
        value={formData.firstName}
        onChange={handleChange}
        required
        className="form-input"
        autoComplete="given-name"
      />

      {/* Champ nom */}
      <input
        type="text"
        name="lastName"
        placeholder="Nom"
        value={formData.lastName}
        onChange={handleChange}
        required
        className="form-input"
        autoComplete="family-name"
      />

      {/* Champ username */}
      <input
        type="text"
        name="username"
        placeholder="Nom d’utilisateur"
        value={formData.username}
        onChange={handleChange}
        required
        className="form-input"
        autoComplete="username"
      />

      {/* Champ e-mail */}
      <input
        type="email"
        name="email"
        placeholder="Adresse email"
        value={formData.email}
        onChange={handleChange}
        required
        className="form-input"
        autoComplete="email"
        inputMode="email"
        pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
      />

      {/* Champ mot de passe */}
      <input
        type="password"
        name="password"
        placeholder="Mot de passe"
        value={formData.password}
        onChange={handleChange}
        required
        className="form-input"
        autoComplete="new-password"
      />

      {/* Bouton soumission */}
      <CTAButton
        type="submit"
        variant="primary"
        fullWidth
      >
        S'inscrire
      </CTAButton>

      {/* Bouton Google */}
      <div className="google-button-wrapper">
        <GoogleLoginButton />
      </div>
    </form>
  );
}
