// components/backtest/TableWrapper.jsx
export default function TableWrapper({ headers = [], rows = [] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-sm text-left text-white">
        <thead className="bg-[#1F2937] text-slate-300">
          <tr>
            {headers.map((head, i) => (
              <th key={i} className="px-4 py-3 whitespace-nowrap border-b border-white/10">{head}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-white/5 even:bg-white/5">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-2 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
