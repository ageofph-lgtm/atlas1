
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

export default function CreateACPModal({ isOpen, onClose, onSubmit, editingMachine = null, prefillData = null }) {
  const [formData, setFormData] = useState({
    origem: 'nova',
    modelo: '',
    serie: '',
    ano: '',
    estado: 'Disponível',
  });

  React.useEffect(() => {
    const initialState = {
      origem: 'nova',
      modelo: '',
      serie: '',
      ano: '',
      estado: 'Disponível',
    };

    if (editingMachine) {
      setFormData(editingMachine);
    } else if (prefillData) {
      setFormData({ ...initialState, ...prefillData });
    } else {
      setFormData(initialState);
    }
  }, [editingMachine, prefillData, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const finalData = { 
      ...formData,
      ano: formData.ano ? parseInt(formData.ano) : null
    };
    
    onSubmit(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white border border-gray-200 rounded-xl shadow-xl text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900 tracking-wider flex items-center gap-2">
            {editingMachine ? (
              <>
                <Settings className="w-6 h-6" />
                Editar Máquina
              </>
            ) : (
              'Adicionar Máquina à Frota'
            )}
          </DialogTitle>
          {editingMachine && (
            <p className="text-sm text-gray-600 mt-2">
              Após guardar os dados básicos, poderá editar as características técnicas.
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="origem" className="text-gray-700">Origem da Máquina</Label>
              <Select 
                value={formData.origem} 
                onValueChange={(value) => handleInputChange('origem', value)}
                required
              >
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                  <SelectValue placeholder="Selecione a origem..." />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-md shadow-md">
                  <SelectItem value="nova" className="hover:bg-gray-50">Nova</SelectItem>
                  <SelectItem value="sts" className="hover:bg-gray-50">STS - Serviço Técnico</SelectItem>
                  <SelectItem value="uts" className="hover:bg-gray-50">UTS - Usados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estado" className="text-gray-700">Estado</Label>
              <Select 
                value={formData.estado} 
                onValueChange={(value) => handleInputChange('estado', value)}
              >
                <SelectTrigger className="bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-md shadow-md">
                  <SelectItem value="Disponível" className="hover:bg-gray-50">Disponível</SelectItem>
                  <SelectItem value="Preparada" className="hover:bg-gray-50">Preparada</SelectItem>
                  <SelectItem value="Em Aluguer" className="hover:bg-gray-50">Em Aluguer</SelectItem>
                  <SelectItem value="Em Manutenção" className="hover:bg-gray-50">Em Manutenção</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="modelo" className="text-gray-700">Modelo</Label>
              <Input
                id="modelo"
                value={formData.modelo}
                onChange={(e) => handleInputChange('modelo', e.target.value)}
                placeholder="ex: RX 20-16"
                required
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <Label htmlFor="serie" className="text-gray-700">Número de Série</Label>
              <Input
                id="serie"
                value={formData.serie}
                onChange={(e) => handleInputChange('serie', e.target.value)}
                placeholder="ex: 123456789"
                required
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>

            <div>
              <Label htmlFor="ano" className="text-gray-700">Ano de Fabrico</Label>
              <Input
                id="ano"
                type="number"
                value={formData.ano}
                onChange={(e) => handleInputChange('ano', e.target.value)}
                placeholder="ex: 2020"
                className="bg-white border border-gray-300 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white">
              {editingMachine ? 'Atualizar e Editar Características' : 'Avançar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
