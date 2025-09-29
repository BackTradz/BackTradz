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
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import posthog, { startReplayIfAllowed } from './analytics/posthog';

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
  const loc = useLocation();

  useEffect(() => {
    posthog?.capture?.('$pageview');
    startReplayIfAllowed(loc.pathname);
  }, [loc.pathname]);

  return (
    <Routes>
      {/* === PUBLIC (lecture) === */}
      <Route element={<AppLayout />}>
        {/* Accueil */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />

        {/* Pages marketing / lecture ouvertes */}
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/csv-shop" element={<CSVShop />} />
        <Route path="/backtest" element={<Backtest />} />
        <Route path="/a-savoir" element={<ASavoir />} />
        <Route path="/success" element={<Success />} />
      </Route>

      {/* Auth / reset (public) */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      {/* Aliases legacy */}
      <Route path="/resetpassword/forgot-password" element={<ForgotPassword />} />
      <Route path="/resetpassword/reset-password/:token" element={<ResetPassword />} />

      {/* Mentions / CGU / Privacy / Support (public) */}
      <Route path="/legal/mentions-legales" element={<MentionsLegales />} />
      <Route path="/legal/cgu" element={<ConditionsGenerales />} />
      <Route path="/legal/politique-confidentialite" element={<PolitiqueConfidentialite />} />
      {/* Alias pour le lien /support */}
      <Route path="/support" element={<SupportPage />} />
      <Route path="/support/support" element={<SupportPage />} />

      {/* === PROTECTED === */}
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {/* 🔐 Dashboard redevient protégé */}
          <Route path="/dashboard" element={<Dashboard />} />
          {/* 🔐 Profil = nécessite auth */}
          <Route path="/profile" element={<Profile />} />
          {/* 🔐 Admin = nécessite auth + admin */}
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback → Home */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
