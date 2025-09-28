// frontend/pages/admin.jsx
// ============================================================
// Dashboard Admin avec sidebar (aucun changement d'API/logiciel)
// - Garde tes composants tels quels
// - Onglets locaux pour éviter la page trop longue
// ============================================================

import { useState } from "react";
import "./admin.css"; // ✅ CSS dédié admin
import AdminMaintenance from "./composants/AdminMaintenance"; // 👈 AJOUT

import AdminSidebar from "./composants/admin/AdminSidebar";
import UserTable from "./composants/admin/UserTable";
import GlobalHistory from "./composants/admin/GlobalHistory";
import Stats from "./composants/admin/Stats";
import BacktestSummary from "./composants/admin/BacktestSummary";

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
