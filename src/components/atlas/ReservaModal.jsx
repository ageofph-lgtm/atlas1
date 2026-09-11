import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, User, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function ReservaModal({ ciclo, open, onClose, onSave, canEdit }) {
  const [cliente, setCliente] = useState("");
  const [data, setData] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ciclo) {
      setCliente(ciclo.reserva_cliente || "");
      setData(ciclo.reserva_data ? format(new Date(ciclo.reserva_data), "yyyy-MM-dd") : "");
      setNota("");
    }
  }, [ciclo]);

  const handleSave = async () => {
    if (!cliente) return;
    setSaving(true);
    try {
      await onSave({
        reserva_cliente: cliente,
        reserva_data: data || null,
        reserva_nota: nota || null,
      });
      onClose();
    } catch (e) {
      // error handled by parent
    }
    setSaving(false);
  };

  const handleCancel = async () => {
    setSaving(true);
    try {
      await onSave({
        reserva_cliente: null,
        reserva_data: null,
        reserva_comercial: null,
      });
      onClose();
    } catch (e) {
      // error handled by parent
    }
    setSaving(false);
  };

  const hasReserva = ciclo?.reserva_cliente;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {hasReserva ? "Editar Reserva" : "Reservar Máquina"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-slate-400 text-xs mb-1.5">NS</Label>
            <p className="text-2xl font-black tracking-wider text-slate-100">{ciclo?.serie}</p>
          </div>

          <div>
            <Label className="text-slate-400 text-xs mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Cliente
            </Label>
            <Input
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <Label className="text-slate-400 text-xs mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Data prevista de saída
            </Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          <div>
            <Label className="text-slate-400 text-xs mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Nota
            </Label>
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Nota (opcional)"
              className="bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {hasReserva && canEdit && (
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Cancelar Reserva
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!cliente || saving}
            className="bg-amber-500 hover:bg-amber-600 text-slate-900"
          >
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}