// src/hooks/useIsAdmin.js
// ============================================================
// Hook custom pour vérifier si l'utilisateur courant est admin
// - Appelle le backend /api/admin/ping avec le X-API-Key
// - Retourne true si 200 OK, sinon false
// - Se réévalue quand le token change
// ============================================================
import { useEffect, useState } from "react";

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const apiKey = localStorage.getItem("apiKey");
    if (!apiKey) { setIsAdmin(false); return; }

    fetch("/api/admin/ping", { headers: { "X-API-Key": apiKey } })
      .then(r => setIsAdmin(r.ok))
      .catch(() => setIsAdmin(false));
  }, [localStorage.getItem("apiKey")]); // re-check si changement de compte

  return isAdmin;
}
