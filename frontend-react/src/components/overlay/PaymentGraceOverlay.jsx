// src/components/overlay/PaymentGraceOverlay.jsx
import { useEffect, useState } from "react";

export default function PaymentGraceOverlay({ subscription }) {
  // Conditions d'affichage : past_due + en grâce
  const show = Boolean(
    subscription &&
    subscription.status === "past_due" &&
    subscription.in_grace === true
  );

  // Dismiss par session (et 24h en localStorage)
  const KEY = "btz_payment_overlay_dismiss_ts";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) { setVisible(false); return; }
    try {
      const ts = parseInt(localStorage.getItem(KEY) || "0", 10);
      const oneDay = 24 * 3600 * 1000;
      if (!ts || Date.now() - ts > oneDay) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch { setVisible(true); }
  }, [show]);

  if (!visible) return null;

  const daysLeft = subscription?.grace_days_left ?? 0;
  const payUrl = subscription?.pay_url || "/billing"; // si tu exposes pay_url plus tard

  const onClose = () => {
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  return (
    <div className="btz-overlay fixed inset-0 z-[999] flex items-center justify-center bg-black/50">
      <div className="btz-card max-w-md w-[92%] rounded-2xl bg-white p-5 shadow-xl">
        <h3 className="text-xl font-semibold mb-2">Abonnement en retard</h3>
        <p className="opacity-80 mb-4">
          Il vous reste <b>{daysLeft}</b> jour{daysLeft>1 ? "s" : ""} pour régulariser votre paiement.
        </p>
        <div className="flex gap-2">
          <a className="btn btn-primary" href={payUrl}>
            Régulariser maintenant
          </a>
          <button className="btn btn-ghost" onClick={onClose}>
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
