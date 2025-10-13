// src/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Navbar.css";
import HamburgerButton from "./HamburgerButton";
// src/components/ui/navbar/Navbar.jsx
import UserAvatar from "../useravatar/UserAvatar";
import BacktradzLogo from "../BacktradzLogo/BacktradzLogo";
import { useIsAdmin } from "../../../hooks/UseIsAdmin"
import { useAuth } from "../../../auth/AuthContext"; // ⬅️ on consomme le user du contexte
import { API_BASE } from "../../../sdk/apiClient";


function pickCredits(u) {
  if (!u) return null;
  const candidates = [
    u.credits, u.credit, u.credit_balance, u.remaining_credits,
    u.creditsLeft, u.balance_credits
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && !isNaN(parseFloat(c))) return parseFloat(c);
  }
  return null;
}

function safeCreditsText(user) {
  // Déduire un nombre depuis plusieurs champs possibles
  const candidates = [
    user?.credits, user?.credit, user?.credit_balance, user?.remaining_credits,
    user?.creditsLeft, user?.balance_credits
  ];

  let val = null;
  for (const c of candidates) {
    if (c == null) continue;
    // si c est un DOM node ou un objet chelou -> on ignore
    if (typeof c === "object") continue;
    const num = Number(c);
    if (Number.isFinite(num)) { val = num; break; }
  }
  return val == null ? "—" : String(val); // **toujours** une string à la fin
}
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const { user } = useAuth(); // ⬅️ source de vérité globale (se met à jour après OAuth/login)
  const navigate = useNavigate();
  const { pathname } = useLocation();            // ✅ pour l'état "lien actif"
  const creditsText = safeCreditsText(user);
  const [adminOK, setAdminOK] = useState(false);
  const [scrolled, setScrolled] = useState(false); // ✅ nav glass au scroll

  useEffect(() => {
    // 1) Lis le token local de façon sûre
    const t = localStorage.getItem("apiKey") || "";
    if (!t) {
      setAdminOK(false);
      return;
    }

    // 2) Ping admin avec URL ABSOLUE + header correct
    fetch(`${API_BASE}/api/admin/ping`, {
      headers: { "X-API-Key": t },
    })
      .then((r) => setAdminOK(r.ok))
      .catch(() => setAdminOK(false));
    // 3) Déclenche quand 'user' change (peu importe email/id)
  }, [user]);

  // Responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effet scroll: opacité + ombre légère quand on descend
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Quand le menu mobile s'ouvre, on empêche le scroll de la page (UX propre)
  useEffect(() => {
    if (menuOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => document.body.classList.remove("menu-open");
  }, [menuOpen]);

  // Helper lien actif (tolère sous-chemins)
  const isActive = (path) => {
    if (!path) return false;
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  // Liens visibles pour tout le monde
  const baseLinks = [
    { label: "Accueil", path: "/" },
    { label: "Dashboard", path: "/dashboard" },
   { label: "Comparateur", path: "/comparateur" },
    { label: "Backtest", path: "/backtest" },
    { label: "CSV Shop", path: "/csv-shop" },
    { label: "Tarifs", path: "/pricing" },
    { label: "À savoir", path: "/a-savoir" },
  ];


  // Ajoute "Admin" si admin confirmé (ping) ou autres flags côté user
  const hookAdmin = (typeof useIsAdmin === 'function' ? useIsAdmin() : false);
  const isAdmin = adminOK || hookAdmin || (String(user?.role || '').toLowerCase() === 'admin') || !!user?.is_admin;
  const links = isAdmin
    ? [...baseLinks, { label: "Admin", path: "/admin" }]
    : baseLinks;
  return (
    <nav className={`navbar-container ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="navbar-inner">
        {/* ⬅️ Groupe gauche : logo + crédits */}
        <div className="navbar-left">
          {/* V1.3: wrapper sans padding pour coller le badge crédits */}
          <div className="logo-wrap">
            <BacktradzLogo size="xl" to="/" className="select-none" />
          </div>
          {/* Badge crédits plus “entreprise” */}
          <Link
            to="/pricing"
            className="navbar-credits"
            title="Crédits disponibles"
            aria-label={`Crédits disponibles ${creditsText}`}
          >
            <span className="cr-number">{creditsText}</span>
            <span className="cr-unit">crédits</span>
          </Link>
        </div>

        {/* ✅ Regroupement à droite: liens + avatar */}
        <div className="navbar-right">
          {/* 🖥️ Desktop menu */}
          {!isMobile && (
            <ul className="navbar-links">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link
                    to={path}
                    className={`navbar-link ${isActive(path) ? "is-active" : ""}`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* 👤 Avatar (desktop + mobile) */}
          <UserAvatar
            user={user || { email: "u@stratify.app" }}
            size="md"
            className="user-bubble"   // <= active le hover + styles bouton
          />

          {/* 📱 Hamburger (mobile) */}
          {isMobile && (
            <HamburgerButton isOpen={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
          )}
        </div>
      </div>

      {/* 📱 Dropdown mobile */}
      {isMobile && menuOpen && (
        <div className="mobile-dropdown">
          <ul>
            {links.map(({ label, path }) => (
              <li key={path}>
                <Link
                  to={path}
                  className={isActive(path) ? "is-active" : ""}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
