// src/pages/auth/ResetPassword.jsx
import React, { useEffect, useState } from "react";
import { api } from "../../sdk/apiClient";
import { useParams, Link, useNavigate } from "react-router-dom";
import BacktradzLogo from "../../components/ui/BacktradzLogo/BacktradzLogo";
import CTAButton from "../../components/ui/button/CTAButton"
import "../auth/auth.css";
import MetaRobots from "../../components/seo/MetaRobots";

export default function ResetPassword() {
  const { token } = useParams(); // route: /reset-password/:token
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    document.body.classList.add("auth-page");
    return () => document.body.classList.remove("auth-page");
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErrMsg("");
    if (pw.length < 8) return setErrMsg("8 caractères minimum.");
    if (pw !== pw2) return setErrMsg("Les mots de passe ne correspondent pas.");

    try {
      setLoading(true);
      const data = await api(`/api/auth/reset-password/${token}`, {
        method: "POST",
        body: { new_password: pw },
        auth: false,
      });
      if (data?.status === "success") {
        setOk(true);
        // redirection automatique vers /login
        setTimeout(() => { window.location.href = "/login?reset=1"; }, 1200);
      }
    } catch (e) {
      console.error(e);
      setErrMsg("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <MetaRobots content="noindex,nofollow" />
      <div className="auth-bg" />

      <div className="auth-box login-active">
        <div className="info-panel">
          <div className="flex items-center justify-start p-6">
            <BacktradzLogo size="lg" to="/" className="select-none" />
          </div>
          <h2>Nouveau mot de passe</h2>
          <p>Définis un nouveau mot de passe sécurisé pour ton compte.</p>
        </div>

        <div className="form-panel">
          {!ok ? (
            <form className="auth-form login-form" onSubmit={submit}>
              <h2 className="form-title">Définir le mot de passe</h2>

              <input
                type="password"
                className="form-input"
                placeholder="Nouveau mot de passe (min. 8)"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
                required
              />
              <input
                type="password"
                className="form-input"
                placeholder="Confirme le mot de passe"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
                required
              />

              {errMsg && <p className="form-error" aria-live="polite">{errMsg}</p>}

              <CTAButton type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? "Validation..." : "Valider"}
              </CTAButton>

              <div className="form-inline">
                <Link to="/login">← Retour</Link>
              </div>
            </form>
          ) : (
            <div className="auth-form login-form">
              <h2 className="form-title">C’est fait ✅</h2>
              <p>Ton mot de passe a été mis à jour. Tu peux te connecter.</p>
              <CTAButton onClick={() => navigate("/login")} fullWidth>
                Se connecter
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
