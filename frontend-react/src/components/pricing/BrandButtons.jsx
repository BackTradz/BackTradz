/* BrandButtons.jsx — logos SVG clean + labels
   - Stripe : monogramme "S" net (vector), scalable
   - PayPal : monogramme "PP" officiel (2 tons)
   - Crypto : TRX (libellé par défaut "TRX")
   - Icône à gauche, libellé centré (géré par CSS .btn-brand)
*/

function StripeMonogram(props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      {/* Cercle subtil pour mieux “ancrer” le S (optionnel) */}
      {/* <circle cx="16" cy="16" r="16" fill="none" /> */}
      <path
        fill="currentColor"
        d="M23.6 10.4c-.7-3.1-3.2-4.5-6.6-4.5-2.9 0-5.2 1.3-6.6 3.1l3.2 1.9c.7-1 1.7-1.6 3.3-1.6 1.6 0 2.6.7 2.6 1.8v.1c0 1.1-.8 1.5-3.2 2-3.2.8-5.3 1.7-5.3 4.8v.1c0 2.8 2.4 4.8 5.6 4.8 2.4 0 4.3-.9 5.8-2.3l-3.1-2.1c-.7.7-1.7 1.3-2.7 1.3-1.2 0-2.1-.5-2.1-1.4v-.1c0-1.1.8-1.5 3.4-2.1 3.2-.7 5.2-1.9 5.2-4.7v-.1z"
      />
    </svg>
  );
}

function PayPalPP(props) {
  // Monogramme PayPal "PP" en 2 couches (couleurs brand)
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" focusable="false" {...props}>
      {/* P arrière (bleu foncé) */}
      <path
        fill="#003087"
        d="M12 6h8.7c4.2 0 7.1 2.5 7.1 6.1 0 4.2-2.9 7-7.8 7H17l-1.2 7.4h-8L12 6z"
      />
      {/* P avant (bleu clair) */}
      <path
        fill="#009cde"
        d="M21.5 8.9c2.3 0 3.5 1.1 3.5 3.1 0 2.6-1.7 4.1-4.4 4.1H18l1.2-7.2h2.3z"
      />
    </svg>
  );
}

function TronTRX(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M3.6 4.1 20.4 7.4 12.2 20.6 3.6 4.1zm2.7 2.4 5.8 9.9 4.8-7.7-10.6-2.2z"
      />
    </svg>
  );
}

export function StripeButton({
  onClick,
  children = "Payer par carte",
  className = "",
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`btn-brand btn-stripe ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Payer par carte (Stripe)"
    >
      <span className="brand-ico"><StripeMonogram /></span>
      <span className="brand-label">{children}</span>
    </button>
  );
}

export function PayPalButton({
  onClick,
  children = "PayPal",
  className = "",
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`btn-brand btn-paypal ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Payer avec PayPal"
    >
      <span className="brand-ico"><PayPalPP /></span>
      <span className="brand-label">{children}</span>
    </button>
  );
}

export function CryptoTrxButton({
  onClick,
  children = "Crypto TRX",   // ✅ libellé par défaut demandé
  className = "",
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={`btn-brand btn-crypto-trx ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Payer en crypto (TRX)"
    >
      <span className="brand-ico"><TronTRX /></span>
      <span className="brand-label">{children}</span>
    </button>
  );
}
