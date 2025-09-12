import React from "react";

export default function FreeTrialBadge({ className = "" }) {
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b1324] border border-white/10 text-sm text-cyan-200 ${className}`}
    >
      <span className="font-bold text-white">2 crédits offerts</span>
      <span className="text-slate-400 hidden md:inline">à l’inscription</span>
    </div>
  );
}
