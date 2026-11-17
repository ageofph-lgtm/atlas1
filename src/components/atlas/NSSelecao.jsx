import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { limparNS, nsSelecionados, subscreverNS } from "@/lib/nsClipboard";

/**
 * O aviso de que há NS apanhados para copiar.
 *
 * Sem isto, a seleção era invisível: a pessoa juntava três números, o último
 * toast desaparecia, e não havia como saber o que estava lá dentro nem como
 * sair. Também é o sítio que trata do Esc e do clique fora.
 */
export default function NSSelecao() {
  const [ns, setNs] = useState(nsSelecionados);

  useEffect(() => subscreverNS(setNs), []);

  useEffect(() => {
    if (!ns.length) return;
    const aoTecla = (e) => {
      if (e.key === "Escape") limparNS();
    };
    // Clique sem Ctrl é clique normal: a seleção era um gesto de cópia, não um
    // modo em que se fica preso. Os Ctrl+cliques trazem stopPropagation e por
    // isso nunca chegam aqui.
    const aoClique = (e) => {
      if (!e.ctrlKey && !e.metaKey) limparNS();
    };
    document.addEventListener("keydown", aoTecla);
    document.addEventListener("click", aoClique);
    return () => {
      document.removeEventListener("keydown", aoTecla);
      document.removeEventListener("click", aoClique);
    };
  }, [ns.length]);

  if (!ns.length) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] glass-2 border border-amber-500/40 rounded-lg pl-3 pr-1.5 py-1.5 flex items-center gap-2 shadow-lg shadow-black/30">
      <span className="text-xs font-bold text-slate-200 whitespace-nowrap">
        {ns.length} NS selecionado{ns.length === 1 ? "" : "s"}
      </span>
      <span className="text-slate-500 text-xs">·</span>
      <button
        onClick={() => limparNS()}
        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-amber-400 hover:bg-amber-500/10 transition-colors"
      >
        <X className="w-3 h-3" /> Limpar
      </button>
    </div>
  );
}