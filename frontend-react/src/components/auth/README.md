# components/auth/

## 🎯 Rôle du dossier

Composants React liés à l’authentification utilisateur :
- Formulaires de connexion / inscription
- Overlay de confirmation d’inscription

---

## 📁 Contenu

### `LoginForm.jsx`
> Formulaire de connexion
- Champs : identifiant/email, mot de passe
- Soumission → `onLogin(identifier, password)`
- Bouton Google intégré
- Lien "Mot de passe oublié"

### `RegisterForm.jsx`
> Formulaire de création de compte
- Champs : prénom, nom, pseudo, email, mot de passe
- Soumission → `onRegister(formData)`
- Bouton Google intégré

### `SignupSuccessOverlay.jsx`
> Overlay de confirmation après inscription
- Affiche un message avec instructions
- Trois boutons :
  - Ouvrir Gmail
  - Renvoyer le lien
  - Continuer sans vérifier
- Appels : `onClose()`, `onResend()`
- Gère touches clavier `Escape` / `Enter`

---

## 🔗 Dépendances internes

- `GoogleLoginButton` → bouton OAuth Google
- `CTAButton` → composant bouton principal
- `BacktradzLogo` → logo animé/cliable

## 🔄 Flux principal

1. `RegisterForm` → submit → callback parent → API
2. Réponse OK → `SignupSuccessOverlay` s’affiche
3. User clique un des boutons → redirigé ou continue
4. `LoginForm` → login simple ou via Google

---

## ✅ Sécurité et UX

- Tous les inputs sont `required`
- `pattern` email simple pour valid HTML
- `autoComplete` optimisé (UX native)
- Pas de gestion de message d’erreur ici (à gérer côté parent)

---

## 🧪 Check déploiement

- [x] Les 2 formulaires fonctionnent et déclenchent leur callback
- [x] Le bouton Google est visible et cliquable
- [x] L’overlay de succès s’affiche bien après inscription
- [x] Accessibilité ARIA OK (`role="dialog"` + `tabIndex`)
