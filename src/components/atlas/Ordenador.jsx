import React from "react";
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from "lucide-react";
import { CAMPOS_ORDENACAO } from "@/components/atlas/ordenarCiclos";

/**
 * Por onde organizar a lista.
 *
 * Até aqui só se podia ordenar no modo Detalhe, carregando num cabeçalho da
 * tabela — o que deixava de fora quem usa cards, e deixava de fora tudo o que
 * não é coluna: a data de registo, a última alteração e o ano da máquina.
 *
 * O "Padrão" não é um campo: é a ausência de escolha, que devolve a ordem que a
 * página já tinha (prioridade primeiro, depois as mais antigas). Tem de ser uma
 * opção visível, senão quem experimenta uma ordenação não consegue voltar atrás.
 */
export default function Ordenador({ ordenacao, onOrdenacao }) {
  const campo = CAMPOS_ORDENACAO.find((c) => c.chave === ordenacao?.coluna);
  const desc = ordenacao?.direcao === "desc";

  const escolher = (chave) => {
    if (!chave) return onOrdenacao(null);
    // Ao trocar de campo mantém-se a direção: quem estava a ver do mais recente
    // para o mais antigo quer o mesmo sentido na data seguinte.
    onOrdenacao({ coluna: chave, direcao: ordenacao?.direcao || "asc" });
  };

  const Seta = !campo ? ArrowUpDown : desc ? ArrowDownAZ : ArrowUpAZ;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wide text-slate-600 hidden sm:inline">ORDENAR</span>
      <select
        value={campo?.chave || ""}
        onChange={(e) => escolher(e.target.value)}
        aria-label="Ordenar por"
        className="bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs px-2 py-1.5 focus:border-amber-500 focus:outline-none cursor-pointer"
      >
        <option value="">Padrão (prioridade, depois antigas)</option>
        {CAMPOS_ORDENACAO.map((c) => (
          <option key={c.chave} value={c.chave}>{c.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => campo && onOrdenacao({ coluna: campo.chave, direcao: desc ? "asc" : "desc" })}
        disabled={!campo}
        title={
          !campo
            ? "Escolha primeiro por onde ordenar"
            : desc
              ? rotuloDirecao(campo, "desc")
              : rotuloDirecao(campo, "asc")
        }
        aria-label="Inverter a ordem"
        className={`p-1.5 rounded-lg border transition-colors ${
          campo
            ? "border-slate-700 text-amber-400 hover:border-amber-500 glass"
            // Apagado mas não invisível: um botão que desaparece parece um erro
            // de desenho, um botão apagado explica-se sozinho.
            : "border-slate-700 text-slate-600 glass cursor-not-allowed"
        }`}
      >
        <Seta className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * "Crescente" não diz nada sobre datas — para uma data o que se quer saber é se
 * vê primeiro a mais antiga ou a mais recente.
 */
function rotuloDirecao(campo, direcao) {
  if (campo.tipo === "data") return direcao === "asc" ? "Das mais antigas para as mais recentes" : "Das mais recentes para as mais antigas";
  if (campo.tipo === "numero") return direcao === "asc" ? "Do menor para o maior" : "Do maior para o menor";
  return direcao === "asc" ? "De A a Z" : "De Z a A";
}
