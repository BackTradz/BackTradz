// [CHANGE: 2025-09-04] Unifie avec Select + labels friendly
import { useEffect, useState, useMemo } from "react";
import SectionTitle from "../ui/SectionTitle";
import BacktestCard from "../backtest/BacktestCard.jsx";
import { myBacktests } from "../../sdk/userApi";

import Select from "../ui/select/Select";
import { pairsToOptions } from "../../lib/labels";

export default function UserBacktestDashboard() {
  const [backtests, setBacktests] = useState([]);
  const [pairFilter, setPairFilter] = useState("ALL");
  const [msg, setMsg] = useState("");


  useEffect(() => {
    (async () => {
      try {
        const data = await myBacktests();
        const list = Array.isArray(data) ? data : data.items || [];
        setBacktests(list);
      } catch (err) {
        console.error("❌ Erreur API my_backtests:", err);
        setMsg("Erreur de chargement des backtests");
      }
    })();
  }, []);

  const filtered =
    pairFilter === "ALL" ? backtests : backtests.filter((b) => b.symbol === pairFilter);

  const pairOptions = useMemo(() => {
    const uniq = Array.from(new Set(backtests.map((b) => b.symbol).filter(Boolean)));
    return pairsToOptions(uniq);
  }, [backtests]);

  return (
    <div className="mb-10">
      {msg && <p className="text-red-500 mb-4">{msg}</p>}

      {/* Filtres */}
      <div className="mb-4" style={{ maxWidth: 360 }}>
        <Select
          id="user-bt-pair"
          value={pairFilter}
          onChange={setPairFilter}
          options={pairOptions}
          size="md"
          variant="solid"
          fullWidth
          data-inline-label="Paire"
        />
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <p className="text-slate-400 text-sm">Aucun backtest trouvé.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {filtered.map((bt, i) => (
            <BacktestCard key={bt.id || i} bt={bt} />
          ))}
        </div>
      )}
    </div>
  );
}
