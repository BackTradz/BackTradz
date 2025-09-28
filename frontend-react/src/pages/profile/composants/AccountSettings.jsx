// src/components/profil/AccountSettings.jsx
import ProfileForm from "./ProfileForm";
import PasswordForm from "./PasswordForm";

export default function AccountSettings({ user, onSaveProfile, saving }) {
  return (
    <div className="card card-hover slide-up">
      <div className="settings-header">
        <h2 className="card-title">Paramètres du compte</h2>
        <p className="muted">
          Si tu t’es inscrit via <b>Google</b>, tu peux <b>ajouter un mot de passe</b> ici.
          Tu pourras ensuite te connecter avec <b>ton e-mail + mot de passe</b> ou continuer
          via  <b>Google</b>.
        </p>
      </div>

      <div className="settings-grid">
        <div className="settings-col">
          <h3 className="sub-title">Informations personnelles</h3>
          <ProfileForm
                key={`${user?.email || ""}-${user?.name || user?.full_name || ""}`}
                user={user}
                onSubmit={onSaveProfile}
                saving={saving}
            />

        </div>

        <div className="settings-divider" aria-hidden />

        <div className="settings-col">
          <h3 className="sub-title">Sécurité</h3>
          <PasswordForm />
        </div>
      </div>
    </div>
  );
}
