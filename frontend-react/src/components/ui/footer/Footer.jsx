// src/components/ui/footer/Footer.jsx
import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="footer fondfooter">
      <div className="footer-inner">
        {/* Gauche */}
        <p className="footer-side footer-left">
          © 2025 Backtradz. Tous droits réservés.
        </p>

        {/* Centre */}
        <nav className="footer-center">
          <Link to="/legal/mentions-legales" className="footer-link">
            Mentions légales
          </Link>
          <Link to="/legal/politique-confidentialite" className="footer-link">
            Politique de confidentialité
          </Link>
          <Link to="/legal/cgu" className="footer-link">
            Conditions générales
          </Link>
          <Link to="/support/support" className="footer-link">
            Support / Contact
          </Link>
        </nav>

        {/* Droite */}
        <p className="footer-side footer-right">Beta v1.3</p>
      </div>
    </footer>
  );
}
