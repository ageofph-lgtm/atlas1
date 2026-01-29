import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Settings } from "lucide-react";

const SPEC_OPTIONS = {
  mastro: [
    { value: 'triplex', label: 'Triplex', icon: '🏗️' },
    { value: 'telescopico', label: 'Telescópico', icon: '📏' },
    { value: 'niho', label: 'Niho', icon: '🔧' }
  ],
  viasMastro: [
    { value: 3, label: '3 Vias', icon: '3️⃣' },
    { value: 4, label: '4 Vias', icon: '4️⃣' },
    { value: 5, label: '5 Vias', icon: '5️⃣' }
  ],
  corPneus: [
    { value: 'preto', label: 'Preto', icon: '⚫' },
    { value: 'branco', label: 'Branco', icon: '⚪' }
  ],
  joystick: [
    { value: 'alavanca', label: 'Alavanca', icon: '🕹️' },
    { value: 'minilever', label: 'Minilever', icon: '🎮' },
    { value: '4plus', label: '4Plus', icon: '🎯' },
    { value: 'fingertrip', label: 'Fingertrip', icon: '👆' }
  ],
  acessorio: [
    { value: 'posicionador_2_garfos', label: 'Posicionador 2 Garfos', icon: '🔀' },
    { value: 'posicionador_4_garfos', label: 'Posicionador 4 Garfos', icon: '🔁' },
    { value: 'sideshift', label: 'Sideshift', icon: '↔️' },
    { value: 'pinca', label: 'Pinça', icon: '🦀' },
    { value: 'volteador', label: 'Volteador', icon: '🔄' }
  ]
};

const OptionButton = ({ option, isSelected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(option.value)}
    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200 min-h-[80px] ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 text-blue-700' 
        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-gray-700'
    }`}
  >
    <span className="text-2xl mb-1">{option.icon}</span>
    <span className="text-xs font-medium text-center leading-tight">{option.label}</span>
    {isSelected && (
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <Check className="w-3 h-3 text-white" />
      </div>
    )}
  </button>
);

export default function MachineSpecsModal({ isOpen, onClose, onSubmit, machineData }) {
  const [specs, setSpecs] = useState({});

  useEffect(() => {
    if (machineData?.caracteristicas) {
      setSpecs(machineData.caracteristicas);
    } else {
      setSpecs({});
    }
  }, [machineData, isOpen]);

  const handleOptionSelect = (category, value) => {
    setSpecs(prev => ({
      ...prev,
      [category]: prev[category] === value ? null : value
    }));
  };

  const handleSubmit = () => {
    onSubmit(specs);
  };

  if (!machineData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto max-h-[90vh] flex flex-col p-0">
        {/* Header fixo */}
        <DialogHeader className="flex-shrink-0 p-4 border-b bg-white">
          <DialogTitle className="text-lg font-bold text-gray-900 text-center">
            Características Técnicas
          </DialogTitle>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {machineData.modelo}
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
              {machineData.serie}
            </Badge>
          </div>
        </DialogHeader>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Tipo de Mastro */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Tipo de Mastro
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {SPEC_OPTIONS.mastro.map(option => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={specs.mastro === option.value}
                  onClick={(value) => handleOptionSelect('mastro', value)}
                />
              ))}
            </div>
          </div>

          {/* Vias do Mastro */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Vias do Mastro</h3>
            <div className="grid grid-cols-3 gap-2">
              {SPEC_OPTIONS.viasMastro.map(option => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={specs.viasMastro === option.value}
                  onClick={(value) => handleOptionSelect('viasMastro', value)}
                />
              ))}
            </div>
          </div>

          {/* Cor dos Pneus */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Cor dos Pneus</h3>
            <div className="grid grid-cols-2 gap-2">
              {SPEC_OPTIONS.corPneus.map(option => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={specs.corPneus === option.value}
                  onClick={(value) => handleOptionSelect('corPneus', value)}
                />
              ))}
            </div>
          </div>

          {/* Tipo de Joystick */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Tipo de Joystick</h3>
            <div className="grid grid-cols-2 gap-2">
              {SPEC_OPTIONS.joystick.map(option => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={specs.joystick === option.value}
                  onClick={(value) => handleOptionSelect('joystick', value)}
                />
              ))}
            </div>
          </div>

          {/* Acessório */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Acessório</h3>
            <div className="grid grid-cols-2 gap-2">
              {SPEC_OPTIONS.acessorio.map(option => (
                <OptionButton
                  key={option.value}
                  option={option}
                  isSelected={specs.acessorio === option.value}
                  onClick={(value) => handleOptionSelect('acessorio', value)}
                />
              ))}
            </div>
          </div>

          {/* Dica */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 text-center">
              💡 Estas características tornarão as pesquisas mais precisas. Poderá pesquisar por "rodas brancas", "4 vias", etc.
            </p>
          </div>
        </div>

        {/* Botões fixos no final */}
        <div className="flex-shrink-0 p-4 border-t bg-gray-50 flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-12 bg-white border-gray-300 text-gray-700"
          >
            <X className="w-4 h-4 mr-2" />
            Pular
          </Button>
          <Button 
            onClick={handleSubmit}
            className="flex-1 h-12 bg-red-600 text-white hover:bg-red-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}