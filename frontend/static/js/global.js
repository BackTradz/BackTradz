/**
 * global.js
 * ---------
 * Rôle : script global inclus sur plusieurs pages pour:
 *  - détecter un token en localStorage,
 *  - récupérer l'utilisateur courant (/api/me),
 *  - afficher le lien Admin si l'email correspond,
 *  - mettre à jour le badge de crédits dans le header.
 *
 * Hypothèses DOM:
 *  - #admin-link        : <a> vers la page admin, caché par défaut en CSS.
 *  - #credit-counter    : élément texte où afficher "🪙 X crédits".
 *
 * Notes:
 *  - Utilise un appel direct à http://127.0.0.1:8000 (backend local).
 *    En prod, privilégier un chemin relatif (/api/me) derrière un proxy.
 */

let existingToken = localStorage.getItem("apiKey");

if (existingToken) {
  fetch("http://127.0.0.1:8000/api/me", {
    headers: { "X-API-Key": existingToken }
  })
    .then(res => res.json())
    .then(user => {
      // ✅ Affiche le lien admin si l'email correspond à l'admin
      if (user.email === "florian.boulinguez@outlook.com") {
        const adminLink = document.getElementById("admin-link");
        if (adminLink) adminLink.style.display = "inline-block";
      }

      // ✅ Mise à jour crédits (affiché pour tout user connecté)
      const badge = document.getElementById("credit-counter");
      if (badge) {
        badge.textContent = `🪙 ${user.credits} crédits`;
      }
    })
    .catch(() => {
      // Silencieux: si l'appel échoue, on ne casse pas l'UI
    });
}
