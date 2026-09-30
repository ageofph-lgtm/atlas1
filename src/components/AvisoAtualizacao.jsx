import React, { useEffect, useState, useSyncExternalStore } from "react";
import { Sparkles, RotateCcw, Loader2 } from "lucide-react";
import { subscreverAtualizacao, estadoDaAtualizacao, aplicarVersaoNova } from "@/lib/atualizacao";

/**
 * "Há uma versão nova" com um botão que a aplica.
 *
 * Aparece durante o uso, logo que o servidor tem uma versão nova (ver
 * `lib/versao.js`), e tem de se ver: um cartão largo em baixo, com o botão
 * grande, e o título do separador marcado — quem tem o ATLAS aberto noutro
 * separador também dá por ela.
 *
 * Fica em baixo, e não em cima, porque a barra de cima é a de falta de rede —
 * essa impede de trabalhar. Esta não impede nada: a aplicação continua a
 * funcionar na versão antiga até alguém carregar. Não tem botão de fechar de
 * propósito, porque fechá-la deixaria a pessoa de vez numa versão velha sem
 * nada que lho lembrasse.
 */
export default function AvisoAtualizacao() {
  const estado = useSyncExternalStore(subscreverAtualizacao, estadoDaAtualizacao, estadoDaAtualizacao);
  const [aAtualizar, setAAtualizar] = useState(false);

  useEffect(() => {
    if (!estado.disponivel) return undefined;
    const titulo = document.title;
    document.title = `● Versão nova — ${titulo}`;
    return () => { document.title = titulo; };
  }, [estado.disponivel]);

  if (!estado.disponivel && !aAtualizar) return null;

  const atualizar = () => {
    setAAtualizar(true);
    aplicarVersaoNova();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[200] p-3 sm:p-4 pointer-events-none">
      <div
        role="alert"
        className="pointer-events-auto mx-auto max-w-2xl rounded-xl bg-amber-500 text-slate-900 shadow-2xl ring-4 ring-amber-500/30 px-4 py-3.5 flex flex-col sm:flex-row items-center gap-3"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
          <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-900/15">
            <span className="absolute inset-0 rounded-full bg-slate-900/20 animate-ping" />
            <Sparkles className="relative w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-extrabold leading-tight">Há uma versão nova do ATLAS</p>
            <p className="text-xs font-medium text-slate-900/75 mt-0.5">
              Termine o que está a fazer e atualize — a página recarrega.
            </p>
          </div>
        </div>
        <button
          onClick={atualizar}
          disabled={aAtualizar}
          className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-amber-400 text-sm font-bold px-5 py-3 hover:bg-slate-800 disabled:opacity-80 transition-colors flex-shrink-0"
        >
          {aAtualizar ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          {aAtualizar ? "A atualizar…" : "Atualizar agora"}
        </button>
      </div>
    </div>
  );
}
