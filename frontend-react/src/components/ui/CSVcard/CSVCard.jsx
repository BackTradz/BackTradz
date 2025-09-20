// src/components/ui/CSVcard/CsvCard.jsx
import React from "react";
import CTAButton from "../button/CTAButton";      // << chemins UI actuels
import "../button/Button.css";                    // couleurs/gradients du CTA
import "./CSVcard.css";         // styles de la carte (extraits)

// 🆕 helpers labels
import { formatPair } from "../../../lib/labels";


/* ===== utils affichage ===== */
function fmtDateFR(iso) {
  if (!iso) return "—";
  const m = typeof iso === "string" && iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}
function fmtPeriod(p) {
  if (!p) return "—";
  const s = String(p).replace(/to/i, "→");
  const m = s.match(/(\d{4}-\d{2}-\d{2})\s*→\s*(\d{4}-\d{2}-\d{2})/);
  if (m) return `${fmtDateFR(m[1])} → ${fmtDateFR(m[2])}`;
  const ym = s.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[2]}/${ym[1]}`;
  return s;
}

/**
 * CsvCard — carte CSV réutilisable (Dashboard + CSV Shop)
 *
 * Deux modes d’appel:
 *  1) mode Dashboard (back-compat): <CsvCard item={{ source, symbol, timeframe, period, purchased_at, download_url }} />
 *  2) mode props directes (CSV Shop): <CsvCard source symbol timeframe period purchasedAt downloadUrl />
 *
 * Slots optionnels:
 *  - className: string (classes en plus)
 *  - actionsRight: ReactNode (boutons complémentaires à droite)
 */
export default function CsvCard(props) {
  const it = props.item || {};
  const source    = it.source ?? props.source ?? "—";
  const symbol    = it.symbol ?? it.pair ?? props.symbol ?? props.pair ?? "—";
  const timeframe = it.timeframe ?? it.tf ?? it.time_frame ?? props.timeframe ?? props.tf ?? "—";
  const period = it.period ?? it.date_range ?? props.period ?? "";
  const purchasedAt = (it.purchased_at ?? props.purchasedAt) ?? "";
  const downloadUrl = (it.download_url ?? props.downloadUrl) ?? "";
  
  // ⬇️ NOUVELLES PROPS PILOTÉES PAR LA PAGE
  const downloadLabel = props.downloadLabel ?? "Télécharger";
  const downloadTitle = props.downloadTitle ?? downloadLabel;
  const downloadIcon  = props.downloadIcon  ?? "⬇️";


  const cn = `dashboard-card csv-card${props.className ? ` ${props.className}` : ""}`;
  const isLive = String(source).toLowerCase() === "live";

    // ===== Download via header X-API-Key (évite "Token invalide") =====
  async function handleDownload(e) {
    e.preventDefault();
    try {
      // 1) Récupère la clé API comme sur le reste du site
      const rawUser = localStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : {};
      const token =
        localStorage.getItem("apiKey") ||
        user?.token ||
        "";
      if (!token) {
        alert("Session expirée : reconnecte-toi pour télécharger le fichier.");
        return;
      }

      // 2) Appel authentifié
      const res = await fetch(downloadUrl, {
        method: "GET",
        headers: { "X-API-Key": token },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        alert(`Téléchargement impossible (${res.status}). ${msg || ""}`.trim());
        return;
      }

      // 3) Récupère le nom du fichier (Content-Disposition ou fallback URL)
      const cd = res.headers.get("Content-Disposition") || "";
      const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
      const fallbackName = String(downloadUrl).split("/").pop() || "data.csv";
      const filename = m ? decodeURIComponent(m[1]) : fallbackName;

      // 4) Déclenche le download (blob)
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV download error:", err);
      alert("Erreur lors du téléchargement.");
    }
  }
  return (
    <div className={cn}>
      {/* header */}
      <div className="dashboard-card__header">
        <div className="title-row">
          <div className="title">{formatPair(symbol)}</div>
          <span className="badge-tf">{timeframe}</span>
        </div>

        {isLive && <span className="badge-live">LIVE (privé)</span>}
      </div>

      {period ? <div className="csv-period">{fmtPeriod(period)}</div> : null}


      {/* meta */}
      <div className="csv-meta">
        <div className="meta-line">
          <span className="meta-label">Source</span>
          <span className={`meta-value csv-source ${String(source).toLowerCase()}`}>{source}</span>
        </div>
        {purchasedAt ? (
          <div className="meta-line">
            <span className="meta-label">Acheté le</span>
            <span className="meta-value">{fmtDateFR(purchasedAt)}</span>
          </div>
        ) : null}
      </div>

       {/* actions */}
       <div className="csv-actions">
        {downloadUrl ? (
          <CTAButton
            as="button"                 /* ⬅️ évite l’ouverture directe */
            type="button"
            onClick={handleDownload}    /* ⬅️ fetch + X-API-Key */
            title={downloadTitle}
            fullWidth
            leftIcon={downloadIcon}
          >
            {downloadLabel}
          </CTAButton>
        ) : (
          <CTAButton disabled fullWidth>Indisponible</CTAButton>
        )}
        {props.actionsRight ? <div className="csv-actions-right">{props.actionsRight}</div> : null}
      </div>
    </div>
  );
}
