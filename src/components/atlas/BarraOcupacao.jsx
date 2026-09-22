import React from "react";
import { Warehouse, Truck, CheckCircle2, Wrench, HelpCircle, CalendarClock, Stamp } from "lucide-react";
import { ocupacaoPatio, taxaUtilizacao } from "@/components/atlas/ocupacaoPatio";

/**
 * Quantas máquinas estão mesmo cá, agora.
 *
 * O número grande é o do pátio, porque é esse que se compara com o que se vê
 * ao olhar lá para fora. O parque total aparece ao lado, mais pequeno, para
 * ninguém voltar a confundir as duas coisas — era isso que acontecia quando só
 * havia a contagem de ciclos abertos, que inclui as alugadas.
 */
export default function BarraOcupacao({ ciclos }) {
  const o = ocupacaoPatio(ciclos);
  const taxa = taxaUtilizacao(o);

  const Parte = ({ Icone, valor, rotulo, cor }) => (
    <span className="flex items-center gap-1.5" title={rotulo}>
      <Icone className={`w-3.5 h-3.5 ${cor}`} />
      <span className="num text-sm font-bold text-slate-200">{valor}</span>
      <span className="text-[11px] text-slate-500">{rotulo}</span>
    </span>
  );

  return (
    <div className="glass border border-slate-700 rounded-lg px-3 py-2.5 flex items-center gap-x-4 gap-y-2 flex-wrap">
      <span className="flex items-baseline gap-2 flex-shrink-0">
        <Warehouse className="w-5 h-5 text-amber-400 self-center" />
        <span className="num text-2xl font-black text-slate-100 leading-none">{o.noPatio}</span>
        <span className="text-xs text-slate-400">nas instalações</span>
      </span>

      <span className="h-6 w-px bg-slate-700 hidden sm:block" />

      <Parte Icone={CheckCircle2} valor={o.disponiveis} rotulo="podem sair já" cor="text-green-400" />
      {/* As reservadas estão prontas mas prometidas. Sem esta parte, as contas
          na barra não fecham com o total e quem somar de cabeça estranha. */}
      {o.reservadas > 0 && (
        <Parte Icone={CalendarClock} valor={o.reservadas} rotulo="reservadas" cor="text-cyan-300" />
      )}
      {/* Duas coisas diferentes: uma está à espera de uma decisão, a outra já
          está a ser trabalhada na oficina. Juntá-las escondia onde é o gargalo. */}
      {o.aguardamAutorizacao > 0 && (
        <Parte Icone={Stamp} valor={o.aguardamAutorizacao} rotulo="a aguardar autorização" cor="text-amber-400" />
      )}
      <Parte Icone={Wrench} valor={o.emPreparacao} rotulo="em preparação" cor="text-cyan-400" />
      {o.indefinidas > 0 && (
        <Parte Icone={HelpCircle} valor={o.indefinidas} rotulo="por definir" cor="text-slate-400" />
      )}

      <span className="h-6 w-px bg-slate-700 hidden sm:block" />

      <Parte Icone={Truck} valor={o.fora} rotulo="fora, em aluguer" cor="text-purple-400" />

      <span className="ml-auto text-[11px] text-slate-500 flex-shrink-0">
        parque total <span className="num font-bold text-slate-300">{o.total}</span>
        {taxa !== null && <span className="ml-2">· <span className="num font-bold text-slate-300">{taxa}%</span> a render</span>}
      </span>
    </div>
  );
}
