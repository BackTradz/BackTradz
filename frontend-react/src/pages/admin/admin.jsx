// frontend/pages/admin.jsx
// ============================================================
// Dashboard Admin avec sidebar (aucun changement d'API/logiciel)
// - Garde tes composants tels quels
// - Onglets locaux pour éviter la page trop longue
// ============================================================

import { useState } from "react";
import "./admin.css"; // ✅ CSS dédié admin
import AdminMaintenance from "./composants/AdminMaintenance"; // 👈 AJOUT

import AdminSidebar from "./composants/AdminSidebar";
import UserTable from "./composants/UserTable";
import GlobalHistory from "./composants/GlobalHistory";
import Stats from "./composants/Stats";
import BacktestSummary from "./composants/BacktestSummary";

export default function AdminDashboard() {
  // ✅ pas d'URL change → pas de risque de 404 côté router
  const [tab, setTab] = useState("users");

  return (
    <div className="admin-container">
      <AdminSidebar active={tab} onChange={setTab} />

      <main className="admin-main">
        {tab === "users" && <UserTable />}
        {tab === "history" && <GlobalHistory />}
        {tab === "stats" && <Stats />}
        {tab === "backtests" && <BacktestSummary />}
        {tab === "maintenance"  && <AdminMaintenance />} 
      </main>
    </div>
  );
}
