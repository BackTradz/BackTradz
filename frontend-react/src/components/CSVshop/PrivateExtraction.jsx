import React from "react";
import CTAButton from "../../components/ui/button/CTAButton";
import CsvCard from "../../components/ui/CSVcard/CSVCard";

// 🧠 Formatte une date "YYYY-MM-DD" -> "DD/MM/YYYY"
function fmtFR(d) {
  if (!d || typeof d !== "string") return "";
  const [Y, M, D] = d.split("-");
  if (!Y || !M || !D) return d;
  return `${D}/${M}/${Y}`;
}

// 🔐 Ajoute le token d’auth localStorage à une URL
function withToken(url) {
  const token = localStorage.getItem("apiKey") || "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

/**
 * 📂 Affiche les fichiers extraits (privés) par l'utilisateur
 * - Système de toggle d’affichage
 * - Chaque fichier est affiché via un CsvCard
 */
export default function PrivateExtraction({
  extractedFiles,
  showExtractSection, setShowExtractSection,
  downloadCsvByPathUrl,
}) {
  if (!extractedFiles?.length) return null;

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
        <h3 className="csvshop-title" style={{ fontSize: "1.2rem", margin: 0 }}>
          ✅ Votre extraction (non listée)
        </h3>
        <CTAButton
          variant="primary"
          onClick={() => setShowExtractSection(v => !v)}
          className="csvshop-cta-toggle"
          title="Afficher/masquer vos fichiers extraits"
        >
          {showExtractSection ? "Masquer" : "Voir"}
        </CTAButton>
      </div>

      {showExtractSection && (
        <div className="csvshop-grid" style={{ marginTop: 10 }}>
          {extractedFiles.map((it, idx) => {
            const url = it.path ? withToken(downloadCsvByPathUrl(it.path)) : "";
            return (
              <div key={idx} className="span-all">
                <CsvCard
                  source="live"
                  symbol={it.pair}
                  timeframe={it.timeframe}
                  period={`${fmtFR(it.start)} → ${fmtFR(it.end)}`}
                  downloadUrl={url}
                  className="csvshop-card"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
