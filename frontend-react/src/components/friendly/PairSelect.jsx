// [CHANGE: 2025-09-04 - select dédié paires, sort friendly]
import FriendlySelect from "./FriendlySelect";

export default function PairSelect({ value, onChange, ...rest }) {
  return (
    <FriendlySelect
      mapping="pairs"
      value={value}
      onChange={onChange}
      label={rest.label || "Paire"}
      help={rest.help || "Sélectionne l’instrument à backtester"}
      {...rest}
    />
  );
}
