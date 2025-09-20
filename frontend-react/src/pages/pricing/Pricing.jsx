// ============================================================
// Pricing.jsx — 1 seule grille, 6 cartes (crédits + abonnements)
// - Pas de switch : tout est visible d'un coup
// - Abos rendus distincts (léger badge + "/mois")
// - Paiements : identiques (Stripe/PayPal/Crypto)
// ============================================================
import { useEffect, useState } from "react";
import "./pricing.css";

import OfferCard from "../../components/pricing/OfferCard";
import SuccessOverlay from "../../components/pricing/SuccessOverlay";

import { stripeSession, paypalCreate, cryptoOrder, paypalCapture } from "../../sdk/paymentApi";
import { me } from "../../sdk/authApi";
// import reutilisables
import CTAButton from "../../components/ui/button/CTAButton"
import TopProgress  from "../../components/ui/progressbar/TopProgress"

// ⚠️ Garde ces IDs alignés avec le backend
const RAW_OFFERS = {
  CREDIT_5:  { id: "CREDIT_5",  type: "one_shot",     price_eur: 5,  credits: 5,  label: "5 crédits — 5 €",  bonus_triggered: false, promo_code_applicable: true },
  CREDIT_10: { id: "CREDIT_10", type: "one_shot",     price_eur: 10, credits: 12, label: "12 crédits — 10 €", bonus_triggered: false, promo_code_applicable: true },
  CREDIT_20: { id: "CREDIT_20", type: "one_shot",     price_eur: 20, credits: 25, label: "25 crédits — 20 €", bonus_triggered: false, promo_code_applicable: true },
  CREDIT_50: { id: "CREDIT_50", type: "one_shot",     price_eur: 50, credits: 75, label: "75 crédits — 50 €", bonus_triggered: true,  promo_code_applicable: true },
  SUB_9:     { id: "SUB_9",     type: "subscription", price_eur: 9,  credits_monthly: 10, discount_rate: 0.10, priority_backtest: true, label: "Starter — 9 €/mois", duration_days: 30 },
  SUB_25:    { id: "SUB_25",    type: "subscription", price_eur: 25, credits_monthly: 30, discount_rate: 0.10, priority_backtest: true, label: "Pro — 25 €/mois", duration_days: 30 },
};

// Ordre : crédits d’abord, puis abonnements
const ALL_OFFERS = [
  RAW_OFFERS.CREDIT_5, RAW_OFFERS.CREDIT_10, RAW_OFFERS.CREDIT_20, RAW_OFFERS.CREDIT_50,
  RAW_OFFERS.SUB_9, RAW_OFFERS.SUB_25
];

export default function Pricing() {
  const [msg, setMsg] = useState("");
  const [creditsAfter, setCreditsAfter] = useState(null);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [userPlan, setUserPlan] = useState(null);  // "SUB_9" | "SUB_25" | null
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);


  useEffect(() => {
    (async () => {
      try {
        const u = await me(); // contient plan / has_discount
        const sub = u?.plan === "SUB_9" || u?.plan === "SUB_25";
        setHasDiscount(Boolean(u?.has_discount || sub));
        // ➜ on stocke le plan et le statut d’abonnement
        setUserPlan(sub ? u.plan : null);     // "SUB_9" | "SUB_25" | null
        setIsSubscriber(sub);   
      } catch {}
      finally{
         setLoadingInit(false); // fin du chargement initial
      }
    })();
  }, []);

  // Finalisation paiements → overlay avec le vrai prix payé (remise incluse)
  useEffect(() => {
    let cancelled = false;
    const round2 = (n) => Math.round(n * 100) / 100;
    const calcAddedCredits = (of, isSub, method) => {
      if (!of) return 0;
      let add = Number(of.credits ?? of.credits_monthly ?? 0);
      // +10% crédits pour abonnés sur les one_shot/credit
      if (of.type === "one_shot" && isSub) {
        add += Math.ceil((Number(of.credits || 0)) * 0.10);
      }
      // Bonus crypto pack 10 €
      if (method === "Crypto" && of.id === "CREDIT_10") {
        add += isSub ? 2 : 1;
      }
      return add;
    };


    (async () => {
      const url = new URL(window.location.href);
      const payment = url.searchParams.get("payment");
      const status  = url.searchParams.get("status");
      if (!payment || !status) return;

      try {
        // ✅ Ce bloc ICI (avant paypal/stripe/crypto)
        // On récupère l'utilisateur pour savoir si la remise s'applique,
        // indépendamment de hasDiscount.
        let user = null;
        try { user = await me(); } catch {}
        const subFlag = !!(user?.plan === "SUB_9" || user?.plan === "SUB_25" || user?.has_discount);

       
        // Helper fallback : on n’applique plus aucune remise prix
        const resolvePaidLocal = (offer) => (offer?.price_eur ?? 0);

        // ---- PAYPAL ----
        if (payment === "paypal" && status === "success") {
          const orderID = url.searchParams.get("token");
          if (!orderID) throw new Error("PayPal: token manquant.");

          const offer_id = localStorage.getItem("lastOfferId");
          const already = localStorage.getItem("paypalProcessed");
          let res = null;
          if (already !== orderID) {
            res = await paypalCapture(orderID, offer_id);
            if (res?.status !== "success") throw new Error(res?.message || "Capture échouée.");
            localStorage.setItem("paypalProcessed", orderID);
          }

          const of = RAW_OFFERS[offer_id] || {};
          // essaie d'extraire le montant côté backend, sinon fallback local (avec remise user si besoin)
          const candidates = [
            res?.paid_eur,
            res?.amount_eur,
            res?.amount,
            res?.total,
            Number(res?.details?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value),
          ];
          let paid = candidates.find(v => v != null && !Number.isNaN(Number(v)));
          paid = paid != null ? Number(paid) : resolvePaidLocal(of);

          if (!cancelled) {
            setSuccessData({
              offer: of?.label || offer_id || "Paiement PayPal",
              method: "PayPal",
              credits: calcAddedCredits(of, subFlag, "PayPal"),
              price: paid,
            });
            setShowSuccess(true);
          }
        }

        // ---- CRYPTO ----
        else if (payment === "crypto" && status === "success") {
          const offer_id = localStorage.getItem("lastOfferId");
          const of = RAW_OFFERS[offer_id] || {};
          const paid = resolvePaidLocal(of);

          if (!cancelled) {
            setSuccessData({
              offer: of?.label || "Commande crypto",
              method: "Crypto",
              credits: calcAddedCredits(of, subFlag, "Crypto"),
              price: paid,
            });
            setShowSuccess(true);
          }
        }

        // ---- STRIPE ----
        else if (payment === "stripe" && status === "success") {
          const offer_id = localStorage.getItem("lastOfferId");
          const of = RAW_OFFERS[offer_id] || {};
          const paid = resolvePaidLocal(of);

          if (!cancelled) {
            setSuccessData({
              offer: of?.label || offer_id || "Paiement Stripe",
              method: "Stripe",
              credits: calcAddedCredits(of, subFlag, "Stripe"),
              price: paid,
            });
            setShowSuccess(true);
          }
        }

        // rafraîchir les crédits affichés (optionnel)
        try {
          const u2 = await me();
          if (!cancelled && typeof u2?.credits === "number") setCreditsAfter(u2.credits);
        } catch {}

      } catch (e) {
        if (!cancelled) setMsg("❌ " + e.message);
      } finally {
        // Nettoyage URL & storage
        url.searchParams.delete("payment");
        url.searchParams.delete("status");
        url.searchParams.delete("session_id");
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
        localStorage.removeItem("lastOfferId");
        // on peut garder paypalProcessed pour éviter les doubles captures
        // localStorage.removeItem("paypalProcessed");
      }
    })();

    return () => { cancelled = true; };
  }, []); // <-- pas besoin de dépendre de hasDiscount maintenant


  // Handlers paiements (identiques)
  const payStripe = async (offer_id) => {
    setMsg("");
    try {
      localStorage.setItem("lastOfferId", offer_id);
      const { url } = await stripeSession(offer_id);
      if (!url) throw new Error("Stripe: URL manquante.");
      window.location.href = url;
    } catch (e) { setMsg(e.message); }
  };
  const payPayPal = async (offer_id) => {
    setMsg("");
    try {
      localStorage.setItem("lastOfferId", offer_id);
      const { id } = await paypalCreate(offer_id);
      const base = import.meta.env.VITE_PAYPAL_ENV === "sandbox"
        ? "https://www.sandbox.paypal.com/checkoutnow"
        : "https://www.paypal.com/checkoutnow";
      window.location.href = `${base}?token=${id}`;
    } catch (e) { setMsg(e.message); }
  };
  const payCrypto = async (offer_id) => {
    setMsg("");
    try {
      localStorage.setItem("lastOfferId", offer_id);
      const { payment_url } = await cryptoOrder(offer_id);
      if (!payment_url) throw new Error("Crypto: payment_url manquante.");
      window.open(payment_url, "_blank");
    } catch (e) { setMsg(e.message); }
  };

  // Seuil côté UI (aligné sur le backend qui force 10.01€ pour NOWPayments)
  const MIN_CRYPTO_EUR = 10.01;

  return (
    <main className="pr-page">
        {/* ✅ Barre de progression en haut, seulement pendant le chargement initial */}

        <TopProgress active={loadingInit} height={3} from="#22d3ee" to="#6366f1" />

      <header className="pr-header">
        <h1>Nos offres — Crédits & Abonnements</h1>
        <div className="pr-muted">
          Accède à des données de trading fiables et à des backtests détaillés. Choisis entre crédits à l’unité ou abonnements mensuels, selon ton usage.
        </div>
      </header>

      {/* Grille unique : 6 cartes */}
      <section className="pr-grid">
        {ALL_OFFERS.map((of) => {
          const highlighted = of.id === "SUB_9" || of.id === "SUB_25"; // bons plans mis en avant
          // ✅ seulement si user est SUB_9, on propose d’upgrader vers SUB_25
          const isUpgrade = isSubscriber && userPlan === "SUB_9" && of.id === "SUB_25";
          // ✅ badge "Abonné" uniquement sur la carte du plan courant
          const isCurrentPlan = isSubscriber && userPlan === of.id;

          return (
            <OfferCard
              key={of.id}
              of={of}
              highlighted={highlighted}
              hasDiscount={hasDiscount}
              isSubscriber={isSubscriber}         // info globale (user est abonné)
              isCurrentPlan={isCurrentPlan}       // ✅ carte = plan courant ?
              isUpgrade={isUpgrade}         // ← libellé “Améliorer votre plan”
              minCryptoEur={MIN_CRYPTO_EUR}
              onStripe={payStripe}
              onPayPal={payPayPal}
              onCrypto={payCrypto}
            />
          );
        })}

      </section>

      {msg && (
        <p className={`pr-msg ${msg.startsWith("✅") ? "ok" : msg.startsWith("🪙") ? "info" : "err"}`}>
          {msg}
        </p>
      )}
      {creditsAfter != null && (
        <p className="pr-msg ok">💳 Crédits actuels : <b>{creditsAfter}</b></p>
      )}

        <SuccessOverlay
          open={showSuccess}
          data={successData}
          onClose={() => setShowSuccess(false)}
        />

    </main>
  );
}
