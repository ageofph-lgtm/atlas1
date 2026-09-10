import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { SPEC_OPTIONS } from "@/components/atlas/constants";

const OptionButton = ({ option, isSelected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(option.value)}
    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all min-h-[64px] ${
      isSelected
        ? "border-amber-500 bg-amber-500/10 text-amber-400"
        : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600"
    }`}
  >
    <span className="text-xl mb-1">{option.icon}</span>
    <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
  </button>
);

export default function EditMaquinaModal({ maquina, open, onClose, onSave }) {
  const [specs, setSpecs] = useState({ mastro: "", vias_mastro: "", joystick: "", tipo_pneu: "", acessorios: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (maquina) {
      setSpecs({
        mastro: maquina.mastro || "",
        vias_mastro: maquina.vias_mastro || "",
        joystick: maquina.joystick || "",
        tipo_pneu: maquina.tipo_pneu || "",
        acessorios: maquina.acessorios || [],
      });
    }
  }, [maquina]);

  const handleSpecSelect = (field, value) => {
    setSpecs((prev) => ({ ...prev, [field]: prev[field] === value ? "" : value }));
  };

  const handleAcessorioToggle = (value) => {
    setSpecs((prev) => {
      const arr = prev.acessorios || [];
      return { ...prev, acessorios: arr.includes(value) ? arr.filter((a) => a !== value) : [...arr, value] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(specs);
      onClose();
    } catch (e) {
      // error handled by parent
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Editar Máquina — {maquina?.serie}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-2">Mastro</h3>
            <div className="grid grid-cols-3 gap-2">
              {SPEC_OPTIONS.mastro.map((o) => (
                <OptionButton key={o.value} option={o} isSelected={specs.mastro === o.value} onClick={(v) => handleSpecSelect("mastro", v)} />
              ))}
            </div>
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
            <h3 className="text-sm font-medium text-slate-300 mb-2">Acessórios</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPEC_OPTIONS.acessorios.map((o) => {
                const isSelected = (specs.acessorios || []).includes(o.value);
                return (
                  <OptionButton key={o.value} option={o} isSelected={isSelected} onClick={() => handleAcessorioToggle(o.value)} />
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}