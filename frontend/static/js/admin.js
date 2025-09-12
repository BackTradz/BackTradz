/**
 * admin.js
 * --------
 * Rôle : logique côté admin (tableau des stats de backtest, gestion des users,
 * historiques, stats globales).
 *
 * Auth :
 *  - Nécessite un token utilisateur dans localStorage (apiKey).
 *  - checkAdminAccess() vérifie côté backend que l'email correspond à l'admin.
 *
 * Endpoints utilisés :
 *  - GET  /api/me
 *  - GET  /api/admin/stats/backtest_summary
 *  - GET  /api/admin/get_users
 *  - POST /api/admin/add_credit
 *  - POST /api/admin/remove_credit
 *  - POST /api/admin/toggle_block_user
 *  - POST /api/admin/delete_user
 *  - GET  /api/admin/user_history/{user_id}
 *  - GET  /api/admin/global_history
 *  - GET  /api/admin/global_stats
 *
 * Notes DOM :
 *  - #statsTable tbody          : insertion des lignes de stats backtest
 *  - #usersList                 : cartes utilisateurs + actions
 *  - #globalHistoryContainer    : liste des dernières transactions
 *  - #statsContainer            : tableau de stats globales
 */

const token = localStorage.getItem("apiKey");
if (!token) window.location.href = "/login";

// Vérifie si user est admin avant de continuer
async function checkAdminAccess() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/me", {
      headers: { "X-API-Key": token },
    });
    if (!res.ok) throw new Error("Erreur d'auth");

    const user = await res.json();
    // ⚠️ Admin "hardcodé" : à externaliser plus tard (env/config)
    if (user.email !== "florian.boulinguez@outlook.com") {
      window.location.href = "/";
    }
  } catch (err) {
    console.error("❌ Accès admin refusé :", err);
    window.location.href = "/";
  }
}

/**
 * Charge les stats de backtests agrégées et remplit #statsTable tbody
 * (symbol, timeframe, strategy, period, totaux, winrates, params).
 */
async function loadStats() {
  const res = await fetch(
    "http://127.0.0.1:8000/api/admin/stats/backtest_summary",
    {
      headers: { "X-API-Key": token },
    }
  );
  const data = await res.json();
  const tbody = document.querySelector("#statsTable tbody");

  data.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${row.symbol}</td>
            <td>${row.timeframe}</td>
            <td>${row.strategy}</td>
            <td>${row.period}</td>
            <td>${row.total}</td>
            <td>${row.tp1}</td>
            <td>${row.tp2}</td>
            <td>${row.sl}</td>
            <td>${row.winrate_tp1}</td>
            <td>${row.winrate_tp2}</td>
            <td class="params">${JSON.stringify(row.params, null, 2)}</td>
        `;
    tbody.appendChild(tr);
  });
}

/**
 * Récupère la liste des users et affiche :
 *  - username/email/plan/credits
 *  - boutons (+ crédit, - crédit, block/unblock, delete)
 *  - bouton pour afficher l'historique d’achat du user
 */
async function loadUsers() {
  const res = await fetch("http://127.0.0.1:8000/api/admin/get_users", {
    headers: { "X-API-Key": token },
  });
  const data = await res.json();
  console.log("🔍 Données reçues de get_users:", data);

  const div = document.getElementById("usersList");
  div.innerHTML = "";

  data.forEach((user) => {
    const userCard = document.createElement("div");
    userCard.className = "user-card";
    userCard.innerHTML = `
            <p><strong>${user.username}</strong> (${user.email}) - Plan: ${user.plan} - Crédits: ${user.credits}</p>
            <button onclick="modifyCredit('${user.id}', 1)">➕ Crédit</button>
            <button onclick="modifyCredit('${user.id}', -1)">➖ Crédit</button>
            <button onclick="toggleBlock('${user.id}')">${user.is_blocked ? "✅ Débloquer" : "🚫 Bloquer"}</button>
            <button onclick="deleteUser('${user.id}')">❌ Supprimer</button>
        `;

    const historyBtn = document.createElement("button");
    historyBtn.textContent = "📁 Afficher historique";
    historyBtn.onclick = function () {
      toggleHistory(user.id, historyBtn);
    };
    userCard.appendChild(historyBtn);

    // 🔥 la ligne manquante ici
    // Ajout de la carte utilisateur dans la liste principale
    div.appendChild(userCard);
  });
}

/**
 * Ajoute ou retire des crédits à un utilisateur.
 * - route = add_credit | remove_credit
 * - amount est positif, la route décide du sens.
 */
async function modifyCredit(userId, amount) {
  const route = amount > 0 ? "add_credit" : "remove_credit";
  const res = await fetch(`http://127.0.0.1:8000/api/admin/${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": token,
    },
    body: JSON.stringify({ user_id: userId, amount: Math.abs(amount) }),
  });
  const msg = await res.json();
  alert(msg.detail || "Crédit modifié !");
  loadUsers(); // refresh UI
}

/** Bloque/Débloque un utilisateur */
async function toggleBlock(userId) {
  const res = await fetch(
    "http://127.0.0.1:8000/api/admin/toggle_block_user",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": token,
      },
      body: JSON.stringify({ user_id: userId }),
    }
  );
  const msg = await res.json();
  alert(msg.detail || "État du compte mis à jour.");
  loadUsers();
}

/** Supprime un utilisateur (confirmation avant appel) */
async function deleteUser(userId) {
  if (!confirm("⚠️ Supprimer ce compte ? Cette action est irréversible.")) return;
  const res = await fetch("http://127.0.0.1:8000/api/admin/delete_user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": token,
    },
    body: JSON.stringify({ user_id: userId }),
  });
  const msg = await res.json();
  alert(msg.detail || "Utilisateur supprimé.");
  loadUsers();
}

/**
 * Affiche/masque l'historique d'achat pour un user donné.
 * - Insert un <div id="history-<userId>"> sous la carte.
 */
async function toggleHistory(userId, btn) {
  const existing = document.getElementById(`history-${userId}`);
  if (existing) {
    existing.remove();
    btn.textContent = "📁 Afficher historique";
    return;
  }

  const res = await fetch(`/api/admin/user_history/${userId}`, {
    headers: { "X-API-Key": token },
  });
  const data = await res.json();

  const div = document.createElement("div");
  div.id = `history-${userId}`;
  div.className = "user-history";
  btn.textContent = "📂 Masquer historique";

  if (!data || data.length === 0) {
    div.innerHTML = "<p style='color:gray'>Aucun achat trouvé.</p>";
  } else {
    const list = document.createElement("ul");
    list.style.paddingLeft = "1.5rem";
    data.forEach((p) => {
      const date = new Date(p.date).toLocaleString("fr-FR");
      const method = p.method || "inconnu";
      const price = p.price_paid === 0 ? "Gratuit" : `${p.price_paid}€`;
      const type =
        p.label || (p.offer_id?.startsWith("SUB_") ? "Abonnement" : "Crédits");

      const li = document.createElement("li");
      li.innerHTML = `🕒 ${date} — <strong>${price}</strong> via ${method} (${type})`;
      list.appendChild(li);
    });
    div.appendChild(list);
  }

  btn.parentNode.appendChild(div);
}

/**
 * Charge l'historique global des transactions (dernier X éléments)
 * et propose un bouton "voir plus" pour étendre/masquer.
 */
async function loadGlobalHistory() {
  const container = document.getElementById("globalHistoryContainer");
  if (!container) return;

  const res = await fetch("/api/admin/global_history", {
    headers: { "X-API-Key": token },
  });
  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = "<p style='color:gray'>Aucune transaction trouvée.</p>";
    return;
  }

  const list = document.createElement("ul");
  list.className = "tx-history";
  const max = 5;

  data.forEach((tx, i) => {
    const li = document.createElement("li");
    li.className = i >= max ? "tx-hidden" : "";
    const date = new Date(tx.date).toLocaleString("fr-FR");
    li.innerHTML = `🧾 ${date} — <strong>${tx.price_paid}€</strong> par ${tx.username} via ${tx.method} (${tx.label})`;
    list.appendChild(li);
  });

  container.appendChild(list);

  if (data.length > max) {
    const btn = document.createElement("button");
    btn.textContent = "🔽 Voir plus";
    btn.onclick = () => {
      const hidden = container.querySelectorAll(".tx-hidden");
      const visible = hidden[0].style.display === "none" ? false : true;
      hidden.forEach((e) => {
        e.style.display = visible ? "none" : "list-item";
      });
      btn.textContent = visible ? "🔽 Voir plus" : "🔼 Masquer";
    };
    container.appendChild(btn);
  }
}

/** Charge et affiche des indicateurs globaux (ventes, crédits, users, etc.) */
async function loadGlobalStats() {
  const container = document.getElementById("statsContainer");
  if (!container) return;

  const res = await fetch("/api/admin/global_stats", {
    headers: { "X-API-Key": token },
  });
  const data = await res.json();

  const stats = [
    ["💶 Total ventes (€)", data.total_sales_eur + " €"],
    ["📦 Crédits achetés", data.total_credits_bought],
    ["🎁 Crédits offerts", data.credits_offered],
    ["👤 Utilisateurs inscrits", data.total_users],
    ["🪙 Abonnés actifs", data.subscribers],
    ["💰 Crédits disponibles", data.credits_available],
  ];

  const table = document.createElement("table");
  table.className = "stats-table";
  stats.forEach(([label, val]) => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${label}</td><td><strong>${val}</strong></td>`;
    table.appendChild(row);
  });

  container.appendChild(table);
}

// === Boot sequence (ordre important) ===
checkAdminAccess();
loadStats();
loadUsers();
loadGlobalHistory();
loadGlobalStats();
