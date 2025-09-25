import posthog from 'posthog-js';

const KEY   = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const HOST  = import.meta.env.VITE_PUBLIC_POSTHOG_HOST; // ex: https://app.posthog.com
const IS_LOCAL = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

const INTERNAL_EMAILS = (import.meta.env.VITE_INTERNAL_EMAILS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const INTERNAL_DOMAINS = (import.meta.env.VITE_INTERNAL_DOMAINS || '')
  .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

function isInternalEmail(email) {
  if (!email) return false;
  const e = String(email).toLowerCase();
  if (INTERNAL_EMAILS.includes(e)) return true;
  return INTERNAL_DOMAINS.some(d => d && e.endsWith(d));
}
if (!KEY || !HOST) {
  console.warn('[PostHog] missing envs', { KEY: !!KEY, HOST });
} else {
  posthog.init(KEY, {
    api_host: HOST,
    // ✅ On laisse PostHog CAPTER PAR DÉFAUT pour tous les users normaux
    //    (on ne coupera que pour tes emails internes au moment de l'identify)
    capture_pageview: true,
    disable_session_recording: true,  // safe par défaut
  });
  // expose pour test console
  // eslint-disable-next-line no-undef
  window.posthog = posthog;
  console.log('[PostHog] initialized');
  
  // En local: on ne trace jamais (⚠️ sans poser de flag persistant)
  if (IS_LOCAL) {
    posthog.opt_out_capturing();
  }
}
export default posthog;

// 🔐 À appeler au succès du login
export function posthogIdentify(user) {
  try {
    if (!user || !KEY || !HOST) return;
    const email = (user.email || user.mail || '').toLowerCase();
    const id = String(user.id || user.user_id || user.username || email || 'anonymous');
    
    if (isInternalEmail(email)) {
      // 🔒 Email interne → on coupe les events UNIQUEMENT pour cette session
      posthog.opt_out_capturing();   // pas d'identify, pas d'events
      return;
    }
    // user normal → on autorise et on identifie
    posthog.opt_in_capturing();
    posthog.identify(id, { email, username: user.username, role: user.role || 'user' });
  } catch {}
}

// À appeler au logout (facultatif)
export function posthogReset() {
  try {
    posthog.reset();
  } catch {}
}

// DEBUG: expose pour vérifier dans la console
// (retire-le après validation)
// eslint-disable-next-line no-undef
window.posthogIdentify = posthogIdentify;
// eslint-disable-next-line no-undef
window.__PH_INTERNALS__ = {
  INTERNAL_EMAILS,
  INTERNAL_DOMAINS
};