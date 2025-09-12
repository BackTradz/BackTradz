// src/pages/support/Support.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./support.css";
import { Section } from "../../components/a_savoir/Section";

// ⚠️ ajuste le chemin si besoin suivant ton projet
import PillTabs from "../../components/ui/switchonglet/PillTabs";
// ⚠️ ajuste le chemin si besoin suivant ton projet
import CTAButton from "../../components/ui/button/CTAButton";

export default function SupportPage() {
  const [active, setActive] = useState("contact"); // "contact" | "feedback"
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const items = [
    { id: "contact",  label: "Assistance & questions", icon: "💬" },
    { id: "feedback", label: "Améliorations & bugs",   icon: "🛠️" },
  ];

  // ===== API helper: lit VITE_API_BASE ou VITE_BACKEND_URL =====
  const API_BASE = (import.meta.env?.VITE_API_BASE || import.meta.env?.VITE_BACKEND_URL || "")
    .replace(/\/+$/, ""); // supprime trailing slashes
  const api = (path) => {
    const p = path.startsWith("/") ? path : `/${path}`;
    return API_BASE ? `${API_BASE}${p}` : p;
  };

  // ===== Submit handler (unique pour les 2 onglets) =====
  async function handleSubmit(e, kind /* 'contact' | 'feedback' */) {
    e.preventDefault();
    if (submitting) return;

    const form = e.currentTarget; // capture AVANT les await (évite l'event pooling)
    setSubmitting(true);

    // NB: on harmonise les name sur "message" dans les 2 forms (simplifie)
    const fd = new FormData(form);
    const payload = {
      type: kind,
      firstName: fd.get("firstName") || fd.get("firstName2") || "",
      lastName:  fd.get("lastName")  || fd.get("lastName2")  || "",
      email:     fd.get("email")     || fd.get("email2")     || "",
      message:   fd.get("message")   || "",
      meta: { path: window.location.pathname, ts: Date.now() },
    };

    const email = payload.email?.trim() || "";
    if (!email.includes("@")) {
      alert("Merci d’entrer une adresse e-mail valide (doit contenir un @).");
      setSubmitting(false);
      return;
    }


    try {
      const res = await fetch(api("/api/support"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let reason = "Envoi impossible. Réessayez dans un instant.";
        try {
          const data = await res.json();
          if (data?.detail) reason = data.detail;
        } catch {}
        throw new Error(reason);
      }

      // succès
      form.reset();
      setSent(true);                     // active l'état visuel "succès"
      alert("Merci ! Votre message a bien été envoyé ✅");
      setTimeout(() => setSent(false), 1600); // retour visuel automatique
    } catch (err) {
      console.error(err);
      alert(err.message || "Désolé, l’envoi a échoué. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="support-page min-h-screen">
      {/* HERO (centré) */}
      <section className="support-hero">
        <div className="container-std" style={{ textAlign: "center" }}>
          <h1 className="title">📩 Support & Contact</h1>
          <p className="subtitle">
            Une question, un problème ou une idée d’amélioration ? Nous sommes à votre écoute.
          </p>

          {/* mini-nav simple (pas de pills) */}
          <div className="mini-nav">
            <Link to="/" className="mn-link">← Accueil</Link>
            <span className="mn-sep">•</span>
            <Link to="/dashboard" className="mn-link">Dashboard</Link>
            <Link to="/backtest" className="mn-link">Backtest</Link>
            <Link to="/csv-shop" className="mn-link">CSV Shop</Link>
          </div>
        </div>
      </section>

      {/* PANEL */}
      <section className="container-std">
        {/* On masque le titre interne pour éviter la redondance */}
        <Section id="support" title={null} hint={null}>
          {/* Close dans le panel, à gauche */}
          <Link to="/" className="panel-close panel-close--left" aria-label="Fermer">
            <span className="x" aria-hidden="true"></span>
          </Link>

          {/* Switch centré */}
          <div className="tabs-center">
            <PillTabs items={items} value={active} onChange={setActive} size="md" />
          </div>

          {/* ===== Form 1 : Assistance & questions ===== */}
          {active === "contact" && (
            <form className="support-form" onSubmit={(e) => handleSubmit(e, "contact")}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lastName">Nom</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Votre nom"
                    required
                    autoComplete="family-name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="firstName">Prénom</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="Votre prénom"
                    required
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-span-2">
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Votre email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    pattern="[^@\s]+@[^@\s]+"
                    title="L’adresse e-mail doit contenir un « @ »"
                    onInvalid={(e) => e.currentTarget.setCustomValidity("Merci d’entrer une adresse e-mail valide (doit contenir un @).")}
                    onInput={(e) => e.currentTarget.setCustomValidity("")}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Expliquez-nous votre problème ou votre question…"
                  rows={8}
                  required
                />
              </div>

              <CTAButton
                type="submit"
                leftIcon={sent ? "✅" : "📨"}
                fullWidth
                disabled={submitting}
                data-state={sent ? "success" : undefined}
              >
                {submitting ? "Envoi..." : sent ? "Envoyé" : "Envoyer"}
              </CTAButton>
            </form>
          )}

          {/* ===== Form 2 : Améliorations & bugs ===== */}
          {active === "feedback" && (
            <form className="support-form" onSubmit={(e) => handleSubmit(e, "feedback")}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lastName2">Nom</label>
                  <input
                    id="lastName2"
                    name="lastName2"
                    type="text"
                    placeholder="Votre nom"
                    required
                    autoComplete="family-name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="firstName2">Prénom</label>
                  <input
                    id="firstName2"
                    name="firstName2"
                    type="text"
                    placeholder="Votre prénom"
                    required
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group col-span-2">
                  <label htmlFor="email2">Email</label>
                  <input
                    id="email2"
                    name="email2"
                    type="email"
                    placeholder="Votre email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    pattern="[^@\s]+@[^@\s]+"
                    title="L’adresse e-mail doit contenir un « @ »"
                    onInvalid={(e) => e.currentTarget.setCustomValidity("Merci d’entrer une adresse e-mail valide (doit contenir un @).")}
                    onInput={(e) => e.currentTarget.setCustomValidity("")}
                  />

                </div>
              </div>

              <div className="form-group">
                <label htmlFor="message2">Suggestion ou bug</label>
                <textarea
                  id="message2"
                  name="message"
                  placeholder="Décrivez votre idée ou le bug rencontré…"
                  rows={8}
                  required
                />
              </div>

              <CTAButton
                type="submit"
                leftIcon={sent ? "✅" : "📨"}
                fullWidth
                disabled={submitting}
                data-state={sent ? "success" : undefined}
              >
                {submitting ? "Envoi..." : sent ? "Envoyé" : "Envoyer"}
              </CTAButton>
            </form>
          )}

          {/* Note légale (2 lignes, centrage de la 1ère sur la 2ème) */}
          <div className="footer">
            <div className="note-block">
              <p className="muted small-note line-1">
                🔒 Vos informations ne sont utilisées que pour répondre à votre demande.
              </p>
              <p className="muted small-note line-2">
                Consultez nos{" "}
                <Link to="/legal/mentions-legales" className="link">Mentions légales</Link>,{" "}
                <Link to="/legal/politique-confidentialite" className="link">Politique de confidentialité</Link>{" "}
                et{" "}
                <Link to="/legal/cgu" className="link">Conditions générales</Link>.
              </p>
            </div>
          </div>
        </Section>
      </section>
    </div>
  );
}
