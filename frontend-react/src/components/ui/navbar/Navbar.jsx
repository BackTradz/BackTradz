// src/Navbar.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";
import HamburgerButton from "./HamburgerButton";
// src/components/ui/navbar/Navbar.jsx
import UserAvatar from "../useravatar/UserAvatar";
import BacktradzLogo from "../BacktradzLogo/BacktradzLogo";
import { useIsAdmin } from "../../../hooks/UseIsAdmin"

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
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const creditsText = safeCreditsText(user);


  // Responsive
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch user léger (comme Profile.jsx -> /api/me)
  useEffect(() => {
    (async () => {
      try {
        const apiKey = localStorage.getItem("apiKey");
        if (!apiKey) return;
        let res = await fetch("/api/me", { headers: { "X-API-Key": apiKey } });
        if (res.status === 404) {
          // fallback si ton backend n'a pas le préfixe /api
          res = await fetch("/me", { headers: { "X-API-Key": apiKey } });
        }
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch {}
    })();
  }, []);

  // Liens visibles pour tout le monde
  const baseLinks = [
    { label: "Accueil", path: "/" },
    { label: "Dashboard", path: "/dashboard" },
    { label: "Backtest", path: "/backtest" },
    { label: "CSV Shop", path: "/csv-shop" },
    { label: "Tarifs", path: "/pricing" },
    { label: "À savoir", path: "/a-savoir" },
  ];
  // Ajoute "Admin" uniquement si l'utilisateur est admin
  const isAdmin = useIsAdmin();
  const links = isAdmin
    ? [...baseLinks, { label: "Admin", path: "/admin" }]
    : baseLinks;
  return (
    <nav className="navbar-container">
      <div className="navbar-inner">
        {/* ⬅️ Groupe gauche : logo + crédits */}
        <div className="navbar-left">
           <div className="flex items-center justify-start px-4 md:px-6 py-3">
            <BacktradzLogo size="lg" to="/" className="select-none" />
          </div>
          <Link to="/pricing" className="credit-badge" title="Crédits disponibles">
            <span className="coin">🪙</span>
            <span className="number">{creditsText}</span>
            <span className="unit">crédits</span>
          </Link>


        </div>

        {/* ✅ Regroupement à droite: liens + avatar */}
        <div className="navbar-right">
          {/* 🖥️ Desktop menu */}
          {!isMobile && (
            <ul className="navbar-links">
              {links.map(({ label, path }) => (
                <li key={path}>
                  <Link to={path} className="navbar-link">{label}</Link>
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
                <Link to={path} onClick={() => setMenuOpen(false)}>
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
