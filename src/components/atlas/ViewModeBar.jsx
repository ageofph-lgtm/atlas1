import React from "react";
import { MODOS, TAMANHOS, modoUsaEscala } from "@/components/atlas/viewPrefs";

/**
 * Escolha do modo de visualização e do tamanho dos ícones.
 *
 * O tamanho desliga-se em Lista e Detalhe, que são compactos por natureza —
 * é preferível mostrá-lo apagado a escondê-lo, para o botão não saltar do
 * sítio de cada vez que se muda de modo.
 */
export default function ViewModeBar({ modo, onModo, tamanho, onTamanho }) {
  const escala = modoUsaEscala(modo);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-0.5 glass border border-slate-700 rounded-lg p-0.5" role="group" aria-label="Modo de visualização">
        {MODOS.map(({ key, label, Icone }) => (
          <button
            key={key}
            onClick={() => onModo(key)}
            title={label}
            aria-label={label}
            aria-pressed={modo === key}
            className={`p-1.5 rounded-md transition-colors ${
              modo === key ? "bg-amber-500 text-slate-900" : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50"
            }`}
          >
            <Icone className="w-4 h-4" />
          </button>
        ))}
      </div>

      <div
        className={`flex items-center gap-0.5 glass border border-slate-700 rounded-lg p-0.5 ${escala ? "" : "opacity-40"}`}
        role="group"
        aria-label="Tamanho dos ícones"
      >
        {TAMANHOS.map(({ key, label, sigla }) => (
          <button
            key={key}
            onClick={() => escala && onTamanho(key)}
            disabled={!escala}
            title={escala ? label : "Lista e Detalhe não têm ícones para dimensionar"}
            aria-label={label}
            aria-pressed={tamanho === key}
            className={`w-6 h-6 rounded-md text-[11px] font-bold transition-colors disabled:cursor-not-allowed ${
              tamanho === key && escala
                ? "bg-amber-500 text-slate-900"
                : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 disabled:hover:bg-transparent disabled:hover:text-slate-400"
            }`}
          >
            {sigla}
          </button>
        ))}
      </div>
    </div>
  );
}
