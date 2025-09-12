// frontend/pages/Success.jsx

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const Success = () => {
  const [searchParams] = useSearchParams();
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const offer = searchParams.get("offer");
    const method = searchParams.get("method");
    const credits = searchParams.get("credits");
    const price = searchParams.get("price");

    setSuccessData({ offer, method, credits, price });
  }, [searchParams]);

  if (!successData) return <p>Chargement...</p>;

  return (
    <div className="container success-page">
      <h2>🎉 Merci pour votre achat !</h2>
      <p>✅ Offre : <strong>{successData.offer}</strong></p>
      <p>💸 Prix payé : <strong>{successData.price} €</strong></p>
      <p>🧠 Moyen de paiement : <strong>{successData.method}</strong></p>
      <p>📦 Crédits ajoutés : <strong>{successData.credits}</strong></p>
      <a href="/profile" className="btn">Voir mon profil</a>
    </div>
  );
};

export default Success;
