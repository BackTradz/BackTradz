import React, { useState, useEffect } from "react";
import TopStrategies from "./composants/TopStrategies";
import HeroSection from "./composants/HeroSection";
import HeroMessage from "./composants/HeroMessage";
import TopProgress from "../../components/ui/progressbar/TopProgress";

import "./Home.css"; // <-- ajoute ce fichier

export default function Home() {
  const [strategy, setStrategy] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), 450); // mini 450ms smooth
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="home-page">
      <TopProgress active={pageLoading} />
      <HeroSection />
      {/* Bloc argumentaire sous le graphique */}
      <section className="home-wide section-pad">
        <HeroMessage
          variant="below"
          onPrimaryClick={() => (window.location.href = "/backtest")}
        />
      </section>
      
      {/* Garde le petit texte en container si tu veux, mais mets les cartes en wide */}

        <p className="home-bridge">
          Explore les stratégies les plus performantes, visualise les heures rentables et 
          inspire-toi pour booster tes résultats de trading.
        </p>

      <section className="home-wide section-pad">
        <TopStrategies />
      </section>
        </div>
  );
}

