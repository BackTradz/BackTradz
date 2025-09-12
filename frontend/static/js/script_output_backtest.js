/**
 * script_output_backtest.js
 * -------------------------
 * Rôle : page "Backtest" (formulaire double OFFICIEL / CUSTOM).
 * - Charge la liste des stratégies et remplit les <select>.
 * - Récupère dynamiquement les paramètres d'une stratégie (via /api/strategy_params/{name})
 *   et génère des inputs pour l’utilisateur.
 * - Lance un backtest :
 *     • OFFICIEL : POST /api/run_backtest (JSON, X-API-Key requis)
 *     • CUSTOM   : POST /api/upload_csv_and_backtest (multipart/form-data, X-API-Key requis)
 * - Affiche le résultat (crédits restants, lien XLSX, golden hours si présents).
 *
 * Dépendances DOM :
 *  - #strategy, #strategy_custom : <select>
 *  - #paramsContainer, #paramsContainerCustom : conteneurs des inputs dynamiques
 *  - #officialForm, #uploadForm  : formulaires
 *  - #loader, #result            : éléments visuels pour spinner + sortie
 *  - #symbol, #timeframe, #start_date, #end_date, etc. (inputs)
 *
 * Notes importantes :
 *  - Le token est lu depuis localStorage ("apiKey"). Redirection /login si absent (tout en haut du fichier).
 *  - Les appels fetch utilisent des URLs absolues http://127.0.0.1:8000 (en prod, privilégier des chemins relatifs /api/...).
 *  - Les params dynamiques sont ajoutés avec des id "param_official_*" et "param_custom_*".
 *  - Le backend "run_backtest_route.py" décrémente les crédits UNIQUEMENT si l'analyse XLSX est générée.
 */

const token = localStorage.getItem("apiKey");
if (!token) window.location.href = "/login";

// === Chargement des paramètres dynamiques de stratégie ===
async function renderParams(target = "official") {
  /**
   * Construit la liste d'inputs pour les paramètres d'une stratégie.
   *
   * @param {"official"|"custom"} target - Quel bloc mettre à jour (form officiel vs CSV custom).
   *
   * ⚠️ Remarques :
   *  - La route backend /api/strategy_params/{strategy} renvoie { params: [{name, default}, ...] }.
   *  - Chaque param est rendu comme un <input type="text"> pour rester générique.
   *  - Les IDs générés sont "param_official_<name>" ou "param_custom_<name>" selon target.
   */
  // ✅ récupère l’élément loader localement (au lieu de compter sur un global implicite)
  const loader = document.getElementById("loader");

  const strategyId = target === "custom" ? "strategy_custom" : "strategy";
  const containerId = target === "custom" ? "paramsContainerCustom" : "paramsContainer";

  const strategy = document.getElementById(strategyId).value;
  const paramsContainer = document.getElementById(containerId);

  if (!strategy) {
    paramsContainer.innerHTML = "⏳ Veuillez choisir une stratégie...";
    return;
  }

  paramsContainer.innerHTML = "<h4>Paramètres :</h4>";

  try {
    const response = await fetch(`http://127.0.0.1:8000/api/strategy_params/${strategy}`);
    const data = await response.json();

    if (data.error) {
      paramsContainer.innerHTML = "Erreur de chargement : " + data.error;
      return;
    }

    const params = data.params;
    params.forEach(param => {
      paramsContainer.innerHTML += `
        <label>${param.name} (${param.default ?? "obligatoire"}):</label>
        <input type="text" id="param_${target}_${param.name}" value="${param.default ?? ""}">
      `;
    });
  } catch (error) {
    paramsContainer.innerHTML = "Erreur : " + error.message;
  } finally {
    // ✅ ne masque le loader que s’il existe
    if (loader) loader.style.display = "none";
  }
}

// === Mode OFFICIEL ===
async function runBacktestOfficial() {
  /**
   * Envoie un backtest "officiel" au backend.
   * - Construit un payload JSON à partir des inputs visibles
   * - En-tête "X-API-Key" avec le token (obligatoire)
   * - Affiche le résultat via displayResult(...)
   *
   * ⚠️ Les params dynamiques sont récupérés via les inputs dont l'id commence par "param_official_".
   */
  console.log("📊 Lancement du mode données officielles");

  const loader = document.getElementById("loader");
  loader.style.display = "block";
  document.getElementById("result").innerHTML = "";

  const strategy = document.getElementById("strategy").value;
  const symbol = document.getElementById("symbol").value;
  const timeframe = document.getElementById("timeframe").value;
  const start_date = document.getElementById("start_date").value;
  const end_date = document.getElementById("end_date").value;

  const sl_pips = parseFloat(document.getElementById("sl_pips").value);
  const tp1_pips = parseFloat(document.getElementById("tp1_pips").value);
  const tp2_pips = parseFloat(document.getElementById("tp2_pips").value);

  const paramInputs = document.querySelectorAll("[id^='param_official_']");
  const params = {};
  paramInputs.forEach(input => {
    const key = input.id.replace("param_official_", "");
    const value = input.value;
    if (value !== "") {
      params[key] = isNaN(value) ? value : parseFloat(value);
    }
  });

  const payload = {
    strategy,
    params,
    sl_pips,
    tp1_pips,
    tp2_pips,
    symbol,
    timeframe,
    start_date,
    end_date,
    auto_analyze: true
  };

  try {
    const response = await fetch("http://127.0.0.1:8000/api/run_backtest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": localStorage.getItem("apiKey")
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    displayResult(result, "classique");
  } catch (err) {
    console.error("❌ Erreur fetch (officiel):", err);
    document.getElementById("result").innerText = "Erreur: " + err.message;
  }
  finally {
    loader.style.display = "none";
  }
}

// === Mode CSV UPLOAD ===
async function runBacktestCustom() {
  /**
   * Lance un backtest en uploadant un CSV perso.
   * - Construit un FormData pour multipart/form-data
   * - Envoie au backend "upload_csv_and_backtest"
   * - Affiche le résultat via displayResult(...)
   */
  console.log("📂 Lancement du mode CSV custom");

  const file = document.getElementById("custom_csv").files[0];
  if (!file) {
    document.getElementById("result").innerHTML = "⚠️ Aucun fichier sélectionné.";
    return;
  }
  const loader = document.getElementById("loader");
  loader.style.display = "block";
  document.getElementById("result").innerHTML = "";

  const strategy = document.getElementById("strategy_custom").value;
  const symbol = document.getElementById("custom_pair").value || "CUSTOM";
  const timeframe = document.getElementById("custom_tf").value || "CUSTOM";
  const start_date = document.getElementById("custom_start_date").value;
  const end_date = document.getElementById("custom_end_date").value;

  const sl_pips = parseFloat(document.getElementById("sl_pips_custom").value);
  const tp1_pips = parseFloat(document.getElementById("tp1_pips_custom").value);
  const tp2_pips = parseFloat(document.getElementById("tp2_pips_custom").value);

  const paramInputs = document.querySelectorAll("[id^='param_custom_']");
  const params = {};
  paramInputs.forEach(input => {
    const key = input.id.replace("param_custom_", "");
    const value = input.value;
    if (value !== "") {
      params[key] = isNaN(value) ? value : parseFloat(value);
    }
  });

  const formData = new FormData();
  formData.append("strategy", strategy);
  formData.append("sl_pips", sl_pips);
  formData.append("tp1_pips", tp1_pips);
  formData.append("tp2_pips", tp2_pips);
  formData.append("csv_file", file);
  formData.append("symbol", symbol);
  formData.append("timeframe", timeframe);
  formData.append("start_date", start_date);
  formData.append("end_date", end_date);

  try {
    const response = await fetch("http://127.0.0.1:8000/api/upload_csv_and_backtest", {
      method: "POST",
      headers: {
        "X-API-Key": localStorage.getItem("apiKey")
      },
      body: formData
    });

    const result = await response.json();
    displayResult(result, "custom");
  } catch (err) {
    console.error("❌ Erreur fetch (custom):", err);
    document.getElementById("result").innerText = "Erreur: " + err.message;
  }
}

// === Affichage des résultats
function displayResult(result, mode) {
  /**
   * Construit un HTML lisible pour l’utilisateur à partir de la réponse backend.
   * - Affiche crédits restants (si présents)
   * - Lien direct de download XLSX
   * - "Golden hours" si le backend renvoie cette section (optionnelle)
   */
  if (result.error) {
    document.getElementById("result").innerHTML = `<strong>⚠️ Erreur :</strong><br>${result.error}`;
    return;
  }

  let html = `<strong>✅ Backtest terminé (${mode})</strong><br>`;
  if (result.credits_remaining !== undefined) {
    html += `🎫 Crédits restants : ${result.credits_remaining}<br><br>`;
  }

  if (result.xlsx_result) {
    const parts = result.xlsx_result.replaceAll("\\", "/").split("/");
    const filename = parts[parts.length - 1];
    html += `<a href="http://127.0.0.1:8000/api/download/${filename}" target="_blank">📥 Télécharger Excel</a><br>`;
  }

  // === 🔥 Golden Hours + Winrate (si la route les renvoie)
  if (result.golden_hours) {
    const winrate = result.golden_hours.winrate_global;
    const hours = result.golden_hours.golden_hours;

    html += `<br><b>📊 Winrate global :</b><br>`;
    html += `TP1 : ${winrate.TP1}%`;
    if (winrate.TP2 !== null) html += ` | TP2 : ${winrate.TP2}%`;

    html += `<br><br><b>🔥 Golden Hours :</b><br>`;
    hours.forEach(h => {
      html += `🕒 ${h.hour}h → TP1: ${h.TP1}%`;
      if (h.TP2 !== null) html += ` / TP2: ${h.TP2}%`;
      html += `<br>`;
    });
  }

  document.getElementById("result").innerHTML = html;
}

// === Chargement des stratégies
async function loadStrategies() {
  /**
   * Charge la liste des stratégies disponibles via /api/list_strategies,
   * peuple les deux <select>, puis génère les params initiaux sur les deux formulaires.
   */
  const response = await fetch("http://127.0.0.1:8000/api/list_strategies");
  const data = await response.json();

  const stratSelects = [document.getElementById("strategy"), document.getElementById("strategy_custom")];
  stratSelects.forEach(select => {
    select.innerHTML = "";
    data.strategies.forEach(strat => {
      const option = document.createElement("option");
      option.value = strat;
      option.textContent = strat;
      select.appendChild(option);
    });
  });

  renderParams("official");
  renderParams("custom");
}

// === Chargement des paires depuis les fichiers output
async function loadPairsFromOutput() {
  /**
   * Récupère les symboles et timeframes connus via /api/list_output_backtest_files
   * et remplit #symbol et #timeframe.
   */
  const response = await fetch("http://127.0.0.1:8000/api/list_output_backtest_files");
  const data = await response.json();

  const pairSelect = document.getElementById("symbol");
  const tfSelect = document.getElementById("timeframe");
  const seenPairs = new Set();
  const seenTFs = new Set();

  pairSelect.innerHTML = "";
  tfSelect.innerHTML = "";

  for (const symbol in data) {
    if (!seenPairs.has(symbol)) {
      const opt = document.createElement("option");
      opt.value = symbol;
      opt.textContent = symbol;
      pairSelect.appendChild(opt);
      seenPairs.add(symbol);
    }

    for (const tf in data[symbol]) {
      if (!seenTFs.has(tf)) {
        const tfOpt = document.createElement("option");
        tfOpt.value = tf;
        tfOpt.textContent = tf;
        tfSelect.appendChild(tfOpt);
        seenTFs.add(tf);
      }
    }
  }
}

// === Switch interface OFFICIEL / CUSTOM
function showOfficial() {
  document.getElementById("officialForm").style.display = "block";
  document.getElementById("uploadForm").style.display = "none";
}

function showCustom() {
  document.getElementById("officialForm").style.display = "none";
  document.getElementById("uploadForm").style.display = "block";
}


// === Boot sequence au chargement de la page
window.onload = () => {
  loadStrategies();
  loadPairsFromOutput();

  // Listeners des changements de stratégie → régénère les params
  document.getElementById("strategy").addEventListener("change", () => renderParams("official"));
  document.getElementById("strategy_custom").addEventListener("change", () => renderParams("custom"));

  // Soumission des formulaires
  document.getElementById("officialForm").addEventListener("submit", function (e) {
    e.preventDefault();
    runBacktestOfficial();
  });

  document.getElementById("uploadForm").addEventListener("submit", function (e) {
    e.preventDefault();
    runBacktestCustom();
  });

  // ✅ Redirection vers profil
  window.goProfile = function () {
    const token = localStorage.getItem("apiKey");
    if (!token) {
      window.location.href = "/login";
    } else {
      window.location.href = `/profile?token=${token}`;
    }
  };
};

/** Ouvre/ferme le menu principal (mobile) */
function toggleMenu() {
  const nav = document.getElementById("main-nav");
  nav.classList.toggle("active");
}
