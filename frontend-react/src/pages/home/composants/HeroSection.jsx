
import CTAButton from "../../../components/ui/button/CTAButtonHome";
import { useNavigate } from "react-router-dom";

export default function HeroSection() {
  const navigate = useNavigate();

  // v1.2 — Toujours diriger vers /backtest (même en public).
  // La page Backtest gère désormais elle-même le message "inscrivez-vous…"
  // et/ou les gardes d'actions si non connecté.
  const goAnalyze = () => {
    navigate("/backtest");
  };

  return (
    <section className="hero">
      {/* bg isolé, toujours derrière */}
      <div className="hero-bg" aria-hidden="true" />

      <div className="content content-tight max-w-3xl relative z-10 text-center -mt-12">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white mb-2">
      <span className="only-desktop">Backtests pro, sans coder une ligne.</span>
      <span className="only-mobile">Backtests pro. Sans code.</span>
    </h1>

    <p className="text-base md:text-lg text-slate-300 mb-3 leading-snug font-medium">
      <span className="only-desktop">
        Identifie les moments les plus rentables par paire, timeframe et session grâce à des analyses automatiques.
      </span>
      <span className="only-mobile">
        Repère les heures rentables par paire, TF et session.
      </span>
    </p>


        <div className="hero-cta">
          <CTAButton onClick={goAnalyze}>
            <span className="only-desktop">Lancer mon premier backtest</span>
            <span className="only-mobile">Lancer un backtest</span>
          </CTAButton>
        </div>


        <div className="hero-note mt-2 text-sm text-cyan-200 opacity-90">
          <span className="only-desktop">
            2 crédits <strong>offerts</strong> dès ton inscription — instantané avec Google, ou après confirmation rapide par e-mail.
          </span>
          <span className="only-mobile">
            2 crédits <strong>offerts</strong> à l’inscription.
          </span>
        </div>
      </div>

    </section>
  );
}
