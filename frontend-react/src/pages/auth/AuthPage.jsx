// src/pages/auth/AuthPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ gère la redirection next
import LoginForm from "../../components/auth/LoginForm";
import RegisterForm from "../../components/auth/RegisterForm";
import CTAButton from "../../components/ui/button/CTAButton";
import BacktradzLogo from "../../components/ui/BacktradzLogo/BacktradzLogo";
import SignupSuccessOverlay from "../../components/auth/SignupSuccessOverlay"; 
import "./auth.css";
import { login } from "../../sdk/authApi";
import { useAuth } from "../../auth/AuthContext"; 
import posthog, { posthogIdentify } from '../../analytics/posthog';

// Helper: identifie après login en tentant /api/me (pour récupérer l'email)
// v1.2: utilise le header attendu par le backend: X-API-Key
async function safeIdentifyAfterLogin(getToken, identifierMaybeEmail) {
  try {
    const token = typeof getToken === 'function' ? getToken() : getToken;
    if (!token) return; // pas connecté → on sort sans rien faire
    let user = null;
    if (token) {
      const meRes = await fetch('/api/me', {
        headers: { 'X-API-Key': token }
      }).catch(() => null);
      if (meRes && meRes.ok) {
      user = await meRes.json().catch(() => null); // silencieux
    }
    }
    if (!user) {
      const id = identifierMaybeEmail || '';
      user = {
        email: (id && id.includes('@')) ? id : '',
        username: id || 'anonymous'
      };
    }
    posthogIdentify(user); // ⛔ bloquera tes emails internes
  } catch { /* no-op */ }
}


export default function AuthPage() {
  const [isLoginActive, setIsLoginActive] = useState(true);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { loginSuccess } = useAuth(); // << récupère le helper du contexte
  
  // v1.2 — Lit et sécurise le paramètre ?next=… (interne uniquement)
  const nextTarget = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search);
      const raw = params.get('next') || '';
      // sécurité anti open-redirect: on n’accepte que les chemins internes
      if (!raw) return '/home';
      if (/^https?:\/\//i.test(raw)) return '/home';
      return raw.startsWith('/') ? raw : '/home';
    } catch { return '/home'; }
  }, [location.search]);
  
  // ✅ Gère le retour OAuth Google + affichage overlay succès
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
         // On reste sur la page actuelle, pas besoin de forcer /login ici
        } else if (apiKey) {
          // ✅ 1) Peuple le contexte tout de suite (Navbar voit les crédits sans refresh)
          // ✅ attendre la fin de l’hydratation pour éviter le bounce
          loginSuccess(apiKey)
            .then(async () => {
              try { posthog.capture('login_success', { provider: 'google' }); } catch {}
              // ✅ On récupère l'email via /api/me puis on applique le blocage interne
              await safeIdentifyAfterLogin(() => apiKey);
              setShowSignupSuccess(true);
              // v1.2 — respecte ?next=… (sécurisé)
              navigate(nextTarget, { replace: true });
            })
            .catch(() => {
              // en cas d’échec rarissime de /me, on reste sur /login et on affiche l’erreur si besoin
            });
        }
      }
    } catch (e) {
      console.error("OAuth processing error:", e);
    }

    return () => document.body.classList.remove("auth-page");
  }, [navigate, nextTarget]);


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
        loginSuccess(data.token); // << idem : on peuple le contexte
        // 🔐 Bloque tes comptes PostHog si email interne (et identifie sinon)
        posthogIdentify({ email, username, first_name: firstName, last_name: lastName });
        setShowSignupSuccess(true);
        // v1.2 — Redirige vers next (si overlay fermé par le CTA onClose, tu restes couvert)
        navigate(nextTarget, { replace: true });
      } else {
        alert(data.message || "Erreur lors de l'inscription");
      }
    } catch (err) {
      console.error("Erreur register:", err);
      alert("Erreur inattendue.");
    }
  };

  const handleLogin = async (identifier, password) => {
    try {
      const data = await login(identifier, password);
      if (data?.token) {
        loginSuccess(data.token);      // << met le user dans le contexte maintenant
        // ✅ Identifie proprement (email via /api/me si possible)
        await safeIdentifyAfterLogin(() => data.token, identifier);
        // v1.2 — Respecte le retour vers la page initiale
        navigate(nextTarget);
      } else {
        alert(data.message || "Identifiants invalides");
      }
    } catch (err) {
      console.error("Erreur login:", err);
      alert(err.message || "Erreur inattendue");
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
            {isLoginActive ? (
              <div className="auth-form login-form">
                {oauthError && (
                  <div className="form-error" role="alert" style={{ marginBottom: 12 }}>
                    {oauthError}
                  </div>
                )}
                <LoginForm onLogin={handleLogin} />
              </div>
            ) : (
              <div className="auth-form register-form">
                <RegisterForm onRegister={handleRegister} />
              </div>
            )}
          </div>
         </div>


      <div className="auth-legal">
        {/* v1.2 — aligne sur App.jsx */}
        <a href="/legal/mentions-legales">Mentions légales</a>
        <a href="/legal/cgu">Conditions d’utilisation</a>
        <a href="/legal/politique-confidentialite">Confidentialité</a>
      </div>
    </div>
  );
}
