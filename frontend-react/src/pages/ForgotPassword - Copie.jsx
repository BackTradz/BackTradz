import React, { useState } from "react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:8000/api/generate-reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setResetToken(data.reset_token);
        setSuccess("Token généré avec succès !");
      } else {
        setError(data.detail || "Erreur inconnue");
      }
    } catch (err) {
      setError("Erreur de connexion au serveur.");
    }
  };

  return (
    <div className="container">
      <h2>🔑 Mot de passe oublié</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Entrez votre e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Générer un token</button>
      </form>

      {success && <p style={{ color: "green" }}>{success}</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {resetToken && (
        <div style={{ marginTop: 20 }}>
          <p><strong>Token de reset :</strong></p>
          <code>{resetToken}</code>
          <p>
            Va sur{" "}
            <a href={`/reset-password/${resetToken}`}>
              /reset-password/{resetToken}
            </a>{" "}
            pour changer ton mot de passe.
          </p>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
