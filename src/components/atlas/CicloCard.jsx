import React from "react";
import { AlertTriangle, Pencil, CalendarClock, Trash2, Truck } from "lucide-react";
import { format } from "date-fns";
import { ESTADO_CONFIG, CATEGORIA_CONFIG, CONE_COLORS, SPEC_LABELS } from "./constants";

export default function CicloCard({ ciclo, maquina, onClick, canEditMaquina, canReservar, canDeleteMaquina, canSaidaRapida, onEdit, onReservar, onDelete, onSaidaRapida }) {
  const estadoCfg = ESTADO_CONFIG[ciclo.estado] || ESTADO_CONFIG.entrada;
  const catCfg = CATEGORIA_CONFIG[ciclo.categoria] || CATEGORIA_CONFIG.indefinida;
  const coneColor = CONE_COLORS.find((c) => c.value === ciclo.cone_cor);

  // Compact specs row
  const specs = [];
  if (maquina?.mastro) specs.push(SPEC_LABELS.mastro?.[maquina.mastro] || maquina.mastro);
  if (maquina?.vias_mastro) specs.push(SPEC_LABELS.vias_mastro?.[maquina.vias_mastro] || maquina.vias_mastro + "V");
  if (maquina?.joystick) specs.push(SPEC_LABELS.joystick?.[maquina.joystick] || maquina.joystick);
  if (maquina?.tipo_pneu) specs.push(SPEC_LABELS.tipo_pneu?.[maquina.tipo_pneu] || maquina.tipo_pneu);
  if (maquina?.h3) specs.push("H3 " + maquina.h3);
  if (maquina?.bateria) specs.push(SPEC_LABELS.bateria?.[maquina.bateria] || maquina.bateria);
  if (maquina?.acessorios?.length) {
    maquina.acessorios.forEach((a) => specs.push(SPEC_LABELS.acessorios?.[a] || a));
  }

  // Dias alugada corrente
  const diasCorrente =
    ciclo.estado === "em_aluguer" && ciclo.data_saida
      ? Math.ceil((new Date() - new Date(ciclo.data_saida)) / (1000 * 60 * 60 * 24))
      : null;

  const showEditBtn = canEditMaquina && onEdit;
  const showReservarBtn = canReservar && onReservar && ciclo.estado === "pronta";
  const showGerirBtn = canReservar && onReservar && ciclo.reserva_cliente;
  const showDeleteBtn = canDeleteMaquina && onDelete;
  const showSaidaRapidaBtn = canSaidaRapida && onSaidaRapida && ciclo.estado === "pronta";

  return (
    <div
      onClick={onClick}
      className={`relative bg-slate-800/60 border ${estadoCfg.border} rounded-lg p-4 hover:bg-slate-800 transition-colors ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {ciclo.prioridade && (
        <div className="absolute -top-px -right-px bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          PRI
        </div>
      )}

      {/* NS — visual hero */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-2xl font-black tracking-wider text-slate-100 leading-none break-all">
          {ciclo.serie}
        </h3>
        {maquina?.foto_url && (
          <div className="w-10 h-10 rounded border border-slate-600 overflow-hidden flex-shrink-0">
            <img src={maquina.foto_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <p className="text-sm text-slate-400 mb-2">
        {maquina?.modelo || "—"} {maquina?.ano && `· ${maquina.ano}`}
      </p>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${catCfg.bg} ${catCfg.text} ${catCfg.border} border`}>
          {catCfg.label}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${estadoCfg.bg} ${estadoCfg.text} flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
          {estadoCfg.label}
        </span>
        {coneColor && ciclo.cone_numero && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-300">
            <span className={`w-2.5 h-2.5 rounded-full ${coneColor.bg}`} />
            {ciclo.cone_numero}
          </span>
        )}
        {ciclo.categoria === "indefinida" && !ciclo.cone_cor && (
          <span className="px-2 py-0.5 rounded text-xs bg-slate-700/30 text-slate-500 border border-slate-600/30">
            SEM CONE
          </span>
        )}
      </div>

      {/* Specs row */}
      {specs.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {specs.map((s, i) => (
            <span key={i} className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Reserva badge */}
      {ciclo.reserva_cliente && (
        <div className="mb-2 bg-cyan-500/10 border border-cyan-500/30 rounded px-2 py-1 text-xs text-cyan-400 flex items-center gap-1.5">
          <CalendarClock className="w-3 h-3 flex-shrink-0" />
          <span className="font-medium">RESERVADA</span>
          <span className="text-cyan-400/70">· {ciclo.reserva_cliente}</span>
          {ciclo.reserva_data && (
            <span className="text-cyan-400/70">· {format(new Date(ciclo.reserva_data), "dd/MM")}</span>
          )}
        </div>
      )}

      {/* Dias alugada corrente */}
      {diasCorrente !== null && (
        <div className="mb-2 text-xs text-cyan-400/80">
          {diasCorrente} {diasCorrente === 1 ? "dia alugada" : "dias alugadas"}
        </div>
      )}

      {/* Watcher link */}
      {ciclo.watcher_os_id && (
        <div className="text-[10px] text-purple-400/70 flex items-center gap-1 mb-2">
          <span className="w-1 h-1 rounded-full bg-purple-500" />
          Watcher: {ciclo.watcher_os_id.slice(-6)}
        </div>
      )}

      {/* Action buttons */}
      {(showEditBtn || showReservarBtn || showGerirBtn || showDeleteBtn || showSaidaRapidaBtn) && (
        <div className="flex gap-2 mt-2 pt-2 border-t border-slate-700/50">
          {showEditBtn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(ciclo, maquina);
              }}
              className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-medium flex items-center justify-center gap-1"
            >
              <Pencil className="w-3 h-3" /> EDITAR
            </button>
          )}
          {showReservarBtn && !ciclo.reserva_cliente && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReservar(ciclo);
              }}
              className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-medium"
            >
              RESERVAR
            </button>
          )}
          {showGerirBtn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReservar(ciclo);
              }}
              className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-cyan-400 rounded text-xs font-medium"
            >
              GERIR RESERVA
            </button>
          )}
          {showSaidaRapidaBtn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaidaRapida(ciclo);
              }}
              className="px-2 py-1.5 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-xs font-medium flex items-center justify-center"
              title="Saída rápida"
            >
              <Truck className="w-3 h-3" />
            </button>
          )}
          {showDeleteBtn && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(maquina);
              }}
              className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs font-medium flex items-center justify-center"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}