import React from "react";
import { Search, ArrowRight, Info, AlertTriangle, RotateCcw, Package } from "lucide-react";
import { format } from "date-fns";
import PhotoCapture from "@/components/atlas/PhotoCapture";
import { diasAlugada } from "@/components/atlas/registarRetorno";

/**
 * Passo 1 — quem é a máquina. Aqui decide-se se é um registo novo ou uma
 * reentrada, e é onde as travas aparecem a quem está a escrever.
 */
export default function EntradaPassoRegisto({ ano, canProceedStep1, cicloFora, cicloNoPatio, existingMaquina, handlePhotoSuccess, modelo, notas, passagens, reentradaConfirmada, searching, serie, setAno, setModelo, setReentradaConfirmada, setSerie, setStep, ultimaSaida }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Registo</h2>
        <p className="text-sm text-slate-400">Fotografe a placa ou digite a série</p>
      </div>

      <PhotoCapture onSuccess={handlePhotoSuccess} />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500">OU</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      <div>
        <label className="text-xs font-medium text-slate-400 mb-1.5 block">Número de Série (NS)</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            placeholder="Digite a série..."
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-lg font-bold tracking-wider"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {serie.length >= 3 && !searching && existingMaquina && cicloNoPatio && (
        <div className="bg-red-500/15 border-2 border-red-500/50 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-lg font-bold text-red-300">Máquina já existe e não deu saída</p>
              <p className="text-sm text-red-400/80 mt-1">
                NS <span className="font-bold">{serie}</span> ainda se encontra no pátio
                {cicloNoPatio.estado ? ` (${cicloNoPatio.estado.replace(/_/g, " ")})` : ""}.
                Não é possível registar novamente enquanto não tiver saída.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Máquina fora em aluguer: é reentrada, não um registo novo */}
      {serie.length >= 3 && !searching && existingMaquina && cicloFora && !cicloNoPatio && (
        reentradaConfirmada ? (
          <div className="bg-green-500/10 border-2 border-green-500/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-green-300">Reentrada confirmada</p>
                <p className="text-sm text-green-400/80 mt-0.5">
                  O aluguer anterior será fechado ({diasAlugada(cicloFora)} dias) e a máquina volta ao pátio
                  com as características que já tinha. Categoria, cone e notas podem ser alterados a seguir.
                </p>
                <button
                  type="button"
                  onClick={() => setReentradaConfirmada(false)}
                  className="text-xs text-green-400/70 hover:text-green-300 underline underline-offset-2 mt-2"
                >
                  Cancelar reentrada
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <RotateCcw className="w-8 h-8 text-cyan-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-lg font-bold text-cyan-300">Esta máquina está a retornar?</p>
                <p className="text-sm text-cyan-400/80 mt-1">
                  NS <span className="font-bold">{serie}</span> saiu para aluguer
                  {cicloFora.data_saida && ` a ${format(new Date(cicloFora.data_saida), "dd/MM/yyyy")}`}
                  {cicloFora.reserva_cliente && ` · ${cicloFora.reserva_cliente}`}
                  {" "}e continua fora há {diasAlugada(cicloFora)} dias.
                </p>
                <p className="text-xs text-cyan-400/60 mt-1.5">
                  Ao confirmar, esse aluguer é fechado como retorno e a máquina reentra no pátio —
                  em vez de ficar registada em duplicado.
                </p>
                <button
                  type="button"
                  onClick={() => setReentradaConfirmada(true)}
                  className="mt-3 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  CONFIRMAR REENTRADA
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {serie.length >= 3 && !searching && existingMaquina && !cicloNoPatio && !cicloFora && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium">
              Máquina já registada — {passagens} {passagens === 1 ? "passagem" : "passagens"}
            </p>
            {ultimaSaida && (
              <p className="text-xs text-blue-400/70 mt-0.5">
                Última saída: {format(new Date(ultimaSaida), "dd/MM/yyyy")}
              </p>
            )}
          </div>
        </div>
      )}
      {serie.length >= 3 && !searching && !existingMaquina && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
          <Package className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300 font-medium">Nova máquina</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Modelo</label>
          <input
            type="text"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Modelo"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-400 mb-1.5 block">Ano</label>
          <input
            type="text"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            placeholder="Ano"
            className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      <button
        onClick={() => canProceedStep1 && setStep(2)}
        disabled={!canProceedStep1}
        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Continuar <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
