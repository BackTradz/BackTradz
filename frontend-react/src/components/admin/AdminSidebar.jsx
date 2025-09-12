// components/admin/AdminSidebar.jsx
// ============================================================
// Rôle : Sidebar admin
// - Liste des onglets admin
// - Design pro : fond sombre, accent bleu
// ------------------------------------------------------------
// [BTZ-DEPLOY] Le parent doit fournir `active` et `onChange(tabKey)`
// ------------------------------------------------------------

export default function AdminSidebar({ active, onChange }) {
  const tabs = [
    { key: "users", label: "👥 Utilisateurs" },
    { key: "history", label: "📜 Historique" },
    { key: "stats", label: "📈 Statistiques" },
    { key: "backtests", label: "📊 Backtests" },
  ];

  return (
    <aside className="admin-sidebar">
      <div className="admin-logo">⚙️ Admin</div>
      <nav className="admin-nav">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}                   
            className={`admin-tab ${active === tab.key ? "active" : ""}`} 
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

