import { motion } from "framer-motion";
import CTAButton from "../../../components/ui/button/CTAButton";
import AnimatedEMABG from "./AnimatedEMABG";
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
    <div className="hero-bg" aria-hidden="true">
      <AnimatedEMABG
        speedPx={12}          // vitesse du flux
        segW={20}
        candleW={16}
        barGapPx={2}
        volatility={0.30}
        yPadding={16}         // occupe plus de hauteur
        emaFastPeriod={10}
        emaSlowPeriod={30}
        lineFast="#39c5ff"
        lineSlow="#8ab4ff"
        fillFastColor="#39c5ff"
        showNeon
        neonBlur={10}
        showPillars
        pillarCount={6}
        pillarColor="#39c5ff"
        showSparks
        sparkCount={18}
        sparkColor="#9ad7ff"
        autoScale
        scaleMargin={0.14}
        scaleSmoothing={0.10}
        minScaleSpan={0.20}
        followAnchor
        anchorPos={0.62} // laisse ~38% d'air au-dessus du prix
        edgeGuard
        edgeGuardPx={14}
        edgeSnap={0.8}      // passe à 1 pour “snap” immédiat si ça touche le bord  
        interactiveTrading={false}
        showPnLDemo={false}
        showPnLOverlay={false}     
        accountStart={10000}
        positionSize={1}
        pipValue={10}
        pipFactor={10000}
        priceBase={1.10000}
        priceRange={0.01000}
        pnlSmooth={0.25}  
      />
      </div>


      <motion.div
        className="content content-tight max-w-3xl px-6 relative z-10 text-center -mt-12"
        initial={{ opacity: 0, y: 36 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white mb-2">
          Backteste nos stratégies. Découvre les heures gagnantes.
        </h1>

        <p className="text-base md:text-lg text-slate-300 mb-3 leading-snug font-medium">
          Identifie les moments les plus rentables par paire, timeframe et session grâce à des analyses automatiques.
        </p>

        <CTAButton onClick={goAnalyze}>
          Lancer mon premier backtest
        </CTAButton>

        {/* Badge sous le bouton */}
        <div className="mt-2 text-sm text-cyan-200 opacity-90">
          2 crédits <strong>offerts</strong> dès ton inscription — instantané avec Google, ou après confirmation rapide par e-mail.
        </div>
      </motion.div>
    </section>
  );
}
