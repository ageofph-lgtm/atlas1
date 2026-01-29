import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Star, Wrench, Package } from "lucide-react";

const ORIGIN_OPTIONS = [
  {
    value: "nova",
    title: "Nova",
    description: "Máquina nova da fábrica",
    icon: Star,
    color: "bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-800"
  },
  {
    value: "sts",
    title: "STS",
    description: "Serviço Técnico Specializado",
    icon: Wrench,
    color: "bg-green-50 border-green-200 hover:bg-green-100 text-green-800"
  },
  {
    value: "uts",
    title: "UTS",
    description: "Usados Técnicos Specializado",
    icon: Package,
    color: "bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-800"
  }
];

export default function OriginSelectionModal({ isOpen, onClose, onSelectOrigin, title }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-zinc-200 dark:border-zinc-700 dark:bg-zinc-900/95">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-cinzel text-zinc-900 dark:text-zinc-100 tracking-wider">
            {title || "Selecionar Origem da Máquina"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-zinc-600 dark:text-zinc-400">
            Escolha a origem da máquina para organizá-la corretamente na frota:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ORIGIN_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSelectOrigin(option.value)}
                className={`p-6 border-2 rounded-xl transition-all duration-200 text-left ${option.color}`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <option.icon className="w-8 h-8" />
                  <div>
                    <h3 className="font-bold text-lg">{option.title}</h3>
                    <p className="text-sm opacity-80">{option.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}