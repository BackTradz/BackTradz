import React, { useState } from "react";
import GoogleLoginButton from "../../../components/ui/GoogleLoginButton";
import CTAButton from "../../../components/ui/button/CTAButton";

// ✅ Formulaire de connexion utilisateur
// - Gère l'identification avec e-mail ou username + mot de passe
// - Contient un bouton Google + lien "mot de passe oublié"
// - Appelle la fonction `onLogin` en props avec les identifiants

export default function LoginForm({ onLogin }) {
  // Gestion des champs de saisie (username ou email, et password)
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault(); // bloque le rechargement de la page
    if (typeof onLogin === "function") {
      await onLogin(identifier, password); // appel de la fonction de login
    }
  };

  return (
    <form className="auth-form-inner" onSubmit={handleSubmit}>
      <h2 className="form-title">Connexion</h2>

      {/* Champ identifiant ou email */}
      <input
        type="text"
        placeholder="Adresse email ou identifiant"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value.trimStart())}
        required
        className="form-input"
        autoComplete="username email"
        inputMode="email"
        aria-label="Adresse e-mail ou identifiant"
      />

      {/* Champ mot de passe */}
      <input
        type="password"
        placeholder="Mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className="form-input"
        autoComplete="current-password"
      />

      {/* Bouton CTA principal */}
      <CTAButton
        type="submit"
        variant="primary"
        fullWidth
      >
        Se connecter
      </CTAButton>

      {/* Lien mot de passe oublié */}
      <div className="form-inline">
        <span>Mot de passe oublié ?</span>
        <a href="/forgot-password">Réinitialiser</a>
      </div>

      {/* Connexion via Google */}
      <div className="google-button-wrapper">
        <GoogleLoginButton />
      </div>
    </form>
  );
}
