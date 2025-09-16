// ============================================================
// App.jsx
// ------------------------------------------------------------
// RÔLE :
// - Déclarer les routes de l'application (Login public, reste protégé)
// - Afficher un header simple avec des liens de navigation
//
// NOTE :
// - Les routes protégées sont englobées dans <RequireAuth />.
// - On n'ajoute AUCUNE route backend : on consomme uniquement /api/... existants.
// ============================================================
// App.jsx
// App.jsx
// ⬇️ ajoute (ou complète) cet import
import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import RequireAdmin from "./auth/RequireAdmin";
import AppLayout from "./layouts/AppLayout";

// Pages publiques
import Home from "./pages/home/Home";
import AuthPage from "./pages/auth/AuthPage";
import ForgotPassword from "./pages/resetpassword/ForgotPassword";
import ResetPassword from "./pages/resetpassword/ResetPassword";
import MentionsLegales from "./pages/legal/MentionsLegales";
import ConditionsGenerales from "./pages/legal/ConditionsGenerales";
import PolitiqueConfidentialite from "./pages/legal/PolitiqueConfidentialite";
import SupportPage from "./pages/support/support";



// Pages privées
import Backtest from "./pages/backtest/Backtest.jsx";
import CSVShop from "./pages/CSVShop/CSVShop.jsx";
import Pricing from "./pages/pricing/Pricing.jsx";
import Profile from "./pages/profile/Profile.jsx";
import Dashboard from "./pages/dashboard/dashboard.jsx";
import AdminDashboard from "./pages/admin/admin";
import ASavoir from "./pages/asavoir/a_savoir";
import Success from "./pages/Success";

export default function App() {
  return (
      <Routes>
      {/* === PUBLIC === */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />   {/* Home publique AVEC Navbar/Footer */}
        {/* ✅ Alias explicite : /home pointe vers la même Home (utile car tu y vas manuellement) */}
        <Route path="/home" element={<Home />} />
      </Route>

      <Route path="/login" element={<AuthPage />} />
      <Route path="/resetpassword/forgot-password" element={<ForgotPassword />} />
      <Route path="/resetpassword//reset-password/:token" element={<ResetPassword />} />
      <Route path="/legal/mentions-legales" element={<MentionsLegales />} />
      <Route path="/legal/cgu" element={<ConditionsGenerales />} />
      <Route path="/legal/politique-confidentialite" element={<PolitiqueConfidentialite />} />
      <Route path="/support/support" element={<SupportPage />} />
      {/* === PROTECTED (layout + auth) === */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/csv-shop" element={<CSVShop />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/a-savoir" element={<ASavoir />} />
          <Route path="/success" element={<Success />} />

          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
          {/* 🧯 Fallback global SPA : si une route n’existe pas, renvoie vers /home (évite le NotFound) */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
    </Routes>

  );
}
