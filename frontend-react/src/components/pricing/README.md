# components/pricing/

## 🎯 Rôle du dossier

Composants liés aux offres tarifaires et aux moyens de paiement :
- Affiche les cartes de pricing (offres one-shot ou abonnements)
- Gère les boutons de paiement Stripe / PayPal / Crypto (TRX)
- Overlay de succès après achat
- Segment de sélection abonnement vs crédit unique

---

## 📁 Contenu

### `OfferCard.jsx`
> Carte visuelle pour une offre
- Gère les deux types d’offres :
  - `one_shot` → Stripe + PayPal + Crypto
  - `subscription` → Stripe uniquement
- Props :
  - `of` = objet offre (id, label, prix, crédits…)
  - `onStripe`, `onPayPal`, `onCrypto` = callbacks
- Affiche :
  - Label, badges ("Mensuel", "Abonné")
  - Liste d’avantages
  - Prix (avec ou sans remise)
  - Boutons de paiement selon le type d’offre
- Différencie aussi `isCurrentPlan` et `isUpgrade` (logique d’abo active)

---

### `BrandButtons.jsx`
> Composant pour chaque bouton de paiement (propre)
- `StripeButton`, `PayPalButton`, `CryptoTrxButton`
- Design :
  - Icône à gauche (`.brand-ico`), texte à droite (`.brand-label`)
  - Props : `onClick`, `children`, `disabled`, `className`
- SVG optimisés :
  - Stripe : “S” vector
  - PayPal : double “P” en 2 couleurs
  - TRX : logo crypto TRON

✅ **Version propre actuelle à utiliser** = ce fichier (`BrandButtons.jsx`)  
La copie `BrandButtons - Copie.jsx` est plus ancienne / à ignorer

---

### `ToggleSegment.jsx`
> Segment switch entre "Crédits" ↔ "Abonnement"
- Design en tabs horizontaux (cohérent avec `bt-segmented`)
- Props :
  - `value` = `"one_shot"` ou `"subscription"`
  - `onChange` = callback de sélection
- Accessibilité : `role="tablist"`, `aria-selected`

---

### `SuccessOverlay.jsx`
> Overlay “Merci pour votre achat”
- Affiche les infos après un achat réussi :
  - Offre, prix, méthode, crédits ajoutés
- Actions rapides :
  - “🚀 Lancer un backtest”
  - “Voir mon profil”
  - “Fermer”
- Gère la fermeture au clic ou via `ESC`

---

## 🔗 Dépendances

- Utilisé dans `/pricing` (page d’achat)
- Données fournies via `/api/offers`
- Les callbacks redirigent vers :
  - `/api/payments/stripe`
  - `/api/payments/paypal`
  - `/api/payments/crypto` (TRX via NowPayments)

---

## ✅ Vérifié

- [x] Aucun bouton visible pour les plans déjà actifs
- [x] Label dynamique des boutons selon le contexte
- [x] Paiement 100 % conditionné au type (sub vs one-shot)
- [x] Overlay success = UX fluide + rassurante

---

## 🧠 Améliorations possibles

- Ajout des badges "Meilleur choix", "Nouveau", etc.
- Ajouter un toggle pour facturation annuelle ?
- Voir l’historique d’achat directement depuis l’overlay
- Ajouter un “mode test” (fakePay) si `import.meta.env.DEV`

