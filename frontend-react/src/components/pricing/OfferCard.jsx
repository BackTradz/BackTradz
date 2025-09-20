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

  const showDiscount = !isSub && hasDiscount;
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

  // Désactivation Crypto si prix < seuil (ex: pack 5€)
  const cryptoDisabled = !isSub && Number(base) < Number(minCryptoEur);

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
            {lines.map((t) => <li key={t}>{t}</li>)}
           </ul>

        </div>
      <div className="pr-price-row">
        {showDiscount ? (
          <div className="pr-price">
            <span className="pr-price-old">{euro(base)}</span>
            <span>{euro(discounted)}</span>
            <span className="pr-discount-tag">–10% abonné</span>
          </div>
        ) : (
          <div className="pr-price">{isSub ? `${euro(base)}/mois` : euro(base)}</div>
        )}
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
                {/* ✅ ONE-SHOT : Stripe + PayPal + Crypto */}
                <StripeButton onClick={() => onStripe(of.id)}>{primaryLabel}</StripeButton>

                {cryptoDisabled ? (
                  <>
                    <button
                      className="btn"
                      disabled
                      title={`Crypto disponible à partir de ${Number(minCryptoEur).toFixed(2)} €`}
                    >
                      Crypto (min {Number(minCryptoEur).toFixed(2)} €)
                    </button>
                    <div className="text-[12px] opacity-70 mt-1">
                      Paiement crypto disponible pour {Number(minCryptoEur).toFixed(2)} € et plus.
                    </div>
                  </>
                ) : (
                  <CryptoTrxButton onClick={() => onCrypto(of.id)} />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
