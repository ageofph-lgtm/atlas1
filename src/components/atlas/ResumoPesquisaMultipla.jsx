import React, { useMemo, useState } from "react";
import { Check, Copy, X, AlertTriangle } from "lucide-react";
import { listaDeSeries, resumoDaPesquisaMultipla } from "@/lib/pesquisaMultipla";

/**
 * O ponto da situação de uma pesquisa com vários NS.
 *
 * Quem cola uma lista de 20 séries precisa de saber, antes de mais, quais não
 * apareceram — são essas que dão trabalho. Por isso os NS não encontrados
 * ficam à frente, em tom esbatido, e podem ser copiados de uma vez.
 *
 * `ciclos` é o universo da página com os filtros aplicados mas ANTES da
 * pesquisa de texto: um NS que exista mas esteja noutra aba não pode aparecer
 * aqui como inexistente.
 */
export default function ResumoPesquisaMultipla({ searchQuery, ciclos, onSearchChange }) {
  const lista = listaDeSeries(searchQuery);
  const resumo = useMemo(() => resumoDaPesquisaMultipla(lista, ciclos), [searchQuery, ciclos]);
  const [copiado, setCopiado] = useState(false);

  if (!lista) return null;

  const encontrados = resumo.filter((r) => r.encontradas > 0).length;
  // Não encontrados primeiro: é o que salta à vista.
  const ordenado = [...resumo].sort((a, b) => (a.encontradas > 0 ? 1 : 0) - (b.encontradas > 0 ? 1 : 0));
  const naoEncontrados = resumo.filter((r) => r.encontradas === 0);

  const remover = (ns) => onSearchChange(lista.filter((n) => n !== ns).join(", "));

  const copiarNaoEncontrados = async () => {
    await navigator.clipboard.writeText(naoEncontrados.map((r) => r.ns).join("\n"));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="glass border border-slate-700 rounded-lg px-3 py-2 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-400">
          <span className={encontrados === resumo.length ? "font-bold text-emerald-400" : "font-bold text-amber-400"}>
            {encontrados}
          </span>{" "}
          de {resumo.length} NS encontrados
        </span>
        {naoEncontrados.length > 0 && (
          <button
            type="button"
            onClick={copiarNaoEncontrados}
            className="ml-auto flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-amber-400 transition-colors"
          >
            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiado ? "Copiados" : "Copiar não encontrados"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {ordenado.map(({ ns, encontradas }) => {
          const achado = encontradas > 0;
          return (
            <span
              key={ns}
              className={`group flex items-center gap-1 rounded-md border pl-2 pr-1 py-0.5 text-[11px] font-mono ${
                achado
                  ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-500/5 border-rose-500/30 text-rose-300/80"
              }`}
            >
              <span className="font-bold">{ns}</span>
              {achado ? (
                <span className="opacity-80">{encontradas > 1 ? `· ${encontradas}` : "✓"}</span>
              ) : (
                <span className="flex items-center gap-1 opacity-80">
                  <AlertTriangle className="w-3 h-3" /> não encontrado
                </span>
              )}
              <button
                type="button"
                onClick={() => remover(ns)}
                title={`Tirar ${ns} da pesquisa`}
                aria-label={`Tirar ${ns} da pesquisa`}
                className="rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-slate-700/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}