import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import './Navbar.css';
import HamburgerButton from './HamburgerButton';


export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) setMenuOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const links = [
    { label: "Accueil", path: "/" },
    { label: "Dashboard", path: "/dashboard" },
    { label: "Backtest", path: "/backtest" },
    { label: "CSV Shop", path: "/csv-shop" },
    { label: "Tarifs", path: "/pricing" },
    { label: "Profil", path: "/profile" },
    { label: "À savoir", path: "/a-savoir" },
    { label: "Admin", path: "/admin" },
  ];

  return (
    <nav className="navbar-container">
      <div className="navbar-inner">

        {/* 🔷 Logo */}
        <Link to="/" className="navbar-logo">
          Stratify
        </Link>

        {/* 🖥️ Desktop menu aligné à droite */}
        {!isMobile && (
          <ul className="navbar-links">
            {links.map(({ label, path }) => (
              <li key={path}>
                <Link to={path} className="navbar-link">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 📱 Menu mobile (hamburger) */}
        {isMobile && (
          <HamburgerButton isOpen={menuOpen} onClick={() => setMenuOpen(!menuOpen)} />
          )}
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
