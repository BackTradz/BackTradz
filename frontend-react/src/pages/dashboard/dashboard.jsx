// src/pages/dashboard.jsx
import { useEffect, useState } from "react";
import "./dashboard.css";
import { useAuth } from "../../auth/AuthContext";
import { me } from "../../sdk/authApi";

import BacktestList from "./composants/BacktestList";
import CsvList from "./composants/CsvList";
import PillTabs from "../../components/ui/switchonglet/PillTabs";
import PinnedInsightsWall from "./composants/PinnedInsightsWall";
import MetaRobots from "../../components/seo/MetaRobots";

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const [active, setActive] = useState("dashboard");
  const [showPins, setShowPins] = useState(false); // fermé par défaut

  useEffect(() => {
    (async () => {
      if (!user) {
        try {
          const u = await me();
          setUser(u);
        } catch (e) {
          console.error("❌ /api/me:", e);
        }
      }
    })();
  }, []);

   return (
    // ⛳ Garde anti-sursaut : réserve ~60vh pendant le chargement des listes
    <div className="dash-container dash-wide dash-flat page-skeleton-guard">
      <MetaRobots content="noindex,nofollow" />
      {/* Onglets */}
      <div className="row-center row-top">
        <PillTabs
          value={active}
          onChange={setActive}
          align="center"
          items={[
            { id: "dashboard", label: "Mon dashboard" },
            { id: "csv",       label: "Mes CSV" }
          ]}
        />
      </div>

      <section className="panel">
        {/* Ne met le titre panel qu'en mode CSV */}
        {active === "csv" && <h2 className="panel-title">Mes CSV</h2>}

        {active === "dashboard" ? (
          <>
            {/* SECTION EPINGLES */}
            <section className="pins-section">
              <div className="pins-header">
                <h2 className="panel-title">Mes épingles</h2>
                <button
                  className="btn-toggle"
                  onClick={() => setShowPins(s => !s)}
                  aria-expanded={showPins}
                  aria-controls="pins-panel"
                >
                  {showPins ? "Masquer" : "Afficher"}
                </button>
              </div>

              {showPins && (
                <div id="pins-panel" className="pins-panel">
                  {/* Pas de gros titre interne */}
                  <PinnedInsightsWall embedded />
                </div>
              )}
            </section>

            {/* Séparateur premium entre sections */}
           <div className="section-sep" aria-hidden="true" />

            {/* Titre BACKTESTS placé sous la section épingles */}
            <h2 className="panel-title db-title">Mes backtests</h2>
            <BacktestList />
          </>
        ) : (
          <CsvList />
        )}
      </section>
    </div>
  );
}
