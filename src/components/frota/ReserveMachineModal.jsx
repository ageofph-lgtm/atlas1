
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, User, Briefcase } from "lucide-react";
import { User as UserEntity } from "@/entities/User"; // Corrected import reference from outline

export default function ReserveMachineModal({ isOpen, onClose, onSubmit, machine }) {
  const [formData, setFormData] = useState({
    cliente: '',
    data: '',
    comercial: ''
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await UserEntity.me(); // Using UserEntity as per import
        setCurrentUser(user);
        
        // Reset form data and auto-fill commercial when modal opens
        setFormData({
          cliente: '',
          data: '',
          comercial: user.nome_comercial || '' // Pre-fill commercial if available
        });

      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
        // If user loading fails, still reset other fields
        setFormData({
          cliente: '',
          data: '',
          comercial: ''
        });
      }
    };
    
    if (isOpen) {
      loadCurrentUser();
    }
    // No explicit reset on close is needed here, as the next open will trigger a reset.
    // If the component is unmounted on close, state is naturally reset.
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.cliente || !formData.data) {
      alert('Cliente e data são obrigatórios');
      return;
    }

    const finalData = {
      // Não alteramos o estado, apenas adicionamos a reserva
      reserva: {
        cliente: formData.cliente,
        data: formData.data,
        // Use formData.comercial if typed, otherwise currentUser's commercial name, then full name, then 'Sistema'
        comercial: formData.comercial || currentUser?.nome_comercial || currentUser?.full_name || 'Sistema'
      }
    };

    onSubmit(machine.id, finalData);
    // Form data is reset on next open by the useEffect
  };

  // The original handleClose function is no longer needed as onOpenChange calls onClose directly,
  // and form state reset is handled by the useEffect when isOpen becomes true.

  if (!machine) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}> {/* Changed to call onClose directly */}
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-zinc-200"> {/* Max-width and border class updated */}
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-zinc-900"> {/* Text style updated */}
            Reservar Máquina
          </DialogTitle>
          <DialogDescription className="text-zinc-600"> {/* New DialogDescription */}
            {machine.modelo} - NS: {machine.serie}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6"> {/* Form spacing updated */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="cliente" className="flex items-center gap-2"> {/* Icons added to labels */}
                <User className="w-4 h-4" />
                Nome do Cliente *
              </Label>
              <Input
                id="cliente"
                value={formData.cliente}
                onChange={(e) => handleInputChange('cliente', e.target.value)}
                placeholder="Digite o nome do cliente"
                required
                className="mt-2 bg-white/70" // Background color added
              />
            </div>

            <div>
              <Label htmlFor="data" className="flex items-center gap-2"> {/* Icons added to labels */}
                <Calendar className="w-4 h-4" />
                Data da Reserva *
              </Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => handleInputChange('data', e.target.value)}
                required
                className="mt-2 bg-white/70" // Background color added
              />
            </div>

            <div>
              <Label htmlFor="comercial" className="flex items-center gap-2"> {/* Icons added to labels */}
                <Briefcase className="w-4 h-4" />
                Comercial Responsável
              </Label>
              <Input
                id="comercial"
                value={formData.comercial}
                onChange={(e) => handleInputChange('comercial', e.target.value)}
                placeholder="Nome do comercial (auto-preenchido se disponível)"
                className="mt-2 bg-white/70" // Background color added, readOnly removed
              />
              {currentUser?.nome_comercial && (
                <p className="text-sm text-blue-600 mt-1">
                  Auto-preenchido com: {currentUser.nome_comercial} {/* Message updated */}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}> {/* Changed to call onClose directly */}
              Cancelar
            </Button>
            <Button type="submit" className="bg-yellow-600 hover:bg-yellow-700 text-white"> {/* Button color updated */}
              Confirmar Reserva
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
