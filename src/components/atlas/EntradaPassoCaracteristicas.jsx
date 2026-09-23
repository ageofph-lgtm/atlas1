import React from "react";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { SPEC_OPTIONS } from "@/components/atlas/constants";
import OptionButton from "@/components/atlas/OptionButton";

/**
 * Passo 2 — as características. Numa máquina já conhecida vêm preenchidas.
 */
export default function EntradaPassoCaracteristicas({ NOTA_LABELS, handleAcessorioToggle, handleSpecSelect, notas, setNotas, setSpecs, setStep, specs, toggleNotaLabel }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-1">Características</h2>
        <p className="text-sm text-slate-400">Selecione as specs da máquina</p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Mastro</h3>
        <div className="grid grid-cols-3 gap-2">
          {SPEC_OPTIONS.mastro.map((o) => (
            <OptionButton key={o.value} option={o} isSelected={specs.mastro === o.value} onClick={(v) => handleSpecSelect("mastro", v)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">H3 — Altura máxima (mm) <span className="text-slate-600 font-normal">(opcional)</span></h3>
        <input
          type="text"
          inputMode="numeric"
          value={specs.h3}
          onChange={(e) => setSpecs((prev) => ({ ...prev, h3: e.target.value }))}
          placeholder="ex. 4455"
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
        />
      </div>

      {/* Opcional: nem sempre se consegue ler, e quem regista no pátio não pode
          ficar bloqueado por causa disso. Entra depois pela edição da máquina. */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Horímetro (horas) <span className="text-slate-600 font-normal">(opcional)</span></h3>
        <input
          type="text"
          inputMode="numeric"
          value={specs.horimetro || ""}
          onChange={(e) => setSpecs((prev) => ({ ...prev, horimetro: e.target.value }))}
          placeholder="ex. 3420"
          className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Vias do Mastro</h3>
        <div className="grid grid-cols-3 gap-2">
          {SPEC_OPTIONS.vias_mastro.map((o) => (
            <OptionButton key={o.value} option={o} isSelected={specs.vias_mastro === o.value} onClick={(v) => handleSpecSelect("vias_mastro", v)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Joystick</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SPEC_OPTIONS.joystick.map((o) => (
            <OptionButton key={o.value} option={o} isSelected={specs.joystick === o.value} onClick={(v) => handleSpecSelect("joystick", v)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Tipo de Pneu</h3>
        <div className="grid grid-cols-2 gap-2">
          {SPEC_OPTIONS.tipo_pneu.map((o) => (
            <OptionButton key={o.value} option={o} isSelected={specs.tipo_pneu === o.value} onClick={(v) => handleSpecSelect("tipo_pneu", v)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Bateria <span className="text-slate-600 font-normal">(opcional)</span></h3>
        <div className="grid grid-cols-2 gap-2">
          {SPEC_OPTIONS.bateria.map((o) => (
            <OptionButton key={o.value} option={o} isSelected={specs.bateria === o.value} onClick={(v) => handleSpecSelect("bateria", v)} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Acessórios (múltiplos)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SPEC_OPTIONS.acessorios.map((o) => {
            const isSelected = (specs.acessorios || []).includes(o.value);
            return (
              <OptionButton key={o.value} option={o} isSelected={isSelected} onClick={() => handleAcessorioToggle(o.value)} />
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-2">Notas / Observações <span className="text-slate-600 font-normal">(opcional)</span></h3>
        <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wide text-slate-600">Rótulos:</span>
          {NOTA_LABELS.map((label) => {
            const active = (notas || "").toLowerCase().includes(label.toLowerCase());
            return (
              <button
                key={label}
                type="button"
                onClick={() => toggleNotaLabel(label)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                  active ? "bg-amber-500 text-slate-900 border-amber-500" : "bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Notas visíveis no card da máquina..."
          rows={3}
          className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm resize-y"
        />
      </div>

      <div className="flex gap-3">
        <button onClick={() => setStep(1)} className="px-4 py-3 border border-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-800 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        <button onClick={() => setStep(3)} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors">
          Continuar <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
