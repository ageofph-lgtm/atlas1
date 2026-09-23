import { temCone } from "@/components/atlas/cicloUtils";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, ChevronDown, ChevronUp } from "lucide-react";
import { ESTADO_CONFIG, CATEGORIA_CONFIG } from "./constants";
import { estadoEfetivo, isCategoriaSemEstado } from "./cicloUtils";
import ConeIcon from "./ConeIcon";
import CicloCardDetails from "./CicloCardDetails";

/**
 * Versão compacta do CicloCard — mesma linguagem visual do inventário
 * (NS em destaque, cone, badges de categoria/estado) mas numa linha só,
 * e abre com todos os detalhes ao clicar.
 */
export default function CicloMiniCard({ ciclo, maquina, canNotas, onAtualizado, onMarcarPronta, currentUser, canPedidos, canResponderPedidos, canApagarPedidos, canLimparRegistos }) {
  const [expanded, setExpanded] = useState(false);

  const estado = estadoEfetivo(ciclo);
  const estadoCfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.entrada;
  const catCfg = CATEGORIA_CONFIG[ciclo.categoria] || CATEGORIA_CONFIG.indefinida;
  const hasCone = temCone(ciclo);

  return (
    <div
      onClick={() => setExpanded((v) => !v)}
      className={`relative glass cat-${ciclo.categoria} border ${estadoCfg.border} rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-200 hover:border-slate-600 hover:shadow-lg hover:shadow-black/30`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        {/* Cone */}
        {hasCone ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <ConeIcon color={ciclo.cone_cor} size={24} />
            <span className="num text-xl font-black tracking-wider text-slate-100 leading-none">
              {ciclo.cone_numero}
            </span>
          </div>
        ) : (
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-700/30 text-slate-500 border border-slate-600/30 uppercase tracking-wide flex-shrink-0">
            Sem cone
          </span>
        )}

        {/* NS + modelo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="num text-lg font-bold tracking-wider text-slate-100 break-all leading-none">{ciclo.serie}</h4>
            {ciclo.prioridade && (
              <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 flex-shrink-0">
                <AlertTriangle className="w-2.5 h-2.5" />
                PRI
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {maquina?.modelo || "—"}
            {ciclo.watcher_os_id && <span className="text-purple-400/70"> · Watcher {ciclo.watcher_os_id.slice(-6)}</span>}
          </p>
        </div>

        {/* Badges + ações */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${catCfg.bg} ${catCfg.text} ${catCfg.border} border`}>
            {catCfg.label}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${estadoCfg.bg} ${estadoCfg.text} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full state-dot ${estadoCfg.dot}`} />
            {estadoCfg.label}
          </span>
          {onMarcarPronta && !isCategoriaSemEstado(ciclo.categoria) && estado !== "pronta" && (
            <button
              onClick={(e) => { e.stopPropagation(); onMarcarPronta(ciclo); }}
              className="px-2 py-1 bg-green-600/20 hover:bg-green-600/40 text-green-400 rounded text-xs font-bold flex items-center gap-1"
              title="Marcar como pronta"
            >
              <Check className="w-3 h-3" /> PRONTA
            </button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <CicloCardDetails
              ciclo={ciclo}
              maquina={maquina}
              canNotas={canNotas}
              onAtualizado={onAtualizado}
              currentUser={currentUser}
              canPedidos={canPedidos}
              canResponderPedidos={canResponderPedidos}
              canApagarPedidos={canApagarPedidos}
              canLimparRegistos={canLimparRegistos}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
