import { useMemo } from "react";
import { StripeButton, CryptoTrxButton } from "./BrandButtons";

const euro = (n) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  })
    .format(Number(n || 0))
    .replace("EUR", "€");

// + props : isSubscriber, isUpgrade, isCurrentPlan
export default function OfferCard({
  of,
  onStripe,
  onPayPal,
  onCrypto,
  highlighted = false,
  hasDiscount = false,
  isSubscriber = false,
  isCurrentPlan = false,
  isUpgrade = false,
  minCryptoEur = 10.01, // ← seuil d’activation du bouton Crypto
}) {

  const isSub = of.type === "subscription";
  const base = of.price_eur ?? 0;
  const credits = Number(of.credits ?? 0);
  const bonusForSubscriber = (!isSub && isSubscriber) ? Math.ceil(credits * 0.10) : 0;
  const creditLine =
    credits > 0
      ? `${credits} crédits inclus${bonusForSubscriber ? ` (+${bonusForSubscriber} crédits pour abonnés)` : ""}`
      : null;

  // On n’affiche plus de réduction de prix : bonus crédits uniquement
  const showDiscount = false; // ❌ plus de prix barré
  const discounted = showDiscount ? Math.round(base * 90) / 100 : base;

  const lines = useMemo(() => {
    if (isSub) {
      const arr = [];
      if (of.credits_monthly)   arr.push(`${of.credits_monthly} crédits inclus / mois`);
      if (of.discount_rate)     arr.push(`${Math.round(of.discount_rate * 100)}% de réduction sur les packs supplémentaires`);
      if (of.priority_backtest) arr.push("Accès prioritaire aux backtests");
      arr.push("Résiliable à tout moment");
      return arr;
    }
    return [
      `${of.credits} crédits inclus`,
      "Paiement unique, sans engagement"
    ];

  }, [of, isSub]);

  // Libellé principal Stripe (différent pour abo vs one-shot)
  const primaryLabel = isSub
    ? (isUpgrade ? "Améliorer votre plan" : "S’abonner par carte")
    : "Payer par carte";

  // Désactivation Crypto si prix < seuil (ex: pack 5€), SAUF pour CREDIT_10
  const cryptoDisabled = !isSub && Number(base) < Number(minCryptoEur) && of.id !== "CREDIT_10";

  return (
  <div
    className={[
      "pr-card",
      highlighted ? "is-highlight" : "",
      isSub ? "is-sub" : "is-credit",
      showDiscount ? "with-discount" : "",
    ].join(" ").trim()}
  >
    <div className="pr-card-head">
      <div className="pr-card-title">
        {of.label}
        {isSub && (
          <>
            <span className="pr-badge pr-badge-muted">Mensuel</span>
            {/* ✅ badge "Abonné" uniquement sur la carte du plan courant */}
            {isCurrentPlan && <span className="pr-badge pr-badge-green">Abonné</span>}
          </>
        )}
      </div>

      <ul className="pr-list">
        {/* 1) crédits inclus (+bonus abo) */}
        {creditLine && <li key="credits" className="pr-li-anim">{creditLine}</li>}

        {/* 2) paiement unique */}
        <li key="unique">Paiement unique, sans engagement</li>  
        
          {/* 3) crypto: 
        - pack 10€ => "Crypto 10,50 € (min) — +1/+2 crédits"
        - pack 5€ (ou tout prix < min) => "Paiement crypto disponible à partir de 10.01 €." */}
          {!isSub && of.id === "CREDIT_10" && (
            <li key="crypto10" className="pr-li-anim">
              Crypto 10,50 € (min) — {isSubscriber ? "+2 crédits" : "+1 crédit"}
            </li>
          )}
      </ul>
      </div> {/* ferme .pr-card-head */}

    <div className="pr-price-row">
      <div className="pr-price">
        {isSub ? `${euro(base)}/mois` : euro(base)}
        {!isSub && isSubscriber && (
          <span className="pr-bonus ml-2 align-middle">+10% crédits</span>
        )}
      </div>
    </div>

    {/* Boutons en colonne */}
    <div className="pr-actions pr-actions-col">
      {/* Si c'est le plan courant : pas de moyens de paiement */}
      {isSub && isCurrentPlan ? (
        <>
          <button className="btn-brand btn-current" disabled>Déjà abonné</button>
          <a className="btn-brand btn-ghost" href="/profile">Gérer mon abonnement</a>
        </>
      ) : (
        <>
          {/* ✅ ABONNEMENTS : Stripe UNIQUEMENT */}
          {isSub ? (
            <StripeButton onClick={() => onStripe(of.id)}>{primaryLabel}</StripeButton>
          ) : (
            <>
              {/* ✅ ONE-SHOT : Stripe + Crypto */}
              <StripeButton onClick={() => onStripe(of.id)}>{primaryLabel}</StripeButton>

              {cryptoDisabled ? (
                <>
                  <button
                    className="btn"
                    disabled
                    title="Crypto indisponible pour ce montant"
                  >
                    Crypto indisponible
                  </button>
                </>
              ) : (
                <>
                  <CryptoTrxButton onClick={() => onCrypto(of.id)} />
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  </div>
);
}
