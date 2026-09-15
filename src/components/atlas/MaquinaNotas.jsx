import React, { useState } from "react";
import { StickyNote, Loader2, Check, X, Pencil, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";

/**
 * Notes/aviso block for a machine, backed by Maquina.observacoes.
 * variant="preview" → collapsed display only (no composer).
 * variant="full" → display + inline composer for canNotas users.
 * Saves directly via Maquina.update; calls onSaved() to let the page reload.
 */
export default function MaquinaNotas({ maquina, canNotas = false, onSaved, variant = "full" }) {
  const nota = maquina?.observacoes || "";
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(nota);
  const [saving, setSaving] = useState(false);

  if (variant === "preview") {
    if (!nota) return null;
    return (
      <div className="flex items-start gap-2 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 rounded-md px-2.5 py-1.5">
        <StickyNote className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
        <span className="line-clamp-2 break-words font-medium leading-snug">{nota}</span>
      </div>
    );
  }

  if (!canNotas && !nota) return null;

  const startEdit = () => { setText(nota); setEditing(true); };

  const save = async () => {
    if (!maquina?.id) return;
    setSaving(true);
    try {
      await base44.entities.Maquina.update(maquina.id, { observacoes: text.trim() });
      setEditing(false);
      onSaved?.();
    } catch (_e) {
      // ignore
    }
    setSaving(false);
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      {nota && !editing && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 border-l-4 border-l-amber-500 rounded-md px-2.5 py-2">
          <StickyNote className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <p className="text-sm text-amber-100 whitespace-pre-wrap break-words flex-1 font-medium leading-snug">{nota}</p>
          {canNotas && (
            <button onClick={startEdit} className="text-amber-400/70 hover:text-amber-400 flex-shrink-0" title="Editar nota">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
      {canNotas && !nota && !editing && (
        <button onClick={startEdit} className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400">
          <Plus className="w-3.5 h-3.5" /> Adicionar nota
        </button>
      )}
      {editing && (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Aviso / nota sobre esta máquina..."
            rows={3}
            autoFocus
            className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-xs resize-y"
          />
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded text-xs font-bold disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
            >
              <X className="w-3 h-3" /> Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}