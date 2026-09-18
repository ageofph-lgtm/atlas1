import React, { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ESTADO_CONFIG, CATEGORIA_CONFIG, CONE_COLORS } from "@/components/atlas/constants";
import { estadoEfetivo } from "@/components/atlas/cicloUtils";
import { GRELHA, CONE_TAMANHO, NS_CLASSE, CONE_NUM_CLASSE } from "@/components/atlas/viewPrefs";
import ConeIcon from "@/components/atlas/ConeIcon";

const temCone = (ciclo) => CONE_COLORS.some((c) => c.value === ciclo.cone_cor) && ciclo.cone_numero;

const Estado = ({ ciclo, mini = false }) => {
  const cfg = ESTADO_CONFIG[estadoEfetivo(ciclo)] || ESTADO_CONFIG.entrada;
  return (
    <span className={`px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1 ${cfg.bg} ${cfg.text} ${mini ? "text-[9px]" : "text-[10px]"}`}>
      <span className={`w-1.5 h-1.5 rounded-full state-dot ${cfg.dot}`} />
      {mini ? cfg.short : cfg.label}
    </span>
  );
};

const Prioridade = () => (
  <span title="Prioritária" className="bg-red-500 text-white text-[8px] font-bold px-1 py-0.5 rounded inline-flex items-center gap-0.5">
    <AlertTriangle className="w-2.5 h-2.5" />
  </span>
);

/**
 * Lista de máquinas no modo escolhido pela pessoa.
 *
 * Os modos compactos são só apresentação: quem clica numa máquina recebe o
 * CicloCard completo, o mesmo dos cards. É de propósito — editar, reservar,
 * autorizar e pedir vivem num sítio só, em vez de existirem quatro cópias que
 * divergiriam à primeira alteração de permissões.
 *
 * `renderCard` vem da página, já com todas as ligações e permissões montadas.
 */
export default function CiclosView({ ciclos, getMaquina, modo, tamanho, renderCard, vazio }) {
  const [aberto, setAberto] = useState(null);

  if (!ciclos.length) return vazio || null;

  const abrir = (ciclo) => setAberto(ciclo);
  const cicloAberto = aberto && ciclos.find((c) => c.id === aberto.id);

  const modal = (
    <Dialog open={!!aberto} onOpenChange={(o) => !o && setAberto(null)}>
      <DialogContent className="glass border-slate-700 text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto p-3">
        {/* O card já mostra o NS em destaque; o título existe para quem ouve o ecrã. */}
        <DialogTitle className="sr-only">Máquina {cicloAberto?.serie || ""}</DialogTitle>
        {cicloAberto && renderCard(cicloAberto, { destaque: true, rolarParaVista: false })}
      </DialogContent>
    </Dialog>
  );

  if (modo === "cards") {
    return <div className={GRELHA.cards[tamanho]}>{ciclos.map((c) => renderCard(c))}</div>;
  }

  if (modo === "grade") {
    const coneSize = CONE_TAMANHO.grade[tamanho];
    return (
      <>
        <div className={GRELHA.grade[tamanho]}>
          {ciclos.map((c) => (
            <button
              key={c.id}
              onClick={() => abrir(c)}
              className={`glass cat-${c.categoria} border border-slate-700 rounded-lg p-2 flex flex-col items-center gap-1 hover:border-amber-500 transition-colors`}
            >
              {temCone(c) ? (
                <div className="flex flex-col items-center leading-none">
                  <ConeIcon color={c.cone_cor} size={coneSize} />
                  <span className={`num font-black text-slate-200 ${CONE_NUM_CLASSE[tamanho]}`}>{c.cone_numero}</span>
                </div>
              ) : (
                <div style={{ height: coneSize }} className="flex items-center text-[9px] text-slate-600 uppercase">sem cone</div>
              )}
              <span className={`num font-bold text-slate-100 break-all leading-tight text-center ${NS_CLASSE.grade[tamanho]}`}>
                {c.serie}
              </span>
              <span className="flex items-center gap-1">
                {c.prioridade && <Prioridade />}
                <Estado ciclo={c} mini />
              </span>
            </button>
          ))}
        </div>
        {modal}
      </>
    );
  }

  if (modo === "mosaico") {
    const coneSize = CONE_TAMANHO.mosaico[tamanho];
    return (
      <>
        <div className={GRELHA.mosaico[tamanho]}>
          {ciclos.map((c) => {
            const m = getMaquina(c);
            const catCfg = CATEGORIA_CONFIG[c.categoria] || CATEGORIA_CONFIG.indefinida;
            return (
              <button
                key={c.id}
                onClick={() => abrir(c)}
                className={`glass cat-${c.categoria} border border-slate-700 rounded-lg p-2.5 flex items-center gap-2.5 text-left hover:border-amber-500 transition-colors`}
              >
                <div className="flex-shrink-0 flex flex-col items-center">
                  {temCone(c) ? (
                    <>
                      <ConeIcon color={c.cone_cor} size={coneSize} />
                      <span className="num text-[10px] font-black text-slate-300 leading-none">{c.cone_numero}</span>
                    </>
                  ) : (
                    <span className="text-[9px] text-slate-600 uppercase">s/cone</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className={`num font-bold text-slate-100 break-all leading-tight ${NS_CLASSE.mosaico[tamanho]}`}>{c.serie}</span>
                    {c.prioridade && <Prioridade />}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{m?.modelo || "—"}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${catCfg.bg} ${catCfg.text}`}>{catCfg.label}</span>
                    <Estado ciclo={c} mini />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        {modal}
      </>
    );
  }

  if (modo === "lista") {
    return (
      <>
        <div className="space-y-1">
          {ciclos.map((c) => {
            const m = getMaquina(c);
            return (
              <button
                key={c.id}
                onClick={() => abrir(c)}
                className={`w-full glass cat-${c.categoria} border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2.5 text-left hover:border-amber-500 transition-colors`}
              >
                {temCone(c) ? (
                  <span className="flex items-center gap-1 flex-shrink-0 w-14">
                    <ConeIcon color={c.cone_cor} size={18} />
                    <span className="num text-sm font-black text-slate-200">{c.cone_numero}</span>
                  </span>
                ) : (
                  <span className="w-14 flex-shrink-0 text-[9px] text-slate-600 uppercase">s/cone</span>
                )}
                <span className="num text-sm font-bold text-slate-100 break-all">{c.serie}</span>
                {c.prioridade && <Prioridade />}
                <span className="text-xs text-slate-500 truncate hidden sm:inline">{m?.modelo || "—"}</span>
                {c.reserva_cliente && <span className="text-xs text-cyan-400 truncate hidden md:inline">· {c.reserva_cliente}</span>}
                <span className="ml-auto flex-shrink-0"><Estado ciclo={c} /></span>
              </button>
            );
          })}
        </div>
        {modal}
      </>
    );
  }

  // detalhe
  return (
    <>
      <div className="glass border border-slate-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-[10px] uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2 font-medium">Cone</th>
              <th className="px-3 py-2 font-medium">Série</th>
              <th className="px-3 py-2 font-medium">Modelo</th>
              <th className="px-3 py-2 font-medium">Categoria</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Cliente</th>
              <th className="px-3 py-2 font-medium">Entrada</th>
            </tr>
          </thead>
          <tbody>
            {ciclos.map((c) => {
              const m = getMaquina(c);
              const catCfg = CATEGORIA_CONFIG[c.categoria] || CATEGORIA_CONFIG.indefinida;
              return (
                <tr
                  key={c.id}
                  onClick={() => abrir(c)}
                  className="border-b border-slate-800 last:border-0 cursor-pointer hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    {temCone(c) ? (
                      <span className="flex items-center gap-1">
                        <ConeIcon color={c.cone_cor} size={16} />
                        <span className="num font-bold text-slate-300">{c.cone_numero}</span>
                      </span>
                    ) : (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 num font-bold text-slate-100 whitespace-nowrap">
                    {c.serie}
                    {c.prioridade && <span className="ml-1.5 align-middle"><Prioridade /></span>}
                  </td>
                  <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{m?.modelo || "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${catCfg.bg} ${catCfg.text}`}>{catCfg.label}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap"><Estado ciclo={c} /></td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {c.reserva_cliente
                      ? <span className="text-cyan-400">{c.reserva_cliente}</span>
                      : <span className="text-slate-600">—</span>}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-xs whitespace-nowrap">
                    {c.data_entrada ? format(new Date(c.data_entrada), "dd/MM/yy") : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {modal}
    </>
  );
}
