// script_csv_shop.js

// 🔑 Vérifie que l’utilisateur est connecté
const token = localStorage.getItem("apiKey");
if (!token) window.location.href = "/login";

let allFiles = [];

// 📂 Charge la librairie CSV dispo
async function loadLibrary() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/list_csv_library");
    const data = await res.json();
    allFiles = data;

    // 📊 Récupère toutes les paires dispo
    const pairSet = new Set(data.map(file => file.symbol));
    const select = document.getElementById("pairFilter");
    select.innerHTML = "";

    // Génère le menu déroulant
    [...pairSet].sort().forEach(pair => {
      const option = document.createElement("option");
      option.value = pair;
      option.textContent = pair;
      select.appendChild(option);
    });

    select.addEventListener("change", renderGroupedByMonth);
    renderGroupedByMonth(); // première vue
  } catch (err) {
    document.getElementById("fileList").innerHTML = "Erreur : " + err.message;
  }
}

// 📊 Affiche les fichiers regroupés par mois
function renderGroupedByMonth() {
  const selectedPair = document.getElementById("pairFilter").value;
  const listDiv = document.getElementById("fileList");
  listDiv.innerHTML = "";

  const filtered = allFiles.filter(file => file.symbol === selectedPair);

  if (filtered.length === 0) {
    listDiv.innerHTML = "<p>Aucun fichier trouvé pour cette paire.</p>";
    return;
  }

  const grouped = {};
  filtered.forEach(file => {
    const key = `${file.month}/${file.year}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(file);
  });

  // 🔄 Affiche chaque groupe (mois)
  Object.keys(grouped).sort().forEach(monthKey => {
    const group = grouped[monthKey];
    const monthBlock = document.createElement("div");
    monthBlock.className = "month-block";
    monthBlock.innerHTML = `<h4>📦 Mois : ${monthKey}</h4>`;

    group.forEach(file => {
      const div = document.createElement("div");
      div.className = "file-entry";
      div.innerHTML = `
        <strong>${file.filename}</strong> — TF: ${file.timeframe}
        <button onclick="downloadCSV('${file.relative_path}')">📥 Télécharger (1 crédit)</button>
      `;
      monthBlock.appendChild(div);
    });

    listDiv.appendChild(monthBlock);
  });
}

// 📥 Télécharge un CSV (décrémente les crédits)
async function downloadCSV(relativePath) {
  const token = localStorage.getItem("apiKey");
  if (!token) return alert("Veuillez vous connecter.");

  try {
    // ✅ Vérifie crédits restants
    const res = await fetch("/api/me", { headers: { "X-API-Key": token } });
    const user = await res.json();

    if (user.credits < 1) {
      alert("⚠️ Pas assez de crédits !");
      return;
    }

    const remaining = Number(user.credits) - 1;
    const confirmDownload = confirm(`📥 Ce téléchargement consommera 1 crédit.\nIl vous restera ${remaining} crédit(s).\nContinuer ?`);
    if (!confirmDownload) return;

    // 📡 Route backend qui gère décrémentation + download
    const res2 = await fetch(`/api/download_csv_by_path/${relativePath}`, { headers: { "X-API-Key": token } });

    if (!res2.ok) {
      const errText = await res2.text();
      alert("Erreur : " + errText);
      return;
    }

    // ✅ Déclenche le téléchargement
    const blob = await res2.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = relativePath.split("/").pop();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (err) {
    alert("Erreur lors du téléchargement : " + err.message);
  }
}

// 🔀 Toggle menu mobile
function toggleMenu() {
  document.getElementById("main-nav").classList.toggle("active");
}

// 🚀 Load CSV à l’ouverture
window.onload = loadLibrary;

// ✅ Redirection profil
window.goProfile = function () {
  const token = localStorage.getItem("apiKey");
  if (!token) window.location.href = "/login";
  else window.location.href = `/profile?token=${token}`;
};
