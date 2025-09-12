// register.js

// ✅ Gestion de l’inscription utilisateur
document.getElementById("registerForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Récupère les champs du formulaire
  const payload = {
    first_name: document.getElementById("firstName").value,
    last_name: document.getElementById("lastName").value,
    email: document.getElementById("email").value,
    username: document.getElementById("username").value,
    password: document.getElementById("password").value,
  };

  try {
    // 📡 Envoi au backend
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    // ✅ Succès → stock token et redirige
    if (result.token) {
      localStorage.setItem("apiKey", result.token);
      window.location.href = "/dashboard";
    } else {
      alert("❌ Erreur : " + result.message);
    }
  } catch (err) {
    alert("❌ Erreur serveur : " + err.message);
  }
});

// 🔁 Support Google OAuth (redirige si token en URL)
const urlParams = new URLSearchParams(window.location.search);
const tokenFromGoogle = urlParams.get("token");

if (tokenFromGoogle) {
  localStorage.setItem("apiKey", tokenFromGoogle);
  window.location.href = "/dashboard";
}
