// src/pages/profile/profil.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import "./Profil.css";
import ProfileHeader from "../../components/profil/ProfileHeader";
import AccountSettings from "../../components/profil/AccountSettings";
import DangerZone from "../../components/profil/DangerZone";
import PurchaseHistory from "../../components/profil/PurchaseHistory";
import TopProgress from "../../components/ui/progressbar/TopProgress";
import { me } from "../../sdk/authApi";
import { updateProfile, unsubscribe, deleteAccount } from "../../sdk/userApi";
import SupportCard from "../../components/profil/SupportCard"
import PaymentGraceOverlay from "../../components/overlay/PaymentGraceOverlay";

export default function ProfilPage() {
  const [user, setUser] = useState(null);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [alert, setAlert] = useState(null); // {type: 'success'|'info'|'error'|'warn', text: string, link?: string}
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);


  const hasVerificationBonus =
    Array.isArray(user?.purchase_history) &&
    user.purchase_history.some((h) =>
      ((h?.label || "") + "").toLowerCase().includes("bonus vérification email") ||
      ((h?.label || "") + "").toLowerCase().includes("bonus verification email")
    );

  const isVerifiedView =
    user?.email_verified === true ||
    params.get("verified") === "1" ||
    hasVerificationBonus;
  // Load user
  useEffect(() => {
    let mounted = true;
    const start = Date.now();
    (async () => {
      try {
        const u = await me();
        if (mounted) setUser(u);
      } catch (e) {
        if (mounted) setMsg(e.message || "Erreur de chargement du profil");
      } finally {
        const elapsed = Date.now() - start;
        const remain = Math.max(0, 400 - elapsed);
        setTimeout(() => { if (mounted) setPageLoading(false); }, remain);
      }
     })();
    return () => { mounted = false; };
  }, []);

  const refreshUser = async () => {
    try {
      const fresh = await me();
      setUser(fresh);
    } catch {}
  };


  // Auto-refresh après clic dans l'e-mail : /profile?verified=1|0|error
  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const v = params.get("verified");
    if (!v) return;
    // recharge l'utilisateur pour récupérer email_verified à jour
    refreshUser();
    // (optionnel) petit feedback :
    if (v === "1") setAlert({ type: "success", text: "Adresse e-mail vérifiée. 2 crédits débloqués ✅" });
    else if (v === "0") setAlert({ type: "info", text: "Adresse déjà vérifiée." });
    else setAlert({ type: "error", text: "Lien invalide ou expiré." });
    // Nettoie l'URL (enlève ?verified=…)
    window.history.replaceState({}, document.title, window.location.pathname);

    }, [loc.search]);

  // pour garder la section active 
  useEffect(() => {
    if (!user?.email_verified) refreshUser();
  }, []); 

  const onVerifyEmail = async () => {
    setMsg("");
    setAlert(null);
    setVerifyLoading(true);
    try {
      const apiKey = localStorage.getItem("apiKey");
      if (!apiKey) throw new Error("Non authentifié");
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey
        }
      });
      const data = await res.json();
      if (data.status === "success") {
        // Si le backend renvoie emailed=false, on montre un fallback avec le lien à copier
        if (data.emailed === false && data.verifyUrl) {
          setAlert({
            type: "warn",
            text: "Le mail n’a pas pu être envoyé (config SMTP absente). Copie/ouvre ce lien pour valider :",
            link: data.verifyUrl
          });
        } else {
          setAlert({
            type: "success",
            text: "E-mail de vérification renvoyé. Ouvre ta boîte mail, clique le lien puis reviens et appuie sur « J’ai validé »."
          });
        }
      } else {
        setAlert({ type: "error", text: data.message || "Impossible de générer l’e-mail de vérification." });
      }
    } catch (e) {
      setAlert({ type: "error", text: "Erreur serveur: " + (e.message || "inconnue") });
    } finally {
      setVerifyLoading(false);
    }
  };

  const onSaveProfile = async (formEl) => {
    setSaving(true);
    setMsg("");
    try {
      const fd = new FormData(formEl);
      // 1) On construit le full_name soumis
      const first_name = (fd.get("first_name") || "").trim();
      const last_name  = (fd.get("last_name")  || "").trim();
      const email      = (fd.get("email")      || "").trim();
      const full_name  = (first_name + " " + last_name).trim() || (user?.full_name || user?.name || "");

      // 2) 🔥 Mise à jour OPTIMISTE du state local (pas d’attente réseau)
      setUser((prev) => ({
        ...prev,
        email: email || prev?.email,
        full_name,
        name: full_name,                 // au cas où l’UI lit `name`
        first_name: first_name || prev?.first_name,
        last_name: last_name || prev?.last_name,
      }));

      // 3) POST réel
      const res = await updateProfile(fd);
      setMsg(res?.message || "Profil mis à jour");

      // 4) Re-sync depuis le backend SANS écraser l'identité que l'on vient de saisir.
      setTimeout(async () => {
        try {
          const fresh = await me();
          setUser((prev) => ({
            // On garde l'identité optimiste (prénom/nom/email saisis)
            ...prev,
            // On ne met à jour que les champs “non-identité”
            plan:    fresh?.plan    ?? prev?.plan,
            credits: fresh?.credits ?? prev?.credits,
            // si ton back met bien à jour l’email immédiatement, enlève la ligne ci-dessous
            // email: fresh?.email ?? prev?.email,
          }));
        } catch {}
      }, 120);
    } catch (e) {
      setMsg("❌ " + (e.message || "Erreur serveur"));
    } finally {
      setSaving(false);
    }
  };

  const onUnsubscribe = async () => {
    setMsg("");
    try {
      const r = await unsubscribe();
      setMsg(r?.message || "Abonnement annulé");
      const u = await me();
      setUser(u);
    } catch (e) {
      setMsg("❌ " + (e.message || "Erreur serveur"));
    }
  };

  const onDelete = async () => {
    if (!confirm("Supprimer définitivement le compte ?")) return;
    setMsg("");
    try {
      const r = await deleteAccount();
      setMsg(r?.message || "Compte supprimé");
      localStorage.removeItem("apiKey");
      window.location.href = "/login";
    } catch (e) {
      setMsg("❌ " + (e.message || "Erreur serveur"));
    }
  };

  if (!user) {
    return (
      <div className="page-profile container fade-in">
        <TopProgress active={pageLoading} />
        <div className="skeleton-card" />
        <div className="skeleton-row" />
        <div className="skeleton-row" />
      </div>
    );
  }


  return (
    <div className="page-profile container fade-in">
      <TopProgress active={pageLoading} />

      <h1 className="page-title">Mon profil</h1>

      <ProfileHeader user={user} />

      {/* Actions compte rapides */}
      <div className="quick-actions slide-up">
        <button
          className="btn btn-ghost"
          onClick={() => { localStorage.removeItem("apiKey"); window.location.href = "/login"; }}
        >
          Se déconnecter
        </button>
        <button className="btn btn-outline" onClick={onUnsubscribe}>
          Se désabonner
        </button>
        <button className="btn btn-danger" onClick={onDelete}>
          Supprimer le compte
        </button>
      </div>

      <AccountSettings
        user={user}
        onSaveProfile={onSaveProfile}
        saving={saving}
      />
        
      


    
      {/* Section Vérification e-mail */}
      {!isVerifiedView ? (
        <div className="card slide-up">
          <h2 className="card-title">Vérifier mon e-mail</h2>
          <p className="mb-3 opacity-80">
            Validez votre adresse e-mail pour <strong>débloquer 2 crédits offerts</strong>.
            Vous pouvez continuer à utiliser BackTradz sans vérification.
          </p>
          {alert && (
            <div
              className={
                "alert " +
                (alert.type === "success" ? "alert-success" :
                 alert.type === "warn"    ? "alert-warn"    :  
                alert.type === "error"   ? "alert-error"   : "alert-info")
              }
              style={{ marginBottom: 12 }}
            >
              <div className="alert-text">{alert.text}</div>
              {alert.link && (
                <div className="alert-actions">
                  <input
                    readOnly
                    value={alert.link}
                    onFocus={(e)=>e.target.select()}
                    className="alert-link-input"
                  />
                  <button
                    className="btn btn-outline"
                    onClick={() => { navigator.clipboard?.writeText(alert.link); }}
                  >
                    Copier
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => window.open(alert.link, "_blank", "noopener,noreferrer")}
                  >
                    Ouvrir
                  </button>
                </div>
              )}
            </div>
          )}
          
          <p className="mb-2 opacity-80">Un e-mail de confirmation te sera envoyé. Clique le lien pour débloquer 2 crédits.</p>
                <div className="flex gap-2 flex-wrap">
                    <button className="btn btn-primary" onClick={onVerifyEmail} disabled={verifyLoading}>
                      {verifyLoading ? "Envoi en cours..." : "Renvoyer l’e-mail de vérification"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card slide-up">
                  <h2 className="card-title">Adresse e-mail vérifiée ✅</h2>
                  <p className="mb-0 opacity-80">
                    Votre adresse <strong className="email">{user?.email}</strong> est bien vérifiée.
                  </p>
                </div>
              )}
      
      {/* Support (1 colonne centrée) */}
    <div className="card slide-up support-card">
      <h2 className="card-title text-center">Support & assistance</h2>
      <p className="text-center opacity-80 mb-3">
        Disponible <strong>24h/24 – 7j/7</strong>. Réponse rapide par e-mail.<br />
        Notre équipe t’accompagne jusqu’à résolution.
      </p>
      <ul className="list-disc list-inside opacity-80 mb-4 text-sm max-w-md mx-auto">
        <li>Accompagnement personnalisé</li>
        <li>Suivi des demandes</li>
        <li>Aide technique & facturation</li>

      </ul>
      <div className="text-center">
        <a href="support/support" className="btn btn-outline">Contacter le support</a>
      </div>
    </div>





      <div className="card slide-up">
        <h2 className="card-title">Achats / Backtest</h2>
        <PurchaseHistory history={user?.purchase_history} />
      </div>

      {msg && <div className="toast">{msg}</div>}

    </div>
  );
}
