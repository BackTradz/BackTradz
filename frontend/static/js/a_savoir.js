/**
 * a_savoir.js
 * ------------
 * Rôle : JS léger pour la page "À savoir".
 * - Vérifie la présence d'un token (apiKey) en localStorage.
 * - Redirige vers /login si absent.
 * - Expose une fonction globale goProfile() pour aller au profil.
 * - Gère l'ouverture/fermeture du menu mobile.
 *
 * Dépendances : aucune lib externe ; s'appuie sur le DOM et localStorage.
 *
 * Notes:
 * - On considère que le backend sert /login et /profile.
 * - goProfile lit le token depuis localStorage.
 */

const token = localStorage.getItem("apiKey");
if (!token) window.location.href = "/login";

console.log("📘 Page À savoir chargée.");

// ✅ Ajout de la redirection vers le profil
// Expose en global pour être appelée depuis un bouton <button onclick="goProfile()">
window.goProfile = function () {
  const token = localStorage.getItem("apiKey");
  if (!token) {
    window.location.href = "/login";
  } else {
    // transmet le token en query pour la page profil
    window.location.href = `/profile?token=${token}`;
  }
};

/**
 * Ouvre/ferme le menu (mobile)
 * - suppose un élément #main-nav dans le DOM
 * - ajoute/retire la classe .active
 */
function toggleMenu() {
  const nav = document.getElementById("main-nav");
  nav.classList.toggle("active");
}
