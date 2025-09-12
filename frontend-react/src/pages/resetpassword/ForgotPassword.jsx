// src/pages/auth/ForgotPassword.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import BacktradzLogo from "../../components/ui/BacktradzLogo/BacktradzLogo";
import CTAButton from "../../components/ui/button/CTAButton";
import "../auth/auth.css"; // même CSS que AuthPage

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    document.body.classList.add("auth-page");
    return () => document.body.classList.remove("auth-page");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      setLoading(true);
      const res = await fetch("/api/auth/generate-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json(); // réponse générique
      setDone(true);
    } catch (err) {
      console.error(err);
      setDone(true); // on reste générique côté UX
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-bg" />

      <div className="auth-box login-active">
        {/* panneau gauche (branding) */}
        <div className="info-panel">
          <div className="flex items-center justify-start p-6">
            <BacktradzLogo size="lg" to="/" className="select-none" />
          </div>
          <h2>Mot de passe oublié</h2>
          <p>Entre ton adresse e-mail pour recevoir un lien de réinitialisation.</p>
        </div>

        {/* panneau droit (form) */}
        <div className="form-panel">
          {!done ? (
            <form className="auth-form login-form" onSubmit={handleSubmit}>
              <h2 className="form-title">Réinitialiser</h2>

              <input
                type="email"
                className="form-input"
                placeholder="Adresse e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                required
                autoComplete="email"
              />

              <CTAButton type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le lien"}
              </CTAButton>

              <div className="form-inline">
                <Link to="/login">← Retour</Link>
              </div>
            </form>
          ) : (
            <div className="auth-form login-form">
              <h2 className="form-title">Vérifie ta boîte mail</h2>
              <p>Si un compte existe pour cette adresse, un lien de reset a été envoyé.</p>
              <CTAButton onClick={() => navigate("/login")} fullWidth>
                Revenir à la connexion
              </CTAButton>
            </div>
          )}
        </div>
      </div>

      <div className="auth-legal">
        <a href="/legal/mentions">Mentions légales</a>
        <a href="/legal/cgu">Conditions d’utilisation</a>
        <a href="/legal/confidentialite">Confidentialité</a>
      </div>
    </div>
  );
}
