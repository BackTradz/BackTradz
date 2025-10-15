// src/components/ui/CSVcard/CsvCard.jsx
import React from "react";
import CTAButton from "../button/CTAButtonHome";      // << chemins UI actuels
import "../button/CTAButtonHome.css";                    // couleurs/gradients du CTA
import "./CSVcard.css";         // styles de la carte (extraits)

// 🆕 helpers labels
import { formatPair } from "../../../lib/labels";
import CTAButtonHome from "../button/CTAButtonHome";


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
          <CTAButtonHome
            as="a"                    /* ✅ lien direct comme avant */
            href={downloadUrl}       /* ✅ inclut ?token=... (voir CsvList.jsx ci-dessous) */
            title={downloadTitle}
            fullWidth
            leftIcon={downloadIcon}
            onClick={(e) => {
              // Force la navigation HTTP même si CTAButtonHome utilise un <Link>
              if (!downloadUrl) return;
              try { e.preventDefault(); } catch {}
              try { window.location.assign(downloadUrl); }
              catch { window.location.href = downloadUrl; }
            }}
          >
            {downloadLabel}
          </CTAButtonHome>
        ) : (
                     <CTAButton disabled fullWidth>Indisponible</CTAButton>
         )}
        {props.actionsRight ? <div className="csv-actions-right">{props.actionsRight}</div> : null}
      </div>
    </div>
  );
}
