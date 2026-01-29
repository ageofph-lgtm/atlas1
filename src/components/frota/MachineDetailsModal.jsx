
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrdemServico } from '@/entities/all';
import { format } from 'date-fns';
import { Calendar, Wrench, Package, Truck, Activity, Settings, Gamepad2, User, LogOut } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const STATUS_COLORS = {
  'Disponível': "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  'Preparada': "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  'Reservada': "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  'Em Aluguer': "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
  'Em Manutenção': "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"
};

const SPEC_LABELS = {
  mastro: { label: "Tipo de Mastro", icon: Truck, 
    values: { triplex: "Triplex", telescopico: "Telescópico", niho: "Niho" }
  },
  viasMastro: { label: "Vias do Mastro", icon: Settings,
    values: { 3: "3 Vias", 4: "4 Vias", 5: "5 Vias" }
  },
  corPneus: { label: "Cor dos Pneus", icon: Package,
    values: { preto: "Preto", branco: "Branco" }
  },
  joystick: { label: "Tipo de Joystick", icon: Gamepad2,
    values: { alavanca: "Alavanca", minilever: "Minilever", "4plus": "4Plus", fingertrip: "Fingertrip" }
  },
  acessorio: { label: "Acessório", icon: Wrench,
    values: { 
      posicionador_2_garfos: "Posicionador 2 Garfos", 
      posicionador_4_garfos: "Posicionador 4 Garfos",
      sideshift: "Sideshift", 
      pinca: "Pinça", 
      volteador: "Volteador" 
    }
  }
};

const HistoryItem = ({ icon, title, date, user, details, diasUtilizacao }) => (
  <div className="flex gap-4">
    <div className="flex flex-col items-center">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-full p-2">{icon}</div>
      <div className="w-px h-full bg-slate-200 dark:bg-slate-700"></div>
    </div>
    <div>
      <p className="font-semibold text-slate-800 dark:text-slate-200">{title}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400">{details}</p>
      {diasUtilizacao && (
        <div className="mt-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-md text-xs font-semibold inline-block">
          {diasUtilizacao} {diasUtilizacao === 1 ? 'dia' : 'dias'} alugada
        </div>
      )}
      <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2">
        <span>{format(new Date(date), 'dd/MM/yyyy HH:mm')}</span>
        {user && <span>• {user}</span>}
      </div>
    </div>
  </div>
);

export default function MachineDetailsModal({ isOpen, onClose, machine, onUpdate }) {
  const [relatedOS, setRelatedOS] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rentalDate, setRentalDate] = useState(null);

  useEffect(() => {
    if (machine) {
      const fetchRelatedData = async () => {
        setIsLoading(true);
        try {
          const osList = await OrdemServico.filter({ acpMachineId: machine.id }, '-created_date');
          setRelatedOS(osList);
        } catch (error) {
          console.error("Erro ao carregar O.S. relacionadas:", error);
        }
        setIsLoading(false);
      };
      fetchRelatedData();

      // Find the latest rental date from history
      if (machine.estado === 'Em Aluguer' && machine.historico) {
        const rentalEvent = machine.historico
          .slice()
          .reverse()
          .find(h => h.tipo === 'saida_cliente');
        if (rentalEvent) {
          setRentalDate(rentalEvent.data);
        } else {
          setRentalDate(null); // No 'saida_cliente' found for 'Em Aluguer' machine
        }
      } else {
        setRentalDate(null); // Not 'Em Aluguer'
      }
    }
  }, [machine]);
  
  const handleClose = () => {
    if(onUpdate) {
        onUpdate();
    }
    onClose();
  }

  if (!machine) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-white border-gray-200 dark:bg-gray-950 dark:border-gray-700">
        <DialogHeader>
          <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">{machine.modelo} ({machine.ano})</DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400">NS: {machine.serie}</DialogDescription>
              </div>
              <Badge className={`${STATUS_COLORS[machine.estado]} text-base px-3 py-1`}>{machine.estado}</Badge>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[70vh] p-6 pt-0">
          <div className="space-y-8">
            
            {/* Rental Information */}
            {machine.estado === 'Em Aluguer' && rentalDate && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <LogOut className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  Informações de Aluguer
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 angled-clip">
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Data de Saída</p>
                      <p className="text-base font-semibold text-purple-800 dark:text-purple-400">
                        {format(new Date(rentalDate), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Reservation Status */}
            {machine.reserva && ( // Changed condition: removed `machine.estado === 'Reservada'`
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  Informações da Reserva
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {machine.reserva.cliente && (
                    <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 angled-clip">
                      <Settings className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">Cliente</p>
                        <p className="text-base font-semibold text-yellow-800 dark:text-yellow-400">{machine.reserva.cliente}</p>
                      </div>
                    </div>
                  )}
                  
                  {machine.reserva.comercial && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 angled-clip">
                      <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Comercial Responsável</p>
                        <p className="text-base font-semibold text-blue-800 dark:text-blue-400">{machine.reserva.comercial}</p>
                      </div>
                    </div>
                  )}
                  
                  {machine.reserva.data && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 angled-clip">
                      <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-300">Data da Reserva</p>
                        <p className="text-base font-semibold text-green-800 dark:text-green-400">
                          {format(new Date(machine.reserva.data), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Show availability status for non-reserved machines */}
            {machine.estado !== 'Reservada' && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  Estado da Máquina
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 angled-clip">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      machine.estado === 'Disponível' ? 'bg-green-500' :
                      machine.estado === 'Preparada' ? 'bg-blue-500' :
                      machine.estado === 'Em Aluguer' ? 'bg-purple-500' :
                      machine.estado === 'Em Manutenção' ? 'bg-red-500' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {machine.estado}
                    </span>
                  </div>
                  {machine.estado === 'Disponível' && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      Esta máquina está disponível para reserva ou aluguer.
                    </p>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Technical Specifications */}
            {machine.caracteristicas && Object.keys(machine.caracteristicas).length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  Características Técnicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(machine.caracteristicas).map(([key, value]) => {
                    const spec = SPEC_LABELS[key];
                    if (!spec) return null;
                    
                    const displayValue = spec.values[value] || value;
                    
                    return (
                      <div key={key} className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <spec.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">{spec.label}</p>
                          <p className="text-sm text-blue-700 dark:text-blue-400 font-semibold">{displayValue}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2"><Wrench /> Ordens de Serviço Associadas</h3>
              {isLoading ? <p className="text-slate-500 dark:text-slate-400">A carregar histórico de O.S....</p> : 
                relatedOS.length > 0 ? (
                  <div className="space-y-4">
                    {relatedOS.map(os => (
                      <div key={os.id} className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-slate-900 dark:text-slate-100">{os.tipoTrabalho ? os.tipoTrabalho.charAt(0).toUpperCase() + os.tipoTrabalho.slice(1) : 'Manutenção'}</p>
                          <Badge variant="secondary">{os.status}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Cliente: {os.cliente || 'Interno'}</p>
                        {os.dataEntrega && (
                          <p className="text-sm text-slate-500 dark:text-slate-400">Data de Entrega: {format(new Date(os.dataEntrega), 'dd/MM/yyyy')}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-slate-500 dark:text-slate-400">Nenhuma ordem de serviço encontrada para esta máquina.</p>
              }
            </div>
            
            <Separator />

            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2"><Activity /> Histórico de Movimentações</h3>
              <div className="space-y-4">
                {machine.historico && machine.historico.length > 0 ? (
                  machine.historico.slice().reverse().map((item, index) => {
                    let icon = <Package className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
                    if (item.tipo === 'saida_cliente') icon = <Truck className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
                    if (item.tipo === 'retorno_cliente') icon = <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
                    if (item.tipo === 'manutencao') icon = <Wrench className="w-4 h-4 text-red-600 dark:text-red-400" />;
                    
                    return <HistoryItem 
                      key={index}
                      icon={icon}
                      title={item.descricao || item.tipo.replace('_', ' ')}
                      date={item.data}
                      user={item.responsavel}
                      details={`Cliente: ${item.cliente || 'N/A'}`}
                      diasUtilizacao={item.diasUtilizacao}
                    />
                  })
                ) : <p className="text-slate-500 dark:text-slate-400">Nenhum histórico de movimentação registado.</p>}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
