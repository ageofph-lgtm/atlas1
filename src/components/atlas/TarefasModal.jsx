import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, CheckSquare, Square, Loader2, Zap } from "lucide-react";

const PREDEFINED_TAREFAS = [
  { key: "preparacao", label: "Preparação geral" },
  { key: "revisao", label: "Revisão 3000h" },
  { key: "vps", label: "VPS" },
  { key: "express", label: "EXPRESS" },
];

export default function TarefasModal({ open, ciclo, onClose, onConfirm, authorizing }) {
  const [selected, setSelected] = useState({});
  const [customTasks, setCustomTasks] = useState([]);
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    if (open) {
      setSelected({});
      setCustomTasks([]);
      setCustomInput("");
    }
  }, [open, ciclo?.id]);

  const togglePredefined = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }));

  const addCustomTask = () => {
    const text = customInput.trim();
    if (!text) return;
    setCustomTasks((prev) => [...prev, text]);
    setCustomInput("");
  };

  const removeCustomTask = (idx) => setCustomTasks((prev) => prev.filter((_, i) => i !== idx));

  const handleConfirm = () => {
    const tarefas = [];
    if (selected.preparacao) tarefas.push({ texto: "Preparação geral", concluida: false });
    if (selected.revisao) tarefas.push({ texto: "Revisão 3000h", concluida: false });
    if (selected.vps) tarefas.push({ texto: "VPS", concluida: false });
    if (selected.express) tarefas.push({ texto: "EXPRESS", concluida: false });
    customTasks.forEach((t) => tarefas.push({ texto: t, concluida: false }));
    onConfirm({ tarefas, isVps: !!selected.vps, isExpress: !!selected.express });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-slate-700 text-slate-100 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            Autorizar — Tarefas da O.S.
          </DialogTitle>
          <p className="text-sm text-slate-400">NS: {ciclo?.serie}</p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Predefined checkboxes */}
          <div className="space-y-2">
            {PREDEFINED_TAREFAS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => togglePredefined(t.key)}
                className={`w-full flex items-center gap-3 p-3 min-h-[48px] rounded-lg border transition-colors text-left ${
                  selected[t.key]
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                    : "bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                {selected[t.key]
                  ? <CheckSquare className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  : <Square className="w-5 h-5 text-slate-600 flex-shrink-0" />}
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Custom task input */}
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Adicionar tarefa personalizada</p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTask(); } }}
                placeholder="Nova tarefa..."
                className="bg-slate-900/60 border-slate-700 text-slate-100 text-base"
              />
              <Button onClick={addCustomTask} size="icon" variant="secondary" type="button" className="flex-shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Custom tasks list */}
          {customTasks.length > 0 && (
            <div className="space-y-1.5">
              {customTasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 min-h-[40px]">
                  <span className="text-sm text-slate-300 flex-1 break-words">{t}</span>
                  <button onClick={() => removeCustomTask(i)} type="button" className="text-slate-500 hover:text-red-400 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={authorizing} type="button">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={authorizing} type="button" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
            {authorizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            AUTORIZAR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}