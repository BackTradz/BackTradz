// components/backtest/BacktestCard.jsx
import { downloadXlsxUrl } from "../../sdk/userApi";
import Card from "../ui/Card";
import Button from "../ui/Button";
import usePip from "../../hooks/usePip";

/**
 * 📦 Composant BacktestCard
 * - Affiche les infos clés d’un backtest (stratégie, winrate, période…)
 * - Utilisé sur le dashboard ou les pages de résultats
 * - Permet de télécharger le fichier .xlsx du backtest
 */
export default function BacktestCard({ bt }) {
  if (!bt) return null; // 🔒 Sécurité : aucun backtest = aucun rendu

  const { pip } = usePip(bt.symbol); // 🔁 Récupération dynamique du pip pour cette paire

  return (
    <Card className="space-y-2">
      {/* En-tête du backtest */}
      <h3 className="text-base font-semibold text-white">
        {bt.symbol} • {bt.timeframe}
      </h3>

      {/* Détail texte */}
      <p className="text-sm text-slate-300">
        <strong>Stratégie :</strong> {bt.strategy}<br />
        <strong>Période :</strong> {bt.period}<br />
        <strong>Winrate TP1 :</strong> {bt.winrate ?? "N/A"}%
        {pip != null && <><br/><strong>Pip :</strong> {pip}</>}
      </p>

      {/* Bouton téléchargement si fichier dispo */}
      {bt.xlsx_filename && (
        <a href={downloadXlsxUrl(bt.xlsx_filename)} target="_blank" rel="noreferrer">
          <Button className="mt-2">📥 Télécharger .xlsx</Button>
        </a>
      )}
    </Card>
  );
}

