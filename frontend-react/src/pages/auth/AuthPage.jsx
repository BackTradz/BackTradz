// src/pages/auth/AuthPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; // ✅ AJOUT
import LoginForm from "../../components/auth/LoginForm";
import RegisterForm from "../../components/auth/RegisterForm";
import CTAButton from "../../components/ui/button/CTAButton";
import BacktradzLogo from "../../components/ui/BacktradzLogo/BacktradzLogo";
import SignupSuccessOverlay from "../../components/auth/SignupSuccessOverlay"; 
import "./auth.css";


export default function AuthPage() {
  const [isLoginActive, setIsLoginActive] = useState(true);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const navigate = useNavigate(); // ✅ AJOUT

  // ✅ Remplace tout ton useEffect par celui-ci
  useEffect(() => {
    document.body.classList.add("auth-page");

    try {
      const params = new URLSearchParams(window.location.search);
      const provider = params.get("provider");
      const apiKey = params.get("apiKey") || params.get("token"); // compat

      if (provider === "google") {
        const err = params.get("error");
        if (err === "recreate_limit") {
          setOauthError(
            "Tu as déjà recréé un compte 3 fois avec cette adresse. Connecte-toi avec ton compte existant ou utilise un autre e-mail."
          );
          window.history.replaceState({}, document.title, "/login");
        } else if (apiKey) {
          // 🔐 Stocke + montre overlay succès OAuth
          localStorage.setItem("apiKey", apiKey);
          setShowSignupSuccess(true);
          window.history.replaceState({}, document.title, "/login");

          // (facultatif) redirection auto après 1.5s
          const t = setTimeout(() => navigate("/home", { replace: true }), 1500);
          return () => clearTimeout(t);
        }
      }
    } catch (e) {
      console.error("OAuth processing error:", e);
    }

    return () => document.body.classList.remove("auth-page");
  }, [navigate]);


  const handleRegister = async ({ firstName, lastName, email, username, password }) => {
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          username,
          password,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        localStorage.setItem("apiKey", data.token);
        setShowSignupSuccess(true); // 👉 overlay
      } else {
        alert(data.message || "Erreur lors de l'inscription");
      }
    } catch (err) {
      console.error("Erreur register:", err);
      alert("Erreur inattendue.");
    }
  };


  const handleResend = async () => {
    setResendLoading(true);
    try {
      const apiKey = localStorage.getItem("apiKey");
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "X-API-Key": apiKey },
      });

      if (!res.ok) {
        // Tente de lire le JSON d’erreur si dispo
        const isJson = res.headers.get("content-type")?.includes("application/json");
        const errPayload = isJson ? await res.json().catch(() => null) : null;
        const msg = errPayload?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      // Réponse OK : JSON ou vide
      let data = {};
      const isJson = res.headers.get("content-type")?.includes("application/json");
      if (isJson) {
        data = await res.json().catch(() => ({}));
      }

      if (data.verifyUrl) {
        // ⚠️ Nécessite l’état plus haut
        setVerifyUrl?.(data.verifyUrl);
      }

      alert("Nouveau lien de vérification envoyé.");
    } catch (e) {
      console.error(e);
      alert(e?.message || "Erreur lors de la demande.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleLogin = async ({ email, password }) => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (res.ok && data.token) {
        localStorage.setItem("apiKey", data.token);
        navigate("/home"); // ✅ SPA redirect vers /home
      } else {
        alert(data.message || "Identifiants invalides.");
      }
    } catch (err) {
      console.error("Erreur login:", err);
      alert("Erreur inattendue lors de la connexion.");
    }
  };


  return (
    <div className="auth-container">
      {/* BG */}
        <div className="auth-bg" />

        {/* ✅ SUPERPOSITION: on garde la box et on ajoute l'overlay au-dessus */}
        {showSignupSuccess && (
          <div className="overlay-backdrop">
            <SignupSuccessOverlay
              onResend={handleResend}
              resendLoading={resendLoading}
              onClose={() => navigate("/home", { replace: true })} // ✅ SPA redirect
            />
          </div>
        )}

        <div className={`auth-box ${isLoginActive ? "login-active" : "register-active"}`}>
          {/* 🔹 Panneau gauche */}
          <div className="info-panel">
            <div className="flex items-center justify-start p-6">
              <BacktradzLogo size="lg" to="/" className="select-none" />
            </div>

            {isLoginActive ? (
              <>
                <h2>Pas encore inscrit&nbsp;?</h2>
                <p>
                  Rejoins <strong>BackTradz</strong> et prends une longueur d’avance sur tes backtests.
                </p>
                <CTAButton onClick={() => setIsLoginActive(false)} variant="primary" fullWidth>
                  Créer un compte
                </CTAButton>
              </>
            ) : (
              <>
                <h2>Déjà inscrit&nbsp;?</h2>
                <p>Connecte-toi et reprends ton grind là où tu t’étais arrêté.</p>
                <CTAButton onClick={() => setIsLoginActive(true)} variant="primary" fullWidth>
                  Se connecter
                </CTAButton>
              </>
            )}
          </div>

          {/* 🔹 Panneau droit */}
          <div className="form-panel">
            <div className="auth-form login-form">
              {oauthError && (
                <div className="form-error" role="alert" style={{marginBottom:12}}>
                  {oauthError}
                </div>
              )}
              <LoginForm onLogin={handleLogin} />
            </div>
            <div className="auth-form register-form">
              <RegisterForm onRegister={handleRegister} />
            </div>
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
