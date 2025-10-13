import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import "./HeroMessage.css";

// Variants unifiés (section + enfants) — subtils et performants
const sectionFx = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1, y: 0,
    transition: { duration: 0.38, ease: "easeOut", staggerChildren: 0.06, delayChildren: 0.04 }
  }
};
const childFx = {
  hidden: { opacity: 0, y: 16, scale: 0.985, filter: "blur(6px)" },
  show:   { opacity: 1, y: 0,  scale: 1,     filter: "blur(0px)",
            transition: { duration: 0.45, ease: [0.22,0.61,0.36,1] } }
};

export default function HeroMessage({ onPrimaryClick }) {
  const prefersReduced = useReducedMotion();
  return (
    <div className="hero-msg hero-msg--below">
      <motion.div
        className="hero-card hero-card--below hero-card--minimal"
        variants={sectionFx}
        initial={prefersReduced ? false : "hidden"}
        whileInView={prefersReduced ? false : "show"}
        viewport={{ once: true, amount: 0.25 }}
      >
        <div className="hero-inner">
          <motion.h1 className="hero-title" variants={childFx}>
            Créé par des <span className="accent">traders</span>, pour les <span className="accent">traders</span>
          </motion.h1>

          <motion.p className="hero-sub" variants={childFx}>
            <span className="only-desktop">
              Paires disponibles : <strong>Crypto</strong>, <strong>Forex</strong>, <strong>Indices</strong>, en <strong>multi-timeframes</strong>.
              Backtest, compare plusieurs <strong>mois</strong> et <strong>stratégies</strong> en quelques clics — <strong>sans coder</strong>.
            </span>
            <span className="only-mobile">
              Backtests, toutes paires, <strong>sans coder</strong>.
            </span>
          </motion.p>

          {/* Ligne compacte : chips seules (CTA supprimé) */}
          <motion.div className="hero-row" variants={childFx}>
            <div className="chips chips--minimal">
              <span className="chip">Backtests en 3 clics</span>
              <span className="chip">Heures/sessions/jours/...</span>
              <span className="chip chip--opt">Comparaisons mensuelles</span>
            </div>
          </motion.div>

        </div>
     </motion.div>
    </div>
  );
}
