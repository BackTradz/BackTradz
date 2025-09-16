// ============================================================
// userApi.js
// ------------------------------------------------------------
// RÔLE : regrouper les appels liés à l'utilisateur (profil, backtests…)
// TES ROUTES (backend) :
// - GET  /api/user/backtests                -> liste des backtests du user
// - GET  /api/user/csvs                     -> liste des CSV achetés du user ✅
// - GET  /api/download/{filename}           -> download du .xlsx (URL directe)
// - POST /profile/update                    -> maj profil (souvent form-data)
// - POST /profile/unsubscribe               -> résiliation abonnement
// - POST /profile/delete                    -> suppression compte
// ============================================================
import { api } from './apiClient';

export const myBacktests = () =>
  api('api/user/backtests'); // besoin d'être connecté (X-API-Key)

// Nouveau : liste des CSV achetés
export const myPurchasedCSVs = () =>
  api('api/user/csvs'); // besoin d'être connecté

export const downloadXlsxUrl = (filename) =>
  `api/download/${filename}`; // URL directe (proxy vite -> backend)

// Update profil : accepte un FormData ou un <form>, mappe vers { email, full_name }
export const updateProfile = async (formElOrFD) => {
  const raw = formElOrFD instanceof FormData ? formElOrFD : new FormData(formElOrFD);

  // Champs venant du formulaire UI
  const email = (raw.get('email') || '').trim();
  const fullNameFromParts = [raw.get('first_name') || '', raw.get('last_name') || '']
    .filter(Boolean)
    .join(' ')
    .trim();
  const full_name = fullNameFromParts || (raw.get('name') || '').trim();

  // Recompose un FD conforme au backend
  const fd = new FormData();
  if (email) fd.append('email', email);
  if (full_name) fd.append('full_name', full_name);
  if (raw.get('password')) fd.append('password', raw.get('password'));

  try {
    // Route officielle (sans /api)
    // 🔧 on tape l’alias /api coté backend
    return api('api/profile/update', { method: 'POST', body: fd });
  } catch (err) {
    // Si ton reverse proxy ajoute /api/ devant : on retente proprement
    if (String(err?.message || '').includes('HTTP 404')) {
      return await api('api/profile/update', { method: 'POST', body: fd });
    }
    throw err;
  }
};

export const unsubscribe = () => api('api/profile/unsubscribe', { method: 'POST' });
export const deleteAccount = () => api('api/profile/delete', { method: 'POST' });
