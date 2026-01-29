
import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Zap, Clock, CheckCircle2 } from "lucide-react";
import { InvokeLLM } from "@/integrations/Core";

const ACCESSORIES = ['Posicionador', 'Câmaras', 'Balança', 'Blue Spot'];

const TRABALHO_TYPES = {
  expresso: {
    title: 'Expresso',
    icon: Zap,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Limpeza básica da máquina'
  },
  medio: {
    title: 'Médio',
    icon: Clock,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Limpeza + revisões, VPSs, troca de peças'
  },
  completo: {
    title: 'Completo',
    icon: CheckCircle2,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Serviço completo + pintura + testes bateria'
  }
};

export default function CreateOSModal({ isOpen, onClose, onSubmit, editingOS = null, prefillData = null }) {
  const [formData, setFormData] = useState({});
  const [selectedAccessories, setSelectedAccessories] = useState({});
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);

  const initializeState = useCallback(() => {
    // If editingOS is provided, it takes precedence. Otherwise, use prefillData or default.
    const dataToLoad = editingOS || prefillData;

    const initialState = {
      modelo: '',
      serie: '',
      ano: '',
      cliente: '',
      dataEntrega: '', // Deixar vazio por defeito
      prioridade: 'normal',
      tipoTrabalho: 'medio',
      observacoes: '',
      acessorios: {},
      tasks: [],
      ...dataToLoad, // Apply the loaded data (editingOS or prefillData)
    };
    setFormData(initialState);
    
    // Initialize selectedAccessories based on loaded data
    if (dataToLoad?.acessorios) {
        const preselected = Object.keys(dataToLoad.acessorios).reduce((acc, key) => {
            acc[key] = true;
            return acc;
        }, {});
        setSelectedAccessories(preselected);
    } else {
        setSelectedAccessories({});
    }

    // Initialize generatedTasks based on loaded data
    if (dataToLoad?.tasks) {
        setGeneratedTasks(dataToLoad.tasks);
    } else {
        setGeneratedTasks([]);
    }
  }, [editingOS, prefillData]);

  useEffect(() => {
    if (isOpen) {
      initializeState();
    }
  }, [isOpen, initializeState]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAccessoryChange = (accessory, checked) => {
    setSelectedAccessories(prev => ({ ...prev, [accessory]: checked }));
    if (!checked) {
      // If unchecked, remove the accessory serial from formData
      const newAcessorios = { ...formData.acessorios };
      delete newAcessorios[accessory];
      setFormData(prev => ({ ...prev, acessorios: newAcessorios }));
    }
  };

  const handleAccessorySerialChange = (accessory, value) => {
    setFormData(prev => ({
      ...prev,
      acessorios: { ...prev.acessorios, [accessory]: value }
    }));
  };

  const generateTasks = async () => {
    if (!formData.modelo || !formData.tipoTrabalho) {
      alert('Por favor, preencha o modelo e tipo de trabalho primeiro.');
      return;
    }

    setIsGeneratingTasks(true);
    try {
      const selectedAcc = Object.keys(selectedAccessories).filter(acc => selectedAccessories[acc]);
      const modificacoes = selectedAcc.length > 0 ? selectedAcc.join(', ') : 'sem acessórios especiais';
      const tipoInfo = TRABALHO_TYPES[formData.tipoTrabalho];
      
      const result = await InvokeLLM({
        prompt: `Como um mecânico especialista em empilhadores da marca Still, cria uma checklist de tarefas técnicas para preparar um empilhador modelo '${formData.modelo}' com tipo de trabalho '${tipoInfo.title}' (${tipoInfo.description}) e com as seguintes modificações: ${modificacoes}. 
        
        As tarefas devem ser específicas, técnicas e práticas para o tipo de trabalho selecionado. Inclui verificações de segurança, testes funcionais e procedimentos de qualidade adequados ao nível de serviço.
        
        Responde apenas com um array JSON de strings, onde cada string é uma tarefa específica.`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      if (result.tasks && Array.isArray(result.tasks)) {
        const taskObjects = result.tasks.map(taskText => ({
          text: taskText,
          completed: false
        }));
        setGeneratedTasks(taskObjects);
        setFormData(prev => ({ ...prev, tasks: taskObjects }));
      }
    } catch (error) {
      console.error("Erro ao gerar tarefas:", error);
      alert("Não foi possível gerar as tarefas. Tente novamente.");
    }
    setIsGeneratingTasks(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only include selected accessories in the final payload
    const finalAcessorios = {};
    Object.keys(selectedAccessories).forEach(acc => {
      if (selectedAccessories[acc]) {
        finalAcessorios[acc] = formData.acessorios[acc] || 'N/A';
      }
    });

    const finalData = {
      ...formData,
      acessorios: finalAcessorios,
      ano: formData.ano ? parseInt(formData.ano) : null, // Ensure year is a number
      tasks: generatedTasks // Ensure tasks are included from the generatedTasks state
    };

    onSubmit(finalData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
            {editingOS ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="modelo">Modelo da Máquina</Label>
              <Input
                id="modelo"
                value={formData.modelo || ''}
                onChange={(e) => handleInputChange('modelo', e.target.value)}
                placeholder="ex: RX 20-16"
                required
                className="bg-white/70 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
            <div>
              <Label htmlFor="serie">Número de Série</Label>
              <Input
                id="serie"
                value={formData.serie || ''}
                onChange={(e) => handleInputChange('serie', e.target.value)}
                placeholder="ex: 516225L00556"
                required
                className="bg-white/70 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
            <div>
              <Label htmlFor="ano">Ano de Fabrico</Label>
              <Input
                id="ano"
                type="number"
                value={formData.ano || ''}
                onChange={(e) => handleInputChange('ano', e.target.value)}
                placeholder="2020"
                className="bg-white/70 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
            <div>
              <Label htmlFor="cliente">Cliente/Projeto</Label>
              <Input
                id="cliente"
                value={formData.cliente || ''}
                onChange={(e) => handleInputChange('cliente', e.target.value)}
                placeholder="Nome do cliente"
                className="bg-white/70 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
            <div>
              <Label htmlFor="dataEntrega">Data de Entrega (Opcional)</Label>
              <Input
                id="dataEntrega"
                type="date"
                value={formData.dataEntrega || ''}
                onChange={(e) => handleInputChange('dataEntrega', e.target.value)}
                className="bg-white/70 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
            <div>
              <Label htmlFor="prioridade">Prioridade</Label>
              <Select value={formData.prioridade || 'normal'} onValueChange={(value) => handleInputChange('prioridade', value)}>
                <SelectTrigger className="bg-white/70 shadow-sm hover:shadow-md transition-shadow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Work Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-4 block">Tipo de Trabalho</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(TRABALHO_TYPES).map(([key, config]) => (
                <div
                  key={key}
                  onClick={() => handleInputChange('tipoTrabalho', key)}
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all shadow-sm hover:shadow-md ${
                    formData.tipoTrabalho === key
                      ? config.color.replace('100', '50') + ' border-current'
                      : 'bg-white/50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <config.icon className="w-5 h-5" />
                    <span className="font-semibold">{config.title}</span>
                  </div>
                  <p className="text-sm text-slate-600">{config.description}</p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Accessories */}
          <div>
            <Label className="text-base font-semibold">Checklist de Modificações</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {ACCESSORIES.map(accessory => (
                <div key={accessory} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`check-${accessory}`}
                      checked={!!selectedAccessories[accessory]} // Use !! to convert to boolean
                      onCheckedChange={(checked) => handleAccessoryChange(accessory, checked)}
                    />
                    <Label htmlFor={`check-${accessory}`} className="font-medium">
                      {accessory}
                    </Label>
                  </div>
                  {selectedAccessories[accessory] && (
                    <Input
                      placeholder="N/S do Acessório"
                      value={formData.acessorios?.[accessory] || ''} // Use optional chaining for safety
                      onChange={(e) => handleAccessorySerialChange(accessory, e.target.value)}
                      className="ml-6 bg-white/70 shadow-sm hover:shadow-md transition-shadow"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* AI Task Generation */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Plano de Tarefas Inteligente</Label>
              <Button
                type="button"
                variant="outline"
                onClick={generateTasks}
                disabled={isGeneratingTasks}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:from-blue-100 hover:to-indigo-100 shadow-sm hover:shadow-md transition-shadow"
              >
                {isGeneratingTasks ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Gerar com IA
              </Button>
            </div>
            
            {generatedTasks.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-sm">
                <p className="text-sm font-medium text-blue-900 mb-3">
                  Tarefas geradas automaticamente para {TRABALHO_TYPES[formData.tipoTrabalho]?.title || 'este trabalho'}:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {generatedTasks.map((task, index) => (
                    <div key={index} className="flex items-start space-x-2 bg-white/50 p-2 rounded-lg shadow-sm">
                      {/* Checkbox controlled by task.completed state if you want to allow marking complete */}
                      <Checkbox id={`task-${index}`} checked={task.completed} onCheckedChange={(checked) => {
                          const updatedTasks = generatedTasks.map((t, i) => i === index ? { ...t, completed: checked } : t);
                          setGeneratedTasks(updatedTasks);
                          setFormData(prev => ({ ...prev, tasks: updatedTasks }));
                      }} className="mt-1" />
                      <Label htmlFor={`task-${index}`} className={`text-sm text-blue-800 leading-relaxed ${task.completed ? 'line-through text-blue-500' : ''}`}>
                        {task.text}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Observations */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes || ''}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
              className="bg-white/70 shadow-sm hover:shadow-md transition-shadow"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="shadow-sm hover:shadow-md transition-shadow">
              Cancelar
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-md hover:shadow-lg transition-shadow">
              {editingOS ? 'Atualizar Ordem' : 'Criar Ordem'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
