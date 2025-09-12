// ============================================================
// GoogleLoginButton.jsx — Version upgrade (0 régression)
// - Même logique de redirection (VITE_BACKEND_URL + /api/auth/google)
// - Bouton plus "pro": focus ring, hover, active, disabled
// - Props optionnels: fullWidth (true par défaut), label personnalisé
// - Conserve le nom du composant et l'usage: <GoogleLoginButton />
// ============================================================

export default function GoogleLoginButton({ fullWidth = true, label = "Continuer avec Google", disabled = false }) {
  const startGoogle = () => {
    if (disabled) return;
    const backend = import.meta.env.VITE_BACKEND_URL || "http://127.0.0.1:8000";
    window.location.href = `${backend}/api/auth/google`;
  };

  return (
    <button
      type="button"
      onClick={startGoogle}
      disabled={disabled}
      aria-label={label}
      className={[
        "google-button",             // <- garde la classe existante pour compat CSS
        "sdx-google-btn",            // <- nouvelle classe (styles ci-dessous)
        fullWidth ? "w-full" : "",   // tailwind si présent
        disabled ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
      ].join(" ").trim()}
    >
      {/* Icône Google inline (net, sans fetch externe) */}
      <svg className="sdx-google-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.64 32.26 29.223 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.058 0 5.84 1.156 7.957 3.043l5.657-5.657C34.676 5.14 29.627 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20 19-8.955 19-20c0-1.341-.138-2.651-.389-3.917z"/>
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.4 16.077 18.834 13 24 13c3.058 0 5.84 1.156 7.957 3.043l5.657-5.657C34.676 5.14 29.627 3 24 3 16.318 3 9.689 7.337 6.306 14.691z"/>
        <path fill="#4CAF50" d="M24 43c5.168 0 9.86-1.977 13.4-5.197l-6.186-5.162C29.176 34.795 26.724 36 24 36c-5.199 0-9.632-3.712-11.13-8.709l-6.544 5.039C9.683 38.567 16.296 43 24 43z"/>
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.021 3.19-3.41 5.68-6.497 6.641L34.214 37.8C37.021 35.187 39 31.4 39 27c0-1.341-.138-2.651-.389-3.917z"/>
      </svg>
      <span className="sdx-google-label">{label}</span>
    </button>
  );
}
