import React from "react";
import { AlertTriangle } from "lucide-react";
import { ESTADO_CONFIG, CATEGORIA_CONFIG, CONE_COLORS, SPEC_LABELS } from "./constants";

export default function CicloCard({ ciclo, maquina, onClick }) {
  const estadoCfg = ESTADO_CONFIG[ciclo.estado] || ESTADO_CONFIG.entrada;
  const catCfg = CATEGORIA_CONFIG[ciclo.categoria] || CATEGORIA_CONFIG.nts;
  const coneColor = CONE_COLORS.find(c => c.value === ciclo.cone_cor);

  // Build compact specs row
  const specs = [];
  if (maquina?.mastro) specs.push(SPEC_LABELS.mastro?.[maquina.mastro] || maquina.mastro);
  if (maquina?.vias_mastro) specs.push(SPEC_LABELS.vias_mastro?.[maquina.vias_mastro] || maquina.vias_mastro + 'V');
  if (maquina?.joystick) specs.push(SPEC_LABELS.joystick?.[maquina.joystick] || maquina.joystick);
  if (maquina?.tipo_pneu) specs.push(SPEC_LABELS.tipo_pneu?.[maquina.tipo_pneu] || maquina.tipo_pneu);
  if (maquina?.acessorios?.length) {
    maquina.acessorios.forEach(a => specs.push(SPEC_LABELS.acessorios?.[a] || a));
  }

  return (
    <div
      onClick={onClick}
      className={`relative bg-slate-800/60 border ${estadoCfg.border} rounded-lg p-4 hover:bg-slate-800 transition-colors cursor-pointer ${onClick ? '' : 'cursor-default'}`}
    >
      {/* Prioridade flag */}
      {ciclo.prioridade && (
        <div className="absolute -top-px -right-px bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-lg flex items-center gap-1">
          <AlertTriangle className="w-2.5 h-2.5" />
          PRI
        </div>
      )}

      {/* NS — the BIG visual hero */}
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

      {/* Modelo + ano */}
      <p className="text-sm text-slate-400 mb-3">
        {maquina?.modelo || '—'} {maquina?.ano && `· ${maquina.ano}`}
      </p>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        {/* Categoria badge */}
        <span className={`px-2 py-0.5 rounded text-xs font-bold ${catCfg.bg} ${catCfg.text} ${catCfg.border} border`}>
          {catCfg.label}
        </span>

        {/* Estado badge */}
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${estadoCfg.bg} ${estadoCfg.text} flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${estadoCfg.dot}`} />
          {estadoCfg.label}
        </span>

        {/* Cone badge */}
        {coneColor && ciclo.cone_numero && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-300">
            <span className={`w-2.5 h-2.5 rounded-full ${coneColor.bg}`} />
            {ciclo.cone_numero}
          </span>
        )}
      </div>

      {/* Compact specs row */}
      {specs.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {specs.map((s, i) => (
            <span key={i} className="text-[10px] text-slate-500 bg-slate-900/50 px-1.5 py-0.5 rounded">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Watcher link indicator */}
      {ciclo.watcher_os_id && (
        <div className="mt-2 text-[10px] text-purple-400/70 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-purple-500" />
          Watcher: {ciclo.watcher_os_id.slice(-6)}
        </div>
      )}
    </div>
  );
}