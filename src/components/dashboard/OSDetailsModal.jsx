import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Settings, CheckCircle2, Clock, FileText } from "lucide-react";
import { format } from "date-fns";
import { OrdemServico } from "@/entities/all";

const PRIORITY_BADGES = {
  'normal': 'bg-blue-100 text-blue-800',
  'alta': 'bg-yellow-100 text-yellow-800',
  'urgente': 'bg-red-100 text-red-800'
};

const SPEC_LABELS = {
  'mastro': { label: 'Tipo de Mastro', icon: Settings, values: { triplex: "Triplex", telescopico: "Telescópico", niho: "Niho" } },
  'viasMastro': { label: 'Vias do Mastro', icon: Settings, values: { 3: "3 Vias", 4: "4 Vias", 5: "5 Vias" } },
  'corPneus': { label: 'Cor dos Pneus', icon: Settings, values: { preto: "Preto", branco: "Branco" } },
  'joystick': { label: 'Tipo de Joystick', icon: Settings, values: { alavanca: "Alavanca", minilever: "Minilever", "4plus": "4Plus", fingertrip: "Fingertrip" } },
  'acessorio': { label: 'Acessório', icon: Settings, values: { posicionador_2_garfos: "Posicionador 2 Garfos", posicionador_4_garfos: "Posicionador 4 Garfos", sideshift: "Sideshift", pinca: "Pinça", volteador: "Volteador" } }
};

export default function OSDetailsModal({ isOpen, onClose, os, onUpdate }) {
  const [tasks, setTasks] = useState(os?.tasks || []);

  React.useEffect(() => {
    if (os?.tasks) {
      setTasks(os.tasks);
    }
  }, [os]);

  const handleTaskToggle = async (taskIndex) => {
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex].completed = !updatedTasks[taskIndex].completed;
    setTasks(updatedTasks);

    try {
      await OrdemServico.update(os.id, { tasks: updatedTasks });
      await onUpdate();
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error);
    }
  };

  if (!os) return null;

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <>
      {/* Custom backdrop with high z-index */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999]" 
          onClick={onClose}
        />
      )}
      
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto
                                   bg-white
                                   border border-gray-200
                                   rounded-2xl shadow-2xl 
                                   angled-clip
                                   fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
                                   z-[10000]">
          <DialogHeader className="border-b border-gray-200 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-3xl font-bold text-gray-900 tracking-wider">
                  {os.modelo} {os.ano && `(${os.ano})`}
                </DialogTitle>
                <p className="text-gray-600 mt-2 font-mono text-lg">Série: {os.serie}</p>
              </div>
              <Badge className={`${PRIORITY_BADGES[os.prioridade] || PRIORITY_BADGES.normal} text-sm px-3 py-2 angled-clip`}>
                {os.prioridade}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {os.cliente && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 angled-clip">
                  <User className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Cliente</p>
                    <p className="text-base font-semibold text-gray-700">{os.cliente}</p>
                  </div>
                </div>
              )}
              {os.dataEntrega && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 angled-clip">
                  <Calendar className="w-6 h-6 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Data de Entrega</p>
                    <p className="text-base font-semibold text-gray-700">
                      {format(new Date(os.dataEntrega), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200 angled-clip">
                <Settings className="w-6 h-6 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Estado</p>
                  <p className="text-base font-semibold text-gray-700 capitalize">{os.status?.replace('-', ' ')}</p>
                </div>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            {/* Machine Specifications */}
            {os.caracteristicasMaquina && Object.keys(os.caracteristicasMaquina).length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Características Técnicas da Máquina</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(os.caracteristicasMaquina).map(([key, value]) => {
                    const spec = SPEC_LABELS[key];
                    if (!value) return null;

                    const displayLabel = spec ? spec.label : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    const Icon = spec ? spec.icon : Settings;
                    const displayValue = spec ? (spec.values[value] || value) : value;
                    
                    return (
                      <div key={key} className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200 angled-clip">
                        <Icon className="w-6 h-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900 text-sm">{displayLabel}</p>
                          <p className="text-blue-700 text-base font-semibold capitalize">{displayValue.toString().replace(/_/g, ' ')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accessories */}
            {os.acessorios && Object.keys(os.acessorios).length > 0 && (
               <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Acessórios</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(os.acessorios).map(([name, serial]) => (
                    <div key={name} className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-200 angled-clip">
                      <span className="font-medium text-blue-900 text-base">{name}</span>
                      <span className="text-blue-700 text-sm font-mono">{serial}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {tasks.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Plano de Tarefas</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {completedTasks}/{totalTasks} concluídas
                    </span>
                    <div className="w-24 bg-gray-200 rounded-full h-3 angled-clip">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all duration-300 angled-clip" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto p-2">
                  {tasks.map((task, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl border border-gray-200 angled-clip">
                      <Checkbox
                        id={`task-${index}`}
                        checked={task.completed}
                        onCheckedChange={() => handleTaskToggle(index)}
                        className="mt-1"
                      />
                      <label 
                        htmlFor={`task-${index}`}
                        className={`flex-1 text-base cursor-pointer ${
                          task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}
                      >
                        {task.text}
                      </label>
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400 mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observations */}
            {os.observacoes && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Observações</h3>
                <div className="p-6 bg-yellow-50 rounded-xl border border-yellow-200 angled-clip">
                  <p className="text-gray-700 whitespace-pre-wrap text-base">{os.observacoes}</p>
                </div>
              </div>
            )}

            {/* History */}
            {os.historico && os.historico.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Histórico de Atividades</h3>
                <div className="relative border-l-4 border-gray-200 ml-4">
                  {os.historico.slice().reverse().map((item, index) => (
                    <div key={index} className="mb-8 ml-8">
                      <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-4 ring-white border-2 border-blue-200">
                        <FileText className="w-4 h-4 text-blue-800" />
                      </span>
                      <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 angled-clip">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-base font-semibold text-gray-900">{item.acao}</p>
                          <time className="text-sm font-normal text-gray-500">
                            {format(new Date(item.data), 'dd/MM/yyyy HH:mm')}
                          </time>
                        </div>
                        <p className="text-base text-gray-600 mb-1">
                          <span className="font-medium">Por:</span> {item.usuario}
                        </p>
                        <p className="text-base text-gray-600">{item.detalhes}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <Button onClick={onClose} className="bg-gradient-to-r from-gray-900 via-gray-800 to-red-900 text-white px-8 py-3 angled-clip hover:shadow-lg transition-all">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}