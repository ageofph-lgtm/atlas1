import React, { useState } from "react";
import { WifiOff, RotateCcw, Eraser } from "lucide-react";
import { limparAplicacaoEmCache } from "@/lib/recuperacao";

/**
 * O que se vê quando a aplicação não consegue arrancar.
 *
 * Substitui o círculo que rodava para sempre. Aquele ecrã não dizia nada a
 * ninguém: não havia mensagem, não havia erro na consola, e a única saída era
 * limpar o armazenamento do site pelas ferramentas de programador — coisa que
 * ninguém no pátio tem de saber fazer. Foi o que prendeu um portátil durante
 * dias.
 *
 * O segundo botão faz exatamente essa limpeza, com um clique. Não toca na
 * sessão nem nas preferências: o que apaga é a cópia da aplicação, que é a
 * parte que se estraga.
 */
export default function FalhaAoArrancar({ mensagem, onTentarDeNovo }) {
  const [aLimpar, setALimpar] = useState(false);

  const limpar = async () => {
    setALimpar(true);
    await limparAplicacaoEmCache({
      serviceWorker: typeof navigator !== "undefined" ? navigator.serviceWorker : undefined,
      caches: typeof window !== "undefined" ? window.caches : undefined,
    });
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-4">
      <WifiOff className="w-10 h-10 text-amber-400" />
      <div>
        <h1 className="text-lg font-bold text-slate-100 mb-1.5">O ATLAS não conseguiu arrancar</h1>
        <p className="text-sm text-slate-400 max-w-sm">
          Não houve resposta do servidor. Verifique a ligação à internet e tente de novo.
        </p>
        {/* O detalhe técnico vem do SDK e está em inglês. Fica em baixo e
            pequeno: serve para nos dizer o que aconteceu, não para explicar a
            situação a quem está no pátio. */}
        {mensagem && (
          <p className="num text-[11px] text-slate-600 mt-2 break-words max-w-sm">{mensagem}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
        <button
          onClick={onTentarDeNovo || (() => window.location.reload())}
          className="flex-1 h-11 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Tentar de novo
        </button>
        <button
          onClick={limpar}
          disabled={aLimpar}
          className="flex-1 h-11 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-500 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Eraser className="w-4 h-4" /> {aLimpar ? "A limpar…" : "Limpar e recarregar"}
        </button>
      </div>

      <p className="text-[11px] text-slate-600 max-w-xs">
        &ldquo;Limpar&rdquo; apaga a cópia guardada da aplicação e volta a descarregá-la. Não perde a
        sessão nem o que tem gravado.
      </p>
    </div>
  );
}
