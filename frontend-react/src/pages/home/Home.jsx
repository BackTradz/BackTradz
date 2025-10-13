import React, { useState, useEffect } from "react";
import TopStrategies from "./composants/TopStrategies";
// [v1.3 - retouche design] Hero désactivé pour ce clone (fond prioritaire)
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
      {/* [v1.3 - retouche design] Hero OFF (gardé en commentaire pour portage prod) */}
      <HeroSection />
      {/* Bloc argumentaire sous le graphique */}
      <section className="home-wide section-pad">
        <HeroMessage
          variant="below"
          onPrimaryClick={() => (window.location.href = "/backtest")}
        />
      </section>
      
     
      <section className="home-wide section-pad">
        <TopStrategies />
      </section>
        </div>
  );
}

