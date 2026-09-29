import React, { useSyncExternalStore } from "react";
import { Sparkles, RotateCcw } from "lucide-react";
import { subscreverAtualizacao, estadoDaAtualizacao, aplicarVersaoNova } from "@/lib/atualizacao";

/**
 * "Há uma versão nova" com um botão que a aplica.
 *
 * Fica em baixo, e não em cima, porque a barra de cima é a de falta de rede —
 * essa impede de trabalhar e tem de saltar à vista. Esta não impede nada: a
 * aplicação continua a funcionar na versão antiga até alguém carregar. Não tem
 * botão de fechar de propósito, porque fechá-la deixaria a pessoa de vez numa
 * versão velha sem nada que lho lembrasse.
 */
export default function AvisoAtualizacao() {
  const estado = useSyncExternalStore(subscreverAtualizacao, estadoDaAtualizacao, estadoDaAtualizacao);
  if (!estado.disponivel) return null;

  return (
    <div
      role="status"
      className="fixed bottom-0 left-0 right-0 z-[200] px-3 py-2 flex items-center justify-center gap-3 flex-wrap bg-amber-500 text-slate-900 shadow-lg"
    >
      <span className="flex items-center gap-1.5 text-xs font-bold">
        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
        Há uma versão nova do ATLAS.
      </span>
      <button
        onClick={aplicarVersaoNova}
        className="flex items-center gap-1.5 rounded-md bg-slate-900 text-amber-400 text-xs font-bold px-3 py-1.5 hover:bg-slate-800 transition-colors"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Atualizar agora
      </button>
      <span className="text-[11px] text-slate-900/70 w-full sm:w-auto text-center">
        Termine o que está a fazer primeiro — a página recarrega.
      </span>
    </div>
  );
}
