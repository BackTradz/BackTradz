import { Link } from "react-router-dom";
import './Footer.css'; // 💅 CSS dédiée au footer

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">

        {/* 📄 Texte copyright */}
        <p className="footer-text">© 2025 Stratify. Tous droits réservés.</p>

        {/* 🔗 Liens légaux espacés et centrés */}
        <div className="footer-links">
          <Link to="/legal/mentions-legales" className="footer-link">Mentions légales</Link>
          <Link to="/legal/cgu" className="footer-link">Conditions générales</Link>
          <Link to="/legal/politique-confidentialite" className="footer-link">Politique de confidentialité</Link>
        </div>

        {/* 🕓 Version info */}
        <p className="footer-version">Version 1.1 – Dernière mise à jour : août 2025</p>
      </div>
    </footer>
  );
}
