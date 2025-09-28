import React from "react";
import { motion } from "framer-motion";
import "./HeroMessage.css";

const container = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", staggerChildren: 0.08 }
  }
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } }
};

export default function HeroMessage({ onPrimaryClick }) {
  return (
    <div className="hero-msg hero-msg--below">
      <motion.div
        className="hero-card hero-card--below hero-card--minimal"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.h1 className="hero-title" variants={item}>
         Créé par des <span className="accent">traders</span>, pour les <span className="accent">traders</span>.
        </motion.h1>

        <motion.p className="hero-sub" variants={item}>
          Teste des <strong>centaines de trades</strong> sur plusieurs <strong>mois</strong> et obtiens
          les meilleurs <strong>taux de réussite</strong> par <strong>heure</strong>, <strong>session</strong> et <strong>journée</strong> — en quelques minutes.
          Fini les backtests manuels interminables.
        </motion.p>

        <motion.div className="chips chips--minimal" variants={item}>
          <span className="chip">OB & FVG automatisés</span>
          <span className="chip">Backtests multi-paires / multi-TF</span>
          <span className="chip">Taux de réussite par heure & session</span>
        </motion.div>

        <motion.div className="hero-actions" variants={item}>
          <a className="link-ghost" href="/a-savoir">Voir comment ça marche</a>
        </motion.div>

        <motion.ul className="hero-bullets hero-bullets--grid" variants={item}>
          <li><strong>Backtests massifs</strong> en quelques minutes (multi-paires, multi-timeframes).</li>
          <li>Détection automatique des <strong>heures et sessions gagnantes</strong>.</li>
          <li>Exports <strong>.xlsx</strong> et <strong>CSV</strong> clairs, prêts à analyser ou à utiliser pour tes backtests.</li>
        </motion.ul>

      </motion.div>
    </div>
  );
}
