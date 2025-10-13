import React from "react";
import { Link, useLocation } from "react-router-dom";
//background//
import HexNeonBackground from "../../components/background/HexNeonBackground";
import "./legal.css";
import MetaRobots from "../../components/seo/MetaRobots";

export default function LegalLayout({ title, children }) {
  const { pathname } = useLocation();

  const tabs = [
    { to: "/legal/mentions-legales", label: "Mentions légales" },
    { to: "/legal/politique-confidentialite", label: "Politique de confidentialité" },
    { to: "/legal/cgu", label: "Conditions générales" },
  ];

  return (
    <div className="legal-page min-h-screen">
      <MetaRobots content="index,follow" />
       {/* BG global (hex neon) */}
      <HexNeonBackground />

      {/* ✅ tout le contenu passe AU-DESSUS du canvas */}
      <div className="legal-content">
      <header className="legal-hero">
        <div className="container-std">
          <div className="legal-topbar">
            <nav className="mini-nav">
              <Link to="/" className="mn-link">← Accueil</Link>
              <span className="mn-sep">•</span>
              <Link to="/a-savoir" className="mn-link">À savoir</Link>
              <Link to="/support/support" className="mn-link">Support</Link>
            </nav>
          </div>

          <h1 className="legal-title">{title}</h1>
          <p className="legal-subtitle">
            Documents juridiques et informations clés de la plateforme.
          </p>

          <nav className="legal-tabs">
            {tabs.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className={`legal-tab ${pathname === t.to ? "is-active" : ""}`}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container-std">
        <section className="legal-card">{children}</section>
      </main>
      </div>
    </div>
  );
}
