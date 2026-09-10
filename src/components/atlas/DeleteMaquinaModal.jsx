import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Trash2, Loader2 } from "lucide-react";

export default function DeleteMaquinaModal({ maquina, open, onClose, onConfirm }) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (maquina) setConfirmText("");
  }, [maquina]);

  const canDelete = confirmText === maquina?.serie && confirmText.length > 0;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      // error handled by parent
    }
    setDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <Trash2 className="w-5 h-5" /> Eliminar Máquina
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-xs text-slate-500 mb-1">NS</p>
            <p className="text-3xl font-black tracking-wider text-slate-100">{maquina?.serie}</p>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              Isto apaga permanentemente a máquina e TODO o seu histórico (ciclos e eventos). Esta ação não pode ser desfeita.
            </p>
          </div>

          <div>
            <Label className="text-slate-400 text-xs mb-1.5 block">
              Escreva o NS <span className="text-amber-400 font-bold">{maquina?.serie}</span> para confirmar
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={maquina?.serie}
              className="bg-slate-900 border-slate-700 text-slate-100 font-bold tracking-wider"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleDelete}
            disabled={!canDelete || deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
            Eliminar Definitivamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}