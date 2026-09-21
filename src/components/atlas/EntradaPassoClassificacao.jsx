import React from "react";
import { Check, ArrowLeft, RotateCcw } from "lucide-react";
import { CATEGORIA_CONFIG, CONE_COLORS } from "@/components/atlas/constants";

/**
 * Passo 3 — categoria, cone e estado inicial. É o passo que grava.
 */
export default function EntradaPassoClassificacao({ canChooseEstado, canSubmit, categoria, coneCor, coneError, coneNumero, estadoInicial, handleSubmit, isSubmitting, modelo, needsCone, reentradaConfirmada, semEstado, serie, setCategoria, setConeError, setConeNumero, setEstadoInicial, setStep, validateCone }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Classificação</h2>
        <p className="text-sm text-slate-400">Categoria e cone de identificação</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Categoria</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CATEGORIA_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategoria(key)}
              className={`py-4 rounded-lg border-2 font-bold text-lg transition-all ${
                categoria === key
                  ? `${cfg.bg} ${cfg.text} ${cfg.border}`
                  : "border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600"
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {needsCone ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400">CONE:</span>
            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 text-slate-200 text-sm font-bold uppercase">
              <span className={`w-3 h-3 rounded-full ${CONE_COLORS.find((c) => c.value === coneCor)?.bg}`} />
              {coneCor}
            </span>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Nº do cone (digite o número físico)</label>
            <input
              type="text"
              inputMode="numeric"
              value={coneNumero}
              onChange={(e) => { setConeNumero(e.target.value); setConeError(""); }}
              onBlur={validateCone}
              placeholder="Nº do cone"
              className={`w-full px-3 py-2.5 bg-slate-800 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none text-sm ${coneError ? "border-red-500" : "border-slate-700 focus:border-amber-500"}`}
            />
            {coneError && <p className="text-xs text-red-400 mt-1">{coneError}</p>}
          </div>
        </div>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Sem cone para esta categoria.
        </div>
      )}

      {semEstado && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          Categoria sem estado de preparação — fica como <span className="font-bold text-slate-300">INDEFINIDO</span> (não entra em POR FAZER nem PRONTAS).
        </div>
      )}

      {canChooseEstado && !semEstado && (
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-2">Estado inicial</h3>
          <div className="space-y-2">
            {[
              { value: "classificada", label: "A FAZER", hint: "aguarda autorização da gestora" },
              { value: "pronta", label: "PRONTA", hint: "disponível de imediato" },
              { value: "manutencao", label: "EM MANUTENÇÃO", hint: "em manutenção, sem O.S. no Watcher" },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setEstadoInicial(o.value)}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  estadoInicial === o.value
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                }`}
              >
                <span className={`text-sm font-bold ${estadoInicial === o.value ? "text-amber-400" : "text-slate-300"}`}>
                  {o.label}
                </span>
                <p className="text-xs text-slate-500 mt-0.5">{o.hint}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-1 text-sm">
        <p className="text-slate-400">NS: <span className="text-slate-100 font-bold">{serie}</span></p>
        <p className="text-slate-400">Modelo: <span className="text-slate-300">{modelo || "—"}</span></p>
        <p className="text-slate-400">Categoria: <span className="text-amber-400 font-bold">{CATEGORIA_CONFIG[categoria]?.label || "—"}</span></p>
        {reentradaConfirmada && (
          <p className="text-cyan-400 flex items-center gap-1.5 pt-1">
            <RotateCcw className="w-3.5 h-3.5" />
            Reentrada — o aluguer anterior será fechado
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={() => setStep(2)} className="px-4 py-3 border border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <><div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" /> A registar...</>
          ) : (
            <><Check className="w-5 h-5" /> Registar</>
          )}
        </button>
      </div>
    </div>
  );
}
