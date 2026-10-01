import React from "react";
import { Warehouse, Truck, CheckCircle2, Wrench, HelpCircle, CalendarClock, Stamp } from "lucide-react";
import { ocupacaoPatio, taxaUtilizacao, GRUPOS_OCUPACAO } from "@/components/atlas/ocupacaoPatio";

/**
 * Um número da barra. Com `onEscolher`, é um botão: carregar mostra as máquinas
 * desse grupo, e carregar outra vez volta a mostrar todas.
 */
function Parte({ chave, Icone, valor, cor, grupo, onEscolher, grande = false }) {
  const rotulo = GRUPOS_OCUPACAO[chave].rotulo;
  const conteudo = grande ? (
    <>
      <Icone className="w-5 h-5 text-amber-400 self-center" />
      <span className="num text-2xl font-black text-slate-100 leading-none">{valor}</span>
      <span className="text-xs text-slate-400">{rotulo}</span>
    </>
  ) : (
    <>
      <Icone className={`w-3.5 h-3.5 ${cor}`} />
      <span className="num text-sm font-bold text-slate-200">{valor}</span>
      <span className="text-[11px] text-slate-500">{rotulo}</span>
    </>
  );
  const disposicao = grande ? "flex items-baseline gap-2 flex-shrink-0" : "flex items-center gap-1.5";

  if (!onEscolher) return <span className={disposicao} title={rotulo}>{conteudo}</span>;

  const ativo = grupo === chave;
  return (
    <button
      type="button"
      onClick={() => onEscolher(ativo ? null : chave)}
      aria-pressed={ativo}
      title={ativo ? "Voltar a mostrar todas" : `Mostrar só as máquinas: ${rotulo}`}
      className={`${disposicao} rounded-md px-1.5 py-1 -mx-1.5 -my-1 transition-colors ${
        ativo ? "bg-amber-500/15 ring-1 ring-amber-500/60" : "hover:bg-slate-700/50"
      }`}
    >
      {conteudo}
    </button>
  );
}

/**
 * Quantas máquinas estão mesmo cá, agora.
 *
 * O número grande é o do pátio, porque é esse que se compara com o que se vê
 * ao olhar lá para fora. O parque total aparece ao lado, mais pequeno, para
 * ninguém voltar a confundir as duas coisas — era isso que acontecia quando só
 * havia a contagem de ciclos abertos, que inclui as alugadas.
 *
 * Cada número leva às máquinas que conta (`grupo` + `onEscolher`). A lista usa
 * a mesma regra que a conta, por isso mostra sempre tantas quantas o número diz.
 */
export default function BarraOcupacao({ ciclos, grupo = null, onEscolher }) {
  const o = ocupacaoPatio(ciclos);
  const taxa = taxaUtilizacao(o);
  const comum = { grupo, onEscolher };

  return (
    <div className="glass border border-slate-700 rounded-lg px-3 py-2.5 flex items-center gap-x-4 gap-y-2 flex-wrap">
      <Parte chave="noPatio" Icone={Warehouse} valor={o.noPatio} grande {...comum} />

      <span className="h-6 w-px bg-slate-700 hidden sm:block" />

      <Parte chave="disponiveis" Icone={CheckCircle2} valor={o.disponiveis} cor="text-green-400" {...comum} />
      {/* As reservadas estão prontas mas prometidas. Sem esta parte, as contas
          na barra não fecham com o total e quem somar de cabeça estranha. */}
      {o.reservadas > 0 && (
        <Parte chave="reservadas" Icone={CalendarClock} valor={o.reservadas} cor="text-cyan-300" {...comum} />
      )}
      {/* Duas coisas diferentes: uma está à espera de uma decisão, a outra já
          está a ser trabalhada na oficina. Juntá-las escondia onde é o gargalo. */}
      {o.aguardamAutorizacao > 0 && (
        <Parte chave="aguardamAutorizacao" Icone={Stamp} valor={o.aguardamAutorizacao} cor="text-amber-400" {...comum} />
      )}
      <Parte chave="emPreparacao" Icone={Wrench} valor={o.emPreparacao} cor="text-cyan-400" {...comum} />
      {o.indefinidas > 0 && (
        <Parte chave="indefinidas" Icone={HelpCircle} valor={o.indefinidas} cor="text-slate-400" {...comum} />
      )}

      <span className="h-6 w-px bg-slate-700 hidden sm:block" />

      <Parte chave="fora" Icone={Truck} valor={o.fora} cor="text-purple-400" {...comum} />

      {onEscolher ? (
        <button
          type="button"
          onClick={() => onEscolher(null)}
          title="Mostrar todas"
          className="ml-auto text-[11px] text-slate-500 flex-shrink-0 rounded-md px-1.5 py-1 -my-1 hover:bg-slate-700/50 transition-colors"
        >
          parque total <span className="num font-bold text-slate-300">{o.total}</span>
          {taxa !== null && <span className="ml-2">· <span className="num font-bold text-slate-300">{taxa}%</span> a render</span>}
        </button>
      ) : (
        <span className="ml-auto text-[11px] text-slate-500 flex-shrink-0">
          parque total <span className="num font-bold text-slate-300">{o.total}</span>
          {taxa !== null && <span className="ml-2">· <span className="num font-bold text-slate-300">{taxa}%</span> a render</span>}
        </span>
      )}
    </div>
  );
}
