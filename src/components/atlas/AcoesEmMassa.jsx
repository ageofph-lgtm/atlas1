import React, { useState } from "react";
import { X, Loader2, AlertTriangle, Check, Flag, FlagOff, Zap, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { executarEmLote, resumirLote } from "@/components/atlas/executarEmLote";
import { definirPrioridade, marcarPronta, podeMarcarPronta } from "@/components/atlas/acoesCiclo";
import { exportarCiclos } from "@/components/atlas/exportarCiclos";

/**
 * Barra das ações em massa, visível enquanto houver máquinas selecionadas.
 *
 * Nenhuma ação é reimplementada aqui: todas chamam as mesmas funções que o card
 * individual usa. E nenhuma é silenciosa — no fim há sempre um relatório a
 * dizer quantas passaram, quantas foram ignoradas e porquê, e quais falharam.
 */
export default function AcoesEmMassa({
  selecionados,
  onLimpar,
  onConcluido,
  getMaquina,
  pagina,
  autor,
  podeGerir,
  onAutorizar,
}) {
  const { toast } = useToast();
  const [aCorrer, setACorrer] = useState(null);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });

  const total = selecionados.length;
  if (total === 0) return null;

  const correr = async (nome, { aplicavel, executar, verbo }) => {
    setACorrer(nome);
    setProgresso({ feito: 0, total });
    const resultado = await executarEmLote(selecionados, {
      aplicavel,
      executar,
      onProgresso: ({ feito, total: t }) => setProgresso({ feito, total: t }),
    });
    setACorrer(null);

    const houveProblema = resultado.falhadas.length > 0 || resultado.ignoradas.length > 0;
    toast({
      variant: resultado.feitas.length === 0 && houveProblema ? "destructive" : undefined,
      title: houveProblema ? "Concluído com ressalvas" : "✓ Concluído",
      description: resumirLote(resultado, verbo),
    });
    onLimpar();
    onConcluido?.();
  };

  const prioridade = (valor) =>
    correr(valor ? "prio-on" : "prio-off", {
      aplicavel: (c) => (!!c.prioridade === valor ? "já estava assim" : true),
      executar: (c) => definirPrioridade(c, valor),
      verbo: valor ? "marcada" : "desmarcada",
    });

  const prontas = () =>
    correr("pronta", {
      aplicavel: (c) => (podeMarcarPronta(c) ? true : "não estava no fluxo de preparação"),
      executar: (c) => marcarPronta(c, { autor }),
      verbo: "marcada pronta",
    });

  const exportar = async () => {
    setACorrer("exportar");
    try {
      const r = await exportarCiclos(selecionados, { getMaquina, pagina: `${pagina}-selecao` });
      if (r.ok) toast({ title: "✓ Folha gerada", description: `${r.linhas} máquina(s) exportada(s)` });
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao exportar", description: err.message });
    }
    setACorrer(null);
  };

  const ocupado = !!aCorrer;
  const Botao = ({ nome, onClick, Icone, children, destaque }) => (
    <button
      onClick={onClick}
      disabled={ocupado}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        destaque
          ? "bg-amber-500 hover:bg-amber-600 text-slate-900"
          : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
      }`}
    >
      {aCorrer === nome ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icone className="w-3.5 h-3.5" />}
      {children}
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:p-3">
      <div className="glass-2 bg-slate-900 border border-amber-500/40 rounded-xl shadow-2xl px-3 py-2.5 max-w-4xl mx-auto">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-amber-400 flex-shrink-0">
            <span className="num">{total}</span> selecionada{total === 1 ? "" : "s"}
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Botao nome="exportar" onClick={exportar} Icone={Download}>Exportar</Botao>
            {podeGerir && (
              <>
                <Botao nome="prio-on" onClick={() => prioridade(true)} Icone={Flag}>Prioridade</Botao>
                <Botao nome="prio-off" onClick={() => prioridade(false)} Icone={FlagOff}>Tirar prio.</Botao>
                <Botao nome="pronta" onClick={prontas} Icone={Check}>Pronta</Botao>
                {onAutorizar && (
                  <Botao nome="autorizar" onClick={() => onAutorizar(selecionados)} Icone={Zap} destaque>
                    Autorizar
                  </Botao>
                )}
              </>
            )}
          </div>

          <button
            onClick={onLimpar}
            disabled={ocupado}
            className="ml-auto p-1.5 text-slate-400 hover:text-slate-100 rounded-lg disabled:opacity-40"
            aria-label="Limpar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Doze máquinas demoram; sem isto o ecrã parece pendurado. */}
        {ocupado && progresso.total > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              A processar <span className="num">{progresso.feito}</span> de <span className="num">{progresso.total}</span> — não feche a página.
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-200"
                style={{ width: `${Math.round((progresso.feito / progresso.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
