# components/profil/

## 🎯 Rôle du dossier

Composants liés au **profil utilisateur** :
- Gestion du compte (nom, email, mot de passe…)
- Historique des achats
- Zone dangereuse (suppression / résiliation)
- Affichage de l’en-tête profil (avatar, crédits, plan)
- Utilisé sur la page `/mon-profil`

---

## 📁 Contenu

### `ProfileHeader.jsx`
> En-tête de la page profil
- Affiche :
  - Avatar (avec color picker à droite)
  - Nom + email
  - Plan et nombre de crédits
- Utilise `UserAvatar` et `AvatarColorPicker`
- 💡 Design premium (glassmorphism léger + responsive)

---

### `AccountSettings.jsx`
> Section des réglages de compte
- Deux colonnes :
  - Gauche = `ProfileForm` (nom, prénom, email)
  - Droite = `PasswordForm` (changement / ajout mot de passe)
- Affiche un texte d'aide pour les comptes Google (peuvent ajouter un mot de passe)
- Props : `user`, `onSaveProfile`, `saving`

---

### `ProfileForm.jsx`
> Formulaire d’édition du nom et email
- Champs : prénom, nom, email
- Prise en compte des cas où le nom est une seule string (`splitName`)
- Réinitialise les champs sur clic bouton “Réinitialiser”
- Envoie le `<form>` tel quel à `onSubmit` (format FormData)

---

### `PasswordForm.jsx`
> Formulaire pour ajouter ou modifier le mot de passe
- Deux champs :
  - Ancien mot de passe (optionnel si jamais défini)
  - Nouveau mot de passe
- Envoie vers `/api/profile/set-password` (avec fallback `/profile/set-password`)
- Affiche message ✅ ou ❌ selon le retour serveur
- Utilise `localStorage.apiKey` pour authentifier

---

### `PurchaseHistory.jsx`
> Historique d’achats de l’utilisateur
- Affiche :
  - 5 derniers achats en mode compact
  - Tous les achats regroupés par mois via `accordion`
- Lecture : chaque item a `offer_id`, `amount`, `txid`, `date`
- Regroupement : par `monthLabel()`
- Utilise des helpers :
  - `safeDateLabel` → gère les formats foireux
  - `groupByMonth()` → objet `{ "sept. 2025": [rows], ... }`

---

### `DangerZone.jsx`
> Section critique
- Deux boutons :
  - “Annuler l’abonnement” → `onUnsubscribe()`
  - “Supprimer mon compte” → `onDelete()`
- Style visuel rouge (`borderColor: rgba(255,0,0,0.2)`)
- Aucun dialogue de confirmation ici → à gérer ailleurs

---

## 🔗 Dépendances

- `UserAvatar`, `AvatarColorPicker`
- `localStorage.apiKey`
- Back : `/api/profile/set-password` + callback `onSaveProfile(form)`

---

## ✅ Vérifications faites

- [x] UX responsive OK
- [x] Email modifiable
- [x] Ajout mot de passe OK même si compte Google
- [x] Historique OK même sans transaction
- [x] Aucune info sensible exposée

---

## 🧠 Améliorations possibles

- Ajout d’un “avatar preview” dans `ProfileForm` ?
- Permettre la suppression du mot de passe ?
- Ajouter confirmation avec `ConfirmDialog` dans `DangerZone.jsx`
- Grouper les achats par type (ex: CSV, abonnement…)

