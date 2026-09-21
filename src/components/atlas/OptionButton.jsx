import React from "react";

/** Botão de escolha das características, partilhado pela entrada e pela edição. */
export default function OptionButton({ option, isSelected, onClick }) {
  return (
  <button
    type="button"
    onClick={() => onClick(option.value)}
    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[72px] ${
      isSelected
        ? "border-amber-500 bg-amber-500/10 text-amber-400"
        : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600"
    }`}
  >
    <span className="text-2xl mb-1">{option.icon}</span>
    <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
  </button>
  );
}
